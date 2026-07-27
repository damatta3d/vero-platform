import { ConfigurationError, parseConfiguration } from './configuration.js';

describe(parseConfiguration.name, () => {
  it('creates immutable safe defaults', () => {
    const config = parseConfiguration({ VERO_ENVIRONMENT: 'test' });
    expect(config.http.port).toBe(3000);
    expect(config.postgres.enabled).toBe(false);
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
});
