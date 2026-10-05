#!/bin/sh
# Runs gofmt, go vet and the unit tests inside golang:1.27-alpine, since the host has no Go.
# The named volume keeps the build cache between runs. The code is mounted read-only and with
# no network: tests must not write to the tree or reach the Internet.
# Usage: sh backend/executor/scripts/test.sh [extra go test arguments; -race needs cgo]
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
exec docker run --rm --network=none \
  -v "$here":/src:ro -w /src \
  -v taller-executor-gocache:/root/.cache/go-build \
  golang:1.27-alpine sh -c '
    unformatted=$(gofmt -l .)
    if [ -n "$unformatted" ]; then echo "Sin formato gofmt:"; echo "$unformatted"; exit 1; fi
    go vet ./... && go test ./... "$@"' sh "$@"
