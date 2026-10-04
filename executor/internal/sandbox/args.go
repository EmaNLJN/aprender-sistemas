package sandbox

import (
	"fmt"
	"slices"
	"strconv"
)

// createArgs arma `docker create` con el endurecimiento del ADR 0005. Es puro: las pruebas
// fijan cada flag de seguridad.
func createArgs(s Spec) []string {
	p := s.Phase
	memory := strconv.Itoa(p.MemoryMiB) + "m"
	args := []string{
		"create", "--name", s.Name, "--interactive",
		"--runtime", s.Runtime,
		"--network", "none",
		"--cap-drop", "ALL",
		"--security-opt", "no-new-privileges",
		"--user", "65534:65534",
		// Sin log del daemon: la salida se lee por attach y sólo se guardan 64 KiB.
		"--log-driver", "none",
		"--pids-limit", strconv.Itoa(p.Pids),
		"--memory", memory,
		"--memory-swap", memory,
		"--cpus", p.CPUs,
		"--ulimit", "nofile=256:256",
		"--tmpfs", fmt.Sprintf("/tmp:rw,noexec,nosuid,nodev,size=%dm", p.TmpfsMiB),
		"--mount", volumeMount(s.Volume, p.OutReadOnly),
	}
	for _, key := range sortedKeys(s.Labels) {
		args = append(args, "--label", key+"="+s.Labels[key])
	}
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
