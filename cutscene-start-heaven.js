/* ============================================================
   cutscene-start-heaven.js
   Heaven divine gate start screen.
   Exports: window._showHeavenStartScreen(onComplete)
   ============================================================ */

(function () {
  'use strict';

  /* ── Particle helpers ────────────────────────────────────── */
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b));

  /* ── God ray angles ──────────────────────────────────────── */
  const RAY_ANGLES = [-60, -40, -22, -6, 8, 24, 42, 62, 80, -80];
  const RAY_OPS    = [0.10, 0.16, 0.24, 0.20, 0.26, 0.22, 0.18, 0.14, 0.10, 0.08];

  /* ── Main ────────────────────────────────────────────────── */
  window._showHeavenStartScreen = function (onComplete) {
    if (document.getElementById('cs-start-heaven')) {
      onComplete?.();
      return;
    }

    /* ── DOM skeleton ────────────────────────────────────── */
    const el = document.createElement('div');
    el.id        = 'cs-start-heaven';
    el.className = 'cs-start cs-start-heaven';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Click to ascend');

    el.innerHTML = `
      <!-- Particle canvas -->
      <canvas class="hvs-canvas" id="hvsCanvas" aria-hidden="true"></canvas>

      <!-- Bloom overlay -->
      <div class="hvs-bloom" aria-hidden="true"></div>

      <!-- Gate content -->
      <div class="hvs-gate">
        <!-- God rays behind sigil -->
        <div class="hvs-rays" id="hvsRays" aria-hidden="true"></div>

        <!-- Sigil -->
        <div class="hvs-sigil" id="hvsSigil">
          <div class="hvs-sigil-ring"  aria-hidden="true"></div>
          <div class="hvs-sigil-ring2" aria-hidden="true"></div>
          <div class="hvs-sigil-symbol" id="hvsSymbol">✦</div>
        </div>

        <div class="hvs-title" id="hvsTitle">ASCENSION ACCEPTED</div>
      </div>

      <!-- Click prompt -->
      <div class="hvs-prompt" id="hvsPrompt">✦ touch the light to begin ✦</div>
    `;

    document.body.appendChild(el);

    /* ── Elements ────────────────────────────────────────── */
    const canvas  = el.querySelector('#hvsCanvas');
    const ctx     = canvas.getContext('2d');
    const raysEl  = el.querySelector('#hvsRays');
    const promptEl = el.querySelector('#hvsPrompt');

    /* ── Resize canvas ───────────────────────────────────── */
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── Build god rays ──────────────────────────────────── */
    RAY_ANGLES.forEach((angle, i) => {
      const r = document.createElement('div');
      r.className = 'hvs-ray';
      r.style.cssText =
        `transform: rotate(${angle}deg); opacity: ${RAY_OPS[i] || 0.12};` +
        `animation-delay: ${i * 0.35}s; width: ${rnd(1, 3)}px;`;
      raysEl.appendChild(r);
    });

    /* ── Particle system ─────────────────────────────────── */
    const PARTICLE_COUNT = 40;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x   : rnd(0, window.innerWidth),
      y   : rnd(0, window.innerHeight),
      r   : rnd(1, 3.5),
      vx  : rnd(-0.08, 0.08),
      vy  : rnd(-0.4, -0.1),
      a   : rnd(0.3, 0.75),
    }));

    let rafId     = null;
    let stopped   = false;

    function drawParticles() {
      if (stopped) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = H + 5; p.x = rnd(0, W); }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,120,${p.a})`;
        ctx.fill();
      });
      rafId = requestAnimationFrame(drawParticles);
    }
    rafId = requestAnimationFrame(drawParticles);

    /* ── Scatter static CSS particles ───────────────────── */
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement('div');
      dot.className = 'hvs-particle';
      const sz = rnd(2, 5);
      dot.style.cssText =
        `left:${rnd(5,95)}%;top:${rnd(30,95)}%;` +
        `width:${sz}px;height:${sz}px;` +
        `--dur:${rnd(3,8)}s;--delay:${rnd(0,6)}s;` +
        `opacity:${rnd(0.4,0.8)}`;
      el.appendChild(dot);
    }

    /* ── Symbol cycle ────────────────────────────────────── */
    const SYMBOLS = ['✦', '✧', '✦', '☽', '✦'];
    let   symIdx  = 0;
    const symEl   = el.querySelector('#hvsSymbol');
    const symTimer = setInterval(() => {
      symIdx = (symIdx + 1) % SYMBOLS.length;
      symEl.textContent = SYMBOLS[symIdx];
    }, 2800);

    /* ── Click / tap handler ─────────────────────────────── */
    let exiting = false;

    function onActivate() {
      if (exiting) return;
      exiting = true;

      el.removeEventListener('click', onActivate);
      el.removeEventListener('keydown', onKeyActivate);
      clearInterval(symTimer);
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);

      /* Accept flash */
      const flash = document.createElement('div');
      flash.className = 'hvs-accept-flash';
      el.appendChild(flash);

      /* Ascend exit — fire onComplete when animation starts so the heaven
         cutscene mounts behind the ascension flash. No gap between screens. */
      setTimeout(() => {
        el.classList.add('hvs-exiting');
        onComplete?.();  /* launch cutscene immediately */
        el.addEventListener('animationend', () => el.remove(), { once: true });
      }, 320);
    }

    function onKeyActivate(e) {
      if (e.key === 'Enter' || e.key === ' ') onActivate();
    }

    el.addEventListener('click', onActivate);
    el.addEventListener('keydown', onKeyActivate);
  };

})();
