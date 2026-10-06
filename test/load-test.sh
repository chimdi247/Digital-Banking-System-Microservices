#!/usr/bin/env bash
# Steady, realistic traffic across the gateway and all 6 services.
# See test/README.md.
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_run-k6.sh" load-test.js "$@"
