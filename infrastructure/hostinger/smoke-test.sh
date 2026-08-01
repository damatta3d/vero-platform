#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly ENV_FILE="${REPO_DIR}/.env.production"
readonly BASE_URL="${VERO_SMOKE_BASE_URL:-http://127.0.0.1}"

fail() { printf '[VERO][SMOKE][ERRO] %s\n' "$*" >&2; exit 1; }
pass() { printf '[VERO][SMOKE] %s\n' "$*"; }

[[ -f "${ENV_FILE}" ]] || fail ".env.production não encontrado."
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

request_status() {
  local method="$1" path="$2"
  shift 2
  curl --silent --show-error --output /tmp/vero-smoke-body --write-out '%{http_code}' \
    --max-time 10 --request "${method}" "${BASE_URL}${path}" "$@"
}

expect_status() {
  local expected="$1" method="$2" path="$3"
  shift 3
  local actual
  actual="$(request_status "${method}" "${path}" "$@")"
  [[ "${actual}" == "${expected}" ]] || {
    cat /tmp/vero-smoke-body >&2 || true
    fail "${method} ${path}: esperado ${expected}, recebido ${actual}."
  }
  pass "${method} ${path}: ${actual}"
}

AUTH_HEADERS=(
  -H "Authorization: Bearer ${VERO_MVP_API_KEY}"
  -H "x-tenant-id: ${VERO_MVP_TENANT_ID}"
)

expect_status 200 GET /
expect_status 200 GET /portal.css
expect_status 200 GET /portal.js
expect_status 200 GET /mvp
expect_status 200 GET /operacao
expect_status 200 GET /financeiro
expect_status 200 GET /financeiro.css
expect_status 200 GET /financeiro.js
expect_status 200 GET /health/live
expect_status 200 GET /health/ready
expect_status 401 GET /v1/finance
expect_status 200 GET /v1/finance "${AUTH_HEADERS[@]}"
expect_status 200 GET /v1/finance/summary "${AUTH_HEADERS[@]}"
expect_status 200 GET '/v1/operations?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z&limit=1' "${AUTH_HEADERS[@]}"
expect_status 200 GET '/v1/operations/summary?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z' "${AUTH_HEADERS[@]}"

rm -f /tmp/vero-smoke-body
pass 'Varredura funcional concluída.'
