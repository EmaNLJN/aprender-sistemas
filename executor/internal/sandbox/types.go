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
type Phase struct {
	Timeout   time.Duration
	MemoryMiB int
	Pids      int
	TmpfsMiB  int
	CPUs      string
	ReadOnly  bool
	Cmd       []string
}

type Profile struct {
	Image       string
	Compile     Phase
	Run         Phase
	OutputLimit int
}

type Spec struct {
	Name     string
	Image    string
	Phase    Phase
	Volume   string
	VolumeRO bool
	Labels   map[string]string
	Runtime  string
}

type State struct {
	ExitCode  int
	OOMKilled bool
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
