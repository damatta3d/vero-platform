'use strict';

const path = require('node:path');

const REQUIRED_ENV = ['ANOTA_AI_CLIENT_ID', 'ANOTA_AI_CLIENT_SECRET', 'ANOTA_AI_PAGE_ID'];

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
    environment: 'staging'
  });

  const [menu, orders] = await Promise.all([
    client.exportMenu(configuration.pageId),
    client.listOrders(configuration.pageId, { excludeIfood: false })
  ]);

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
  process.stderr.write(`${JSON.stringify({ connected: false, code })}\n`);
  process.exitCode = 1;
});
