#!/bin/sh
# FR-034: php is replaced only after migrate succeeds with the new image. A plain
# `docker compose up --build` stops the old php while recreating it, before it waits for migrate.
set -eu
docker compose build
docker compose run --rm migrate
docker compose up -d --wait --no-deps mysql php taller scheduler executor worker-runs
