package sandbox

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strconv"
	"strings"
	"time"

	"taller/executor/internal/output"
)

var ErrUnknownLanguage = errors.New("lenguaje no soportado")

// cleanupTimeout acota Kill, Inspect y Remove, que usan un contexto propio: aunque el pedido
// se haya cancelado, el contenedor y el volumen se borran igual.
const cleanupTimeout = 10 * time.Second

type Runner struct {
	Engine   Engine
	Profiles map[string]Profile
	Runtime  string
	Now      func() time.Time
	NewID    func() string
}

type phaseOutcome struct {
	state    State
	elapsed  time.Duration
	timedOut bool
}

// Execute compila y, si compiló, ejecuta. Un error significa que el sandbox falló (Docker o
// pedido cancelado); los problemas del programa vuelven en Result.
func (r *Runner) Execute(ctx context.Context, language string, program []byte) (Result, error) {
	profile, ok := r.Profiles[language]
	if !ok {
		return Result{}, ErrUnknownLanguage
	}
	id := r.NewID()
	labels := map[string]string{RunLabel: "1", CreatedLabel: strconv.FormatInt(r.Now().Unix(), 10)}
	volume := "taller-out-" + id
	if err := r.Engine.CreateVolume(ctx, volume, labels); err != nil {
		return Result{}, err
	}
	defer r.cleanup(func(c context.Context) error { return r.Engine.RemoveVolume(c, volume) })

	compileOut, compileErr := newStreams(profile.OutputLimit)
	compiled, err := r.phase(ctx, r.spec("taller-c-"+id, profile.Image, profile.Compile, volume, labels),
		program, compileOut, compileErr)
	if err != nil {
		return Result{}, err
	}
	result := Result{
		Phase: "compile", ExitCode: compiled.state.ExitCode, OOMKilled: compiled.state.OOMKilled,
		TimedOut: compiled.timedOut, Stdout: compileOut.String(), Stderr: compileErr.String(),
		Truncated: compileOut.Truncated() || compileErr.Truncated(),
		CompileMs: compiled.elapsed.Milliseconds(),
	}
	if compiled.timedOut || compiled.state.OOMKilled || compiled.state.ExitCode != 0 {
		return result, nil
	}

	runOut, runErr := newStreams(profile.OutputLimit)
	ran, err := r.phase(ctx, r.spec("taller-r-"+id, profile.Image, profile.Run, volume, labels),
		nil, runOut, runErr)
	if err != nil {
		return Result{}, err
	}
	result.Phase = "run"
	result.ExitCode = ran.state.ExitCode
	result.OOMKilled = ran.state.OOMKilled
	result.TimedOut = ran.timedOut
	result.Stdout = runOut.String()
	result.Stderr = joinOutput(compileErr.String(), runErr.String())
	result.Truncated = result.Truncated || runOut.Truncated() || runErr.Truncated()
	result.RunMs = ran.elapsed.Milliseconds()
	return result, nil
}

func (r *Runner) phase(ctx context.Context, spec Spec, stdin []byte, stdout, stderr io.Writer) (phaseOutcome, error) {
	if err := r.Engine.Create(ctx, spec); err != nil {
		return phaseOutcome{}, err
	}
	defer r.cleanup(func(c context.Context) error { return r.Engine.Remove(c, spec.Name) })

	phaseCtx, cancel := context.WithTimeout(ctx, spec.Phase.Timeout)
	defer cancel()
	started := r.Now()
	startErr := r.Engine.Start(phaseCtx, spec.Name, bytes.NewReader(stdin), stdout, stderr)
	elapsed := r.Now().Sub(started)

	if phaseCtx.Err() != nil {
		// Vencido o cancelado: el cliente de Docker murió, pero el contenedor puede seguir vivo.
		r.cleanup(func(c context.Context) error { return r.Engine.Kill(c, spec.Name) })
		if ctx.Err() != nil {
			return phaseOutcome{}, ctx.Err()
		}
		state, err := r.inspect(spec.Name)
		if err != nil {
			return phaseOutcome{}, err
		}
		return phaseOutcome{state: state, elapsed: elapsed, timedOut: true}, nil
	}
	if startErr != nil {
		return phaseOutcome{}, startErr
	}
	state, err := r.inspect(spec.Name)
	if err != nil {
		return phaseOutcome{}, err
	}
	return phaseOutcome{state: state, elapsed: elapsed}, nil
}

func (r *Runner) spec(name, image string, phase Phase, volume string, labels map[string]string) Spec {
	return Spec{Name: name, Image: image, Phase: phase, Volume: volume, Labels: labels, Runtime: r.Runtime}
}

func (r *Runner) inspect(name string) (State, error) {
	c, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
	defer cancel()
	return r.Engine.Inspect(c, name)
}

// cleanup ignora el error: lo que quede lo borra el barrido (sweeper.go).
func (r *Runner) cleanup(step func(context.Context) error) {
	c, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
	defer cancel()
	_ = step(c)
}

func newStreams(limit int) (*output.Limited, *output.Limited) {
	return &output.Limited{Max: limit}, &output.Limited{Max: limit}
}

// joinOutput une las advertencias de compilación con el stderr de la ejecución.
func joinOutput(compile, run string) string {
	if compile == "" {
		return run
	}
	if run == "" {
		return compile
	}
	if !strings.HasSuffix(compile, "\n") {
		compile += "\n"
	}
	return compile + run
}
