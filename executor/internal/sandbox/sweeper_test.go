package sandbox

import (
	"context"
	"slices"
	"testing"
	"time"
)

type listingEngine struct {
	fakeEngine
	resources []Resource
}

func (l *listingEngine) ListLabeled(context.Context, string) ([]Resource, error) {
	return l.resources, nil
}

func TestSweepRemovesOldContainersBeforeVolumesAndKeepsFreshOnes(t *testing.T) {
	now := time.Unix(10_000, 0)
	engine := &listingEngine{resources: []Resource{
		{Kind: "volume", Name: "taller-out-old", Created: now.Add(-10 * time.Minute)},
		{Kind: "container", Name: "taller-r-old", Created: now.Add(-10 * time.Minute)},
		{Kind: "container", Name: "taller-r-new", Created: now.Add(-10 * time.Second)},
		{Kind: "container", Name: "taller-r-unlabeled"},
	}}
	sweeper := Sweeper{Engine: engine, Now: func() time.Time { return now }, MaxAge: 2 * time.Minute}
	if err := sweeper.Sweep(context.Background()); err != nil {
		t.Fatal(err)
	}
	want := []string{"rm taller-r-old", "rm taller-r-unlabeled", "volume-rm taller-out-old"}
	if !slices.Equal(engine.calls, want) {
		t.Fatalf("llamadas = %v\nquiero   %v", engine.calls, want)
	}
}
