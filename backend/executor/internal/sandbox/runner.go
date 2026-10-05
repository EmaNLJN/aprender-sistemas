package sandbox

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"taller/executor/internal/output"
)

var ErrUnknownLanguage = errors.New("lenguaje no soportado")

// cleanupTimeout bounds Kill, Inspect and Remove, which use their own context: even if the
// request was cancelled, the container and the volume are still removed.
const cleanupTimeout = 10 * time.Second

// Runner compiles and runs a submission. Instance is the value of RunLabel on all its resources.
type Runner struct {
	Engine   Engine
	Profiles map[string]Profile
	Runtime  string
	Instance string
	Now      func() time.Time
	NewID    func() string
}

type phaseOutcome struct {
	state    State
	elapsed  time.Duration
	timedOut bool
}

// Execute compiles and, if that worked, runs. An error means the sandbox failed (Docker or a
// cancelled request); problems with the program come back in Result.
func (r *Runner) Execute(ctx context.Context, language string, program []byte) (Result, error) {
	profile, ok := r.Profiles[language]
	if !ok {
		return Result{}, ErrUnknownLanguage
	}
	id := r.NewID()
	labels := map[string]string{RunLabel: r.Instance, CreatedLabel: strconv.FormatInt(r.Now().Unix(), 10)}
	volume := "taller-out-" + id
	// The removal is registered before creating: if the request is cancelled mid-creation, the
	// daemon may finish it anyway. Removing something that does not exist fails harmlessly.
	defer r.cleanup(func(c context.Context) error { return r.Engine.RemoveVolume(c, volume) })
	if err := r.Engine.CreateVolume(ctx, volume, labels); err != nil {
		return Result{}, err
	}

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
	defer r.cleanup(func(c context.Context) error { return r.Engine.Remove(c, spec.Name) })
	if err := r.Engine.Create(ctx, spec); err != nil {
		return phaseOutcome{}, err
	}

	phaseCtx, cancel := context.WithTimeout(ctx, spec.Phase.Timeout)
	defer cancel()
	started := r.Now()
	startErr := r.Engine.Start(phaseCtx, spec.Name, bytes.NewReader(stdin), stdout, stderr)
	elapsed := r.Now().Sub(started)

	if startErr != nil && phaseCtx.Err() != nil {
		// Expired or cancelled: the Docker client died, but the container may still be alive.
		r.cleanup(func(c context.Context) error { return r.Engine.Kill(c, spec.Name) })
		if ctx.Err() != nil {
			return phaseOutcome{}, ctx.Err()
		}
		state, err := r.inspect(spec.Name)
		if err != nil {
			return phaseOutcome{}, err
		}
		if state.Status == "created" {
			return phaseOutcome{}, fmt.Errorf("el contenedor %s no llegó a arrancar antes del plazo", spec.Name)
		}
		return phaseOutcome{state: state, elapsed: elapsed, timedOut: true}, nil
	}
	if startErr != nil {
		return phaseOutcome{}, startErr
	}
	// Start returned without error: the program finished, even if the deadline expired an instant later.
	state, err := r.inspect(spec.Name)
	if err != nil {
		return phaseOutcome{}, err
	}
	if state.Status != "exited" {
		// The CLI may exit on a failure of its own (broken attach, failed wait) with the container
		// still alive: that code is not a student result.
		return phaseOutcome{}, fmt.Errorf("docker start terminó con %s en estado %q", spec.Name, state.Status)
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

// cleanup ignores the error: the sweeper removes whatever remains (sweeper.go).
func (r *Runner) cleanup(step func(context.Context) error) {
	c, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
	defer cancel()
	_ = step(c)
}

func newStreams(limit int) (*output.Limited, *output.Limited) {
	return &output.Limited{Max: limit}, &output.Limited{Max: limit}
}

// joinOutput joins the compile warnings with the run stderr.
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
