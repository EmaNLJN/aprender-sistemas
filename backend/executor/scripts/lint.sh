#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
exec docker run --rm --network=none \
  -v "$here":/src:ro -w /src \
  -v taller-executor-golangci-cache:/root/.cache \
  -e GOTOOLCHAIN=local \
  golangci/golangci-lint:v2.15.0-alpine@sha256:2ba875b990f1d8501ad4ec19be1ea0701e316ec3a4b764f7b129f62f01318bbf \
  golangci-lint run ./... "$@"
