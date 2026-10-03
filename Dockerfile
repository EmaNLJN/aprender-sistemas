# The compiler sandboxes remain the official Rust and Go Playgrounds.
# This build packages only the educational web application and its local editor.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm test && npm run lint && npm run format:check

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:ed04ec1ff34502c339ee5c3ae3f855442398edc1d05591e2b98981dcbbd20b1e
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/index.html /usr/share/nginx/html/index.html
COPY --from=build /app/EDITOR-LICENSES.txt /usr/share/nginx/html/EDITOR-LICENSES.txt
COPY --from=build /app/THIRD-PARTY-NOTICES.txt /usr/share/nginx/html/THIRD-PARTY-NOTICES.txt
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
