//go:build integration

package sandbox

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"
)

// Corre con scripts/integration.sh: necesita el socket de Docker y las imágenes de sandbox.
func integrationRunner(t *testing.T) *Runner {
	t.Helper()
	rust, goImage := os.Getenv("EXECUTOR_RUST_IMAGE"), os.Getenv("EXECUTOR_GO_IMAGE")
	if rust == "" || goImage == "" {
		t.Fatal("definí EXECUTOR_RUST_IMAGE y EXECUTOR_GO_IMAGE")
	}
	runtime := os.Getenv("EXECUTOR_RUNTIME")
	if runtime == "" {
		runtime = "runc"
	}
	profiles := Profiles(rust, goImage)
	for language, profile := range profiles {
		profile.Run.Timeout = 3 * time.Second // acelera los casos de tiempo agotado
		profiles[language] = profile
	}
	return &Runner{Engine: DockerCLI{Exec: ExecCommand}, Profiles: profiles, Runtime: runtime, Now: time.Now, NewID: RandomID}
}

func execute(t *testing.T, language, program string) Result {
	t.Helper()
	result, err := integrationRunner(t).Execute(context.Background(), language, []byte(program))
	if err != nil {
		t.Fatal(err)
	}
	return result
}

func TestIntegrationRustHello(t *testing.T) {
	r := execute(t, "rust", `fn main() { println!("hola"); }`)
	if r.Phase != "run" || r.ExitCode != 0 || r.Stdout != "hola\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationGoHello(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport \"fmt\"\n\nfunc main() { fmt.Println(\"hola\") }\n")
	if r.Phase != "run" || r.ExitCode != 0 || r.Stdout != "hola\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationRustCompileError(t *testing.T) {
	r := execute(t, "rust", `fn main() { let x: i32 = "texto"; }`)
	if r.Phase != "compile" || r.ExitCode == 0 || !strings.Contains(r.Stderr, "mismatched types") {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationRustDebugKeepsOverflowChecks(t *testing.T) {
	r := execute(t, "rust", `fn main() { let x: u8 = 255; let y = x + std::hint::black_box(1); println!("{y}"); }`)
	if r.Phase != "run" || r.ExitCode != 101 || !strings.Contains(r.Stderr, "overflow") {
		t.Fatalf("en modo debug el overflow entra en panic, como en el Playground: %+v", r)
	}
}

func TestIntegrationInfiniteLoopTimesOut(t *testing.T) {
	r := execute(t, "rust", `fn main() { loop { std::hint::spin_loop(); } }`)
	if r.Phase != "run" || !r.TimedOut {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationMemoryHogIsKilled(t *testing.T) {
	r := execute(t, "rust", `fn main() { let mut v = Vec::new(); loop { v.push(vec![1u8; 1 << 20]); } }`)
	if !r.OOMKilled && r.ExitCode != 137 {
		t.Fatalf("debe morir por memoria: %+v", r)
	}
}

func TestIntegrationOutputFloodIsTruncated(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport (\"fmt\"; \"strings\")\n\nfunc main() { for { fmt.Println(strings.Repeat(\"x\", 1000)) } }\n")
	if !r.Truncated || len(r.Stdout) > 64<<10 {
		t.Fatalf("truncated=%v, stdout=%d bytes", r.Truncated, len(r.Stdout))
	}
}

func TestIntegrationHasNoNetwork(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport (\"fmt\"; \"net\"; \"time\")\n\nfunc main() {\n\t_, err := net.DialTimeout(\"tcp\", \"1.1.1.1:53\", 2*time.Second)\n\tif err != nil { fmt.Println(\"sin red\"); return }\n\tfmt.Println(\"con red\")\n}\n")
	if r.Stdout != "sin red\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationLoopbackStillWorksForHttptest(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport (\"fmt\"; \"io\"; \"net/http\"; \"net/http/httptest\")\n\nfunc main() {\n\ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { io.WriteString(w, \"pong\") }))\n\tdefer s.Close()\n\tres, err := http.Get(s.URL)\n\tif err != nil { fmt.Println(err); return }\n\tb, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(b))\n}\n")
	if r.Stdout != "pong\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationLegitConcurrencyFitsThePidsLimit(t *testing.T) {
	r := execute(t, "rust", `fn main() { let hs: Vec<_> = (0..8).map(|i| std::thread::spawn(move || i * 2)).collect(); let total: i32 = hs.into_iter().map(|h| h.join().unwrap()).sum(); println!("{total}"); }`)
	if r.Stdout != "56\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationThreadBombHitsThePidsLimit(t *testing.T) {
	r := execute(t, "rust", `fn main() { let mut hs = Vec::new(); for _ in 0..10000 { match std::thread::Builder::new().spawn(|| std::thread::sleep(std::time::Duration::from_secs(5))) { Ok(h) => hs.push(h), Err(_) => { println!("límite"); return; } } } }`)
	if r.Stdout != "límite\n" {
		t.Fatalf("el límite de procesos corta la bomba de hilos: %+v", r)
	}
}

func TestIntegrationGoVetIsInformative(t *testing.T) {
	r := execute(t, "go", `package main

import "fmt"

func main() { fmt.Printf("%d", "x") }
`)
	if r.Phase != "run" || r.ExitCode != 0 || !strings.Contains(r.Stderr, "format %d has arg") {
		t.Fatalf("go vet avisa en stderr sin impedir que compile y corra, como en el Playground: %+v", r)
	}
}

func TestIntegrationGoCompileErrorAppearsOnce(t *testing.T) {
	r := execute(t, "go", `package main

func main() { var x int = "texto"; _ = x }
`)
	if r.Phase != "compile" || r.ExitCode == 0 || strings.Count(r.Stderr, "cannot use") != 1 {
		t.Fatalf("el error de compilación sale una sola vez (vet no corre si no compiló): %+v", r)
	}
}

func TestIntegrationRunWritesOnlyToTmp(t *testing.T) {
	r := execute(t, "go", `package main

import (
	"fmt"
	"os"
)

func main() {
	for _, path := range []string{"/out/x", "/x", "/tmp/x"} {
		err := os.WriteFile(path, []byte("x"), 0o600)
		fmt.Println(path, err == nil)
	}
}
`)
	want := `/out/x false
/x false
/tmp/x true
`
	if r.Stdout != want {
		t.Fatalf("la ejecución sólo escribe en /tmp: rootfs y /out son de sólo lectura: %+v", r)
	}
}

func TestIntegrationLeavesNothingBehind(t *testing.T) {
	execute(t, "rust", `fn main() {}`)
	resources, err := DockerCLI{Exec: ExecCommand}.ListLabeled(context.Background(), RunLabel+"=1")
	if err != nil {
		t.Fatal(err)
	}
	if len(resources) != 0 {
		t.Fatalf("quedaron recursos: %+v", resources)
	}
}
