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
