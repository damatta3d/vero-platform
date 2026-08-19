#!/usr/bin/env bash
set -Eeuo pipefail

readonly image="${1:-vero-api:pr}"
readonly network="vero-api-smoke-network"
readonly database_container="vero-api-smoke-db"
readonly api_container="vero-api-smoke-app"
readonly database_password="vero-smoke-password"
readonly api_key="vero-api-container-smoke-key"
readonly tenant_id="store-settings-container-smoke"

cleanup() {
  local status=$?
  set +e
  if ((status != 0)); then
    docker logs "${api_container}" 2>/dev/null || true
    docker logs "${database_container}" 2>/dev/null || true
  fi
  docker rm --force "${api_container}" "${database_container}" >/dev/null 2>&1 || true
  docker network rm "${network}" >/dev/null 2>&1 || true
  return "${status}"
}
trap cleanup EXIT

docker network create "${network}" >/dev/null
docker run --detach \
  --name "${database_container}" \
  --network "${network}" \
  --env POSTGRES_USER=vero \
  --env "POSTGRES_PASSWORD=${database_password}" \
  --env POSTGRES_DB=vero \
  postgres:18-alpine >/dev/null

for attempt in $(seq 1 60); do
  if docker exec "${database_container}" pg_isready --username vero --dbname vero >/dev/null 2>&1; then
    break
  fi
  if ((attempt == 60)); then
    echo "PostgreSQL smoke container did not become ready." >&2
    exit 1
  fi
  sleep 1
done

docker run --detach \
  --name "${api_container}" \
  --network "${network}" \
  --publish 127.0.0.1::3000 \
  --env VERO_ENVIRONMENT=test \
  --env VERO_HTTP_HOST=0.0.0.0 \
  --env VERO_HTTP_PORT=3000 \
  --env VERO_LOG_LEVEL=info \
  --env VERO_POSTGRES_ENABLED=true \
  --env "VERO_DATABASE_URL=postgresql://vero:${database_password}@${database_container}:5432/vero" \
  --env VERO_REDIS_ENABLED=false \
  --env VERO_RABBITMQ_ENABLED=false \
  --env VERO_OTEL_ENABLED=false \
  --env VERO_MVP_ENABLED=true \
  --env "VERO_MVP_API_KEY=${api_key}" \
  --env "VERO_MVP_TENANT_ID=${tenant_id}" \
  "${image}" >/dev/null

readonly published_address="$(docker port "${api_container}" 3000/tcp | head -n 1)"
readonly origin="http://${published_address}"

for attempt in $(seq 1 90); do
  if curl --fail --silent --show-error "${origin}/health/live" >/dev/null 2>&1; then
    break
  fi
  if ((attempt == 90)); then
    echo "VERO API smoke container did not become ready." >&2
    exit 1
  fi
  sleep 1
done

readonly authorization="Authorization: Bearer ${api_key}"
readonly tenant="x-tenant-id: ${tenant_id}"
settings="$(curl --fail --silent --show-error --header "${authorization}" --header "${tenant}" "${origin}/v1/settings/store")"
node -e '
  const settings = JSON.parse(process.argv[1]);
  if (settings.identity?.displayName !== "store-settings-container-smoke") process.exit(1);
  if (settings.operation?.orderReceiptMode !== "MANUAL") process.exit(1);
' "${settings}"

readonly update_payload='{"identity":{"displayName":"Santo Parma Container","phone":null,"whatsapp":null,"address":null,"addressComplement":null,"neighborhood":null,"city":"Campo Grande","stateCode":"MS","postalCode":"79000-000"},"operation":{"operationallyOpen":false,"pickupEnabled":true,"deliveryEnabled":false,"preparationTimeMinMinutes":30,"preparationTimeMaxMinutes":60,"minimumOrderCents":0,"orderReceiptMode":"AUTOMATIC"},"delivery":{"maxRadiusKm":null,"baseFeeCents":0,"freeAboveCents":null},"schedule":[{"weekday":"MONDAY","enabled":false,"opensAt":null,"closesAt":null},{"weekday":"TUESDAY","enabled":false,"opensAt":null,"closesAt":null},{"weekday":"WEDNESDAY","enabled":false,"opensAt":null,"closesAt":null},{"weekday":"THURSDAY","enabled":false,"opensAt":null,"closesAt":null},{"weekday":"FRIDAY","enabled":false,"opensAt":null,"closesAt":null},{"weekday":"SATURDAY","enabled":false,"opensAt":null,"closesAt":null},{"weekday":"SUNDAY","enabled":false,"opensAt":null,"closesAt":null}],"payments":{"pixEnabled":true,"paymentOnDeliveryEnabled":true,"cashEnabled":true,"cardOnDeliveryEnabled":true}}'
updated="$(curl --fail --silent --show-error \
  --request PUT \
  --header "${authorization}" \
  --header "${tenant}" \
  --header 'content-type: application/json' \
  --data "${update_payload}" \
  "${origin}/v1/settings/store")"
node -e '
  const settings = JSON.parse(process.argv[1]);
  if (settings.identity?.displayName !== "Santo Parma Container") process.exit(1);
  if (settings.operation?.orderReceiptMode !== "AUTOMATIC") process.exit(1);
' "${updated}"

if docker logs "${api_container}" 2>&1 | grep -F "Cannot read properties of undefined"; then
  echo "Bundled controller dependency injection failed." >&2
  exit 1
fi
