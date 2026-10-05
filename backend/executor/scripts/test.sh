#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
exec docker run --rm --network=none \
  -v "$here":/src:ro -w /src \
  -v taller-executor-gocache:/root/.cache/go-build \
  golang:1.27-alpine sh -c '
    unformatted=$(gofmt -l .)
    if [ -n "$unformatted" ]; then echo "Sin formato gofmt:"; echo "$unformatted"; exit 1; fi
    go vet ./... && go test ./... "$@"' sh "$@"
