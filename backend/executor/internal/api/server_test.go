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
	for _, auth := range []string{"", "Bearer other-token", token, sameLength} {
		exec := &fakeExecutor{}
		rec := post(t, newServer(exec), `{"language":"rust","program":"fn main(){}"}`, auth)
		if rec.Code != http.StatusUnauthorized || exec.calls != 0 {
			t.Fatalf("Authorization %q: code %d, calls %d; want 401 without executing", auth, rec.Code, exec.calls)
		}
		if rec.Header().Get("WWW-Authenticate") != "Bearer" {
			t.Fatalf("the 401 states the expected scheme: %q", rec.Header().Get("WWW-Authenticate"))
		}
	}
}

func TestRunValidatesTheRequest(t *testing.T) {
	cases := map[string]struct {
		body string
		code int
	}{
		"unknown field": {`{"language":"rust","program":"x","limits":{"memory":"9g"}}`, http.StatusBadRequest},
		"language":      {`{"language":"python","program":"x"}`, http.StatusBadRequest},
		"empty program": {`{"language":"go","program":"   "}`, http.StatusBadRequest},
		"large program": {`{"language":"go","program":"` + strings.Repeat("x", 101) + `"}`, http.StatusRequestEntityTooLarge},
		"large body":    {`{"language":"go","program":"` + strings.Repeat("x", 2000) + `"}`, http.StatusRequestEntityTooLarge},
		"broken JSON":   {`{"language":`, http.StatusBadRequest},
		"trailing data": {`{"language":"go","program":"x"} garbage`, http.StatusBadRequest},
	}
	for name, tc := range cases {
		exec := &fakeExecutor{}
		rec := post(t, newServer(exec), tc.body, "Bearer "+token)
		if rec.Code != tc.code || exec.calls != 0 {
			t.Fatalf("%s: code %d (want %d), calls %d", name, rec.Code, tc.code, exec.calls)
		}
	}
}

func TestRunAnswersBusyWhenNoSlotFrees(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec)
	s.Slots <- struct{}{} // the only slot is taken
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusServiceUnavailable || exec.calls != 0 {
		t.Fatalf("code %d, calls %d", rec.Code, exec.calls)
	}
	if rec.Header().Get("Retry-After") != "1" {
		t.Fatalf("busy ran nothing and can be retried: Retry-After = %q", rec.Header().Get("Retry-After"))
	}
}

func TestRunMapsSandboxFailuresTo500(t *testing.T) {
	rec := post(t, newServer(&fakeExecutor{err: errors.New("docker down")}),
		`{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("code %d; want 500: the program may have run and is not retried on its own", rec.Code)
	}
	if rec.Header().Get("Retry-After") != "" {
		t.Fatal("a sandbox failure does not invite a retry")
	}
}

func TestRunReturnsTheResultAsJSON(t *testing.T) {
	want := sandbox.Result{Phase: "run", Stdout: "hello\n", CompileMs: 900, RunMs: 12}
	s := newServer(&fakeExecutor{result: want})
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d: %s", rec.Code, rec.Body.String())
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
		t.Fatalf("the contract has exactly these keys: %v", keys)
	}
	if len(s.Slots) != 0 {
		t.Fatal("the semaphore slot is released when done")
	}
}

func TestRunAcceptsAProgramOfExactlyMaxProgram(t *testing.T) {
	exec := &fakeExecutor{}
	rec := post(t, newServer(exec), `{"language":"go","program":"`+strings.Repeat("x", 100)+`"}`, "Bearer "+token)
	if rec.Code != http.StatusOK || exec.calls != 1 {
		t.Fatalf("code %d, calls %d; MaxProgram is an inclusive cap", rec.Code, exec.calls)
	}
}

func TestRunWaitsForASlotWithinQueueWait(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec)
	s.QueueWait = 2 * time.Second
	s.Slots <- struct{}{}
	go func() {
		time.Sleep(50 * time.Millisecond)
		<-s.Slots // another execution finishes and frees its slot
	}()
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusOK || exec.calls != 1 {
		t.Fatalf("code %d, calls %d; a slot freed in time is used", rec.Code, exec.calls)
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
	// Cancel while the execution is running, like shutdown (BaseContext: root): before taking a
	// slot, cancellation races with the semaphore.
	select {
	case <-exec.started:
	case <-time.After(2 * time.Second):
		t.Fatal("the Executor never started")
	}
	cancel()
	select {
	case err := <-exec.seen:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("the Executor receives the request context: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the Executor never saw the cancellation")
	}
	<-done
	// Without an explicit response, net/http would send an empty 200 that looks like a result.
	if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), `"error"`) {
		t.Fatalf("a cancelled execution may have run: 500, never an empty 200; got %d %q", rec.Code, rec.Body.String())
	}
}

func TestCancellationWhileWaitingForASlotAnswers503(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec)
	s.QueueWait = 2 * time.Second
	s.Slots <- struct{}{} // taken: the request waits for a slot
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodPost, "/v1/run", strings.NewReader(`{"language":"go","program":"x"}`)).WithContext(ctx)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	time.AfterFunc(50*time.Millisecond, cancel)
	start := time.Now()
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable || rec.Header().Get("Retry-After") != "1" || exec.calls != 0 {
		t.Fatalf("cancelled while waiting (shutdown): nothing ran, so 503 with Retry-After and no execution; got %d %q, calls %d", rec.Code, rec.Body.String(), exec.calls)
	}
	// The slot wait observes cancellation: it does not wait the 2 s of QueueWait.
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Fatalf("cancelled at 50 ms, answered at %v: the wait ignores cancellation", elapsed)
	}
}

func TestAlreadyCancelledRequestWithAFreeSlotAnswers503(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec) // one free slot
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	// select picks at random between the free slot and cancellation: several rounds.
	for range 50 {
		req := httptest.NewRequest(http.MethodPost, "/v1/run", strings.NewReader(`{"language":"go","program":"x"}`)).WithContext(ctx)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		s.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusServiceUnavailable || rec.Header().Get("Retry-After") != "1" {
			t.Fatalf("an already cancelled request runs nothing: 503 with Retry-After; got %d %q", rec.Code, rec.Body.String())
		}
	}
	if exec.calls != 0 {
		t.Fatalf("an already cancelled request never reaches the Executor: %d calls", exec.calls)
	}
}

func TestHandlerRefusesAnUnsafeConfiguration(t *testing.T) {
	for name, s := range map[string]*Server{
		"short token": {Token: "short", Slots: make(chan struct{}, 1)},
		"no slots":    {Token: token, Slots: make(chan struct{})},
	} {
		func() {
			defer func() {
				if recover() == nil {
					t.Fatalf("%s: Handler must refuse to build the server", name)
				}
			}()
			s.Handler()
		}()
	}
}
