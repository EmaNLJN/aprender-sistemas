package sandbox

import (
	"context"
	"io"
)

type Engine interface {
	CreateVolume(ctx context.Context, name string, labels map[string]string) error
	RemoveVolume(ctx context.Context, name string) error
	Create(ctx context.Context, spec Spec) error
	// Start attaches stdin/stdout/stderr and waits. It returns nil if the container exited with a
	// non-zero code without the context expiring: it may be the program or a CLI failure, and
	// Inspect tells them apart with State.Status.
	Start(ctx context.Context, name string, stdin io.Reader, stdout, stderr io.Writer) error
	Kill(ctx context.Context, name string) error
	Inspect(ctx context.Context, name string) (State, error)
	Remove(ctx context.Context, name string) error
	ListLabeled(ctx context.Context, label string) ([]Resource, error)
}
