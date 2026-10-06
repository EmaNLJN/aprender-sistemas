#!/bin/sh
# Not `docker compose down mysql-test`: before Compose 2.29, or if the model fails to load while
# COMPOSE_PROJECT_NAME is exported, down also removes the networks of a stopped main stack.
set -eu
project=$(docker compose config | sed -n 's/^name: //p')
if [ -z "$project" ]; then
  echo "FALLO: no se pudo resolver el proyecto de Compose; no se borró nada" >&2
  exit 1
fi
docker compose --profile test rm --stop --force mysql-test
network=$(docker network ls --format '{{.Name}}' \
  --filter "label=com.docker.compose.project=$project" \
  --filter label=com.docker.compose.network=testing)
if [ -n "$network" ]; then
  docker network rm "$network"
fi
