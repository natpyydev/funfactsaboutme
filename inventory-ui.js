/* ============================================================
   INVENTORY UI — inventory-ui.js
   Full cosmetics inventory panel: Frames · Badges · Titles

   LOAD ORDER (after these are ready):
     1. app.js
     2. avatar-frames.js
     3. cosmetics-sync.js
     4. cosmetics-system.js        ← sets window._natCosmetics
     5. THIS FILE (defer)

   DEPENDS ON:
     window._natCosmetics          ← cosmetics-system.js
     window._natFrames             ← avatar-frames.js
     window._natPfp                ← app.js
     window.currentUID             ← app.js
     window.showToast              ← app.js (optional)

   PUBLIC API (window._natInventoryUI):
     .open(tab?)                   → open panel, optional tab
     .close()                      → close panel
     .refresh()                    → re-render current tab

   HOW TO OPEN FROM PROFILE:
     window._natInventoryUI?.open('frames')
   ============================================================ */

(function () {
  'use strict';

  const LOG = '[inventoryUI]';
  const ANIM_OPEN_MS  = 340;
  const ANIM_CLOSE_MS = 260;

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  let _overlay    = null;
  let _panel      = null;
  let _body       = null;
  let _panes      = {};          // { frames, badges, titles } → DOM nodes
  let _tabBtns    = {};
  let _footerVal  = null;
  let _currentTab = 'frames';
  let _isOpen     = false;
  let _rendered   = {};          // { frames: bool, badges: bool, titles: bool }
  let _raf        = null;
  let _toastTimer = null;
  let _initAttempts = 0;
  const MAX_INIT = 120;

  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */
  function _cs()   { return window._natCosmetics; }
  function _uid()  { return window.currentUID || null; }

  function _myPfpSrc() {
    const uid = _uid();
    return uid ? (window._natPfp?.cache?.[uid] || null) : null;
  }

  function _toast(msg) {
    if (window.showToast) { window.showToast(msg); return; }
    if (!_panel) return;
    let t = _panel.querySelector('.nat-inv-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'nat-inv-toast';
      _panel.appendChild(t);
    }
    t.textContent = msg;
    clearTimeout(_toastTimer);
    t.classList.remove('visible');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        t.classList.add('visible');
        _toastTimer = setTimeout(() => t.classList.remove('visible'), 2000);
      });
    });
  }

  /** Rarity CSS vars for a card element */
  function _applyRarity(el, rarityKey) {
    const meta = _cs()?.RARITY_META[rarityKey] || _cs()?.RARITY_META.common;
    if (!meta) return;
    el.style.setProperty('--rarity-color',  meta.color);
    el.style.setProperty('--card-bg',       meta.bg);
    el.style.setProperty('--card-border',   meta.color + '55');
    el.style.setProperty('--card-glow',     `0 0 18px ${meta.glow}`);
  }

  function _unlockReqLabel(titleDef) {
    const { type, value } = titleDef.unlock;
    switch (type) {
      case 'free':      return 'Always available';
      case 'level':     return `Level ${value} required`;
      case 'vip':       return 'VIP required';
      case 'developer': return 'Developer only';
      case 'badge':     return `Badge: ${value}`;
      default:          return '';
    }
  }

  /* ----------------------------------------------------------
     BUILD DOM — called once
  ---------------------------------------------------------- */
  function _buildDOM() {
    if (_overlay) return;

    // Overlay
    _overlay = document.createElement('div');
    _overlay.className = 'nat-inv-overlay';
    _overlay.addEventListener('click', _onOverlayClick);

    // Panel
    _panel = document.createElement('div');
    _panel.className = 'nat-inv-panel';
    _panel.setAttribute('role', 'dialog');
    _panel.setAttribute('aria-modal', 'true');
    _panel.setAttribute('aria-label', 'Cosmetics Inventory');

    // Handle
    const handle = document.createElement('div');
    handle.className = 'nat-inv-handle';
    handle.innerHTML = '<div class="nat-inv-handle-bar"></div>';

    // Header
    const header = document.createElement('div');
    header.className = 'nat-inv-header';
    const titleEl = document.createElement('div');
    titleEl.className = 'nat-inv-title';
    titleEl.textContent = '🎒 My Cosmetics';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'nat-inv-close';
    closeBtn.setAttribute('aria-label', 'Close inventory');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', close);
    header.append(titleEl, closeBtn);

    // Tabs
    const tabBar = document.createElement('div');
    tabBar.className = 'nat-inv-tabs';
    const TAB_DEFS = [
      { id: 'frames', label: '🖼️ Frames' },
      { id: 'badges', label: '🏅 Badges' },
      { id: 'titles', label: '🎖️ Titles' },
    ];
    TAB_DEFS.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.className = 'nat-inv-tab';
      btn.setAttribute('data-tab', id);
      btn.setAttribute('aria-selected', id === _currentTab ? 'true' : 'false');
      btn.innerHTML = `${label} <span class="nat-inv-tab-count" data-count="${id}">…</span>`;
      btn.addEventListener('click', () => _switchTab(id));
      _tabBtns[id] = btn;
      tabBar.appendChild(btn);
    });

    // Body
    _body = document.createElement('div');
    _body.className = 'nat-inv-body';

    TAB_DEFS.forEach(({ id }) => {
      const pane = document.createElement('div');
      pane.className = 'nat-inv-pane' + (id === _currentTab ? ' active' : '');
      pane.setAttribute('data-pane', id);
      _panes[id] = pane;
      _body.appendChild(pane);
    });

    // Footer
    const footer = document.createElement('div');
    footer.className = 'nat-inv-footer';
    const footerLabel = document.createElement('div');
    footerLabel.className = 'nat-inv-footer-label';
    footerLabel.textContent = 'Active title:';
    _footerVal = document.createElement('div');
    _footerVal.className = 'nat-inv-footer-value';
    _footerVal.textContent = '—';
    footer.append(footerLabel, _footerVal);

    _panel.append(handle, header, tabBar, _body, footer);
    document.body.append(_overlay, _panel);

    // Keyboard
    document.addEventListener('keydown', _onKeydown);

    // Listen for cosmetics changes
    window.addEventListener('nat-cosmetics-change', _onCosmeticsChange);
  }

  /* ----------------------------------------------------------
     TAB SWITCHING
  ---------------------------------------------------------- */
  function _switchTab(tabId) {
    if (tabId === _currentTab && _rendered[tabId]) return;
    _currentTab = tabId;

    Object.entries(_tabBtns).forEach(([id, btn]) => {
      const active = id === tabId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    Object.entries(_panes).forEach(([id, pane]) => {
      pane.classList.toggle('active', id === tabId);
    });

    if (!_rendered[tabId]) {
      _renderTab(tabId);
    }
  }

  /* ----------------------------------------------------------
     RENDER — lazy per tab
  ---------------------------------------------------------- */
  function _renderTab(tabId) {
    const pane = _panes[tabId];
    if (!pane) return;

    // Show skeleton while loading
    pane.innerHTML = _skeletonHTML(tabId);

    if (tabId === 'frames') {
      _renderFrames(pane);
    } else if (tabId === 'badges') {
      _renderBadges(pane);
    } else if (tabId === 'titles') {
      _renderTitles(pane);
    }
  }

  function _skeletonHTML(tabId) {
    if (tabId === 'frames') {
      return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${Array(6).fill('<div class="nat-inv-skeleton nat-inv-skeleton-frame"></div>').join('')}
      </div>`;
    }
    return Array(5).fill('<div class="nat-inv-skeleton nat-inv-skeleton-row"></div>').join('');
  }

  /* ── FRAMES ── */
  async function _renderFrames(pane) {
    const cs = _cs();
    if (!cs) return;

    let frames = [];
    try { frames = await cs.getFrames(); } catch (e) { console.error(LOG, e); }

    const frag = document.createDocumentFragment();

    // Owned section
    const owned  = frames.filter(f => f.owned);
    const locked = frames.filter(f => !f.owned);

    if (owned.length) {
      frag.appendChild(_sectionLabel('Owned'));
      const grid = document.createElement('div');
      grid.className = 'nat-inv-frame-grid';
      owned.forEach(f => grid.appendChild(_buildFrameCard(f)));
      frag.appendChild(grid);
    }

    if (locked.length) {
      frag.appendChild(_sectionLabel('Locked'));
      const grid = document.createElement('div');
      grid.className = 'nat-inv-frame-grid';
      locked.forEach(f => grid.appendChild(_buildFrameCard(f)));
      frag.appendChild(grid);
    }

    if (!frames.length) {
      frag.appendChild(_emptyState('🖼️', 'No frames in registry yet.'));
    }

    _setCount('frames', owned.length);
    _commitPane(pane, frag, 'frames');
  }

  function _buildFrameCard(frameData) {
    const { id, label, icon, rarity, owned, equipped } = frameData;
    const card = document.createElement('div');
    card.className = 'nat-inv-frame-card' +
      (equipped ? ' equipped' : '') +
      (!owned   ? ' locked'   : '');

    _applyRarity(card, rarity);

    // Rarity label
    const rarBadge = document.createElement('div');
    rarBadge.className = 'nat-inv-rarity-badge';
    rarBadge.textContent = (rarity || 'common').toUpperCase();

    // Preview wrapper
    const preview = document.createElement('div');
    preview.className = 'nat-inv-frame-preview';

    // Profile pic
    const img = document.createElement('img');
    img.src   = _myPfpSrc() || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    img.alt   = label;
    img.loading = 'lazy';
    preview.appendChild(img);

    // Apply frame visually to preview
    if (owned && window._natFrames?.applyToElement) {
      requestAnimationFrame(() => {
        window._natFrames.applyToElement(preview, id);
      });
    } else if (owned) {
      // Fallback: show icon
      const iconEl = document.createElement('div');
      iconEl.style.cssText = 'position:absolute;bottom:0;right:0;font-size:18px';
      iconEl.textContent = icon;
      preview.appendChild(iconEl);
    }

    // Lock overlay
    const lockIcon = document.createElement('div');
    lockIcon.className = 'nat-inv-lock-icon';
    lockIcon.textContent = '🔒';
    preview.appendChild(lockIcon);

    // Equipped mark
    const equippedMark = document.createElement('div');
    equippedMark.className = 'nat-inv-equipped-mark';
    equippedMark.textContent = '✓';

    // Label
    const labelEl = document.createElement('div');
    labelEl.className = 'nat-inv-frame-label';
    labelEl.textContent = label;

    card.append(rarBadge, preview, equippedMark, labelEl);

    // Unequip button when equipped
    if (equipped) {
      const unequipBtn = document.createElement('button');
      unequipBtn.className = 'nat-inv-unequip-btn';
      unequipBtn.textContent = 'Remove';
      unequipBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await _cs().unequipFrame();
        _toast('Frame removed');
      });
      card.appendChild(unequipBtn);
    }

    // Click handler
    if (owned) {
      card.addEventListener('click', async () => {
        if (equipped) return; // already handled by unequip btn
        await _cs().equipFrame(id);
        _toast(`Equipped: ${label}`);
      });
    }

    return card;
  }

  /* ── BADGES ── */
  async function _renderBadges(pane) {
    const cs = _cs();
    if (!cs) return;

    let badges = [];
    try { badges = await cs.getBadges(); } catch (e) { console.error(LOG, e); }

    const frag = document.createDocumentFragment();
    const state = cs.getState();

    // Slot indicator
    const slots = document.createElement('div');
    slots.className = 'nat-inv-badge-slots';
    slots.appendChild(document.createTextNode(
      `Equipped (${state.equippedBadges.length}/${cs.MAX_EQUIPPED_BADGES}): `
    ));
    for (let i = 0; i < cs.MAX_EQUIPPED_BADGES; i++) {
      const dot = document.createElement('div');
      dot.className = 'nat-inv-slot-dot' + (i < state.equippedBadges.length ? ' filled' : '');
      slots.appendChild(dot);
    }
    frag.appendChild(slots);

    const owned  = badges.filter(b => b.owned);
    const locked = badges.filter(b => !b.owned);

    if (owned.length) {
      frag.appendChild(_sectionLabel('Earned'));
      const list = document.createElement('div');
      list.className = 'nat-inv-badge-list';
      owned.forEach(b => list.appendChild(_buildBadgeRow(b)));
      frag.appendChild(list);
    }

    if (locked.length) {
      frag.appendChild(_sectionLabel('Locked'));
      const list = document.createElement('div');
      list.className = 'nat-inv-badge-list';
      locked.forEach(b => list.appendChild(_buildBadgeRow(b)));
      frag.appendChild(list);
    }

    if (!badges.length) {
      frag.appendChild(_emptyState('🏅', 'No badges found. React on photos to earn some!'));
    }

    _setCount('badges', owned.length);
    _commitPane(pane, frag, 'badges');
  }

  function _buildBadgeRow(badgeData) {
    const { id, label, icon, rarity, owned, equipped, desc } = badgeData;
    const row = document.createElement('div');
    row.className = 'nat-inv-badge-row' +
      (equipped ? ' equipped' : '') +
      (!owned   ? ' locked'   : '');

    _applyRarity(row, rarity);

    const iconEl = document.createElement('div');
    iconEl.className = 'nat-inv-badge-icon';
    iconEl.textContent = icon;

    const info = document.createElement('div');
    info.className = 'nat-inv-badge-info';

    const name = document.createElement('div');
    name.className = 'nat-inv-badge-name';
    name.textContent = label;

    const descEl = document.createElement('div');
    descEl.className = 'nat-inv-badge-desc';
    descEl.textContent = desc;

    info.append(name, descEl);

    const status = document.createElement('div');
    status.className = 'nat-inv-badge-status';
    status.textContent = !owned ? 'Locked' : equipped ? 'ON' : 'OFF';

    row.append(iconEl, info, status);

    if (owned) {
      row.addEventListener('click', async () => {
        await _cs().equipBadge(id);
        const newState = _cs().getState();
        const isNowEquipped = newState.equippedBadges.includes(id);
        status.textContent = isNowEquipped ? 'ON' : 'OFF';
        row.classList.toggle('equipped', isNowEquipped);
        _toast(isNowEquipped ? `Badge equipped: ${label}` : `Badge removed: ${label}`);
        // Refresh slot dots
        _updateBadgeSlots(pane);
      });
    }

    return row;
  }

  function _updateBadgeSlots(pane) {
    if (!pane) return;
    const state = _cs()?.getState();
    if (!state) return;
    const dots = pane.querySelectorAll('.nat-inv-slot-dot');
    dots.forEach((d, i) => {
      d.classList.toggle('filled', i < state.equippedBadges.length);
    });
    const label = pane.querySelector('.nat-inv-badge-slots');
    if (label) {
      const t = label.firstChild;
      if (t) t.textContent = `Equipped (${state.equippedBadges.length}/${_cs().MAX_EQUIPPED_BADGES}): `;
    }
  }

  /* ── TITLES ── */
  async function _renderTitles(pane) {
    const cs = _cs();
    if (!cs) return;

    let titles = [];
    try { titles = await cs.getTitles(); } catch (e) { console.error(LOG, e); }

    const frag = document.createDocumentFragment();

    const unlocked = titles.filter(t => t.unlocked);
    const locked   = titles.filter(t => !t.unlocked);

    if (unlocked.length) {
      frag.appendChild(_sectionLabel('Unlocked'));
      const list = document.createElement('div');
      list.className = 'nat-inv-title-list';
      unlocked.forEach(t => list.appendChild(_buildTitleRow(t)));
      frag.appendChild(list);
    }

    if (locked.length) {
      frag.appendChild(_sectionLabel('Locked'));
      const list = document.createElement('div');
      list.className = 'nat-inv-title-list';
      locked.forEach(t => list.appendChild(_buildTitleRow(t)));
      frag.appendChild(list);
    }

    if (!titles.length) {
      frag.appendChild(_emptyState('🎖️', 'No titles available.'));
    }

    _setCount('titles', unlocked.length);
    _commitPane(pane, frag, 'titles');
    _updateFooter();
  }

  function _buildTitleRow(titleData) {
    const { id, label, rarity, unlocked, equipped, desc } = titleData;
    const row = document.createElement('div');
    row.className = 'nat-inv-title-row' +
      (equipped  ? ' equipped' : '') +
      (!unlocked ? ' locked'   : '');

    _applyRarity(row, rarity);

    const textEl = document.createElement('div');
    textEl.className = 'nat-inv-title-text';
    textEl.textContent = label;

    const meta = document.createElement('div');
    meta.className = 'nat-inv-title-meta';

    const rarEl = document.createElement('div');
    rarEl.className = 'nat-inv-title-rarity';
    rarEl.textContent = rarity?.toUpperCase() || 'COMMON';

    const req = document.createElement('div');
    req.className = 'nat-inv-title-req';
    req.textContent = equipped ? '✓ Equipped' : _unlockReqLabel(titleData);

    meta.append(rarEl, req);
    row.append(textEl, meta);

    if (unlocked) {
      row.addEventListener('click', async () => {
        await _cs().equipTitle(id);
        const newState = _cs().getState();
        const isNowEquipped = newState.equippedTitle === id;
        row.classList.toggle('equipped', isNowEquipped);
        req.textContent = isNowEquipped ? '✓ Equipped' : _unlockReqLabel(titleData);
        _toast(isNowEquipped ? `Title equipped: ${label}` : 'Title removed');
        _updateFooter();
        // Unequip styling from others in same pane
        const pane = _panes.titles;
        if (pane) {
          pane.querySelectorAll('.nat-inv-title-row.equipped').forEach(r => {
            if (r !== row) {
              r.classList.remove('equipped');
              const rq = r.querySelector('.nat-inv-title-req');
              if (rq) rq.textContent = _unlockReqLabel({ unlock: r._unlock });
            }
          });
        }
      });
      row._unlock = titleData.unlock;
    }

    return row;
  }

  /* ----------------------------------------------------------
     DOM HELPERS
  ---------------------------------------------------------- */
  function _sectionLabel(text) {
    const el = document.createElement('div');
    el.className = 'nat-inv-section-label';
    el.textContent = text;
    return el;
  }

  function _emptyState(icon, text) {
    const el = document.createElement('div');
    el.className = 'nat-inv-empty';
    el.innerHTML = `<div class="nat-inv-empty-icon">${icon}</div>
                    <div class="nat-inv-empty-text">${text}</div>`;
    return el;
  }

  function _setCount(tab, n) {
    const el = _panel?.querySelector(`.nat-inv-tab-count[data-count="${tab}"]`);
    if (el) el.textContent = String(n);
  }

  function _commitPane(pane, frag, tabId) {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => {
      pane.innerHTML = '';
      pane.appendChild(frag);
      _rendered[tabId] = true;
    });
  }

  function _updateFooter() {
    if (!_footerVal || !_cs) return;
    const state = _cs()?.getState();
    if (!state) return;
    const titleDef = window._natCosmetics?.TITLE_REGISTRY?.find(t => t.id === state.equippedTitle);
    _footerVal.textContent = titleDef ? titleDef.label : '—';
  }

  /* ----------------------------------------------------------
     OPEN / CLOSE
  ---------------------------------------------------------- */
  function open(tab) {
    if (_isOpen) return;
    _buildDOM();

    // Reset rendered state so fresh data is pulled
    _rendered = {};

    const targetTab = tab || _currentTab || 'frames';
    _currentTab = '';        // force switchTab to actually render
    _switchTab(targetTab);

    _isOpen = true;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      _overlay.classList.add('is-open');
      _panel.classList.add('is-open');
    });

    _updateFooter();
  }

  function close() {
    if (!_isOpen) return;
    _isOpen = false;

    _overlay.classList.remove('is-open');
    _panel.classList.remove('is-open');

    document.body.style.overflow = '';

    setTimeout(() => {
      // Panel stays in DOM for next open (cheaper than rebuild)
    }, ANIM_CLOSE_MS);
  }

  function refresh() {
    if (!_isOpen) return;
    _rendered = {};
    _renderTab(_currentTab);
  }

  /* ----------------------------------------------------------
     EVENT HANDLERS
  ---------------------------------------------------------- */
  function _onOverlayClick(e) {
    if (e.target === _overlay) close();
  }

  function _onKeydown(e) {
    if (_isOpen && e.key === 'Escape') close();
  }

  function _onCosmeticsChange() {
    if (!_isOpen) return;
    // Only refresh current tab if already rendered (avoid flicker on others)
    if (_rendered[_currentTab]) {
      _rendered[_currentTab] = false;
      _renderTab(_currentTab);
    }
    _updateFooter();
  }

  /* ----------------------------------------------------------
     TRIGGER BUTTON INJECTION
     Injects a button on the profile page next to the edit area.
  ---------------------------------------------------------- */
  function _injectTrigger() {
    if (document.getElementById('nat-inv-trigger-btn')) return;

    // Wait for profile edit button to exist
    const editBtn = document.getElementById('profPfpEdit')
      || document.querySelector('.prof-pfp-edit')
      || document.querySelector('[id*="profEdit"]');

    if (!editBtn) return;

    const btn = document.createElement('button');
    btn.id = 'nat-inv-trigger-btn';
    btn.className = 'nat-inv-trigger';
    btn.setAttribute('title', 'Open cosmetics inventory');
    btn.innerHTML = `<span class="nat-inv-trigger-icon">🎒</span> Cosmetics`;
    btn.addEventListener('click', () => open('frames'));

    // Insert after editBtn's parent or alongside it
    const parent = editBtn.parentNode;
    if (parent) {
      parent.insertBefore(btn, editBtn.nextSibling);
    }
  }

  function _tryInjectTrigger() {
    _injectTrigger();
    if (!document.getElementById('nat-inv-trigger-btn')) {
      // Retry — profile tab might not be active yet
      setTimeout(_tryInjectTrigger, 1500);
    }
  }

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */
  function _init() {
    const poll = setInterval(() => {
      _initAttempts++;

      const csReady = !!window._natCosmetics;
      const fbReady = !!window._natFirebase?.auth;

      if (csReady && fbReady) {
        clearInterval(poll);
        _boot();
        return;
      }
      if (_initAttempts >= MAX_INIT) {
        clearInterval(poll);
        // Boot anyway with whatever is available
        _boot();
        console.warn(LOG, 'Init timed out — booting with partial deps');
      }
    }, 100);
  }

  function _boot() {
    // Build DOM structure eagerly so first open is instant
    _buildDOM();

    // Inject trigger button when profile tab loads
    _tryInjectTrigger();

    // Re-inject on tab switches (SPA pattern)
    window.addEventListener('tab-changed', _tryInjectTrigger);
    window.addEventListener('profile-loaded', _tryInjectTrigger);

    console.log(LOG, '✅ Inventory UI ready');
  }

  /* ----------------------------------------------------------
     EXPOSE
  ---------------------------------------------------------- */
  window._natInventoryUI = {
    open,
    close,
    refresh,
  };

  _init();

})();
