package sandbox

import (
	"context"
	"errors"
	"io"
	"os/exec"
	"slices"
	"strings"
	"testing"
	"time"
)

type commandCall struct {
	args []string
}

// scripted devuelve un Commander que registra cada llamada y responde según el subcomando.
func scripted(calls *[]commandCall, stdout map[string]string, fail map[string]error) Commander {
	return func(_ context.Context, name string, args []string, _ io.Reader, out, _ io.Writer) error {
		if name != "docker" {
			return errors.New("sólo se invoca docker")
		}
		*calls = append(*calls, commandCall{args: args})
		key := strings.Join(args[:min(2, len(args))], " ")
		if text, ok := stdout[key]; ok {
			io.WriteString(out, text)
		}
		return fail[key]
	}
}

func TestCreateUsesTheHardenedArgs(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, nil, nil)}
	spec := specFor("rust", false)
	if err := cli.Create(context.Background(), spec); err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(calls[0].args, createArgs(spec)) {
		t.Fatalf("args = %v", calls[0].args)
	}
}

func TestCreateErrorIncludesDockerMessage(t *testing.T) {
	var calls []commandCall
	fail := map[string]error{"create --name": errors.New("exit status 125")}
	cli := DockerCLI{Exec: scripted(&calls, nil, fail)}
	err := cli.Create(context.Background(), specFor("rust", false))
	if err == nil || !strings.Contains(err.Error(), "docker create") {
		t.Fatalf("err = %v", err)
	}
}

func TestStartTreatsANonZeroProgramExitAsSuccess(t *testing.T) {
	exitErr := exec.Command("sh", "-c", "exit 3").Run()
	cli := DockerCLI{Exec: func(context.Context, string, []string, io.Reader, io.Writer, io.Writer) error {
		return exitErr
	}}
	if err := cli.Start(context.Background(), "taller-r-1", nil, io.Discard, io.Discard); err != nil {
		t.Fatalf("el código del programa se lee con Inspect, no es un error: %v", err)
	}
}

func TestStartReportsCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	exitErr := exec.Command("sh", "-c", "exit 1").Run()
	cli := DockerCLI{Exec: func(context.Context, string, []string, io.Reader, io.Writer, io.Writer) error {
		return exitErr
	}}
	if err := cli.Start(ctx, "taller-r-1", nil, io.Discard, io.Discard); err == nil {
		t.Fatal("con el contexto cancelado debe devolver el error")
	}
}

func TestInspectParsesExitCodeAndOOM(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, map[string]string{"inspect --format": `137 true ""`}, nil)}
	state, err := cli.Inspect(context.Background(), "taller-r-1")
	if err != nil || state != (State{ExitCode: 137, OOMKilled: true}) {
		t.Fatalf("state = %+v, err = %v", state, err)
	}
}

func TestInspectFailsWhenDockerCouldNotStartTheContainer(t *testing.T) {
	var calls []commandCall
	out := map[string]string{"inspect --format": `128 false "failed to create task for container: runsc: exit status 1"`}
	cli := DockerCLI{Exec: scripted(&calls, out, nil)}
	_, err := cli.Inspect(context.Background(), "taller-r-1")
	if err == nil || !strings.Contains(err.Error(), "failed to create task") {
		t.Fatalf("un arranque fallido es un error del sandbox, no un código del programa: %v", err)
	}
}

func TestInspectRejectsUnexpectedOutput(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, map[string]string{"inspect --format": "basura"}, nil)}
	if _, err := cli.Inspect(context.Background(), "x"); err == nil {
		t.Fatal("una salida inesperada debe ser un error")
	}
}

func TestListLabeledReadsContainersAndVolumes(t *testing.T) {
	var calls []commandCall
	out := map[string]string{
		"ps --all":  "taller-c-1\t100\ntaller-r-1\t\n",
		"volume ls": "taller-out-1\t100\n",
	}
	cli := DockerCLI{Exec: scripted(&calls, out, nil)}
	resources, err := cli.ListLabeled(context.Background(), RunLabel+"=1")
	if err != nil {
		t.Fatal(err)
	}
	want := []Resource{
		{Kind: "container", Name: "taller-c-1", Created: time.Unix(100, 0)},
		{Kind: "container", Name: "taller-r-1"},
		{Kind: "volume", Name: "taller-out-1", Created: time.Unix(100, 0)},
	}
	if !slices.Equal(resources, want) {
		t.Fatalf("resources = %+v", resources)
	}
	if !slices.Contains(calls[0].args, "label="+RunLabel+"=1") {
		t.Fatalf("debe filtrar por la etiqueta del ejecutor: %v", calls[0].args)
	}
}

func TestCreateVolumeSortsLabels(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, nil, nil)}
	cli.CreateVolume(context.Background(), "taller-out-1", map[string]string{"b": "2", "a": "1"})
	want := []string{"volume", "create", "--label", "a=1", "--label", "b=2", "taller-out-1"}
	if !slices.Equal(calls[0].args, want) {
		t.Fatalf("args = %v", calls[0].args)
	}
}
