#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly ENV_FILE="${REPO_DIR}/.env.production"
readonly COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.production.yml"
readonly PROJECT_NAME="vero-production"

log() { printf '\n[VERO] %s\n' "$*"; }
fail() { printf '\n[VERO][ERRO] %s\n' "$*" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Comando obrigatório não encontrado: $1"; }
compose() { docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"; }

create_environment() {
  if [[ -f "${ENV_FILE}" ]]; then chmod 600 "${ENV_FILE}"; log "Arquivo .env.production existente preservado."; return; fi
  log "Criando .env.production com credenciais aleatórias."
  umask 077
  local db_password api_key
  db_password="$(openssl rand -hex 24)"; api_key="$(openssl rand -hex 32)"
  cat >"${ENV_FILE}" <<EOF
VERO_ENVIRONMENT=production
VERO_SERVICE_NAME=vero-api
VERO_SERVICE_VERSION=0.1.0
VERO_HTTP_HOST=0.0.0.0
VERO_HTTP_PORT=3000
VERO_LOG_LEVEL=info
VERO_POSTGRES_USER=vero
VERO_POSTGRES_PASSWORD=${db_password}
VERO_POSTGRES_DB=vero
VERO_POSTGRES_ENABLED=true
VERO_DATABASE_URL=postgresql://vero:${db_password}@postgres:5432/vero
VERO_REDIS_ENABLED=false
VERO_RABBITMQ_ENABLED=false
VERO_OTEL_ENABLED=false
VERO_MVP_ENABLED=true
VERO_MVP_API_KEY=${api_key}
VERO_MVP_TENANT_ID=santo-parma
EOF
  chmod 600 "${ENV_FILE}"; unset db_password api_key
}

validate_environment() {
  local required=(VERO_POSTGRES_USER VERO_POSTGRES_PASSWORD VERO_POSTGRES_DB VERO_DATABASE_URL VERO_MVP_API_KEY VERO_MVP_TENANT_ID)
  local key
  for key in "${required[@]}"; do grep -q "^${key}=." "${ENV_FILE}" || fail "Variável ausente ou vazia em .env.production: ${key}"; done
  grep -q '^VERO_DATABASE_URL=.*@postgres:5432/' "${ENV_FILE}" || fail "VERO_DATABASE_URL deve apontar para postgres:5432 dentro do Docker."
}

update_repository() {
  if [[ "${VERO_SKIP_GIT_PULL:-false}" == "true" ]]; then log "Atualização Git ignorada por VERO_SKIP_GIT_PULL=true."; return; fi
  if [[ -n "$(git -C "${REPO_DIR}" status --porcelain --untracked-files=no)" ]]; then fail "Existem alterações versionadas locais. Faça commit/stash antes do deploy."; fi
  log "Atualizando branch atual por fast-forward."
  git -C "${REPO_DIR}" pull --ff-only
}

backup_database() {
  if ! compose ps --status running postgres 2>/dev/null | grep -q postgres; then log "Banco ainda não está em execução; backup pré-deploy não é necessário."; return; fi
  local backup_dir backup_file
  backup_dir="${REPO_DIR}/.runtime/backups"; backup_file="${backup_dir}/vero-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  mkdir -p "${backup_dir}"; chmod 700 "${REPO_DIR}/.runtime" "${backup_dir}"
  log "Gerando backup pré-deploy do PostgreSQL."
  if compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip -9 >"${backup_file}"; then chmod 600 "${backup_file}"; log "Backup salvo em ${backup_file}."; else rm -f "${backup_file}"; fail "Não foi possível gerar o backup pré-deploy."; fi
}

wait_for_endpoint() {
  local path="$1" attempts=30 i
  for ((i = 1; i <= attempts; i++)); do
    if curl --fail --silent --show-error --max-time 5 "http://127.0.0.1${path}" >/dev/null; then log "Endpoint aprovado: ${path}"; return; fi
    sleep 2
  done
  compose ps || true; compose logs --tail=120 api || true; fail "Endpoint não respondeu com sucesso: ${path}"
}

main() {
  require_command git; require_command docker; require_command curl; require_command openssl; require_command gzip; require_command bash
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin não está disponível."
  [[ -f "${COMPOSE_FILE}" ]] || fail "Compose de produção não encontrado: ${COMPOSE_FILE}"
  [[ -f "${SCRIPT_DIR}/Caddyfile" ]] || fail "Caddyfile não encontrado."
  [[ -f "${SCRIPT_DIR}/smoke-test.sh" ]] || fail "Varredura de produção não encontrada."

  cd "${REPO_DIR}"
  update_repository; create_environment; validate_environment
  log "Validando configuração Docker Compose."; compose config --quiet
  backup_database
  log "Construindo e publicando VERO."; compose up -d --build --remove-orphans
  log "Aguardando banco e API."; wait_for_endpoint /health/live; wait_for_endpoint /health/ready; wait_for_endpoint /

  log "Executando varredura completa do MVP."
  bash "${SCRIPT_DIR}/smoke-test.sh"

  log "Containers ativos:"; compose ps
  local public_ip; public_ip="$(curl --silent --max-time 5 https://api.ipify.org || true)"
  printf '\n[VERO] DEPLOY CONCLUÍDO\n'
  printf '[VERO] Entrada única: http://%s/\n' "${public_ip:-IP-DO-VPS}"
  printf '[VERO] Saúde:        http://%s/health/ready\n' "${public_ip:-IP-DO-VPS}"
  printf '[VERO] A chave do MVP permanece protegida em .env.production.\n'
}

main "$@"
