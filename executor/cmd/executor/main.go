// Comando executor: servicio interno que compila y ejecuta programas del taller en
// contenedores gVisor. Ver docs/adr/0005-ejecucion-en-sandbox-propio.md.
package main

import (
	"context"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"taller/executor/internal/api"
	"taller/executor/internal/config"
	"taller/executor/internal/sandbox"
)

// Presupuesto de un pedido: espera de lugar (queueWait) + compilación (hasta 20 s) + ejecución
// (10 s) + limpieza (hasta 10 s por paso). writeTimeout lo cubre con margen y sweepMaxAge supera
// la vida de cualquier envío. Si sube un plazo de profile.go, revisá estos valores.
const (
	queueWait    = 30 * time.Second
	writeTimeout = 90 * time.Second
	sweepMaxAge  = 2 * time.Minute
	maxProgram   = 128 << 10
	maxBody      = 1 << 20 // el JSON escapado puede ocupar hasta seis veces el programa
)

func main() {
	cfg, err := config.FromEnv(os.Getenv)
	if err != nil {
		log.Fatal(err)
	}
	root, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	for _, image := range []string{cfg.RustImage, cfg.GoImage} {
		if err := sandbox.ExecCommand(root, "docker", []string{"image", "inspect", "--format", "{{.Id}}", image}, nil, io.Discard, io.Discard); err != nil {
			log.Fatalf("falta la imagen %s (los pedidos nunca descargan imágenes): %v", image, err)
		}
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

	// Al arrancar no hay nada en curso: todo lo de esta instancia es un resto de una caída.
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
		Addr: cfg.Addr, Handler: server.Handler(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second,
		WriteTimeout: writeTimeout, IdleTimeout: 60 * time.Second,
		// Los pedidos heredan root: al apagar, el Runner mata y borra sus contenedores.
		BaseContext: func(net.Listener) context.Context { return root },
	}
	go func() {
		<-root.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdown); err != nil {
			log.Printf("apagado: %v", err)
		}
	}()

	log.Printf("ejecutor %s en %s con runtime %s", cfg.Instance, cfg.Addr, cfg.Runtime)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// sweepForever barre cada minuto los restos de limpiezas fallidas.
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
