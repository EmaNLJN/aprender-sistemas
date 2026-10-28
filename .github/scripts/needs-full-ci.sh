#!/bin/sh
# Markdown outside content/ is documentation: no check reads it.
set -eu

needs_full=false
seen=false
while IFS= read -r path || [ -n "$path" ]; do
  [ -n "$path" ] || continue
  seen=true
  case "$path" in
    content/*) needs_full=true ;;
    *.md) ;;
    *) needs_full=true ;;
  esac
done

if [ "$seen" = false ]; then
  needs_full=true
fi

echo "$needs_full"
