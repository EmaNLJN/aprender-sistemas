package sandbox

import (
	"context"
	"io"
)

// Engine es lo único que habla con Docker. La implementación real usa la CLI (docker.go);
// las pruebas usan un doble en memoria.
type Engine interface {
	CreateVolume(ctx context.Context, name string, labels map[string]string) error
	RemoveVolume(ctx context.Context, name string) error
	Create(ctx context.Context, spec Spec) error
	// Start conecta stdin/stdout/stderr y espera. Devuelve nil si terminó con un código distinto
	// de 0 sin que venciera el contexto: puede ser el programa o un fallo de la CLI, e Inspect
	// los distingue con State.Status.
	Start(ctx context.Context, name string, stdin io.Reader, stdout, stderr io.Writer) error
	Kill(ctx context.Context, name string) error
	// Inspect falla si Docker no pudo arrancar el contenedor.
	Inspect(ctx context.Context, name string) (State, error)
	Remove(ctx context.Context, name string) error
	ListLabeled(ctx context.Context, label string) ([]Resource, error)
}
