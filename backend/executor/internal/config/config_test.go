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
	if cfg.Addr != ":8080" || cfg.Runtime != "runsc" || cfg.MaxConcurrent != 4 || cfg.Instance != "servicio" {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
}

func TestReadsExplicitValues(t *testing.T) {
	values := valid()
	values["EXECUTOR_ADDR"] = ":9000"
	values["EXECUTOR_INSTANCE"] = "staging-2"
	cfg, err := FromEnv(env(values))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Addr != ":9000" || cfg.Token != strings.Repeat("x", 32) {
		t.Fatalf("address or token from the environment was ignored: %+v", cfg)
	}
	if cfg.RustImage != "rust-img" || cfg.GoImage != "go-img" {
		t.Fatalf("each language must use its own image: %+v", cfg)
	}
	if cfg.Instance != "staging-2" {
		t.Fatalf("the instance comes from the environment: %+v", cfg)
	}
}

func TestRejectsShortToken(t *testing.T) {
	values := valid()
	values["EXECUTOR_TOKEN"] = strings.Repeat("x", 31)
	if _, err := FromEnv(env(values)); err == nil {
		t.Fatal("a 31-byte token must be rejected")
	}
}

func TestRuntimeMustBeRunscOrRunc(t *testing.T) {
	values := valid()
	values["EXECUTOR_RUNTIME"] = "kata"
	if _, err := FromEnv(env(values)); err == nil {
		t.Fatal("an unknown runtime must be rejected")
	}
	values["EXECUTOR_RUNTIME"] = "runc"
	cfg, err := FromEnv(env(values))
	if err != nil || cfg.Runtime != "runc" {
		t.Fatalf("explicit runc must be accepted: %+v, %v", cfg, err)
	}
}

func TestRequiresBothImages(t *testing.T) {
	for _, key := range []string{"EXECUTOR_RUST_IMAGE", "EXECUTOR_GO_IMAGE"} {
		values := valid()
		delete(values, key)
		if _, err := FromEnv(env(values)); err == nil {
			t.Fatalf("without %s it must fail", key)
		}
	}
}

func TestMaxConcurrentRange(t *testing.T) {
	for _, raw := range []string{"0", "9", "x"} {
		values := valid()
		values["EXECUTOR_MAX_CONCURRENT"] = raw
		if _, err := FromEnv(env(values)); err == nil {
			t.Fatalf("EXECUTOR_MAX_CONCURRENT=%q must be rejected", raw)
		}
	}
	for raw, want := range map[string]int{"1": 1, "3": 3, "8": 8} {
		values := valid()
		values["EXECUTOR_MAX_CONCURRENT"] = raw
		cfg, err := FromEnv(env(values))
		if err != nil || cfg.MaxConcurrent != want {
			t.Fatalf("EXECUTOR_MAX_CONCURRENT=%q must be accepted as %d: %+v, %v", raw, want, cfg, err)
		}
	}
}

func TestInstanceMustBeALabelValue(t *testing.T) {
	for _, raw := range []string{"With Space", "a_b", "UPPER", strings.Repeat("a", 33)} {
		values := valid()
		values["EXECUTOR_INSTANCE"] = raw
		if _, err := FromEnv(env(values)); err == nil {
			t.Fatalf("EXECUTOR_INSTANCE=%q must be rejected", raw)
		}
	}
}
