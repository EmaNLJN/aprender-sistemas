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

// startServe starts serve with a handler that mimics the Runner: the request inherits root, sees
// its context cancelled and only then removes its containers, with contexts of its own.
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
		t.Fatal("the request never reached the handler")
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
			t.Fatal("serve returned before the in-flight request finished cleaning up: the process would exit with the container alive")
		}
	case <-time.After(10 * time.Second):
		t.Fatal("serve did not return after cancelling root")
	}
}

func TestServeReportsAShutdownThatRanOutOfTime(t *testing.T) {
	cancel, _, served := startServe(t, 2*time.Second, 100*time.Millisecond)
	defer cancel()

	cancel()
	select {
	case err := <-served:
		if err == nil || !strings.Contains(err.Error(), "apagado") {
			t.Fatalf("a shutdown that times out with requests in flight is an error (main exits with code 1): %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("serve did not return after cancelling root")
	}
}

func TestRuntimeRegisteredReadsDockerInfo(t *testing.T) {
	// Shape of `docker info --format '{{json .Runtimes}}'` with gVisor installed (status field
	// trimmed).
	info := []byte(`{"io.containerd.runc.v2":{"path":"runc"},"runc":{"path":"runc"},"runsc":{"path":"/usr/bin/runsc","runtimeArgs":["--network=none"],"status":{}}}` + "\n")
	for name, want := range map[string]bool{"runsc": true, "runc": true, "kata": false, "": false} {
		got, err := runtimeRegistered(info, name)
		if err != nil || got != want {
			t.Errorf("runtimeRegistered(%q) = %v, %v; want %v", name, got, err, want)
		}
	}
	if _, err := runtimeRegistered([]byte("not json"), "runsc"); err == nil {
		t.Error("unreadable docker info output is an error, not \"runtime missing\"")
	}
}
