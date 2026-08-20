/* global document, MutationObserver */

const statusLabels = {
  RECEIVED: 'Recebido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DISPATCHED: 'Em entrega',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  PENDING: 'Pendente',
  PAID: 'Pago',
  FAILED: 'Falhou',
  REFUNDED: 'Estornado'
};

function fiveDigitFromHex(hex) {
  const value = Number.parseInt(hex, 16);
  return String(Number.isFinite(value) ? value % 100000 : 0).padStart(5, '0');
}

function localizeTextNode(node) {
  let text = node.nodeValue || '';
  text = text.replace(/#([0-9a-f]{8})\b/gi, (_, hex) => `#${fiveDigitFromHex(hex)}`);
  for (const [status, label] of Object.entries(statusLabels)) {
    text = text.replace(new RegExp(`\\b${status}\\b`, 'g'), label);
  }
  node.nodeValue = text;
}

function enhanceOrderDetail(root) {
  if (!root || root.dataset.displayEnhanced === 'true') return;
  const heading = root.querySelector('h2');
  if (!heading?.textContent?.startsWith('Pedido #')) return;

  root.querySelectorAll('ul li').forEach((item) => {
    const text = item.textContent || '';
    const separator = text.indexOf(' — ');
    if (separator < 0) return;
    const product = text.slice(0, separator);
    const note = text.slice(separator + 3).trim();
    if (!note) return;
    item.textContent = '';
    const productLine = document.createElement('span');
    productLine.textContent = product;
    const noteLine = document.createElement('small');
    noteLine.className = 'order-item-note';
    noteLine.textContent = `Observação: ${note}`;
    item.append(productLine, noteLine);
  });

  root.dataset.displayEnhanced = 'true';
}

function enhance(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(localizeTextNode);
  enhanceOrderDetail(document.querySelector('#order-detail'));
}

const style = document.createElement('style');
style.textContent = `.order-item-note{display:block;margin-top:.3rem;font-weight:600;color:#92400e;background:#fffbeb;border-left:3px solid #f59e0b;padding:.35rem .55rem;border-radius:.25rem}`;
document.head.append(style);

enhance();
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node);
      else if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
    });
  }
  enhanceOrderDetail(document.querySelector('#order-detail'));
}).observe(document.body, { childList: true, subtree: true });
