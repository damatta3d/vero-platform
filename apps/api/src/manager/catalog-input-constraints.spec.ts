import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';

const managerSource = readFileSync(resolve('apps/manager/src/main.js'), 'utf8');
const constraintsSource = readFileSync(
  resolve('apps/manager/src/catalog-input-constraints.js'),
  'utf8'
);
const managerControllerSource = readFileSync(
  resolve('apps/api/src/manager/manager-page.controller.ts'),
  'utf8'
);

function extractHelper(source: string, name: string): string {
  const helper = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm'));
  if (!helper) throw new Error(`Manager helper not found: ${name}`);
  return helper[0];
}

describe('Manager catalog numeric inputs', () => {
  it('accepts decimal menu prices and converts 44.90 to 4490 cents', () => {
    const context: Record<string, unknown> = {};
    new Script(
      `${extractHelper(managerSource, 'centsFromInput')}\nglobalThis.result=centsFromInput('44.90');`
    ).runInNewContext(context);

    expect(context['result']).toBe(4490);
  });

  it('applies decimal constraints to sale price and keeps sort order integer', () => {
    const salePrice = { min: '', step: '', inputMode: '' };
    const sortOrder = { step: '' };
    const root = {
      querySelector: (selector: string) =>
        selector === 'input[name="salePrice"]' ? salePrice : null,
      querySelectorAll: (selector: string) =>
        selector === 'input[name="sortOrder"]' ? [sortOrder] : []
    };
    const context: Record<string, unknown> = { root };
    new Script(
      `${extractHelper(constraintsSource, 'applyCatalogInputConstraints')}\napplyCatalogInputConstraints(root);`
    ).runInNewContext(context);

    expect(salePrice).toEqual({ min: '0', step: '0.01', inputMode: 'decimal' });
    expect(sortOrder.step).toBe('1');
  });

  it('bundles the input constraints with the Manager script response', () => {
    expect(managerControllerSource).toContain("readAsset('catalog-input-constraints.js')");
    expect(managerControllerSource).toContain('catalogInputConstraintsScript');
  });
});
