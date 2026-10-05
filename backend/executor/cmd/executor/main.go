// Command executor is the internal service that compiles and runs workshop programs in gVisor
// containers. See docs/adr/0005-ejecucion-en-sandbox-propio.md.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"taller/executor/internal/api"
	"taller/executor/internal/config"
	"taller/executor/internal/sandbox"
)

// Request budget: slot wait (queueWait) + compile (up to 20 s) + run (10 s) + cleanup (up to
// 10 s per step). writeTimeout covers it with margin, and sweepMaxAge exceeds the lifetime of any
// submission while Docker responds: Create and CreateVolume use the request context, with no
// deadline of their own. If a deadline in profile.go grows, review these values.
const (
	queueWait    = 30 * time.Second
	writeTimeout = 90 * time.Second
	sweepMaxAge  = 2 * time.Minute
	// A cancelled request deletes its resources with Kill, Remove and RemoveVolume, up to 10 s
	// each (cleanupTimeout in runner.go): shutdown waits for it. Compose needs a larger
	// stop_grace_period (backend/executor/AGENTS.md).
	shutdownGrace = 35 * time.Second
	maxProgram    = 128 << 10
	maxBody       = 1 << 20 // escaped JSON can take up to six times the program size
)

func main() {
	cfg, err := config.FromEnv(os.Getenv)
	if err != nil {
		log.Fatal(err)
	}
	root, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	for _, image := range []string{cfg.RustImage, cfg.GoImage} {
		var stderr bytes.Buffer
		if err := sandbox.ExecCommand(root, "docker", []string{"image", "inspect", "--format", "{{.Id}}", image}, nil, io.Discard, &stderr); err != nil {
			log.Fatalf("falta la imagen %s (los pedidos nunca descargan imágenes): %v: %s", image, err, strings.TrimSpace(stderr.String()))
		}
	}

	// Without the runtime, /healthz would answer ok and every request would be a 500.
	var runtimes bytes.Buffer
	var runtimesStderr bytes.Buffer
	if err := sandbox.ExecCommand(root, "docker", []string{"info", "--format", "{{json .Runtimes}}"}, nil, &runtimes, &runtimesStderr); err != nil {
		log.Fatalf("no pude consultar los runtimes de Docker: %v: %s", err, strings.TrimSpace(runtimesStderr.String()))
	}
	registered, err := runtimeRegistered(runtimes.Bytes(), cfg.Runtime)
	if err != nil {
		log.Fatal(err)
	}
	if !registered {
		log.Fatalf("Docker no tiene registrado el runtime %s (ver docs/adr/0005-ejecucion-en-sandbox-propio.md)", cfg.Runtime)
	}

	engine := sandbox.DockerCLI{Exec: sandbox.ExecCommand}
	profiles := sandbox.Profiles(cfg.RustImage, cfg.GoImage)
	languages := map[string]bool{}
	for language := range profiles {
		languages[language] = true
	}
	runner := &sandbox.Runner{
		Engine: engine, Profiles: profiles, Runtime: cfg.Runtime, Instance: cfg.Instance,
		Now: time.Now, NewID: sandbox.RandomID,
	}

	// Nothing is in flight at startup: everything of this instance is left over from a crash.
	initial := sandbox.Sweeper{Engine: engine, Now: time.Now, MaxAge: 0, Instance: cfg.Instance}
	if err := initial.Sweep(root); err != nil {
		log.Printf("barrido inicial: %v", err)
	}
	go sweepForever(sandbox.Sweeper{Engine: engine, Now: time.Now, MaxAge: sweepMaxAge, Instance: cfg.Instance})

	server := &api.Server{
		Token: cfg.Token, Exec: runner, Slots: make(chan struct{}, cfg.MaxConcurrent),
		MaxBody: maxBody, MaxProgram: maxProgram, QueueWait: queueWait, Languages: languages,
	}
	httpServer := &http.Server{
		Handler:           server.Handler(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second,
		WriteTimeout: writeTimeout, IdleTimeout: 60 * time.Second,
		// Requests inherit root: on shutdown, the Runner kills and removes their containers.
		BaseContext: func(net.Listener) context.Context { return root },
	}
	listener, err := net.Listen("tcp", cfg.Addr)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("ejecutor %s en %s con runtime %s", cfg.Instance, cfg.Addr, cfg.Runtime)
	if err := serve(root, httpServer, listener, shutdownGrace); err != nil {
		log.Fatal(err)
	}
}

// serve serves until root is cancelled and does not return until Shutdown has finished. Serve
// returns ErrServerClosed as soon as shutdown begins; if main exited there, the process would die
// before cancelled requests remove their containers (the http.Server.Shutdown documentation says
// to wait for it to return).
func serve(root context.Context, server *http.Server, listener net.Listener, grace time.Duration) error {
	shutdownDone := make(chan error, 1)
	go func() {
		<-root.Done()
		ctx, cancel := context.WithTimeout(context.Background(), grace)
		defer cancel()
		shutdownDone <- server.Shutdown(ctx)
	}()
	if err := server.Serve(listener); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	if err := <-shutdownDone; err != nil {
		return fmt.Errorf("apagado: %w", err)
	}
	return nil
}

// runtimeRegistered reports whether Docker has the runtime registered, from the output of
// `docker info --format '{{json .Runtimes}}'`: a JSON object with one field per runtime.
func runtimeRegistered(runtimesJSON []byte, name string) (bool, error) {
	var runtimes map[string]json.RawMessage
	if err := json.Unmarshal(runtimesJSON, &runtimes); err != nil {
		return false, fmt.Errorf("salida inesperada de docker info: %w", err)
	}
	_, ok := runtimes[name]
	return ok, nil
}

// sweepForever sweeps every minute the leftovers of failed cleanups.
func sweepForever(sweeper sandbox.Sweeper) {
	for {
		time.Sleep(time.Minute)
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		if err := sweeper.Sweep(ctx); err != nil {
			log.Printf("barrido: %v", err)
		}
		cancel()
	}
}
