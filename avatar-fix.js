/* ============================================================
   AVATAR FRAME ENGINE v2 — avatar-fix.js
   Load AFTER avatar-frames.js

   Extends window._natFrames with:
   · Expanded FRAME_REGISTRY (tiers: member → developer)
   · Theme-aware VIP/mythic variants
   · Mythic canvas particle system
   · Tier badge renderer with new tiers
   · Crown element builder for VIP
   · Safe upgrade path — does not break existing frame IDs
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     1. EXPANDED FRAME REGISTRY
     Adds new tier/theme combinations on top of existing frames.
     All new frame IDs follow the pattern: tier_theme
  ────────────────────────────────────────────────────────── */

  const EXTENDED_REGISTRY = {

    /* ── TIER: MEMBER ───────────────────────────────────── */
    member_default: {
      id:    'member_default',
      label: 'Member',
      tier:  'member',
      icon:  '○',
      cssClass: 'tier-member',
      layers: ['ring-outer', 'pulse'],
    },

    /* ── TIER: PREMIUM ──────────────────────────────────── */
    premium_default: {
      id:    'premium_default',
      label: 'Premium',
      tier:  'premium',
      icon:  '◈',
      cssClass: 'tier-premium',
      layers: ['ring-outer', 'ring-inner', 'glow'],
    },

    /* ── TIER: VIP (theme variants) ─────────────────────── */
    vip_space: {
      id:    'vip_space',
      label: 'VIP — Cosmic',
      tier:  'vip',
      icon:  '✦',
      cssClass: 'tier-vip vip-space',
      crown:  '✦',
      layers: ['nebula', 'ring-outer', 'ring-inner', 'ring-mid', 'glow', 'crown'],
    },
    vip_cyber: {
      id:    'vip_cyber',
      label: 'VIP — Cyber',
      tier:  'vip',
      icon:  '⟁',
      cssClass: 'tier-vip vip-cyber',
      crown:  '⟁',
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'scan', 'glow', 'crown'],
    },
    vip_heaven: {
      id:    'vip_heaven',
      label: 'VIP — Heaven',
      tier:  'vip',
      icon:  '✦',
      cssClass: 'tier-vip vip-heaven',
      crown:  '✦',
      layers: ['rays', 'ring-outer', 'ring-inner', 'ring-mid', 'glow', 'crown'],
    },
    vip_hell: {
      id:    'vip_hell',
      label: 'VIP — Hellfire',
      tier:  'vip',
      icon:  '◈',
      cssClass: 'tier-vip vip-hell',
      crown:  '◈',
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'lava', 'glow', 'crown'],
    },
    vip_forest: {
      id:    'vip_forest',
      label: 'VIP — Forest',
      tier:  'vip',
      icon:  '✿',
      cssClass: 'tier-vip vip-forest',
      crown:  '✿',
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'wisp-ring', 'glow', 'crown'],
    },
    vip_y2k: {
      id:    'vip_y2k',
      label: 'VIP — Y2K',
      tier:  'vip',
      icon:  '⋆',
      cssClass: 'tier-vip vip-y2k',
      crown:  '⋆',
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'holo', 'glow', 'crown'],
    },

    /* ── TIER: MYTHIC (theme variants) ─────────────────── */
    mythic_space: {
      id:    'mythic_space',
      label: 'Mythic — Cosmic',
      tier:  'mythic',
      icon:  '✦',
      cssClass: 'tier-mythic mythic-space',
      crown:  '✦',
      particleConfig: { theme: 'space', count: 12, colors: ['#c084fc', '#818cf8', '#f0e6ff'] },
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'shimmer', 'glow', 'particles'],
    },
    mythic_cyber: {
      id:    'mythic_cyber',
      label: 'Mythic — Cyber',
      tier:  'mythic',
      icon:  '⟁',
      cssClass: 'tier-mythic mythic-cyber',
      crown:  '⟁',
      particleConfig: { theme: 'cyber', count: 10, colors: ['#00fff7', '#00aaff', '#ff00ff'] },
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'shimmer', 'glow', 'particles'],
    },
    mythic_heaven: {
      id:    'mythic_heaven',
      label: 'Mythic — Heaven',
      tier:  'mythic',
      icon:  '✦',
      cssClass: 'tier-mythic mythic-heaven',
      crown:  '✦',
      particleConfig: { theme: 'heaven', count: 8, colors: ['#ffe066', '#fff9c4', '#ffffff'] },
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'shimmer', 'glow', 'particles'],
    },
    mythic_hell: {
      id:    'mythic_hell',
      label: 'Mythic — Hellfire',
      tier:  'mythic',
      icon:  '◈',
      cssClass: 'tier-mythic mythic-hell',
      crown:  '◈',
      particleConfig: { theme: 'hell', count: 14, colors: ['#ff2200', '#ff6600', '#ffdd00'] },
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'shimmer', 'glow', 'particles'],
    },
    mythic_forest: {
      id:    'mythic_forest',
      label: 'Mythic — Forest',
      tier:  'mythic',
      icon:  '✿',
      cssClass: 'tier-mythic mythic-forest',
      crown:  '✿',
      particleConfig: { theme: 'forest', count: 10, colors: ['#4ade80', '#22c55e', '#bbf7d0'] },
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'shimmer', 'glow', 'particles'],
    },
    mythic_y2k: {
      id:    'mythic_y2k',
      label: 'Mythic — Y2K',
      tier:  'mythic',
      icon:  '⋆',
      cssClass: 'tier-mythic mythic-y2k',
      crown:  '⋆',
      particleConfig: { theme: 'y2k', count: 12, colors: ['#f0f0ff', '#ff00cc', '#d0d0ff'] },
      layers: ['ring-outer', 'ring-inner', 'ring-mid', 'shimmer', 'glow', 'particles'],
    },

    /* ── TIER: DEVELOPER ────────────────────────────────── */
    developer: {
      id:    'developer',
      label: 'Developer',
      tier:  'developer',
      icon:  '⌨',
      cssClass: 'tier-developer',
      layers: ['ring-outer', 'glow', 'glitch', 'dev-badge'],
    },
  };

  const TIER_ORDER = {
    default:   0,
    member:    1,
    premium:   2,
    vip:       3,
    mythic:    4,
    developer: 5,
    legendary: 3, // existing tier from v1 — treated as VIP-equivalent
    epic:      2, // existing tier from v1 — treated as premium-equivalent
  };


  /* ──────────────────────────────────────────────────────────
     2. WAIT FOR V1 ENGINE THEN EXTEND IT
  ────────────────────────────────────────────────────────── */

  function _waitForEngine(cb, maxMs = 8000) {
    const start = Date.now();
    const check = setInterval(() => {
      if (window._natFrames) {
        clearInterval(check);
        cb();
      } else if (Date.now() - start > maxMs) {
        clearInterval(check);
        console.warn('[natFramesV2] timed out waiting for _natFrames');
      }
    }, 80);
  }

  _waitForEngine(() => {
    _mergeRegistry();
    _patchBuildFrameEl();
    _patchApplyAvatarFrame();
   // console.log('[natFramesV2] ✅ Extended frame engine active');
  });


  /* ──────────────────────────────────────────────────────────
     3. MERGE EXTENDED_REGISTRY INTO v1 REGISTRY
  ────────────────────────────────────────────────────────── */

  function _mergeRegistry() {
    const reg = window._natFrames.registry;
    Object.assign(reg, EXTENDED_REGISTRY);
  }


  /* ──────────────────────────────────────────────────────────
     4. PATCH _buildFrameEl TO USE cssClass
     The v1 engine hard-codes `nat-frame--${frameId}` for the
     frame element class. Extended frames use `cssClass` which
     can be multiple space-separated class names.
  ────────────────────────────────────────────────────────── */

  function _patchBuildFrameEl() {
    const original = window._natFrames._build;

    window._natFrames._build = function extBuildFrameEl(frameId) {
      const def = window._natFrames.registry[frameId];
      if (!def) return null;

      // Use cssClass if provided, else fall back to frameId (v1 compat)
      const extraClasses = def.cssClass
        ? def.cssClass.split(' ').map(c => `nat-frame--${c}`).join(' ')
        : `nat-frame--${frameId}`;

      const frame = document.createElement('div');
      frame.className = `nat-frame ${extraClasses}`;
      frame.setAttribute('aria-hidden', 'true');
      frame.dataset.frameId = frameId;

      def.layers.forEach(layerName => {
        if (layerName === 'crown') {
          // Crown is a special element, not a generic layer
          const crown = _buildCrown(def);
          if (crown) frame.appendChild(crown);
          return;
        }

        if (layerName === 'dev-badge') {
          const badge = _buildDevBadge();
          frame.appendChild(badge);
          return;
        }

        if (layerName === 'particles') {
          const particlesEl = _buildParticlesContainer(def);
          frame.appendChild(particlesEl);
          return;
        }

        const layer = document.createElement('div');
        layer.className = `nat-frame__layer nat-frame__${layerName}`;
        frame.appendChild(layer);
      });

      return frame;
    };
  }


  /* ──────────────────────────────────────────────────────────
     5. PATCH applyAvatarFrame TO HANDLE NEW TIER BADGES + PARTICLES
  ────────────────────────────────────────────────────────── */

  function _patchApplyAvatarFrame() {
    const original = window._natFrames.apply;

    window._natFrames.apply = function extApplyAvatarFrame(containerEl, frameId) {
      if (!containerEl) return;

      // Run original remove
      containerEl.querySelectorAll('.nat-frame').forEach(el => el.remove());
      containerEl.querySelectorAll('.nat-frame-tier-badge').forEach(el => el.remove());
      containerEl.classList.remove('nat-frame-host');

      if (!frameId) return;

      const def = window._natFrames.registry[frameId];
      if (!def) {
        // Fall back to v1 for unknown IDs
        original(containerEl, frameId);
        return;
      }

      // Mark host
      containerEl.classList.add('nat-frame-host');

      // Build frame element using patched builder
      const frameEl = window._natFrames._build(frameId);
      if (!frameEl) return;
      containerEl.appendChild(frameEl);

      // Start canvas particles if mythic
      if (def.particleConfig) {
        _startMythicParticles(frameEl, def.particleConfig);
      }
    };
  }


  /* ──────────────────────────────────────────────────────────
     6. TIER BADGE BUILDER
     Renders the correct badge for any tier.
  ────────────────────────────────────────────────────────── */

  const TIER_BADGE_META = {
    member:    { label: 'MEMBER',    cls: 'member' },
    premium:   { label: 'PREMIUM',   cls: 'premium' },
    vip:       { label: 'VIP',       cls: 'vip' },
    mythic:    { label: 'MYTHIC',    cls: 'mythic' },
    developer: { label: 'DEV',       cls: 'developer' },
    legendary: { label: 'LEGENDARY', cls: 'legendary' },
    epic:      { label: 'EPIC',      cls: 'epic' },
  };

  function _injectTierBadge(containerEl, def) {
    const meta = TIER_BADGE_META[def.tier];
    if (!meta || def.tier === 'default') return;

    const badge = document.createElement('div');
    badge.className = `nat-frame-tier-badge nat-frame-tier-badge--${meta.cls}`;
    badge.textContent = meta.label;
    containerEl.appendChild(badge);
  }


  /* ──────────────────────────────────────────────────────────
     7. CROWN ELEMENT BUILDER
  ────────────────────────────────────────────────────────── */

  function _buildCrown(def) {
    if (!def.crown) return null;
    const crown = document.createElement('div');
    crown.className = 'nat-frame__layer nat-frame__crown';
    crown.setAttribute('aria-hidden', 'true');
    crown.textContent = def.crown;
    return crown;
  }


  /* ──────────────────────────────────────────────────────────
     8. DEV BADGE BUILDER
  ────────────────────────────────────────────────────────── */

  function _buildDevBadge() {
    const badge = document.createElement('div');
    badge.className = 'nat-frame__dev-badge';
    badge.textContent = 'DEV';
    return badge;
  }


  /* ──────────────────────────────────────────────────────────
     9. PARTICLES CONTAINER BUILDER
  ────────────────────────────────────────────────────────── */

  function _buildParticlesContainer(def) {
    const wrap = document.createElement('div');
    wrap.className = 'nat-frame__layer nat-frame__particles';

    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);

    // Start particle loop after next frame to ensure layout is done
    requestAnimationFrame(() => {
      if (document.contains(canvas)) {
        _runParticleCanvas(canvas, def.particleConfig);
      }
    });

    return wrap;
  }


  /* ──────────────────────────────────────────────────────────
     10. MYTHIC CANVAS PARTICLE SYSTEM
     Lightweight GPU-safe canvas loop.
     Uses only requestAnimationFrame + 2D canvas (no WebGL).
     Mobile performance: halved particle count.
     Auto-stops when canvas is removed from DOM.
  ────────────────────────────────────────────────────────── */

  const isMobile = () => window.innerWidth <= 768;

  function _startMythicParticles(frameEl, config) {
    const canvas = frameEl.querySelector('.nat-frame__particles canvas');
    if (!canvas) return;
    _runParticleCanvas(canvas, config);
  }

  function _runParticleCanvas(canvas, config) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mobile  = isMobile();
    const count   = mobile ? Math.ceil(config.count / 2) : config.count;
    const colors  = config.colors;
    const theme   = config.theme;

    // Particle behavior by theme
    const BEHAVIORS = {
      space:  { rise: true,  orbit: true,  fade: true,  trail: 0.85 },
      cyber:  { rise: false, orbit: false, fade: false, trail: 0.75, scanline: true },
      heaven: { rise: true,  orbit: false, fade: true,  trail: 0.90 },
      hell:   { rise: true,  orbit: false, fade: true,  trail: 0.70, ember: true },
      forest: { rise: true,  orbit: false, fade: true,  trail: 0.88 },
      y2k:    { rise: false, orbit: true,  fade: true,  trail: 0.82, sparkle: true },
    };
    const behavior = BEHAVIORS[theme] || BEHAVIORS.space;

    // Resize canvas to match its parent layout size
    function resize() {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width  = rect.width  || 80;
      canvas.height = rect.height || 80;
    }
    resize();

    // Build particle pool
    function makeParticle(i) {
      const angle  = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const r      = (canvas.width / 2) * (0.75 + Math.random() * 0.3);
      return {
        x:     canvas.width / 2 + Math.cos(angle) * r,
        y:     canvas.height / 2 + Math.sin(angle) * r,
        angle,
        r,
        orbitR:  r,
        orbitSpd: (Math.random() > 0.5 ? 1 : -1) * (0.003 + Math.random() * 0.004),
        vy:    -(0.15 + Math.random() * 0.25),
        life:  Math.random(),
        decay: 0.004 + Math.random() * 0.006,
        size:  1.2 + Math.random() * 1.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        sparkAngle: Math.random() * Math.PI * 2,
      };
    }

    const particles = Array.from({ length: count }, (_, i) => makeParticle(i));

    let raf     = null;
    let running = true;

    function tick() {
      if (!running || !document.contains(canvas)) {
        cancelAnimationFrame(raf);
        return;
      }

      // Check if canvas size changed (font/zoom)
      if (canvas.width !== (canvas.parentElement?.clientWidth | 0)) resize();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.life -= p.decay;

        if (p.life <= 0) {
          // Respawn
          const np  = makeParticle(i);
          Object.assign(p, np);
          p.life = 0.8 + Math.random() * 0.2;
          return;
        }

        const alpha = p.life;

        if (behavior.orbit) {
          // Orbit around center
          p.angle += p.orbitSpd;
          p.x = canvas.width  / 2 + Math.cos(p.angle) * p.orbitR;
          p.y = canvas.height / 2 + Math.sin(p.angle) * p.orbitR;
        } else if (behavior.rise) {
          // Rise upward
          p.y += p.vy;
          p.x += Math.sin(p.life * 8) * 0.3; // gentle sway
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        if (behavior.ember) {
          // Ember: small orange square with rotation
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * 12);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur  = 4;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (behavior.sparkle) {
          // Y2K sparkle: 4-point star
          ctx.translate(p.x, p.y);
          ctx.rotate(p.sparkAngle + p.life * 5);
          ctx.strokeStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur  = 6;
          ctx.lineWidth   = 0.8;
          const s = p.size * 2;
          ctx.beginPath();
          ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
          ctx.moveTo(0, -s); ctx.lineTo(0, s);
          ctx.stroke();
        } else {
          // Default: glowing circle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur  = mobile ? 4 : 8;
          ctx.fill();
        }

        ctx.restore();
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    // Clean up when canvas is removed from DOM (MutationObserver)
    const cleanup = new MutationObserver(() => {
      if (!document.contains(canvas)) {
        running = false;
        cancelAnimationFrame(raf);
        cleanup.disconnect();
      }
    });
    cleanup.observe(document.body, { childList: true, subtree: true });
  }


  /* ──────────────────────────────────────────────────────────
     11. PUBLIC API EXTENSION
  ────────────────────────────────────────────────────────── */

  // Export tier order for use by UI / shop systems
  window._natFramesV2 = {
    registry:   EXTENDED_REGISTRY,
    tierOrder:  TIER_ORDER,
    tierMeta:   TIER_BADGE_META,

    // Utility: get all frames at or above a given tier
    getFramesAtTier(minTier) {
      const minOrder = TIER_ORDER[minTier] ?? 0;
      const all = { ...window._natFrames.registry };
      return Object.values(all).filter(f => (TIER_ORDER[f.tier] ?? 0) >= minOrder);
    },

    // Utility: get tier display label for a frame
    getTierLabel(frameId) {
      const def = window._natFrames.registry[frameId];
      return def ? (TIER_BADGE_META[def.tier]?.label ?? def.tier) : null;
    },
  };

})();
