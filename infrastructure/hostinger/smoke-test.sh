#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly ENV_FILE="${REPO_DIR}/.env.production"
readonly BASE_URL="${VERO_SMOKE_BASE_URL:-http://127.0.0.1}"
readonly BODY_FILE="/tmp/vero-smoke-body"

fail() { printf '[VERO][SMOKE][ERRO] %s\n' "$*" >&2; exit 1; }
pass() { printf '[VERO][SMOKE] %s\n' "$*"; }
cleanup() { rm -f "${BODY_FILE}"; }
trap cleanup EXIT

[[ -f "${ENV_FILE}" ]] || fail ".env.production não encontrado."
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

request_status() {
  local method="$1" path="$2"
  shift 2
  curl --silent --show-error --output "${BODY_FILE}" --write-out '%{http_code}' \
    --connect-timeout 5 --max-time 15 --request "${method}" "${BASE_URL}${path}" "$@"
}

expect_status() {
  local expected="$1" method="$2" path="$3"
  shift 3
  local actual
  actual="$(request_status "${method}" "${path}" "$@")"
  [[ "${actual}" == "${expected}" ]] || {
    cat "${BODY_FILE}" >&2 || true
    fail "${method} ${path}: esperado ${expected}, recebido ${actual}."
  }
  pass "${method} ${path}: ${actual}"
}

expect_http_page() {
  local path="$1" headers body size
  headers="$(curl --silent --show-error --head --connect-timeout 5 --max-time 15 "${BASE_URL}${path}")"
  grep -qi '^content-type: text/html' <<<"${headers}" || fail "${path}: content-type HTML ausente."
  grep -qi '^cache-control:.*no-store' <<<"${headers}" || fail "${path}: cache-control no-store ausente."
  if grep -qi '^content-security-policy:.*upgrade-insecure-requests' <<<"${headers}"; then
    fail "${path}: CSP tenta forçar HTTPS durante homologação por IP."
  fi

  body="$(curl --silent --show-error --connect-timeout 5 --max-time 15 "${BASE_URL}${path}")"
  size="${#body}"
  (( size >= 500 )) || fail "${path}: HTML inesperadamente pequeno (${size} bytes)."
  grep -Fqi '<!doctype html>' <<<"${body}" || fail "${path}: documento HTML inválido."
  grep -Fqi '<meta name="viewport"' <<<"${body}" || fail "${path}: viewport responsivo ausente."
  pass "${path}: HTML, CSP, cache e viewport válidos."
}

expect_asset() {
  local path="$1" expected_type="$2" kind="$3" headers body size
  headers="$(curl --silent --show-error --head --connect-timeout 5 --max-time 15 "${BASE_URL}${path}")"
  grep -qi "^content-type: ${expected_type}" <<<"${headers}" || fail "${path}: content-type inesperado."
  body="$(curl --silent --show-error --connect-timeout 5 --max-time 15 "${BASE_URL}${path}")"
  size="${#body}"
  (( size >= 100 )) || fail "${path}: asset inesperadamente pequeno (${size} bytes)."

  case "${kind}" in
    css)
      grep -Fq '{' <<<"${body}" && grep -Fq '}' <<<"${body}" \
        || fail "${path}: estrutura CSS inválida."
      ;;
    js)
      grep -Eq '(^|[^[:alnum:]_])(const|let|function|async)[[:space:]]|=>' <<<"${body}" \
        || fail "${path}: estrutura JavaScript não reconhecida."
      ;;
    *) fail "${path}: tipo de asset desconhecido (${kind})." ;;
  esac
  pass "${path}: asset ${kind} válido (${size} bytes)."
}

expect_inline_page() {
  local path="$1" body size
  body="$(curl --silent --show-error --connect-timeout 5 --max-time 15 "${BASE_URL}${path}")"
  size="${#body}"
  (( size >= 1000 )) || fail "${path}: página incorporada inesperadamente pequena (${size} bytes)."
  grep -Fq '<style>' <<<"${body}" || fail "${path}: CSS crítico não está incorporado."
  grep -Fq '<script>' <<<"${body}" || fail "${path}: JavaScript crítico não está incorporado."
  grep -Fq '</style>' <<<"${body}" || fail "${path}: fechamento de CSS ausente."
  grep -Fq '</script>' <<<"${body}" || fail "${path}: fechamento de JavaScript ausente."
  pass "${path}: CSS e JavaScript críticos incorporados (${size} bytes)."
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

expect_http_page /
expect_http_page /inicio
expect_http_page /mvp
expect_http_page /operacao
expect_http_page /financeiro

expect_inline_page /
expect_inline_page /mvp
expect_inline_page /operacao
expect_inline_page /financeiro

expect_asset /portal.css 'text/css' css
expect_asset /portal.js 'application/javascript' js
expect_asset /mvp.css 'text/css' css
expect_asset /mvp.js 'application/javascript' js
expect_asset /financeiro.css 'text/css' css
expect_asset /financeiro.js 'application/javascript' js

expect_status 200 GET /health/live
expect_status 200 GET /health/ready
expect_status 401 GET /v1/finance
expect_status 200 GET /v1/finance "${AUTH_HEADERS[@]}"
expect_status 200 GET /v1/finance/summary "${AUTH_HEADERS[@]}"
expect_status 200 GET '/v1/operations?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z&limit=1' "${AUTH_HEADERS[@]}"
expect_status 200 GET '/v1/operations/summary?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z' "${AUTH_HEADERS[@]}"

pass 'Varredura funcional concluída.'
