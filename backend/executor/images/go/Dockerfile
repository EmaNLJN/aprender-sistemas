FROM golang:1.27-alpine@sha256:8a5910f31396cd4d89662f56c68b3ae31d374308270a1c3bd96672ee5ed43414
ENV CGO_ENABLED=0 GOTOOLCHAIN=local GOPROXY=off GOCACHE=/opt/gocache
COPY warm /opt/warm
RUN cd /opt/warm && go vet main.go && go build -o /dev/null main.go \
    && mkdir -p /out && chown -R 65534:65534 /opt/gocache /out
WORKDIR /tmp
