//go:build integration

package sandbox

import (
	"context"
	"io"
	"os"
	"strings"
	"testing"
	"time"
)

func integrationRunner(t *testing.T) *Runner {
	t.Helper()
	rust, goImage := os.Getenv("EXECUTOR_RUST_IMAGE"), os.Getenv("EXECUTOR_GO_IMAGE")
	if rust == "" || goImage == "" {
		t.Fatal("set EXECUTOR_RUST_IMAGE and EXECUTOR_GO_IMAGE")
	}
	runtime := os.Getenv("EXECUTOR_RUNTIME")
	if runtime == "" {
		runtime = "runc"
	}
	profiles := Profiles(rust, goImage)
	for language, profile := range profiles {
		profile.Run.Timeout = 3 * time.Second
		profiles[language] = profile
	}
	return &Runner{Engine: DockerCLI{Exec: ExecCommand}, Profiles: profiles, Runtime: runtime, Instance: "integration", Now: time.Now, NewID: RandomID}
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
	r := execute(t, "rust", `fn main() { println!("hello"); }`)
	if r.Phase != "run" || r.ExitCode != 0 || r.Stdout != "hello\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationGoHello(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport \"fmt\"\n\nfunc main() { fmt.Println(\"hello\") }\n")
	if r.Phase != "run" || r.ExitCode != 0 || r.Stdout != "hello\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationRustCompileError(t *testing.T) {
	r := execute(t, "rust", `fn main() { let x: i32 = "text"; }`)
	if r.Phase != "compile" || r.ExitCode == 0 || !strings.Contains(r.Stderr, "mismatched types") {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationRustCrateTypeAttributeStillBuildsABinary(t *testing.T) {
	// The harness puts the student's code at the top of the file: a crate attribute of theirs
	// must not turn the build into a library that cannot be run afterwards.
	r := execute(t, "rust", "#![crate_type = \"lib\"]\nfn main() { println!(\"hello\"); }\n")
	if r.Phase != "run" || r.ExitCode != 0 || r.Stdout != "hello\n" {
		t.Fatalf("--crate-type bin overrides the student attribute: %+v", r)
	}
}

func TestIntegrationRustDebugKeepsOverflowChecks(t *testing.T) {
	r := execute(t, "rust", `fn main() { let x: u8 = 255; let y = x + std::hint::black_box(1); println!("{y}"); }`)
	if r.Phase != "run" || r.ExitCode != 101 || !strings.Contains(r.Stderr, "overflow") {
		t.Fatalf("in debug mode overflow panics, as in the Playground: %+v", r)
	}
}

func TestIntegrationInfiniteLoopTimesOut(t *testing.T) {
	r := execute(t, "rust", `fn main() { loop { std::hint::spin_loop(); } }`)
	if r.Phase != "run" || !r.TimedOut {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationMemoryHogIsKilled(t *testing.T) {
	// Bounded 512 MiB: without a memory limit, the program ends at once and prints "unbounded"
	// instead of growing until the deadline (a deadline kill also gives 137, without OOM).
	r := execute(t, "rust", `fn main() { let mut v = Vec::new(); for _ in 0..512 { v.push(vec![1u8; 1 << 20]); } println!("unbounded {}", v.len()); }`)
	if r.Phase != "run" || r.TimedOut || !r.OOMKilled {
		t.Fatalf("must die from memory, not from time: %+v", r)
	}
}

func TestIntegrationOutputFloodIsTruncated(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport (\"fmt\"; \"strings\")\n\nfunc main() { for { fmt.Println(strings.Repeat(\"x\", 1000)) } }\n")
	if !r.Truncated || len(r.Stdout) > 64<<10 {
		t.Fatalf("truncated=%v, stdout=%d bytes", r.Truncated, len(r.Stdout))
	}
}

func TestIntegrationHasNoNetwork(t *testing.T) {
	// Looks at the interfaces, not a dial: without Internet access on the host, a dial would fail anyway.
	r := execute(t, "go", `package main

import (
	"fmt"
	"os"
	"strings"
)

func main() {
	data, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		fmt.Println(err)
		return
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	for _, line := range lines[2:] {
		name, _, _ := strings.Cut(line, ":")
		fmt.Println(strings.TrimSpace(name))
	}
}
`)
	if r.Stdout != "lo\n" {
		t.Fatalf("the only interface is loopback: %+v", r)
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
	r := execute(t, "rust", `fn main() { let mut hs = Vec::new(); for _ in 0..10000 { match std::thread::Builder::new().spawn(|| std::thread::sleep(std::time::Duration::from_secs(5))) { Ok(h) => hs.push(h), Err(_) => { println!("limit"); return; } } } }`)
	// With runc, creating the 64th thread fails with EAGAIN and the program reports it. With
	// runsc, the limit counts the sandbox host threads: when exceeded, gVisor kills the whole
	// sandbox (137, no OOM). Both contain the bomb; see the ADR 0005 amendment.
	contained := r.Stdout == "limit\n"
	if os.Getenv("EXECUTOR_RUNTIME") == "runsc" {
		contained = r.ExitCode == 137 && !r.OOMKilled && !r.TimedOut
	}
	if !contained {
		t.Fatalf("the process limit stops the thread bomb: %+v", r)
	}
}

func TestIntegrationGoVetIsInformative(t *testing.T) {
	r := execute(t, "go", `package main

import "fmt"

func main() { fmt.Printf("%d", "x") }
`)
	if r.Phase != "run" || r.ExitCode != 0 || !strings.Contains(r.Stderr, "format %d has arg") {
		t.Fatalf("go vet warns on stderr without preventing compile and run, as in the Playground: %+v", r)
	}
}

func TestIntegrationGoCompileErrorAppearsOnce(t *testing.T) {
	r := execute(t, "go", `package main

func main() { var x int = "text"; _ = x }
`)
	if r.Phase != "compile" || r.ExitCode == 0 || strings.Count(r.Stderr, "cannot use") != 1 {
		t.Fatalf("the compile error appears once (vet does not run if the build failed): %+v", r)
	}
}

func TestIntegrationGoNonMainPackageIsACompileError(t *testing.T) {
	r := execute(t, "go", "package foo\n\nfunc F() {}\n")
	if r.Phase != "compile" || r.ExitCode == 0 || !strings.Contains(r.Stderr, "-buildmode=exe requires exactly one main package") {
		t.Fatalf("a non-main package is a student compile error, not a sandbox failure: %+v", r)
	}
}

func TestIntegrationRunWritesOnlyToTmp(t *testing.T) {
	r := execute(t, "go", `package main

import (
	"fmt"
	"os"
)

func main() {
	// /opt/gocache is owned by 65534 and /var/tmp is 1777: only --read-only prevents writing them.
	for _, path := range []string{"/out/x", "/opt/gocache/x", "/var/tmp/x", "/tmp/x"} {
		err := os.WriteFile(path, []byte("x"), 0o600)
		fmt.Println(path, err == nil)
	}
	fmt.Println("uid", os.Getuid())
}
`)
	want := `/out/x false
/opt/gocache/x false
/var/tmp/x false
/tmp/x true
uid 65534
`
	if r.Stdout != want {
		t.Fatalf("the run executes as 65534 and only writes to /tmp: %+v", r)
	}
}

func TestIntegrationRunHasNoPrivileges(t *testing.T) {
	r := execute(t, "go", `package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"syscall"
)

func main() {
	// With uid 65534, CapEff is already 0 even without --cap-drop ALL: CapBnd gives it away.
	status, _ := os.ReadFile("/proc/self/status")
	values := map[string]string{}
	for _, line := range strings.Split(string(status), "\n") {
		key, value, found := strings.Cut(line, ":")
		if found {
			values[key] = strings.TrimSpace(value)
		}
	}
	for _, key := range []string{"CapPrm", "CapEff", "CapBnd", "NoNewPrivs"} {
		fmt.Println(key+":", values[key])
	}
	var core syscall.Rlimit
	syscall.Getrlimit(syscall.RLIMIT_CORE, &core)
	fmt.Println("core", core.Cur, core.Max)
	os.WriteFile("/tmp/x.sh", []byte("#!/bin/sh\necho executed\n"), 0o755)
	fmt.Println("exec in /tmp fails:", exec.Command("/tmp/x.sh").Run() != nil)
}
`)
	want := `CapPrm: 0000000000000000
CapEff: 0000000000000000
CapBnd: 0000000000000000
NoNewPrivs: 1
core 0 0
exec in /tmp fails: true
`
	if r.Stdout != want {
		t.Fatalf("no capabilities, no escalation, no core dumps and /tmp without exec: %+v", r)
	}
}

func TestIntegrationRunsOnTheRequestedRuntime(t *testing.T) {
	r := execute(t, "go", `package main

import (
	"fmt"
	"os"
	"strings"
)

func main() {
	release, _ := os.ReadFile("/proc/sys/kernel/osrelease")
	fmt.Println(strings.Contains(string(release), "gvisor"))
}
`)
	want := "false\n"
	if os.Getenv("EXECUTOR_RUNTIME") == "runsc" {
		want = "true\n"
	}
	if r.Stdout != want {
		t.Fatalf("EXECUTOR_RUNTIME=%q, but the kernel the program sees does not match: %+v", os.Getenv("EXECUTOR_RUNTIME"), r)
	}
	t.Logf("runtime %q: compile %d ms, run %d ms", os.Getenv("EXECUTOR_RUNTIME"), r.CompileMs, r.RunMs)
}

func TestIntegrationContainerThatCannotStartIsAnError(t *testing.T) {
	runner := integrationRunner(t)
	profile := runner.Profiles["go"]
	profile.Run.Cmd = []string{"/no/such/file"}
	runner.Profiles["go"] = profile
	_, err := runner.Execute(context.Background(), "go", []byte("package main\n\nfunc main() {}\n"))
	// "no pudo arrancar" comes from State.Error (parseState): without that check, the container
	// stays "created" and the error would come from another branch.
	if err == nil || !strings.Contains(err.Error(), "no pudo arrancar") {
		t.Fatalf("a container that cannot start is a sandbox error, not a student result: %v", err)
	}
}

func TestIntegrationSweepRemovesOnlyOldExecutorResources(t *testing.T) {
	ctx := context.Background()
	cli := DockerCLI{Exec: ExecCommand}
	id := RandomID()
	old := map[string]string{RunLabel: "integration", CreatedLabel: "1"}
	volume, foreign := "taller-out-"+id, "taller-out-foreign-"+id
	if err := cli.CreateVolume(ctx, volume, old); err != nil {
		t.Fatal(err)
	}
	if err := cli.CreateVolume(ctx, foreign, nil); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cli.RemoveVolume(context.Background(), foreign) })
	runner := integrationRunner(t)
	profile := runner.Profiles["go"]
	spec := Spec{Name: "taller-r-" + id, Image: profile.Image, Phase: profile.Run, Volume: volume, Labels: old, Runtime: runner.Runtime}
	if err := cli.Create(ctx, spec); err != nil {
		t.Fatal(err)
	}
	if err := (Sweeper{Engine: cli, Now: time.Now, MaxAge: 2 * time.Minute, Instance: "integration"}).Sweep(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := cli.Inspect(ctx, spec.Name); err == nil {
		t.Fatal("the old executor container should have been removed")
	}
	resources, err := cli.ListLabeled(ctx, RunLabel+"=integration")
	if err != nil {
		t.Fatal(err)
	}
	for _, resource := range resources {
		if strings.HasSuffix(resource.Name, id) {
			t.Fatalf("left behind: %s", resource.Name)
		}
	}
	if err := ExecCommand(ctx, "docker", []string{"volume", "inspect", foreign}, nil, io.Discard, io.Discard); err != nil {
		t.Fatalf("a volume without the executor label is untouched: %v", err)
	}
}

func TestIntegrationLeavesNothingBehind(t *testing.T) {
	execute(t, "rust", `fn main() {}`)
	resources, err := DockerCLI{Exec: ExecCommand}.ListLabeled(context.Background(), RunLabel+"=integration")
	if err != nil {
		t.Fatal(err)
	}
	if len(resources) != 0 {
		t.Fatalf("resources left behind: %+v", resources)
	}
}
