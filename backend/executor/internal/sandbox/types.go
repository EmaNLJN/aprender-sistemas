// Package sandbox compiles and runs student programs in ephemeral containers.
package sandbox

import "time"

const (
	// RunLabel marks every executor resource so the sweeper never touches anything else.
	RunLabel = "taller.executor.run"
	// CreatedLabel stores the creation time in Unix seconds.
	CreatedLabel = "taller.executor.created"
)

// Phase holds the limits and the command of a container. They come from ADR 0005, never from the
// request. ReadOnly mounts the rootfs read-only; OutReadOnly does the same for /out, so the run
// can read the binary without being able to write to a host volume that has no quota.
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

// State is what Docker reports about a container. Status is "created", "running", "exited",
// etc.: after `docker start --attach`, only "exited" means the program finished.
type State struct {
	ExitCode  int
	OOMKilled bool
	Status    string
}

type Resource struct {
	Kind    string // "container" or "volume"
	Name    string
	Created time.Time
}

// Result is the response of POST /v1/run. Phase is the last phase reached.
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
