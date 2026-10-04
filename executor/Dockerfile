# Imagen del ejecutor. La etapa `test` agrega docker-cli para las pruebas de integración.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/executor ./cmd/executor

FROM golang:1.27-alpine AS test
RUN apk add --no-cache docker-cli
WORKDIR /src

FROM alpine:3.24 AS runtime
RUN apk add --no-cache docker-cli && adduser -D -u 10001 executor
COPY --from=build /out/executor /usr/local/bin/executor
# El acceso al socket de Docker se concede en Compose con group_add (GID del grupo docker).
USER 10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/executor"]
