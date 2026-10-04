package sandbox

import (
	"slices"
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
		t.Fatalf("falta %s %s en %v", flag, value, args)
	}
}

func specFor(language string, run bool) Spec {
	profile := Profiles("rust-img", "go-img")[language]
	phase, name := profile.Compile, "taller-c-1"
	if run {
		phase, name = profile.Run, "taller-r-1"
	}
	return Spec{
		Name: name, Image: profile.Image, Phase: phase, Volume: "taller-out-1", VolumeRO: run,
		Runtime: "runsc", Labels: map[string]string{RunLabel: "1", CreatedLabel: "100"},
	}
}

func TestCompileContainerIsHardened(t *testing.T) {
	spec := specFor("rust", false)
	args := createArgs(spec)
	if args[0] != "create" {
		t.Fatalf("debe crear el contenedor, no correrlo: %v", args)
	}
	mustHavePair(t, args, "--runtime", "runsc")
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
		t.Fatal("Rust compila con rootfs de sólo lectura")
	}
	image := slices.Index(args, "rust-img")
	if image < 0 || !slices.Equal(args[image+1:], spec.Phase.Cmd) {
		t.Fatalf("la imagen va después de las opciones y el comando al final: %v", args)
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
		t.Fatal("la ejecución siempre usa rootfs de sólo lectura")
	}
}

func TestGoCompileKeepsAWritableLayerForTheBuildCache(t *testing.T) {
	if slices.Contains(createArgs(specFor("go", false)), "--read-only") {
		t.Fatal("go build escribe en GOCACHE dentro de la capa del contenedor, que se descarta")
	}
}

func TestProfilesMatchTheADR(t *testing.T) {
	profiles := Profiles("rust-img", "go-img")
	if profiles["rust"].Compile.Timeout.Seconds() != 20 || profiles["go"].Compile.Timeout.Seconds() != 15 {
		t.Fatal("compilación: Rust 20 s y Go 15 s")
	}
	for language, profile := range profiles {
		if profile.Run.Timeout.Seconds() != 10 || profile.OutputLimit != 64<<10 {
			t.Fatalf("%s: ejecución 10 s y salida de 64 KiB", language)
		}
	}
}

func TestLabelsAreSortedSoArgsAreStable(t *testing.T) {
	first := createArgs(specFor("rust", false))
	for range 20 {
		if !slices.Equal(first, createArgs(specFor("rust", false))) {
			t.Fatal("los argumentos cambian entre llamadas")
		}
	}
}
