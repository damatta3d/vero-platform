/* global document, MutationObserver */

function applyCatalogInputConstraints(root = document.querySelector('#catalog-form-fields')) {
  if (!root) return;

  const salePrice = root.querySelector('input[name="salePrice"]');
  if (salePrice) {
    salePrice.min = '0';
    salePrice.step = '0.01';
    salePrice.inputMode = 'decimal';
  }

  root.querySelectorAll('input[name="sortOrder"]').forEach((input) => {
    input.step = '1';
  });
}

const catalogFields = document.querySelector('#catalog-form-fields');
if (catalogFields) {
  applyCatalogInputConstraints(catalogFields);
  new MutationObserver(() => applyCatalogInputConstraints(catalogFields)).observe(catalogFields, {
    childList: true,
    subtree: true
  });
}
