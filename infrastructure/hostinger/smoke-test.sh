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

expect_http_page_without_upgrade() {
  local path="$1" headers
  headers="$(curl --silent --show-error --head --max-time 10 "${BASE_URL}${path}")"
  grep -qi '^content-type: text/html' <<<"${headers}" || fail "${path}: content-type HTML ausente."
  grep -qi '^cache-control:.*no-store' <<<"${headers}" || fail "${path}: cache-control no-store ausente."
  if grep -qi '^content-security-policy:.*upgrade-insecure-requests' <<<"${headers}"; then
    fail "${path}: CSP tenta forçar HTTPS durante homologação por IP."
  fi
  pass "${path}: CSP e cache compatíveis com homologação HTTP."
}

expect_asset() {
  local path="$1" expected_type="$2" marker="$3" headers
  headers="$(curl --silent --show-error --head --max-time 10 "${BASE_URL}${path}")"
  grep -qi "^content-type: ${expected_type}" <<<"${headers}" || fail "${path}: content-type inesperado."
  curl --silent --show-error --max-time 10 "${BASE_URL}${path}" | grep -Fq "${marker}" \
    || fail "${path}: conteúdo esperado não encontrado."
  pass "${path}: asset válido."
}

expect_inline_page() {
  local path="$1" style_marker="$2" script_marker="$3" body
  body="$(curl --silent --show-error --max-time 10 "${BASE_URL}${path}")"
  grep -Fq '<style>' <<<"${body}" || fail "${path}: CSS crítico não está incorporado."
  grep -Fq "${style_marker}" <<<"${body}" || fail "${path}: marcador CSS não encontrado."
  grep -Fq '<script>' <<<"${body}" || fail "${path}: JavaScript crítico não está incorporado."
  grep -Fq "${script_marker}" <<<"${body}" || fail "${path}: marcador JavaScript não encontrado."
  pass "${path}: CSS e JavaScript críticos incorporados."
}

AUTH_HEADERS=(
  -H "Authorization: Bearer ${VERO_MVP_API_KEY}"
  -H "x-tenant-id: ${VERO_MVP_TENANT_ID}"
)

expect_status 200 GET /
expect_status 200 GET /inicio
expect_status 200 GET /portal.css
expect_status 200 GET /portal.js
expect_status 200 GET /mvp
expect_status 200 GET /mvp.css
expect_status 200 GET /mvp.js
expect_status 200 GET /operacao
expect_status 200 GET /financeiro
expect_status 200 GET /financeiro.css
expect_status 200 GET /financeiro.js

expect_http_page_without_upgrade /
expect_http_page_without_upgrade /inicio
expect_http_page_without_upgrade /mvp
expect_http_page_without_upgrade /operacao
expect_http_page_without_upgrade /financeiro

expect_inline_page / '.modules' 'vero_token'
expect_inline_page /mvp ':root' 'Promise.all'
expect_inline_page /financeiro '.message' 'financeForm'

expect_asset /portal.css 'text/css' '.modules'
expect_asset /portal.js 'application/javascript' 'vero_token'
expect_asset /mvp.css 'text/css' ':root'
expect_asset /mvp.js 'application/javascript' 'Promise.all'
expect_asset /financeiro.css 'text/css' '.message'
expect_asset /financeiro.js 'application/javascript' 'financeForm'

expect_status 200 GET /health/live
expect_status 200 GET /health/ready
expect_status 401 GET /v1/finance
expect_status 200 GET /v1/finance "${AUTH_HEADERS[@]}"
expect_status 200 GET /v1/finance/summary "${AUTH_HEADERS[@]}"
expect_status 200 GET '/v1/operations?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z&limit=1' "${AUTH_HEADERS[@]}"
expect_status 200 GET '/v1/operations/summary?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z' "${AUTH_HEADERS[@]}"

rm -f /tmp/vero-smoke-body
pass 'Varredura funcional concluída.'
