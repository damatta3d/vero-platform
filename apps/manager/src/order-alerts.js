/* global document, localStorage, MutationObserver, FileReader, window, setInterval, clearInterval */

const ALERT_VERSION = 1;
const DEFAULT_ALERTS = {
  version: ALERT_VERSION,
  enabled: false,
  manualSound: 'PHONE',
  automaticSound: 'CHIME',
  manualCustom: null,
  automaticCustom: null
};

let audioContext = null;
let manualTimer = null;
let lastAutomaticSignature = '';
let boardInitialized = false;

function tenantId() {
  return window.VERO_TENANT_ID || localStorage.getItem('vero_tenant') || localStorage.getItem('veroTenantId') || 'santo-parma';
}

function storageKey() {
  return `vero_order_alerts:${tenantId()}`;
}

function loadConfig() {
  try {
    return { ...DEFAULT_ALERTS, ...JSON.parse(localStorage.getItem(storageKey()) || '{}') };
  } catch {
    return { ...DEFAULT_ALERTS };
  }
}

function saveConfig(next) {
  localStorage.setItem(storageKey(), JSON.stringify({ ...next, version: ALERT_VERSION }));
}

function context() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Áudio não é suportado neste navegador.');
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function tone(frequency, start, duration, volume = 0.12, type = 'sine') {
  const ctx = context();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function synth(kind) {
  const ctx = context();
  const now = ctx.currentTime + 0.02;
  if (kind === 'PHONE') {
    [0, 0.42].forEach((offset) => {
      tone(440, now + offset, 0.28, 0.12, 'sine');
      tone(480, now + offset, 0.28, 0.08, 'sine');
    });
    return;
  }
  if (kind === 'BELL') {
    tone(880, now, 0.55, 0.14, 'sine');
    tone(1320, now, 0.38, 0.07, 'sine');
    return;
  }
  tone(660, now, 0.16, 0.1, 'sine');
  tone(880, now + 0.18, 0.28, 0.12, 'sine');
}

function playDataUrl(dataUrl) {
  if (!dataUrl) return false;
  const audio = new Audio(dataUrl);
  audio.volume = 0.8;
  audio.play().catch(() => {});
  return true;
}

function playAlert(mode, config = loadConfig()) {
  if (!config.enabled) return;
  const custom = mode === 'manual' ? config.manualCustom : config.automaticCustom;
  const selected = mode === 'manual' ? config.manualSound : config.automaticSound;
  if (selected === 'CUSTOM' && playDataUrl(custom)) return;
  synth(selected === 'CUSTOM' ? (mode === 'manual' ? 'PHONE' : 'CHIME') : selected);
}

function columnCards(label) {
  return [...document.querySelectorAll('#board .column')]
    .filter((column) => column.querySelector('header h3')?.textContent.trim() === label)
    .flatMap((column) => [...column.querySelectorAll('.order-card')]);
}

function cardSignature(card) {
  return card.querySelector('.order-meta strong')?.textContent.trim() || card.textContent.trim().slice(0, 80);
}

function syncAlerts() {
  const config = loadConfig();
  const received = columnCards('Recebidos');
  const confirmed = columnCards('Confirmados');

  if (!boardInitialized) {
    boardInitialized = true;
    lastAutomaticSignature = confirmed.map(cardSignature).join('|');
  }

  if (config.enabled && received.length) {
    if (!manualTimer) {
      playAlert('manual', config);
      manualTimer = setInterval(() => {
        const current = loadConfig();
        if (!current.enabled || columnCards('Recebidos').length === 0) {
          clearInterval(manualTimer);
          manualTimer = null;
          return;
        }
        playAlert('manual', current);
      }, 6500);
    }
  } else if (manualTimer) {
    clearInterval(manualTimer);
    manualTimer = null;
  }

  const automaticSignature = confirmed.map(cardSignature).join('|');
  if (
    config.enabled &&
    boardInitialized &&
    automaticSignature &&
    automaticSignature !== lastAutomaticSignature
  ) {
    const previous = new Set(lastAutomaticSignature.split('|').filter(Boolean));
    if (confirmed.some((card) => !previous.has(cardSignature(card)))) playAlert('automatic', config);
  }
  lastAutomaticSignature = automaticSignature;
}

function readAudioFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith('audio/')) return reject(new Error('Selecione um arquivo de áudio.'));
    if (file.size > 900 * 1024) return reject(new Error('O áudio deve ter no máximo 900 KB.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .alert-settings{grid-column:1/-1}.alert-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.alert-choice{display:grid;gap:8px}.alert-choice select,.alert-choice input[type=file]{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:9px;background:#fff}.alert-actions{display:flex;gap:8px;flex-wrap:wrap}.alert-note{font-size:12px;color:#6b7280;margin:0}.alert-status{min-height:18px;margin:0;color:#166534}@media(max-width:700px){.alert-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function injectSettings() {
  const grid = document.querySelector('#settings-form .settings-grid');
  if (!grid || document.querySelector('#order-alert-settings')) return;
  const section = document.createElement('section');
  section.id = 'order-alert-settings';
  section.className = 'panel settings-section alert-settings';
  section.innerHTML = `
    <div class="panel-heading"><div><p class="eyebrow">ALERTAS</p><h2>Sons de novos pedidos</h2></div></div>
    <label class="toggle-row"><span><strong>Alertas sonoros</strong><small>Avise a operação quando um pedido exigir atenção.</small></span><input id="alert-enabled" type="checkbox" /></label>
    <div class="alert-grid">
      <div class="alert-choice"><strong>Pedido aguardando confirmação</strong><small class="muted">Repete enquanto houver pedido em Recebidos.</small><select id="manual-sound"><option value="PHONE">Telefone</option><option value="BELL">Campainha</option><option value="CHIME">Aviso curto</option><option value="CUSTOM">MP3 personalizado</option></select><input id="manual-file" type="file" accept="audio/*" /><button id="test-manual" class="text-button" type="button">Testar som</button></div>
      <div class="alert-choice"><strong>Pedido recebido automaticamente</strong><small class="muted">Toca uma vez quando o pedido entra confirmado.</small><select id="automatic-sound"><option value="CHIME">Aviso curto</option><option value="BELL">Campainha</option><option value="PHONE">Telefone</option><option value="CUSTOM">MP3 personalizado</option></select><input id="automatic-file" type="file" accept="audio/*" /><button id="test-automatic" class="text-button" type="button">Testar som</button></div>
    </div>
    <div class="alert-actions"><button id="save-alerts" class="primary-button" type="button">Salvar alertas</button></div>
    <p class="alert-note">Os sons ficam salvos neste navegador, separados por estabelecimento. Arquivos personalizados: até 900 KB.</p>
    <p id="alert-status" class="alert-status" aria-live="polite"></p>`;
  grid.append(section);

  const current = loadConfig();
  const enabled = section.querySelector('#alert-enabled');
  const manual = section.querySelector('#manual-sound');
  const automatic = section.querySelector('#automatic-sound');
  const status = section.querySelector('#alert-status');
  enabled.checked = current.enabled;
  manual.value = current.manualSound;
  automatic.value = current.automaticSound;

  section.querySelector('#test-manual').addEventListener('click', () => {
    playAlert('manual', { ...loadConfig(), enabled: true, manualSound: manual.value });
  });
  section.querySelector('#test-automatic').addEventListener('click', () => {
    playAlert('automatic', { ...loadConfig(), enabled: true, automaticSound: automatic.value });
  });
  section.querySelector('#save-alerts').addEventListener('click', async () => {
    try {
      const previous = loadConfig();
      const manualFile = section.querySelector('#manual-file').files[0];
      const automaticFile = section.querySelector('#automatic-file').files[0];
      const next = {
        ...previous,
        enabled: enabled.checked,
        manualSound: manual.value,
        automaticSound: automatic.value,
        manualCustom: manualFile ? await readAudioFile(manualFile) : previous.manualCustom,
        automaticCustom: automaticFile ? await readAudioFile(automaticFile) : previous.automaticCustom
      };
      if (next.manualSound === 'CUSTOM' && !next.manualCustom) throw new Error('Envie o áudio personalizado do pedido manual.');
      if (next.automaticSound === 'CUSTOM' && !next.automaticCustom) throw new Error('Envie o áudio personalizado do pedido automático.');
      saveConfig(next);
      if (next.enabled) context();
      status.textContent = 'Alertas sonoros salvos para este estabelecimento.';
      syncAlerts();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

injectStyles();
injectSettings();
const board = document.querySelector('#board');
if (board) new MutationObserver(syncAlerts).observe(board, { childList: true, subtree: true });
document.addEventListener('click', () => {
  if (loadConfig().enabled) {
    try {
      context();
    } catch {
      // The settings test action will surface unsupported audio explicitly.
    }
  }
}, { once: true });
