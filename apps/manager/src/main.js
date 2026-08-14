const statuses = [
  ['RECEIVED', 'Recebidos'],
  ['CONFIRMED', 'Confirmados'],
  ['PREPARING', 'Preparando'],
  ['READY', 'Prontos'],
  ['DISPATCHED', 'Em entrega']
];

const viewTitles = {
  dashboard: 'Visão geral',
  orders: 'Pedidos',
  catalog: 'Cardápio',
  settings: 'Configurações'
};

const state = {
  orders: new Map(),
  cursor: null,
  view: 'dashboard'
};

const board = document.querySelector('#board');
const refreshButton = document.querySelector('#refresh');
const connection = document.querySelector('#connection');
const dialog = document.querySelector('#order-dialog');
const orderDetail = document.querySelector('#order-detail');
const pageTitle = document.querySelector('#page-title');
const metrics = document.querySelector('#metrics');
const activeOrdersSummary = document.querySelector('#active-orders-summary');
const stageSummary = document.querySelector('#stage-summary');

const config = {
  apiBase: window.VERO_API_BASE || '',
  tenantId: window.VERO_TENANT_ID || localStorage.getItem('veroTenantId') || '',
  authorization: window.VERO_AUTHORIZATION || localStorage.getItem('veroAuthorization') || ''
};

function money(cents = 0) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function requestHeaders() {
  return {
    'content-type': 'application/json',
    'x-tenant-id': config.tenantId,
    authorization: config.authorization
  };
}

async function api(path, options = {}) {
  const response = await fetch(`${config.apiBase}${path}`, {
    ...options,
    headers: { ...requestHeaders(), ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `HTTP_${response.status}`);
  return payload;
}

function setView(view) {
  if (!viewTitles[view]) return;
  state.view = view;
  pageTitle.textContent = viewTitles[view];
  document.querySelectorAll('.view').forEach((element) => element.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((element) => element.classList.remove('active'));
  document.querySelector(`#${view}-view`)?.classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
}

function render() {
  renderBoard();
  renderDashboard();
}

function renderDashboard() {
  const orders = [...state.orders.values()];
  const totalCents = orders.reduce((sum, order) => sum + (order.totalCents || 0), 0);
  const preparing = orders.filter((order) => order.status === 'PREPARING').length;
  const delivery = orders.filter((order) => order.fulfillment === 'DELIVERY').length;

  metrics.innerHTML = [
    ['Pedidos ativos', orders.length],
    ['Em preparo', preparing],
    ['Entregas', delivery],
    ['Valor da fila', money(totalCents)]
  ]
    .map(
      ([label, value]) =>
        `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`
    )
    .join('');

  const recent = orders.slice(0, 5);
  activeOrdersSummary.innerHTML = recent.length
    ? recent
        .map(
          (order) => `
            <button class="summary-row" type="button" data-order-id="${escapeHtml(order.orderId)}">
              <span><strong>#${escapeHtml(order.orderId.slice(0, 8))}</strong><small>${escapeHtml(order.customerName)}</small></span>
              <span>${money(order.totalCents)}</span>
            </button>`
        )
        .join('')
    : '<p class="muted">Nenhum pedido ativo agora.</p>';

  activeOrdersSummary.querySelectorAll('[data-order-id]').forEach((button) => {
    button.addEventListener('click', () => openDetail(button.dataset.orderId));
  });

  stageSummary.innerHTML = statuses
    .map(([status, label]) => {
      const count = orders.filter((order) => order.status === status).length;
      return `<div class="stage-row"><span>${escapeHtml(label)}</span><strong>${count}</strong></div>`;
    })
    .join('');
}

function renderBoard() {
  board.innerHTML = '';
  for (const [status, label] of statuses) {
    const column = document.createElement('section');
    column.className = 'column';
    const orders = [...state.orders.values()].filter((order) => order.status === status);
    column.innerHTML = `<header><h3>${label}</h3><span>${orders.length}</span></header><div class="cards"></div>`;
    const cards = column.querySelector('.cards');
    for (const order of orders) cards.append(createCard(order));
    board.append(column);
  }
}

function createCard(order) {
  const article = document.createElement('article');
  article.className = 'order-card';
  article.innerHTML = `
    <button class="card-main" type="button">
      <div class="order-meta"><strong>#${escapeHtml(order.orderId.slice(0, 8))}</strong><span>${order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada'}</span></div>
      <h3>${escapeHtml(order.customerName)}</h3>
      <div class="order-meta"><span>${money(order.totalCents)}</span><span>${escapeHtml(order.paymentMethod)}</span></div>
    </button>
    <div class="actions"></div>`;
  article.querySelector('.card-main').addEventListener('click', () => openDetail(order.orderId));
  const actions = article.querySelector('.actions');
  for (const next of order.allowedTransitions || []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = actionLabel(next);
    button.addEventListener('click', () => transition(order.orderId, next));
    actions.append(button);
  }
  return article;
}

function actionLabel(status) {
  return (
    {
      CONFIRMED: 'Confirmar',
      PREPARING: 'Preparar',
      READY: 'Pronto',
      DISPATCHED: 'Despachar',
      COMPLETED: 'Concluir',
      CANCELLED: 'Cancelar'
    }[status] || status
  );
}

async function loadOrders({ incremental = true } = {}) {
  try {
    connection.textContent = 'Atualizando…';
    const query =
      incremental && state.cursor ? `?updatedAfter=${encodeURIComponent(state.cursor)}` : '';
    const result = await api(`/v1/kitchen/orders${query}`);
    for (const order of result.orders) state.orders.set(order.orderId, order);
    state.cursor = result.sync?.serverTime || new Date().toISOString();
    render();
    connection.textContent = 'Online';
  } catch (error) {
    connection.textContent = `Erro: ${error.message}`;
  }
}

async function transition(orderId, status) {
  try {
    await api(`/v1/kitchen/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const detail = await api(`/v1/kitchen/orders/${orderId}`);
    state.orders.set(orderId, detail.order);
    render();
  } catch (error) {
    connection.textContent = `Erro: ${error.message}`;
  }
}

async function openDetail(orderId) {
  try {
    const result = await api(`/v1/kitchen/orders/${orderId}`);
    const { order, items, history } = result;
    const itemRows = items
      .map(
        (item) =>
          `<li>${escapeHtml(item.quantity)}× ${escapeHtml(item.name)}${item.note ? ` — ${escapeHtml(item.note)}` : ''}</li>`
      )
      .join('');
    const historyRows = history
      .map(
        (entry) => `<li>${escapeHtml(entry.fromStatus || '—')} → ${escapeHtml(entry.toStatus)}</li>`
      )
      .join('');
    orderDetail.innerHTML = `
      <h2>Pedido #${escapeHtml(order.orderId.slice(0, 8))}</h2>
      <p><strong>${escapeHtml(order.customerName)}</strong> · ${escapeHtml(order.customerPhone)}</p>
      <p>${escapeHtml(order.fulfillment === 'DELIVERY' ? order.deliveryAddress || 'Entrega' : 'Retirada no local')}</p>
      <ul>${itemRows}</ul>
      <p><strong>Total: ${money(order.totalCents)}</strong></p>
      <p>Pagamento: ${escapeHtml(order.paymentMethod)} · ${escapeHtml(order.paymentStatus)}</p>
      <h3>Histórico</h3>
      <ol>${historyRows}</ol>`;
    dialog.showModal();
  } catch (error) {
    connection.textContent = `Erro: ${error.message}`;
  }
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

document.querySelectorAll('[data-open-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.openView));
});

refreshButton.addEventListener('click', () => loadOrders({ incremental: false }));
loadOrders({ incremental: false });
setInterval(() => loadOrders({ incremental: true }), 5000);
