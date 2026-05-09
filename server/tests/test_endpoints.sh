#!/bin/bash
set -euo pipefail

# Compatibility wrapper. The maintained multi-tenant endpoint suite is
# tests/e2e-endpoints.js and is also available through npm.
npm run test:endpoints
