package api

import (
	"context"
	"encoding/json"
	"errors"
	"maps"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"taller/executor/internal/sandbox"
)

const token = "0123456789abcdef0123456789abcdef"

type fakeExecutor struct {
	result sandbox.Result
	err    error
	calls  int
}

func (f *fakeExecutor) Execute(context.Context, string, []byte) (sandbox.Result, error) {
	f.calls++
	return f.result, f.err
}

func newServer(exec Executor) *Server {
	return &Server{
		Token: token, Exec: exec, Slots: make(chan struct{}, 1),
		MaxBody: 1024, MaxProgram: 100, QueueWait: 20 * time.Millisecond,
		Languages: map[string]bool{"rust": true, "go": true},
	}
}

func post(t *testing.T, s *Server, body, auth string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/v1/run", strings.NewReader(body))
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	return rec
}

func TestHealthzNeedsNoToken(t *testing.T) {
	rec := httptest.NewRecorder()
	newServer(&fakeExecutor{}).Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("healthz = %d %q", rec.Code, rec.Body.String())
	}
}

func TestRunRequiresTheToken(t *testing.T) {
	sameLength := "Bearer " + token[:len(token)-1] + "x"
	for _, auth := range []string{"", "Bearer otro-token", token, sameLength} {
		exec := &fakeExecutor{}
		rec := post(t, newServer(exec), `{"language":"rust","program":"fn main(){}"}`, auth)
		if rec.Code != http.StatusUnauthorized || exec.calls != 0 {
			t.Fatalf("Authorization %q: código %d, llamadas %d; quiero 401 sin ejecutar", auth, rec.Code, exec.calls)
		}
		if rec.Header().Get("WWW-Authenticate") != "Bearer" {
			t.Fatalf("el 401 dice qué esquema espera: %q", rec.Header().Get("WWW-Authenticate"))
		}
	}
}

func TestRunValidatesTheRequest(t *testing.T) {
	cases := map[string]struct {
		body string
		code int
	}{
		"campo desconocido": {`{"language":"rust","program":"x","limits":{"memory":"9g"}}`, http.StatusBadRequest},
		"lenguaje":          {`{"language":"python","program":"x"}`, http.StatusBadRequest},
		"programa vacío":    {`{"language":"go","program":"   "}`, http.StatusBadRequest},
		"programa grande":   {`{"language":"go","program":"` + strings.Repeat("x", 101) + `"}`, http.StatusRequestEntityTooLarge},
		"cuerpo grande":     {`{"language":"go","program":"` + strings.Repeat("x", 2000) + `"}`, http.StatusRequestEntityTooLarge},
		"JSON roto":         {`{"language":`, http.StatusBadRequest},
		"datos después":     {`{"language":"go","program":"x"} basura`, http.StatusBadRequest},
	}
	for name, tc := range cases {
		exec := &fakeExecutor{}
		rec := post(t, newServer(exec), tc.body, "Bearer "+token)
		if rec.Code != tc.code || exec.calls != 0 {
			t.Fatalf("%s: código %d (quiero %d), llamadas %d", name, rec.Code, tc.code, exec.calls)
		}
	}
}

func TestRunAnswersBusyWhenNoSlotFrees(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec)
	s.Slots <- struct{}{} // el único lugar está ocupado
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusServiceUnavailable || exec.calls != 0 {
		t.Fatalf("código %d, llamadas %d", rec.Code, exec.calls)
	}
	if rec.Header().Get("Retry-After") != "1" {
		t.Fatalf("ocupado no ejecutó nada y se puede reintentar: Retry-After = %q", rec.Header().Get("Retry-After"))
	}
}

func TestRunMapsSandboxFailuresTo500(t *testing.T) {
	rec := post(t, newServer(&fakeExecutor{err: errors.New("docker caído")}),
		`{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("código %d; quiero 500: el programa pudo haber corrido y no se reintenta solo", rec.Code)
	}
	if rec.Header().Get("Retry-After") != "" {
		t.Fatal("un fallo del sandbox no invita a reintentar")
	}
}

func TestRunReturnsTheResultAsJSON(t *testing.T) {
	want := sandbox.Result{Phase: "run", Stdout: "hola\n", CompileMs: 900, RunMs: 12}
	s := newServer(&fakeExecutor{result: want})
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusOK {
		t.Fatalf("código %d: %s", rec.Code, rec.Body.String())
	}
	var got sandbox.Result
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || got != want {
		t.Fatalf("got %+v, err %v", got, err)
	}
	var fields map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &fields); err != nil {
		t.Fatal(err)
	}
	keys := slices.Sorted(maps.Keys(fields))
	wantKeys := []string{"compileMs", "exitCode", "oomKilled", "phase", "runMs", "stderr", "stdout", "timedOut", "truncated"}
	if !slices.Equal(keys, wantKeys) {
		t.Fatalf("el contrato tiene exactamente estas claves: %v", keys)
	}
	if len(s.Slots) != 0 {
		t.Fatal("el lugar del semáforo se libera al terminar")
	}
}

func TestRunAcceptsAProgramOfExactlyMaxProgram(t *testing.T) {
	exec := &fakeExecutor{}
	rec := post(t, newServer(exec), `{"language":"go","program":"`+strings.Repeat("x", 100)+`"}`, "Bearer "+token)
	if rec.Code != http.StatusOK || exec.calls != 1 {
		t.Fatalf("código %d, llamadas %d; MaxProgram es un tope inclusivo", rec.Code, exec.calls)
	}
}

func TestRunWaitsForASlotWithinQueueWait(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec)
	s.QueueWait = 2 * time.Second
	s.Slots <- struct{}{}
	go func() {
		time.Sleep(50 * time.Millisecond)
		<-s.Slots // otra ejecución termina y libera su lugar
	}()
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusOK || exec.calls != 1 {
		t.Fatalf("código %d, llamadas %d; un lugar que se libera a tiempo se usa", rec.Code, exec.calls)
	}
}

type blockingExecutor struct {
	started chan struct{}
	seen    chan error
}

func (b *blockingExecutor) Execute(ctx context.Context, _ string, _ []byte) (sandbox.Result, error) {
	close(b.started)
	<-ctx.Done()
	b.seen <- ctx.Err()
	return sandbox.Result{}, ctx.Err()
}

func TestCancelledExecutionAnswers500(t *testing.T) {
	exec := &blockingExecutor{started: make(chan struct{}), seen: make(chan error, 1)}
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodPost, "/v1/run", strings.NewReader(`{"language":"go","program":"x"}`)).WithContext(ctx)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		newServer(exec).Handler().ServeHTTP(rec, req)
		close(done)
	}()
	// Cancela con la ejecución en curso, como el apagado (BaseContext: root): antes de tomar
	// lugar, la cancelación compite con el semáforo.
	select {
	case <-exec.started:
	case <-time.After(2 * time.Second):
		t.Fatal("el Executor nunca arrancó")
	}
	cancel()
	select {
	case err := <-exec.seen:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("el Executor recibe el contexto del pedido: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("el Executor nunca vio la cancelación")
	}
	<-done
	// Sin una respuesta explícita, net/http mandaría un 200 vacío que parece un resultado.
	if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), `"error"`) {
		t.Fatalf("una ejecución cancelada pudo haber corrido: 500, nunca un 200 vacío; llegó %d %q", rec.Code, rec.Body.String())
	}
}

func TestCancellationWhileWaitingForASlotAnswers503(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec)
	s.QueueWait = 2 * time.Second
	s.Slots <- struct{}{} // ocupado: el pedido queda esperando lugar
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodPost, "/v1/run", strings.NewReader(`{"language":"go","program":"x"}`)).WithContext(ctx)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	time.AfterFunc(50*time.Millisecond, cancel)
	start := time.Now()
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable || rec.Header().Get("Retry-After") != "1" || exec.calls != 0 {
		t.Fatalf("cancelado mientras esperaba (apagado): nada corrió, así que 503 con Retry-After y sin ejecutar; llegó %d %q, llamadas %d", rec.Code, rec.Body.String(), exec.calls)
	}
	// La espera de lugar observa la cancelación: no espera los 2 s de QueueWait.
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Fatalf("cancelado a los 50 ms, respondió a los %v: la espera ignora la cancelación", elapsed)
	}
}

func TestAlreadyCancelledRequestWithAFreeSlotAnswers503(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec) // un lugar libre
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	// El select elige al azar entre el lugar libre y la cancelación: varias vueltas.
	for range 50 {
		req := httptest.NewRequest(http.MethodPost, "/v1/run", strings.NewReader(`{"language":"go","program":"x"}`)).WithContext(ctx)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		s.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusServiceUnavailable || rec.Header().Get("Retry-After") != "1" {
			t.Fatalf("un pedido ya cancelado no ejecuta nada: 503 con Retry-After; llegó %d %q", rec.Code, rec.Body.String())
		}
	}
	if exec.calls != 0 {
		t.Fatalf("un pedido ya cancelado no llega al Executor: %d llamadas", exec.calls)
	}
}

func TestHandlerRefusesAnUnsafeConfiguration(t *testing.T) {
	for name, s := range map[string]*Server{
		"token corto": {Token: "corto", Slots: make(chan struct{}, 1)},
		"sin lugares": {Token: token, Slots: make(chan struct{})},
	} {
		func() {
			defer func() {
				if recover() == nil {
					t.Fatalf("%s: Handler debe negarse a armar el servidor", name)
				}
			}()
			s.Handler()
		}()
	}
}
