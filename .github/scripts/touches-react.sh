#!/bin/sh
# React Doctor reads .tsx and .jsx, modules that import react, and its own setup.
set -eu

touches=false
while IFS= read -r path || [ -n "$path" ]; do
  [ -n "$path" ] || continue
  case "$path" in
    *.tsx | *.jsx) touches=true ;;
    package.json | frontend/doctor.config.ts | tools/quality/package.json | tools/quality/package-lock.json) touches=true ;;
    .github/workflows/ci.yml | .github/scripts/touches-react.sh) touches=true ;;
    frontend/*.ts | frontend/*.js)
      if [ -f "$path" ] && grep -Eq "from ['\"]react(-dom)?(/[^'\"]*)?['\"]" "$path"; then
        touches=true
      fi
      ;;
  esac
done

echo "$touches"
