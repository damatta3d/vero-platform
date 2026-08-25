/* global document, localStorage, MutationObserver, indexedDB, URL, window, setInterval, clearInterval, Audio */

const ALERT_VERSION = 2;
const DEFAULT_ALERTS = {
  version: ALERT_VERSION,
  enabled: false,
  volume: 90,
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

function clampVolume(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_ALERTS.volume;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function loadConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey()) || '{}');
    delete stored.manualCustom;
    delete stored.automaticCustom;
    return {
      ...DEFAULT_ALERTS,
      ...stored,
      version: ALERT_VERSION,
      volume: clampVolume(stored.volume ?? DEFAULT_ALERTS.volume)
    };
  } catch {
    return { ...DEFAULT_ALERTS };
  }
}

function saveConfig(next) {
  const persisted = {
    version: ALERT_VERSION,
    enabled: next.enabled,
    volume: clampVolume(next.volume),
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
  return audioContext;
}

async function ensureAudioReady() {
  const ctx = context();
  if (ctx.state === 'suspended') await ctx.resume();
  if (ctx.state !== 'running') {
    throw new Error('O navegador bloqueou o áudio. Clique em “Ativar som” e tente novamente.');
  }
  return ctx;
}

function scaledGain(baseVolume, config) {
  return Math.max(0.0001, Math.min(1, baseVolume * (clampVolume(config.volume) / 100)));
}

function tone(ctx, frequency, start, duration, volume, type = 'sine') {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

async function synth(kind, config) {
  const ctx = await ensureAudioReady();
  const now = ctx.currentTime + 0.02;
  if (kind === 'PHONE') {
    [0, 0.42].forEach((offset) => {
      tone(ctx, 440, now + offset, 0.3, scaledGain(0.72, config), 'square');
      tone(ctx, 480, now + offset, 0.3, scaledGain(0.52, config), 'sine');
    });
    return;
  }
  if (kind === 'BELL') {
    tone(ctx, 880, now, 0.58, scaledGain(0.78, config), 'sine');
    tone(ctx, 1320, now, 0.42, scaledGain(0.52, config), 'sine');
    return;
  }
  tone(ctx, 660, now, 0.18, scaledGain(0.62, config), 'sine');
  tone(ctx, 880, now + 0.2, 0.3, scaledGain(0.72, config), 'sine');
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

async function playAudioBlob(blob, config) {
  if (!blob) throw new Error('Nenhum áudio personalizado foi salvo.');
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = clampVolume(config.volume) / 100;
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
    throw new Error('Não foi possível reproduzir o arquivo. Clique em “Ativar som” e tente novamente.');
  }
}

async function playAlert(mode, config = loadConfig(), previewBlob = null) {
  if (!config.enabled) return;
  if (clampVolume(config.volume) === 0) return;
  const selected = mode === 'manual' ? config.manualSound : config.automaticSound;
  if (selected === 'CUSTOM') {
    await playAudioBlob(previewBlob || (await loadAudioBlob(mode)), config);
    return;
  }
  await synth(selected, config);
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

function audioStateLabel() {
  if (!audioContext) return 'Som aguardando ativação';
  return audioContext.state === 'running' ? 'Som ativo' : 'Som aguardando ativação';
}

function refreshAudioState(section = document.querySelector('#order-alert-settings')) {
  const label = section?.querySelector('#audio-state');
  const activate = section?.querySelector('#activate-audio');
  if (!label || !activate) return;
  const active = audioContext?.state === 'running';
  label.textContent = active ? 'Som ativo' : 'Som aguardando ativação';
  label.classList.toggle('active', Boolean(active));
  activate.hidden = Boolean(active);
}

function safePlayAlert(mode, config) {
  playAlert(mode, config).catch((error) => {
    console.error('[VERO order alert]', error);
    const status = document.querySelector('#alert-status');
    if (status) status.textContent = error.message;
    refreshAudioState();
  });
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
    .alert-settings{grid-column:1/-1}.alert-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.alert-choice{display:grid;gap:8px}.alert-choice select,.alert-choice input[type=file]{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:9px;background:#fff}.alert-volume{display:grid;gap:8px;padding:12px 0}.alert-volume-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.alert-volume input[type=range]{width:100%}.alert-volume output{min-width:48px;text-align:right;font-weight:700}.alert-audio-state{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.alert-state{font-size:13px;font-weight:700;color:#92400e}.alert-state.active{color:#166534}.alert-actions{display:flex;gap:8px;flex-wrap:wrap}.alert-note{font-size:12px;color:#6b7280;margin:0}.alert-status{min-height:18px;margin:0;color:#166534}@media(max-width:700px){.alert-grid{grid-template-columns:1fr}}
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
    <div class="alert-audio-state"><span id="audio-state" class="alert-state">${audioStateLabel()}</span><button id="activate-audio" class="text-button" type="button">Ativar som</button></div>
    <label class="alert-volume"><strong>Volume dos alertas</strong><div class="alert-volume-row"><input id="alert-volume" type="range" min="0" max="100" step="1" /><output id="alert-volume-value"></output></div><small class="muted">Ajuste o volume usado nos alertas reais e nos testes.</small></label>
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
  const volume = section.querySelector('#alert-volume');
  const volumeValue = section.querySelector('#alert-volume-value');
  const manual = section.querySelector('#manual-sound');
  const automatic = section.querySelector('#automatic-sound');
  const manualFileInput = section.querySelector('#manual-file');
  const automaticFileInput = section.querySelector('#automatic-file');
  const manualFileName = section.querySelector('#manual-file-name');
  const automaticFileName = section.querySelector('#automatic-file-name');
  const status = section.querySelector('#alert-status');
  enabled.checked = current.enabled;
  volume.value = String(current.volume);
  volumeValue.textContent = `${current.volume}%`;
  manual.value = current.manualSound;
  automatic.value = current.automaticSound;
  manualFileName.textContent = current.manualCustomName
    ? `Salvo: ${current.manualCustomName}`
    : 'Nenhum arquivo salvo.';
  automaticFileName.textContent = current.automaticCustomName
    ? `Salvo: ${current.automaticCustomName}`
    : 'Nenhum arquivo salvo.';
  refreshAudioState(section);

  volume.addEventListener('input', () => {
    volumeValue.textContent = `${clampVolume(volume.value)}%`;
  });

  section.querySelector('#activate-audio').addEventListener('click', async () => {
    try {
      status.textContent = '';
      await ensureAudioReady();
      refreshAudioState(section);
      status.textContent = 'Som ativado neste navegador.';
    } catch (error) {
      status.textContent = error.message;
      refreshAudioState(section);
    }
  });

  async function testSound(mode) {
    try {
      status.textContent = '';
      await ensureAudioReady();
      const select = mode === 'manual' ? manual : automatic;
      const fileInput = mode === 'manual' ? manualFileInput : automaticFileInput;
      const previous = loadConfig();
      const selectedFile = validateAudioFile(fileInput.files[0]);
      const soundKey = mode === 'manual' ? 'manualSound' : 'automaticSound';
      const preview = {
        ...previous,
        enabled: true,
        volume: clampVolume(volume.value),
        [soundKey]: select.value
      };
      await playAlert(mode, preview, selectedFile);
      refreshAudioState(section);
      status.textContent = 'Som reproduzido com sucesso.';
    } catch (error) {
      status.textContent = error.message;
      refreshAudioState(section);
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
        volume: clampVolume(volume.value),
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
      if (next.enabled) {
        try {
          await ensureAudioReady();
        } catch {
          // State below tells the operator that activation is still required.
        }
      }
      refreshAudioState(section);
      status.textContent = next.enabled
        ? 'Alertas sonoros salvos para este estabelecimento.'
        : 'Alertas sonoros desativados para este estabelecimento.';
      syncAlerts();
    } catch (error) {
      status.textContent = error.message;
      refreshAudioState(section);
    }
  });
}

injectStyles();
injectSettings();
const board = document.querySelector('#board');
if (board) new MutationObserver(syncAlerts).observe(board, { childList: true, subtree: true });
document.addEventListener(
  'click',
  async () => {
    if (loadConfig().enabled) {
      try {
        await ensureAudioReady();
        refreshAudioState();
      } catch {
        refreshAudioState();
      }
    }
  },
  { once: true }
);
