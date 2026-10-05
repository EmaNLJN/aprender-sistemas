package sandbox

import (
	"fmt"
	"slices"
	"strconv"
)

// createArgs builds `docker create` with the hardening from ADR 0005. It is pure: the tests pin
// every security flag.
func createArgs(s Spec) []string {
	p := s.Phase
	memory := strconv.Itoa(p.MemoryMiB) + "m"
	args := []string{
		"create", "--name", s.Name, "--interactive",
		// A request never pulls images: they must be built and pinned beforehand.
		"--pull", "never",
		"--runtime", s.Runtime,
		"--network", "none",
		"--cap-drop", "ALL",
		"--security-opt", "no-new-privileges",
		"--user", "65534:65534",
		// No daemon log: output is read through attach and only 64 KiB are kept.
		"--log-driver", "none",
		"--pids-limit", strconv.Itoa(p.Pids),
		"--memory", memory,
		"--memory-swap", memory,
		"--cpus", p.CPUs,
		"--ulimit", "nofile=256:256",
		// No core dumps: with runc, the host core_pattern would send them to systemd-coredump,
		// which runs as root.
		"--ulimit", "core=0",
		"--tmpfs", fmt.Sprintf("/tmp:rw,noexec,nosuid,nodev,size=%dm", p.TmpfsMiB),
		"--mount", volumeMount(s.Volume, p.OutReadOnly),
	}
	args = append(args, labelArgs(s.Labels)...)
	if p.ReadOnly {
		args = append(args, "--read-only")
	}
	args = append(args, s.Image)
	return append(args, p.Cmd...)
}

func volumeMount(name string, readOnly bool) string {
	mount := "type=volume,src=" + name + ",dst=/out"
	if readOnly {
		mount += ",readonly"
	}
	return mount
}

func sortedKeys(values map[string]string) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	return keys
}

// labelArgs turns labels into --label flags, sorted so the arguments are stable across calls.
func labelArgs(labels map[string]string) []string {
	var args []string
	for _, key := range sortedKeys(labels) {
		args = append(args, "--label", key+"="+labels[key])
	}
	return args
}
