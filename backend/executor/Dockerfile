# The `test` stage adds docker-cli for the integration tests.
FROM golang:1.27-alpine@sha256:8a5910f31396cd4d89662f56c68b3ae31d374308270a1c3bd96672ee5ed43414 AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/executor ./cmd/executor

FROM golang:1.27-alpine@sha256:8a5910f31396cd4d89662f56c68b3ae31d374308270a1c3bd96672ee5ed43414 AS test
RUN apk add --no-cache docker-cli
WORKDIR /src

FROM alpine:3.24@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 AS runtime
RUN apk add --no-cache docker-cli && adduser -D -u 10001 executor
COPY --from=build /out/executor /usr/local/bin/executor
# Docker socket access is granted in Compose with group_add (the docker group GID).
USER 10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/executor"]
