package main

import (
	"context"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// startServe levanta serve con un handler que imita al Runner: el pedido hereda root, ve su
// contexto cancelado y recién después borra sus contenedores, con contextos propios.
func startServe(t *testing.T, cleanup time.Duration, grace time.Duration) (cancel context.CancelFunc, cleaned *atomic.Bool, served chan error) {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	root, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	started := make(chan struct{}, 1)
	cleaned = &atomic.Bool{}
	server := &http.Server{
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			select {
			case started <- struct{}{}:
			default:
			}
			<-r.Context().Done()
			time.Sleep(cleanup)
			cleaned.Store(true)
		}),
		BaseContext: func(net.Listener) context.Context { return root },
	}
	served = make(chan error, 1)
	go func() { served <- serve(root, server, listener, grace) }()
	go func() {
		response, err := http.Get("http://" + listener.Addr().String() + "/")
		if err == nil {
			response.Body.Close()
		}
	}()
	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("el pedido nunca llegó al handler")
	}
	return cancel, cleaned, served
}

func TestServeWaitsForInFlightRequestsToCleanUp(t *testing.T) {
	cancel, cleaned, served := startServe(t, 200*time.Millisecond, 5*time.Second)
	defer cancel()

	cancel()
	select {
	case err := <-served:
		if err != nil {
			t.Fatalf("serve: %v", err)
		}
		if !cleaned.Load() {
			t.Fatal("serve volvió antes de que el pedido en curso terminara su limpieza: el proceso saldría con el contenedor vivo")
		}
	case <-time.After(10 * time.Second):
		t.Fatal("serve no volvió después de cancelar root")
	}
}

func TestServeReportsAShutdownThatRanOutOfTime(t *testing.T) {
	cancel, _, served := startServe(t, 2*time.Second, 100*time.Millisecond)
	defer cancel()

	cancel()
	select {
	case err := <-served:
		if err == nil || !strings.Contains(err.Error(), "apagado") {
			t.Fatalf("un apagado que vence con pedidos en curso es un error (main sale con código 1): %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("serve no volvió después de cancelar root")
	}
}

func TestRuntimeRegisteredReadsDockerInfo(t *testing.T) {
	// Forma de `docker info --format '{{json .Runtimes}}'` con gVisor instalado (campo status
	// recortado).
	info := []byte(`{"io.containerd.runc.v2":{"path":"runc"},"runc":{"path":"runc"},"runsc":{"path":"/usr/bin/runsc","runtimeArgs":["--network=none"],"status":{}}}` + "\n")
	for name, want := range map[string]bool{"runsc": true, "runc": true, "kata": false, "": false} {
		got, err := runtimeRegistered(info, name)
		if err != nil || got != want {
			t.Errorf("runtimeRegistered(%q) = %v, %v; quiero %v", name, got, err, want)
		}
	}
	if _, err := runtimeRegistered([]byte("no es json"), "runsc"); err == nil {
		t.Error("una salida ilegible de docker info es un error, no «falta el runtime»")
	}
}
