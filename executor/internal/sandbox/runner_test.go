package sandbox

import (
	"context"
	"errors"
	"io"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakePhase struct {
	stdout, stderr string
	state          State
	block          bool // simula un programa que no termina: espera a que venza el contexto
}

type fakeEngine struct {
	mu        sync.Mutex
	calls     []string
	compile   fakePhase
	run       fakePhase
	createErr error
	onStart   func() // se llama al entrar a Start (para cancelar el pedido a mitad de camino)
}

func (f *fakeEngine) record(call string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, call)
}

func (f *fakeEngine) phaseFor(name string) fakePhase {
	if strings.HasPrefix(name, "taller-c-") {
		return f.compile
	}
	return f.run
}

func (f *fakeEngine) CreateVolume(_ context.Context, name string, _ map[string]string) error {
	f.record("volume-create " + name)
	return nil
}

func (f *fakeEngine) RemoveVolume(_ context.Context, name string) error {
	f.record("volume-rm " + name)
	return nil
}

func (f *fakeEngine) Create(_ context.Context, spec Spec) error {
	f.record("create " + spec.Name)
	return f.createErr
}

func (f *fakeEngine) Start(ctx context.Context, name string, _ io.Reader, stdout, stderr io.Writer) error {
	f.record("start " + name)
	if f.onStart != nil {
		f.onStart()
	}
	phase := f.phaseFor(name)
	io.WriteString(stdout, phase.stdout)
	io.WriteString(stderr, phase.stderr)
	if phase.block {
		<-ctx.Done()
		return ctx.Err()
	}
	return nil
}

func (f *fakeEngine) Kill(_ context.Context, name string) error {
	f.record("kill " + name)
	return nil
}

func (f *fakeEngine) Inspect(_ context.Context, name string) (State, error) {
	f.record("inspect " + name)
	return f.phaseFor(name).state, nil
}

func (f *fakeEngine) Remove(_ context.Context, name string) error {
	f.record("rm " + name)
	return nil
}

func (f *fakeEngine) ListLabeled(context.Context, string) ([]Resource, error) { return nil, nil }

func newTestRunner(engine Engine) *Runner {
	profiles := Profiles("rust-img", "go-img")
	for language, profile := range profiles {
		profile.Compile.Timeout = 200 * time.Millisecond
		profile.Run.Timeout = 200 * time.Millisecond
		profiles[language] = profile
	}
	return &Runner{
		Engine: engine, Profiles: profiles, Runtime: "runsc",
		Now: time.Now, NewID: func() string { return "id1" },
	}
}

func TestRunsCompileThenRunAndReportsBoth(t *testing.T) {
	engine := &fakeEngine{
		compile: fakePhase{stderr: "warning: variable sin usar\n"},
		run:     fakePhase{stdout: "hola\n"},
	}
	result, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("fn main(){}"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "run" || result.ExitCode != 0 || result.Stdout != "hola\n" {
		t.Fatalf("resultado inesperado: %+v", result)
	}
	if result.Stderr != "warning: variable sin usar\n" {
		t.Fatalf("las advertencias de compilación llegan al alumno: %q", result.Stderr)
	}
	want := []string{
		"volume-create taller-out-id1",
		"create taller-c-id1", "start taller-c-id1", "inspect taller-c-id1", "rm taller-c-id1",
		"create taller-r-id1", "start taller-r-id1", "inspect taller-r-id1", "rm taller-r-id1",
		"volume-rm taller-out-id1",
	}
	if !slices.Equal(engine.calls, want) {
		t.Fatalf("llamadas = %v\nquiero   %v", engine.calls, want)
	}
}

func TestCompileErrorStopsBeforeRunning(t *testing.T) {
	engine := &fakeEngine{compile: fakePhase{stderr: "error[E0308]: mismatched types\n", state: State{ExitCode: 1}}}
	result, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "compile" || result.ExitCode != 1 || !strings.Contains(result.Stderr, "E0308") {
		t.Fatalf("resultado inesperado: %+v", result)
	}
	if slices.Contains(engine.calls, "create taller-r-id1") {
		t.Fatal("no se ejecuta lo que no compiló")
	}
	if engine.calls[len(engine.calls)-1] != "volume-rm taller-out-id1" {
		t.Fatalf("el volumen se borra siempre: %v", engine.calls)
	}
}

func TestRunTimeoutKillsAndStillCleansUp(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{block: true, state: State{ExitCode: 137}}}
	result, err := newTestRunner(engine).Execute(context.Background(), "go", []byte("x"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "run" || !result.TimedOut {
		t.Fatalf("debe informar el tiempo agotado: %+v", result)
	}
	for _, call := range []string{"kill taller-r-id1", "rm taller-r-id1", "volume-rm taller-out-id1"} {
		if !slices.Contains(engine.calls, call) {
			t.Fatalf("falta %q en %v", call, engine.calls)
		}
	}
}

func TestCompileTimeoutIsReported(t *testing.T) {
	engine := &fakeEngine{compile: fakePhase{block: true}}
	result, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "compile" || !result.TimedOut {
		t.Fatalf("resultado inesperado: %+v", result)
	}
}

func TestOOMIsReported(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{state: State{ExitCode: 137, OOMKilled: true}}}
	result, _ := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if !result.OOMKilled || result.ExitCode != 137 {
		t.Fatalf("resultado inesperado: %+v", result)
	}
}

func TestOutputIsCappedPerStream(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{stdout: strings.Repeat("x", 100<<10)}}
	result, _ := newTestRunner(engine).Execute(context.Background(), "go", []byte("x"))
	if len(result.Stdout) != 64<<10 || !result.Truncated {
		t.Fatalf("stdout de %d bytes, truncated=%v", len(result.Stdout), result.Truncated)
	}
}

func TestEngineFailureIsAnErrorAndStillRemovesTheVolume(t *testing.T) {
	engine := &fakeEngine{createErr: errors.New("Cannot connect to the Docker daemon")}
	_, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if err == nil {
		t.Fatal("un fallo de Docker es un error, no un resultado del alumno")
	}
	if engine.calls[len(engine.calls)-1] != "volume-rm taller-out-id1" {
		t.Fatalf("el volumen se borra igual: %v", engine.calls)
	}
}

func TestUnknownLanguage(t *testing.T) {
	_, err := newTestRunner(&fakeEngine{}).Execute(context.Background(), "python", []byte("x"))
	if !errors.Is(err, ErrUnknownLanguage) {
		t.Fatalf("err = %v; quiero ErrUnknownLanguage", err)
	}
}

func TestClientCancellationKillsWithoutReportingATimeout(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	engine := &fakeEngine{run: fakePhase{block: true}}
	engine.onStart = func() {
		if engine.calls[len(engine.calls)-1] == "start taller-r-id1" {
			cancel()
		}
	}
	_, err := newTestRunner(engine).Execute(ctx, "rust", []byte("x"))
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("err = %v; quiero context.Canceled", err)
	}
	for _, call := range []string{"kill taller-r-id1", "rm taller-r-id1", "volume-rm taller-out-id1"} {
		if !slices.Contains(engine.calls, call) {
			t.Fatalf("falta %q en %v", call, engine.calls)
		}
	}
}
