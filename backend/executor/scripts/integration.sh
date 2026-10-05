#!/bin/sh
# Builds the sandbox images and runs the integration tests against real Docker.
# Uses runc unless EXECUTOR_RUNTIME=runsc is set (after the gVisor smoke test).
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
