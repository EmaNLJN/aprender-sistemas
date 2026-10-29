#!/bin/sh
set -eu

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"

actionlint_image=rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667
zizmor_image=ghcr.io/zizmorcore/zizmor:1.31.1@sha256:42d409dbb851d4c5d35a058cf042b828bea1e3f2884378c526eb0974780e18d9
hadolint_image=hadolint/hadolint:v2.15.1@sha256:32dac94127fd60b7b7e3fbfc65e1383b9b5e25c9bfd7b8536de7a539fe68a12d
shellcheck_image=koalaman/shellcheck:v0.11.0@sha256:61862eba1fcf09a484ebcc6feea46f1782532571a34ed51fedf90dd25f925a8d

failed=0

run_check() {
  name=$1
  shift
  echo "==> $name"
  if ! "$@"; then
    echo "lint-infra: $name falló" >&2
    failed=1
  fi
}

lint_workflows() {
  if [ "$#" -eq 0 ]; then
    set -- .github/workflows/*.yml
  fi
  docker run --rm --network=none -v "$root:/repo:ro" -w /repo "$actionlint_image" -color "$@"
}

audit_workflows() {
  if [ -n "${GH_TOKEN:-}" ]; then
    docker run --rm -e GH_TOKEN -v "$root:/repo:ro" -w /repo "$zizmor_image" .github/workflows
  else
    docker run --rm --network=none -v "$root:/repo:ro" -w /repo "$zizmor_image" --offline .github/workflows
  fi
}

lint_dockerfiles() {
  git ls-files '*Dockerfile' |
    xargs docker run --rm --network=none -v "$root:/repo:ro" -w /repo "$hadolint_image" hadolint --config .hadolint.yaml
}

lint_shell_scripts() {
  git ls-files '*.sh' ':!:.specify' ':!:.agents' |
    xargs docker run --rm --network=none -v "$root:/repo:ro" -w /repo "$shellcheck_image" -S warning
}

run_check actionlint lint_workflows "$@"
run_check zizmor audit_workflows
run_check hadolint lint_dockerfiles
run_check shellcheck lint_shell_scripts

exit "$failed"
