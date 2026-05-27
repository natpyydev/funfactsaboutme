/**
 * ═══════════════════════════════════════════════════════════════════
 * PROFESSIONAL MODE — CINEMATIC PRESENTATION ENGINE
 * professional-mode-cinematic.js
 *
 * Drop this AFTER all other scripts on professional.html.
 *
 * What it does:
 *   • Injects all required DOM nodes (toast stack, modal root, particle
 *     canvas, log drawer, backdrop, hud bar, click-ring layer)
 *   • Intercepts window.showBadge / window.showAchievement /
 *     window.showReaction / window.triggerConfetti / window.playSound
 *     and any other meme-era global hooks — replacing them with the
 *     cinematic equivalents defined in professional-mode-cinematic.css
 *   • Provides the public API:  ProMode.toast()  ProMode.badge()
 *     ProMode.reaction()  ProMode.levelUp()  ProMode.quest()
 *   • Runs a subtle Web Audio Context for cinematic micro-sounds
 *     (no external files needed — generated via oscillators)
 *   • Particle canvas burst on badge unlock / level-up
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ── Guard: only run inside Professional Mode ─────────────────── */
  if (!document.title.includes('Professional')) return;

  /* ─────────────────────────────────────────────────────────────────
     1. DOM INJECTION
  ───────────────────────────────────────────────────────────────── */
  function injectRoot (id, tag, extras) {
    if (document.getElementById(id)) return document.getElementById(id);
    const el = document.createElement(tag || 'div');
    el.id = id;
    if (extras) Object.assign(el, extras);
    document.body.appendChild(el);
    return el;
  }

  const particleCanvas  = injectRoot('pro-particle-canvas', 'canvas');
  const toastStack      = injectRoot('pro-toast-stack');
  const modalBackdrop   = injectRoot('pro-modal-backdrop');
  const modalRoot       = injectRoot('pro-badge-modal-root');
  const hudBar          = injectRoot('pro-hud-bar');
  const logDrawer       = injectRoot('pro-log-drawer');
  const soundIndicator  = injectRoot('pro-sound-indicator');
  const vipAura         = injectRoot('pro-vip-aura');
  modalBackdrop.className = 'pro-modal-backdrop';

  soundIndicator.className = 'pro-sound-indicator';
  soundIndicator.setAttribute('title', 'Cinematic audio active');

  /* Particle canvas sizing */
  function resizeParticleCanvas () {
    particleCanvas.width  = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }
  resizeParticleCanvas();
  window.addEventListener('resize', resizeParticleCanvas);

  /* Build log drawer HTML */
  logDrawer.innerHTML = `
    <div class="pro-log-header">
      <span class="pro-log-header__title">Achievement Log</span>
      <button class="pro-log-header__close" id="pro-log-close">[  Close  ]</button>
    </div>
    <div class="pro-log-list" id="pro-log-list"></div>
  `;
  document.getElementById('pro-log-close').addEventListener('click', () => {
    logDrawer.classList.remove('pro-log-drawer--open');
  });

  /* ─────────────────────────────────────────────────────────────────
     2. WEB AUDIO — CINEMATIC MICRO SOUNDS
  ───────────────────────────────────────────────────────────────── */
  let audioCtx = null;
  function getAudio () {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    return audioCtx;
  }

  const Sounds = {
    /** Soft ascending shimmer — used for toast */
    shimmer () {
      const ctx = getAudio(); if (!ctx) return;
      const t = ctx.currentTime;
      [440, 554, 659, 880].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.06, t + i * 0.07 + 0.04);
        gain.gain.linearRampToValueAtTime(0, t + i * 0.07 + 0.35);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.4);
      });
    },

    /** Deeper resonant reveal — badge modal */
    reveal () {
      const ctx = getAudio(); if (!ctx) return;
      const t = ctx.currentTime;
      [[220, 0.12, 0.6], [440, 0.07, 0.8], [880, 0.04, 1.2]].forEach(([freq, vol, dur]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + dur + 0.1);
      });
    },

    /** Gold legendary — richer chord */
    legendary () {
      const ctx = getAudio(); if (!ctx) return;
      const t = ctx.currentTime;
      [[261.6, 0.08], [329.6, 0.06], [392, 0.06], [523.3, 0.05]].forEach(([freq, vol], i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + i * 0.05);
        gain.gain.linearRampToValueAtTime(vol, t + i * 0.05 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 1.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 1.5);
      });
    },

    /** Subtle click — reaction */
    click () {
      const ctx = getAudio(); if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.15);
    },

    /** Level-up sweeping rise */
    levelUp () {
      const ctx = getAudio(); if (!ctx) return;
      const t = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.05);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.frequency.linearRampToValueAtTime(8000, t + 0.5);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.8);
    }
  };

  /* Flash the sound indicator briefly when audio plays */
  function flashSoundIndicator () {
    soundIndicator.classList.add('pro-sound-indicator--active');
    clearTimeout(soundIndicator._t);
    soundIndicator._t = setTimeout(() => {
      soundIndicator.classList.remove('pro-sound-indicator--active');
    }, 1200);
  }

  /* ─────────────────────────────────────────────────────────────────
     3. PARTICLE BURST
  ───────────────────────────────────────────────────────────────── */
  const pCtx = particleCanvas.getContext('2d');
  let particles = [];

  function spawnParticles (cx, cy, isGold) {
    const colors = isGold
      ? ['#c8a96e','#e8d0a0','#f0e8c8','#a07838','#d4b878']
      : ['#00dcff','#00a8d4','#ffffff','#60eeff','#0094b0'];
    for (let i = 0; i < 38; i++) {
      const angle = (Math.PI * 2 * i) / 38 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 3.5 + 1;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        r: Math.random() * 2.5 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        life: 1
      });
    }
  }

  let particleActive = false;
  function runParticles () {
    if (!particleActive && particles.length === 0) return;
    particleActive = true;
    pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    let alive = false;
    particles.forEach(p => {
      p.life -= 0.018;
      if (p.life <= 0) return;
      alive = true;
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.08;
      p.alpha = p.life * 0.9;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fillStyle = p.color;
      pCtx.globalAlpha = p.alpha;
      pCtx.fill();
      pCtx.globalAlpha = 1;
    });
    particles = particles.filter(p => p.life > 0);
    if (!alive && particles.length === 0) {
      particleActive = false;
      pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      return;
    }
    requestAnimationFrame(runParticles);
  }

  /* ─────────────────────────────────────────────────────────────────
     4. HUD BAR FLASH
  ───────────────────────────────────────────────────────────────── */
  function flashHudBar (isGold) {
    hudBar.className = 'pro-hud-bar' + (isGold ? ' pro-hud-bar--gold' : '');
    requestAnimationFrame(() => {
      hudBar.classList.add('pro-hud-bar--in');
      setTimeout(() => { hudBar.classList.remove('pro-hud-bar--in'); }, 1400);
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     5. ACHIEVEMENT LOG
  ───────────────────────────────────────────────────────────────── */
  const logList = () => document.getElementById('pro-log-list');
  const MAX_LOG = 50;

  function addToLog (icon, name, isGold, timestamp) {
    const list = logList();
    if (!list) return;
    const now  = timestamp || new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const item = document.createElement('div');
    item.className = 'pro-log-item' + (isGold ? ' pro-log-item--gold' : '');
    item.innerHTML = `
      <div class="pro-log-item__icon">${icon}</div>
      <div class="pro-log-item__body">
        <div class="pro-log-item__name">${name}</div>
        <div class="pro-log-item__time">${time}</div>
      </div>
      <div class="pro-log-item__new"></div>
    `;
    list.prepend(item);
    /* Remove new dot after 5s */
    setTimeout(() => {
      const dot = item.querySelector('.pro-log-item__new');
      if (dot) dot.remove();
    }, 5000);
    /* Trim old entries */
    while (list.children.length > MAX_LOG) list.removeChild(list.lastChild);
  }

  /* ─────────────────────────────────────────────────────────────────
     6. TOAST SYSTEM
  ───────────────────────────────────────────────────────────────── */
  const TOAST_DURATION = 4200; /* ms */
  const MAX_TOASTS     = 4;

  function ProToast ({ icon, label, title, desc, isGold, duration }) {
    const dur = duration || TOAST_DURATION;
    /* Trim oldest if too many */
    const existing = toastStack.querySelectorAll('.pro-toast');
    if (existing.length >= MAX_TOASTS) {
      dismissToast(existing[0]);
    }

    const el = document.createElement('div');
    el.className = 'pro-toast' + (isGold ? ' pro-toast--gold' : '');
    el.innerHTML = `
      <div class="pro-toast__icon">${icon}</div>
      <div class="pro-toast__body">
        <div class="pro-toast__label">${label}</div>
        <div class="pro-toast__title">${title}</div>
        ${desc ? `<div class="pro-toast__desc">${desc}</div>` : ''}
      </div>
      <div class="pro-toast__timer"><div class="pro-toast__timer-bar"></div></div>
    `;
    toastStack.appendChild(el);

    /* Slide in */
    requestAnimationFrame(() => {
      el.classList.add('pro-toast--in');
      /* Animate timer bar drain */
      const bar = el.querySelector('.pro-toast__timer-bar');
      if (bar) {
        bar.style.transition = `transform ${dur}ms linear`;
        requestAnimationFrame(() => { bar.style.transform = 'scaleX(0)'; });
      }
    });

    /* Click to dismiss */
    el.addEventListener('click', () => dismissToast(el));

    /* Auto-dismiss */
    el._timeout = setTimeout(() => dismissToast(el), dur);

    return el;
  }

  function dismissToast (el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    clearTimeout(el._timeout);
    el.classList.add('pro-toast--out');
    setTimeout(() => el.remove(), 450);
  }

  /* ─────────────────────────────────────────────────────────────────
     7. BADGE MODAL
  ───────────────────────────────────────────────────────────────── */
  let modalOpen = false;
  let modalQueue = [];

  function showNextModal () {
    if (modalOpen || modalQueue.length === 0) return;
    modalOpen = true;
    const { icon, name, desc, howTo, isGold } = modalQueue.shift();

    /* Backdrop */
    modalBackdrop.classList.add('pro-modal-backdrop--in');

    /* Build modal */
    const modal = document.createElement('div');
    modal.className = 'pro-badge-modal' + (isGold ? ' pro-badge-modal--gold' : '');
    modal.innerHTML = `
      <div class="pro-badge-modal__scan"></div>
      <div class="pro-badge-modal__header">
        <span class="pro-badge-modal__sys">SYS // BADGE_UNLOCK</span>
        <button class="pro-badge-modal__close" id="pro-modal-close-btn">[  ×  ]</button>
      </div>
      <div class="pro-badge-modal__hero">
        <div class="pro-badge-modal__orb">
          <div class="pro-badge-modal__orb-ring"></div>
          <div class="pro-badge-modal__orb-ring"></div>
          <div class="pro-badge-modal__icon ${isGold ? 'pro-badge-modal__icon--gold' : ''}">${icon}</div>
        </div>
        <div class="pro-badge-modal__acquired ${isGold ? 'pro-badge-modal__acquired--gold' : ''}">
          — Badge Acquired —
        </div>
        <div class="pro-badge-modal__name">${name}</div>
        <div class="pro-badge-modal__desc">${desc || ''}</div>
        ${howTo ? `<div class="pro-badge-modal__howto">How to obtain: ${howTo}</div>` : ''}
      </div>
      <div class="pro-badge-modal__footer">
        <span class="pro-badge-modal__tag">natpyydev · professional mode</span>
        <button class="pro-badge-modal__dismiss">[ Acknowledge ]</button>
      </div>
    `;
    modalRoot.appendChild(modal);

    /* Particle burst from center */
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    spawnParticles(cx, cy, isGold);
    runParticles();

    /* Sound */
    if (isGold) { Sounds.legendary(); } else { Sounds.reveal(); }
    flashSoundIndicator();
    flashHudBar(isGold);

    /* Animate in */
    requestAnimationFrame(() => { modal.classList.add('pro-badge-modal--in'); });

    const dismissModal = () => {
      modal.classList.add('pro-badge-modal--out');
      modalBackdrop.classList.remove('pro-modal-backdrop--in');
      setTimeout(() => {
        modal.remove();
        modalOpen = false;
        showNextModal();
      }, 450);
    };

    modal.querySelector('#pro-modal-close-btn').addEventListener('click', dismissModal);
    modal.querySelector('.pro-badge-modal__dismiss').addEventListener('click', dismissModal);
    modalBackdrop.addEventListener('click', dismissModal, { once: true });

    /* Auto-dismiss after 18s */
    modal._timeout = setTimeout(dismissModal, 18000);
  }

  /* ─────────────────────────────────────────────────────────────────
     8. REACTION FEEDBACK
  ───────────────────────────────────────────────────────────────── */
  const REACTION_LABELS = {
    '😍': 'Admired',
    '😭': 'Moved',
    '💅': 'Acknowledged',
    '🥺': 'Cherished',
    '😆': 'Noted',
    '🤩': 'Impressed',
    '👑': 'Revered',
    '💀': 'Destroyed',
    '😤': 'Challenged',
    default: 'Recorded'
  };

  function spawnReactionFloat (emoji, x, y) {
    const label = REACTION_LABELS[emoji] || REACTION_LABELS.default;
    const el = document.createElement('div');
    el.className = 'pro-reaction-float';
    el.style.left = `${x}px`;
    el.style.top  = `${y - 16}px`;
    el.textContent = label;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);

    /* Holographic click ring */
    const ring = document.createElement('div');
    ring.className = 'pro-click-ring';
    ring.style.left = `${x}px`;
    ring.style.top  = `${y}px`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 750);

    Sounds.click();
    flashSoundIndicator();
  }

  /* ─────────────────────────────────────────────────────────────────
     9. PUBLIC API
  ───────────────────────────────────────────────────────────────── */
  const isGoldBadge = (id) => {
    return id && (
      id.includes('asc_') || id.includes('champion') ||
      id.includes('vip')  || id.includes('legend')   ||
      id.includes('omega')|| id.includes('bigbang')   ||
      id.includes('divine')
    );
  };

  window.ProMode = {

    /**
     * Show a toast notification
     * @param {Object} opts - { icon, label, title, desc, isGold, duration }
     */
    toast (opts) {
      Sounds.shimmer();
      flashSoundIndicator();
      ProToast(opts);
    },

    /**
     * Show the holographic badge unlock modal + toast
     * @param {Object} badge - { id, icon, label, desc, howTo }
     */
    badge (badge) {
      const gold = isGoldBadge(badge.id) || badge.isGold;

      /* Toast first — immediate feedback */
      ProToast({
        icon: badge.icon || '🏅',
        label: 'Badge Unlocked',
        title: badge.label || badge.name || 'Achievement',
        desc:  badge.desc  || '',
        isGold: gold,
        duration: 5500
      });
      Sounds.shimmer();
      flashSoundIndicator();

      /* Queue modal */
      modalQueue.push({
        icon:  badge.icon  || '🏅',
        name:  badge.label || badge.name || 'Achievement',
        desc:  badge.desc  || '',
        howTo: badge.howTo || '',
        isGold: gold
      });
      showNextModal();

      addToLog(badge.icon || '🏅', badge.label || badge.name || 'Achievement', gold);
    },

    /**
     * Reaction feedback at a screen position
     * @param {string} emoji
     * @param {number} x  - screen X
     * @param {number} y  - screen Y
     */
    reaction (emoji, x, y) {
      spawnReactionFloat(emoji, x, y);
    },

    /**
     * Level-up cinematic
     * @param {number} level
     * @param {string} [label]
     */
    levelUp (level, label) {
      const el = document.createElement('div');
      el.className = 'pro-level-announce';
      el.innerHTML = `
        <div class="pro-level-announce__eyebrow">Level Acquired</div>
        <div class="pro-level-announce__num">${level}</div>
        <div class="pro-level-announce__label">${label || 'Prestige Rank'}</div>
      `;
      document.body.appendChild(el);

      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      spawnParticles(cx, cy, false);
      spawnParticles(cx - 80, cy, false);
      spawnParticles(cx + 80, cy, false);
      runParticles();
      Sounds.levelUp();
      flashSoundIndicator();
      flashHudBar(false);

      requestAnimationFrame(() => { el.classList.add('pro-level-announce--in'); });
      setTimeout(() => {
        el.classList.add('pro-level-announce--out');
        setTimeout(() => el.remove(), 600);
      }, 3000);

      ProToast({
        icon: '◈',
        label: 'Prestige Rank',
        title: `Level ${level} Achieved`,
        desc: label || '',
        isGold: false,
        duration: 5000
      });
    },

    /**
     * Quest / challenge complete
     * @param {string} title
     * @param {string} [xpLabel]
     */
    quest (title, xpLabel) {
      const el = document.createElement('div');
      el.className = 'pro-quest-complete';
      el.innerHTML = `
        <div class="pro-quest-complete__label">Objective Complete</div>
        <div class="pro-quest-complete__title">${title}</div>
        ${xpLabel ? `<div class="pro-quest-complete__xp">+ ${xpLabel}</div>` : ''}
      `;
      document.body.appendChild(el);
      requestAnimationFrame(() => { el.classList.add('pro-quest-complete--in'); });
      Sounds.shimmer();
      flashSoundIndicator();
      setTimeout(() => {
        el.classList.remove('pro-quest-complete--in');
        setTimeout(() => el.remove(), 600);
      }, 4000);
    },

    /** Open the achievement log drawer */
    openLog () {
      logDrawer.classList.add('pro-log-drawer--open');
    },

    /** Toggle VIP atmospheric aura */
    setVIP (active) {
      vipAura.classList.toggle('pro-vip-aura--active', !!active);
    }
  };

  /* ─────────────────────────────────────────────────────────────────
     10. INTERCEPT MEME-ERA GLOBAL HOOKS
         Replaces any existing window.showBadge / window.triggerConfetti
         / window.playSound etc. with cinematic equivalents so that
         all existing badge/achievement JS continues to function but
         outputs the Professional Mode presentation instead.
  ───────────────────────────────────────────────────────────────── */

  /* Badge unlock hooks (various names used across the codebase) */
  ['showBadge', 'awardBadge', 'unlockBadge', 'displayBadge'].forEach(fn => {
    const original = window[fn];
    window[fn] = function (badge, ...rest) {
      /* Call original for internal state changes (Firebase writes etc.) */
      if (typeof original === 'function') {
        try { original.call(this, badge, ...rest); } catch (_) {}
      }
      /* Override presentation */
      if (badge && (badge.id || badge.label || badge.name)) {
        ProMode.badge(badge);
      }
    };
  });

  /* Achievement / unlock hooks */
  ['showAchievement', 'unlockAchievement', 'triggerAchievement'].forEach(fn => {
    const original = window[fn];
    window[fn] = function (data, ...rest) {
      if (typeof original === 'function') {
        try { original.call(this, data, ...rest); } catch (_) {}
      }
      const badge = typeof data === 'string'
        ? { label: data, icon: '🏅' }
        : (data || {});
      ProMode.badge(badge);
    };
  });

  /* Confetti — replaced with particle burst */
  ['triggerConfetti', 'showConfetti', 'launchConfetti', 'confetti'].forEach(fn => {
    const original = window[fn];
    window[fn] = function (...args) {
      /* Intentionally NOT calling original — no confetti in Pro Mode */
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      spawnParticles(cx, cy, false);
      runParticles();
    };
  });

  /* Sound hooks — replace with cinematic audio */
  ['playSound', 'playSfx', 'playEffect'].forEach(fn => {
    window[fn] = function (soundId) {
      /* Map common meme sound IDs to cinematic equivalents */
      if (!soundId) return;
      const id = String(soundId).toLowerCase();
      if (id.includes('badge') || id.includes('unlock') || id.includes('achieve')) {
        Sounds.shimmer();
      } else if (id.includes('level') || id.includes('prestige')) {
        Sounds.levelUp();
      } else if (id.includes('legendary') || id.includes('gold') || id.includes('epic')) {
        Sounds.legendary();
      } else if (id.includes('click') || id.includes('react')) {
        Sounds.click();
      }
      flashSoundIndicator();
    };
  });

  /* Reaction hooks */
  ['showReaction', 'displayReaction', 'fireReaction'].forEach(fn => {
    const original = window[fn];
    window[fn] = function (emoji, x, y, ...rest) {
      if (typeof original === 'function') {
        try { original.call(this, emoji, x, y, ...rest); } catch (_) {}
      }
      ProMode.reaction(emoji, x || window.innerWidth / 2, y || window.innerHeight / 2);
    };
  });

  /* Level / prestige hooks */
  ['showLevelUp', 'triggerLevelUp', 'displayLevelUp', 'onPrestige'].forEach(fn => {
    const original = window[fn];
    window[fn] = function (level, label, ...rest) {
      if (typeof original === 'function') {
        try { original.call(this, level, label, ...rest); } catch (_) {}
      }
      ProMode.levelUp(level, label);
    };
  });

  /* Quest hooks */
  ['showQuestComplete', 'questComplete', 'challengeComplete'].forEach(fn => {
    const original = window[fn];
    window[fn] = function (title, xp, ...rest) {
      if (typeof original === 'function') {
        try { original.call(this, title, xp, ...rest); } catch (_) {}
      }
      ProMode.quest(title, xp);
    };
  });

  /* Kill any meme popups that get added dynamically */
  const memeSelectors = [
    '.meme-popup', '.emoji-rain', '.confetti-wrapper',
    '.sparkle-burst', '#bongocat-container', '#chibi-container',
    '#stars-container', '#hearts-container', '[class*="meme-"]'
  ].join(', ');

  const memeMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches(memeSelectors)) {
          node.style.display = 'none';
          node.style.visibility = 'hidden';
          node.style.pointerEvents = 'none';
        }
        /* Also scrub children */
        node.querySelectorAll && node.querySelectorAll(memeSelectors).forEach(el => {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        });
      });
    });
  });
  memeMutationObserver.observe(document.body, { childList: true, subtree: true });

  /* ─────────────────────────────────────────────────────────────────
     11. GALLERY REACTION INTERCEPT
         Wraps any click on .reaction-btn or [data-emoji] so that
         the reaction feedback uses the cinematic float — not the
         meme popup that shipped with hobby-reactions.js
  ───────────────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-emoji], .reaction-btn, .emoji-btn, .react-btn');
    if (!btn) return;
    const emoji = btn.dataset.emoji || btn.textContent.trim();
    if (!emoji) return;
    ProMode.reaction(emoji, e.clientX, e.clientY);
  }, true);

  /* ─────────────────────────────────────────────────────────────────
     12. AUDIO CONTEXT UNLOCK (must be triggered by user gesture)
  ───────────────────────────────────────────────────────────────── */
  const unlockAudio = () => {
    const ctx = getAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
  document.addEventListener('click',   unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  /* ─────────────────────────────────────────────────────────────────
     13. KEYBOARD SHORTCUT — open achievement log
  ───────────────────────────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    /* L key = open log */
    if (e.key === 'l' || e.key === 'L') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      ProMode.openLog();
    }
    /* Escape = close modal / log */
    if (e.key === 'Escape') {
      logDrawer.classList.remove('pro-log-drawer--open');
      const modal = document.querySelector('.pro-badge-modal');
      if (modal) {
        modal.classList.add('pro-badge-modal--out');
        modalBackdrop.classList.remove('pro-modal-backdrop--in');
        setTimeout(() => { modal.remove(); modalOpen = false; showNextModal(); }, 450);
      }
    }
  });

  /* ─────────────────────────────────────────────────────────────────
     14. DEMO / INIT CONFIRMATION (silent, no console spam)
  ───────────────────────────────────────────────────────────────── */
  window.__proModeActive = true;

  /* Announce Professional Mode is live after page settles */
  window.addEventListener('load', () => {
    setTimeout(() => {
      ProMode.toast({
        icon: '◈',
        label: 'System',
        title: 'Professional Mode Active',
        desc: 'Cinematic presentation layer engaged — Press L for log',
        isGold: false,
        duration: 5000
      });
    }, 4800); /* after dimension-entry dissolves */
  });

})();
