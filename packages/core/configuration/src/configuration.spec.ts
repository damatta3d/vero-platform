import { ConfigurationError, parseConfiguration } from './configuration.js';

describe(parseConfiguration.name, () => {
  it('creates immutable safe defaults', () => {
    const config = parseConfiguration({ VERO_ENVIRONMENT: 'test' });
    expect(config.http.port).toBe(3000);
    expect(config.postgres.enabled).toBe(false);
    expect(config.mvp.enabled).toBe(false);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('fails safely without exposing a secret value', () => {
    const secret = 'not-a-url-super-secret';
    expect(() =>
      parseConfiguration({
        VERO_POSTGRES_ENABLED: 'true',
        VERO_DATABASE_URL: secret
      })
    ).toThrow(ConfigurationError);
    try {
      parseConfiguration({
        VERO_POSTGRES_ENABLED: 'true',
        VERO_DATABASE_URL: secret
      });
    } catch (error) {
      expect(String(error)).not.toContain('super-secret');
    }
  });

  it('requires database, API key and tenant when the MVP is enabled', () => {
    expect(() =>
      parseConfiguration({
        VERO_ENVIRONMENT: 'test',
        VERO_MVP_ENABLED: 'true'
      })
    ).toThrow(ConfigurationError);

    const config = parseConfiguration({
      VERO_ENVIRONMENT: 'test',
      VERO_MVP_ENABLED: 'true',
      VERO_MVP_API_KEY: 'a-secure-development-key-with-24-chars',
      VERO_MVP_TENANT_ID: 'santo-parma',
      VERO_POSTGRES_ENABLED: 'true',
      VERO_DATABASE_URL: 'postgresql://vero:vero@localhost:5432/vero'
    });
    expect(config.mvp).toEqual({
      enabled: true,
      apiKey: 'a-secure-development-key-with-24-chars',
      tenantId: 'santo-parma'
    });
  });
});
