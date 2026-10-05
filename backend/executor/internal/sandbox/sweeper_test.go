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
		{Kind: "container", Name: "taller-r-no-time"},
		{Kind: "volume", Name: "mysql-data"}, // foreign name: even if it slipped in, it is never removed
	}}
	sweeper := Sweeper{Engine: engine, Now: func() time.Time { return now }, MaxAge: 2 * time.Minute, Instance: "tests"}
	if err := sweeper.Sweep(context.Background()); err != nil {
		t.Fatal(err)
	}
	if engine.label != RunLabel+"=tests" {
		t.Fatalf("the sweep asks only for the executor resources: %q", engine.label)
	}
	want := []string{"rm taller-r-old", "rm taller-r-no-time", "volume-rm taller-out-old"}
	if !slices.Equal(engine.calls, want) {
		t.Fatalf("calls = %v\nwant    %v", engine.calls, want)
	}
}

func TestSweepReportsRemovalErrorsAndKeepsGoing(t *testing.T) {
	now := time.Unix(10_000, 0)
	engine := &listingEngine{removeErr: errors.New("container is dead"), resources: []Resource{
		{Kind: "container", Name: "taller-r-old", Created: now.Add(-10 * time.Minute)},
		{Kind: "volume", Name: "taller-out-old", Created: now.Add(-10 * time.Minute)},
	}}
	sweeper := Sweeper{Engine: engine, Now: func() time.Time { return now }, MaxAge: 2 * time.Minute, Instance: "tests"}
	if err := sweeper.Sweep(context.Background()); err == nil {
		t.Fatal("a persistent leak must reach the log")
	}
	if !slices.Contains(engine.calls, "volume-rm taller-out-old") {
		t.Fatalf("an error does not stop the sweep: %v", engine.calls)
	}
}

func TestSweepRequiresAnInstance(t *testing.T) {
	engine := &listingEngine{}
	if err := (Sweeper{Engine: engine, Now: time.Now, MaxAge: 0}).Sweep(context.Background()); err == nil {
		t.Fatal("without an instance, the sweep could touch another service's resources")
	}
	if engine.label != "" {
		t.Fatalf("it does not even list: %q", engine.label)
	}
}
