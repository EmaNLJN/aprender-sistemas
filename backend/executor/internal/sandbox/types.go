package sandbox

import "time"

const (
	RunLabel     = "taller.executor.run"
	CreatedLabel = "taller.executor.created"
)

// OutReadOnly mounts /out read-only so the run can read the binary without writing to a host
// volume that has no quota.
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
	Kind    string
	Name    string
	Created time.Time
}

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
