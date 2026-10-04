// Comando executor: servicio interno que compila y ejecuta programas del taller en
// contenedores gVisor. Ver docs/adr/0005-ejecucion-en-sandbox-propio.md.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"taller/executor/internal/api"
	"taller/executor/internal/config"
	"taller/executor/internal/sandbox"
)

func main() {
	cfg, err := config.FromEnv(os.Getenv)
	if err != nil {
		log.Fatal(err)
	}
	engine := sandbox.DockerCLI{Exec: sandbox.ExecCommand}
	runner := &sandbox.Runner{
		Engine: engine, Profiles: sandbox.Profiles(cfg.RustImage, cfg.GoImage),
		Runtime: cfg.Runtime, Now: time.Now, NewID: sandbox.RandomID,
	}
	go sweepForever(sandbox.Sweeper{Engine: engine, Now: time.Now, MaxAge: 2 * time.Minute})

	server := &api.Server{
		Token: cfg.Token, Exec: runner, Slots: make(chan struct{}, cfg.MaxConcurrent),
		MaxBody: 192 << 10, MaxProgram: 128 << 10, QueueWait: 30 * time.Second,
		Languages: map[string]bool{"rust": true, "go": true},
	}
	httpServer := &http.Server{
		Addr: cfg.Addr, Handler: server.Handler(),
		ReadHeaderTimeout: 5 * time.Second, WriteTimeout: 90 * time.Second,
	}
	log.Printf("ejecutor en %s con runtime %s", cfg.Addr, cfg.Runtime)
	log.Fatal(httpServer.ListenAndServe())
}

// sweepForever barre al arrancar (restos de una caída anterior) y después cada minuto.
func sweepForever(sweeper sandbox.Sweeper) {
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		if err := sweeper.Sweep(ctx); err != nil {
			log.Printf("barrido: %v", err)
		}
		cancel()
		time.Sleep(time.Minute)
	}
}
