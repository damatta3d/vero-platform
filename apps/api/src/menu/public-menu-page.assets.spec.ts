import { Script } from 'node:vm';
import { publicMenuPage } from './public-menu-page.assets';

describe('publicMenuPage', () => {
  it('renders an RC-safe pickup checkout with complete cart controls', () => {
    const page = publicMenuPage('santo-parma-homolog');

    expect(page).toContain('data-increase');
    expect(page).toContain('data-decrease');
    expect(page).toContain('data-remove');
    expect(page).toContain('data-note');
    expect(page).toContain("method:'PAY_ON_DELIVERY'");
    expect(page).not.toContain('<option value="PIX">');
    expect(page).not.toContain('<option value="DELIVERY">');
    expect(page).toContain("customer,fulfillment:'PICKUP',address:null");
    expect(page).toContain('href="/pedido/');
  });

  it('generates syntactically valid JavaScript and escapes the slug', () => {
    const page = publicMenuPage('</script><script>alert(1)</script>');
    const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1];

    expect(script).toBeDefined();
    expect(script).toContain('\\u003c/script\\u003e');
    expect(() => new Script(script ?? '')).not.toThrow();
  });
});
