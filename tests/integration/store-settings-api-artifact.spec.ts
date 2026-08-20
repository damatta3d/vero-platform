import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import { createDatabaseClient, storeWeekdays } from '@vero/infrastructure-database';

const apiKey = 'store-settings-artifact-integration-key';
const tenantId = 'store-settings-artifact-integration';
const port = 3219;
const origin = `http://127.0.0.1:${port}`;
const database = createDatabaseClient(required('VERO_DATABASE_URL'));
const authorizationHeaders = {
  authorization: `Bearer ${apiKey}`,
  'x-tenant-id': tenantId
};
let api: ChildProcessWithoutNullStreams;
let output = '';

describe('compiled API store settings', () => {
  jest.setTimeout(60_000);

  beforeAll(async () => {
    await cleanTenant();
    output = '';
    api = spawn(process.execPath, ['dist/apps/api/main.cjs'], {
      env: {
        ...process.env,
        VERO_ENVIRONMENT: 'test',
        VERO_HTTP_HOST: '127.0.0.1',
        VERO_HTTP_PORT: String(port),
        VERO_LOG_LEVEL: 'silent',
        VERO_POSTGRES_ENABLED: 'true',
        VERO_DATABASE_URL: required('VERO_DATABASE_URL'),
        VERO_REDIS_ENABLED: 'false',
        VERO_RABBITMQ_ENABLED: 'false',
        VERO_OTEL_ENABLED: 'false',
        VERO_MVP_ENABLED: 'true',
        VERO_MVP_API_KEY: apiKey,
        VERO_MVP_TENANT_ID: tenantId
      }
    });
    api.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    api.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    await waitForApi();
  });

  afterAll(async () => {
    if (api && api.exitCode === null) {
      api.kill('SIGTERM');
      await Promise.race([
        new Promise<void>((resolve) => api.once('exit', () => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000))
      ]);
      if (api.exitCode === null) api.kill('SIGKILL');
    }
    await cleanTenant();
    await database.$disconnect();
  });

  it('executes GET and PUT through the bundled controller and real PostgreSQL repository', async () => {
    const getResponse = await fetch(`${origin}/v1/settings/store`, {
      headers: authorizationHeaders
    });
    expect(await responseBody(getResponse)).toEqual(
      expect.objectContaining({
        identity: expect.objectContaining({ displayName: tenantId }),
        operation: expect.objectContaining({ orderReceiptMode: 'MANUAL' })
      })
    );
    expect(getResponse.status).toBe(200);

    const input = {
      identity: {
        displayName: 'Santo Parma Artifact',
        phone: '(67) 3333-4444',
        whatsapp: '(67) 99999-0000',
        address: 'Rua do Teste, 10',
        addressComplement: null,
        neighborhood: 'Centro',
        city: 'Campo Grande',
        stateCode: 'MS',
        postalCode: '79000-000'
      },
      operation: {
        operationallyOpen: true,
        pickupEnabled: true,
        deliveryEnabled: false,
        preparationTimeMinMinutes: 25,
        preparationTimeMaxMinutes: 45,
        minimumOrderCents: 2_500,
        orderReceiptMode: 'AUTOMATIC',
        timezone: 'America/Campo_Grande'
      },
      delivery: { maxRadiusKm: null, baseFeeCents: 0, freeAboveCents: null },
      schedule: storeWeekdays.map((weekday) => ({
        weekday,
        enabled: false,
        opensAt: null,
        closesAt: null
      })),
      payments: {
        pixEnabled: true,
        paymentOnDeliveryEnabled: true,
        cashEnabled: true,
        cardOnDeliveryEnabled: true
      }
    };
    const putResponse = await fetch(`${origin}/v1/settings/store`, {
      method: 'PUT',
      headers: { ...authorizationHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });
    expect(await responseBody(putResponse)).toEqual(
      expect.objectContaining({
        identity: expect.objectContaining({ displayName: 'Santo Parma Artifact' }),
        operation: expect.objectContaining({ orderReceiptMode: 'AUTOMATIC' })
      })
    );
    expect(putResponse.status).toBe(200);

    const persisted = await database.$queryRawUnsafe<
      Array<{ displayName: string; orderReceiptMode: string }>
    >(
      `SELECT display_name AS "displayName", order_receipt_mode AS "orderReceiptMode"
       FROM store_settings WHERE tenant_id=$1`,
      tenantId
    );
    expect(persisted).toEqual([
      { displayName: 'Santo Parma Artifact', orderReceiptMode: 'AUTOMATIC' }
    ]);
    expect(output).not.toContain("Cannot read properties of undefined (reading 'get')");
    expect(output).not.toContain("Cannot read properties of undefined (reading 'authorize')");
  });
});

async function waitForApi(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (apiExited()) throw new Error(`Compiled API exited before readiness:\n${output}`);
    try {
      const response = await fetch(`${origin}/health/live`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Compiled API did not become ready:\n${output}`);
}

function apiExited(): boolean {
  return Boolean(api && api.exitCode !== null);
}

async function responseBody(response: Response): Promise<unknown> {
  const body = await response.json();
  if (!response.ok) throw new Error(`API returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function cleanTenant(): Promise<number> {
  return database.$executeRawUnsafe('DELETE FROM store_settings WHERE tenant_id=$1', tenantId);
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for integration tests`);
  return value;
}
