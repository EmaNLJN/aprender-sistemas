package sandbox

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type Commander func(ctx context.Context, name string, args []string, stdin io.Reader, stdout, stderr io.Writer) error

// ExecCommand runs a system binary. If the context expires, WaitDelay avoids waiting forever for
// the pipes the Docker client keeps open to close.
func ExecCommand(ctx context.Context, name string, args []string, stdin io.Reader, stdout, stderr io.Writer) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = stdin, stdout, stderr
	cmd.WaitDelay = 2 * time.Second
	return cmd.Run()
}

type DockerCLI struct{ Exec Commander }

func (d DockerCLI) run(ctx context.Context, args []string, stdout io.Writer) error {
	if stdout == nil {
		stdout = io.Discard
	}
	var stderr bytes.Buffer
	if err := d.Exec(ctx, "docker", args, nil, stdout, &stderr); err != nil {
		return fmt.Errorf("docker %s: %w: %s", args[0], err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (d DockerCLI) Create(ctx context.Context, spec Spec) error {
	return d.run(ctx, createArgs(spec), nil)
}

func (d DockerCLI) Start(ctx context.Context, name string, stdin io.Reader, stdout, stderr io.Writer) error {
	err := d.Exec(ctx, "docker", []string{"start", "--attach", "--interactive", name}, stdin, stdout, stderr)
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) && ctx.Err() == nil {
		return nil
	}
	return err
}

func (d DockerCLI) Kill(ctx context.Context, name string) error {
	return d.run(ctx, []string{"kill", name}, nil)
}

func (d DockerCLI) Remove(ctx context.Context, name string) error {
	return d.run(ctx, []string{"rm", "--force", name}, nil)
}

func (d DockerCLI) Inspect(ctx context.Context, name string) (State, error) {
	var out bytes.Buffer
	format := "{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}} {{json .State.Error}}"
	if err := d.run(ctx, []string{"inspect", "--format", format, name}, &out); err != nil {
		return State{}, err
	}
	return parseState(out.String())
}

// If Docker could not start the container, `docker start` still exits non-zero and Start cannot
// tell it apart from the program: that code is not the student's, so it is a sandbox error.
func parseState(raw string) (State, error) {
	fields := strings.SplitN(strings.TrimSpace(raw), " ", 4)
	if len(fields) != 4 {
		return State{}, fmt.Errorf("salida inesperada de docker inspect: %q", raw)
	}
	code, err := strconv.Atoi(fields[1])
	if err != nil {
		return State{}, fmt.Errorf("código de salida inválido: %q", fields[1])
	}
	oom, err := strconv.ParseBool(fields[2])
	if err != nil {
		return State{}, fmt.Errorf("OOMKilled inválido: %q", fields[2])
	}
	var startErr string
	if err := json.Unmarshal([]byte(fields[3]), &startErr); err != nil {
		return State{}, fmt.Errorf("error de arranque ilegible: %q", fields[3])
	}
	if startErr != "" {
		return State{}, fmt.Errorf("docker no pudo arrancar el contenedor: %s", startErr)
	}
	return State{ExitCode: code, OOMKilled: oom, Status: fields[0]}, nil
}

func (d DockerCLI) CreateVolume(ctx context.Context, name string, labels map[string]string) error {
	args := append([]string{"volume", "create"}, labelArgs(labels)...)
	return d.run(ctx, append(args, name), nil)
}

func (d DockerCLI) RemoveVolume(ctx context.Context, name string) error {
	return d.run(ctx, []string{"volume", "rm", "--force", name}, nil)
}

func (d DockerCLI) ListLabeled(ctx context.Context, label string) ([]Resource, error) {
	created := `{{.Label "` + CreatedLabel + `"}}`
	var containers, volumes bytes.Buffer
	if err := d.run(ctx, []string{"ps", "--all", "--filter", "label=" + label, "--format", "{{.Names}}\t" + created}, &containers); err != nil {
		return nil, err
	}
	if err := d.run(ctx, []string{"volume", "ls", "--filter", "label=" + label, "--format", "{{.Name}}\t" + created}, &volumes); err != nil {
		return nil, err
	}
	return append(parseResources("container", containers.String()), parseResources("volume", volumes.String())...), nil
}

func parseResources(kind, raw string) []Resource {
	var resources []Resource
	for _, line := range strings.Split(strings.TrimSpace(raw), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		name, created, _ := strings.Cut(line, "\t")
		resource := Resource{Kind: kind, Name: strings.TrimSpace(name)}
		if unix, err := strconv.ParseInt(strings.TrimSpace(created), 10, 64); err == nil {
			resource.Created = time.Unix(unix, 0)
		}
		resources = append(resources, resource)
	}
	return resources
}
