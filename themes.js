/* 🎨 THEMES — Pink, Purple, Light, Dark
   🖥️ GRAPHICS MODES — Best, Performance, Superformance, Potato PC */
(function () {
  const THEMES = ['pink', 'purple', 'light', 'dark'];
  const KEY = 'natnat-theme';
  const GRAPHICS_KEY = 'natnat-graphics';

  const THEME_ICONS = {
    pink: '🌸🌙',
    purple: '💜🌙',
    light: '🌤️🌙',
    dark: '🌙🌤️',
  };
  const HEADER_TEXT = {
    pink: "hi, i'm <span>Natnat</span> 🎀",
    purple: "hi, i'm <span>Natnat</span> 💜",
    light: "hi, i'm <span>Natnat</span> 🌤️",
    dark: "hi, i'm <span>Natnat</span> 🌙",
  };

  function updateIndicator(t) {
    const el = document.getElementById('themeIndicator');
    if (el) el.textContent = THEME_ICONS[t] || '🌸🌙';
  }
  function updateHeader(t) {
    const h1 = document.querySelector('header h1');
    if (!h1) return;
    const gMode = localStorage.getItem(GRAPHICS_KEY) || 'best';
    if (gMode === 'superformance') {
      h1.innerHTML = 'Superformance 🚄✈️';
    } else {
      h1.innerHTML = HEADER_TEXT[t] || HEADER_TEXT.pink;
    }
  }

  let _themeInitDone = false;
  function _playThemeSfx(t) {
    try {
      const vol = typeof window.natSfxVolume === 'number' ? window.natSfxVolume : 0.6;
      if (vol < 0.01) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!window._themeAudioCtx) window._themeAudioCtx = new AudioCtx();
      const ctx = window._themeAudioCtx;
      const chords = {
        pink:   [523, 659, 784],
        purple: [392, 523, 659],
        light:  [659, 784, 1047],
        dark:   [220, 294, 370],
      };
      const freqs = chords[t] || chords.pink;
      freqs.forEach((freq, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(vol * 0.09, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.32);
        }, i * 55);
      });
    } catch {}
  }

  function showToast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  function applyTheme(t) {
    // Block theme changes in Superformance and Potato PC modes
    const gMode = localStorage.getItem(GRAPHICS_KEY) || 'best';
    if (gMode === 'superformance') {
      if (_themeInitDone) showToast('❌ Theme change blocked in Superformance mode!');
      return;
    }
    if (gMode === 'potato') {
      if (_themeInitDone) showToast('❌ Your pc/phone might explode po :<');
      return;
    }

    if (!THEMES.includes(t)) t = 'pink';
    document.body.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
    document.querySelectorAll('.theme-opt, .mu-theme-btn, .ltp-btn').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === t);
    });
    updateIndicator(t);
    updateHeader(t);
    if (_themeInitDone) _playThemeSfx(t);
  }

  window.setTheme = applyTheme;
  window.getCurrentTheme = () => localStorage.getItem(KEY) || 'pink';

  // ── GRAPHICS MODES ──────────────────────────────────────────────────────
  const GRAPHICS_MODES = {
    best:           { label: 'Best 🌟',           cls: '',                  desc: 'All effects enabled (default)' },
    performance:    { label: 'Performance ⚡',    cls: 'graphics-perf',     desc: 'Reduced animations for smoother experience' },
    superformance:  { label: 'Superformance 🚄✈️', cls: 'graphics-super',   desc: '🔒 Secret mode' },
    potato:         { label: 'Potato PC 🥔',       cls: 'graphics-potato',  desc: 'Ultra-low mode for potato devices' },
  };

  function applyGraphicsMode(mode) {
    // Remove all graphics classes
    Object.values(GRAPHICS_MODES).forEach(m => {
      if (m.cls) document.body.classList.remove(m.cls);
    });

    const m = GRAPHICS_MODES[mode];
    if (!m) return;

    if (m.cls) document.body.classList.add(m.cls);
    localStorage.setItem(GRAPHICS_KEY, mode);

    // Update header for Superformance
    const stored = localStorage.getItem(KEY) || 'pink';
    updateHeader(stored);

    // Superformance: force dark theme visuals + award badge
    if (mode === 'superformance') {
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.add('superformance-theme');
      if (window.awardLocalBadge) window.awardLocalBadge('badge_superformance');
    } else {
      document.body.classList.remove('superformance-theme');
      // Restore normal theme
      if (mode !== 'superformance') {
        const t = localStorage.getItem(KEY) || 'pink';
        if (THEMES.includes(t)) document.body.setAttribute('data-theme', t);
      }
    }

    // Potato PC: grayscale + award badge
    if (mode === 'potato') {
      if (window.awardLocalBadge) window.awardLocalBadge('badge_potato');
    }

    // Performance: award badge
    if (mode === 'performance') {
      if (window.awardLocalBadge) window.awardLocalBadge('badge_performance');
    }

    // Update graphics buttons
    document.querySelectorAll('.mu-graphics-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.graphics === mode);
    });
  }

  window.setGraphicsMode = applyGraphicsMode;
  window.getGraphicsMode = () => localStorage.getItem(GRAPHICS_KEY) || 'best';

  // Init theme
  const stored = localStorage.getItem(KEY) || 'pink';
  applyTheme(stored);
  _themeInitDone = true;

  // Init graphics mode
  const storedGraphics = localStorage.getItem(GRAPHICS_KEY) || 'best';
  // Apply graphics silently on init (don't trigger toast)
  const _origThemeDone = _themeInitDone;
  _themeInitDone = false;
  applyGraphicsMode(storedGraphics);
  _themeInitDone = _origThemeDone;

  window.toggleDarkMode = function () {
    const cur = document.body.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateHeader(stored));
  } else {
    updateHeader(stored);
  }
})();
