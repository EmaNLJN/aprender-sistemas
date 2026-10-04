package sandbox

import (
	"context"
	"sort"
	"time"
)

// Sweeper borra contenedores y volúmenes del ejecutor más viejos que MaxAge: restos de una
// caída o de una limpieza fallida. Los contenedores van primero porque un volumen en uso no
// se puede borrar.
type Sweeper struct {
	Engine Engine
	Now    func() time.Time
	MaxAge time.Duration
}

func (s Sweeper) Sweep(ctx context.Context) error {
	resources, err := s.Engine.ListLabeled(ctx, RunLabel+"=1")
	if err != nil {
		return err
	}
	sort.SliceStable(resources, func(i, j int) bool {
		return resources[i].Kind == "container" && resources[j].Kind != "container"
	})
	for _, resource := range resources {
		if s.Now().Sub(resource.Created) < s.MaxAge {
			continue
		}
		if resource.Kind == "container" {
			_ = s.Engine.Remove(ctx, resource.Name)
		} else {
			_ = s.Engine.RemoveVolume(ctx, resource.Name)
		}
	}
	return nil
}
