package sandbox

import (
	"context"
	"errors"
	"io"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakePhase struct {
	stdout, stderr string
	state          State
	block          bool          // simula un programa que no termina: espera a que venza el contexto
	delay          time.Duration // simula un programa que termina después del plazo sin mirar el contexto
}

type fakeEngine struct {
	mu           sync.Mutex
	calls        []string
	specs        []Spec
	stdins       []string
	volumeLabels map[string]string
	compile      fakePhase
	run          fakePhase
	createErr    error
	startErr     error // un fallo de Start que no viene del contexto
	inspectErr   error
	onStart      func() // se llama al entrar a Start (para cancelar el pedido a mitad de camino)
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

func (f *fakeEngine) CreateVolume(_ context.Context, name string, labels map[string]string) error {
	f.record("volume-create " + name)
	f.volumeLabels = labels
	return nil
}

func (f *fakeEngine) RemoveVolume(_ context.Context, name string) error {
	f.record("volume-rm " + name)
	return nil
}

func (f *fakeEngine) Create(_ context.Context, spec Spec) error {
	f.record("create " + spec.Name)
	f.specs = append(f.specs, spec)
	return f.createErr
}

func (f *fakeEngine) Start(ctx context.Context, name string, stdin io.Reader, stdout, stderr io.Writer) error {
	f.record("start " + name)
	if f.onStart != nil {
		f.onStart()
	}
	input, _ := io.ReadAll(stdin)
	f.stdins = append(f.stdins, string(input))
	phase := f.phaseFor(name)
	io.WriteString(stdout, phase.stdout)
	io.WriteString(stderr, phase.stderr)
	if phase.block {
		<-ctx.Done()
		return ctx.Err()
	}
	time.Sleep(phase.delay)
	return f.startErr
}

func (f *fakeEngine) Kill(_ context.Context, name string) error {
	f.record("kill " + name)
	return nil
}

// Inspect devuelve el estado de la fase; sin Status explícito, el contenedor terminó.
func (f *fakeEngine) Inspect(_ context.Context, name string) (State, error) {
	f.record("inspect " + name)
	state := f.phaseFor(name).state
	if state.Status == "" {
		state.Status = "exited"
	}
	return state, f.inspectErr
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
		Engine: engine, Profiles: profiles, Runtime: "runsc", Instance: "pruebas",
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

func TestCompileGetsTheProgramAndRunGetsNoStdin(t *testing.T) {
	engine := &fakeEngine{}
	runner := newTestRunner(engine)
	runner.Now = func() time.Time { return time.Unix(1_700_000_000, 0) }
	if _, err := runner.Execute(context.Background(), "rust", []byte("fn main(){}")); err != nil {
		t.Fatal(err)
	}
	if len(engine.stdins) != 2 || engine.stdins[0] != "fn main(){}" || engine.stdins[1] != "" {
		t.Fatalf("stdin = %q; la compilación recibe el programa y la ejecución nada", engine.stdins)
	}
	created := strconv.FormatInt(1_700_000_000, 10)
	for _, labels := range []map[string]string{engine.volumeLabels, engine.specs[0].Labels, engine.specs[1].Labels} {
		if labels[RunLabel] != "pruebas" || labels[CreatedLabel] != created {
			t.Fatalf("el barrido depende de estas etiquetas: %v", labels)
		}
	}
}

func TestInspectFailureIsAnError(t *testing.T) {
	engine := &fakeEngine{inspectErr: errors.New("Cannot connect to the Docker daemon")}
	if _, err := newTestRunner(engine).Execute(context.Background(), "go", []byte("x")); err == nil {
		t.Fatal("si no se puede leer el estado, es un fallo del sandbox")
	}
	if engine.calls[len(engine.calls)-1] != "volume-rm taller-out-id1" {
		t.Fatalf("el volumen se borra igual: %v", engine.calls)
	}
}

func TestStartFailureThatIsNotTheDeadlineIsAnError(t *testing.T) {
	engine := &fakeEngine{startErr: errors.New("error waiting for container: attach cortado")}
	if _, err := newTestRunner(engine).Execute(context.Background(), "go", []byte("x")); err == nil {
		t.Fatal("un fallo de la CLI no es un resultado del alumno")
	}
}

func TestContainerStillRunningAfterStartIsAnError(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{state: State{Status: "running"}}}
	if _, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x")); err == nil {
		t.Fatal("si la CLI terminó con el contenedor vivo, el código 0 no es del programa")
	}
}

func TestContainerThatNeverStartedIsAnErrorEvenAtTheDeadline(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{block: true, state: State{Status: "created"}}}
	if _, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x")); err == nil {
		t.Fatal("un arranque que no llegó antes del plazo no es un plazo vencido del alumno")
	}
}

func TestAProgramThatFinishedIsNotReportedAsTimedOut(t *testing.T) {
	// El plazo de las pruebas es de 200 ms: el programa termina después, pero Start volvió sin error.
	engine := &fakeEngine{run: fakePhase{delay: 300 * time.Millisecond, stdout: "listo\n"}}
	result, err := newTestRunner(engine).Execute(context.Background(), "go", []byte("x"))
	if err != nil {
		t.Fatal(err)
	}
	if result.TimedOut || result.Stdout != "listo\n" {
		t.Fatalf("si Start volvió sin error, el programa terminó: %+v", result)
	}
}
