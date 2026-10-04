// Package sandbox compila y ejecuta programas del alumno en contenedores efímeros.
package sandbox

import "time"

const (
	// RunLabel marca todo recurso del ejecutor para que el barrido no toque nada ajeno.
	RunLabel = "taller.executor.run"
	// CreatedLabel guarda la hora de creación en segundos Unix.
	CreatedLabel = "taller.executor.created"
)

// Phase son los límites y el comando de un contenedor. Vienen del ADR 0005, nunca del pedido.
// ReadOnly monta el rootfs de sólo lectura; OutReadOnly hace lo mismo con /out, para que la
// ejecución lea el binario sin poder escribir en un volumen sin cuota del host.
type Phase struct {
	Timeout     time.Duration
	MemoryMiB   int
	Pids        int
	TmpfsMiB    int
	CPUs        string
	ReadOnly    bool
	OutReadOnly bool
	Cmd         []string
}

type Profile struct {
	Image       string
	Compile     Phase
	Run         Phase
	OutputLimit int
}

type Spec struct {
	Name    string
	Image   string
	Phase   Phase
	Volume  string
	Labels  map[string]string
	Runtime string
}

// State es lo que Docker informa de un contenedor. Status es "created", "running", "exited",
// etc.: después de `docker start --attach`, sólo "exited" significa que el programa terminó.
type State struct {
	ExitCode  int
	OOMKilled bool
	Status    string
}

type Resource struct {
	Kind    string // "container" o "volume"
	Name    string
	Created time.Time
}

// Result es la respuesta de POST /v1/run. Phase indica la última fase alcanzada.
type Result struct {
	Phase     string `json:"phase"`
	ExitCode  int    `json:"exitCode"`
	Stdout    string `json:"stdout"`
	Stderr    string `json:"stderr"`
	Truncated bool   `json:"truncated"`
	TimedOut  bool   `json:"timedOut"`
	OOMKilled bool   `json:"oomKilled"`
	CompileMs int64  `json:"compileMs"`
	RunMs     int64  `json:"runMs"`
}
