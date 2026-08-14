import { contentSecurityPolicyForPath } from './content-security-policy';

describe('contentSecurityPolicyForPath', () => {
  it.each(['/menu/santo-parma', '/pedido/order-id', '/mvp'])(
    'allows the application script required by %s',
    (path) => {
      expect(contentSecurityPolicyForPath(path)).toContain("script-src 'self' 'unsafe-inline'");
      expect(contentSecurityPolicyForPath(path)).toContain("script-src-attr 'none'");
    }
  );

  it('keeps Manager and APIs on the stricter default policy', () => {
    expect(contentSecurityPolicyForPath('/manager')).toContain("script-src 'self';");
    expect(contentSecurityPolicyForPath('/manager')).not.toContain(
      "script-src 'self' 'unsafe-inline'"
    );
    expect(contentSecurityPolicyForPath('/manager')).not.toContain('upgrade-insecure-requests');
    expect(contentSecurityPolicyForPath('/v1/menu/santo-parma')).not.toContain(
      "script-src 'self' 'unsafe-inline'"
    );
  });
});
