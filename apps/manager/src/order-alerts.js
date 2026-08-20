/* global document, localStorage, MutationObserver, indexedDB, URL, window, setInterval, clearInterval, Audio */

const ALERT_VERSION = 1;
const DEFAULT_ALERTS = {
  version: ALERT_VERSION,
  enabled: false,
  manualSound: 'PHONE',
  automaticSound: 'CHIME',
  manualCustomName: null,
  automaticCustomName: null
};

let audioContext = null;
let manualTimer = null;
let lastAutomaticSignature = '';
let boardInitialized = false;

function tenantId() {
  return (
    window.VERO_TENANT_ID ||
    localStorage.getItem('vero_tenant') ||
    localStorage.getItem('veroTenantId') ||
    'santo-parma'
  );
}

function storageKey() {
  return `vero_order_alerts:${tenantId()}`;
}

function loadConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey()) || '{}');
    delete stored.manualCustom;
    delete stored.automaticCustom;
    return { ...DEFAULT_ALERTS, ...stored };
  } catch {
    return { ...DEFAULT_ALERTS };
  }
}

function saveConfig(next) {
  const persisted = {
    version: ALERT_VERSION,
    enabled: next.enabled,
    manualSound: next.manualSound,
    automaticSound: next.automaticSound,
    manualCustomName: next.manualCustomName || null,
    automaticCustomName: next.automaticCustomName || null
  };
  localStorage.setItem(storageKey(), JSON.stringify(persisted));
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

function audioStorageKey(mode) {
  return `${tenantId()}:${mode}`;
}

function openAudioDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador não permite salvar áudio personalizado.'));
      return;
    }
    const request = indexedDB.open('vero_order_alerts', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('audio')) {
        request.result.createObjectStore('audio');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error('Não foi possível acessar os áudios salvos neste navegador.'));
  });
}

async function storeAudioBlob(mode, blob) {
  const database = await openAudioDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('audio', 'readwrite');
      transaction.objectStore('audio').put(blob, audioStorageKey(mode));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(new Error('Não foi possível salvar o áudio.'));
      transaction.onabort = () => reject(new Error('Não foi possível salvar o áudio.'));
    });
  } finally {
    database.close();
  }
}

async function loadAudioBlob(mode) {
  const database = await openAudioDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('audio', 'readonly');
      const request = transaction.objectStore('audio').get(audioStorageKey(mode));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Não foi possível carregar o áudio salvo.'));
    });
  } finally {
    database.close();
  }
}

async function playAudioBlob(blob) {
  if (!blob) throw new Error('Nenhum áudio personalizado foi salvo.');
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = 0.8;
  audio.src = objectUrl;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    URL.revokeObjectURL(objectUrl);
  };
  audio.addEventListener('ended', release, { once: true });
  audio.addEventListener('error', release, { once: true });
  try {
    await audio.play();
    return true;
  } catch {
    release();
    throw new Error('Não foi possível reproduzir o arquivo. Verifique se o MP3 ou WAV é válido.');
  }
}

async function playAlert(mode, config = loadConfig(), previewBlob = null) {
  if (!config.enabled) return;
  const selected = mode === 'manual' ? config.manualSound : config.automaticSound;
  if (selected === 'CUSTOM') {
    await playAudioBlob(previewBlob || (await loadAudioBlob(mode)));
    return;
  }
  synth(selected);
}

function columnCards(label) {
  return [...document.querySelectorAll('#board .column')]
    .filter((column) => column.querySelector('header h3')?.textContent.trim() === label)
    .flatMap((column) => [...column.querySelectorAll('.order-card')]);
}

function cardSignature(card) {
  return (
    card.querySelector('.order-meta strong')?.textContent.trim() ||
    card.textContent.trim().slice(0, 80)
  );
}

function safePlayAlert(mode, config) {
  playAlert(mode, config).catch((error) => console.error('[VERO order alert]', error));
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
      safePlayAlert('manual', config);
      manualTimer = setInterval(() => {
        const current = loadConfig();
        if (!current.enabled || columnCards('Recebidos').length === 0) {
          clearInterval(manualTimer);
          manualTimer = null;
          return;
        }
        safePlayAlert('manual', current);
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
    if (confirmed.some((card) => !previous.has(cardSignature(card)))) {
      safePlayAlert('automatic', config);
    }
  }
  lastAutomaticSignature = automaticSignature;
}

function validateAudioFile(file) {
  if (!file) return null;
  const extension = file.name.toLowerCase().match(/\.(mp3|wav)$/)?.[1];
  const mime = String(file.type || '').toLowerCase();
  const validMime =
    extension === 'mp3'
      ? !mime || mime === 'audio/mpeg' || mime === 'audio/mp3'
      : extension === 'wav'
        ? !mime || ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'].includes(mime)
        : false;
  if (!extension || !validMime) {
    throw new Error('Selecione um arquivo MP3 ou WAV válido.');
  }
  if (file.size > 900 * 1024) throw new Error('O áudio deve ter no máximo 900 KB.');
  if (file.size < 1) throw new Error('O arquivo de áudio está vazio.');
  return file;
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
      <div class="alert-choice"><strong>Pedido aguardando confirmação</strong><small class="muted">Repete enquanto houver pedido em Recebidos.</small><select id="manual-sound"><option value="PHONE">Telefone</option><option value="BELL">Campainha</option><option value="CHIME">Aviso curto</option><option value="CUSTOM">MP3 ou WAV personalizado</option></select><input id="manual-file" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav" /><small id="manual-file-name" class="muted"></small><button id="test-manual" class="text-button" type="button">Testar som</button></div>
      <div class="alert-choice"><strong>Pedido recebido automaticamente</strong><small class="muted">Toca uma vez quando o pedido entra confirmado.</small><select id="automatic-sound"><option value="CHIME">Aviso curto</option><option value="BELL">Campainha</option><option value="PHONE">Telefone</option><option value="CUSTOM">MP3 ou WAV personalizado</option></select><input id="automatic-file" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav" /><small id="automatic-file-name" class="muted"></small><button id="test-automatic" class="text-button" type="button">Testar som</button></div>
    </div>
    <div class="alert-actions"><button id="save-alerts" class="primary-button" type="button">Salvar alertas</button></div>
    <p class="alert-note">Os sons ficam salvos neste navegador, separados por estabelecimento. Arquivos MP3 ou WAV: até 900 KB.</p>
    <p id="alert-status" class="alert-status" aria-live="polite"></p>`;
  grid.append(section);

  const current = loadConfig();
  const enabled = section.querySelector('#alert-enabled');
  const manual = section.querySelector('#manual-sound');
  const automatic = section.querySelector('#automatic-sound');
  const manualFileInput = section.querySelector('#manual-file');
  const automaticFileInput = section.querySelector('#automatic-file');
  const manualFileName = section.querySelector('#manual-file-name');
  const automaticFileName = section.querySelector('#automatic-file-name');
  const status = section.querySelector('#alert-status');
  enabled.checked = current.enabled;
  manual.value = current.manualSound;
  automatic.value = current.automaticSound;
  manualFileName.textContent = current.manualCustomName
    ? `Salvo: ${current.manualCustomName}`
    : 'Nenhum arquivo salvo.';
  automaticFileName.textContent = current.automaticCustomName
    ? `Salvo: ${current.automaticCustomName}`
    : 'Nenhum arquivo salvo.';

  async function testSound(mode) {
    try {
      status.textContent = '';
      const select = mode === 'manual' ? manual : automatic;
      const fileInput = mode === 'manual' ? manualFileInput : automaticFileInput;
      const previous = loadConfig();
      const selectedFile = validateAudioFile(fileInput.files[0]);
      const soundKey = mode === 'manual' ? 'manualSound' : 'automaticSound';
      const preview = {
        ...previous,
        enabled: true,
        [soundKey]: select.value
      };
      await playAlert(mode, preview, selectedFile);
      status.textContent = 'Som reproduzido com sucesso.';
    } catch (error) {
      status.textContent = error.message;
    }
  }

  section.querySelector('#test-manual').addEventListener('click', () => testSound('manual'));
  section.querySelector('#test-automatic').addEventListener('click', () => testSound('automatic'));
  section.querySelector('#save-alerts').addEventListener('click', async () => {
    try {
      const previous = loadConfig();
      const manualFile = validateAudioFile(manualFileInput.files[0]);
      const automaticFile = validateAudioFile(automaticFileInput.files[0]);
      if (manualFile) await storeAudioBlob('manual', manualFile);
      if (automaticFile) await storeAudioBlob('automatic', automaticFile);
      const next = {
        ...previous,
        enabled: enabled.checked,
        manualSound: manual.value,
        automaticSound: automatic.value,
        manualCustomName: manualFile ? manualFile.name : previous.manualCustomName,
        automaticCustomName: automaticFile ? automaticFile.name : previous.automaticCustomName
      };
      if (next.manualSound === 'CUSTOM' && !(manualFile || (await loadAudioBlob('manual')))) {
        throw new Error('Envie o áudio personalizado do pedido manual.');
      }
      if (
        next.automaticSound === 'CUSTOM' &&
        !(automaticFile || (await loadAudioBlob('automatic')))
      ) {
        throw new Error('Envie o áudio personalizado do pedido automático.');
      }
      saveConfig(next);
      manualFileName.textContent = next.manualCustomName
        ? `Salvo: ${next.manualCustomName}`
        : 'Nenhum arquivo salvo.';
      automaticFileName.textContent = next.automaticCustomName
        ? `Salvo: ${next.automaticCustomName}`
        : 'Nenhum arquivo salvo.';
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
document.addEventListener(
  'click',
  () => {
    if (loadConfig().enabled) {
      try {
        context();
      } catch {
        // The settings test action will surface unsupported audio explicitly.
      }
    }
  },
  { once: true }
);
