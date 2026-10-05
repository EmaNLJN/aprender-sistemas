package sandbox

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"
)

// Containers go first because a volume in use cannot be removed.
type Sweeper struct {
	Engine   Engine
	Now      func() time.Time
	MaxAge   time.Duration
	Instance string
}

func (s Sweeper) Sweep(ctx context.Context) error {
	if s.Instance == "" {
		return errors.New("Sweeper sin Instance: barrería recursos de otro servicio")
	}
	resources, err := s.Engine.ListLabeled(ctx, RunLabel+"="+s.Instance)
	if err != nil {
		return err
	}
	sort.SliceStable(resources, func(i, j int) bool {
		return resources[i].Kind == "container" && resources[j].Kind != "container"
	})
	var errs []error
	for _, resource := range resources {
		if !isExecutorName(resource.Name) || s.Now().Sub(resource.Created) < s.MaxAge {
			continue
		}
		if resource.Kind == "container" {
			errs = append(errs, s.Engine.Remove(ctx, resource.Name))
		} else {
			errs = append(errs, s.Engine.RemoveVolume(ctx, resource.Name))
		}
	}
	return errors.Join(errs...)
}

func isExecutorName(name string) bool {
	for _, prefix := range []string{"taller-c-", "taller-r-", "taller-out-"} {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}
