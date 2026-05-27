/* ============================================================
   theme-fx-v2.js
   Dual-layer FX system: #theme-bg-fx / #theme-fg-fx / .tfx-crossing
   Drop-in replacement for theme-fx.js
   ============================================================ */

(function () {
  'use strict';

  /* ── Constants ───────────────────────────────────────────── */
  const LS_THEME    = 'nat-theme-override';
  const LS_GRAPHICS = 'natnat-graphics';
  const BG_ID       = 'theme-bg-fx';
  const FG_ID       = 'theme-fg-fx';
  const CROSSING_CLASS = 'tfx-crossing';
  const SPECIAL_THEMES = new Set(['cyber', 'hell', 'heaven', 'forest', 'space', 'y2k']);

  /* ── Guards ──────────────────────────────────────────────── */
  const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isPotatoMode   = () => localStorage.getItem(LS_GRAPHICS) === 'potato';
  const isPerfMode     = () => {
    const m = localStorage.getItem(LS_GRAPHICS);
    return m === 'performance' || m === 'superformance';
  };
  const isMobile = () => window.innerWidth <= 768;

  /* ── Math helpers ────────────────────────────────────────── */
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b));

  /* ── Canvas factory ──────────────────────────────────────── */
  function makeCanvas(parent) {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    parent.appendChild(c);
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    const rl = () => resize();
    window.addEventListener('resize', rl);
    c._kill = () => window.removeEventListener('resize', rl);
    return c;
  }

  /* ── Layer factory ───────────────────────────────────────── */
  function makeLayer(id) {
    let el = document.getElementById(id);
    if (el) el.remove();
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    return el;
  }

  /* ── Crossing particle factory ───────────────────────────── */
  function makeCrossing(style) {
    const el = document.createElement('div');
    el.className = CROSSING_CLASS;
    Object.assign(el.style, style);
    document.body.appendChild(el);
    return el;
  }

  function killCrossings() {
    document.querySelectorAll('.' + CROSSING_CLASS).forEach(el => el.remove());
  }

  /* ── Global state ────────────────────────────────────────── */
  let activeTheme = null;
  let bgLayer     = null;
  let fgLayer     = null;
  let cleanupFns  = [];

  function teardown() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
    killCrossings();
    if (bgLayer) { bgLayer.remove(); bgLayer = null; }
    if (fgLayer) { fgLayer.remove(); fgLayer = null; }
    document.body.removeAttribute('data-fx');
    activeTheme = null;
  }

  /* ══════════════════════════════════════════════════════════
     SPACE
     BG:  star field canvas + nebula blobs + black hole
     FG:  floating dust motes + glow haze
     CROSS: meteors
     ══════════════════════════════════════════════════════════ */
  const spaceFX = {
    init(bg, fg) {
      const rafs = [], intervals = [], listeners = [];
      const push = (arr, v) => { arr.push(v); return v; };

      /* ── BG: star + black hole canvas ──────────────────── */
      const bgCanvas = makeCanvas(bg);
      bgCanvas.style.zIndex = '1';
      const bctx = bgCanvas.getContext('2d');

      /* nebula blobs */
      const NEBS = [
        { x: 0.15, y: 0.25, rx: 320, ry: 180, color: 'rgba(100,40,200,0.13)' },
        { x: 0.75, y: 0.55, rx: 280, ry: 220, color: 'rgba(40,80,200,0.10)' },
        { x: 0.50, y: 0.80, rx: 400, ry: 150, color: 'rgba(140,20,200,0.09)' },
      ];

      /* stars */
      let stars = [];
      function buildStars(W, H) {
        const N = isMobile() ? 120 : 250;
        stars = Array.from({ length: N }, () => ({
          x: rnd(0, W), y: rnd(0, H),
          r: rnd(0.4, 1.8),
          a: rnd(0.4, 1.0),
          twinkle: rnd(0.5, 2.0),
          phase: rnd(0, Math.PI * 2),
        }));
      }
      buildStars(window.innerWidth, window.innerHeight);

      const rl = () => buildStars(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', rl);
      listeners.push(() => window.removeEventListener('resize', rl));

      /* meteors — canvas-drawn (BG layer: behind content) */
      const meteors = [];
      const MAX_M = isMobile() ? 2 : 4;

      function spawnMeteor(W, H) {
        if (meteors.length >= MAX_M) return;
        const angle = rnd(25, 55) * Math.PI / 180;
        meteors.push({
          x: rnd(0, W * 0.9), y: rnd(-80, 0),
          vx: Math.cos(angle) * rnd(8, 14),
          vy: Math.sin(angle) * rnd(8, 14),
          len: irnd(80, 180), r: rnd(1, 2.5),
          alpha: 1, life: 1,
        });
      }

      /* black hole pos */
      const bhx = () => window.innerWidth * 0.72;
      const bhy = () => window.innerHeight * 0.38;

      let last = 0;
      function drawBG(ts) {
        const W = bgCanvas.width, H = bgCanvas.height;
        const dt = Math.min((ts - last) / 1000, 0.05);
        last = ts;

        bctx.clearRect(0, 0, W, H);

        /* nebula */
        NEBS.forEach(n => {
          const grd = bctx.createRadialGradient(n.x*W, n.y*H, 0, n.x*W, n.y*H, n.rx);
          grd.addColorStop(0, n.color);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          bctx.beginPath();
          bctx.ellipse(n.x*W, n.y*H, n.rx, n.ry, 0, 0, Math.PI*2);
          bctx.fillStyle = grd;
          bctx.fill();
        });

        /* stars */
        stars.forEach(s => {
          const a = s.a * (0.6 + 0.4 * Math.sin(ts * 0.001 * s.twinkle + s.phase));
          bctx.beginPath();
          bctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          bctx.fillStyle = `rgba(220,210,255,${a})`;
          bctx.fill();
        });

        /* meteors in BG canvas (behind content) */
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx; m.y += m.vy;
          m.life -= dt * 0.8;
          if (m.life <= 0 || m.x > W + 50 || m.y > H + 50) {
            meteors.splice(i, 1); continue;
          }
          const tx = m.x - Math.cos(Math.atan2(m.vy, m.vx)) * m.len;
          const ty = m.y - Math.sin(Math.atan2(m.vy, m.vx)) * m.len;
          const grd = bctx.createLinearGradient(tx, ty, m.x, m.y);
          grd.addColorStop(0, 'rgba(180,200,255,0)');
          grd.addColorStop(1, `rgba(255,255,255,${m.life * m.alpha})`);
          bctx.beginPath();
          bctx.moveTo(tx, ty); bctx.lineTo(m.x, m.y);
          bctx.strokeStyle = grd; bctx.lineWidth = m.r; bctx.stroke();
        }

        /* black hole */
        const bx = bhx(), by = bhy();
        const bhR = 55;
        /* accretion ring */
        const ring = bctx.createRadialGradient(bx, by, bhR * 0.9, bx, by, bhR * 2.2);
        ring.addColorStop(0,   'rgba(160,60,255,0.35)');
        ring.addColorStop(0.4, 'rgba(80,20,200,0.18)');
        ring.addColorStop(1,   'rgba(0,0,0,0)');
        bctx.beginPath(); bctx.arc(bx, by, bhR * 2.2, 0, Math.PI * 2);
        bctx.fillStyle = ring; bctx.fill();
        /* core */
        bctx.beginPath(); bctx.arc(bx, by, bhR, 0, Math.PI * 2);
        bctx.fillStyle = '#000'; bctx.fill();
        /* inner glow */
        const inner = bctx.createRadialGradient(bx, by, bhR * 0.3, bx, by, bhR);
        inner.addColorStop(0, 'rgba(180,100,255,0.45)');
        inner.addColorStop(1, 'rgba(0,0,0,0)');
        bctx.beginPath(); bctx.arc(bx, by, bhR, 0, Math.PI * 2);
        bctx.fillStyle = inner; bctx.fill();

        rafs[0] = requestAnimationFrame(drawBG);
      }
      rafs[0] = requestAnimationFrame(drawBG);

      /* meteor spawn timer */
      const mi = setInterval(() => spawnMeteor(window.innerWidth, window.innerHeight), 2200);
      intervals.push(mi);

      /* ── FG: dust motes canvas ──────────────────────────── */
      const fgCanvas = makeCanvas(fg);
      fgCanvas.style.zIndex = '1';
      const fctx = fgCanvas.getContext('2d');

      const MOTES = Array.from({ length: isMobile() ? 20 : 45 }, () => ({
        x: rnd(0, window.innerWidth),
        y: rnd(0, window.innerHeight),
        r: rnd(0.5, 2.5),
        vy: rnd(-0.15, -0.4),
        vx: rnd(-0.1, 0.1),
        a: rnd(0.1, 0.5),
        phase: rnd(0, Math.PI * 2),
      }));

      function drawFG(ts) {
        const W = fgCanvas.width, H = fgCanvas.height;
        fctx.clearRect(0, 0, W, H);
        MOTES.forEach(m => {
          m.x += m.vx; m.y += m.vy;
          if (m.y < -10) { m.y = H + 10; m.x = rnd(0, W); }
          const a = m.a * (0.5 + 0.5 * Math.sin(ts * 0.0007 + m.phase));
          fctx.beginPath();
          fctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          fctx.fillStyle = `rgba(200,180,255,${a})`;
          fctx.fill();
        });
        rafs[1] = requestAnimationFrame(drawFG);
      }
      rafs[1] = requestAnimationFrame(drawFG);

      /* ── CROSSING: meteors that pass over UI ────────────── */
      if (!isPotatoMode()) {
        function spawnCrossingMeteor() {
          const W = window.innerWidth, H = window.innerHeight;
          const angle = rnd(28, 52) * Math.PI / 180;
          const startX = rnd(-100, W * 0.7);
          const len = irnd(100, 220);
          const duration = rnd(0.6, 1.4);
          const dist = Math.max(W, H) * 1.4;
          const endX = startX + Math.cos(angle) * dist;
          const endY = Math.sin(angle) * dist;

          const el = makeCrossing({
            left: startX + 'px',
            top: rnd(-60, 60) + 'px',
            width: len + 'px',
            height: '2px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(200,180,255,0.9) 60%, #fff 100%)',
            borderRadius: '2px',
            opacity: '0',
            transform: `rotate(${angle * 180 / Math.PI}deg)`,
            transformOrigin: 'left center',
            transition: `transform ${duration}s linear, opacity 0.1s`,
          });

          requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = `rotate(${angle * 180 / Math.PI}deg) translateX(${dist}px)`;
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, duration * 1000);
          });
        }

        const ci = setInterval(spawnCrossingMeteor, isMobile() ? 5000 : 2800);
        intervals.push(ci);
      }

      return () => {
        rafs.forEach(id => cancelAnimationFrame(id));
        intervals.forEach(id => clearInterval(id));
        listeners.forEach(fn => fn());
        bgCanvas._kill?.();
        fgCanvas._kill?.();
      };
    },
  };

  /* ══════════════════════════════════════════════════════════
     CYBER
     BG:  perspective grid canvas + scanline + depth glow
     FG:  matrix rain strips + holo mist
     CROSS: glitch streaks
     ══════════════════════════════════════════════════════════ */
  const cyberFX = {
    init(bg, fg) {
      const rafs = [], intervals = [], listeners = [];

      /* ── BG: perspective grid ───────────────────────────── */
      const bgCanvas = makeCanvas(bg);
      const bctx = bgCanvas.getContext('2d');

      function drawGrid() {
        const W = bgCanvas.width, H = bgCanvas.height;
        bctx.clearRect(0, 0, W, H);

        /* depth glow */
        const dg = bctx.createRadialGradient(W/2, H, 0, W/2, H, H * 0.8);
        dg.addColorStop(0, 'rgba(0,255,80,0.18)');
        dg.addColorStop(1, 'rgba(0,0,0,0)');
        bctx.fillStyle = dg; bctx.fillRect(0, 0, W, H);

        /* perspective grid */
        const horizon = H * 0.44;
        const vp = W / 2;
        bctx.strokeStyle = 'rgba(0,255,65,0.22)';
        bctx.lineWidth = 0.7;

        const step = 52;
        const cols = Math.ceil(W / step) + 2;
        for (let i = -cols; i <= cols; i++) {
          const bx = vp + i * step;
          const tx = vp + i * step * 0.16;
          bctx.beginPath(); bctx.moveTo(bx, H); bctx.lineTo(tx, horizon); bctx.stroke();
        }
        for (let r = 0; r <= 14; r++) {
          const t = r / 14;
          const y = horizon + (H - horizon) * (t * t);
          const scale = 0.16 + 0.84 * t;
          bctx.globalAlpha = 0.10 + t * 0.25;
          bctx.beginPath();
          bctx.moveTo(vp - cols * step * scale, y);
          bctx.lineTo(vp + cols * step * scale, y);
          bctx.stroke();
        }
        bctx.globalAlpha = 1;
      }
      drawGrid();
      const rl = () => drawGrid();
      window.addEventListener('resize', rl);
      listeners.push(() => window.removeEventListener('resize', rl));

      /* scanlines overlay via CSS on bg layer */
      bg.style.backgroundImage =
        'repeating-linear-gradient(0deg, rgba(0,255,65,0.03) 0px, rgba(0,255,65,0.03) 1px, transparent 1px, transparent 3px)';

      /* ── FG: matrix rain canvas ─────────────────────────── */
      if (!isPerfMode()) {
        const fgCanvas = makeCanvas(fg);
        fgCanvas.style.opacity = '0.55';
        const fctx = fgCanvas.getContext('2d');
        const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';
        const COL_W = 18;
        let cols, drops;
        function initDrops() {
          const W = fgCanvas.width;
          cols = Math.floor(W / COL_W);
          drops = Array.from({ length: cols }, () => irnd(-40, 0));
        }
        initDrops();
        const rrl = () => initDrops();
        window.addEventListener('resize', rrl);
        listeners.push(() => window.removeEventListener('resize', rrl));

        let lastMatrix = 0;
        function drawMatrix(ts) {
          if (ts - lastMatrix < 80) { rafs[1] = requestAnimationFrame(drawMatrix); return; }
          lastMatrix = ts;
          const W = fgCanvas.width, H = fgCanvas.height;
          fctx.fillStyle = 'rgba(0,8,2,0.18)';
          fctx.fillRect(0, 0, W, H);
          fctx.fillStyle = '#00ff41';
          fctx.font = `${COL_W - 2}px monospace`;
          drops.forEach((y, i) => {
            const char = CHARS[irnd(0, CHARS.length)];
            fctx.globalAlpha = 0.7 + Math.random() * 0.3;
            fctx.fillStyle = y > 2 ? '#00ff41' : '#afffbf';
            fctx.fillText(char, i * COL_W, y * COL_W);
            if (y * COL_W > H && Math.random() > 0.975) drops[i] = 0;
            else drops[i]++;
          });
          fctx.globalAlpha = 1;
          rafs[1] = requestAnimationFrame(drawMatrix);
        }
        rafs[1] = requestAnimationFrame(drawMatrix);
        fgCanvas._kill = () => {
          window.removeEventListener('resize', rrl);
          fgCanvas._kill = null;
        };
      }

      /* ── CROSSING: glitch streaks ───────────────────────── */
      function spawnGlitch() {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const y = rnd(0, H);
        const w = irnd(80, 300);
        const el = makeCrossing({
          left: '0',
          top: y + 'px',
          width: W + 'px',
          height: irnd(1, 4) + 'px',
          background: `rgba(0,255,65,${rnd(0.06, 0.22)})`,
          opacity: '0',
          transition: 'opacity 0.05s',
          mixBlendMode: 'screen',
        });
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 80); }, irnd(40, 160));
        });
      }

      const ci = setInterval(spawnGlitch, isMobile() ? 2000 : 900);
      intervals.push(ci);

      return () => {
        rafs.forEach(id => cancelAnimationFrame(id));
        intervals.forEach(id => clearInterval(id));
        listeners.forEach(fn => fn());
        bgCanvas._kill?.();
      };
    },
  };

  /* ══════════════════════════════════════════════════════════
     HELL
     BG:  lava glow + fire wall + smoke canvas
     FG:  ember canvas (mid-depth)
     CROSS: fire embers crossing UI
     ══════════════════════════════════════════════════════════ */
  const hellFX = {
    init(bg, fg) {
      const rafs = [], intervals = [], listeners = [];

      /* ── BG: static lava glow divs ──────────────────────── */
      const lava = document.createElement('div');
      lava.style.cssText = [
        'position:absolute;bottom:0;left:0;right:0;height:45%;pointer-events:none;',
        'background:radial-gradient(ellipse 100% 100% at 50% 100%,',
        'rgba(220,30,0,0.65) 0%,rgba(180,10,0,0.30) 40%,transparent 70%);',
      ].join('');
      bg.appendChild(lava);

      const topGlow = document.createElement('div');
      topGlow.style.cssText = [
        'position:absolute;top:0;left:0;right:0;height:30%;pointer-events:none;',
        'background:radial-gradient(ellipse 80% 100% at 50% 0%,',
        'rgba(80,0,0,0.45) 0%,transparent 70%);',
      ].join('');
      bg.appendChild(topGlow);

      /* fire wall divs at base */
      const fireWall = document.createElement('div');
      fireWall.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:120px;pointer-events:none;display:flex;align-items:flex-end;';
      for (let i = 0; i < (isMobile() ? 16 : 28); i++) {
        const f = document.createElement('div');
        const w = irnd(30, 80);
        const h = irnd(40, 110);
        const delay = rnd(0, 2);
        f.style.cssText = [
          `flex:0 0 ${w}px;height:${h}px;margin:0 -6px;`,
          `background:linear-gradient(0deg,rgba(255,80,0,0.8) 0%,rgba(255,200,0,0.4) 60%,transparent 100%);`,
          `border-radius:50% 50% 0 0;`,
          `animation:hellFlame ${rnd(0.6, 1.3).toFixed(2)}s ease-in-out ${delay.toFixed(2)}s infinite alternate;`,
          'transform-origin:50% 100%;',
        ].join('');
        fireWall.appendChild(f);
      }
      bg.appendChild(fireWall);

      /* keyframes injected once */
      if (!document.getElementById('hellFlameKF')) {
        const s = document.createElement('style');
        s.id = 'hellFlameKF';
        s.textContent = '@keyframes hellFlame{0%{transform:scaleX(1) scaleY(1)}100%{transform:scaleX(0.75) scaleY(1.25)}}';
        document.head.appendChild(s);
      }

      /* ── FG: ember canvas ───────────────────────────────── */
      const fgCanvas = makeCanvas(fg);
      const fctx = fgCanvas.getContext('2d');

      const EMBERS = Array.from({ length: isMobile() ? 30 : 65 }, () => ({
        x: rnd(0, window.innerWidth),
        y: rnd(0, window.innerHeight),
        vx: rnd(-0.6, 0.6),
        vy: rnd(-0.8, -2.0),
        r: rnd(1, 3.5),
        life: rnd(0.4, 1.0),
        decay: rnd(0.002, 0.006),
        hue: irnd(0, 40),
      }));

      const rl = () => EMBERS.forEach(e => { e.x = rnd(0, window.innerWidth); });
      window.addEventListener('resize', rl);
      listeners.push(() => window.removeEventListener('resize', rl));

      function drawEmbers(ts) {
        const W = fgCanvas.width, H = fgCanvas.height;
        fctx.clearRect(0, 0, W, H);
        EMBERS.forEach(e => {
          e.x += e.vx + Math.sin(ts * 0.001 + e.y) * 0.3;
          e.y += e.vy;
          e.life -= e.decay;
          if (e.life <= 0 || e.y < -20) {
            e.x = rnd(0, W); e.y = H + 10; e.life = rnd(0.6, 1.0);
          }
          fctx.beginPath();
          fctx.arc(e.x, e.y, e.r * e.life, 0, Math.PI * 2);
          fctx.fillStyle = `hsla(${e.hue},100%,60%,${e.life * 0.8})`;
          fctx.shadowColor = `hsla(${e.hue},100%,60%,0.8)`;
          fctx.shadowBlur = 6;
          fctx.fill();
        });
        fctx.shadowBlur = 0;
        rafs[0] = requestAnimationFrame(drawEmbers);
      }
      rafs[0] = requestAnimationFrame(drawEmbers);

      /* ── CROSSING: large embers over UI ─────────────────── */
      function spawnCrossingEmber() {
        const W = window.innerWidth;
        const startX = rnd(0, W);
        const startY = window.innerHeight + 20;
        const el = makeCrossing({
          left: startX + 'px',
          top: startY + 'px',
          width: irnd(4, 10) + 'px',
          height: irnd(4, 10) + 'px',
          borderRadius: '50%',
          background: `hsl(${irnd(0, 40)},100%,65%)`,
          boxShadow: '0 0 8px 4px rgba(255,100,0,0.5)',
          opacity: '0',
          transition: 'opacity 0.2s',
        });
        const drift = rnd(-120, 120);
        const rise = rnd(window.innerHeight * 0.5, window.innerHeight * 1.2);
        const dur = rnd(2.5, 5.0);

        el.style.transition = `top ${dur}s linear, left ${dur}s ease-in-out, opacity 0.3s`;
        requestAnimationFrame(() => {
          el.style.opacity = '0.9';
          el.style.top = (startY - rise) + 'px';
          el.style.left = (startX + drift) + 'px';
          setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, dur * 1000 - 400);
        });
      }

      const ci = setInterval(spawnCrossingEmber, isMobile() ? 1800 : 900);
      intervals.push(ci);

      return () => {
        rafs.forEach(id => cancelAnimationFrame(id));
        intervals.forEach(id => clearInterval(id));
        listeners.forEach(fn => fn());
        fgCanvas._kill?.();
      };
    },
  };

  /* ══════════════════════════════════════════════════════════
     HEAVEN
     BG:  god rays canvas + cloud blobs
     FG:  floating light motes
     CROSS: feathers drifting over UI
     ══════════════════════════════════════════════════════════ */
  const heavenFX = {
    init(bg, fg) {
      const rafs = [], intervals = [], listeners = [];

      /* ── BG: god rays canvas ────────────────────────────── */
      const bgCanvas = makeCanvas(bg);
      const bctx = bgCanvas.getContext('2d');

      function drawRays(ts) {
        const W = bgCanvas.width, H = bgCanvas.height;
        bctx.clearRect(0, 0, W, H);

        const RAY_COUNT = isMobile() ? 6 : 10;
        const cx = W * 0.5;
        const cy = -H * 0.1;

        for (let i = 0; i < RAY_COUNT; i++) {
          const angle = ((i / RAY_COUNT) * Math.PI * 0.8) - Math.PI * 0.4;
          const wave = Math.sin(ts * 0.0003 + i * 0.8) * 0.04;
          const a = angle + wave;
          const len = H * 1.4;
          const halfW = rnd(40, 90);

          const x1 = cx + Math.cos(a - halfW * 0.004) * len;
          const y1 = cy + Math.sin(a - halfW * 0.004) * len;
          const x2 = cx + Math.cos(a + halfW * 0.004) * len;
          const y2 = cy + Math.sin(a + halfW * 0.004) * len;

          const grd = bctx.createLinearGradient(cx, cy, (x1+x2)/2, (y1+y2)/2);
          grd.addColorStop(0,   `rgba(255,240,180,${0.12 + Math.sin(ts*0.0005+i)*0.04})`);
          grd.addColorStop(0.5, `rgba(255,240,200,0.04)`);
          grd.addColorStop(1,   'rgba(255,240,200,0)');

          bctx.beginPath();
          bctx.moveTo(cx, cy);
          bctx.lineTo(x1, y1);
          bctx.lineTo(x2, y2);
          bctx.closePath();
          bctx.fillStyle = grd;
          bctx.fill();
        }

        /* cloud blobs */
        const clouds = [
          { x: 0.15, y: 0.12, r: 200, a: 0.18 },
          { x: 0.80, y: 0.08, r: 260, a: 0.14 },
          { x: 0.50, y: 0.22, r: 320, a: 0.10 },
        ];
        clouds.forEach(c => {
          const grd = bctx.createRadialGradient(c.x*W, c.y*H, 0, c.x*W, c.y*H, c.r);
          grd.addColorStop(0, `rgba(255,255,255,${c.a})`);
          grd.addColorStop(1, 'rgba(255,255,255,0)');
          bctx.beginPath(); bctx.arc(c.x*W, c.y*H, c.r, 0, Math.PI*2);
          bctx.fillStyle = grd; bctx.fill();
        });

        rafs[0] = requestAnimationFrame(drawRays);
      }
      rafs[0] = requestAnimationFrame(drawRays);

      /* ── FG: light motes ────────────────────────────────── */
      const fgCanvas = makeCanvas(fg);
      const fctx = fgCanvas.getContext('2d');

      const MOTES = Array.from({ length: isMobile() ? 20 : 50 }, () => ({
        x: rnd(0, window.innerWidth),
        y: rnd(0, window.innerHeight),
        vy: rnd(-0.2, -0.6),
        vx: rnd(-0.15, 0.15),
        r: rnd(1, 4),
        a: rnd(0.1, 0.6),
        phase: rnd(0, Math.PI * 2),
      }));

      function drawMotes(ts) {
        const W = fgCanvas.width, H = fgCanvas.height;
        fctx.clearRect(0, 0, W, H);
        MOTES.forEach(m => {
          m.x += m.vx; m.y += m.vy;
          if (m.y < -10) { m.y = H + 10; m.x = rnd(0, W); }
          const a = m.a * (0.5 + 0.5 * Math.sin(ts * 0.001 + m.phase));
          fctx.beginPath(); fctx.arc(m.x, m.y, m.r, 0, Math.PI*2);
          fctx.fillStyle = `rgba(255,240,180,${a})`;
          fctx.fill();
        });
        rafs[1] = requestAnimationFrame(drawMotes);
      }
      rafs[1] = requestAnimationFrame(drawMotes);

      /* ── CROSSING: feathers ─────────────────────────────── */
      function spawnFeather() {
        const W = window.innerWidth;
        const startX = rnd(0, W);
        const startY = rnd(-40, 80);
        const size = irnd(14, 28);
        const dur = rnd(6, 12);

        const el = makeCrossing({
          left: startX + 'px',
          top: startY + 'px',
          fontSize: size + 'px',
          opacity: '0',
          transition: `top ${dur}s linear, left ${dur}s ease-in-out, opacity 0.5s`,
          userSelect: 'none',
          filter: 'drop-shadow(0 0 6px rgba(255,240,180,0.7))',
        });
        el.textContent = ['🪶', '✦', '✧', '☆'][irnd(0, 4)];

        const driftX = rnd(-150, 150);
        const fallY = window.innerHeight + 80;

        requestAnimationFrame(() => {
          el.style.opacity = rnd(0.5, 0.9).toFixed(2);
          el.style.top = (startY + fallY) + 'px';
          el.style.left = (startX + driftX) + 'px';
          setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }, dur * 1000 - 600);
        });
      }

      const ci = setInterval(spawnFeather, isMobile() ? 3000 : 1600);
      intervals.push(ci);

      return () => {
        rafs.forEach(id => cancelAnimationFrame(id));
        intervals.forEach(id => clearInterval(id));
        bgCanvas._kill?.(); fgCanvas._kill?.();
      };
    },
  };

  /* ══════════════════════════════════════════════════════════
     FOREST
     BG:  canopy glow + fog + branch silhouettes
     FG:  firefly canvas
     CROSS: floating leaves over UI
     ══════════════════════════════════════════════════════════ */
  const forestFX = {
    init(bg, fg) {
      const rafs = [], intervals = [], listeners = [];

      /* ── BG: canopy glow + fog ──────────────────────────── */
      const canopyGlow = document.createElement('div');
      canopyGlow.style.cssText = [
        'position:absolute;top:0;left:0;right:0;height:50%;pointer-events:none;',
        'background:radial-gradient(ellipse 100% 80% at 50% 0%,',
        'rgba(20,100,20,0.30) 0%,rgba(0,40,10,0.10) 60%,transparent 100%);',
      ].join('');
      bg.appendChild(canopyGlow);

      const fog = document.createElement('div');
      fog.style.cssText = [
        'position:absolute;bottom:0;left:0;right:0;height:35%;pointer-events:none;',
        'background:linear-gradient(0deg,rgba(0,20,5,0.55) 0%,rgba(0,30,10,0.20) 60%,transparent 100%);',
        'animation:forestFog 8s ease-in-out infinite alternate;',
      ].join('');
      bg.appendChild(fog);

      if (!document.getElementById('forestFogKF')) {
        const s = document.createElement('style');
        s.id = 'forestFogKF';
        s.textContent = '@keyframes forestFog{0%{opacity:0.6;transform:scaleX(1)}100%{opacity:1;transform:scaleX(1.04)}}';
        document.head.appendChild(s);
      }

      /* branch silhouettes */
      ['0%', '100%'].forEach((side, i) => {
        const branch = document.createElement('div');
        branch.style.cssText = [
          `position:absolute;top:0;${i === 0 ? 'left' : 'right'}:0;`,
          'width:220px;height:40%;pointer-events:none;',
          `background:radial-gradient(ellipse ${i===0?'120%':'120%'} 100% at ${i===0?'0%':'100%'} 0%,rgba(0,20,5,0.7) 0%,transparent 70%);`,
        ].join('');
        bg.appendChild(branch);
      });

      /* ── FG: firefly canvas ─────────────────────────────── */
      const fgCanvas = makeCanvas(fg);
      const fctx = fgCanvas.getContext('2d');

      const FLIES = Array.from({ length: isMobile() ? 15 : 35 }, () => ({
        x: rnd(0, window.innerWidth),
        y: rnd(0, window.innerHeight),
        vx: rnd(-0.4, 0.4),
        vy: rnd(-0.3, 0.3),
        r: rnd(1.5, 3.5),
        phase: rnd(0, Math.PI * 2),
        speed: rnd(0.6, 1.8),
      }));

      function drawFlies(ts) {
        const W = fgCanvas.width, H = fgCanvas.height;
        fctx.clearRect(0, 0, W, H);
        FLIES.forEach(f => {
          f.x += f.vx + Math.sin(ts * 0.0006 * f.speed + f.phase) * 0.5;
          f.y += f.vy + Math.cos(ts * 0.0008 * f.speed + f.phase) * 0.3;
          if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
          if (f.y < 0) f.y = H; if (f.y > H) f.y = 0;
          const a = 0.4 + 0.6 * Math.abs(Math.sin(ts * 0.001 * f.speed + f.phase));
          fctx.beginPath(); fctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
          fctx.fillStyle = `rgba(180,255,100,${a})`;
          fctx.shadowColor = 'rgba(120,255,60,0.8)';
          fctx.shadowBlur = 10;
          fctx.fill();
        });
        fctx.shadowBlur = 0;
        rafs[0] = requestAnimationFrame(drawFlies);
      }
      rafs[0] = requestAnimationFrame(drawFlies);

      /* ── CROSSING: leaves ───────────────────────────────── */
      function spawnLeaf() {
        const W = window.innerWidth;
        const startX = rnd(0, W);
        const dur = rnd(5, 10);
        const el = makeCrossing({
          left: startX + 'px',
          top: '-20px',
          fontSize: irnd(14, 22) + 'px',
          opacity: '0',
          transition: `top ${dur}s linear, left ${dur}s ease-in-out, opacity 0.4s, transform ${dur}s linear`,
          userSelect: 'none',
          filter: 'drop-shadow(0 0 4px rgba(0,255,60,0.4))',
        });
        el.textContent = ['🍃', '🌿', '🍀', '✦'][irnd(0, 4)];
        el.style.transform = `rotate(${irnd(-90, 90)}deg)`;

        const drift = rnd(-200, 200);
        requestAnimationFrame(() => {
          el.style.opacity = rnd(0.5, 0.85).toFixed(2);
          el.style.top = (window.innerHeight + 30) + 'px';
          el.style.left = (startX + drift) + 'px';
          el.style.transform = `rotate(${irnd(90, 360)}deg)`;
          setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, dur * 1000 - 500);
        });
      }

      const ci = setInterval(spawnLeaf, isMobile() ? 2500 : 1200);
      intervals.push(ci);

      return () => {
        rafs.forEach(id => cancelAnimationFrame(id));
        intervals.forEach(id => clearInterval(id));
        fgCanvas._kill?.();
      };
    },
  };

  /* ══════════════════════════════════════════════════════════
     Y2K
     BG:  CRT scanlines + pixel noise canvas
     FG:  VHS glitch strips
     CROSS: Win popup divs + data corruption streaks
     ══════════════════════════════════════════════════════════ */
  const y2kFX = {
    init(bg, fg) {
      const rafs = [], intervals = [], timeouts = [];

      /* ── BG: CRT scanlines ──────────────────────────────── */
      bg.style.backgroundImage = [
        'repeating-linear-gradient(0deg,rgba(0,0,0,0.08) 0px,rgba(0,0,0,0.08) 1px,transparent 1px,transparent 4px),',
        'radial-gradient(ellipse 80% 60% at 50% 50%,rgba(40,0,80,0.25) 0%,transparent 70%)',
      ].join('');

      /* pixel noise */
      if (!isPotatoMode() && !isPerfMode()) {
        const noiseCanvas = makeCanvas(bg);
        noiseCanvas.width = 240; noiseCanvas.height = 135;
        noiseCanvas.style.imageRendering = 'pixelated';
        const nctx = noiseCanvas.getContext('2d');
        let lastNoise = 0;
        function drawNoise(ts) {
          if (ts - lastNoise < 140) { rafs[0] = requestAnimationFrame(drawNoise); return; }
          lastNoise = ts;
          const img = nctx.createImageData(240, 135);
          const d = img.data;
          for (let i = 0; i < d.length; i += 4) {
            const v = irnd(0, 255);
            d[i] = d[i+1] = d[i+2] = v;
            d[i+3] = Math.random() > 0.91 ? irnd(8, 30) : 0;
          }
          nctx.putImageData(img, 0, 0);
          rafs[0] = requestAnimationFrame(drawNoise);
        }
        rafs[0] = requestAnimationFrame(drawNoise);
      }

      /* ── FG: VHS glitch strips ──────────────────────────── */
      function spawnVHS() {
        const W = window.innerWidth, H = window.innerHeight;
        const count = irnd(2, 6);
        for (let i = 0; i < count; i++) {
          const el = makeCrossing({
            left: '0',
            top: rnd(0, H) + 'px',
            width: W + 'px',
            height: irnd(2, 12) + 'px',
            background: `rgba(${irnd(0,255)},${irnd(0,255)},${irnd(0,255)},${rnd(0.05,0.18)})`,
            opacity: '0',
            transition: 'opacity 0.04s',
            mixBlendMode: 'screen',
          });
          requestAnimationFrame(() => {
            el.style.opacity = '1';
            const dur = irnd(30, 160);
            const t = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 60); }, dur);
            timeouts.push(t);
          });
        }
      }

      const ci = setInterval(spawnVHS, isMobile() ? 4000 : 2000);
      intervals.push(ci);

      /* Win popup easter egg (rare) */
      function spawnPopup() {
        if (Math.random() > 0.35) return;
        const msgs = ['FATAL ERROR', 'YOU HAVE WON', 'Y2K IS REAL', 'INSERT DISK'];
        const el = makeCrossing({
          left: rnd(10, window.innerWidth * 0.6) + 'px',
          top:  rnd(10, window.innerHeight * 0.6) + 'px',
          padding: '6px 12px',
          background: '#c0c0c0',
          border: '2px solid #fff',
          outline: '2px solid #000',
          boxShadow: '2px 2px 0 #000',
          fontFamily: '"Courier New",monospace',
          fontSize: '11px',
          color: '#000',
          fontWeight: 'bold',
          borderRadius: '0',
          opacity: '0',
          transition: 'opacity 0.15s',
          cursor: 'default',
          minWidth: '140px',
          textAlign: 'center',
        });
        el.innerHTML = `<div style="background:#000080;color:#fff;padding:2px 4px;margin:-6px -12px 6px;font-size:10px">⚠ Windows 98</div>${msgs[irnd(0, msgs.length)]}<br><button onclick="this.parentElement.remove()" style="margin-top:4px;padding:1px 8px;font-size:10px;cursor:pointer">OK</button>`;
        el.style.pointerEvents = 'all';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          const t = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, 6000);
          timeouts.push(t);
        });
      }

      const pi = setInterval(spawnPopup, 14000);
      intervals.push(pi);

      return () => {
        rafs.forEach(id => cancelAnimationFrame(id));
        intervals.forEach(id => clearInterval(id));
        timeouts.forEach(id => clearTimeout(id));
      };
    },
  };

  /* ══════════════════════════════════════════════════════════
     FX MAP
     ══════════════════════════════════════════════════════════ */
  const FX_MAP = {
    space:  spaceFX,
    cyber:  cyberFX,
    hell:   hellFX,
    heaven: heavenFX,
    forest: forestFX,
    y2k:    y2kFX,
  };

  /* ══════════════════════════════════════════════════════════
     APPLY / TEARDOWN
     ══════════════════════════════════════════════════════════ */
  function applyThemeFX(theme) {
    if (theme === activeTheme) return;
    teardown();

    if (!SPECIAL_THEMES.has(theme)) return;
    if (prefersReduced()) return;
    if (isPotatoMode()) return;

    const fx = FX_MAP[theme];
    if (!fx) return;

    bgLayer = makeLayer(BG_ID);
    fgLayer = makeLayer(FG_ID);

    document.body.setAttribute('data-fx', theme);

    const cleanup = fx.init(bgLayer, fgLayer);
    cleanupFns.push(cleanup);
    activeTheme = theme;
  }

  /* ══════════════════════════════════════════════════════════
     WATCH THEME CHANGES
     ══════════════════════════════════════════════════════════ */
  function checkTheme() {
    const t = localStorage.getItem(LS_THEME) || document.body.getAttribute('data-theme') || '';
    if (t !== activeTheme) applyThemeFX(t);
  }

  /* Poll (same-tab localStorage doesn't fire storage events) */
  let lastLS = null;
  setInterval(() => {
    const cur = localStorage.getItem(LS_THEME) || document.body.getAttribute('data-theme') || '';
    if (cur !== lastLS) { lastLS = cur; checkTheme(); }
  }, 500);

  /* Hook into existing setSpecialTheme */
  const _orig = window.setSpecialTheme;
  window.setSpecialTheme = function (theme) {
    _orig?.apply(this, arguments);
    applyThemeFX(theme || '');
  };

  /* Expose globally */
  window.applyThemeFX = applyThemeFX;
  window.teardownThemeFX = teardown;

  /* ── Init on load ────────────────────────────────────────── */
  function init() {
    checkTheme();
    /* observe data-theme attribute for instant switching */
    new MutationObserver(() => checkTheme())
      .observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
