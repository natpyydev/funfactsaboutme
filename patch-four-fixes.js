/* ============================================================
   patch-four-fixes.js
   Load AFTER theme-fx-v2.js

   Fix 1 (JS side): Runtime audit of tabs nav — strip any
           inline backdrop-filter/transform that JS may set
   Fix 2: Replace flat meteor system with proper per-theme
           particle spawn manager with variation, depth, speed
   ============================================================ */

(function () {
  'use strict';

  /* ── Helpers (mirrors theme-fx-v2.js) ───────────────────── */
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b));
  const isMobile  = () => window.innerWidth <= 768;
  const isPotato  = () => localStorage.getItem('natnat-graphics') === 'potato';
  const isPerf    = () => { const m = localStorage.getItem('natnat-graphics'); return m === 'performance' || m === 'superformance'; };
  const CROSSING  = 'tfx-crossing';


  /* ══════════════════════════════════════════════════════════
     FIX 1 — RUNTIME STACKING CONTEXT AUDIT
     Patch any inline styles that JS or third-party code may
     set on nav/tabs after page load that would trap crossing
     particles.
     ══════════════════════════════════════════════════════════ */

  function auditNavStackingContext() {
    const SELECTORS = [
      '.nat-tabs-nav',
      '.sticky-tab-section',
      'header',
      'nav',
      '.tabs-wrapper',
      '.nav-wrapper',
    ];

    SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const cs = getComputedStyle(el);

        // Warn about isolation — can only be set via CSS, but we patch inline
        if (el.style.isolation && el.style.isolation !== 'auto') {
          el.style.isolation = 'auto';
        }

        // Strip inline backdrop-filter on the element itself
        // (the CSS patch moves it to ::before, but inline styles win over class styles)
        if (el.style.backdropFilter || el.style.webkitBackdropFilter) {
          el.style.backdropFilter = '';
          el.style.webkitBackdropFilter = '';
        }

        // Strip inline overflow:hidden — crossing particles must not be clipped
        if (el.style.overflow === 'hidden') {
          el.style.overflow = '';
        }
      });
    });
  }

  // Run on load and whenever DOM changes in the nav area
  function installNavAudit() {
    auditNavStackingContext();

    // Observe mutations in case something re-sets these
    const obs = new MutationObserver((records) => {
      const relevantChange = records.some(r =>
        r.target.closest?.('.nat-tabs-nav, .sticky-tab-section, header, nav')
      );
      if (relevantChange) auditNavStackingContext();
    });

    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: true,
    });
  }


  /* ══════════════════════════════════════════════════════════
     FIX 2 — ENHANCED PARTICLE SPAWN MANAGER
     Architecture:
     - SpawnManager class: configurable per theme
     - Supports: varied angle, speed, size, depth layers
     - Cinematic long-streak mode
     - Mobile-safe (halved counts, longer intervals)
     - Hooks into existing makeCrossing via body direct append

     Strategy: PATCH the existing spaceFX / cyberFX crossing
     spawners in-place by wrapping window.applyThemeFX
     ══════════════════════════════════════════════════════════ */

  class SpawnManager {
    constructor(config) {
      this.config = config;
      this._intervals = [];
      this._running = false;
    }

    start() {
      if (this._running) return;
      this._running = true;
      const { spawners } = this.config;

      spawners.forEach(s => {
        // Optionally skip in potato/perf mode
        if (s.skipInPerf && isPerf()) return;
        if (s.skipInPotato && isPotato()) return;

        const interval = isMobile() ? (s.intervalMs * (s.mobileMultiplier ?? 2.2)) : s.intervalMs;
        const id = setInterval(() => {
          const count = isMobile() ? Math.ceil(s.count * 0.4) : s.count;
          for (let i = 0; i < count; i++) s.spawn();
        }, interval);
        this._intervals.push(id);
      });
    }

    stop() {
      this._intervals.forEach(id => clearInterval(id));
      this._intervals = [];
      this._running = false;
    }
  }

  /* ── Crossing DOM helper ─────────────────────────────────── */
  function spawnCrossing(style, durationMs, fadeOutMs = 300) {
    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, style);
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // double-raf ensures browser computed the initial state
        Object.assign(el.style, style._enter || {});
        setTimeout(() => {
          el.style.opacity = '0';
          setTimeout(() => el.remove(), fadeOutMs + 100);
        }, durationMs);
      });
    });
    return el;
  }


  /* ═══════════════════════════════════════════════════
     SPACE — Varied meteors + cinematic shooting stars
     ═══════════════════════════════════════════════════ */
  function spaceRegularMeteor() {
    const W = window.innerWidth, H = window.innerHeight;

    // Vary angle: mostly diagonal but allow wider range
    const angleDeg = rnd(20, 65);
    const angleRad = angleDeg * Math.PI / 180;

    // Depth layers: 0=far (small, faint), 1=mid, 2=near (large, bright)
    const depth = Math.random();
    const isFar  = depth < 0.4;
    const isNear = depth > 0.75;

    const len    = irnd(isFar ? 60 : isNear ? 140 : 90, isFar ? 120 : isNear ? 260 : 180);
    const speed  = rnd(isFar ? 0.4 : isNear ? 0.9 : 0.6, isFar ? 0.7 : isNear ? 1.6 : 1.1); // seconds
    const alpha  = isFar ? rnd(0.2, 0.45) : isNear ? rnd(0.7, 1.0) : rnd(0.45, 0.75);
    const width  = isFar ? rnd(0.8, 1.5) : isNear ? rnd(2.0, 3.5) : rnd(1.2, 2.2);
    const glowColor = `rgba(${irnd(160,220)},${irnd(140,200)},255,${alpha})`;
    const glowPx = isNear ? '0 0 8px 2px rgba(180,160,255,0.6)' : 'none';

    // Spawn from top edge or left edge
    const fromTop = Math.random() > 0.3;
    const startX  = fromTop ? rnd(-50, W * 0.85) : rnd(-80, -20);
    const startY  = fromTop ? rnd(-80, H * 0.1)  : rnd(0, H * 0.6);

    const dist = Math.max(W, H) * 1.5;
    const endX = startX + Math.cos(angleRad) * dist;
    const endY = startY + Math.sin(angleRad) * dist;

    const dur = speed * 1000;

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, {
      left: startX + 'px',
      top:  startY + 'px',
      width:  len + 'px',
      height: width + 'px',
      background: `linear-gradient(90deg, rgba(200,180,255,0) 0%, ${glowColor} 55%, #fff 100%)`,
      borderRadius: '2px',
      opacity: '0',
      boxShadow: glowPx,
      transform: `rotate(${angleDeg}deg)`,
      transformOrigin: 'left center',
      transition: `opacity 0.08s ease`,
      pointerEvents: 'none',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = String(alpha);
      el.style.transition = `transform ${speed}s linear, opacity 0.08s ease`;
      el.style.transform   = `rotate(${angleDeg}deg) translateX(${dist}px)`;
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 350);
      }, dur - 80);
    });
  }

  function spaceCinematicStar() {
    const W = window.innerWidth, H = window.innerHeight;
    const angleDeg = rnd(18, 48);
    const angleRad = angleDeg * Math.PI / 180;
    const len  = irnd(280, W * 0.55);
    const dur  = rnd(1.8, 3.2);
    const dist = Math.max(W, H) * 1.6;
    const startX = rnd(-120, W * 0.5);
    const startY = rnd(-100, H * 0.15);

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, {
      left:   startX + 'px',
      top:    startY + 'px',
      width:  len + 'px',
      height: '3px',
      background: 'linear-gradient(90deg, rgba(220,200,255,0) 0%, rgba(200,180,255,0.5) 30%, rgba(255,255,255,0.95) 85%, #fff 100%)',
      borderRadius: '3px',
      opacity: '0',
      boxShadow: '0 0 12px 3px rgba(180,150,255,0.55)',
      filter: 'blur(0.5px)',
      transform: `rotate(${angleDeg}deg)`,
      transformOrigin: 'left center',
      pointerEvents: 'none',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = `opacity 0.15s ease`;
      el.style.opacity    = '1';
      requestAnimationFrame(() => {
        el.style.transition = `transform ${dur}s cubic-bezier(0.25,0,0.5,1), opacity 0.2s ease`;
        el.style.transform  = `rotate(${angleDeg}deg) translateX(${dist}px)`;
        setTimeout(() => {
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 300);
        }, dur * 1000 - 150);
      });
    });
  }

  const spaceSpawner = new SpawnManager({
    spawners: [
      {
        // Regular varied meteors — frequent
        intervalMs: 1400,
        count: 1,
        mobileMultiplier: 2.5,
        spawn: spaceRegularMeteor,
      },
      {
        // Occasional burst of 2-3
        intervalMs: 4000,
        count: irnd(2, 3),
        mobileMultiplier: 3,
        spawn: spaceRegularMeteor,
        skipInPotato: true,
      },
      {
        // Rare cinematic shooting star
        intervalMs: 7000,
        count: 1,
        mobileMultiplier: 3,
        skipInPerf: false,
        spawn: spaceCinematicStar,
      },
    ],
  });


  /* ═══════════════════════════════════════════════════
     CYBER — Diagonal glitch streaks + matrix fragments
     ═══════════════════════════════════════════════════ */
  function cyberGlitchStreak() {
    const W = window.innerWidth, H = window.innerHeight;
    const isHorizontal = Math.random() > 0.35;
    const isDiagonal   = !isHorizontal && Math.random() > 0.5;

    let style;

    if (isHorizontal) {
      // Full-width scan line
      const y = rnd(0, H);
      const w = W * rnd(0.3, 1.0);
      const x = rnd(0, W - w);
      style = {
        left: x + 'px', top: y + 'px',
        width: w + 'px', height: irnd(1, 3) + 'px',
        background: `linear-gradient(90deg, transparent 0%, rgba(0,255,${irnd(80,180)},${rnd(0.15,0.5)}) ${rnd(10,40)}%, transparent 100%)`,
        opacity: '0',
        mixBlendMode: 'screen',
      };
    } else if (isDiagonal) {
      // Diagonal streak like a data-corruption artifact
      const angleDeg = rnd(-70, 70);
      const len = irnd(60, 250);
      const x = rnd(0, W); const y = rnd(0, H);
      style = {
        left: x + 'px', top: y + 'px',
        width: len + 'px', height: irnd(1, 4) + 'px',
        background: `rgba(0,255,${irnd(60,200)},${rnd(0.2,0.6)})`,
        transform: `rotate(${angleDeg}deg)`,
        opacity: '0',
        mixBlendMode: 'screen',
        boxShadow: `0 0 6px 1px rgba(0,255,100,0.4)`,
      };
    } else {
      // Vertical drop
      const x = rnd(0, W);
      const h = irnd(20, 80);
      style = {
        left: x + 'px', top: rnd(0, H) + 'px',
        width: irnd(1, 3) + 'px', height: h + 'px',
        background: `linear-gradient(180deg, transparent, rgba(0,255,100,${rnd(0.3,0.7)}), transparent)`,
        opacity: '0',
        mixBlendMode: 'screen',
      };
    }

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, style);
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.04s';
      el.style.opacity    = '1';
      const holdMs = irnd(30, 180);
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 100);
      }, holdMs);
    });
  }

  function cyberMatrixFragment() {
    // A fragment of matrix text that crosses the UI
    const W = window.innerWidth, H = window.innerHeight;
    const chars = 'ｦｧｨｩｪﾀﾁﾂﾃﾄｷｸｹ01ｻｼｽｾｿﾅﾆﾇﾈ';
    const len   = irnd(3, 8);
    let text    = '';
    for (let i = 0; i < len; i++) text += chars[irnd(0, chars.length)];

    const el = document.createElement('div');
    el.className    = CROSSING;
    el.textContent  = text;
    const x = rnd(0, W - 80), y = rnd(0, H);
    const dur = rnd(0.8, 2.2);
    Object.assign(el.style, {
      left:       x + 'px',
      top:        y + 'px',
      fontFamily: 'monospace',
      fontSize:   irnd(10, 16) + 'px',
      color:      `rgba(0,255,${irnd(60,120)},${rnd(0.4,0.85)})`,
      textShadow: '0 0 8px rgba(0,255,80,0.8)',
      opacity:    '0',
      writingMode: Math.random() > 0.7 ? 'vertical-rl' : 'horizontal-tb',
      transition: `opacity 0.12s, top ${dur}s linear`,
      mixBlendMode: 'screen',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = rnd(0.5, 0.9).toString();
      el.style.top     = (y + irnd(40, 140)) + 'px';
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 200);
      }, dur * 1000);
    });
  }

  const cyberSpawner = new SpawnManager({
    spawners: [
      { intervalMs: 600,  count: 1, mobileMultiplier: 2, spawn: cyberGlitchStreak },
      { intervalMs: 1800, count: 1, mobileMultiplier: 3, spawn: cyberMatrixFragment, skipInPotato: true },
    ],
  });


  /* ═══════════════════════════════════════════════════
     HELL — Ember streaks + lava sparks
     ═══════════════════════════════════════════════════ */
  function hellLavaSpark() {
    const W = window.innerWidth, H = window.innerHeight;
    const x = rnd(W * 0.05, W * 0.95);
    const size = rnd(3, 9);
    const dur  = rnd(1.8, 4.5);
    const driftX = rnd(-80, 80);
    const riseY  = rnd(H * 0.45, H * 1.0);
    const hue    = irnd(0, 38);

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, {
      left:   x + 'px',
      top:    H + 20 + 'px',
      width:  size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      background: `hsl(${hue},100%,${irnd(55,70)}%)`,
      boxShadow: `0 0 ${size * 2}px ${size}px hsla(${hue},100%,60%,0.55)`,
      opacity: '0',
      pointerEvents: 'none',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = `top ${dur}s linear, left ${dur}s ease-in-out, opacity 0.25s`;
      el.style.opacity    = rnd(0.6, 1.0).toFixed(2);
      el.style.top        = (H - riseY) + 'px';
      el.style.left       = (x + driftX) + 'px';
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 350);
      }, dur * 1000 - 350);
    });
  }

  function hellEmberStreak() {
    const W = window.innerWidth, H = window.innerHeight;
    const angleDeg = rnd(-60, -20); // upward diagonal
    const angleRad = angleDeg * Math.PI / 180;
    const len  = irnd(30, 100);
    const x    = rnd(0, W);
    const y    = rnd(H * 0.3, H);
    const hue  = irnd(0, 45);
    const dur  = rnd(0.4, 1.0);
    const dist = rnd(80, 200);

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, {
      left:   x + 'px',
      top:    y + 'px',
      width:  len + 'px',
      height: '2px',
      background: `linear-gradient(90deg, transparent, hsla(${hue},100%,65%,0.9))`,
      borderRadius: '2px',
      opacity: '0',
      transform: `rotate(${angleDeg}deg)`,
      transformOrigin: 'right center',
      boxShadow: `0 0 6px 1px hsla(${hue},100%,60%,0.5)`,
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = `opacity 0.07s, transform ${dur}s linear`;
      el.style.opacity    = rnd(0.5, 0.9).toFixed(2);
      el.style.transform  = `rotate(${angleDeg}deg) translateX(${dist}px)`;
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 200);
      }, dur * 1000);
    });
  }

  const hellSpawner = new SpawnManager({
    spawners: [
      { intervalMs: 700,  count: 1, mobileMultiplier: 1.8, spawn: hellLavaSpark },
      { intervalMs: 1200, count: 1, mobileMultiplier: 2,   spawn: hellEmberStreak },
    ],
  });


  /* ═══════════════════════════════════════════════════
     HEAVEN — Feathers, light streaks, slow bloom
     (Largely fine — just add light streak variety)
     ═══════════════════════════════════════════════════ */
  function heavenLightStreak() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const angleDeg = rnd(-15, 15);
    const len  = irnd(80, 220);
    const x    = rnd(0, W);
    const y    = rnd(-50, H * 0.5);
    const dur  = rnd(3.0, 6.0);
    const dist = rnd(150, H * 0.8);

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, {
      left:   x + 'px',
      top:    y + 'px',
      width:  len + 'px',
      height: rnd(1, 2.5) + 'px',
      background: `linear-gradient(90deg, transparent, rgba(255,240,180,${rnd(0.25,0.6)}), transparent)`,
      borderRadius: '4px',
      opacity: '0',
      transform: `rotate(${angleDeg}deg)`,
      filter: `blur(${rnd(0.5,1.5)}px)`,
      boxShadow: '0 0 12px 3px rgba(255,235,160,0.35)',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = `opacity ${dur * 0.25}s ease, top ${dur}s ease-in, left ${dur}s ease-in-out`;
      el.style.opacity    = rnd(0.4, 0.85).toFixed(2);
      el.style.top        = (y + dist) + 'px';
      el.style.left       = (x + rnd(-60, 60)) + 'px';
      setTimeout(() => {
        el.style.transition += `, opacity ${dur * 0.3}s ease`;
        el.style.opacity    = '0';
        setTimeout(() => el.remove(), 400);
      }, dur * 800);
    });
  }

  const heavenSpawner = new SpawnManager({
    spawners: [
      { intervalMs: 2800, count: 1, mobileMultiplier: 2, spawn: heavenLightStreak },
    ],
  });


  /* ═══════════════════════════════════════════════════
     FOREST — Pollen drift + firefly burst
     ═══════════════════════════════════════════════════ */
  function forestPollen() {
    const W = window.innerWidth, H = window.innerHeight;
    const x   = rnd(0, W);
    const y   = rnd(H * 0.1, H * 0.9);
    const dur = rnd(4, 9);

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, {
      left:         x + 'px',
      top:          y + 'px',
      width:        rnd(2, 5) + 'px',
      height:       rnd(2, 5) + 'px',
      borderRadius: '50%',
      background:   `rgba(${irnd(180,255)},255,${irnd(80,160)},${rnd(0.4,0.8)})`,
      boxShadow:    '0 0 6px 2px rgba(150,255,100,0.4)',
      opacity:      '0',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = `opacity 0.5s, top ${dur}s ease-in-out, left ${dur}s ease-in-out`;
      el.style.opacity    = rnd(0.4, 0.85).toFixed(2);
      el.style.top        = (y + rnd(-120, 120)) + 'px';
      el.style.left       = (x + rnd(-100, 100)) + 'px';
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 600);
      }, dur * 1000 - 600);
    });
  }

  const forestSpawner = new SpawnManager({
    spawners: [
      { intervalMs: 1000, count: 1, mobileMultiplier: 2, spawn: forestPollen },
    ],
  });


  /* ═══════════════════════════════════════════════════
     Y2K — Sparkles, chrome streaks, glitter
     ═══════════════════════════════════════════════════ */
  function y2kSparkle() {
    const W = window.innerWidth, H = window.innerHeight;
    const GLYPHS = ['✦', '✧', '★', '☆', '✶', '✸', '⋆', '◈'];
    const x   = rnd(0, W);
    const y   = rnd(0, H);
    const dur = rnd(1.0, 2.5);
    const hue = irnd(0, 360);

    const el = document.createElement('div');
    el.className   = CROSSING;
    el.textContent = GLYPHS[irnd(0, GLYPHS.length)];
    Object.assign(el.style, {
      left:       x + 'px',
      top:        y + 'px',
      fontSize:   irnd(10, 20) + 'px',
      color:      `hsl(${hue},100%,75%)`,
      textShadow: `0 0 8px hsl(${hue},100%,80%)`,
      opacity:    '0',
      userSelect: 'none',
      transition: `opacity 0.2s, transform ${dur}s ease`,
      transform:  'scale(0.5) rotate(0deg)',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity   = rnd(0.5, 1.0).toFixed(2);
      el.style.transform = `scale(1.2) rotate(${irnd(-180, 180)}deg)`;
      setTimeout(() => {
        el.style.opacity   = '0';
        el.style.transform = 'scale(0.2) rotate(' + irnd(360, 720) + 'deg)';
        setTimeout(() => el.remove(), 250);
      }, dur * 1000 - 250);
    });
  }

  function y2kChromeStreak() {
    const W = window.innerWidth, H = window.innerHeight;
    const angleDeg = rnd(-30, 60);
    const len  = irnd(60, 200);
    const x    = rnd(0, W); const y = rnd(0, H);
    const dur  = rnd(0.3, 0.8);
    const dist = rnd(100, 300);

    const el = document.createElement('div');
    el.className = CROSSING;
    Object.assign(el.style, {
      left:   x + 'px',
      top:    y + 'px',
      width:  len + 'px',
      height: '2px',
      background: `linear-gradient(90deg, transparent, rgba(200,220,255,0.85), rgba(255,255,255,1), rgba(255,180,220,0.7), transparent)`,
      borderRadius: '2px',
      opacity: '0',
      transform: `rotate(${angleDeg}deg)`,
      transformOrigin: 'left center',
      boxShadow: '0 0 6px 2px rgba(200,220,255,0.5)',
      mixBlendMode: 'screen',
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = `opacity 0.06s, transform ${dur}s linear`;
      el.style.opacity    = rnd(0.6, 1.0).toFixed(2);
      el.style.transform  = `rotate(${angleDeg}deg) translateX(${dist}px)`;
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 150);
      }, dur * 1000 - 80);
    });
  }

  const y2kSpawner = new SpawnManager({
    spawners: [
      { intervalMs: 800,  count: 1, mobileMultiplier: 2,   spawn: y2kSparkle },
      { intervalMs: 1400, count: 1, mobileMultiplier: 2.5, spawn: y2kChromeStreak },
    ],
  });


  /* ══════════════════════════════════════════════════════════
     PATCH HOOK — Intercept applyThemeFX to swap in improved
     crossing spawners for each theme
     ══════════════════════════════════════════════════════════ */

  const SPAWNER_MAP = {
    space:  spaceSpawner,
    cyber:  cyberSpawner,
    hell:   hellSpawner,
    heaven: heavenSpawner,
    forest: forestSpawner,
    y2k:    y2kSpawner,
  };

  let _activeSpawner = null;

  function stopActiveSpawner() {
    if (_activeSpawner) {
      _activeSpawner.stop();
      _activeSpawner = null;
    }
  }

  function startSpawnerForTheme(theme) {
    stopActiveSpawner();
    if (isPotato()) return;
    const sp = SPAWNER_MAP[theme];
    if (!sp) return;
    _activeSpawner = sp;
    sp.start();
  }

  /* Wrap the global applyThemeFX (defined in theme-fx-v2.js) */
  const _origApply = window.applyThemeFX;
  window.applyThemeFX = function (theme) {
    stopActiveSpawner();
    _origApply?.apply(this, arguments);
    startSpawnerForTheme(theme || '');
  };

  /* Also wrap teardown */
  const _origTeardown = window.teardownThemeFX;
  window.teardownThemeFX = function () {
    stopActiveSpawner();
    _origTeardown?.apply(this, arguments);
  };

  /* Match initial theme on load */
  function init() {
    installNavAudit();

    const theme = localStorage.getItem('nat-theme-override')
      || document.body.getAttribute('data-theme') || '';
    startSpawnerForTheme(theme);

    // Watch for future theme changes
    new MutationObserver(() => {
      const t = document.body.getAttribute('data-theme') || '';
      if (SPAWNER_MAP[t] && _activeSpawner !== SPAWNER_MAP[t]) {
        startSpawnerForTheme(t);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
