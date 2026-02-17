#!/usr/bin/env bash
set -euo pipefail

openapi-typescript "./openapi.yaml" -o "./packages/vscode-extension/src/infrastructure/api/generated.ts"
openapi-typescript "./openapi.yaml" -o "./packages/cli/src/generated.ts"
