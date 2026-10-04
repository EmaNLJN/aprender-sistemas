package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
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
	for _, auth := range []string{"", "Bearer otro-token", token} {
		rec := post(t, newServer(&fakeExecutor{}), `{"language":"rust","program":"fn main(){}"}`, auth)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Authorization %q: código %d; quiero 401", auth, rec.Code)
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
	if !strings.Contains(rec.Body.String(), `"exitCode"`) || !strings.Contains(rec.Body.String(), `"timedOut"`) {
		t.Fatalf("el contrato usa camelCase: %s", rec.Body.String())
	}
	if len(s.Slots) != 0 {
		t.Fatal("el lugar del semáforo se libera al terminar")
	}
}
