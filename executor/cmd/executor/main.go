// Comando executor: servicio interno que compila y ejecuta programas del taller en
// contenedores gVisor. Ver docs/adr/0005-ejecucion-en-sandbox-propio.md.
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
	"syscall"
	"time"

	"taller/executor/internal/api"
	"taller/executor/internal/config"
	"taller/executor/internal/sandbox"
)

// Presupuesto de un pedido: espera de lugar (queueWait) + compilación (hasta 20 s) + ejecución
// (10 s) + limpieza (hasta 10 s por paso). writeTimeout lo cubre con margen y sweepMaxAge supera
// la vida de cualquier envío mientras Docker responda: Create y CreateVolume usan el contexto del
// pedido, sin plazo propio. Si sube un plazo de profile.go, revisá estos valores.
const (
	queueWait    = 30 * time.Second
	writeTimeout = 90 * time.Second
	sweepMaxAge  = 2 * time.Minute
	// Un pedido cancelado borra lo suyo con Kill, Remove y RemoveVolume, hasta 10 s cada uno
	// (cleanupTimeout de runner.go): el apagado lo espera. Compose necesita un
	// stop_grace_period mayor (executor/AGENTS.md).
	shutdownGrace = 35 * time.Second
	maxProgram    = 128 << 10
	maxBody       = 1 << 20 // el JSON escapado puede ocupar hasta seis veces el programa
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

	// Sin el runtime, /healthz respondería ok y cada pedido sería un 500.
	var runtimes bytes.Buffer
	if err := sandbox.ExecCommand(root, "docker", []string{"info", "--format", "{{json .Runtimes}}"}, nil, &runtimes, io.Discard); err != nil {
		log.Fatalf("no pude consultar los runtimes de Docker: %v", err)
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
		Handler:           server.Handler(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second,
		WriteTimeout: writeTimeout, IdleTimeout: 60 * time.Second,
		// Los pedidos heredan root: al apagar, el Runner mata y borra sus contenedores.
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

// serve atiende hasta que se cancela root y no vuelve hasta que Shutdown terminó. Serve devuelve
// ErrServerClosed apenas empieza el apagado; si main saliera ahí, el proceso moriría antes de que
// los pedidos cancelados borren sus contenedores (la documentación de http.Server.Shutdown pide
// esperar a que vuelva).
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

// runtimeRegistered dice si Docker tiene registrado el runtime, a partir de la salida de
// `docker info --format '{{json .Runtimes}}'`: un objeto JSON con un campo por runtime.
func runtimeRegistered(runtimesJSON []byte, name string) (bool, error) {
	var runtimes map[string]json.RawMessage
	if err := json.Unmarshal(runtimesJSON, &runtimes); err != nil {
		return false, fmt.Errorf("salida inesperada de docker info: %w", err)
	}
	_, ok := runtimes[name]
	return ok, nil
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
