package sandbox

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"
)

type listingEngine struct {
	fakeEngine
	resources []Resource
	label     string
	removeErr error
}

func (l *listingEngine) ListLabeled(_ context.Context, label string) ([]Resource, error) {
	l.label = label
	return l.resources, nil
}

func (l *listingEngine) Remove(ctx context.Context, name string) error {
	l.fakeEngine.Remove(ctx, name)
	return l.removeErr
}

func TestSweepRemovesOldContainersBeforeVolumesAndKeepsFreshOnes(t *testing.T) {
	now := time.Unix(10_000, 0)
	engine := &listingEngine{resources: []Resource{
		{Kind: "volume", Name: "taller-out-old", Created: now.Add(-10 * time.Minute)},
		{Kind: "container", Name: "taller-r-old", Created: now.Add(-10 * time.Minute)},
		{Kind: "container", Name: "taller-r-new", Created: now.Add(-10 * time.Second)},
		{Kind: "container", Name: "taller-r-sin-hora"},
		{Kind: "volume", Name: "mysql-data"}, // nombre ajeno: aunque se colara, nunca se borra
	}}
	sweeper := Sweeper{Engine: engine, Now: func() time.Time { return now }, MaxAge: 2 * time.Minute, Instance: "pruebas"}
	if err := sweeper.Sweep(context.Background()); err != nil {
		t.Fatal(err)
	}
	if engine.label != RunLabel+"=pruebas" {
		t.Fatalf("el barrido pide sólo los recursos del ejecutor: %q", engine.label)
	}
	want := []string{"rm taller-r-old", "rm taller-r-sin-hora", "volume-rm taller-out-old"}
	if !slices.Equal(engine.calls, want) {
		t.Fatalf("llamadas = %v\nquiero   %v", engine.calls, want)
	}
}

func TestSweepReportsRemovalErrorsAndKeepsGoing(t *testing.T) {
	now := time.Unix(10_000, 0)
	engine := &listingEngine{removeErr: errors.New("container is dead"), resources: []Resource{
		{Kind: "container", Name: "taller-r-old", Created: now.Add(-10 * time.Minute)},
		{Kind: "volume", Name: "taller-out-old", Created: now.Add(-10 * time.Minute)},
	}}
	sweeper := Sweeper{Engine: engine, Now: func() time.Time { return now }, MaxAge: 2 * time.Minute, Instance: "pruebas"}
	if err := sweeper.Sweep(context.Background()); err == nil {
		t.Fatal("una fuga persistente tiene que llegar al log")
	}
	if !slices.Contains(engine.calls, "volume-rm taller-out-old") {
		t.Fatalf("un error no corta el barrido: %v", engine.calls)
	}
}

func TestSweepRequiresAnInstance(t *testing.T) {
	engine := &listingEngine{}
	if err := (Sweeper{Engine: engine, Now: time.Now, MaxAge: 0}).Sweep(context.Background()); err == nil {
		t.Fatal("sin instancia, el barrido podría tocar recursos de otro servicio")
	}
	if engine.label != "" {
		t.Fatalf("ni siquiera lista: %q", engine.label)
	}
}
