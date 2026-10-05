package sandbox

import (
	"slices"
	"strings"
	"testing"
)

func containsPair(args []string, flag, value string) bool {
	for i := 0; i+1 < len(args); i++ {
		if args[i] == flag && args[i+1] == value {
			return true
		}
	}
	return false
}

func mustHavePair(t *testing.T, args []string, flag, value string) {
	t.Helper()
	if !containsPair(args, flag, value) {
		t.Fatalf("missing %s %s in %v", flag, value, args)
	}
}

func specFor(language string, run bool) Spec {
	profile := Profiles("rust-img", "go-img")[language]
	phase, name := profile.Compile, "taller-c-1"
	if run {
		phase, name = profile.Run, "taller-r-1"
	}
	return Spec{
		Name: name, Image: profile.Image, Phase: phase, Volume: "taller-out-1",
		Runtime: "runsc", Labels: map[string]string{RunLabel: "1", CreatedLabel: "100"},
	}
}

func TestCompileContainerIsHardened(t *testing.T) {
	spec := specFor("rust", false)
	args := createArgs(spec)
	if args[0] != "create" {
		t.Fatalf("must create the container, not run it: %v", args)
	}
	mustHavePair(t, args, "--runtime", "runsc")
	mustHavePair(t, args, "--pull", "never")
	mustHavePair(t, args, "--network", "none")
	mustHavePair(t, args, "--cap-drop", "ALL")
	mustHavePair(t, args, "--security-opt", "no-new-privileges")
	mustHavePair(t, args, "--user", "65534:65534")
	mustHavePair(t, args, "--pids-limit", "256")
	mustHavePair(t, args, "--memory", "1024m")
	mustHavePair(t, args, "--memory-swap", "1024m")
	mustHavePair(t, args, "--cpus", "2")
	mustHavePair(t, args, "--mount", "type=volume,src=taller-out-1,dst=/out")
	mustHavePair(t, args, "--label", CreatedLabel+"=100")
	mustHavePair(t, args, "--label", RunLabel+"=1")
	if !slices.Contains(args, "--read-only") {
		t.Fatal("Rust compiles with a read-only rootfs")
	}
	image := slices.Index(args, "rust-img")
	if image < 0 || !slices.Equal(args[image+1:], spec.Phase.Cmd) {
		t.Fatalf("the image goes after the options and the command last: %v", args)
	}
}

func TestRunContainerIsReadOnlyWithSmallLimits(t *testing.T) {
	args := createArgs(specFor("go", true))
	mustHavePair(t, args, "--mount", "type=volume,src=taller-out-1,dst=/out,readonly")
	mustHavePair(t, args, "--memory", "256m")
	mustHavePair(t, args, "--memory-swap", "256m")
	mustHavePair(t, args, "--pids-limit", "64")
	mustHavePair(t, args, "--cpus", "1")
	if !slices.Contains(args, "--read-only") {
		t.Fatal("the run always uses a read-only rootfs")
	}
}

func TestGoCompileKeepsAWritableLayerForTheBuildCache(t *testing.T) {
	if slices.Contains(createArgs(specFor("go", false)), "--read-only") {
		t.Fatal("go build writes to GOCACHE in the container layer, which is discarded")
	}
}

func TestProfilesMatchTheADR(t *testing.T) {
	profiles := Profiles("rust-img", "go-img")
	if profiles["rust"].Compile.Timeout.Seconds() != 20 || profiles["go"].Compile.Timeout.Seconds() != 15 {
		t.Fatal("compile: Rust 20 s and Go 15 s")
	}
	for language, profile := range profiles {
		if profile.Run.Timeout.Seconds() != 10 || profile.OutputLimit != 64<<10 {
			t.Fatalf("%s: run 10 s and 64 KiB of output", language)
		}
		if !profile.Run.ReadOnly || !profile.Run.OutReadOnly || profile.Compile.OutReadOnly {
			t.Fatalf("%s: the run uses a read-only rootfs and /out; compile writes /out", language)
		}
	}
}

func TestEveryPhaseHasItsLimits(t *testing.T) {
	cases := []struct {
		language string
		run      bool
		memory   string
		pids     string
		cpus     string
		tmpfs    string
	}{
		{"rust", false, "1024m", "256", "2", "/tmp:rw,noexec,nosuid,nodev,size=256m"},
		{"go", false, "1024m", "256", "2", "/tmp:rw,noexec,nosuid,nodev,size=256m"},
		{"rust", true, "256m", "64", "1", "/tmp:rw,noexec,nosuid,nodev,size=16m"},
		{"go", true, "256m", "64", "1", "/tmp:rw,noexec,nosuid,nodev,size=16m"},
	}
	for _, c := range cases {
		args := createArgs(specFor(c.language, c.run))
		for _, pair := range [][2]string{
			{"--memory", c.memory}, {"--memory-swap", c.memory}, {"--pids-limit", c.pids},
			{"--cpus", c.cpus}, {"--tmpfs", c.tmpfs}, {"--ulimit", "nofile=256:256"},
			{"--ulimit", "core=0"},
			{"--log-driver", "none"},
		} {
			if !containsPair(args, pair[0], pair[1]) {
				t.Errorf("%s (run=%v): missing %s %s in %v", c.language, c.run, pair[0], pair[1], args)
			}
		}
	}
}

func TestSortedKeysOrdersLabels(t *testing.T) {
	labels := map[string]string{}
	for _, key := range []string{"j", "c", "a", "h", "e", "b", "i", "d", "g", "f"} {
		labels[key] = "1"
	}
	want := []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j"}
	if got := sortedKeys(labels); !slices.Equal(got, want) {
		t.Fatalf("sortedKeys = %v; want %v, so the arguments do not change between calls", got, want)
	}
}

func TestCompileCommandsAlwaysProduceAnExecutable(t *testing.T) {
	profiles := Profiles("rust-img", "go-img")
	for language, flag := range map[string]string{"rust": "--crate-type bin", "go": "-buildmode=exe"} {
		command := strings.Join(profiles[language].Compile.Cmd, " ")
		if !strings.Contains(command, flag) {
			t.Errorf("%s: compile must ask for %q; without it, the program can leave a library in /out that the run cannot execute (a 500 instead of a result): %s", language, flag, command)
		}
	}
}
