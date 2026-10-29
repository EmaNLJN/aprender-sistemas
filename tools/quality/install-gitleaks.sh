#!/bin/sh
set -eu

version=8.30.1
root=$(cd "$(dirname "$0")/../.." && pwd)
destination=${1:-"$root/tools/quality/bin"}

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) echo "gitleaks: sistema no soportado: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64 | amd64) arch=x64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) echo "gitleaks: arquitectura no soportada: $(uname -m)" >&2; exit 1 ;;
esac

archive="gitleaks_${version}_${os}_${arch}.tar.gz"
checksums="gitleaks_${version}_checksums.txt"
base_url="https://github.com/gitleaks/gitleaks/releases/download/v${version}"

if [ -x "$destination/gitleaks" ] && "$destination/gitleaks" version 2>/dev/null | grep -q "$version"; then
  echo "gitleaks $version ya está en $destination"
  exit 0
fi

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

curl --fail --location --silent --show-error --output "$workdir/$archive" "$base_url/$archive"
curl --fail --location --silent --show-error --output "$workdir/$checksums" "$base_url/$checksums"

expected=$(grep " $archive\$" "$workdir/$checksums" | cut -d ' ' -f 1)
if [ -z "$expected" ]; then
  echo "gitleaks: $archive no figura en $checksums" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$workdir/$archive" | cut -d ' ' -f 1)
else
  actual=$(shasum -a 256 "$workdir/$archive" | cut -d ' ' -f 1)
fi

if [ "$actual" != "$expected" ]; then
  echo "gitleaks: el sha256 de $archive no coincide" >&2
  exit 1
fi

mkdir -p "$workdir/extract" "$destination"
tar -xzf "$workdir/$archive" -C "$workdir/extract" gitleaks
mv "$workdir/extract/gitleaks" "$destination/gitleaks"
chmod +x "$destination/gitleaks"
"$destination/gitleaks" version
