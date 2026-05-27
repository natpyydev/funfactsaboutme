/* ============================================================
   cutscene-heaven.js  —  False Paradise / Trapped Eternity
   Reward: item_golden_halo  |  Badge: from theme activation
   ============================================================ */

(() => {

  const DEF = {
    id           : 'heaven',
    themeKey     : 'heaven',
    audioSrc     : 'audio/heavencutscene.wav',
    afterAudioSrc: 'audio/heaven.wav',
    totalSeconds : 146,
    rewardItem   : 'item_golden_halo',
    rewardBadge  : null,   // badge_angel fires on theme activation

    lines: [
      [29,  'they said',                                          'whisper'],
      [30,  'this place was perfect',                            'normal'],
      [34,  'no pain',                                           'whisper'],
      [40,  'no fear',                                           'whisper'],
      [45,  'no end',                                            'whisper'],
      [52,  'just endless light',                                'normal'],
      [63,  'endless light',                                     'whisper'],
      [75,  'at first it felt like peace',                       'normal'],
      [80,  'but after a while',                                 'whisper'],
      [85,  'you notice something',                              'whisper'],
      [87,  'nothing changes here\nnot the sky',                'normal'],
      [94,  'not the air',                                       'whisper'],
      [98,  'not even you',                                      'whisper'],
      [101, 'time doesn\'t move',                               'normal'],
      [106, 'it just stays',                                     'whisper'],
      [110, 'everyone smiles all the time',                     'normal'],
      [119, 'and the light',                                     'whisper'],
      [124, 'never turns off',                                   'warning'],
      [127, 'you can\'t leave',                                  'warning'],
      [129, 'you can only exist',                                'normal'],
      [133, 'and eventually\nand eventually',                   'whisper'],
      [138, 'you stop remembering\nwhy you ever wanted more',   'glitch'],
    ],

    events: [
      [0,   'showLight'],
      [0,   'spawnParticles'],
      [29,  'increaseBloom'],
      [75,  'freezeEnvironment'],
      [87,  'subtleSmileDistortion'],
      [101, 'removeMotion'],
      [119, 'dimParticles'],
      [124, 'flashStrobe'],
      [127, 'overExposeScene'],
      [138, 'finalWashout'],
    ],
  };

  /* ── Shared state ─────────────────────────────────────────── */
  let particleRaf  = null;
  let particleStop = false;
  let rayEl        = null;
  let bgCanvas     = null;
  let canvasCtx    = null;
  let bloomLevel   = 0;
  let bloomRaf     = null;
  let smileInterval = null;

  /* ── Helpers ─────────────────────────────────────────────── */
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b));

  /* ── Particle system (canvas) ─────────────────────────────── */
  function initCanvas(fxEl) {
    bgCanvas = document.createElement('canvas');
    bgCanvas.className = 'hv-canvas';
    fxEl.appendChild(bgCanvas);
    canvasCtx = bgCanvas.getContext('2d');

    function resize() {
      bgCanvas.width  = window.innerWidth;
      bgCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    bgCanvas._removeResize = () => window.removeEventListener('resize', resize);
    return canvasCtx;
  }

  function startParticles(fxEl) {
    const ctx = initCanvas(fxEl);

    const PARTICLE_COUNT = 55;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x   : rnd(0, window.innerWidth),
      y   : rnd(0, window.innerHeight),
      r   : rnd(1.5, 5),
      vx  : rnd(-0.12, 0.12),
      vy  : rnd(-0.35, -0.08),
      a   : rnd(0.3, 0.8),
      dead: false,
    }));

    function draw() {
      if (particleStop) return;
      const W = bgCanvas.width, H = bgCanvas.height;
      ctx.clearRect(0, 0, W, H);

      particles.forEach(p => {
        if (p.dead) return;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = H + 5; p.x = rnd(0, W); }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,180,${p.a * (1 - bloomLevel * 0.004)})`;
        ctx.fill();
      });

      particleRaf = requestAnimationFrame(draw);
    }
    particleRaf = requestAnimationFrame(draw);
  }

  /* ── Golden rays (CSS, reused element) ───────────────────── */
  function buildRays(fxEl) {
    rayEl = document.createElement('div');
    rayEl.className = 'hv-rays';
    fxEl.appendChild(rayEl);
    for (let i = 0; i < 7; i++) {
      const r = document.createElement('div');
      r.className = 'hv-ray';
      r.style.cssText =
        `transform:rotate(${i * 25 - 30}deg);animation-delay:${i * 0.4}s;opacity:${rnd(0.04, 0.13)}`;
      rayEl.appendChild(r);
    }
  }

  /* ── Handlers ─────────────────────────────────────────────── */
  const handlers = {

    showLight(fxEl, bgEl) {
      bgEl.classList.add('hv-bg-dawn');
      buildRays(fxEl);

      /* Soft ambient glow circle */
      const glow = document.createElement('div');
      glow.className = 'hv-glow-orb';
      fxEl.appendChild(glow);
    },

    spawnParticles(fxEl) {
      startParticles(fxEl);
    },

    increaseBloom(fxEl, bgEl) {
      /* Animate bloom level 0 → 60 over 45 s */
      const start = performance.now();
      const DUR   = 45000;
      function step(now) {
        bloomLevel = Math.min(60, ((now - start) / DUR) * 60);
        bgEl.style.filter = `brightness(${1 + bloomLevel * 0.01}) saturate(${1 - bloomLevel * 0.008})`;
        if (bloomLevel < 60) bloomRaf = requestAnimationFrame(step);
      }
      bloomRaf = requestAnimationFrame(step);

      /* Halos drift in */
      const HALOS = ['✨', '🌟', '💛', '☀️', '🕊️'];
      HALOS.forEach((h, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'hv-halo-float';
          el.textContent = h;
          el.style.cssText = `left:${irnd(5, 90)}%;top:${irnd(10, 85)}%;animation-delay:${i * 0.3}s`;
          fxEl.appendChild(el);
          setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 900); }, 8000);
        }, i * 700);
      });
    },

    freezeEnvironment(fxEl, bgEl) {
      /* Gradually slow particle drift — achieved by reducing vy in the closure.
         We just transition particles to near-zero via a CSS blur accumulation. */
      bgEl.classList.add('hv-bg-stagnant');

      /* Eerie still-sky overlay */
      const still = document.createElement('div');
      still.className = 'hv-still-sky';
      fxEl.appendChild(still);
      requestAnimationFrame(() => still.classList.add('hv-still-show'));
    },

    subtleSmileDistortion(fxEl) {
      const SMILES = ['😊', '🙂', '😊', '🙂', '😶', '🙂', '😊'];
      smileInterval = setInterval(() => {
        const el = document.createElement('div');
        el.className = 'hv-smile';
        el.textContent = SMILES[irnd(0, SMILES.length)];
        el.style.cssText = `left:${irnd(5, 90)}%;top:${irnd(10, 85)}%;font-size:${irnd(18, 42)}px;animation-duration:${rnd(4, 9)}s`;
        fxEl.appendChild(el);
        setTimeout(() => el.remove(), 9000);
      }, 2200);
    },

    removeMotion(fxEl, bgEl) {
      /* Freeze particle upward drift (flag read in rAF) */
      particleStop = true;
      if (particleRaf) cancelAnimationFrame(particleRaf);
      /* Fade canvas gently */
      if (bgCanvas) bgCanvas.style.transition = 'opacity 6s ease';

      clearInterval(smileInterval);

      /* Freeze rays */
      rayEl?.querySelectorAll('.hv-ray').forEach(r => {
        r.style.animationPlayState = 'paused';
        r.style.transition = 'opacity 4s ease';
        r.style.opacity = '0.02';
      });

      bgEl.classList.add('hv-bg-frozen');

      /* Lone stuck smile */
      const lone = document.createElement('div');
      lone.className = 'hv-lone-smile';
      lone.textContent = '🙂';
      fxEl.appendChild(lone);
      requestAnimationFrame(() => lone.classList.add('hv-lone-show'));
    },

    dimParticles(fxEl) {
      if (bgCanvas) bgCanvas.style.opacity = '0.25';
    },

    flashStrobe(fxEl) {
      /* Two quick white pulses then stop */
      [0, 250].forEach(d => {
        setTimeout(() => {
          const f = document.createElement('div');
          f.className = 'hv-strobe';
          fxEl.appendChild(f);
          setTimeout(() => f.remove(), 200);
        }, d);
      });
    },

    overExposeScene(fxEl, bgEl) {
      bgEl.classList.add('hv-bg-overexpose');
      /* Shift subtitle color to near-invisible white */
      fxEl.closest('.cs-overlay')
        ?.querySelector('.cs-sub')
        ?.classList.add('hv-sub-pale');
    },

    finalWashout(fxEl, bgEl) {
      /* Slow fade to near-white void — not horror, just emptiness */
      const wash = document.createElement('div');
      wash.className = 'hv-washout';
      fxEl.appendChild(wash);
      requestAnimationFrame(() => wash.classList.add('hv-washout-show'));

      /* Remove the lone smile — leave nothing */
      fxEl.querySelector('.hv-lone-smile')?.remove();
    },

    _cleanup(fxEl) {
      particleStop = true;
      if (particleRaf) cancelAnimationFrame(particleRaf);
      if (bloomRaf)    cancelAnimationFrame(bloomRaf);
      clearInterval(smileInterval);
      bgCanvas?._removeResize?.();
      particleRaf  = null;
      bloomRaf     = null;
      bloomLevel   = 0;
      smileInterval = null;
      bgCanvas     = null;
      canvasCtx    = null;
      rayEl        = null;
    },
  };

  /* ── Theme guard — must match before anything runs ─────────── */
  if (localStorage.getItem('nat-theme-override') !== 'heaven') return;

  /* ── Boot via _launchCutscene (with start screen) ─────────── */
  function doLaunch() {
    if (!window._launchCutscene) return;

    /* Show heaven start screen first, then hand off to player */
    if (typeof window._showHeavenStartScreen === 'function') {
      window._showHeavenStartScreen(() => {
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
