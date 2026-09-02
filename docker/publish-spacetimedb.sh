#!/bin/sh
set -eu

: "${SPACETIMEDB_URL:=http://spacetimedb:3000}"
: "${SPACETIMEDB_DATABASE:=exposure-radar}"

exec spacetime --config-path=/spacetime-cli/cli.toml publish \
  "$SPACETIMEDB_DATABASE" \
  --server "$SPACETIMEDB_URL" \
  --module-path /workspace/spacetimedb \
  --no-config \
  --yes
