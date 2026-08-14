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
  view: 'dashboard',
  menus: [],
  selectedMenuId: null,
  menuDetail: null,
  products: [],
  catalogForm: null
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
const menuList = document.querySelector('#menu-list');
const catalogDetail = document.querySelector('#catalog-detail');
const catalogRefresh = document.querySelector('#catalog-refresh');
const newMenuButton = document.querySelector('#new-menu');
const catalogDialog = document.querySelector('#catalog-dialog');
const catalogForm = document.querySelector('#catalog-form');
const catalogFormFields = document.querySelector('#catalog-form-fields');
const catalogFormError = document.querySelector('#catalog-form-error');
const catalogFormCancel = document.querySelector('#catalog-form-cancel');

const config = {
  apiBase: window.VERO_API_BASE || '',
  tenantId: window.VERO_TENANT_ID || localStorage.getItem('veroTenantId') || '',
  authorization: window.VERO_AUTHORIZATION || localStorage.getItem('veroAuthorization') || ''
};

function money(cents = 0) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
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
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
    throw new Error(message || payload.code || `HTTP_${response.status}`);
  }
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
  if (view === 'catalog') loadMenus();
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
    .map(([label, value]) => `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join('');

  const recent = orders.slice(0, 5);
  activeOrdersSummary.innerHTML = recent.length
    ? recent
        .map((order) => `<button class="summary-row" type="button" data-order-id="${escapeHtml(order.orderId)}"><span><strong>#${escapeHtml(order.orderId.slice(0, 8))}</strong><small>${escapeHtml(order.customerName)}</small></span><span>${money(order.totalCents)}</span></button>`)
        .join('')
    : '<p class="muted">Nenhum pedido ativo agora.</p>';
  activeOrdersSummary.querySelectorAll('[data-order-id]').forEach((button) => button.addEventListener('click', () => openDetail(button.dataset.orderId)));
  stageSummary.innerHTML = statuses
    .map(([status, label]) => `<div class="stage-row"><span>${escapeHtml(label)}</span><strong>${orders.filter((order) => order.status === status).length}</strong></div>`)
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
  article.innerHTML = `<button class="card-main" type="button"><div class="order-meta"><strong>#${escapeHtml(order.orderId.slice(0, 8))}</strong><span>${order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada'}</span></div><h3>${escapeHtml(order.customerName)}</h3><div class="order-meta"><span>${money(order.totalCents)}</span><span>${escapeHtml(order.paymentMethod)}</span></div></button><div class="actions"></div>`;
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
  return ({ CONFIRMED: 'Confirmar', PREPARING: 'Preparar', READY: 'Pronto', DISPATCHED: 'Despachar', COMPLETED: 'Concluir', CANCELLED: 'Cancelar' }[status] || status);
}

async function loadOrders({ incremental = true } = {}) {
  try {
    connection.textContent = 'Atualizando…';
    const query = incremental && state.cursor ? `?updatedAfter=${encodeURIComponent(state.cursor)}` : '';
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
    await api(`/v1/kitchen/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
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
    const itemRows = items.map((item) => `<li>${escapeHtml(item.quantity)}× ${escapeHtml(item.name)}${item.note ? ` — ${escapeHtml(item.note)}` : ''}</li>`).join('');
    const historyRows = history.map((entry) => `<li>${escapeHtml(entry.fromStatus || '—')} → ${escapeHtml(entry.toStatus)}</li>`).join('');
    orderDetail.innerHTML = `<h2>Pedido #${escapeHtml(order.orderId.slice(0, 8))}</h2><p><strong>${escapeHtml(order.customerName)}</strong> · ${escapeHtml(order.customerPhone)}</p><p>${escapeHtml(order.fulfillment === 'DELIVERY' ? order.deliveryAddress || 'Entrega' : 'Retirada no local')}</p><ul>${itemRows}</ul><p><strong>Total: ${money(order.totalCents)}</strong></p><p>Pagamento: ${escapeHtml(order.paymentMethod)} · ${escapeHtml(order.paymentStatus)}</p><h3>Histórico</h3><ol>${historyRows}</ol>`;
    dialog.showModal();
  } catch (error) {
    connection.textContent = `Erro: ${error.message}`;
  }
}

async function loadMenus() {
  try {
    menuList.innerHTML = '<p class="muted">Carregando…</p>';
    state.menus = await api('/v1/commerce/menus');
    if (state.selectedMenuId && !state.menus.some((menu) => menu.id === state.selectedMenuId)) state.selectedMenuId = null;
    if (!state.selectedMenuId && state.menus[0]) state.selectedMenuId = state.menus[0].id;
    renderMenus();
    if (state.selectedMenuId) await loadSelectedMenu();
    else catalogDetail.innerHTML = '<p class="muted">Nenhum menu cadastrado.</p>';
  } catch (error) {
    menuList.innerHTML = `<p class="muted">Não foi possível carregar: ${escapeHtml(error.message)}</p>`;
  }
}

function renderMenus() {
  menuList.innerHTML = state.menus.length
    ? state.menus.map((menu) => `<button class="menu-row${menu.id === state.selectedMenuId ? ' selected' : ''}" type="button" data-menu-id="${escapeHtml(menu.id)}"><span><strong>${escapeHtml(menu.name)}</strong><small>/${escapeHtml(menu.slug)}</small></span><span class="badge ${menu.published ? 'success' : ''}">${menu.published ? 'Publicado' : 'Rascunho'}</span></button>`).join('')
    : '<p class="muted">Nenhum menu cadastrado.</p>';
  menuList.querySelectorAll('[data-menu-id]').forEach((button) => button.addEventListener('click', async () => {
    state.selectedMenuId = button.dataset.menuId;
    renderMenus();
    await loadSelectedMenu();
  }));
}

async function loadSelectedMenu() {
  if (!state.selectedMenuId) return;
  try {
    state.menuDetail = await api(`/v1/commerce/menus/${state.selectedMenuId}`);
    renderCatalogDetail(state.menuDetail);
  } catch (error) {
    catalogDetail.innerHTML = `<p class="muted">Erro ao carregar detalhes: ${escapeHtml(error.message)}</p>`;
  }
}

function renderCatalogDetail(detail) {
  const menu = detail.menu;
  const categories = detail.categories || [];
  const items = detail.items || [];
  catalogDetail.innerHTML = `<div class="catalog-title"><div><p class="eyebrow">MENU</p><h2>${escapeHtml(menu.name)}</h2><p class="muted">${escapeHtml(menu.description || 'Sem descrição')}</p></div><div><button id="edit-menu" class="text-button" type="button">Editar</button><button id="new-category" class="text-button" type="button">Nova categoria</button><button id="toggle-publish" class="primary-button" type="button">${menu.published ? 'Despublicar' : 'Publicar'}</button></div></div><div class="catalog-categories">${categories.length ? categories.map((category) => {
    const categoryItems = items.filter((item) => item.categoryId === category.id);
    return `<section class="catalog-category"><div class="category-heading"><div><h3>${escapeHtml(category.name)}</h3><small class="muted">${category.active ? 'Ativa' : 'Inativa'}</small></div><div><button type="button" data-edit-category="${escapeHtml(category.id)}">Editar</button><button type="button" data-new-item="${escapeHtml(category.id)}">Adicionar item</button></div></div>${categoryItems.length ? categoryItems.map((item) => `<article class="catalog-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description || '')}</small></div><div class="catalog-item-actions"><strong>${money(item.priceCents)}</strong><span class="badge ${item.available && item.active ? 'success' : ''}">${item.active ? (item.available ? 'Disponível' : 'Pausado') : 'Inativo'}</span><button type="button" data-edit-item="${escapeHtml(item.id)}">Editar</button><button type="button" data-item-id="${escapeHtml(item.id)}" data-available="${item.available}">${item.available ? 'Pausar' : 'Ativar'}</button></div></article>`).join('') : '<p class="muted">Categoria sem itens.</p>'}</section>`;
  }).join('') : '<div class="empty-catalog"><p class="muted">Nenhuma categoria cadastrada neste menu.</p></div>'}</div>`;

  document.querySelector('#edit-menu')?.addEventListener('click', () => openMenuForm(menu));
  document.querySelector('#new-category')?.addEventListener('click', () => openCategoryForm());
  document.querySelector('#toggle-publish')?.addEventListener('click', () => updateMenu(menu.id, { published: !menu.published }));
  catalogDetail.querySelectorAll('[data-edit-category]').forEach((button) => button.addEventListener('click', () => openCategoryForm(categories.find((category) => category.id === button.dataset.editCategory))));
  catalogDetail.querySelectorAll('[data-new-item]').forEach((button) => button.addEventListener('click', () => openItemForm({ categoryId: button.dataset.newItem })));
  catalogDetail.querySelectorAll('[data-edit-item]').forEach((button) => button.addEventListener('click', () => openItemForm(items.find((item) => item.id === button.dataset.editItem))));
  catalogDetail.querySelectorAll('[data-item-id]').forEach((button) => button.addEventListener('click', () => updateItem(menu.id, button.dataset.itemId, { available: button.dataset.available !== 'true' })));
}

function field(name, label, type = 'text', value = '', options = '') {
  if (type === 'textarea') return `<label class="form-field"><span>${label}</span><textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
  if (type === 'select') return `<label class="form-field"><span>${label}</span><select name="${name}">${options}</select></label>`;
  return `<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" /></label>`;
}

function openCatalogForm(definition) {
  state.catalogForm = definition;
  catalogFormError.textContent = '';
  catalogFormFields.innerHTML = definition.html;
  catalogDialog.showModal();
}

function openMenuForm(menu = null) {
  openCatalogForm({
    kind: 'menu',
    entity: menu,
    html: `<div><p class="eyebrow">CARDÁPIO</p><h2>${menu ? 'Editar menu' : 'Novo menu'}</h2></div>${field('name', 'Nome', 'text', menu?.name || '')}${field('slug', 'Slug', 'text', menu?.slug || '')}${field('description', 'Descrição', 'textarea', menu?.description || '')}<div class="form-grid">${field('logoUrl', 'URL do logo', 'url', menu?.logoUrl || '')}${field('coverUrl', 'URL da capa', 'url', menu?.coverUrl || '')}</div>`
  });
}

function openCategoryForm(category = null) {
  openCatalogForm({
    kind: 'category',
    entity: category,
    html: `<div><p class="eyebrow">CATEGORIA</p><h2>${category ? 'Editar categoria' : 'Nova categoria'}</h2></div>${field('name', 'Nome', 'text', category?.name || '')}${field('description', 'Descrição', 'textarea', category?.description || '')}<div class="form-grid">${field('sortOrder', 'Ordem', 'number', category?.sortOrder ?? 0)}${category ? field('active', 'Status', 'select', '', `<option value="true" ${category.active ? 'selected' : ''}>Ativa</option><option value="false" ${!category.active ? 'selected' : ''}>Inativa</option>`) : ''}</div>`
  });
}

async function ensureProducts() {
  if (state.products.length) return state.products;
  const result = await api('/v1/catalog/products');
  state.products = Array.isArray(result) ? result : result.items || result.products || [];
  return state.products;
}

async function openItemForm(item = null) {
  try {
    const products = await ensureProducts();
    if (!products.length) throw new Error('Cadastre ao menos um produto no catálogo antes de adicioná-lo ao menu.');
    const categories = state.menuDetail?.categories || [];
    const productOptions = products.map((product) => `<option value="${escapeHtml(product.id)}" ${item?.catalogProductId === product.id ? 'selected' : ''}>${escapeHtml(product.name)} · ${money(product.salePriceCents || 0)}</option>`).join('');
    const categoryOptions = categories.map((category) => `<option value="${escapeHtml(category.id)}" ${(item?.categoryId || item?.categoryId) === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('');
    openCatalogForm({
      kind: 'item',
      entity: item,
      html: `<div><p class="eyebrow">ITEM DO MENU</p><h2>${item?.id ? 'Editar item' : 'Adicionar item'}</h2></div>${field('categoryId', 'Categoria', 'select', '', categoryOptions)}${item?.id ? '' : field('catalogProductId', 'Produto do catálogo', 'select', '', productOptions)}${field('displayName', 'Nome exibido', 'text', item?.displayName || '')}${field('description', 'Descrição', 'textarea', item?.description || '')}<div class="form-grid">${field('salePrice', 'Preço no menu (R$)', 'number', item?.salePriceCents != null ? (item.salePriceCents / 100).toFixed(2) : '')}${field('sortOrder', 'Ordem', 'number', item?.sortOrder ?? 0)}</div>${field('imageUrl', 'URL da imagem', 'url', item?.imageUrl || '')}${field('featured', 'Destaque', 'select', '', `<option value="false" ${!item?.featured ? 'selected' : ''}>Não</option><option value="true" ${item?.featured ? 'selected' : ''}>Sim</option>`)}${item?.id ? field('active', 'Status', 'select', '', `<option value="true" ${item.active ? 'selected' : ''}>Ativo</option><option value="false" ${!item.active ? 'selected' : ''}>Inativo</option>`) : ''}`
    });
  } catch (error) {
    connection.textContent = `Erro: ${error.message}`;
  }
}

function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function optional(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : undefined;
}

function centsFromInput(value) {
  const normalized = String(value ?? '').replace(',', '.').trim();
  if (!normalized) return undefined;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Preço inválido.');
  return Math.round(amount * 100);
}

async function submitCatalogForm(event) {
  event.preventDefault();
  if (!state.catalogForm) return;
  const values = formDataObject(catalogForm);
  catalogFormError.textContent = '';
  try {
    const { kind, entity } = state.catalogForm;
    if (kind === 'menu') {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: optional(values.description),
        logoUrl: optional(values.logoUrl),
        coverUrl: optional(values.coverUrl)
      };
      if (entity?.id) await api(`/v1/commerce/menus/${entity.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else {
        const created = await api('/v1/commerce/menus', { method: 'POST', body: JSON.stringify(payload) });
        state.selectedMenuId = created.id;
      }
      await loadMenus();
    }
    if (kind === 'category') {
      const payload = {
        name: values.name.trim(),
        description: optional(values.description),
        sortOrder: Number(values.sortOrder || 0)
      };
      if (entity?.id) {
        payload.active = values.active === 'true';
        await api(`/v1/commerce/menus/${state.selectedMenuId}/categories/${entity.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else await api(`/v1/commerce/menus/${state.selectedMenuId}/categories`, { method: 'POST', body: JSON.stringify(payload) });
      await loadSelectedMenu();
    }
    if (kind === 'item') {
      const payload = {
        categoryId: values.categoryId,
        displayName: optional(values.displayName),
        description: optional(values.description),
        imageUrl: optional(values.imageUrl),
        salePriceCents: centsFromInput(values.salePrice),
        sortOrder: Number(values.sortOrder || 0),
        featured: values.featured === 'true'
      };
      if (entity?.id) {
        payload.active = values.active === 'true';
        await api(`/v1/commerce/menus/${state.selectedMenuId}/items/${entity.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        payload.catalogProductId = values.catalogProductId;
        await api(`/v1/commerce/menus/${state.selectedMenuId}/items`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await loadSelectedMenu();
    }
    catalogDialog.close();
    state.catalogForm = null;
    connection.textContent = 'Online';
  } catch (error) {
    catalogFormError.textContent = error.message;
  }
}

async function updateMenu(menuId, patch) {
  try {
    await api(`/v1/commerce/menus/${menuId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await loadMenus();
  } catch (error) {
    connection.textContent = `Erro: ${error.message}`;
  }
}

async function updateItem(menuId, itemId, patch) {
  try {
    await api(`/v1/commerce/menus/${menuId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await loadSelectedMenu();
  } catch (error) {
    connection.textContent = `Erro: ${error.message}`;
  }
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('[data-open-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.openView)));
refreshButton.addEventListener('click', () => state.view === 'catalog' ? loadMenus() : loadOrders({ incremental: false }));
catalogRefresh.addEventListener('click', loadMenus);
newMenuButton.addEventListener('click', () => openMenuForm());
catalogForm.addEventListener('submit', submitCatalogForm);
catalogFormCancel.addEventListener('click', () => catalogDialog.close());
loadOrders({ incremental: false });
setInterval(() => loadOrders({ incremental: true }), 5000);
