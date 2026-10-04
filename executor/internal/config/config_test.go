package config

import (
	"strings"
	"testing"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func valid() map[string]string {
	return map[string]string{
		"EXECUTOR_TOKEN":      strings.Repeat("x", 32),
		"EXECUTOR_RUST_IMAGE": "rust-img",
		"EXECUTOR_GO_IMAGE":   "go-img",
	}
}

func TestDefaults(t *testing.T) {
	cfg, err := FromEnv(env(valid()))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Addr != ":8080" || cfg.Runtime != "runsc" || cfg.MaxConcurrent != 4 {
		t.Fatalf("valores por defecto inesperados: %+v", cfg)
	}
}

func TestReadsExplicitValues(t *testing.T) {
	values := valid()
	values["EXECUTOR_ADDR"] = ":9000"
	cfg, err := FromEnv(env(values))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Addr != ":9000" || cfg.Token != strings.Repeat("x", 32) {
		t.Fatalf("no respetó la dirección o el token del entorno: %+v", cfg)
	}
	if cfg.RustImage != "rust-img" || cfg.GoImage != "go-img" {
		t.Fatalf("cada lenguaje debe usar su propia imagen: %+v", cfg)
	}
}

func TestRejectsShortToken(t *testing.T) {
	values := valid()
	values["EXECUTOR_TOKEN"] = strings.Repeat("x", 31)
	if _, err := FromEnv(env(values)); err == nil {
		t.Fatal("un token de 31 bytes debe rechazarse")
	}
}

func TestRuntimeMustBeRunscOrRunc(t *testing.T) {
	values := valid()
	values["EXECUTOR_RUNTIME"] = "kata"
	if _, err := FromEnv(env(values)); err == nil {
		t.Fatal("un runtime desconocido debe rechazarse")
	}
	values["EXECUTOR_RUNTIME"] = "runc"
	cfg, err := FromEnv(env(values))
	if err != nil || cfg.Runtime != "runc" {
		t.Fatalf("runc explícito debe aceptarse: %+v, %v", cfg, err)
	}
}

func TestRequiresBothImages(t *testing.T) {
	for _, key := range []string{"EXECUTOR_RUST_IMAGE", "EXECUTOR_GO_IMAGE"} {
		values := valid()
		delete(values, key)
		if _, err := FromEnv(env(values)); err == nil {
			t.Fatalf("sin %s debe fallar", key)
		}
	}
}

func TestMaxConcurrentRange(t *testing.T) {
	for _, raw := range []string{"0", "9", "x"} {
		values := valid()
		values["EXECUTOR_MAX_CONCURRENT"] = raw
		if _, err := FromEnv(env(values)); err == nil {
			t.Fatalf("EXECUTOR_MAX_CONCURRENT=%q debe rechazarse", raw)
		}
	}
	for raw, want := range map[string]int{"1": 1, "3": 3, "8": 8} {
		values := valid()
		values["EXECUTOR_MAX_CONCURRENT"] = raw
		cfg, err := FromEnv(env(values))
		if err != nil || cfg.MaxConcurrent != want {
			t.Fatalf("EXECUTOR_MAX_CONCURRENT=%q debe aceptarse como %d: %+v, %v", raw, want, cfg, err)
		}
	}
}
