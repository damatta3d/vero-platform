'use strict';

const path = require('node:path');

const REQUIRED_ENV = ['ANOTA_AI_CLIENT_ID', 'ANOTA_AI_CLIENT_SECRET', 'ANOTA_AI_PAGE_ID'];
const SAFE_FIELD_NAME = /^[A-Za-z0-9_.-]{1,64}$/;

let diagnostic = Object.freeze({ operation: 'bootstrap' });

function requiredEnvironment() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Configuração protegida ausente: ${missing.join(', ')}`);
  }

  return {
    clientId: process.env.ANOTA_AI_CLIENT_ID.trim(),
    clientSecret: process.env.ANOTA_AI_CLIENT_SECRET.trim(),
    pageId: process.env.ANOTA_AI_PAGE_ID.trim()
  };
}

function requestStage(url) {
  if (url.includes('/oauth-client/token')) return 'authentication';
  if (url.includes('/menu/nm-category/simple-item/export')) return 'menu-export';
  if (url.includes('/ping/list')) return 'order-list';
  return 'provider-api';
}

function safeFieldNames(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  return Object.keys(value)
    .filter((field) => SAFE_FIELD_NAME.test(field))
    .sort()
    .slice(0, 40);
}

async function diagnosticFetch(url, init) {
  const response = await fetch(url, init);
  let bodyShape = 'invalid-json';
  let responseFields = [];
  let infoFields = [];

  try {
    const payload = await response.clone().json();
    bodyShape = Array.isArray(payload)
      ? 'array'
      : typeof payload === 'object' && payload !== null
        ? 'object'
        : typeof payload;
    responseFields = safeFieldNames(payload);
    if (
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload) &&
      'info' in payload
    ) {
      infoFields = safeFieldNames(payload.info);
    }
  } catch {
    // The diagnostic intentionally records only the response shape, never its body.
  }

  diagnostic = Object.freeze({
    ...diagnostic,
    requestStage: requestStage(url),
    httpStatus: response.status,
    bodyShape,
    responseFields,
    ...(infoFields.length === 0 ? {} : { infoFields })
  });
  return response;
}

async function main() {
  const configuration = requiredEnvironment();
  const connectorPath = path.resolve(
    process.cwd(),
    'dist/packages/integrations/anota-ai/public-api.cjs'
  );
  const { AnotaAiClient } = require(connectorPath);
  const client = new AnotaAiClient({
    clientId: configuration.clientId,
    clientSecret: configuration.clientSecret,
    serviceVersion: '0.1.0',
    environment: 'staging',
    fetch: diagnosticFetch
  });

  diagnostic = Object.freeze({ operation: 'menu-export' });
  const menu = await client.exportMenu(configuration.pageId);

  diagnostic = Object.freeze({ operation: 'order-list' });
  const orders = await client.listOrders(configuration.pageId, { excludeIfood: false });

  process.stdout.write(
    `${JSON.stringify({
      connected: true,
      menuCategories: menu.categories.length,
      ordersVisible: orders.info.count,
      page: orders.info.currentpage,
      limit: orders.info.limit
    })}\n`
  );
}

main().catch((error) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'SMOKE_TEST_FAILED';
  const errorStatus =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    Number.isSafeInteger(error.status)
      ? error.status
      : undefined;
  process.stderr.write(
    `${JSON.stringify({
      connected: false,
      code,
      ...diagnostic,
      ...(errorStatus === undefined ? {} : { httpStatus: errorStatus })
    })}\n`
  );
  process.exitCode = 1;
});
