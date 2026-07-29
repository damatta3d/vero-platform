'use strict';

const path = require('node:path');

const REQUIRED_ENV = ['ANOTA_AI_CLIENT_ID', 'ANOTA_AI_CLIENT_SECRET', 'ANOTA_AI_PAGE_ID'];
const SAFE_FIELD_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const SAFE_FIELD_PATH = /^[A-Za-z0-9_$.[\]-]{1,160}$/;
const MAX_SCHEMA_DEPTH = 8;
const MAX_SCHEMA_PATHS = 240;

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
  if (url.includes('/ping/get/')) return 'order-detail';
  return 'provider-api';
}

function safeFieldNames(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  return Object.keys(value)
    .filter((field) => SAFE_FIELD_NAME.test(field))
    .sort()
    .slice(0, 40);
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function sanitizedSchema(value) {
  const paths = [];

  function visit(current, currentPath, depth) {
    if (paths.length >= MAX_SCHEMA_PATHS || depth > MAX_SCHEMA_DEPTH) return;

    const type = valueType(current);
    paths.push(`${currentPath}:${type}`);

    if (Array.isArray(current)) {
      const sample = current.find((entry) => entry !== null && entry !== undefined);
      if (sample !== undefined) visit(sample, `${currentPath}[]`, depth + 1);
      return;
    }

    if (type !== 'object') return;
    for (const field of safeFieldNames(current)) {
      visit(current[field], `${currentPath}.${field}`, depth + 1);
      if (paths.length >= MAX_SCHEMA_PATHS) return;
    }
  }

  visit(value, '$', 0);
  return Object.freeze(paths);
}

function canonicalTranslationSummary(order) {
  if (order.currency !== 'BRL') throw new Error('Canonical translation did not produce BRL.');

  const modifiers = order.items.flatMap((item) => item.modifiers);
  const monetaryValues = [
    order.deliveryFeeCents,
    order.totalCents,
    ...order.additionalFeesCents,
    ...order.items.flatMap((item) => [
      item.unitPriceCents,
      item.totalCents,
      ...item.modifiers.flatMap((modifier) => [modifier.unitPriceCents, modifier.totalCents])
    ]),
    ...order.discounts.map((discount) => discount.amountCents),
    ...order.payments.flatMap((payment) => [
      payment.amountCents,
      ...(payment.changeForCents === undefined ? [] : [payment.changeForCents])
    ])
  ];
  if (monetaryValues.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error('Canonical translation produced an invalid monetary value.');
  }

  return Object.freeze({
    translated: true,
    currency: order.currency,
    monetaryValuesInCents: true,
    itemCount: order.items.length,
    modifierCount: modifiers.length,
    discountCount: order.discounts.length,
    additionalFeeCount: order.additionalFeesCents.length,
    paymentCount: order.payments.length,
    hasDeliveryAddress: order.deliveryAddress !== undefined
  });
}

function findOrderId(document) {
  for (const field of ['_id', 'id', 'orderId', 'order_id']) {
    const value = document[field];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
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
  const { AnotaAiClient, translateAnotaAiOrder } = require(connectorPath);
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

  const firstOrder = orders.info.docs[0];
  const orderId = firstOrder === undefined ? undefined : findOrderId(firstOrder);
  let orderDetailSchema = [];
  let orderDetailInspected = false;
  let translation = Object.freeze({ translated: false });

  if (orderId !== undefined) {
    diagnostic = Object.freeze({ operation: 'order-detail' });
    const detail = await client.getOrder(configuration.pageId, orderId);
    orderDetailSchema = sanitizedSchema(detail.info);
    diagnostic = Object.freeze({ operation: 'order-translation' });
    const translatedOrder = translateAnotaAiOrder(detail.info, {
      pageId: configuration.pageId,
      moneyUnit: 'MAJOR'
    });
    translation = canonicalTranslationSummary(translatedOrder);
    orderDetailInspected = true;
  }

  process.stdout.write(
    `${JSON.stringify({
      connected: true,
      menuCategories: menu.categories.length,
      ordersVisible: orders.info.count,
      page: orders.info.currentpage,
      limit: orders.info.limit,
      orderDetailInspected,
      translation,
      orderDetailSchema
    })}\n`
  );
}

main().catch((error) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'SMOKE_TEST_FAILED';
  const errorField =
    typeof error === 'object' &&
    error !== null &&
    'field' in error &&
    typeof error.field === 'string' &&
    SAFE_FIELD_PATH.test(error.field)
      ? error.field
      : undefined;
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
      ...(errorField === undefined ? {} : { field: errorField }),
      ...(errorStatus === undefined ? {} : { httpStatus: errorStatus })
    })}\n`
  );
  process.exitCode = 1;
});
