import { Script } from 'node:vm';
import { publicTrackingPage } from './public-tracking-page.controller';

describe('publicTrackingPage', () => {
  it('renders the customer-safe canonical status sequence', () => {
    const page = publicTrackingPage('12345678-1234-1234-1234-123456789012', 'opaque-token');

    expect(page).toContain('RECEIVED');
    expect(page).toContain('CONFIRMED');
    expect(page).toContain('PREPARING');
    expect(page).toContain('READY');
    expect(page).not.toContain('customerName');
    expect(page).not.toContain('customerPhone');
  });

  it('generates syntactically valid JavaScript without reflecting markup', () => {
    const page = publicTrackingPage('</script>', '</script><script>alert(1)</script>');
    const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1];

    expect(page).toContain('&lt;/scri');
    expect(script).toBeDefined();
    expect(script).toContain('\\u003c/script\\u003e');
    expect(() => new Script(script ?? '')).not.toThrow();
  });
});
