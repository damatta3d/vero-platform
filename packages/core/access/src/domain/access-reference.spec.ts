import { InvalidAccessReferenceError } from './access-errors.js';
import { actionRef, resourceRef } from './access-reference.js';

describe('AccessReference', () => {
  it('normalizes qualified references', () => {
    expect(actionRef(' Catalog.Product.Create ').value).toBe('catalog.product.create');
    expect(resourceRef('catalog.product').value).toBe('catalog.product');
  });

  it.each(['', 'create', 'catalog product', 'catalog..product'])(
    'rejects unqualified reference %p',
    (value) => {
      expect(() => actionRef(value)).toThrow(InvalidAccessReferenceError);
    }
  );
});
