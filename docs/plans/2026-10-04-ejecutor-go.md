# B1 — Ejecutor Go con sandbox gVisor: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usá superpowers:subagent-driven-development
> (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los
> pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** un servicio HTTP interno en Go que recibe un programa Rust o Go completo, lo
compila y lo ejecuta en dos contenedores efímeros endurecidos, y devuelve un resultado
estructurado.

**Arquitectura:**

- `executor/` es un módulo Go sólo con biblioteca estándar.
- La lógica pura (límites, argumentos de Docker, orquestación de fases, salida acotada, API)
  se prueba con dobles.
- Docker se usa por su CLI detrás de la interfaz `Engine`.
- Por envío se crean un volumen con nombre y dos contenedores:
  - **compilación:** más memoria y CPU; escribe el binario en `/out`;
  - **ejecución:** `--read-only`, `/out` de sólo lectura y límites chicos.
- La asincronía no vive acá: la pone Laravel en el subplan B2.

**Tecnologías:**

- Go 1.27, sólo biblioteca estándar.
- CLI de Docker; gVisor (`runsc`) como runtime de los contenedores de ejecución.
- Imágenes `rust:1.99-slim`, `golang:1.27-alpine` y `alpine:3.24`.

**Spec:** [ADR 0005](../adr/0005-ejecucion-en-sandbox-propio.md). Hoja de ruta:
[2026-10-04-backend-hoja-de-ruta.md](2026-10-04-backend-hoja-de-ruta.md).

## Restricciones globales

- **Contrato del ejecutor:** `POST /v1/run {language, program}` responde
  `{phase, exitCode, stdout, stderr, truncated, timedOut, oomKilled, compileMs, runMs}`.
  Nunca acepta imágenes, flags ni límites desde la petición.
- **Acceso:** vive sólo en la red interna y exige un token compartido. `GET /healthz` no
  pide token.
- **Flags de todo contenedor:**
  - `--runtime=runsc` por defecto; `runc` sólo si se configura explícitamente;
  - `--network=none`, `--cap-drop=ALL` y `--security-opt no-new-privileges`;
  - usuario `65534`;
  - `--pids-limit`, memoria sin swap (`--memory` = `--memory-swap`), `--cpus` y `--ulimit`;
  - en la fase de ejecución, además, `--read-only`.
- **Límites** (ADR 0005, tabla «Límites iniciales»):

  | Límite | Compilar | Ejecutar |
  |---|---|---|
  | Tiempo de reloj | Rust 20 s, Go 15 s | 10 s |
  | Memoria | 1024 MiB | 256 MiB |
  | Procesos | 256 | 64 |
  | CPU | 2 | 1 |
  | Salida | 64 KiB por stream, con marca de truncado | 64 KiB por stream, con marca de truncado |

- **Programa** (código del alumno más harness): como máximo 128 KiB.
- **Concurrencia:** 4 ejecuciones simultáneas por defecto, configurable entre 1 y 8.
- **Toolchains:**
  - Rust estable con `--edition 2024` en modo debug: las comprobaciones de overflow quedan
    activas, como en el Playground de hoy.
  - Go con `CGO_ENABLED=0 GOTOOLCHAIN=local GOPROXY=off`.
  - `go vet` es informativo: su salida va a `stderr` y nunca impide compilar, como en
    `src/shared/api/playground/protocol.ts`.
- **Entorno:**
  - El host no tiene Go: todo se compila y se prueba dentro de `golang:1.27-alpine`, con
    los scripts de `executor/scripts/`.
  - No commitees ni instales nada sin el permiso del agente principal. Cada descarga de
    imagen la aprueba el usuario.
- **Estilo:** comentarios en español y nombres en inglés, como el resto del repo.

## Foco de revisión

Cada línea es una entrada que un uso real va a encontrar. Su prueba vive en la tarea dueña
del código.

1. **Programa que imprime sin fin:** la salida queda en 64 KiB por stream, con `truncated`
   en true, la memoria del ejecutor se mantiene acotada y el contenedor nunca se traba
   esperando que leamos. Pruebas: tarea 1 (`Write` nunca bloquea ni falla) y tarea 8
   (inundación real).
2. **Cliente que se desconecta a mitad de una ejecución:** el contenedor se mata y se borran
   contenedores y volumen, sin informar `timedOut`. Prueba: tarea 4.
3. **Docker caído o imagen ausente:** respuesta 503 con un mensaje claro, sin panic, y
   Laravel lo registrará como `infra_error`. Pruebas: tareas 4, 5 y 6.
4. **Más pedidos que lugares:** nunca hay más de `MaxConcurrent` contenedores a la vez, y
   después de la espera responde 503. Prueba: tarea 6.
5. **Programas concurrentes legítimos** (8 goroutines o hilos, `httptest` sobre loopback):
   funcionan con los límites de procesos y sin red. Prueba: tarea 8.
6. **Salida que no es UTF-8 válido o cortada en medio de un carácter:** el JSON sigue siendo
   válido. Prueba: tarea 1.
7. **Restos de una caída del ejecutor:** el barrido al arrancar los elimina. Prueba: tarea 5.

## Estructura de archivos

```
executor/
  go.mod                         módulo taller/executor, Go 1.27, sin dependencias
  AGENTS.md                      reglas y comandos del ejecutor (tarea 9)
  Dockerfile                     imagen del ejecutor; etapa `test` con docker-cli
  cmd/executor/main.go           cableado: configuración, servidor y barrido
  internal/output/limited.go     buffer acotado con marca de truncado
  internal/config/config.go      configuración desde el entorno, con validación
  internal/sandbox/types.go      Phase, Profile, Spec, State, Resource, Result y etiquetas
  internal/sandbox/profile.go    perfiles del ADR 0005 por lenguaje
  internal/sandbox/args.go       argumentos de `docker create` (puro)
  internal/sandbox/engine.go     interfaz Engine
  internal/sandbox/runner.go     orquestación de compilación y ejecución
  internal/sandbox/docker.go     Engine real sobre la CLI de Docker
  internal/sandbox/sweeper.go    barrido de restos etiquetados
  internal/sandbox/id.go         IDs aleatorios por envío
  internal/sandbox/integration_test.go  pruebas con Docker real (tag `integration`)
  internal/api/server.go         HTTP: token, validación, semáforo y JSON
  images/rust/Dockerfile         sandbox Rust
  images/go/Dockerfile           sandbox Go con GOCACHE precalentado
  images/go/warm/main.go         importa la stdlib que usan los ejercicios
  scripts/test.sh                gofmt + go vet + go test en contenedor
  scripts/integration.sh         construye imágenes y corre la integración
  scripts/smoke-gvisor.sh        prueba de humo que corre el usuario
```

Cada archivo `_test.go` vive al lado del código que prueba.

---

### Tarea 1: Módulo, salida acotada y script de pruebas

**Archivos:**
- Crear: `executor/go.mod`, `executor/internal/output/limited.go`,
  `executor/internal/output/limited_test.go` y `executor/scripts/test.sh`.

**Interfaces:**
- Produce `output.Limited{Max int}`, que implementa `io.Writer` con `String() string` y
  `Truncated() bool`.

- [ ] **Paso 1: Crear el módulo y el script de pruebas**

`executor/go.mod`:
```
module taller/executor

go 1.27
```

`executor/scripts/test.sh`:
```sh
#!/bin/sh
# Corre gofmt, go vet y las pruebas unitarias del ejecutor dentro de golang:1.27-alpine,
# porque el host no tiene Go. Los volúmenes con nombre conservan los cachés entre corridas.
# Uso: sh executor/scripts/test.sh [argumentos extra para go test]
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
exec docker run --rm \
  -v "$here":/src -w /src \
  -v taller-executor-gocache:/root/.cache/go-build \
  golang:1.27-alpine sh -c '
    unformatted=$(gofmt -l .)
    if [ -n "$unformatted" ]; then echo "Sin formato gofmt:"; echo "$unformatted"; exit 1; fi
    go vet ./... && go test ./... "$@"' sh "$@"
```

- [ ] **Paso 2: Escribir las pruebas que fallan**

`executor/internal/output/limited_test.go`:
```go
package output

import (
	"encoding/json"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestLimitedKeepsEverythingUnderTheCap(t *testing.T) {
	l := &Limited{Max: 10}
	n, err := l.Write([]byte("hola"))
	if n != 4 || err != nil {
		t.Fatalf("Write = %d, %v; quiero 4, nil", n, err)
	}
	if l.String() != "hola" || l.Truncated() {
		t.Fatalf("String = %q, Truncated = %v", l.String(), l.Truncated())
	}
}

func TestLimitedCutsAtTheCapWithoutBlockingTheWriter(t *testing.T) {
	l := &Limited{Max: 5}
	l.Write([]byte("abc"))
	n, err := l.Write([]byte("defgh"))
	if n != 5 || err != nil {
		t.Fatalf("Write debe aceptar todo sin error para no trabar al programa: %d, %v", n, err)
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("String = %q; quiero %q", got, "abcde")
	}
	if !l.Truncated() {
		t.Fatal("Truncated = false; quiero true")
	}
	if n, err := l.Write([]byte("más")); n != len("más") || err != nil {
		t.Fatalf("después del tope Write sigue aceptando: %d, %v", n, err)
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("después del tope no se guarda nada más: %q", got)
	}
}

func TestLimitedNeverReturnsInvalidUTF8(t *testing.T) {
	l := &Limited{Max: 2}
	l.Write([]byte("añb")) // "ñ" ocupa 2 bytes: el tope cae en el medio del carácter
	got := l.String()
	if !utf8.ValidString(got) {
		t.Fatalf("String = %q no es UTF-8 válido", got)
	}
	if !strings.HasPrefix(got, "a") {
		t.Fatalf("se perdió el prefijo válido: %q", got)
	}
	if _, err := json.Marshal(got); err != nil {
		t.Fatal(err)
	}
}
```

- [ ] **Paso 3: Correr las pruebas y ver que fallan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: FAIL de compilación, con `undefined: Limited`.

- [ ] **Paso 4: Implementar**

`executor/internal/output/limited.go`:
```go
// Package output acota lo que un programa del alumno puede imprimir.
package output

import (
	"strings"
	"sync"
)

// Limited guarda hasta Max bytes y descarta el resto sin bloquear al escritor: el programa
// puede imprimir sin fin y el contenedor no debe quedar trabado esperando que leamos.
type Limited struct {
	Max       int
	mu        sync.Mutex
	buf       []byte
	truncated bool
}

func (l *Limited) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	room := l.Max - len(l.buf)
	switch {
	case len(p) <= room:
		l.buf = append(l.buf, p...)
	case room > 0:
		l.buf = append(l.buf, p[:room]...)
		l.truncated = true
	case len(p) > 0:
		l.truncated = true
	}
	return len(p), nil
}

// String devuelve lo guardado como UTF-8 válido: un carácter cortado por el tope o bytes
// inválidos se reemplazan por U+FFFD, así el JSON de la respuesta nunca se rompe.
func (l *Limited) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return strings.ToValidUTF8(string(l.buf), "�")
}

func (l *Limited) Truncated() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.truncated
}
```

- [ ] **Paso 5: Correr las pruebas y ver que pasan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: `ok  taller/executor/internal/output`.

- [ ] **Paso 6: Commit** (lo hace el agente principal después de revisar el diff)

```bash
git add executor/go.mod executor/internal/output executor/scripts/test.sh
git commit -m "feat(ejecutor): módulo Go y salida acotada sin bloquear al programa"
```

---

### Tarea 2: Configuración desde el entorno

**Archivos:**
- Crear: `executor/internal/config/config.go` y `executor/internal/config/config_test.go`.

**Interfaces:**
- Produce
  `config.FromEnv(getenv func(string) string) (config.Config, error)`.
- `Config{Addr, Token, Runtime, RustImage, GoImage string; MaxConcurrent int}`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`executor/internal/config/config_test.go`:
```go
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

func TestRejectsShortToken(t *testing.T) {
	values := valid()
	values["EXECUTOR_TOKEN"] = strings.Repeat("x", 31)
	if _, err := FromEnv(env(values)); err == nil {
		t.Fatal("un token de 31 caracteres debe rechazarse")
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
	values := valid()
	values["EXECUTOR_MAX_CONCURRENT"] = "3"
	cfg, err := FromEnv(env(values))
	if err != nil || cfg.MaxConcurrent != 3 {
		t.Fatalf("3 debe aceptarse: %+v, %v", cfg, err)
	}
}
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: FAIL, con `undefined: FromEnv`.

- [ ] **Paso 3: Implementar**

`executor/internal/config/config.go`:
```go
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
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: `ok  taller/executor/internal/config`.

- [ ] **Paso 5: Commit**

```bash
git add executor/internal/config
git commit -m "feat(ejecutor): configuración validada desde el entorno"
```

---

### Tarea 3: Tipos, perfiles del ADR y argumentos de Docker

**Archivos:**
- Crear: `executor/internal/sandbox/types.go`, `profile.go`, `args.go` y `args_test.go`.

**Interfaces:**
- Produce estos tipos, que usan las tareas 4 a 8:
  - `Phase{Timeout time.Duration; MemoryMiB, Pids, TmpfsMiB int; CPUs string; ReadOnly bool; Cmd []string}`
  - `Profile{Image string; Compile, Run Phase; OutputLimit int}`
  - `Spec{Name, Image string; Phase Phase; Volume string; VolumeRO bool; Labels map[string]string; Runtime string}`
  - `State{ExitCode int; OOMKilled bool}`
  - `Resource{Kind, Name string; Created time.Time}`
  - `Result{Phase string; ExitCode int; Stdout, Stderr string; Truncated, TimedOut, OOMKilled bool; CompileMs, RunMs int64}`
- Constantes: `RunLabel = "taller.executor.run"` y `CreatedLabel = "taller.executor.created"`.
- Funciones:
  - `Profiles(rustImage, goImage string) map[string]Profile`;
  - `createArgs(Spec) []string`;
  - `sortedKeys(map[string]string) []string`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`executor/internal/sandbox/args_test.go`:
```go
package sandbox

import (
	"slices"
	"testing"
)

func containsPair(args []string, flag, value string) bool {
	for i := 0; i+1 < len(args); i++ {
		if args[i] == flag && args[i+1] == value {
			return true
		}
	}
	return false
}

func mustHavePair(t *testing.T, args []string, flag, value string) {
	t.Helper()
	if !containsPair(args, flag, value) {
		t.Fatalf("falta %s %s en %v", flag, value, args)
	}
}

func specFor(language string, run bool) Spec {
	profile := Profiles("rust-img", "go-img")[language]
	phase, name := profile.Compile, "taller-c-1"
	if run {
		phase, name = profile.Run, "taller-r-1"
	}
	return Spec{
		Name: name, Image: profile.Image, Phase: phase, Volume: "taller-out-1", VolumeRO: run,
		Runtime: "runsc", Labels: map[string]string{RunLabel: "1", CreatedLabel: "100"},
	}
}

func TestCompileContainerIsHardened(t *testing.T) {
	spec := specFor("rust", false)
	args := createArgs(spec)
	if args[0] != "create" {
		t.Fatalf("debe crear el contenedor, no correrlo: %v", args)
	}
	mustHavePair(t, args, "--runtime", "runsc")
	mustHavePair(t, args, "--network", "none")
	mustHavePair(t, args, "--cap-drop", "ALL")
	mustHavePair(t, args, "--security-opt", "no-new-privileges")
	mustHavePair(t, args, "--user", "65534:65534")
	mustHavePair(t, args, "--pids-limit", "256")
	mustHavePair(t, args, "--memory", "1024m")
	mustHavePair(t, args, "--memory-swap", "1024m")
	mustHavePair(t, args, "--cpus", "2")
	mustHavePair(t, args, "--mount", "type=volume,src=taller-out-1,dst=/out")
	mustHavePair(t, args, "--label", CreatedLabel+"=100")
	mustHavePair(t, args, "--label", RunLabel+"=1")
	if !slices.Contains(args, "--read-only") {
		t.Fatal("Rust compila con rootfs de sólo lectura")
	}
	image := slices.Index(args, "rust-img")
	if image < 0 || !slices.Equal(args[image+1:], spec.Phase.Cmd) {
		t.Fatalf("la imagen va después de las opciones y el comando al final: %v", args)
	}
}

func TestRunContainerIsReadOnlyWithSmallLimits(t *testing.T) {
	args := createArgs(specFor("go", true))
	mustHavePair(t, args, "--mount", "type=volume,src=taller-out-1,dst=/out,readonly")
	mustHavePair(t, args, "--memory", "256m")
	mustHavePair(t, args, "--memory-swap", "256m")
	mustHavePair(t, args, "--pids-limit", "64")
	mustHavePair(t, args, "--cpus", "1")
	if !slices.Contains(args, "--read-only") {
		t.Fatal("la ejecución siempre usa rootfs de sólo lectura")
	}
}

func TestGoCompileKeepsAWritableLayerForTheBuildCache(t *testing.T) {
	if slices.Contains(createArgs(specFor("go", false)), "--read-only") {
		t.Fatal("go build escribe en GOCACHE dentro de la capa del contenedor, que se descarta")
	}
}

func TestProfilesMatchTheADR(t *testing.T) {
	profiles := Profiles("rust-img", "go-img")
	if profiles["rust"].Compile.Timeout.Seconds() != 20 || profiles["go"].Compile.Timeout.Seconds() != 15 {
		t.Fatal("compilación: Rust 20 s y Go 15 s")
	}
	for language, profile := range profiles {
		if profile.Run.Timeout.Seconds() != 10 || profile.OutputLimit != 64<<10 {
			t.Fatalf("%s: ejecución 10 s y salida de 64 KiB", language)
		}
	}
}

func TestLabelsAreSortedSoArgsAreStable(t *testing.T) {
	first := createArgs(specFor("rust", false))
	for range 20 {
		if !slices.Equal(first, createArgs(specFor("rust", false))) {
			t.Fatal("los argumentos cambian entre llamadas")
		}
	}
}
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: FAIL, con `undefined: Profiles` y `undefined: createArgs`.

- [ ] **Paso 3: Implementar los tipos**

`executor/internal/sandbox/types.go`:
```go
// Package sandbox compila y ejecuta programas del alumno en contenedores efímeros.
package sandbox

import "time"

const (
	// RunLabel marca todo recurso del ejecutor para que el barrido no toque nada ajeno.
	RunLabel = "taller.executor.run"
	// CreatedLabel guarda la hora de creación en segundos Unix.
	CreatedLabel = "taller.executor.created"
)

// Phase son los límites y el comando de un contenedor. Vienen del ADR 0005, nunca del pedido.
type Phase struct {
	Timeout   time.Duration
	MemoryMiB int
	Pids      int
	TmpfsMiB  int
	CPUs      string
	ReadOnly  bool
	Cmd       []string
}

type Profile struct {
	Image       string
	Compile     Phase
	Run         Phase
	OutputLimit int
}

type Spec struct {
	Name     string
	Image    string
	Phase    Phase
	Volume   string
	VolumeRO bool
	Labels   map[string]string
	Runtime  string
}

type State struct {
	ExitCode  int
	OOMKilled bool
}

type Resource struct {
	Kind    string // "container" o "volume"
	Name    string
	Created time.Time
}

// Result es la respuesta de POST /v1/run. Phase indica la última fase alcanzada.
type Result struct {
	Phase     string `json:"phase"`
	ExitCode  int    `json:"exitCode"`
	Stdout    string `json:"stdout"`
	Stderr    string `json:"stderr"`
	Truncated bool   `json:"truncated"`
	TimedOut  bool   `json:"timedOut"`
	OOMKilled bool   `json:"oomKilled"`
	CompileMs int64  `json:"compileMs"`
	RunMs     int64  `json:"runMs"`
}
```

- [ ] **Paso 4: Implementar perfiles y argumentos**

`executor/internal/sandbox/profile.go`:
```go
package sandbox

import "time"

const outputLimit = 64 << 10

// Profiles devuelve los límites del ADR 0005 por lenguaje. La compilación escribe el binario
// en /out; la ejecución lo corre con rootfs y /out de sólo lectura.
func Profiles(rustImage, goImage string) map[string]Profile {
	run := Phase{
		Timeout: 10 * time.Second, MemoryMiB: 256, Pids: 64, TmpfsMiB: 16, CPUs: "1",
		ReadOnly: true, Cmd: []string{"/out/main"},
	}
	return map[string]Profile{
		"rust": {
			Image: rustImage,
			Compile: Phase{
				Timeout: 20 * time.Second, MemoryMiB: 1024, Pids: 256, TmpfsMiB: 256, CPUs: "2",
				ReadOnly: true,
				Cmd: []string{"sh", "-c",
					"cat > /tmp/main.rs && rustc --edition 2024 /tmp/main.rs -o /out/main"},
			},
			Run:         run,
			OutputLimit: outputLimit,
		},
		"go": {
			Image: goImage,
			// Sin --read-only: go build escribe en el GOCACHE precalentado de la imagen, en la
			// capa del contenedor, que se descarta al borrarlo. go vet es informativo.
			Compile: Phase{
				Timeout: 15 * time.Second, MemoryMiB: 1024, Pids: 256, TmpfsMiB: 256, CPUs: "2",
				ReadOnly: false,
				Cmd: []string{"sh", "-c",
					"mkdir -p /tmp/src && cat > /tmp/src/main.go && cd /tmp/src && " +
						"{ go vet main.go; go build -o /out/main main.go; }"},
			},
			Run:         run,
			OutputLimit: outputLimit,
		},
	}
}
```

`executor/internal/sandbox/args.go`:
```go
package sandbox

import (
	"fmt"
	"slices"
	"strconv"
)

// createArgs arma `docker create` con el endurecimiento del ADR 0005. Es puro: las pruebas
// fijan cada flag de seguridad.
func createArgs(s Spec) []string {
	p := s.Phase
	memory := strconv.Itoa(p.MemoryMiB) + "m"
	args := []string{
		"create", "--name", s.Name, "--interactive",
		"--runtime", s.Runtime,
		"--network", "none",
		"--cap-drop", "ALL",
		"--security-opt", "no-new-privileges",
		"--user", "65534:65534",
		"--pids-limit", strconv.Itoa(p.Pids),
		"--memory", memory,
		"--memory-swap", memory,
		"--cpus", p.CPUs,
		"--ulimit", "nofile=256:256",
		"--tmpfs", fmt.Sprintf("/tmp:rw,nosuid,nodev,size=%dm", p.TmpfsMiB),
		"--mount", volumeMount(s.Volume, s.VolumeRO),
	}
	for _, key := range sortedKeys(s.Labels) {
		args = append(args, "--label", key+"="+s.Labels[key])
	}
	if p.ReadOnly {
		args = append(args, "--read-only")
	}
	args = append(args, s.Image)
	return append(args, p.Cmd...)
}

func volumeMount(name string, readOnly bool) string {
	mount := "type=volume,src=" + name + ",dst=/out"
	if readOnly {
		mount += ",readonly"
	}
	return mount
}

func sortedKeys(values map[string]string) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	return keys
}
```

- [ ] **Paso 5: Correr las pruebas y ver que pasan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: `ok  taller/executor/internal/sandbox`.

- [ ] **Paso 6: Commit**

```bash
git add executor/internal/sandbox/types.go executor/internal/sandbox/profile.go executor/internal/sandbox/args.go executor/internal/sandbox/args_test.go
git commit -m "feat(ejecutor): perfiles del ADR 0005 y contenedores endurecidos"
```

---

### Tarea 4: Orquestación de compilación y ejecución

**Archivos:**
- Crear: `executor/internal/sandbox/engine.go`, `runner.go` y `runner_test.go`.

**Interfaces:**
- Consume de la tarea 3: `Spec`, `State`, `Resource`, `Profile`, `Result`, `RunLabel`,
  `CreatedLabel` y `Profiles`. De la tarea 1: `output.Limited`.
- Produce, para las tareas 5, 6 y 8:
  - la interfaz `Engine`;
  - `Runner{Engine Engine; Profiles map[string]Profile; Runtime string; Now func() time.Time; NewID func() string}`;
  - `(*Runner).Execute(ctx, language string, program []byte) (Result, error)`;
  - `ErrUnknownLanguage`.

- [ ] **Paso 1: Escribir la interfaz Engine**

`executor/internal/sandbox/engine.go`:
```go
package sandbox

import (
	"context"
	"io"
)

// Engine es lo único que habla con Docker. La implementación real usa la CLI (docker.go);
// las pruebas usan un doble en memoria.
type Engine interface {
	CreateVolume(ctx context.Context, name string, labels map[string]string) error
	RemoveVolume(ctx context.Context, name string) error
	Create(ctx context.Context, spec Spec) error
	// Start conecta stdin/stdout/stderr y espera. Un código de salida distinto de 0 no es un
	// error: se lee con Inspect.
	Start(ctx context.Context, name string, stdin io.Reader, stdout, stderr io.Writer) error
	Kill(ctx context.Context, name string) error
	Inspect(ctx context.Context, name string) (State, error)
	Remove(ctx context.Context, name string) error
	ListLabeled(ctx context.Context, label string) ([]Resource, error)
}
```

- [ ] **Paso 2: Escribir las pruebas que fallan**

`executor/internal/sandbox/runner_test.go`:
```go
package sandbox

import (
	"context"
	"errors"
	"io"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakePhase struct {
	stdout, stderr string
	state          State
	block          bool // simula un programa que no termina: espera a que venza el contexto
}

type fakeEngine struct {
	mu        sync.Mutex
	calls     []string
	compile   fakePhase
	run       fakePhase
	createErr error
	onStart   func() // se llama al entrar a Start (para cancelar el pedido a mitad de camino)
}

func (f *fakeEngine) record(call string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, call)
}

func (f *fakeEngine) phaseFor(name string) fakePhase {
	if strings.HasPrefix(name, "taller-c-") {
		return f.compile
	}
	return f.run
}

func (f *fakeEngine) CreateVolume(_ context.Context, name string, _ map[string]string) error {
	f.record("volume-create " + name)
	return nil
}

func (f *fakeEngine) RemoveVolume(_ context.Context, name string) error {
	f.record("volume-rm " + name)
	return nil
}

func (f *fakeEngine) Create(_ context.Context, spec Spec) error {
	f.record("create " + spec.Name)
	return f.createErr
}

func (f *fakeEngine) Start(ctx context.Context, name string, _ io.Reader, stdout, stderr io.Writer) error {
	f.record("start " + name)
	if f.onStart != nil {
		f.onStart()
	}
	phase := f.phaseFor(name)
	io.WriteString(stdout, phase.stdout)
	io.WriteString(stderr, phase.stderr)
	if phase.block {
		<-ctx.Done()
		return ctx.Err()
	}
	return nil
}

func (f *fakeEngine) Kill(_ context.Context, name string) error {
	f.record("kill " + name)
	return nil
}

func (f *fakeEngine) Inspect(_ context.Context, name string) (State, error) {
	f.record("inspect " + name)
	return f.phaseFor(name).state, nil
}

func (f *fakeEngine) Remove(_ context.Context, name string) error {
	f.record("rm " + name)
	return nil
}

func (f *fakeEngine) ListLabeled(context.Context, string) ([]Resource, error) { return nil, nil }

func newTestRunner(engine Engine) *Runner {
	profiles := Profiles("rust-img", "go-img")
	for language, profile := range profiles {
		profile.Compile.Timeout = 200 * time.Millisecond
		profile.Run.Timeout = 200 * time.Millisecond
		profiles[language] = profile
	}
	return &Runner{
		Engine: engine, Profiles: profiles, Runtime: "runsc",
		Now: time.Now, NewID: func() string { return "id1" },
	}
}

func TestRunsCompileThenRunAndReportsBoth(t *testing.T) {
	engine := &fakeEngine{
		compile: fakePhase{stderr: "warning: variable sin usar\n"},
		run:     fakePhase{stdout: "hola\n"},
	}
	result, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("fn main(){}"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "run" || result.ExitCode != 0 || result.Stdout != "hola\n" {
		t.Fatalf("resultado inesperado: %+v", result)
	}
	if result.Stderr != "warning: variable sin usar\n" {
		t.Fatalf("las advertencias de compilación llegan al alumno: %q", result.Stderr)
	}
	want := []string{
		"volume-create taller-out-id1",
		"create taller-c-id1", "start taller-c-id1", "inspect taller-c-id1", "rm taller-c-id1",
		"create taller-r-id1", "start taller-r-id1", "inspect taller-r-id1", "rm taller-r-id1",
		"volume-rm taller-out-id1",
	}
	if !slices.Equal(engine.calls, want) {
		t.Fatalf("llamadas = %v\nquiero   %v", engine.calls, want)
	}
}

func TestCompileErrorStopsBeforeRunning(t *testing.T) {
	engine := &fakeEngine{compile: fakePhase{stderr: "error[E0308]: mismatched types\n", state: State{ExitCode: 1}}}
	result, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "compile" || result.ExitCode != 1 || !strings.Contains(result.Stderr, "E0308") {
		t.Fatalf("resultado inesperado: %+v", result)
	}
	if slices.Contains(engine.calls, "create taller-r-id1") {
		t.Fatal("no se ejecuta lo que no compiló")
	}
	if engine.calls[len(engine.calls)-1] != "volume-rm taller-out-id1" {
		t.Fatalf("el volumen se borra siempre: %v", engine.calls)
	}
}

func TestRunTimeoutKillsAndStillCleansUp(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{block: true, state: State{ExitCode: 137}}}
	result, err := newTestRunner(engine).Execute(context.Background(), "go", []byte("x"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "run" || !result.TimedOut {
		t.Fatalf("debe informar el tiempo agotado: %+v", result)
	}
	for _, call := range []string{"kill taller-r-id1", "rm taller-r-id1", "volume-rm taller-out-id1"} {
		if !slices.Contains(engine.calls, call) {
			t.Fatalf("falta %q en %v", call, engine.calls)
		}
	}
}

func TestCompileTimeoutIsReported(t *testing.T) {
	engine := &fakeEngine{compile: fakePhase{block: true}}
	result, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if err != nil {
		t.Fatal(err)
	}
	if result.Phase != "compile" || !result.TimedOut {
		t.Fatalf("resultado inesperado: %+v", result)
	}
}

func TestOOMIsReported(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{state: State{ExitCode: 137, OOMKilled: true}}}
	result, _ := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if !result.OOMKilled || result.ExitCode != 137 {
		t.Fatalf("resultado inesperado: %+v", result)
	}
}

func TestOutputIsCappedPerStream(t *testing.T) {
	engine := &fakeEngine{run: fakePhase{stdout: strings.Repeat("x", 100<<10)}}
	result, _ := newTestRunner(engine).Execute(context.Background(), "go", []byte("x"))
	if len(result.Stdout) != 64<<10 || !result.Truncated {
		t.Fatalf("stdout de %d bytes, truncated=%v", len(result.Stdout), result.Truncated)
	}
}

func TestEngineFailureIsAnErrorAndStillRemovesTheVolume(t *testing.T) {
	engine := &fakeEngine{createErr: errors.New("Cannot connect to the Docker daemon")}
	_, err := newTestRunner(engine).Execute(context.Background(), "rust", []byte("x"))
	if err == nil {
		t.Fatal("un fallo de Docker es un error, no un resultado del alumno")
	}
	if engine.calls[len(engine.calls)-1] != "volume-rm taller-out-id1" {
		t.Fatalf("el volumen se borra igual: %v", engine.calls)
	}
}

func TestUnknownLanguage(t *testing.T) {
	_, err := newTestRunner(&fakeEngine{}).Execute(context.Background(), "python", []byte("x"))
	if !errors.Is(err, ErrUnknownLanguage) {
		t.Fatalf("err = %v; quiero ErrUnknownLanguage", err)
	}
}

func TestClientCancellationKillsWithoutReportingATimeout(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	engine := &fakeEngine{run: fakePhase{block: true}}
	engine.onStart = func() {
		if engine.calls[len(engine.calls)-1] == "start taller-r-id1" {
			cancel()
		}
	}
	_, err := newTestRunner(engine).Execute(ctx, "rust", []byte("x"))
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("err = %v; quiero context.Canceled", err)
	}
	for _, call := range []string{"kill taller-r-id1", "rm taller-r-id1", "volume-rm taller-out-id1"} {
		if !slices.Contains(engine.calls, call) {
			t.Fatalf("falta %q en %v", call, engine.calls)
		}
	}
}
```

- [ ] **Paso 3: Correr las pruebas y ver que fallan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: FAIL, con `undefined: Runner` y `undefined: ErrUnknownLanguage`.

- [ ] **Paso 4: Implementar**

`executor/internal/sandbox/runner.go`:
```go
package sandbox

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strconv"
	"strings"
	"time"

	"taller/executor/internal/output"
)

var ErrUnknownLanguage = errors.New("lenguaje no soportado")

// cleanupTimeout acota Kill, Inspect y Remove, que usan un contexto propio: aunque el pedido
// se haya cancelado, el contenedor y el volumen se borran igual.
const cleanupTimeout = 10 * time.Second

type Runner struct {
	Engine   Engine
	Profiles map[string]Profile
	Runtime  string
	Now      func() time.Time
	NewID    func() string
}

type phaseOutcome struct {
	state    State
	elapsed  time.Duration
	timedOut bool
}

// Execute compila y, si compiló, ejecuta. Un error significa que el sandbox falló (Docker o
// pedido cancelado); los problemas del programa vuelven en Result.
func (r *Runner) Execute(ctx context.Context, language string, program []byte) (Result, error) {
	profile, ok := r.Profiles[language]
	if !ok {
		return Result{}, ErrUnknownLanguage
	}
	id := r.NewID()
	labels := map[string]string{RunLabel: "1", CreatedLabel: strconv.FormatInt(r.Now().Unix(), 10)}
	volume := "taller-out-" + id
	if err := r.Engine.CreateVolume(ctx, volume, labels); err != nil {
		return Result{}, err
	}
	defer r.cleanup(func(c context.Context) error { return r.Engine.RemoveVolume(c, volume) })

	compileOut, compileErr := newStreams(profile.OutputLimit)
	compiled, err := r.phase(ctx, r.spec("taller-c-"+id, profile.Image, profile.Compile, volume, false, labels),
		program, compileOut, compileErr)
	if err != nil {
		return Result{}, err
	}
	result := Result{
		Phase: "compile", ExitCode: compiled.state.ExitCode, OOMKilled: compiled.state.OOMKilled,
		TimedOut: compiled.timedOut, Stdout: compileOut.String(), Stderr: compileErr.String(),
		Truncated: compileOut.Truncated() || compileErr.Truncated(),
		CompileMs: compiled.elapsed.Milliseconds(),
	}
	if compiled.timedOut || compiled.state.OOMKilled || compiled.state.ExitCode != 0 {
		return result, nil
	}

	runOut, runErr := newStreams(profile.OutputLimit)
	ran, err := r.phase(ctx, r.spec("taller-r-"+id, profile.Image, profile.Run, volume, true, labels),
		nil, runOut, runErr)
	if err != nil {
		return Result{}, err
	}
	result.Phase = "run"
	result.ExitCode = ran.state.ExitCode
	result.OOMKilled = ran.state.OOMKilled
	result.TimedOut = ran.timedOut
	result.Stdout = runOut.String()
	result.Stderr = joinOutput(compileErr.String(), runErr.String())
	result.Truncated = result.Truncated || runOut.Truncated() || runErr.Truncated()
	result.RunMs = ran.elapsed.Milliseconds()
	return result, nil
}

func (r *Runner) phase(ctx context.Context, spec Spec, stdin []byte, stdout, stderr io.Writer) (phaseOutcome, error) {
	if err := r.Engine.Create(ctx, spec); err != nil {
		return phaseOutcome{}, err
	}
	defer r.cleanup(func(c context.Context) error { return r.Engine.Remove(c, spec.Name) })

	phaseCtx, cancel := context.WithTimeout(ctx, spec.Phase.Timeout)
	defer cancel()
	started := r.Now()
	startErr := r.Engine.Start(phaseCtx, spec.Name, bytes.NewReader(stdin), stdout, stderr)
	elapsed := r.Now().Sub(started)

	if phaseCtx.Err() != nil {
		// Vencido o cancelado: el cliente de Docker murió, pero el contenedor puede seguir vivo.
		r.cleanup(func(c context.Context) error { return r.Engine.Kill(c, spec.Name) })
		if ctx.Err() != nil {
			return phaseOutcome{}, ctx.Err()
		}
		state, err := r.inspect(spec.Name)
		if err != nil {
			return phaseOutcome{}, err
		}
		return phaseOutcome{state: state, elapsed: elapsed, timedOut: true}, nil
	}
	if startErr != nil {
		return phaseOutcome{}, startErr
	}
	state, err := r.inspect(spec.Name)
	if err != nil {
		return phaseOutcome{}, err
	}
	return phaseOutcome{state: state, elapsed: elapsed}, nil
}

func (r *Runner) spec(name, image string, phase Phase, volume string, readOnlyVolume bool, labels map[string]string) Spec {
	return Spec{
		Name: name, Image: image, Phase: phase, Volume: volume, VolumeRO: readOnlyVolume,
		Labels: labels, Runtime: r.Runtime,
	}
}

func (r *Runner) inspect(name string) (State, error) {
	c, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
	defer cancel()
	return r.Engine.Inspect(c, name)
}

// cleanup ignora el error: lo que quede lo borra el barrido (sweeper.go).
func (r *Runner) cleanup(step func(context.Context) error) {
	c, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
	defer cancel()
	_ = step(c)
}

func newStreams(limit int) (*output.Limited, *output.Limited) {
	return &output.Limited{Max: limit}, &output.Limited{Max: limit}
}

// joinOutput une las advertencias de compilación con el stderr de la ejecución.
func joinOutput(compile, run string) string {
	if compile == "" {
		return run
	}
	if run == "" {
		return compile
	}
	if !strings.HasSuffix(compile, "\n") {
		compile += "\n"
	}
	return compile + run
}
```

- [ ] **Paso 5: Correr las pruebas y ver que pasan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: `ok  taller/executor/internal/sandbox`, con las 9 pruebas nuevas en verde.

- [ ] **Paso 6: Commit**

```bash
git add executor/internal/sandbox/engine.go executor/internal/sandbox/runner.go executor/internal/sandbox/runner_test.go
git commit -m "feat(ejecutor): compilación y ejecución en dos fases con limpieza garantizada"
```

---

### Tarea 5: Engine sobre la CLI de Docker y barrido de restos

**Archivos:**
- Crear: `executor/internal/sandbox/docker.go`, `docker_test.go`, `sweeper.go`,
  `sweeper_test.go`, `id.go` e `id_test.go`.

**Interfaces:**
- Consume: `Engine`, `Spec`, `State`, `Resource`, `createArgs`, `sortedKeys`, `RunLabel` y
  `CreatedLabel`.
- Produce, para las tareas 7 y 8:
  - `type Commander func(ctx context.Context, name string, args []string, stdin io.Reader, stdout, stderr io.Writer) error`;
  - `ExecCommand Commander`;
  - `DockerCLI{Exec Commander}`, que implementa `Engine`;
  - `Sweeper{Engine Engine; Now func() time.Time; MaxAge time.Duration}` con
    `Sweep(ctx) error`;
  - `RandomID() string`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`executor/internal/sandbox/docker_test.go`:
```go
package sandbox

import (
	"context"
	"errors"
	"io"
	"os/exec"
	"slices"
	"strings"
	"testing"
	"time"
)

type commandCall struct {
	args []string
}

// scripted devuelve un Commander que registra cada llamada y responde según el subcomando.
func scripted(calls *[]commandCall, stdout map[string]string, fail map[string]error) Commander {
	return func(_ context.Context, name string, args []string, _ io.Reader, out, _ io.Writer) error {
		if name != "docker" {
			return errors.New("sólo se invoca docker")
		}
		*calls = append(*calls, commandCall{args: args})
		key := strings.Join(args[:min(2, len(args))], " ")
		if text, ok := stdout[key]; ok {
			io.WriteString(out, text)
		}
		return fail[key]
	}
}

func TestCreateUsesTheHardenedArgs(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, nil, nil)}
	spec := specFor("rust", false)
	if err := cli.Create(context.Background(), spec); err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(calls[0].args, createArgs(spec)) {
		t.Fatalf("args = %v", calls[0].args)
	}
}

func TestCreateErrorIncludesDockerMessage(t *testing.T) {
	var calls []commandCall
	fail := map[string]error{"create --name": errors.New("exit status 125")}
	cli := DockerCLI{Exec: scripted(&calls, nil, fail)}
	err := cli.Create(context.Background(), specFor("rust", false))
	if err == nil || !strings.Contains(err.Error(), "docker create") {
		t.Fatalf("err = %v", err)
	}
}

func TestStartTreatsANonZeroProgramExitAsSuccess(t *testing.T) {
	exitErr := exec.Command("sh", "-c", "exit 3").Run()
	cli := DockerCLI{Exec: func(context.Context, string, []string, io.Reader, io.Writer, io.Writer) error {
		return exitErr
	}}
	if err := cli.Start(context.Background(), "taller-r-1", nil, io.Discard, io.Discard); err != nil {
		t.Fatalf("el código del programa se lee con Inspect, no es un error: %v", err)
	}
}

func TestStartReportsCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	exitErr := exec.Command("sh", "-c", "exit 1").Run()
	cli := DockerCLI{Exec: func(context.Context, string, []string, io.Reader, io.Writer, io.Writer) error {
		return exitErr
	}}
	if err := cli.Start(ctx, "taller-r-1", nil, io.Discard, io.Discard); err == nil {
		t.Fatal("con el contexto cancelado debe devolver el error")
	}
}

func TestInspectParsesExitCodeAndOOM(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, map[string]string{"inspect --format": "137 true\n"}, nil)}
	state, err := cli.Inspect(context.Background(), "taller-r-1")
	if err != nil || state != (State{ExitCode: 137, OOMKilled: true}) {
		t.Fatalf("state = %+v, err = %v", state, err)
	}
}

func TestInspectRejectsUnexpectedOutput(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, map[string]string{"inspect --format": "basura"}, nil)}
	if _, err := cli.Inspect(context.Background(), "x"); err == nil {
		t.Fatal("una salida inesperada debe ser un error")
	}
}

func TestListLabeledReadsContainersAndVolumes(t *testing.T) {
	var calls []commandCall
	out := map[string]string{
		"ps --all":  "taller-c-1\t100\ntaller-r-1\t\n",
		"volume ls": "taller-out-1\t100\n",
	}
	cli := DockerCLI{Exec: scripted(&calls, out, nil)}
	resources, err := cli.ListLabeled(context.Background(), RunLabel+"=1")
	if err != nil {
		t.Fatal(err)
	}
	want := []Resource{
		{Kind: "container", Name: "taller-c-1", Created: time.Unix(100, 0)},
		{Kind: "container", Name: "taller-r-1"},
		{Kind: "volume", Name: "taller-out-1", Created: time.Unix(100, 0)},
	}
	if !slices.Equal(resources, want) {
		t.Fatalf("resources = %+v", resources)
	}
	if !slices.Contains(calls[0].args, "label="+RunLabel+"=1") {
		t.Fatalf("debe filtrar por la etiqueta del ejecutor: %v", calls[0].args)
	}
}

func TestCreateVolumeSortsLabels(t *testing.T) {
	var calls []commandCall
	cli := DockerCLI{Exec: scripted(&calls, nil, nil)}
	cli.CreateVolume(context.Background(), "taller-out-1", map[string]string{"b": "2", "a": "1"})
	want := []string{"volume", "create", "--label", "a=1", "--label", "b=2", "taller-out-1"}
	if !slices.Equal(calls[0].args, want) {
		t.Fatalf("args = %v", calls[0].args)
	}
}
```

`executor/internal/sandbox/sweeper_test.go`:
```go
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
```

`executor/internal/sandbox/id_test.go`:
```go
package sandbox

import (
	"regexp"
	"testing"
)

func TestRandomIDIsHexAndDistinct(t *testing.T) {
	first, second := RandomID(), RandomID()
	if !regexp.MustCompile(`^[0-9a-f]{16}$`).MatchString(first) {
		t.Fatalf("RandomID = %q", first)
	}
	if first == second {
		t.Fatal("dos IDs seguidos no pueden coincidir")
	}
}
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: FAIL, con `undefined: DockerCLI`, `undefined: Sweeper` y `undefined: RandomID`.

- [ ] **Paso 3: Implementar**

`executor/internal/sandbox/docker.go`:
```go
package sandbox

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type Commander func(ctx context.Context, name string, args []string, stdin io.Reader, stdout, stderr io.Writer) error

// ExecCommand corre un binario del sistema. Si el contexto vence, WaitDelay evita esperar sin
// fin a que se cierren los pipes que mantiene abiertos el cliente de Docker.
func ExecCommand(ctx context.Context, name string, args []string, stdin io.Reader, stdout, stderr io.Writer) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = stdin, stdout, stderr
	cmd.WaitDelay = 2 * time.Second
	return cmd.Run()
}

// DockerCLI implementa Engine con la CLI de Docker. No acepta otros flags que los de createArgs.
type DockerCLI struct{ Exec Commander }

func (d DockerCLI) run(ctx context.Context, args []string, stdout io.Writer) error {
	if stdout == nil {
		stdout = io.Discard
	}
	var stderr bytes.Buffer
	if err := d.Exec(ctx, "docker", args, nil, stdout, &stderr); err != nil {
		return fmt.Errorf("docker %s: %w: %s", args[0], err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (d DockerCLI) Create(ctx context.Context, spec Spec) error {
	return d.run(ctx, createArgs(spec), nil)
}

func (d DockerCLI) Start(ctx context.Context, name string, stdin io.Reader, stdout, stderr io.Writer) error {
	err := d.Exec(ctx, "docker", []string{"start", "--attach", "--interactive", name}, stdin, stdout, stderr)
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) && ctx.Err() == nil {
		return nil // el programa terminó con un código distinto de 0; Inspect lo informa
	}
	return err
}

func (d DockerCLI) Kill(ctx context.Context, name string) error {
	return d.run(ctx, []string{"kill", name}, nil)
}

func (d DockerCLI) Remove(ctx context.Context, name string) error {
	return d.run(ctx, []string{"rm", "--force", name}, nil)
}

func (d DockerCLI) Inspect(ctx context.Context, name string) (State, error) {
	var out bytes.Buffer
	if err := d.run(ctx, []string{"inspect", "--format", "{{.State.ExitCode}} {{.State.OOMKilled}}", name}, &out); err != nil {
		return State{}, err
	}
	return parseState(out.String())
}

func parseState(raw string) (State, error) {
	fields := strings.Fields(raw)
	if len(fields) != 2 {
		return State{}, fmt.Errorf("salida inesperada de docker inspect: %q", raw)
	}
	code, err := strconv.Atoi(fields[0])
	if err != nil {
		return State{}, fmt.Errorf("código de salida inválido: %q", fields[0])
	}
	oom, err := strconv.ParseBool(fields[1])
	if err != nil {
		return State{}, fmt.Errorf("OOMKilled inválido: %q", fields[1])
	}
	return State{ExitCode: code, OOMKilled: oom}, nil
}

func (d DockerCLI) CreateVolume(ctx context.Context, name string, labels map[string]string) error {
	args := []string{"volume", "create"}
	for _, key := range sortedKeys(labels) {
		args = append(args, "--label", key+"="+labels[key])
	}
	return d.run(ctx, append(args, name), nil)
}

func (d DockerCLI) RemoveVolume(ctx context.Context, name string) error {
	return d.run(ctx, []string{"volume", "rm", "--force", name}, nil)
}

func (d DockerCLI) ListLabeled(ctx context.Context, label string) ([]Resource, error) {
	created := `{{.Label "` + CreatedLabel + `"}}`
	var containers, volumes bytes.Buffer
	if err := d.run(ctx, []string{"ps", "--all", "--filter", "label=" + label, "--format", "{{.Names}}\t" + created}, &containers); err != nil {
		return nil, err
	}
	if err := d.run(ctx, []string{"volume", "ls", "--filter", "label=" + label, "--format", "{{.Name}}\t" + created}, &volumes); err != nil {
		return nil, err
	}
	return append(parseResources("container", containers.String()), parseResources("volume", volumes.String())...), nil
}

// parseResources lee "nombre<TAB>segundos Unix". Sin hora válida, Created queda en cero y el
// barrido lo trata como viejo.
func parseResources(kind, raw string) []Resource {
	var resources []Resource
	for _, line := range strings.Split(strings.TrimSpace(raw), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		name, created, _ := strings.Cut(line, "\t")
		resource := Resource{Kind: kind, Name: strings.TrimSpace(name)}
		if unix, err := strconv.ParseInt(strings.TrimSpace(created), 10, 64); err == nil {
			resource.Created = time.Unix(unix, 0)
		}
		resources = append(resources, resource)
	}
	return resources
}
```

`executor/internal/sandbox/sweeper.go`:
```go
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
```

`executor/internal/sandbox/id.go`:
```go
package sandbox

import (
	"crypto/rand"
	"encoding/hex"
)

// RandomID nombra los recursos de un envío. 8 bytes aleatorios bastan para no chocar.
func RandomID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: `ok  taller/executor/internal/sandbox`.

- [ ] **Paso 5: Commit**

```bash
git add executor/internal/sandbox/docker.go executor/internal/sandbox/docker_test.go executor/internal/sandbox/sweeper.go executor/internal/sandbox/sweeper_test.go executor/internal/sandbox/id.go executor/internal/sandbox/id_test.go
git commit -m "feat(ejecutor): engine sobre la CLI de Docker y barrido de restos"
```

---

### Tarea 6: API HTTP con token, validación y semáforo

**Archivos:**
- Crear: `executor/internal/api/server.go` y `executor/internal/api/server_test.go`.

**Interfaces:**
- Consume `sandbox.Result`.
- Produce:
  - `api.Executor` (interfaz con `Execute(ctx, language string, program []byte) (sandbox.Result, error)`);
  - `api.Server{Token string; Exec Executor; Slots chan struct{}; MaxBody int64; MaxProgram int; QueueWait time.Duration; Languages map[string]bool}`;
  - `(*Server).Handler() http.Handler`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`executor/internal/api/server_test.go`:
```go
package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"taller/executor/internal/sandbox"
)

const token = "0123456789abcdef0123456789abcdef"

type fakeExecutor struct {
	result sandbox.Result
	err    error
	calls  int
}

func (f *fakeExecutor) Execute(context.Context, string, []byte) (sandbox.Result, error) {
	f.calls++
	return f.result, f.err
}

func newServer(exec Executor) *Server {
	return &Server{
		Token: token, Exec: exec, Slots: make(chan struct{}, 1),
		MaxBody: 1024, MaxProgram: 100, QueueWait: 20 * time.Millisecond,
		Languages: map[string]bool{"rust": true, "go": true},
	}
}

func post(t *testing.T, s *Server, body, auth string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/v1/run", strings.NewReader(body))
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	return rec
}

func TestHealthzNeedsNoToken(t *testing.T) {
	rec := httptest.NewRecorder()
	newServer(&fakeExecutor{}).Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("healthz = %d %q", rec.Code, rec.Body.String())
	}
}

func TestRunRequiresTheToken(t *testing.T) {
	for _, auth := range []string{"", "Bearer otro-token", token} {
		rec := post(t, newServer(&fakeExecutor{}), `{"language":"rust","program":"fn main(){}"}`, auth)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Authorization %q: código %d; quiero 401", auth, rec.Code)
		}
	}
}

func TestRunValidatesTheRequest(t *testing.T) {
	cases := map[string]struct {
		body string
		code int
	}{
		"campo desconocido": {`{"language":"rust","program":"x","limits":{"memory":"9g"}}`, http.StatusBadRequest},
		"lenguaje":          {`{"language":"python","program":"x"}`, http.StatusBadRequest},
		"programa vacío":    {`{"language":"go","program":"   "}`, http.StatusBadRequest},
		"programa grande":   {`{"language":"go","program":"` + strings.Repeat("x", 101) + `"}`, http.StatusRequestEntityTooLarge},
		"cuerpo grande":     {`{"language":"go","program":"` + strings.Repeat("x", 2000) + `"}`, http.StatusRequestEntityTooLarge},
		"JSON roto":         {`{"language":`, http.StatusBadRequest},
	}
	for name, tc := range cases {
		exec := &fakeExecutor{}
		rec := post(t, newServer(exec), tc.body, "Bearer "+token)
		if rec.Code != tc.code || exec.calls != 0 {
			t.Fatalf("%s: código %d (quiero %d), llamadas %d", name, rec.Code, tc.code, exec.calls)
		}
	}
}

func TestRunAnswersBusyWhenNoSlotFrees(t *testing.T) {
	exec := &fakeExecutor{}
	s := newServer(exec)
	s.Slots <- struct{}{} // el único lugar está ocupado
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusServiceUnavailable || exec.calls != 0 {
		t.Fatalf("código %d, llamadas %d", rec.Code, exec.calls)
	}
}

func TestRunMapsSandboxFailuresTo503(t *testing.T) {
	rec := post(t, newServer(&fakeExecutor{err: errors.New("docker caído")}),
		`{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("código %d; quiero 503", rec.Code)
	}
}

func TestRunReturnsTheResultAsJSON(t *testing.T) {
	want := sandbox.Result{Phase: "run", Stdout: "hola\n", CompileMs: 900, RunMs: 12}
	s := newServer(&fakeExecutor{result: want})
	rec := post(t, s, `{"language":"rust","program":"fn main(){}"}`, "Bearer "+token)
	if rec.Code != http.StatusOK {
		t.Fatalf("código %d: %s", rec.Code, rec.Body.String())
	}
	var got sandbox.Result
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || got != want {
		t.Fatalf("got %+v, err %v", got, err)
	}
	if !strings.Contains(rec.Body.String(), `"exitCode"`) || !strings.Contains(rec.Body.String(), `"timedOut"`) {
		t.Fatalf("el contrato usa camelCase: %s", rec.Body.String())
	}
	if len(s.Slots) != 0 {
		t.Fatal("el lugar del semáforo se libera al terminar")
	}
}
```

- [ ] **Paso 2: Correr las pruebas y ver que fallan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: FAIL, con `undefined: Server`.

- [ ] **Paso 3: Implementar**

`executor/internal/api/server.go`:
```go
// Package api expone el ejecutor en la red interna. Nunca acepta imágenes ni límites.
package api

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"taller/executor/internal/sandbox"
)

type Executor interface {
	Execute(ctx context.Context, language string, program []byte) (sandbox.Result, error)
}

type Server struct {
	Token      string
	Exec       Executor
	Slots      chan struct{} // semáforo: su capacidad es la concurrencia máxima
	MaxBody    int64
	MaxProgram int
	QueueWait  time.Duration
	Languages  map[string]bool
}

type runRequest struct {
	Language string `json:"language"`
	Program  string `json:"program"`
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("POST /v1/run", s.requireToken(s.run))
	return mux
}

func (s *Server) requireToken(next http.HandlerFunc) http.HandlerFunc {
	expected := []byte("Bearer " + s.Token)
	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), expected) != 1 {
			writeError(w, http.StatusUnauthorized, "token inválido")
			return
		}
		next(w, r)
	}
}

func (s *Server) run(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, s.MaxBody)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req runRequest
	if err := decoder.Decode(&req); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "programa demasiado grande")
			return
		}
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	switch {
	case !s.Languages[req.Language]:
		writeError(w, http.StatusBadRequest, "lenguaje no soportado")
		return
	case strings.TrimSpace(req.Program) == "":
		writeError(w, http.StatusBadRequest, "programa vacío")
		return
	case len(req.Program) > s.MaxProgram:
		writeError(w, http.StatusRequestEntityTooLarge, "programa demasiado grande")
		return
	}

	wait, cancel := context.WithTimeout(r.Context(), s.QueueWait)
	defer cancel()
	select {
	case s.Slots <- struct{}{}:
		defer func() { <-s.Slots }()
	case <-wait.Done():
		writeError(w, http.StatusServiceUnavailable, "ejecutor ocupado")
		return
	}

	result, err := s.Exec.Execute(r.Context(), req.Language, []byte(req.Program))
	if err != nil {
		log.Printf("ejecución fallida: %v", err)
		writeError(w, http.StatusServiceUnavailable, "no se pudo ejecutar en el sandbox")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
```

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Ejecutar: `sh executor/scripts/test.sh`
Esperado: `ok  taller/executor/internal/api`.

- [ ] **Paso 5: Commit**

```bash
git add executor/internal/api
git commit -m "feat(ejecutor): API interna con token, validación y semáforo de concurrencia"
```

---

### Tarea 7: Programa principal e imagen del ejecutor

**Archivos:**
- Crear: `executor/cmd/executor/main.go` y `executor/Dockerfile`.

**Interfaces:**
- Consume `config.FromEnv`, `sandbox.DockerCLI`, `sandbox.ExecCommand`, `sandbox.Runner`,
  `sandbox.Profiles`, `sandbox.RandomID`, `sandbox.Sweeper` y `api.Server`.
- Produce la imagen `taller-executor` (escucha en `:8080`) y la etapa `test`, que usa la
  tarea 8.

- [ ] **Paso 1: Escribir el programa principal**

`executor/cmd/executor/main.go`:
```go
// Comando executor: servicio interno que compila y ejecuta programas del taller en
// contenedores gVisor. Ver docs/adr/0005-ejecucion-en-sandbox-propio.md.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"taller/executor/internal/api"
	"taller/executor/internal/config"
	"taller/executor/internal/sandbox"
)

func main() {
	cfg, err := config.FromEnv(os.Getenv)
	if err != nil {
		log.Fatal(err)
	}
	engine := sandbox.DockerCLI{Exec: sandbox.ExecCommand}
	runner := &sandbox.Runner{
		Engine: engine, Profiles: sandbox.Profiles(cfg.RustImage, cfg.GoImage),
		Runtime: cfg.Runtime, Now: time.Now, NewID: sandbox.RandomID,
	}
	go sweepForever(sandbox.Sweeper{Engine: engine, Now: time.Now, MaxAge: 2 * time.Minute})

	server := &api.Server{
		Token: cfg.Token, Exec: runner, Slots: make(chan struct{}, cfg.MaxConcurrent),
		MaxBody: 192 << 10, MaxProgram: 128 << 10, QueueWait: 30 * time.Second,
		Languages: map[string]bool{"rust": true, "go": true},
	}
	httpServer := &http.Server{
		Addr: cfg.Addr, Handler: server.Handler(),
		ReadHeaderTimeout: 5 * time.Second, WriteTimeout: 90 * time.Second,
	}
	log.Printf("ejecutor en %s con runtime %s", cfg.Addr, cfg.Runtime)
	log.Fatal(httpServer.ListenAndServe())
}

// sweepForever barre al arrancar (restos de una caída anterior) y después cada minuto.
func sweepForever(sweeper sandbox.Sweeper) {
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		if err := sweeper.Sweep(ctx); err != nil {
			log.Printf("barrido: %v", err)
		}
		cancel()
		time.Sleep(time.Minute)
	}
}
```

`executor/Dockerfile`:
```dockerfile
# Imagen del ejecutor. La etapa `test` agrega docker-cli para las pruebas de integración.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/executor ./cmd/executor

FROM golang:1.27-alpine AS test
RUN apk add --no-cache docker-cli
WORKDIR /src

FROM alpine:3.24 AS runtime
RUN apk add --no-cache docker-cli && adduser -D -u 10001 executor
COPY --from=build /out/executor /usr/local/bin/executor
# El acceso al socket de Docker se concede en Compose con group_add (GID del grupo docker).
USER 10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/executor"]
```

- [ ] **Paso 2: Verificar que compila y que se niega a arrancar sin configuración**

Ejecutar:
```bash
sh executor/scripts/test.sh && docker build --target runtime -t taller-executor:dev executor && docker run --rm taller-executor:dev; echo "exit=$?"
```
Esperado:
- las pruebas pasan;
- la imagen se construye;
- el contenedor termina con `EXECUTOR_TOKEN debe tener al menos 32 caracteres` y `exit=1`.

- [ ] **Paso 3: Commit**

```bash
git add executor/cmd executor/Dockerfile
git commit -m "feat(ejecutor): programa principal con barrido periódico e imagen sin privilegios"
```

---

### Tarea 8: Imágenes de sandbox, integración y prueba de humo de gVisor

**Archivos:**
- Crear:
  - `executor/images/rust/Dockerfile`, `executor/images/go/Dockerfile` y
    `executor/images/go/warm/main.go`;
  - `executor/internal/sandbox/integration_test.go`;
  - `executor/scripts/integration.sh` y `executor/scripts/smoke-gvisor.sh`.

**Interfaces:**
- Consume `Runner`, `Profiles`, `DockerCLI`, `ExecCommand`, `RandomID` y `RunLabel`.
- Produce las imágenes locales `taller-sandbox-rust:dev` y `taller-sandbox-go:dev`.

- [ ] **Paso 1: Pedir permiso de descarga**

El agente principal le pide permiso al usuario para bajar `rust:1.99-slim` (unos 330 MB
comprimidos), `golang:1.27-alpine` (unos 75 MB) y `alpine:3.24` (unos 4 MB), todas de
Docker Hub. Sin permiso, la tarea se detiene acá.

- [ ] **Paso 2: Crear las imágenes de sandbox**

`executor/images/rust/Dockerfile`:
```dockerfile
# Sandbox Rust: rustc estable para --edition 2024. /out pertenece a 65534 para que el volumen
# nuevo lo herede al montarse por primera vez.
FROM rust:1.99-slim
RUN mkdir -p /out && chown 65534:65534 /out
WORKDIR /tmp
```

`executor/images/go/warm/main.go`:
```go
// Programa de precalentamiento: importa la stdlib que usan los ejercicios del taller (campo
// `imports` de los catálogos Go) para dejarla compilada en GOCACHE dentro de la imagen.
package main

import (
	_ "bufio"
	_ "bytes"
	_ "container/heap"
	_ "container/list"
	_ "context"
	_ "crypto/sha256"
	_ "encoding/binary"
	_ "encoding/json"
	_ "errors"
	"fmt"
	_ "go/ast"
	_ "go/format"
	_ "go/parser"
	_ "go/token"
	_ "hash/crc32"
	_ "io"
	_ "math"
	_ "net/http"
	_ "net/http/httptest"
	_ "reflect"
	_ "sort"
	_ "strconv"
	_ "strings"
	_ "sync"
	_ "sync/atomic"
	_ "testing"
	_ "unicode"
)

func main() { fmt.Println("listo") }
```

`executor/images/go/Dockerfile`:
```dockerfile
# Sandbox Go: GOCACHE precalentado y escribible por 65534. Cada compilación escribe en la
# capa de su contenedor, que se descarta al borrarlo.
FROM golang:1.27-alpine
ENV CGO_ENABLED=0 GOTOOLCHAIN=local GOPROXY=off GOCACHE=/opt/gocache
COPY warm /opt/warm
RUN cd /opt/warm && go vet main.go && go build -o /dev/null main.go \
    && mkdir -p /out && chown -R 65534:65534 /opt/gocache /out
WORKDIR /tmp
```

- [ ] **Paso 2b: Fijar las imágenes base por digest** (ADR 0005: «Imágenes propias, fijadas por digest»)

Ejecutar, una vez bajadas las imágenes:
```bash
for image in rust:1.99-slim golang:1.27-alpine alpine:3.24; do docker pull -q "$image" >/dev/null && docker image inspect --format '{{index .RepoDigests 0}}' "$image"; done
```
Reemplazar cada `FROM` por la referencia con digest que imprime el comando, por ejemplo
`FROM rust:1.99-slim@sha256:<digest impreso>`. Aplica a `executor/images/rust/Dockerfile`,
`executor/images/go/Dockerfile` y las tres etapas de `executor/Dockerfile`. Conservá el tag
delante del digest para que se lea la versión.

- [ ] **Paso 3: Escribir las pruebas de integración (fallan hasta que existan las imágenes)**

`executor/internal/sandbox/integration_test.go`:
```go
//go:build integration

package sandbox

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"
)

// Corre con scripts/integration.sh: necesita el socket de Docker y las imágenes de sandbox.
func integrationRunner(t *testing.T) *Runner {
	t.Helper()
	rust, goImage := os.Getenv("EXECUTOR_RUST_IMAGE"), os.Getenv("EXECUTOR_GO_IMAGE")
	if rust == "" || goImage == "" {
		t.Fatal("definí EXECUTOR_RUST_IMAGE y EXECUTOR_GO_IMAGE")
	}
	runtime := os.Getenv("EXECUTOR_RUNTIME")
	if runtime == "" {
		runtime = "runc"
	}
	profiles := Profiles(rust, goImage)
	for language, profile := range profiles {
		profile.Run.Timeout = 3 * time.Second // acelera los casos de tiempo agotado
		profiles[language] = profile
	}
	return &Runner{Engine: DockerCLI{Exec: ExecCommand}, Profiles: profiles, Runtime: runtime, Now: time.Now, NewID: RandomID}
}

func execute(t *testing.T, language, program string) Result {
	t.Helper()
	result, err := integrationRunner(t).Execute(context.Background(), language, []byte(program))
	if err != nil {
		t.Fatal(err)
	}
	return result
}

func TestIntegrationRustHello(t *testing.T) {
	r := execute(t, "rust", `fn main() { println!("hola"); }`)
	if r.Phase != "run" || r.ExitCode != 0 || r.Stdout != "hola\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationGoHello(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport \"fmt\"\n\nfunc main() { fmt.Println(\"hola\") }\n")
	if r.Phase != "run" || r.ExitCode != 0 || r.Stdout != "hola\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationRustCompileError(t *testing.T) {
	r := execute(t, "rust", `fn main() { let x: i32 = "texto"; }`)
	if r.Phase != "compile" || r.ExitCode == 0 || !strings.Contains(r.Stderr, "mismatched types") {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationRustDebugKeepsOverflowChecks(t *testing.T) {
	r := execute(t, "rust", `fn main() { let x: u8 = 255; let y = x + std::hint::black_box(1); println!("{y}"); }`)
	if r.Phase != "run" || r.ExitCode != 101 || !strings.Contains(r.Stderr, "overflow") {
		t.Fatalf("en modo debug el overflow entra en panic, como en el Playground: %+v", r)
	}
}

func TestIntegrationInfiniteLoopTimesOut(t *testing.T) {
	r := execute(t, "rust", `fn main() { loop { std::hint::spin_loop(); } }`)
	if r.Phase != "run" || !r.TimedOut {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationMemoryHogIsKilled(t *testing.T) {
	r := execute(t, "rust", `fn main() { let mut v = Vec::new(); loop { v.push(vec![1u8; 1 << 20]); } }`)
	if !r.OOMKilled && r.ExitCode != 137 {
		t.Fatalf("debe morir por memoria: %+v", r)
	}
}

func TestIntegrationOutputFloodIsTruncated(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport (\"fmt\"; \"strings\")\n\nfunc main() { for { fmt.Println(strings.Repeat(\"x\", 1000)) } }\n")
	if !r.Truncated || len(r.Stdout) > 64<<10 {
		t.Fatalf("truncated=%v, stdout=%d bytes", r.Truncated, len(r.Stdout))
	}
}

func TestIntegrationHasNoNetwork(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport (\"fmt\"; \"net\"; \"time\")\n\nfunc main() {\n\t_, err := net.DialTimeout(\"tcp\", \"1.1.1.1:53\", 2*time.Second)\n\tif err != nil { fmt.Println(\"sin red\"); return }\n\tfmt.Println(\"con red\")\n}\n")
	if r.Stdout != "sin red\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationLoopbackStillWorksForHttptest(t *testing.T) {
	r := execute(t, "go", "package main\n\nimport (\"fmt\"; \"io\"; \"net/http\"; \"net/http/httptest\")\n\nfunc main() {\n\ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { io.WriteString(w, \"pong\") }))\n\tdefer s.Close()\n\tres, err := http.Get(s.URL)\n\tif err != nil { fmt.Println(err); return }\n\tb, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(b))\n}\n")
	if r.Stdout != "pong\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationLegitConcurrencyFitsThePidsLimit(t *testing.T) {
	r := execute(t, "rust", `fn main() { let hs: Vec<_> = (0..8).map(|i| std::thread::spawn(move || i * 2)).collect(); let total: i32 = hs.into_iter().map(|h| h.join().unwrap()).sum(); println!("{total}"); }`)
	if r.Stdout != "56\n" {
		t.Fatalf("%+v", r)
	}
}

func TestIntegrationThreadBombHitsThePidsLimit(t *testing.T) {
	r := execute(t, "rust", `fn main() { let mut hs = Vec::new(); for _ in 0..10000 { match std::thread::Builder::new().spawn(|| std::thread::sleep(std::time::Duration::from_secs(5))) { Ok(h) => hs.push(h), Err(_) => { println!("límite"); return; } } } }`)
	if r.Stdout != "límite\n" {
		t.Fatalf("el límite de procesos corta la bomba de hilos: %+v", r)
	}
}

func TestIntegrationLeavesNothingBehind(t *testing.T) {
	execute(t, "rust", `fn main() {}`)
	resources, err := DockerCLI{Exec: ExecCommand}.ListLabeled(context.Background(), RunLabel+"=1")
	if err != nil {
		t.Fatal(err)
	}
	if len(resources) != 0 {
		t.Fatalf("quedaron recursos: %+v", resources)
	}
}
```

- [ ] **Paso 4: Crear el script de integración**

`executor/scripts/integration.sh`:
```sh
#!/bin/sh
# Construye las imágenes de sandbox y corre las pruebas de integración con Docker real.
# Usa runc salvo que se pase EXECUTOR_RUNTIME=runsc (después de la prueba de humo de gVisor).
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
docker build -t taller-sandbox-rust:dev "$here/images/rust"
docker build -t taller-sandbox-go:dev "$here/images/go"
docker build --target test -t taller-executor-test:dev "$here"
exec docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$here":/src -w /src \
  -v taller-executor-gocache:/root/.cache/go-build \
  -e EXECUTOR_RUST_IMAGE=taller-sandbox-rust:dev \
  -e EXECUTOR_GO_IMAGE=taller-sandbox-go:dev \
  -e EXECUTOR_RUNTIME="${EXECUTOR_RUNTIME:-runc}" \
  taller-executor-test:dev go test -tags integration -count=1 ./internal/sandbox/ -run Integration -v
```

- [ ] **Paso 5: Correr la integración con runc**

Ejecutar: `sh executor/scripts/integration.sh`
Esperado: las pruebas `TestIntegration…` en PASS (12 en este plan; 19 al cierre de B1, ver el ledger y la enmienda del ADR 0005). Si alguna falla, el implementador
reporta la salida exacta y se detiene; no ajusta límites por su cuenta.

- [ ] **Paso 6: Crear la prueba de humo que corre el usuario**

`executor/scripts/smoke-gvisor.sh`:
```sh
#!/bin/sh
# Prueba de humo de gVisor. La corre el usuario después de instalar runsc
# (`sudo runsc install` y `sudo systemctl reload docker`). Verifica que el runtime responde y
# que, con el driver de cgroups systemd, se aplican la memoria, los procesos y la red apagada.
set -u
image=alpine:3.24
fail=0
check() { if [ "$1" -eq 0 ]; then echo "ok   $2"; else echo "FALLO $2"; fail=1; fi; }

docker run --rm --runtime=runsc "$image" dmesg 2>/dev/null | grep -qi gvisor
check $? "el contenedor corre dentro de gVisor"

docker run --rm --runtime=runsc --memory 64m --memory-swap 64m "$image" \
  sh -c 'head -c 512m /dev/zero | tail' >/dev/null 2>&1
[ $? -ne 0 ]; check $? "el límite de memoria detiene a un proceso que pide 512 MiB"

docker run --rm --runtime=runsc --pids-limit 16 "$image" \
  sh -c 'for i in $(seq 1 64); do sleep 5 & done; wait' >/dev/null 2>&1
[ $? -ne 0 ]; check $? "el límite de procesos impide lanzar 64 procesos con --pids-limit 16"

docker run --rm --runtime=runsc --network none "$image" \
  sh -c 'wget -q -T 3 -O /dev/null http://1.1.1.1' >/dev/null 2>&1
[ $? -ne 0 ]; check $? "sin red con --network none"

exit $fail
```

- [ ] **Paso 7: Commit**

```bash
git add executor/images executor/internal/sandbox/integration_test.go executor/scripts/integration.sh executor/scripts/smoke-gvisor.sh
git commit -m "test(ejecutor): imágenes de sandbox, integración con Docker y prueba de humo de gVisor"
```

- [ ] **Paso 8: Repetir con gVisor** (cuando el usuario haya instalado `runsc` y la prueba de humo pase)

Ejecutar: `EXECUTOR_RUNTIME=runsc sh executor/scripts/integration.sh`
Esperado: las mismas pruebas en PASS. Si alguna difiere, por ejemplo por cómo gVisor
informa un OOM, se documenta en el ADR 0005 antes de ajustar la prueba.

---

### Tarea 9: Integración en el repo y documentación (agente principal)

**Archivos:**
- Modificar: `package.json` (scripts), `.dockerignore`, `AGENTS.md` (Organización),
  `docs/architecture.md` (mapa), `qa/AGENTS.md` (comandos) y
  `docs/plans/2026-10-04-backend-hoja-de-ruta.md` (estado de B1).
- Crear: `executor/AGENTS.md`.

- [ ] **Paso 1: Scripts y exclusiones**

En `package.json`, dentro de `scripts`, agregar:
```json
"test:executor": "sh executor/scripts/test.sh",
"test:executor:integration": "sh executor/scripts/integration.sh"
```
En `.dockerignore`, agregar `executor`: la imagen del front no necesita el ejecutor.

- [ ] **Paso 2: Reglas locales del ejecutor**

`executor/AGENTS.md`:
```markdown
# AGENTS.md — ejecutor

Servicio Go del ADR 0005 (`docs/adr/0005-ejecucion-en-sandbox-propio.md`). Sólo biblioteca
estándar: no agregues módulos sin un ADR.

- Pruebas: `npm run test:executor` (gofmt, vet y unitarias en contenedor) y
  `npm run test:executor:integration` (Docker real; `EXECUTOR_RUNTIME=runsc` después de la
  prueba de humo `executor/scripts/smoke-gvisor.sh`).
- Invariantes de seguridad: los límites, imágenes y flags salen de `internal/sandbox/profile.go`
  y `args.go`, nunca del pedido; todo contenedor usa `--network none`, `--cap-drop ALL`,
  `no-new-privileges`, usuario 65534 y memoria sin swap; la ejecución, `--read-only`.
  Cambiar un límite exige actualizar el ADR 0005 y su prueba.
- Docker se usa sólo a través de `Engine`; las pruebas unitarias usan dobles.
```

- [ ] **Paso 3: Guías y mapa**

En `AGENTS.md`, sección «Organización», después del párrafo que describe `src/` por capas
FSD, agregar:
```markdown
`executor/` es el ejecutor Go del ADR 0005, un servicio interno que compila y ejecuta Rust y
Go en contenedores gVisor; sus reglas están en `executor/AGENTS.md`.
```

En `docs/architecture.md`, en el mapa de fuentes, agregar una fila o viñeta:
```markdown
- `executor/`: ejecutor Go del ADR 0005. `internal/sandbox` (perfiles, argumentos de Docker,
  fases y barrido), `internal/api` (HTTP interno) e `images/` (sandboxes Rust y Go).
```

En `qa/AGENTS.md`, en la tabla de checks por cambio, agregar:
```markdown
| Ejecutor Go (`executor/`) | `npm run test:executor`; con Docker real, `npm run test:executor:integration` (no forman parte de `npm test`) |
```

- [ ] **Paso 4: Verificación completa**

Ejecutar:
```bash
npm run test:executor && npm test && npm run lint && npm run format:check && git diff --check
```
Esperado: todo en verde. `npm test` sigue con 24 checks y no depende de Docker.

- [ ] **Paso 5: Revisión adversarial**

El agente principal le pide al `revisor` (Opus) que revise `executor/` contra el ADR 0005:
- invariantes de seguridad;
- límites;
- limpieza ante fallos y cancelación;
- concurrencia;
- manejo de errores de Docker.

Los hallazgos se corrigen con TDD antes de cerrar B1.

- [ ] **Paso 6: Commit y estado**

```bash
git add package.json .dockerignore AGENTS.md docs/architecture.md qa/AGENTS.md executor/AGENTS.md docs/plans/2026-10-04-backend-hoja-de-ruta.md
git commit -m "docs(ejecutor): comandos, reglas e integración del ejecutor en el repo"
```
