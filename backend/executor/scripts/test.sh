#!/bin/sh
# Corre gofmt, go vet y las pruebas unitarias del ejecutor dentro de golang:1.27-alpine,
# porque el host no tiene Go. El volumen con nombre conserva el caché de compilación entre
# corridas. El código se monta de sólo lectura y sin red: las pruebas no deben escribir en
# el árbol ni salir a Internet.
# Uso: sh backend/executor/scripts/test.sh [argumentos extra para go test; -race no anda sin cgo]
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
exec docker run --rm --network=none \
  -v "$here":/src:ro -w /src \
  -v taller-executor-gocache:/root/.cache/go-build \
  golang:1.27-alpine sh -c '
    unformatted=$(gofmt -l .)
    if [ -n "$unformatted" ]; then echo "Sin formato gofmt:"; echo "$unformatted"; exit 1; fi
    go vet ./... && go test ./... "$@"' sh "$@"
