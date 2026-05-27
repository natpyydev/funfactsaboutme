/* ============================================================
   AVATAR FRAMES UI — avatar-frames-ui.js
   v1.0 — Phase 4

   Provides:
   · Full-screen cosmetic selector panel (like Mobile Legends / Valorant)
   · Live animated preview of every frame
   · Equip / unequip with one tap
   · "Frames" button injected next to profPfpEdit on profile page
   · Accessible, mobile-first, dark-mode-aware

   LOAD ORDER: defer, after avatar-frames.js
     <script defer src="avatar-frames-ui.js"></script>

   DEPENDS ON:
     window._natFrames   (avatar-frames.js)
     window._natPfp      (app.js)
     window.currentUID   (app.js)
     window.showToast    (app.js — optional, falls back to console)
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     CONSTANTS
  ────────────────────────────────────────────────────────── */

  const Z_PANEL     = 9600; // above nat-overlay (9500) but below toasts
  const ANIM_IN_MS  = 380;
  const ANIM_OUT_MS = 260;

  // Tier display config
const TIER_META = (function() {
  if (window._natFramesNormalized?.tierMeta) {
    return window._natFramesNormalized.tierMeta;
  }

  return {
    vip:       { label: 'VIP',       color: '#a855f7', glow: 'rgba(168,85,247,0.45)' },
    premium:   { label: 'PREMIUM',   color: '#6366f1', glow: 'rgba(99,102,241,0.35)' },
    mythic:    { label: 'MYTHIC',    color: '#ffb800', glow: 'rgba(255,184,0,0.45)' },
    developer: { label: 'DEVELOPER', color: '#bf6fff', glow: 'rgba(160,80,255,0.55)' },
    member:    { label: 'MEMBER',    color: '#94a3b8', glow: 'rgba(148,163,184,0.25)' },
  };
})();

  // Frame theme accent colors (for panel card backgrounds & hover states)
  const FRAME_ACCENTS = {
    cyber_neon:    { bg: 'rgba(0,255,231,0.07)',  border: 'rgba(0,255,231,0.35)',  glow: '0 0 18px rgba(0,255,231,0.25)' },
    galactic:      { bg: 'rgba(168,85,247,0.07)', border: 'rgba(168,85,247,0.35)', glow: '0 0 18px rgba(168,85,247,0.25)' },
    hellfire:      { bg: 'rgba(255,68,0,0.07)',   border: 'rgba(255,68,0,0.35)',   glow: '0 0 18px rgba(255,68,0,0.25)' },
    heaven_divine: { bg: 'rgba(255,215,0,0.07)',  border: 'rgba(255,215,0,0.35)',  glow: '0 0 18px rgba(255,215,0,0.25)' },
    y2k_chrome:    { bg: 'rgba(200,200,220,0.07)', border: 'rgba(200,200,220,0.4)', glow: '0 0 18px rgba(200,200,220,0.2)' },
    forest_spirit: { bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.35)',  glow: '0 0 18px rgba(34,197,94,0.25)' },
    developer:     { bg: 'rgba(160,80,255,0.09)', border: 'rgba(160,80,255,0.5)',  glow: '0 0 22px rgba(160,80,255,0.35), 0 0 40px rgba(0,207,255,0.2)' },
  };


  /* ──────────────────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────────────────── */

  function _toast(msg) {
    if (window.showToast) { window.showToast(msg); return; }
    console.log('[natFrames UI]', msg);
  }

  function _uid() { return window.currentUID || null; }

  function _frames() { return window._natFrames; }

  /** Get current user's pfp src from _natPfp cache */
  function _myPfpSrc() {
    const uid = _uid();
    if (!uid) return null;
    return window._natPfp?.cache[uid] || null;
  }


  /* ──────────────────────────────────────────────────────────
     STYLES — injected once into <head>
  ────────────────────────────────────────────────────────── */

  function _injectStyles() {
    if (document.getElementById('nat-frames-ui-css')) return;
    const s = document.createElement('style');
    s.id = 'nat-frames-ui-css';
    s.textContent = `

/* ── TRIGGER BUTTON (profile page) ── */
.nat-frames-trigger {
  position: absolute;
  left: -2px;
  bottom: -2px;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2.5px solid #fff;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
  display: grid; place-items: center;
  transition: transform .15s, box-shadow .15s;
  z-index: 10;
  line-height: 1;
}
.nat-frames-trigger:hover {
  transform: scale(1.15) rotate(-8deg);
  box-shadow: 0 4px 14px rgba(0,200,255,0.5), 0 0 0 2px rgba(0,200,255,0.3);
}
.nat-frames-trigger[data-equipped]::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid rgba(0,255,200,0.7);
  animation: nfu-trigger-pulse 2s ease-in-out infinite;
}
@keyframes nfu-trigger-pulse {
  0%,100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.08); }
}

/* ── BACKDROP ── */
.nfu-backdrop {
  position: fixed; inset: 0;
  background: rgba(8, 4, 20, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: ${Z_PANEL};
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  opacity: 0;
  transition: opacity ${ANIM_OUT_MS}ms ease;
}
.nfu-backdrop.nfu-visible {
  opacity: 1;
}

/* ── PANEL (bottom sheet on mobile, centered modal on desktop) ── */
.nfu-panel {
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  background: linear-gradient(170deg, #0d0920 0%, #120830 40%, #0a1628 100%);
  border-radius: 28px 28px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  border-left: 1px solid rgba(255,255,255,0.05);
  border-right: 1px solid rgba(255,255,255,0.05);
  box-shadow:
    0 -8px 40px rgba(0,0,0,0.6),
    0 -1px 0 rgba(255,255,255,0.06),
    inset 0 1px 0 rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform ${ANIM_IN_MS}ms cubic-bezier(.34,1.4,.64,1);
  will-change: transform;
}
.nfu-backdrop.nfu-visible .nfu-panel {
  transform: translateY(0);
}

@media (min-width: 600px) {
  .nfu-backdrop {
    align-items: center;
    padding: 16px;
  }
  .nfu-panel {
    border-radius: 24px;
    max-height: 88vh;
    border: 1px solid rgba(255,255,255,0.08);
  }
}

/* ── DRAG HANDLE ── */
.nfu-handle {
  width: 40px; height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 99px;
  margin: 12px auto 0;
  flex-shrink: 0;
}

/* ── HEADER ── */
.nfu-header {
  padding: 14px 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.nfu-title {
  font-family: 'Poppins', 'Nunito', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: flex; align-items: center; gap: 8px;
}
.nfu-title-icon {
  font-size: 20px;
  filter: drop-shadow(0 0 6px rgba(0,200,255,0.7));
}
.nfu-close {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  width: 32px; height: 32px;
  display: grid; place-items: center;
  cursor: pointer;
  font-size: 18px; line-height: 1;
  color: rgba(255,255,255,0.6);
  transition: background .15s, color .15s, transform .15s;
}
.nfu-close:hover {
  background: rgba(255,80,80,0.2);
  color: #ff8080;
  transform: rotate(90deg);
}

/* ── PREVIEW ZONE ── */
.nfu-preview-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 20px 10px;
  flex-shrink: 0;
  position: relative;
}

/* Animated background behind preview avatar */
.nfu-preview-bg {
  position: absolute;
  inset: 0;
  opacity: 0.25;
  transition: background 0.5s ease;
  pointer-events: none;
}

.nfu-preview-avatar-wrap {
  position: relative;
  width: 96px; height: 96px;
  z-index: 1;
}

/* The actual img inside preview */
.nfu-preview-img {
  width: 100%; height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.08);
}
.nfu-preview-placeholder {
  width: 100%; height: 100%;
  border-radius: 50%;
  display: grid; place-items: center;
  font-size: 44px;
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.08);
}

/* Frame name under preview */
.nfu-preview-label {
  font-family: 'Poppins', 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: 10px;
  color: rgba(255,255,255,0.5);
  z-index: 1;
  min-height: 20px;
  transition: color 0.3s;
}
.nfu-preview-label.has-frame {
  color: #fff;
  text-shadow: 0 0 12px currentColor;
}
.nfu-preview-tier {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  padding: 2px 8px;
  border-radius: 99px;
  margin-top: 4px;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s;
}
.nfu-preview-tier.visible {
  opacity: 1;
}

/* ── DIVIDER ── */
.nfu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  margin: 4px 20px;
  flex-shrink: 0;
}

/* ── SECTION LABEL ── */
.nfu-section-label {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  padding: 6px 20px 4px;
  flex-shrink: 0;
}

/* ── GRID (frame cards) ── */
.nfu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 4px 16px 6px;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.nfu-grid::-webkit-scrollbar { width: 4px; }
.nfu-grid::-webkit-scrollbar-track { background: transparent; }
.nfu-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }

@media (min-width: 420px) {
  .nfu-grid { grid-template-columns: repeat(3, 1fr); }
}

/* ── FRAME CARD ── */
.nfu-card {
  position: relative;
  border-radius: 16px;
  padding: 12px 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border: 1.5px solid transparent;
  background: rgba(255,255,255,0.04);
  transition: transform .18s cubic-bezier(.34,1.4,.64,1),
              border-color .2s,
              box-shadow .2s,
              background .2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.nfu-card:hover {
  transform: translateY(-3px) scale(1.02);
}
.nfu-card:active {
  transform: scale(0.97);
}
.nfu-card.nfu-card--selected {
  transform: translateY(-2px);
}
.nfu-card.nfu-card--equipped .nfu-card-equipped-badge {
  display: flex;
}

/* Small avatar in each card */
.nfu-card-avatar {
  position: relative;
  width: 60px; height: 60px;
}
.nfu-card-img {
  width: 100%; height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  background: rgba(255,255,255,0.05);
}
.nfu-card-placeholder {
  width: 100%; height: 100%;
  border-radius: 50%;
  display: grid; place-items: center;
  font-size: 28px;
  background: rgba(255,255,255,0.04);
}

/* Frame name */
.nfu-card-name {
  font-family: 'Poppins', 'Nunito', sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.7);
  text-align: center;
  line-height: 1.2;
  transition: color .2s;
}
.nfu-card--selected .nfu-card-name,
.nfu-card:hover .nfu-card-name {
  color: #fff;
}

/* Tier pip */
.nfu-card-tier {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  padding: 1px 6px;
  border-radius: 99px;
}

/* Equipped checkmark badge */
.nfu-card-equipped-badge {
  display: none;
  position: absolute;
  top: 8px; right: 8px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #00e5a0;
  border: 2px solid #0d0920;
  align-items: center; justify-content: center;
  font-size: 9px;
  color: #000;
  font-weight: 900;
  z-index: 10;
}

/* ── FOOTER ACTIONS ── */
.nfu-footer {
  padding: 10px 16px 16px;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.nfu-btn-equip {
  flex: 1;
  padding: 13px 16px;
  border-radius: 14px;
  border: 0;
  font-family: 'Poppins', 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  background: linear-gradient(90deg, #00c6ff, #0072ff, #7b2fff);
  color: #fff;
  box-shadow: 0 4px 18px rgba(0,114,255,0.4);
  transition: transform .15s, box-shadow .15s, opacity .15s;
  position: relative;
  overflow: hidden;
}
.nfu-btn-equip::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}
.nfu-btn-equip:hover::before {
  transform: translateX(100%);
}
.nfu-btn-equip:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,114,255,0.5);
}
.nfu-btn-equip:active { transform: scale(0.97); }
.nfu-btn-equip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.nfu-btn-equip.nfu-btn--unequip {
  background: linear-gradient(90deg, #ff4060, #ff2d55);
  box-shadow: 0 4px 18px rgba(255,45,85,0.35);
}
.nfu-btn-equip.nfu-btn--unequip:hover {
  box-shadow: 0 8px 24px rgba(255,45,85,0.5);
}

.nfu-btn-none {
  flex: 1;
  padding: 13px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,0.12);
  font-family: 'Poppins', 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
  transition: transform .15s, background .15s, color .15s;
}
.nfu-btn-none:hover {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.9);
  transform: translateY(-1px);
}
.nfu-btn-none:active { transform: scale(0.97); }

/* ── EMPTY STATE (no inventory) ── */
.nfu-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  color: rgba(255,255,255,0.35);
  text-align: center;
}
.nfu-empty-icon { font-size: 36px; opacity: 0.5; }
.nfu-empty-title {
  font-family: 'Poppins', 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.nfu-empty-sub { font-size: 11px; opacity: 0.7; }

/* ── LOADING SHIMMER ── */
.nfu-shimmer {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.nfu-shimmer-card {
  height: 110px;
  border-radius: 16px;
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: nfu-shimmer 1.4s ease-in-out infinite;
}
@keyframes nfu-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

/* ── NO AUTH STATE ── */
.nfu-no-auth {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 20px;
  color: rgba(255,255,255,0.4);
  text-align: center;
}
.nfu-no-auth-icon { font-size: 40px; }
.nfu-no-auth-msg {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

    `;
    document.head.appendChild(s);
  }


  /* ──────────────────────────────────────────────────────────
     PANEL STATE
  ────────────────────────────────────────────────────────── */

  let _backdrop    = null;
  let _panel       = null;
  let _isOpen      = false;
  let _inventory   = [];      // Array of { frameId, def, ... }
  let _equippedId  = null;    // Currently equipped in Firebase
  let _selectedId  = null;    // Currently selected in the UI (not yet applied)
  let _previewEl   = null;    // The preview avatar container element


  /* ──────────────────────────────────────────────────────────
     BUILD PANEL DOM
  ────────────────────────────────────────────────────────── */

  function _buildPanel() {
    // Backdrop
    _backdrop = document.createElement('div');
    _backdrop.className = 'nfu-backdrop';
    _backdrop.setAttribute('role', 'dialog');
    _backdrop.setAttribute('aria-modal', 'true');
    _backdrop.setAttribute('aria-label', 'Avatar Frame Selector');

    // Click backdrop to close
    _backdrop.addEventListener('click', e => {
      if (e.target === _backdrop) _closePanel();
    });

    // Panel
    _panel = document.createElement('div');
    _panel.className = 'nfu-panel';

    _panel.innerHTML = `
      <div class="nfu-handle"></div>

      <div class="nfu-header">
        <div class="nfu-title">
          <span class="nfu-title-icon">🎮</span>
          Avatar Frames
        </div>
        <button class="nfu-close" aria-label="Close">✕</button>
      </div>

      <div class="nfu-preview-zone" id="nfuPreviewZone">
        <div class="nfu-preview-bg" id="nfuPreviewBg"></div>
        <div class="nfu-preview-avatar-wrap" id="nfuPreviewAvatarWrap">
          <div class="nfu-preview-placeholder" id="nfuPreviewPlaceholder">🙂</div>
        </div>
        <div class="nfu-preview-label" id="nfuPreviewLabel">No Frame</div>
        <div class="nfu-preview-tier" id="nfuPreviewTier"></div>
      </div>

      <div class="nfu-divider"></div>
      <div class="nfu-section-label">Your Collection</div>

      <div class="nfu-grid" id="nfuGrid">
        <div class="nfu-shimmer">
          <div class="nfu-shimmer-card"></div>
          <div class="nfu-shimmer-card"></div>
          <div class="nfu-shimmer-card"></div>
        </div>
      </div>

      <div class="nfu-footer">
        <button class="nfu-btn-none" id="nfuBtnNone">No Frame</button>
        <button class="nfu-btn-equip" id="nfuBtnEquip" disabled>Select a Frame</button>
      </div>
    `;

    _backdrop.appendChild(_panel);
    document.body.appendChild(_backdrop);

    // Wire up close button
    _panel.querySelector('.nfu-close').addEventListener('click', _closePanel);

    // Wire up "No Frame" button
    _panel.querySelector('#nfuBtnNone').addEventListener('click', () => {
      _selectFrame(null);
    });

    // Wire up Equip button
    _panel.querySelector('#nfuBtnEquip').addEventListener('click', _handleEquipClick);

    // Swipe-down to close on mobile
    _initSwipeClose();

    // ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _isOpen) _closePanel();
    });
  }


  /* ──────────────────────────────────────────────────────────
     OPEN / CLOSE
  ────────────────────────────────────────────────────────── */

  async function _openPanel() {
    if (_isOpen) return;
    _isOpen = true;

    if (!_backdrop) _buildPanel();

    // Show backdrop
    _backdrop.style.display = 'flex';
    _backdrop.style.pointerEvents = 'auto';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _backdrop.classList.add('nfu-visible');
      });
    });

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Load state
    const uid = _uid();
    if (!uid) {
      _renderNoAuth();
      return;
    }

    // Load pfp into preview
    _renderPreviewAvatar();

    // Fetch inventory + equipped state in parallel
    try {
      const [inv, equipped] = await Promise.all([
        _frames().inventory(),
        _frames().getEquipped(uid),
      ]);
      _inventory   = inv;
      _equippedId  = equipped || null;
      _selectedId  = _equippedId; // start with currently equipped selected

      _renderGrid();
      _updatePreview(_selectedId);
      _updateFooter();
    } catch (e) {
      console.error('[natFrames UI] load error:', e);
      _renderGrid(); // will show empty state
    }
  }

  function _closePanel() {
    if (!_isOpen) return;
    _isOpen = false;

    _backdrop.classList.remove('nfu-visible');
    _backdrop.style.pointerEvents = 'none';

    setTimeout(() => {
      _backdrop.style.display = 'none';
      // Clean up preview frame
      if (_previewEl) {
        _frames()._build && _frames().remove(_previewEl);
      }
    }, ANIM_OUT_MS + 50);

    document.body.style.overflow = '';
  }


  /* ──────────────────────────────────────────────────────────
     RENDER: PREVIEW AVATAR
  ────────────────────────────────────────────────────────── */

  function _renderPreviewAvatar() {
    const wrap = _panel.querySelector('#nfuPreviewAvatarWrap');
    if (!wrap) return;

    const pfpSrc = _myPfpSrc();

    wrap.innerHTML = '';

    if (pfpSrc) {
      const img = document.createElement('img');
      img.src   = pfpSrc;
      img.alt   = 'Your avatar';
      img.className = 'nfu-preview-img';
      wrap.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'nfu-preview-placeholder';
      ph.textContent = '🙂';
      wrap.appendChild(ph);
    }

    _previewEl = wrap;
  }


  /* ──────────────────────────────────────────────────────────
     RENDER: FRAME GRID
  ────────────────────────────────────────────────────────── */

  function _renderGrid() {
    const grid = _panel.querySelector('#nfuGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (_inventory.length === 0) {
      grid.innerHTML = `
        <div class="nfu-empty">
          <div class="nfu-empty-icon">🔒</div>
          <div class="nfu-empty-title">No Frames Yet</div>
          <div class="nfu-empty-sub">Earn frames through achievements, events, and special unlocks.</div>
        </div>
      `;
      return;
    }

    const pfpSrc = _myPfpSrc();

    _inventory.forEach(item => {
      const { frameId, def } = item;
      const accent    = FRAME_ACCENTS[frameId] || {};
      const normalizedTier =
  window._natFrames?._tierMap?.[def.legacyTier || def.tier] ||
  def.tier;

const tierMeta =
  TIER_META[normalizedTier] ||
  TIER_META.premium;
      const isEquipped = frameId === _equippedId;
      const isSelected = frameId === _selectedId;

      const card = document.createElement('div');
      card.className = 'nfu-card' +
        (isEquipped ? ' nfu-card--equipped' : '') +
        (isSelected ? ' nfu-card--selected' : '');
      card.dataset.frameId = frameId;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${def.label} frame, ${def.tier}`);
      card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      // Apply card accent styling
      card.style.cssText = `
        background: ${accent.bg || 'rgba(255,255,255,0.04)'};
        border-color: ${isSelected ? (accent.border || 'rgba(255,255,255,0.3)') : 'transparent'};
        box-shadow: ${isSelected ? (accent.glow || 'none') : 'none'};
      `;

      // Build mini avatar
      let avatarHTML = '';
      if (pfpSrc) {
        avatarHTML = `<img src="${pfpSrc}" alt="" class="nfu-card-img">`;
      } else {
        avatarHTML = `<div class="nfu-card-placeholder">🙂</div>`;
      }

      card.innerHTML = `
        <div class="nfu-card-equipped-badge">✓</div>
        <div class="nfu-card-avatar" data-card-avatar="${frameId}">
          ${avatarHTML}
        </div>
        <div class="nfu-card-name">${def.label}</div>
        <div class="nfu-card-tier" style="
          background: ${tierMeta.color}22;
          color: ${tierMeta.color};
          border: 1px solid ${tierMeta.color}55;
        ">${tierMeta.label}</div>
      `;

      // Apply actual frame to card mini-avatar
      const cardAvatarEl = card.querySelector(`[data-card-avatar="${frameId}"]`);
      if (cardAvatarEl) {
        // Slight delay so DOM is ready
        requestAnimationFrame(() => {
          _frames().apply(cardAvatarEl, frameId);
        });
      }

      // Click / keyboard
      card.addEventListener('click', () => _selectFrame(frameId));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _selectFrame(frameId);
        }
      });

      grid.appendChild(card);
    });
  }


  /* ──────────────────────────────────────────────────────────
     SELECT FRAME (preview only, not yet equipped)
  ────────────────────────────────────────────────────────── */

  function _selectFrame(frameId) {
    _selectedId = frameId || null;

    // Update card styles
    _panel.querySelectorAll('.nfu-card').forEach(card => {
      const cid      = card.dataset.frameId;
      const selected = cid === _selectedId;
      const accent   = FRAME_ACCENTS[cid] || {};

      card.classList.toggle('nfu-card--selected', selected);
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
      card.style.borderColor = selected ? (accent.border || 'rgba(255,255,255,0.3)') : 'transparent';
      card.style.boxShadow   = selected ? (accent.glow  || 'none') : 'none';
    });

    // Update preview
    _updatePreview(_selectedId);
    _updateFooter();
  }


  /* ──────────────────────────────────────────────────────────
     UPDATE PREVIEW ZONE
  ────────────────────────────────────────────────────────── */

  function _updatePreview(frameId) {
    if (!_previewEl) return;

    const labelEl  = _panel.querySelector('#nfuPreviewLabel');
    const tierEl   = _panel.querySelector('#nfuPreviewTier');
    const bgEl     = _panel.querySelector('#nfuPreviewBg');

    // Apply frame to preview avatar
    _frames().apply(_previewEl, frameId);

    if (frameId && FRAME_REGISTRY_LOCAL[frameId]) {
      const def      = FRAME_REGISTRY_LOCAL[frameId];
      const normalizedTier =
  window._natFrames?._tierMap?.[def.legacyTier || def.tier] ||
  def.tier;

const tierMeta =
  TIER_META[normalizedTier] ||
  TIER_META.premium;
      const accent   = FRAME_ACCENTS[frameId] || {};

      // Label
      labelEl.textContent = def.label;
      labelEl.classList.add('has-frame');

      // Tier pill
      tierEl.textContent = tierMeta.label;
      tierEl.style.cssText = `
        background: ${tierMeta.color}22;
        color: ${tierMeta.color};
        border: 1px solid ${tierMeta.color}44;
      `;
      tierEl.classList.add('visible');

      // Animated background glow
      bgEl.style.background = `radial-gradient(ellipse 80% 80% at 50% 50%, ${tierMeta.glow}, transparent 70%)`;

    } else {
      labelEl.textContent = 'No Frame';
      labelEl.classList.remove('has-frame');
      tierEl.classList.remove('visible');
      bgEl.style.background = '';
    }
  }


  /* ──────────────────────────────────────────────────────────
     UPDATE FOOTER BUTTON STATE
  ────────────────────────────────────────────────────────── */

  function _updateFooter() {
    const btn = _panel.querySelector('#nfuBtnEquip');
    if (!btn) return;

    const isAlreadyEquipped = _selectedId === _equippedId;
    const hasSelection      = _selectedId !== null;

    if (!hasSelection) {
      // Nothing selected (or "No Frame" selected when none equipped)
      if (_equippedId) {
        // Currently has a frame → show unequip
        btn.textContent = 'Remove Frame';
        btn.className   = 'nfu-btn-equip nfu-btn--unequip';
        btn.disabled    = false;
      } else {
        btn.textContent = 'Select a Frame';
        btn.className   = 'nfu-btn-equip';
        btn.disabled    = true;
      }
    } else if (isAlreadyEquipped) {
      btn.textContent = '✓ Equipped';
      btn.className   = 'nfu-btn-equip';
      btn.disabled    = true;
    } else {
      const def = FRAME_REGISTRY_LOCAL[_selectedId];
      btn.textContent = `Equip ${def?.label || 'Frame'}`;
      btn.className   = 'nfu-btn-equip';
      btn.disabled    = false;
    }
  }


  /* ──────────────────────────────────────────────────────────
     EQUIP HANDLER
  ────────────────────────────────────────────────────────── */

  async function _handleEquipClick() {
    const btn = _panel.querySelector('#nfuBtnEquip');
    if (!btn || btn.disabled) return;

    const targetId = _selectedId; // null = unequip

    // Optimistic UI update
    btn.disabled    = true;
    btn.textContent = targetId ? 'Equipping…' : 'Removing…';

    try {
      await _frames().equip(targetId);

      // Update local equipped state
      _equippedId = targetId;

      // Update equipped badge on cards
      _panel.querySelectorAll('.nfu-card').forEach(card => {
        card.classList.toggle('nfu-card--equipped', card.dataset.frameId === _equippedId);
      });

      _updateFooter();

      // Show toast
      if (targetId) {
        const def = FRAME_REGISTRY_LOCAL[targetId];
        _toast(`${def?.icon || '🎮'} ${def?.label || 'Frame'} equipped!`);
      } else {
        _toast('Frame removed.');
      }

      // Close panel after short delay
      setTimeout(_closePanel, 600);

    } catch (e) {
      console.error('[natFrames UI] equip failed:', e);
      _toast('❌ Failed to equip frame. Try again.');
      btn.disabled    = false;
      _updateFooter();
    }
  }


  /* ──────────────────────────────────────────────────────────
     RENDER: NO AUTH STATE
  ────────────────────────────────────────────────────────── */

  function _renderNoAuth() {
    const grid = _panel.querySelector('#nfuGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="nfu-no-auth">
          <div class="nfu-no-auth-icon">🔐</div>
          <div class="nfu-no-auth-msg">Sign in to view your frames</div>
        </div>
      `;
    }
    const footer = _panel.querySelector('.nfu-footer');
    if (footer) footer.style.display = 'none';
  }


  /* ──────────────────────────────────────────────────────────
     SWIPE-TO-CLOSE (mobile)
  ────────────────────────────────────────────────────────── */

  function _initSwipeClose() {
    if (!_panel) return;
    let startY = 0;
    let isDragging = false;

    _panel.addEventListener('touchstart', e => {
      startY      = e.touches[0].clientY;
      isDragging  = true;
    }, { passive: true });

    _panel.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) {
        _panel.style.transform = `translateY(${dy}px)`;
      }
    }, { passive: true });

    _panel.addEventListener('touchend', e => {
      if (!isDragging) return;
      isDragging = false;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 90) {
        _panel.style.transform = ''; // reset immediately
        _closePanel();
      } else {
        _panel.style.transform = '';
      }
    });
  }


  /* ──────────────────────────────────────────────────────────
     INJECT TRIGGER BUTTON ON PROFILE PAGE
     Adds a small "🎮" button to .prof-pfp-wrap,
     adjacent to the existing profPfpEdit pencil button.
  ────────────────────────────────────────────────────────── */

  function _injectProfileTrigger() {
    const wrap = document.querySelector('.prof-pfp-wrap');
    if (!wrap || wrap.querySelector('.nat-frames-trigger')) return;

    const btn = document.createElement('button');
    btn.className  = 'nat-frames-trigger';
    btn.title      = 'Avatar Frames';
    btn.innerHTML  = '🎮';
    btn.setAttribute('aria-label', 'Open Avatar Frame selector');

    // Mark as equipped if user has one
    const uid = _uid();
    if (uid) {
      const cached = _frames().cache[uid];
      if (cached) btn.dataset.equipped = cached;
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      _openPanel();
    });

    wrap.appendChild(btn);
  }


  /* ──────────────────────────────────────────────────────────
     LOCAL REGISTRY REFERENCE
     We access the registry from the engine to avoid duplication.
  ────────────────────────────────────────────────────────── */

  let FRAME_REGISTRY_LOCAL = {};


  /* ──────────────────────────────────────────────────────────
     PUBLIC API
  ────────────────────────────────────────────────────────── */

  window._natFramesUI = {
    open:  _openPanel,
    close: _closePanel,
  };


  /* ──────────────────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────────────────── */

  function _init() {
    const MAX = 80;
    let attempts = 0;

    const poll = setInterval(() => {
      attempts++;

      const ready = window._natFrames && window._natPfp;

      if (ready) {
        clearInterval(poll);
        _boot();
        return;
      }

      if (attempts >= MAX) {
        clearInterval(poll);
        console.warn('[natFrames UI] init timed out');
      }
    }, 100);
  }

  function _boot() {
    FRAME_REGISTRY_LOCAL = _frames().registry || {};

    // Inject styles
    _injectStyles();

    // Build panel DOM (hidden by default)
    _buildPanel();

    // Inject trigger button when profile section is available
    const _tryInjectTrigger = () => {
      if (document.querySelector('.prof-pfp-wrap')) {
        _injectProfileTrigger();
      }
    };

    _tryInjectTrigger();

    // Also watch for profile section being added to DOM dynamically
    const mo = new MutationObserver(() => {
      if (!document.querySelector('.nat-frames-trigger')) {
        _tryInjectTrigger();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    console.log('[natFrames UI] ✅ Avatar frame UI ready');
  }

  _init();

})();
