package sandbox

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"
)

// Sweeper borra contenedores y volúmenes del ejecutor más viejos que MaxAge: restos de una
// caída o de una limpieza fallida. Los contenedores van primero porque un volumen en uso no
// se puede borrar.
type Sweeper struct {
	Engine   Engine
	Now      func() time.Time
	MaxAge   time.Duration
	Instance string // valor de RunLabel: sólo barre lo de esta instancia
}

// Sweep sólo toca nombres propios: aunque fallara el filtro por etiqueta, un volumen ajeno (por
// ejemplo, los datos de MySQL) nunca se borra. Junta los errores para que una fuga llegue al log.
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
