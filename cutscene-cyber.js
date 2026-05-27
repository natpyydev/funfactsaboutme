/* ============================================================
   cutscene-cyber.js  —  Surveillance / Experiment Cutscene
   Reward: item_encrypted_usb  |  Badge: from theme activation
   ============================================================ */

(() => {

  const DEF = {
    id           : 'cyber',
    themeKey     : 'cyber',
    audioSrc     : 'audio/cybercutscene.wav',
    afterAudioSrc: 'audio/synthwave.wav',
    totalSeconds : 57,
    rewardItem   : 'item_encrypted_usb',
    rewardBadge  : null,   // badge_cyber_agent fires on theme activation

    lines: [
      [0,   'permissions granted',                  'system'],
      [2,   'access level elevated',                'system'],
      [10,  'you now have control',                 'normal'],
      [16,  'the system responds to your input',    'normal'],
      [21,  'it adapts to your commands',           'normal'],
      [23,  'it allows you to change things',       'whisper'],
      [27,  'modify structure',                     'warning'],
      [29,  'override behavior',                    'warning'],
      [35,  'but all actions are logged',           'system'],
      [38,  'all commands are studied',             'system'],
      [43,  'control is not given freely',          'normal'],
      [46,  'it is observed',                       'whisper'],
      [48,  'you are not the operator',             'warning'],
      [51,  'you are the experiment',               'glitch'],
    ],

    events: [
      [0,   'showGrid'],
      [0,   'startScanlines'],
      [2,   'spawnAccessLog'],
      [10,  'glitchBurst'],
      [16,  'flickerInput'],
      [21,  'showAdaptText'],
      [27,  'glitchBurst'],
      [29,  'glitchBurst'],
      [35,  'showWarning'],
      [43,  'intensifyRed'],
      [48,  'cameraFlash'],
      [51,  'revealExperiment'],
    ],
  };

  /* ── Shared state (cleaned up on _cleanup) ─────────────── */
  let scanlineEl  = null;
  let gridEl      = null;
  let logInterval = null;
  let glitchRafId = null;
  let logLines    = [];

  /* ── Helpers ─────────────────────────────────────────────── */
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b));

  const ACCESS_MSGS = [
    'AUTH OK    user:guest     lvl:2',
    'READ /proc/self/mem       OK',
    'EXEC cmd:obfuscate        OK',
    'WRITE /sys/config         OK',
    'SCAN network:192.168.x.x  —',
    'INTERCEPT packets:true    OK',
    'MONITOR keystrokes        active',
    'UPLOAD log_dump.bin       OK',
    'TRACE session_id:0xf3a7   OK',
    'FLAG anomaly_detected     WARN',
    'RECORD audio:ambient      active',
    'IDENTIFY subject:unknown  ...',
    'BEHAVIORAL_SCORE: 0.91    RISK',
    'CLASSIFY: subject=test    OK',
  ];

  /* ── Handlers ─────────────────────────────────────────────── */
  const handlers = {

    showGrid(fxEl) {
      gridEl = document.createElement('canvas');
      gridEl.className = 'cb-grid';
      fxEl.appendChild(gridEl);
      const ctx = gridEl.getContext('2d');

      function resize() {
        gridEl.width  = window.innerWidth;
        gridEl.height = window.innerHeight;
        drawGrid();
      }

      function drawGrid() {
        const w = gridEl.width, h = gridEl.height;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0,255,80,0.06)';
        ctx.lineWidth   = 0.5;
        const step = 32;
        for (let x = 0; x < w; x += step) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      }

      resize();
      window.addEventListener('resize', resize);
      gridEl._cleanup = () => window.removeEventListener('resize', resize);
    },

    startScanlines(fxEl) {
      scanlineEl = document.createElement('div');
      scanlineEl.className = 'cb-scanlines';
      fxEl.appendChild(scanlineEl);
    },

    spawnAccessLog(fxEl) {
      const box = document.createElement('div');
      box.className = 'cb-log-box';
      fxEl.appendChild(box);

      let i = 0;
      logInterval = setInterval(() => {
        const line = document.createElement('div');
        line.className = 'cb-log-line';
        line.textContent = ACCESS_MSGS[i % ACCESS_MSGS.length];
        if (line.textContent.includes('WARN') || line.textContent.includes('RISK')) {
          line.classList.add('cb-log-warn');
        }
        box.appendChild(line);
        box.scrollTop = box.scrollHeight;
        /* Keep DOM lean */
        if (box.children.length > 18) box.firstChild.remove();
        i++;
      }, 1800);
    },

    glitchBurst(fxEl) {
      const overlay = document.createElement('div');
      overlay.className = 'cb-glitch-flash';
      fxEl.appendChild(overlay);

      let frames = 0;
      const TOTAL = 9;
      function step() {
        frames++;
        overlay.style.opacity     = String(rnd(0, 0.55));
        overlay.style.transform   = `translateX(${rnd(-8, 8)}px) skewX(${rnd(-3, 3)}deg)`;
        overlay.style.background  = frames > 5
          ? `rgba(255,30,30,${rnd(0.05, 0.25)})`
          : `rgba(0,255,80,${rnd(0.03, 0.18)})`;
        if (frames < TOTAL) glitchRafId = requestAnimationFrame(step);
        else overlay.remove();
      }
      glitchRafId = requestAnimationFrame(step);

      /* Random horizontal slice artifacts */
      for (let s = 0; s < 3; s++) {
        const slice = document.createElement('div');
        slice.className = 'cb-glitch-slice';
        slice.style.cssText =
          `top:${irnd(10, 90)}%;height:${irnd(2, 12)}px;animation-delay:${s * 80}ms`;
        fxEl.appendChild(slice);
        setTimeout(() => slice.remove(), 500);
      }
    },

    flickerInput(fxEl) {
      const el = document.createElement('div');
      el.className = 'cb-input-cursor';
      el.textContent = '█ awaiting_input...';
      fxEl.appendChild(el);
      setTimeout(() => {
        el.textContent = '> cmd_received';
        el.classList.add('cb-input-ok');
        setTimeout(() => el.remove(), 3000);
      }, 1200);
    },

    showAdaptText(fxEl) {
      const ADAPT = [
        'learning behavior pattern…',
        'adapting response model…',
        'calibrating thresholds…',
        'compliance: 97.4%',
      ];
      ADAPT.forEach((t, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cb-adapt-line';
          el.textContent = t;
          el.style.top  = `${30 + i * 9}%`;
          fxEl.appendChild(el);
          setTimeout(() => el.remove(), 3500);
        }, i * 500);
      });
    },

    showWarning(fxEl) {
      const el = document.createElement('div');
      el.className = 'cb-warning-bar';
      el.textContent = '⚠  ALL ACTIONS LOGGED  ⚠';
      fxEl.appendChild(el);
      setTimeout(() => { el.classList.add('cb-warning-fade'); setTimeout(() => el.remove(), 800); }, 4500);
    },

    intensifyRed(fxEl, bgEl) {
      bgEl.classList.add('cb-bg-red');
      fxEl.querySelectorAll('.cb-log-line').forEach(l => l.classList.add('cb-log-warn'));
    },

    cameraFlash(fxEl) {
      const el = document.createElement('div');
      el.className = 'cb-camera-icon';
      el.textContent = '📷';
      el.style.cssText = `left:${irnd(20, 70)}%;top:${irnd(15, 55)}%`;
      fxEl.appendChild(el);
      setTimeout(() => el.remove(), 2800);

      /* Flash */
      const flash = document.createElement('div');
      flash.className = 'cb-white-flash';
      fxEl.appendChild(flash);
      setTimeout(() => flash.remove(), 400);
    },

    revealExperiment(fxEl, bgEl) {
      /* Kill the log stream */
      clearInterval(logInterval);

      /* Distort entire bg */
      bgEl.classList.add('cb-bg-experiment');

      /* Giant centred stamp */
      const stamp = document.createElement('div');
      stamp.className = 'cb-experiment-stamp';
      stamp.innerHTML = `
        <div class="cb-exp-label">SUBJECT CLASSIFICATION</div>
        <div class="cb-exp-code">EXP-0 0 1</div>
        <div class="cb-exp-sub">you are the experiment</div>
        <div class="cb-exp-blink">OBSERVATION ACTIVE</div>`;
      fxEl.appendChild(stamp);
      requestAnimationFrame(() => stamp.classList.add('cb-exp-show'));

      /* Cascade glitches */
      [0, 200, 400, 700, 1100].forEach(d => setTimeout(() => handlers.glitchBurst(fxEl), d));
    },

    _cleanup(fxEl) {
      clearInterval(logInterval);
      if (glitchRafId) cancelAnimationFrame(glitchRafId);
      gridEl?._cleanup?.();
      logInterval = null;
      glitchRafId = null;
      gridEl      = null;
      scanlineEl  = null;
      logLines    = [];
    },
  };

  /* ── Theme guard — must match before anything runs ─────────── */
  if (localStorage.getItem('nat-theme-override') !== 'cyber') return;

  /* ── Boot via _launchCutscene (with start screen) ─────────── */
  function doLaunch() {
    if (!window._launchCutscene) return;

    /* Show cyber start screen first, then hand off to player */
    if (typeof window._showCyberStartScreen === 'function') {
      window._showCyberStartScreen(() => {
        /* The start-screen click IS the user gesture — autoStart skips second click */
        window._launchCutscene({ ...DEF, autoStart: true }, handlers);
      });
    } else {
      /* Fallback: launch directly (click-to-start overlay applies) */
      window._launchCutscene(DEF, handlers);
    }
  }

  if (window._launchCutscene) {
    doLaunch();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (window._launchCutscene) doLaunch();
    }, { once: true });
  }

})();
