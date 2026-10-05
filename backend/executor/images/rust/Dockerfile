# Sandbox Rust: rustc estable para --edition 2024. /out pertenece a 65534 para que el volumen
# nuevo lo herede al montarse por primera vez.
FROM rust:1.99-slim@sha256:01dd4f9c24801cfc8ba9cf8a5dd6dcca451cd17d1ae73574edc22591de6e6816
RUN mkdir -p /out && chown 65534:65534 /out
WORKDIR /tmp
