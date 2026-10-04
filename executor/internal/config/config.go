// Package config lee la configuración del ejecutor desde el entorno.
package config

import (
	"errors"
	"fmt"
	"strconv"
)

type Config struct {
	Addr          string
	Token         string
	Runtime       string
	RustImage     string
	GoImage       string
	MaxConcurrent int
}

const minTokenLength = 32

// FromEnv falla si falta un token largo, alguna imagen o el runtime no es runsc ni runc:
// el ejecutor nunca debe arrancar con una configuración insegura por omisión.
func FromEnv(getenv func(string) string) (Config, error) {
	cfg := Config{
		Addr:          valueOr(getenv("EXECUTOR_ADDR"), ":8080"),
		Token:         getenv("EXECUTOR_TOKEN"),
		Runtime:       valueOr(getenv("EXECUTOR_RUNTIME"), "runsc"),
		RustImage:     getenv("EXECUTOR_RUST_IMAGE"),
		GoImage:       getenv("EXECUTOR_GO_IMAGE"),
		MaxConcurrent: 4,
	}
	if raw := getenv("EXECUTOR_MAX_CONCURRENT"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 8 {
			return Config{}, fmt.Errorf("EXECUTOR_MAX_CONCURRENT debe estar entre 1 y 8: %q", raw)
		}
		cfg.MaxConcurrent = n
	}
	if len(cfg.Token) < minTokenLength {
		return Config{}, errors.New("EXECUTOR_TOKEN debe tener al menos 32 caracteres")
	}
	if cfg.Runtime != "runsc" && cfg.Runtime != "runc" {
		return Config{}, fmt.Errorf("EXECUTOR_RUNTIME debe ser runsc o runc: %q", cfg.Runtime)
	}
	if cfg.RustImage == "" || cfg.GoImage == "" {
		return Config{}, errors.New("EXECUTOR_RUST_IMAGE y EXECUTOR_GO_IMAGE son obligatorias")
	}
	return cfg, nil
}

func valueOr(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
