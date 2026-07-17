'use strict';

const PLUGIN_ID = 'com.custom.quick-run';
const STORE_KEY = 'qrun_store';

if (window.acode) {

  let $btn = null;

  // ─── Настройки ─────────────────────────────────────────────────────────────

  const DEFAULTS = {
    saveBeforeRun: true,
    buttonSize:    '50',
    buttonColor:   '#e513d3',
    interpreter:   'auto',
  };

  // Карта расширение → интерпретатор (режим auto)
  const INTERPRETERS = {
    py:    'python',
    py3:   'python3',
    sh:    'bash',
    bash:  'bash',
    zsh:   'zsh',
    js:    'node',
    mjs:   'node',
    cjs:   'node',
    ts:    'ts-node',
    rb:    'ruby',
    php:   'php',
    pl:    'perl',
    lua:   'lua',
    r:     'Rscript',
    go:    'go run',
    dart:  'dart',
    kts:   'kotlinc -script',
    java:  'java',
    swift: 'swift',
  };

  const settingsList = [
    {
      key: 'saveBeforeRun',
      text: 'Save before run',
      info: 'Save file before running',
      value: DEFAULTS.saveBeforeRun,
      checkbox: true,
    },
    {
      key: 'buttonSize',
      text: 'Button size (px)',
      value: DEFAULTS.buttonSize,
      prompt: 'Button size in px',
      promptType: 'number',
    },
    {
      key: 'buttonColor',
      text: 'Button color',
      value: DEFAULTS.buttonColor,
      prompt: 'CSS color e.g. #e513d3',
      promptType: 'text',
    },
    {
      key: 'interpreter',
      text: 'Interpreter',
      info: 'auto — по расширению файла. Или задай вручную: python, bash, node, php... Пусто — запуск через ./file (shebang)',
      value: DEFAULTS.interpreter,
      prompt: 'auto | python | bash | node | ... | (пусто = ./file)',
      promptType: 'text',
    },
  ];

  const currentSettings = Object.assign({}, DEFAULTS);

  function getSetting(key) {
    const v = currentSettings[key];
    return (v !== undefined && v !== null && v !== '') ? v : DEFAULTS[key];
  }

  // ─── Хранилище ──────────────────────────────────────────────────────────────

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(_) { return {}; }
  }

  function saveStore(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign(loadStore(), data)));
    } catch(_) {}
  }

  // ─── Запуск файла ───────────────────────────────────────────────────────────

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Строит команду запуска на основе настройки interpreter и имени файла
  function buildCommand(filename) {
    const raw = currentSettings.interpreter;
    const mode = (raw === undefined || raw === null) ? DEFAULTS.interpreter : String(raw).trim();
    const q = "'" + filename.replace(/'/g, "'\\''") + "'";

    // Пустая строка → прямой запуск (для файлов с shebang)
    if (mode === '') return './' + q;

    if (mode.toLowerCase() === 'auto') {
      const dot = filename.lastIndexOf('.');
      const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
      const interp = INTERPRETERS[ext];
      if (!interp) {
        window.toast('Неизвестное расширение .' + (ext || '?') + ' → bash', 2000);
        return 'bash ' + q;
      }
      return interp + ' ' + q;
    }

    // Ручной режим: значение подставляется как есть
    return mode + ' ' + q;
  }

  async function runFile(clearFirst) {
    if (getSetting('saveBeforeRun')) {
      try { acode.exec('save'); } catch(_) {}
      await sleep(400);
    }
    const activeFile = editorManager.activeFile;
    const filename = activeFile && activeFile.name;
    if (!filename) { window.toast('Нет открытого файла', 2000); return; }

    const acodeX = acode.require('acodex');
    if (acodeX && typeof acodeX.execute === 'function') {
      if (typeof acodeX.isTerminalOpened === 'function' && !acodeX.isTerminalOpened()) {
        acodeX.openTerminal(); await sleep(700);
      } else if (typeof acodeX.isMinimized === 'function' && acodeX.isMinimized()) {
        acodeX.maximiseTerminal(); await sleep(300);
      }
      if (clearFirst) {
        acodeX.execute('clear');
        await sleep(300);
      }
      acodeX.execute(buildCommand(filename));
    } else {
      window.toast('AcodeX не найден', 3000);
    }
  }

  // ─── Кнопка ─────────────────────────────────────────────────────────────────

  function buildButton() {
    if ($btn) { $btn.remove(); $btn = null; }
    const old = document.getElementById('qrun-fab');
    if (old) old.remove();

    const store   = loadStore();
    const size    = Math.max(30, parseInt(getSetting('buttonSize'), 10) || 50);
    const color   = getSetting('buttonColor') || DEFAULTS.buttonColor;
    const icoSz   = Math.round(size * 0.42);
    const bottom  = (store.bottom !== undefined) ? store.bottom : 80;
    const right   = (store.right  !== undefined) ? store.right  : 14;

    const btn = document.createElement('button');
    btn.id = 'qrun-fab';
    btn.style.cssText =
      'position:fixed;z-index:2147483647;'
      + 'bottom:' + bottom + 'px;right:' + right + 'px;'
      + 'width:'  + size + 'px;height:' + size + 'px;'
      + 'border-radius:' + Math.round(size * 0.22) + 'px;'
      + 'background:#1e1e2e;'
      + 'border:2.5px solid ' + color + ';'
      + 'outline:none;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,0.5);'
      + 'cursor:pointer;touch-action:none;';

    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"'
      + ' width="' + icoSz + '" height="' + icoSz + '" fill="' + color + '">'
      + '<path d="M8 5v14l11-7z"/></svg>';

    let dragging = false, longPressTimer = null, isLongPress = false;
    let sx, sy, sr, sb;

    const LONG_PRESS_MS = 500;

    // Визуальная индикация длительного нажатия
    function startLongPressAnim() {
      btn.style.transform = 'scale(0.88)';
      btn.style.opacity = '0.7';
    }
    function resetAnim() {
      btn.style.transform = '';
      btn.style.opacity = '';
    }

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = btn.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      sr = window.innerWidth  - r.right;
      sb = window.innerHeight - r.bottom;
      dragging = false;
      isLongPress = false;
      try { btn.setPointerCapture(e.pointerId); } catch(_) {}

      // Запускаем таймер длительного нажатия
      longPressTimer = setTimeout(() => {
        if (!dragging) {
          isLongPress = true;
          startLongPressAnim();
          window.toast('Очистка и запуск...', 1500);
        }
      }, LONG_PRESS_MS);
    });

    btn.addEventListener('pointermove', e => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.hypot(dx, dy) > 8) {
        dragging = true;
        // Отменяем long press если потащили
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        resetAnim();
      }
      if (!dragging) return;
      btn.style.right  = Math.max(0, sr - dx) + 'px';
      btn.style.bottom = Math.max(0, sb - dy) + 'px';
    });

    btn.addEventListener('pointerup', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      resetAnim();

      if (dragging) {
        const r = btn.getBoundingClientRect();
        saveStore({
          bottom: Math.round(window.innerHeight - r.bottom),
          right:  Math.round(window.innerWidth  - r.right),
        });
      } else if (isLongPress) {
        runFile(true); // clear + run
      } else {
        runFile(false); // просто run
      }
      dragging = false;
      isLongPress = false;
    });

    btn.addEventListener('pointercancel', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      resetAnim();
      dragging = false;
      isLongPress = false;
    });

    document.body.appendChild(btn);
    $btn = btn;
  }

  // ─── Init / Unmount ─────────────────────────────────────────────────────────

  acode.setPluginInit(PLUGIN_ID, async (baseUrl, $page, cache) => {
    try {
      const saved = acode.require('settings').value[PLUGIN_ID];
      if (saved) Object.assign(currentSettings, saved);
    } catch(_) {}
    const store = loadStore();
    if (store.buttonSize)  currentSettings.buttonSize  = store.buttonSize;
    if (store.buttonColor) currentSettings.buttonColor = store.buttonColor;
    if (store.saveBeforeRun !== undefined) currentSettings.saveBeforeRun = store.saveBeforeRun;
    if (store.interpreter  !== undefined) currentSettings.interpreter  = store.interpreter;

    await sleep(800);
    buildButton();
    window.toast('Quick Run готов!', 2000);
  }, {
    list: settingsList,
    cb(key, value) {
      currentSettings[key] = value;
      saveStore({ [key]: value });
      buildButton();
    },
  });

  acode.setPluginUnmount(PLUGIN_ID, () => {
    if ($btn) { $btn.remove(); $btn = null; }
    const old = document.getElementById('qrun-fab');
    if (old) old.remove();
  });

}
