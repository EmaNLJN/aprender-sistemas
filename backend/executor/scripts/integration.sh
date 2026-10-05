#!/bin/sh
# Construye las imágenes de sandbox y corre las pruebas de integración con Docker real.
# Usa runc salvo que se pase EXECUTOR_RUNTIME=runsc (después de la prueba de humo de gVisor).
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
docker build -t taller-sandbox-rust:dev "$here/images/rust"
docker build -t taller-sandbox-go:dev "$here/images/go"
docker build --target test -t taller-executor-test:dev "$here"
exec docker run --rm --network=none \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$here":/src:ro -w /src \
  -v taller-executor-gocache:/root/.cache/go-build \
  -e EXECUTOR_RUST_IMAGE=taller-sandbox-rust:dev \
  -e EXECUTOR_GO_IMAGE=taller-sandbox-go:dev \
  -e EXECUTOR_RUNTIME="${EXECUTOR_RUNTIME:-runc}" \
  taller-executor-test:dev go test -tags integration -count=1 ./internal/sandbox/ -run Integration -v
