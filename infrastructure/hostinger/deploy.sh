#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly ENV_FILE="${REPO_DIR}/.env.production"
readonly COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.production.yml"
readonly PROJECT_NAME="vero-production"
DEPLOY_POSTGRES_USER=''
DEPLOY_POSTGRES_DB=''
DEPLOY_TENANT_ID=''

log() { printf '\n[VERO] %s\n' "$*"; }
warn() { printf '\n[VERO][AVISO] %s\n' "$*" >&2; }
fail() { printf '\n[VERO][ERRO] %s\n' "$*" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Comando obrigatório não encontrado: $1"; }
compose() { docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"; }
env_value() { sed -n "s/^$1=//p" "${ENV_FILE}" | tail -n 1; }

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
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_PAYER_EMAIL=
VERO_MAPS_PROVIDER=GOOGLE
GOOGLE_MAPS_API_KEY=
EOF
  chmod 600 "${ENV_FILE}"; unset db_password api_key
}

validate_environment() {
  local required=(VERO_POSTGRES_USER VERO_POSTGRES_PASSWORD VERO_POSTGRES_DB VERO_DATABASE_URL VERO_MVP_API_KEY VERO_MVP_TENANT_ID)
  local key
  for key in "${required[@]}"; do grep -q "^${key}=." "${ENV_FILE}" || fail "Variável ausente ou vazia em .env.production: ${key}"; done
  grep -q '^VERO_DATABASE_URL=.*@postgres:5432/' "${ENV_FILE}" || fail "VERO_DATABASE_URL deve apontar para postgres:5432 dentro do Docker."

  DEPLOY_TENANT_ID="$(env_value VERO_MVP_TENANT_ID)"
  [[ "${DEPLOY_TENANT_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$ ]] \
    || fail "VERO_MVP_TENANT_ID contém caracteres inválidos."

  local mp_access mp_secret mp_email mp_fields maps_provider maps_key
  mp_access="$(env_value MERCADO_PAGO_ACCESS_TOKEN)"
  mp_secret="$(env_value MERCADO_PAGO_WEBHOOK_SECRET)"
  mp_email="$(env_value MERCADO_PAGO_PAYER_EMAIL)"
  mp_fields=0
  [[ -n "${mp_access}" ]] && ((mp_fields += 1))
  [[ -n "${mp_secret}" ]] && ((mp_fields += 1))
  [[ -n "${mp_email}" ]] && ((mp_fields += 1))
  if ((mp_fields > 0 && mp_fields < 3)); then
    fail "Mercado Pago está parcialmente configurado. Preencha ACCESS_TOKEN, WEBHOOK_SECRET e PAYER_EMAIL ou deixe os três vazios."
  fi
  if ((mp_fields == 0)); then
    warn "Mercado Pago não configurado; pagamentos PIX permanecerão indisponíveis."
  else
    [[ "${mp_email}" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] \
      || fail "MERCADO_PAGO_PAYER_EMAIL não possui formato de e-mail válido."
    log "Configuração do Mercado Pago completa para PIX e webhook."
  fi

  maps_provider="$(env_value VERO_MAPS_PROVIDER)"
  maps_provider="${maps_provider:-GOOGLE}"
  [[ "${maps_provider}" == 'GOOGLE' ]] \
    || fail "VERO_MAPS_PROVIDER=${maps_provider} não é suportado; use GOOGLE."
  maps_key="$(env_value GOOGLE_MAPS_API_KEY)"
  if [[ -z "${maps_key}" ]]; then
    warn "Google Maps não configurado; frete por rota só poderá permanecer desabilitado."
  else
    log "Google Maps configurado para geocodificação e cálculo de rotas."
  fi
}

load_database_identity() {
  DEPLOY_POSTGRES_USER="$(env_value VERO_POSTGRES_USER)"
  DEPLOY_POSTGRES_DB="$(env_value VERO_POSTGRES_DB)"
  [[ -n "${DEPLOY_POSTGRES_USER}" && -n "${DEPLOY_POSTGRES_DB}" ]] || fail "Identidade PostgreSQL inválida em .env.production."
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
  if compose exec -T postgres pg_dump -U "${DEPLOY_POSTGRES_USER}" -d "${DEPLOY_POSTGRES_DB}" | gzip -9 >"${backup_file}"; then chmod 600 "${backup_file}"; log "Backup salvo em ${backup_file}."; else rm -f "${backup_file}"; fail "Não foi possível gerar o backup pré-deploy."; fi
}

wait_for_postgres() {
  local attempts=30 i
  for ((i = 1; i <= attempts; i++)); do
    if compose exec -T postgres pg_isready -U "${DEPLOY_POSTGRES_USER}" -d "${DEPLOY_POSTGRES_DB}" >/dev/null 2>&1; then
      log "PostgreSQL pronto para migrations."
      return
    fi
    sleep 2
  done
  compose ps || true
  fail "PostgreSQL não ficou pronto para migrations."
}

resolve_interrupted_receipt_migration() {
  local migration_name='20260819173000_order_receipt_mode' migration_table failed
  migration_table="$(compose exec -T postgres psql \
    -U "${DEPLOY_POSTGRES_USER}" -d "${DEPLOY_POSTGRES_DB}" \
    -tAc "SELECT to_regclass('public._prisma_migrations')" \
    | tr -d '[:space:]')"
  [[ "${migration_table}" == '_prisma_migrations' ]] || return

  failed="$(compose exec -T postgres psql \
    -U "${DEPLOY_POSTGRES_USER}" -d "${DEPLOY_POSTGRES_DB}" \
    -tAc "SELECT EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20260819173000_order_receipt_mode' AND finished_at IS NULL AND rolled_back_at IS NULL)::int" \
    | tr -d '[:space:]')"
  [[ "${failed}" == '1' ]] || return

  log "Marcando a tentativa interrompida de ${migration_name} para reaplicação segura."
  compose run --rm --no-deps api pnpm exec prisma migrate resolve --rolled-back "${migration_name}"
}

validate_runtime_integrations() {
  local runtime_state pix_enabled delivery_enabled route_configured origin_ready
  local mp_access mp_secret mp_email maps_provider maps_key
  runtime_state="$(compose exec -T postgres psql \
    -U "${DEPLOY_POSTGRES_USER}" -d "${DEPLOY_POSTGRES_DB}" -tA -F '|' \
    -c "SELECT pix_enabled::int,
               delivery_enabled::int,
               ((delivery_radius_km IS NOT NULL) OR EXISTS (
                  SELECT 1 FROM store_delivery_fee_bands b WHERE b.tenant_id=store_settings.tenant_id
                ))::int,
               (COALESCE(NULLIF(BTRIM(address),''),'')<>''
                AND COALESCE(NULLIF(BTRIM(city),''),'')<>''
                AND COALESCE(NULLIF(BTRIM(state_code),''),'')<>'')::int
          FROM store_settings
         WHERE tenant_id='${DEPLOY_TENANT_ID}' LIMIT 1" \
    | tr -d '\r')"

  if [[ -z "${runtime_state}" ]]; then
    warn "Configuração da loja ${DEPLOY_TENANT_ID} ainda não existe; o smoke funcional deverá detectar ausência de dados obrigatórios."
    return
  fi

  IFS='|' read -r pix_enabled delivery_enabled route_configured origin_ready <<<"${runtime_state}"

  mp_access="$(env_value MERCADO_PAGO_ACCESS_TOKEN)"
  mp_secret="$(env_value MERCADO_PAGO_WEBHOOK_SECRET)"
  mp_email="$(env_value MERCADO_PAGO_PAYER_EMAIL)"
  if [[ "${pix_enabled}" == '1' ]]; then
    [[ -n "${mp_access}" && -n "${mp_secret}" && -n "${mp_email}" ]] \
      || fail "PIX está habilitado para ${DEPLOY_TENANT_ID}, mas Mercado Pago não está configurado por completo."
    log "Preflight de PIX aprovado para ${DEPLOY_TENANT_ID}."
  fi

  maps_provider="$(env_value VERO_MAPS_PROVIDER)"
  maps_provider="${maps_provider:-GOOGLE}"
  maps_key="$(env_value GOOGLE_MAPS_API_KEY)"
  if [[ "${delivery_enabled}" == '1' && ("${route_configured}" == '1' || -n "${maps_key}") ]]; then
    [[ "${maps_provider}" == 'GOOGLE' && -n "${maps_key}" ]] \
      || fail "Entrega por rota está habilitada, mas Google Maps não está completamente configurado."
    [[ "${origin_ready}" == '1' ]] \
      || fail "Entrega por rota está habilitada, mas endereço, cidade ou UF da loja estão incompletos."
    log "Preflight de entrega por rota aprovado para ${DEPLOY_TENANT_ID}."
  fi
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
  update_repository; create_environment; validate_environment; load_database_identity
  log "Validando configuração Docker Compose."; compose config --quiet
  backup_database
  log "Iniciando PostgreSQL."; compose up -d postgres; wait_for_postgres
  log "Construindo a imagem da API."; compose build api
  resolve_interrupted_receipt_migration
  log "Aplicando migrations antes de iniciar a nova API."
  compose run --rm --no-deps api pnpm exec prisma migrate deploy
  validate_runtime_integrations
  log "Publicando VERO."; compose up -d --remove-orphans
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
