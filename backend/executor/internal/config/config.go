// Package config lee la configuración del ejecutor desde el entorno.
package config

import (
	"errors"
	"fmt"
	"strconv"
)

// Config es la configuración del ejecutor, ya validada por FromEnv.
type Config struct {
	Addr          string
	Token         string
	Runtime       string
	RustImage     string
	GoImage       string
	MaxConcurrent int
	// Instance es el valor de la etiqueta taller.executor.run: separa los recursos de cada
	// servicio (y de las pruebas de integración) que comparten el daemon.
	Instance string
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
		Instance:      valueOr(getenv("EXECUTOR_INSTANCE"), "servicio"),
	}
	if !isLabelValue(cfg.Instance) {
		return Config{}, fmt.Errorf("EXECUTOR_INSTANCE sólo admite minúsculas, dígitos y guiones (1 a 32): %q", cfg.Instance)
	}
	if raw := getenv("EXECUTOR_MAX_CONCURRENT"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 8 {
			return Config{}, fmt.Errorf("EXECUTOR_MAX_CONCURRENT debe estar entre 1 y 8: %q", raw)
		}
		cfg.MaxConcurrent = n
	}
	if len(cfg.Token) < minTokenLength {
		return Config{}, fmt.Errorf("EXECUTOR_TOKEN debe tener al menos %d bytes", minTokenLength)
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

func isLabelValue(value string) bool {
	if value == "" || len(value) > 32 {
		return false
	}
	for _, r := range value {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '-' {
			return false
		}
	}
	return true
}
