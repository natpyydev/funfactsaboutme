/**
 * ═══════════════════════════════════════════════════════════════════
 * PROFESSIONAL MODE — CINEMATIC STATIC GALLERY
 * professional-cinematic-gallery.js
 *
 * Renders the SAME images defined in gallery-data.js (window.NAT_GALLERY)
 * with a cinematic, holographic, glassmorphism presentation.
 *
 * DATA: window.NAT_GALLERY.PICS  ← shared source of truth
 * PRESENTATION: floating cards, atmospheric depth, AAA visuals
 *
 * Drop AFTER gallery-data.js and professional-mode-cinematic.js.
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  if (!document.title.includes('Professional')) return;

  /* ── Wait for shared data to be available ────────────────────── */
  function waitForGalleryData (cb) {
    if (window.NAT_GALLERY?.PICS?.length) { cb(); return; }
    const t = setTimeout(() => waitForGalleryData(cb), 80);
    // Give up after 4 s (gallery-data.js not loaded)
    setTimeout(() => clearTimeout(t), 4000);
  }

  /* ══════════════════════════════════════════════════════════════
     STYLES — injected once
  ══════════════════════════════════════════════════════════════ */
  function injectStyles () {
    if (document.getElementById('pcg-styles')) return;
    const s = document.createElement('style');
    s.id = 'pcg-styles';
    s.textContent = `
/* ─── Orb access point ─────────────────────────────────────── */
#pcg-anchor {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0 40px;
  position: relative;
  z-index: 1;
}
#pcg-orb-btn {
  position: relative;
  width: 88px; height: 88px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: radial-gradient(circle at 35% 35%,
    rgba(0,240,255,.30) 0%,
    rgba(0,100,220,.14) 50%,
    rgba(0,20,80,.06) 100%);
  box-shadow:
    0 0 0 1px rgba(0,220,255,.22),
    0 0 28px rgba(0,200,255,.18),
    0 0 60px rgba(0,120,255,.10),
    inset 0 0 18px rgba(0,200,255,.10);
  animation: pcg-orb-pulse 3.6s ease-in-out infinite;
  outline: none;
  transition: transform .2s, box-shadow .2s;
}
#pcg-orb-btn:hover {
  transform: scale(1.08);
  box-shadow:
    0 0 0 1px rgba(0,220,255,.45),
    0 0 42px rgba(0,200,255,.35),
    0 0 90px rgba(0,120,255,.18),
    inset 0 0 24px rgba(0,200,255,.18);
}
.pcg-orb-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid rgba(0,220,255,.15);
  animation: pcg-ring-spin 8s linear infinite;
}
.pcg-orb-ring:nth-child(2) {
  inset: -14px;
  border-color: rgba(180,100,255,.10);
  animation-duration: 13s;
  animation-direction: reverse;
}
.pcg-orb-icon {
  font-size: 32px;
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  filter: drop-shadow(0 0 8px rgba(0,220,255,.6));
}
.pcg-orb-label {
  font-family: 'Space Grotesk', monospace, sans-serif;
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(0,220,255,.55);
}
@keyframes pcg-orb-pulse {
  0%,100% { box-shadow:
    0 0 0 1px rgba(0,220,255,.22),
    0 0 28px rgba(0,200,255,.18),
    0 0 60px rgba(0,120,255,.10),
    inset 0 0 18px rgba(0,200,255,.10); }
  50% { box-shadow:
    0 0 0 1px rgba(0,220,255,.40),
    0 0 42px rgba(0,200,255,.30),
    0 0 80px rgba(0,120,255,.16),
    inset 0 0 24px rgba(0,200,255,.16); }
}
@keyframes pcg-ring-spin {
  to { transform: rotate(360deg); }
}

/* ─── Overlay ───────────────────────────────────────────────── */
#pcg-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,2,12,.92);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity .45s ease;
}
#pcg-overlay.pcg-open {
  opacity: 1;
  pointer-events: all;
}

/* atmosphere scan-line */
#pcg-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0,200,255,.018) 3px,
    rgba(0,200,255,.018) 4px
  );
  pointer-events: none;
  z-index: 0;
}

/* ─── Close button ──────────────────────────────────────────── */
#pcg-close {
  position: fixed;
  top: 20px; right: 24px;
  z-index: 10002;
  background: rgba(0,20,50,.55);
  border: 1px solid rgba(0,200,255,.22);
  color: rgba(0,220,255,.8);
  font-size: 18px;
  width: 40px; height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12px);
  transition: background .2s, border-color .2s, transform .15s;
}
#pcg-close:hover { background: rgba(0,180,255,.15); border-color: rgba(0,220,255,.6); transform: scale(1.1); }

/* ─── Stage ─────────────────────────────────────────────────── */
#pcg-stage {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* ─── Floating card ─────────────────────────────────────────── */
.pcg-card {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(0,30,60,.75) 0%,
    rgba(0,10,30,.85) 100%
  );
  border: 1px solid rgba(0,200,255,.18);
  box-shadow:
    0 0 0 1px rgba(0,200,255,.06),
    0 24px 60px rgba(0,0,0,.7),
    0 0 80px rgba(0,100,255,.08),
    inset 0 1px 0 rgba(255,255,255,.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  opacity: 0;
  transform: translateY(22px) scale(.97);
  transition:
    opacity .38s cubic-bezier(.22,1,.36,1),
    transform .38s cubic-bezier(.22,1,.36,1);
  will-change: opacity, transform;
}
.pcg-card.pcg-card-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.pcg-card.pcg-card-exit {
  opacity: 0;
  transform: translateY(-16px) scale(.97);
  transition:
    opacity .22s ease,
    transform .22s ease;
}

/* image */
.pcg-card-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: rgba(0,10,30,.6);
}
.pcg-card-img-wrap img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.1) brightness(.96);
  transition: transform .6s cubic-bezier(.22,1,.36,1), filter .4s;
}
.pcg-card:hover .pcg-card-img-wrap img {
  transform: scale(1.04);
  filter: saturate(1.2) brightness(1.02);
}

/* chromatic-aberration shimmer on hover */
.pcg-card-img-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(0,220,255,.06) 0%,
    transparent 40%,
    rgba(180,80,255,.04) 100%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity .3s;
}
.pcg-card:hover .pcg-card-img-wrap::after { opacity: 1; }

/* special badge */
.pcg-special-badge {
  position: absolute;
  top: 12px; right: 12px;
  background: linear-gradient(135deg, rgba(255,210,0,.22), rgba(255,120,0,.16));
  border: 1px solid rgba(255,200,0,.35);
  color: rgba(255,220,80,1);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 4px;
  backdrop-filter: blur(8px);
  font-family: 'Space Grotesk', monospace, sans-serif;
  box-shadow: 0 0 16px rgba(255,180,0,.18);
  animation: pcg-glow-gold 2.4s ease-in-out infinite;
}
@keyframes pcg-glow-gold {
  0%,100% { box-shadow: 0 0 16px rgba(255,180,0,.18); }
  50%      { box-shadow: 0 0 28px rgba(255,180,0,.38); }
}

/* bottom meta bar */
.pcg-card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px 16px;
  border-top: 1px solid rgba(0,200,255,.08);
}
.pcg-card-alt {
  font-family: 'Space Grotesk', monospace, sans-serif;
  font-size: 13px;
  color: rgba(200,230,255,.75);
  letter-spacing: .5px;
}
.pcg-card-index {
  font-family: monospace;
  font-size: 10px;
  color: rgba(0,200,255,.4);
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* ─── Navigation ────────────────────────────────────────────── */
#pcg-nav {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}
.pcg-nav-btn {
  background: rgba(0,20,50,.55);
  border: 1px solid rgba(0,200,255,.22);
  color: rgba(0,220,255,.8);
  font-size: 20px;
  width: 44px; height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12px);
  transition: background .2s, border-color .2s, transform .15s;
}
.pcg-nav-btn:hover:not(:disabled) {
  background: rgba(0,180,255,.15);
  border-color: rgba(0,220,255,.55);
  transform: scale(1.08);
}
.pcg-nav-btn:disabled { opacity: .25; cursor: default; }

#pcg-counter {
  font-family: 'Space Grotesk', monospace, sans-serif;
  font-size: 11px;
  letter-spacing: 3px;
  color: rgba(0,200,255,.45);
  min-width: 60px;
  text-align: center;
}

/* ─── Dots ──────────────────────────────────────────────────── */
#pcg-dots {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 6px;
  margin-top: 14px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 300px;
}
.pcg-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(0,200,255,.18);
  border: 1px solid rgba(0,200,255,.22);
  transition: background .25s, transform .2s, box-shadow .25s;
}
.pcg-dot.pcg-dot-active {
  background: rgba(0,220,255,.8);
  box-shadow: 0 0 8px rgba(0,200,255,.6);
  transform: scale(1.25);
}

/* ─── Atmosphere particles ──────────────────────────────────── */
.pcg-particle {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 10001;
  animation: pcg-float linear infinite;
  will-change: transform, opacity;
}
@keyframes pcg-float {
  0%   { transform: translateY(100vh) scale(0); opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: .5; }
  100% { transform: translateY(-8vh) scale(1); opacity: 0; }
}

/* ─── Mobile ─────────────────────────────────────────────────── */
@media (max-width: 540px) {
  #pcg-stage { max-width: 100%; padding: 0 12px; }
  .pcg-card-img-wrap { aspect-ratio: 3/2; }
}
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════════ */
  let currentIdx   = 0;
  let isOpen       = false;
  let particles    = [];
  let particleRAF  = null;

  /* ══════════════════════════════════════════════════════════════
     DOM HELPERS
  ══════════════════════════════════════════════════════════════ */
  function el (id) { return document.getElementById(id); }

  /* ══════════════════════════════════════════════════════════════
     ORB INJECTION — places the access point in the page
  ══════════════════════════════════════════════════════════════ */
  function injectOrb () {
    if (el('pcg-anchor')) return;

    const anchor = document.createElement('div');
    anchor.id = 'pcg-anchor';
    anchor.innerHTML = `
      <button id="pcg-orb-btn" aria-label="Open cinematic gallery">
        <div class="pcg-orb-ring"></div>
        <div class="pcg-orb-ring"></div>
        <span class="pcg-orb-icon">📷</span>
      </button>
      <span class="pcg-orb-label">Gallery · Access Point</span>
    `;

    // Try to place after .ip-stats-grid or similar landmark
    const landmark =
      document.querySelector('.ip-stats-grid') ||
      document.querySelector('.ip-section:last-of-type') ||
      document.querySelector('footer') ||
      document.querySelector('.pro-sections');

    if (landmark) {
      landmark.insertAdjacentElement('afterend', anchor);
    } else {
      document.body.appendChild(anchor);
    }

    el('pcg-orb-btn').addEventListener('click', openGallery);
  }

  /* ══════════════════════════════════════════════════════════════
     OVERLAY INJECTION
  ══════════════════════════════════════════════════════════════ */
  function injectOverlay () {
    if (el('pcg-overlay')) return;

    const ov = document.createElement('div');
    ov.id = 'pcg-overlay';
    ov.innerHTML = `
      <button id="pcg-close" aria-label="Close gallery">✕</button>
      <div id="pcg-stage">
        <div class="pcg-card" id="pcg-card">
          <div class="pcg-card-img-wrap" id="pcg-img-wrap">
            <img id="pcg-img" src="" alt="">
          </div>
          <div class="pcg-card-meta">
            <div class="pcg-card-alt" id="pcg-alt"></div>
            <div class="pcg-card-index" id="pcg-index"></div>
          </div>
        </div>
      </div>
      <div id="pcg-nav">
        <button class="pcg-nav-btn" id="pcg-prev" aria-label="Previous">←</button>
        <div id="pcg-counter"></div>
        <button class="pcg-nav-btn" id="pcg-next" aria-label="Next">→</button>
      </div>
      <div id="pcg-dots"></div>
    `;
    document.body.appendChild(ov);

    el('pcg-close').addEventListener('click', closeGallery);
    el('pcg-prev').addEventListener('click', () => navigate(-1));
    el('pcg-next').addEventListener('click', () => navigate(+1));

    // Close on backdrop click
    ov.addEventListener('click', e => {
      if (e.target === ov) closeGallery();
    });

    // Keyboard nav
    document.addEventListener('keydown', e => {
      if (!isOpen) return;
      if (e.key === 'ArrowLeft')  navigate(-1);
      if (e.key === 'ArrowRight') navigate(+1);
      if (e.key === 'Escape')     closeGallery();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════════ */
  function openGallery () {
    if (isOpen) return;
    injectOverlay();
    isOpen = true;
    currentIdx = 0;
    renderCard(true);
    requestAnimationFrame(() => {
      el('pcg-overlay').classList.add('pcg-open');
    });
    startParticles();
    document.body.style.overflow = 'hidden';
  }

  function closeGallery () {
    if (!isOpen) return;
    isOpen = false;
    el('pcg-overlay').classList.remove('pcg-open');
    stopParticles();
    document.body.style.overflow = '';
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  function renderCard (animate) {
    const pics = window.NAT_GALLERY.PICS;
    const card = el('pcg-card');
    const img  = el('pcg-img');
    if (!card || !pics.length) return;

    const pic = pics[currentIdx];
    if (!pic) return;

    img.src = pic.src;
    img.alt = pic.alt;
    el('pcg-alt').textContent   = pic.alt;
    el('pcg-index').textContent = `FRAME ${String(currentIdx + 1).padStart(2, '0')} · ${pics.length} TOTAL`;

    // Special badge
    const existing = card.querySelector('.pcg-special-badge');
    if (existing) existing.remove();
    if (pic.special) {
      const badge = document.createElement('div');
      badge.className = 'pcg-special-badge';
      badge.textContent = '✨ Special';
      el('pcg-img-wrap').appendChild(badge);
    }

    // Counter
    el('pcg-counter').textContent = `${currentIdx + 1} / ${pics.length}`;

    // Dots
    renderDots();

    // Nav state
    el('pcg-prev').disabled = pics.length <= 1;
    el('pcg-next').disabled = pics.length <= 1;

    if (animate) {
      card.classList.remove('pcg-card-exit');
      void card.offsetWidth; // reflow
      card.classList.add('pcg-card-visible');
    }
  }

  function renderDots () {
    const pics = window.NAT_GALLERY.PICS;
    const wrap = el('pcg-dots');
    if (!wrap) return;
    wrap.innerHTML = '';
    pics.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'pcg-dot' + (i === currentIdx ? ' pcg-dot-active' : '');
      wrap.appendChild(d);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     NAVIGATION
  ══════════════════════════════════════════════════════════════ */
  function navigate (dir) {
    const pics = window.NAT_GALLERY.PICS;
    if (pics.length <= 1) return;

    const card = el('pcg-card');
    card.classList.remove('pcg-card-visible');
    card.classList.add('pcg-card-exit');

    setTimeout(() => {
      currentIdx = (currentIdx + dir + pics.length) % pics.length;
      card.classList.remove('pcg-card-exit');
      renderCard(true);
    }, 230);
  }

  /* ══════════════════════════════════════════════════════════════
     ATMOSPHERE PARTICLES
  ══════════════════════════════════════════════════════════════ */
  const PARTICLE_COLORS = [
    'rgba(0,220,255,.35)',
    'rgba(100,160,255,.25)',
    'rgba(180,80,255,.20)',
    'rgba(0,255,180,.18)',
  ];

  function spawnParticle () {
    const p = document.createElement('div');
    p.className = 'pcg-particle';
    const size = 2 + Math.random() * 3;
    const dur  = 6 + Math.random() * 10;
    const left = Math.random() * 100;
    p.style.cssText = `
      left:${left}vw;
      bottom:0;
      width:${size}px;
      height:${size}px;
      background:${PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]};
      animation-duration:${dur}s;
      animation-delay:-${Math.random() * dur}s;
    `;
    document.body.appendChild(p);
    particles.push(p);
    setTimeout(() => {
      p.remove();
      particles = particles.filter(x => x !== p);
    }, (dur + 1) * 1000);
  }

  function startParticles () {
    let count = 0;
    function spawn () {
      if (!isOpen) return;
      if (count < 22) { spawnParticle(); count++; }
      particleRAF = setTimeout(spawn, 320 + Math.random() * 400);
    }
    spawn();
  }

  function stopParticles () {
    clearTimeout(particleRAF);
    particles.forEach(p => p.remove());
    particles = [];
  }

  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */
  function init () {
    injectStyles();
    injectOrb();
  }

  waitForGalleryData(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });

})();
