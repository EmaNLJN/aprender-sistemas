package sandbox

import "time"

const outputLimit = 64 << 10

func Profiles(rustImage, goImage string) map[string]Profile {
	run := Phase{
		Timeout: 10 * time.Second, MemoryMiB: 256, Pids: 64, TmpfsMiB: 16, CPUs: "1",
		ReadOnly: true, OutReadOnly: true, Cmd: []string{"/out/main"},
	}
	return map[string]Profile{
		"rust": {
			Image: rustImage,
			Compile: Phase{
				Timeout: 20 * time.Second, MemoryMiB: 1024, Pids: 256, TmpfsMiB: 256, CPUs: "2",
				ReadOnly: true,
				// --crate-type bin overrides a student #![crate_type] (the harness puts their code
				// at the top of the file): compilation yields an executable or fails.
				Cmd: []string{"sh", "-c",
					"cat > /tmp/main.rs && rustc --edition 2024 --crate-type bin /tmp/main.rs -o /out/main"},
			},
			Run:         run,
			OutputLimit: outputLimit,
		},
		"go": {
			Image: goImage,
			// No --read-only: go build writes to the image's pre-warmed GOCACHE, in the container
			// layer, which is discarded on removal. go vet is informative: as in the Playground, it
			// runs only if the build succeeded and never changes the exit code.
			// -buildmode=exe turns a non-main package into a compile error.
			Compile: Phase{
				Timeout: 15 * time.Second, MemoryMiB: 1024, Pids: 256, TmpfsMiB: 256, CPUs: "2",
				ReadOnly: false,
				Cmd: []string{"sh", "-c",
					"mkdir -p /tmp/src && cat > /tmp/src/main.go && cd /tmp/src && " +
						"go build -buildmode=exe -o /out/main main.go && { go vet main.go || true; }"},
			},
			Run:         run,
			OutputLimit: outputLimit,
		},
	}
}
