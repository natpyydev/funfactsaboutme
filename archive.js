/**
 * archive.js — Archive Tab Renderer
 *
 * tabs.js creates an empty #archiveSection placeholder with data-tab="archive"
 * already set. This file fills that section with real content.
 *
 * Load order (index.html):
 *   archive-data.js  → sets window.NAT_ARCHIVE (synchronous)
 *   archive.js       → fills #archiveSection (this file)
 */
(() => {
  'use strict';

  let _entries     = [];
  let _filtered    = [];
  let _activeTag   = 'all';
  let _sortMode    = 'default';
  let _searchQuery = '';
  let _modalEntry  = null;
  let _voteUnsubs  = [];
  let _built       = false;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function calcPct(agree, disagree) {
    const total = agree + disagree;
    if (total === 0) return { agreePct: 50, disagreePct: 50 };
    return {
      agreePct:    Math.round((agree    / total) * 100),
      disagreePct: Math.round((disagree / total) * 100),
    };
  }
  function formatRating(r) { return Number(r).toFixed(1); }
  function getAllTags() {
    const set = new Set(['all']);
    _entries.forEach(e => (e.tags || []).forEach(t => set.add(t)));
    return [...set];
  }
  function applyFilters() {
    let list = [..._entries];
    if (_searchQuery) {
      const q = _searchQuery.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.opinion.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.includes(q))
      );
    }
    if (_activeTag !== 'all') list = list.filter(e => (e.tags || []).includes(_activeTag));
    switch (_sortMode) {
      case 'rating-desc': list.sort((a, b) => b.rating - a.rating); break;
      case 'rating-asc':  list.sort((a, b) => a.rating - b.rating); break;
      case 'year-desc':   list.sort((a, b) => (b.year||0) - (a.year||0)); break;
      case 'year-asc':    list.sort((a, b) => (a.year||0) - (b.year||0)); break;
      case 'agree':       list.sort((a, b) => b.agreeCount - a.agreeCount); break;
    }
    _filtered = list;
  }

  // ─── SKELETONS ────────────────────────────────────────────────────
  function renderSkeletons(n = 4) {
    return Array.from({ length: n }, () => `
      <div class="arc-card arc-skeleton" aria-hidden="true">
        <div class="arc-card__img-wrap arc-skel-box"></div>
        <div class="arc-card__body">
          <div class="arc-skel-line w80"></div><div class="arc-skel-line w40"></div>
          <div class="arc-skel-line w95"></div><div class="arc-skel-line w95"></div>
          <div class="arc-skel-bar"></div>
        </div>
      </div>`).join('');
  }

  // ─── CARD HTML ────────────────────────────────────────────────────
  function cardHTML(entry, agree, disagree) {
    const { agreePct, disagreePct } = calcPct(agree, disagree);
    const total    = agree + disagree;
    const yearStr  = entry.year ? `<span class="arc-card__year">${entry.year}</span>` : '';
    const tagPills = (entry.tags || []).map(t => `<span class="arc-tag">${t}</span>`).join('');
    const isOwner  = window.NAT_ARCHIVE?.isOwner();
    const ownerBar = isOwner ? `
      <div class="arc-owner-bar">
        <button class="arc-owner-btn arc-edit-btn" data-action="edit" data-id="${entry.id}" title="Edit entry">✏️ Edit</button>
        <button class="arc-owner-btn arc-delete-btn" data-action="delete" data-id="${entry.id}" title="Delete entry">🗑 Delete</button>
      </div>` : '';
    return `
      <article class="arc-card" data-id="${entry.id}" data-agree="${agree}"
          data-disagree="${disagree}" tabindex="0" role="button" aria-label="View ${entry.title}">
        ${ownerBar}
        <div class="arc-card__img-wrap">
          <img class="arc-card__img" src="${entry.image}" alt="${entry.title}"
            referrerpolicy="no-referrer"
            onerror="this.closest('.arc-card__img-wrap').classList.add('arc-img-missing')"/>
          <div class="arc-card__img-overlay"></div>
          <div class="arc-card__rating-badge">${formatRating(entry.rating)}</div>
        </div>
        <div class="arc-card__body">
          <div class="arc-card__meta"><h3 class="arc-card__title">${entry.title}</h3>${yearStr}</div>
          <p class="arc-card__opinion">"${entry.opinion}"</p>
          <div class="arc-card__tags">${tagPills}</div>
          <div class="arc-vote-row">
            <div class="arc-pct-bars">
              <div class="arc-pct-bar arc-pct-agree" style="--pct:${agreePct}%">
                <span class="arc-pct-label">Agree <strong>${agreePct}%</strong></span>
                <div class="arc-pct-track"><div class="arc-pct-fill arc-fill-agree"></div></div>
              </div>
              <div class="arc-pct-bar arc-pct-disagree" style="--pct:${disagreePct}%">
                <span class="arc-pct-label">Disagree <strong>${disagreePct}%</strong></span>
                <div class="arc-pct-track"><div class="arc-pct-fill arc-fill-disagree"></div></div>
              </div>
            </div>
            <span class="arc-vote-total">${total.toLocaleString()} votes</span>
          </div>
          <div class="arc-card__actions">
            <button class="arc-vote-btn arc-vote-agree" data-entry="${entry.id}" data-type="agree">✓ Agree</button>
            <button class="arc-vote-btn arc-vote-disagree" data-entry="${entry.id}" data-type="disagree">✕ Disagree</button>
          </div>
        </div>
        <div class="arc-card__glow"></div>
      </article>`;
  }

  // ─── MODAL HTML ───────────────────────────────────────────────────
  function modalHTML(entry, agree, disagree) {
    const { agreePct, disagreePct } = calcPct(agree, disagree);
    const total    = agree + disagree;
    const yearStr  = entry.year ? ` (${entry.year})` : '';
    const tagPills = (entry.tags || []).map(t => `<span class="arc-tag">${t}</span>`).join('');
    const ownerPanel = window.NAT_ARCHIVE?.isOwner() ? `
      <div class="arc-modal__owner">
        <div class="arc-owner-label">⚡ Owner Override</div>
        <div class="arc-owner-inputs">
          <label>Agree <input type="number" id="arcOverrideAgree" value="${agree}" min="0"/></label>
          <label>Disagree <input type="number" id="arcOverrideDisagree" value="${disagree}" min="0"/></label>
          <button class="arc-owner-save" data-entry="${entry.id}">Apply Override</button>
        </div>
      </div>` : '';
    return `
      <div class="arc-modal__backdrop" id="arcModalBackdrop">
        <div class="arc-modal" role="dialog" aria-modal="true" aria-label="${entry.title}">
          <button class="arc-modal__close" id="arcModalClose" aria-label="Close">✕</button>
          <div class="arc-modal__img-wrap">
            <img src="${entry.image}" alt="${entry.title}" class="arc-modal__img"
              referrerpolicy="no-referrer"
              onerror="this.closest('.arc-modal__img-wrap').classList.add('arc-img-missing')"/>
            <div class="arc-modal__img-overlay"></div>
          </div>
          <div class="arc-modal__content">
            <div class="arc-modal__head">
              <h2 class="arc-modal__title">${entry.title}${yearStr}</h2>
              <div class="arc-modal__rating">
                <span class="arc-rating-num">${formatRating(entry.rating)}</span>
                <span class="arc-rating-denom">/10</span>
              </div>
            </div>
            <div class="arc-modal__tags">${tagPills}</div>
            <p class="arc-modal__opinion">"${entry.opinion}"</p>
            <div class="arc-modal__vote-section">
              <div class="arc-modal__pct-row" id="arcModalPctRow">
                <div class="arc-modal__pct-agree">
                  <span class="arc-modal__pct-num" id="arcModalAgreePct">${agreePct}%</span>
                  <span class="arc-modal__pct-lbl">Agree</span>
                  <div class="arc-modal__bar-track">
                    <div class="arc-modal__bar-fill arc-fill-agree" id="arcModalAgreeBar" style="width:${agreePct}%"></div>
                  </div>
                </div>
                <div class="arc-modal__pct-disagree">
                  <span class="arc-modal__pct-num" id="arcModalDisagreePct">${disagreePct}%</span>
                  <span class="arc-modal__pct-lbl">Disagree</span>
                  <div class="arc-modal__bar-track">
                    <div class="arc-modal__bar-fill arc-fill-disagree" id="arcModalDisagreeBar" style="width:${disagreePct}%"></div>
                  </div>
                </div>
              </div>
              <div class="arc-modal__vote-total" id="arcModalTotal">${total.toLocaleString()} votes</div>
              <div class="arc-modal__vote-btns">
                <button class="arc-vote-btn arc-vote-agree arc-vote-large" data-entry="${entry.id}" data-type="agree">✓ Agree with this take</button>
                <button class="arc-vote-btn arc-vote-disagree arc-vote-large" data-entry="${entry.id}" data-type="disagree">✕ Disagree</button>
              </div>
            </div>
            ${ownerPanel}
          </div>
        </div>
      </div>`;
  }

  // ─── FILL SECTION ─────────────────────────────────────────────────
  function fillSection(section) {
    const tags    = getAllTags();
    const tagBtns = tags.map(t =>
      `<button class="arc-tag-btn ${t === 'all' ? 'active' : ''}" data-tag="${t}">${t}</button>`
    ).join('');
    section.innerHTML = `
      <div class="arc-header">
        <div class="arc-header__inner">
          <h2 class="arc-header__title">
            <span class="arc-title-line1">The Archive</span>
            <span class="arc-title-line2">Curated opinions · Collective consensus</span>
          </h2>
          <div class="arc-header__search-wrap">
            <input type="search" class="arc-search" id="arcSearch"
              placeholder="Search titles, opinions, tags…" autocomplete="off" aria-label="Search archive"/>
            <svg class="arc-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <div class="arc-controls">
          <div class="arc-tags-scroll" id="arcTagsScroll">${tagBtns}</div>
          <div class="arc-sort-wrap">
            <select class="arc-sort" id="arcSort" aria-label="Sort entries">
              <option value="default">Default</option>
              <option value="rating-desc">Rating ↓</option>
              <option value="rating-asc">Rating ↑</option>
              <option value="year-desc">Newest first</option>
              <option value="year-asc">Oldest first</option>
              <option value="agree">Most agreed</option>
            </select>
          </div>
        </div>
      </div>
      <div class="arc-grid" id="arcGrid" aria-live="polite">${renderSkeletons(4)}</div>
      <div class="arc-empty" id="arcEmpty" hidden>
        <div class="arc-empty__icon">⌀</div><p>No entries match your search.</p>
      </div>
      <div id="arcModalContainer"></div>`;
  }

  // ─── RENDER GRID ──────────────────────────────────────────────────
  async function renderGrid(animate = true) {
    const grid  = document.getElementById('arcGrid');
    const empty = document.getElementById('arcEmpty');
    if (!grid) return;
    applyFilters();
    if (_filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) {
        empty.querySelector('p').textContent = _entries.length === 0
          ? 'No entries yet. Add the first one with the ⊕ button.'
          : 'No entries match your search.';
        empty.removeAttribute('hidden');
      }
      return;
    }
    empty?.setAttribute('hidden', '');

    const voteCounts = await Promise.all(_filtered.map(e => window.NAT_ARCHIVE.getVotes(e.id)));
    grid.innerHTML = _filtered.map((entry, i) => {
      const vc = voteCounts[i] || { agree: 0, disagree: 0 };
      return cardHTML(entry, vc.agree, vc.disagree);
    }).join('');

    if (animate) {
      $$('.arc-card', grid).forEach((card, i) => {
        card.style.opacity = '0'; card.style.transform = 'translateY(28px)';
        requestAnimationFrame(() => setTimeout(() => {
          card.style.transition = 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)';
          card.style.opacity = '1'; card.style.transform = 'translateY(0)';
        }, i * 60));
      });
    }
    setTimeout(() => {
      $$('.arc-pct-fill', grid).forEach(bar => {
        const pct = bar.closest('.arc-pct-bar')?.style.getPropertyValue('--pct') || '50%';
        bar.style.width = pct;
      });
    }, 80);

    _filtered.forEach(async entry => {
      const voted = await window.NAT_ARCHIVE.getUserVote(entry.id);
      if (voted) applyVotedState(entry.id, voted);
    });

    _voteUnsubs.forEach(fn => fn());
    _voteUnsubs = _filtered.map(entry =>
      window.NAT_ARCHIVE.subscribeVotes(entry.id, c => updateCardVotes(entry.id, c.agree, c.disagree))
    );
    bindCardEvents(grid);
  }

  function updateCardVotes(entryId, agree, disagree) {
    const card = $(`[data-id="${entryId}"]`);
    if (!card) return;
    card.dataset.agree = agree; card.dataset.disagree = disagree;
    const { agreePct, disagreePct } = calcPct(agree, disagree);
    const total = agree + disagree;
    const q = s => card.querySelector(s);
    const qs = (s, v) => { const el = q(s); if (el) el.textContent = v; };
    const qw = (s, v) => { const el = q(s); if (el) el.style.width = v; };
    const qp = (s, v) => { const el = q(s); if (el) el.style.setProperty('--pct', v); };
    qs('.arc-pct-agree .arc-pct-label strong',    `${agreePct}%`);
    qs('.arc-pct-disagree .arc-pct-label strong', `${disagreePct}%`);
    qs('.arc-vote-total', `${total.toLocaleString()} votes`);
    qw('.arc-fill-agree',    `${agreePct}%`);
    qw('.arc-fill-disagree', `${disagreePct}%`);
    qp('.arc-pct-agree',    `${agreePct}%`);
    qp('.arc-pct-disagree', `${disagreePct}%`);
  }

  function applyVotedState(entryId, type) {
    $$(`[data-entry="${entryId}"]`).forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.type === type) btn.classList.add('arc-voted');
      btn.classList.add('arc-vote-disabled');
    });
  }

  async function handleVote(entryId, type) {
    const result = await window.NAT_ARCHIVE.vote(entryId, type);
    if (!result.success) { if (result.reason === 'already-voted') showToast('You already voted on this one.'); return; }
    applyVotedState(entryId, type);
    showToast(type === 'agree' ? '✓ Agreed!' : '✕ Noted.');
    const counts = await window.NAT_ARCHIVE.getVotes(entryId);
    updateCardVotes(entryId, counts.agree, counts.disagree);
    if (_modalEntry?.id === entryId) updateModalVotes(counts.agree, counts.disagree);
  }

  function updateModalVotes(agree, disagree) {
    const { agreePct, disagreePct } = calcPct(agree, disagree);
    const total = agree + disagree;
    const el = id => document.getElementById(id);
    if (el('arcModalAgreePct'))    el('arcModalAgreePct').textContent    = `${agreePct}%`;
    if (el('arcModalDisagreePct')) el('arcModalDisagreePct').textContent = `${disagreePct}%`;
    if (el('arcModalAgreeBar'))    el('arcModalAgreeBar').style.width    = `${agreePct}%`;
    if (el('arcModalDisagreeBar')) el('arcModalDisagreeBar').style.width = `${disagreePct}%`;
    if (el('arcModalTotal'))       el('arcModalTotal').textContent       = `${total.toLocaleString()} votes`;
  }

  async function openModal(entryId) {
    const entry = _entries.find(e => e.id === entryId);
    if (!entry) return;
    _modalEntry = entry;
    const container = document.getElementById('arcModalContainer');
    if (!container) return;
    const { agree, disagree } = await window.NAT_ARCHIVE.getVotes(entryId);
    container.innerHTML = modalHTML(entry, agree, disagree);

    requestAnimationFrame(() => {
      const bd = container.querySelector('.arc-modal__backdrop');
      const m  = container.querySelector('.arc-modal');
      if (bd) { bd.style.opacity = '0'; requestAnimationFrame(() => { bd.style.transition = 'opacity 0.3s ease'; bd.style.opacity = '1'; }); }
      if (m)  { m.style.opacity = '0'; m.style.transform = 'translateY(32px) scale(0.97)'; requestAnimationFrame(() => { m.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)'; m.style.opacity = '1'; m.style.transform = 'translateY(0) scale(1)'; }); }
    });
    setTimeout(() => {
      const ab = document.getElementById('arcModalAgreeBar'), db = document.getElementById('arcModalDisagreeBar');
      if (ab) ab.style.transition = 'width 0.8s cubic-bezier(0.22,1,0.36,1)';
      if (db) db.style.transition = 'width 0.8s cubic-bezier(0.22,1,0.36,1)';
    }, 100);

    const voted = await window.NAT_ARCHIVE.getUserVote(entryId);
    if (voted) applyVotedState(entryId, voted);

    document.getElementById('arcModalClose')?.addEventListener('click', closeModal);
    document.getElementById('arcModalBackdrop')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    container.querySelector('.arc-owner-save')?.addEventListener('click', async () => {
      const a = parseInt(document.getElementById('arcOverrideAgree')?.value, 10) || 0;
      const d = parseInt(document.getElementById('arcOverrideDisagree')?.value, 10) || 0;
      const ok = await window.NAT_ARCHIVE.override(entryId, a, d);
      if (ok) { showToast('Override applied.'); updateModalVotes(a, d); updateCardVotes(entryId, a, d); }
    });
    container.querySelectorAll('.arc-vote-btn').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); handleVote(btn.dataset.entry, btn.dataset.type); })
    );
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const bd = document.querySelector('.arc-modal__backdrop');
    const m  = document.querySelector('.arc-modal');
    if (!bd) return;
    bd.style.transition = 'opacity 0.25s ease'; bd.style.opacity = '0';
    if (m) { m.style.transition = 'opacity 0.25s ease, transform 0.25s ease'; m.style.opacity = '0'; m.style.transform = 'translateY(20px) scale(0.97)'; }
    setTimeout(() => {
      const c = document.getElementById('arcModalContainer');
      if (c) c.innerHTML = '';
      _modalEntry = null;
      document.body.style.overflow = '';
    }, 280);
  }

  // ─── EDIT MODAL ───────────────────────────────────────────────────
  function openEditModal(entryId) {
    const entry = _entries.find(e => e.id === entryId);
    if (!entry) return;

    let wrap = document.getElementById('arcEditWrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'arcEditWrap'; document.body.appendChild(wrap); }

    wrap.innerHTML = `
      <div class="arc-edit-bd" id="arcEditBd">
        <div class="arc-edit-modal">
          <div class="arc-edit-head">
            <span class="arc-edit-title">✏️ Edit Entry</span>
            <button class="aup-close" id="arcEditClose">✕</button>
          </div>
          <div class="arc-edit-body">
            <div class="aup-field">
              <label class="aup-lbl">Title</label>
              <input class="aup-input" id="arcEditTitle" type="text" maxlength="80" value="${_esc(entry.title)}"/>
            </div>
            <div class="aup-row">
              <div class="aup-field">
                <label class="aup-lbl">Rating /10</label>
                <input class="aup-input" id="arcEditRating" type="number" min="0" max="10" step="0.1" value="${entry.rating || ''}"/>
              </div>
              <div class="aup-field">
                <label class="aup-lbl">Year</label>
                <input class="aup-input" id="arcEditYear" type="number" min="1888" max="2099" value="${entry.year || ''}"/>
              </div>
            </div>
            <div class="aup-field">
              <label class="aup-lbl">Opinion</label>
              <textarea class="aup-input aup-ta" id="arcEditOpinion" rows="3" maxlength="280">${_esc(entry.opinion)}</textarea>
              <div class="aup-cc"><span id="arcEditOpinionCount">${(entry.opinion||'').length}</span>/280</div>
            </div>
            <div class="aup-field">
              <label class="aup-lbl">Tags</label>
              <input class="aup-input" id="arcEditTags" type="text" value="${(entry.tags||[]).join(', ')}"/>
              <div class="aup-hint">Comma-separated</div>
            </div>
            <div class="aup-field">
              <label class="aup-lbl">Cover Image URL</label>
              <input class="aup-input" id="arcEditImage" type="url" value="${_esc(entry.image||'')}" placeholder="https://i.imgur.com/..."/>
              <div class="aup-hint">Direct image URL — paste from Imgur, Discord, etc.</div>
              <div class="arc-edit-img-preview-wrap" id="arcEditPreviewWrap" style="${entry.image ? '' : 'display:none'}">
                <img id="arcEditPreview" src="${_esc(entry.image||'')}" referrerpolicy="no-referrer"
                  onerror="this.style.display='none'" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-top:6px"/>
              </div>
            </div>
          </div>
          <div class="aup-err gone" id="arcEditErr"></div>
          <div class="arc-edit-footer">
            <button class="aup-cancel" id="arcEditCancel">Cancel</button>
            <button class="aup-submit" id="arcEditSave" data-id="${entry.id}">
              <span id="arcEditSaveLbl">Save Changes</span>
            </button>
          </div>
        </div>
      </div>`;

    // Image URL preview on change
    let _previewTimer;
    document.getElementById('arcEditImage').addEventListener('input', e => {
      clearTimeout(_previewTimer);
      _previewTimer = setTimeout(() => {
        const url = e.target.value.trim();
        const wrap  = document.getElementById('arcEditPreviewWrap');
        const prev  = document.getElementById('arcEditPreview');
        if (!url) { wrap.style.display = 'none'; return; }
        prev.src = url; prev.style.display = '';
        prev.onload  = () => wrap.style.display = '';
        prev.onerror = () => wrap.style.display = 'none';
      }, 500);
    });

    // Opinion char count
    const op = document.getElementById('arcEditOpinion');
    op.addEventListener('input', () => {
      document.getElementById('arcEditOpinionCount').textContent = op.value.length;
    });

    const close = () => {
      const bd = document.getElementById('arcEditBd');
      if (bd) { bd.style.opacity = '0'; setTimeout(() => { wrap.innerHTML = ''; document.body.style.overflow = ''; }, 260); }
    };
    document.getElementById('arcEditClose').addEventListener('click', close);
    document.getElementById('arcEditCancel').addEventListener('click', close);
    document.getElementById('arcEditBd').addEventListener('click', e => { if (e.target === e.currentTarget) close(); });

    document.getElementById('arcEditSave').addEventListener('click', async () => {
      const btn = document.getElementById('arcEditSave');
      const lbl = document.getElementById('arcEditSaveLbl');
      const err = document.getElementById('arcEditErr');
      err.classList.add('gone');
      if (btn) btn.disabled = true;
      if (lbl) lbl.textContent = 'Saving…';

      const patch = {
        title:   document.getElementById('arcEditTitle')?.value.trim(),
        rating:  document.getElementById('arcEditRating')?.value,
        year:    document.getElementById('arcEditYear')?.value,
        opinion: document.getElementById('arcEditOpinion')?.value.trim(),
        tags:    document.getElementById('arcEditTags')?.value,
        image:   document.getElementById('arcEditImage')?.value.trim(),
      };

      if (!patch.title) { err.textContent = 'Title is required.'; err.classList.remove('gone'); if (btn) btn.disabled = false; if (lbl) lbl.textContent = 'Save Changes'; return; }

      const result = await window.NAT_ARCHIVE.editEntry(entryId, patch);
      if (result.success) {
        showToast('✓ Entry updated.');
        close();
      } else {
        err.textContent = 'Save failed: ' + (result.reason || 'unknown error');
        err.classList.remove('gone');
        if (btn) btn.disabled = false;
        if (lbl) lbl.textContent = 'Save Changes';
      }
    });

    // Animate in
    const bd = document.getElementById('arcEditBd');
    bd.style.opacity = '0';
    requestAnimationFrame(() => { bd.style.transition = 'opacity .3s ease'; bd.style.opacity = '1'; });
    document.body.style.overflow = 'hidden';
  }

  // HTML escape helper
  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ─── DELETE HANDLER ───────────────────────────────────────────────
  async function handleDelete(entryId) {
    const entry = _entries.find(e => e.id === entryId);
    const name  = entry?.title || entryId;
    if (!confirm(`Delete "${name}"?\n\nThis cannot be undone.`)) return;
    const ok = await window.NAT_ARCHIVE.deleteEntry(entryId);
    if (ok) showToast('🗑 Entry deleted.');
    else    showToast('Delete failed — check console.');
  }

  function bindCardEvents(grid) {
    grid.addEventListener('click', e => {
      // Owner action buttons
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const { action, id } = actionBtn.dataset;
        if (action === 'edit')   openEditModal(id);
        if (action === 'delete') handleDelete(id);
        return;
      }
      // Vote buttons
      const voteBtn = e.target.closest('.arc-vote-btn');
      if (voteBtn) { e.stopPropagation(); handleVote(voteBtn.dataset.entry, voteBtn.dataset.type); return; }
      // Card click → view modal
      const card = e.target.closest('.arc-card');
      if (card) openModal(card.dataset.id);
    });
    grid.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.arc-card'))
        openModal(e.target.closest('.arc-card').dataset.id);
    });
  }

  function showToast(msg) {
    let t = document.getElementById('arcToast');
    if (!t) { t = document.createElement('div'); t.id = 'arcToast'; t.className = 'arc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('arc-toast--visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('arc-toast--visible'), 2200);
  }

  function bindControls(section) {
    let sd;
    section.querySelector('#arcSearch')?.addEventListener('input', e => {
      clearTimeout(sd); sd = setTimeout(() => { _searchQuery = e.target.value.trim(); renderGrid(true); }, 220);
    });
    section.querySelector('#arcTagsScroll')?.addEventListener('click', e => {
      const btn = e.target.closest('.arc-tag-btn'); if (!btn) return;
      $$('.arc-tag-btn', section).forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); _activeTag = btn.dataset.tag; renderGrid(true);
    });
    section.querySelector('#arcSort')?.addEventListener('change', e => { _sortMode = e.target.value; renderGrid(true); });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && _modalEntry) closeModal(); });

  window.addEventListener('nattabchange', e => {
    if (e.detail?.tab !== 'archive') return;
    // Force any images that didn't load while section was hidden to retry
    setTimeout(() => {
      document.querySelectorAll('.arc-card__img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          const src = img.src;
          img.src  = '';
          img.src  = src;
        }
      });
      // Animate percent bars
      document.querySelectorAll('.arc-pct-fill').forEach(bar => {
        const pct = bar.closest('.arc-pct-bar')?.style.getPropertyValue('--pct') || '50%';
        bar.style.width = pct;
      });
    }, 80);
  });

  // Re-render whenever archive-data.js gets new entries from Firebase
  let _refreshDebounce;
  window.addEventListener('archiveEntriesUpdated', () => {
    if (!_built) return;
    clearTimeout(_refreshDebounce);
    _refreshDebounce = setTimeout(() => {
      const fresh = [...window.NAT_ARCHIVE.ENTRIES];
      _entries  = fresh;
      _filtered = [..._entries];
      rebuildTagBar();
      renderGrid(true);
      console.log('[Archive] Refreshed —', _entries.length, 'entries');
    }, 80); // 80ms debounce collapses rapid double-fires into one render
  });

  function rebuildTagBar() {
    const scroll = document.getElementById('arcTagsScroll');
    if (!scroll) return;
    const tags = getAllTags();
    scroll.innerHTML = tags.map(t =>
      `<button class="arc-tag-btn ${t === _activeTag ? 'active' : ''}" data-tag="${t}">${t}</button>`
    ).join('');
  }

  // ─── OWNER ACTION CSS (injected once) ────────────────────────────
  function injectOwnerCSS() {
    if (document.getElementById('arcOwnerCSS')) return;
    const s = document.createElement('style');
    s.id = 'arcOwnerCSS';
    s.textContent = `
/* ── Owner bar on cards ── */
.arc-owner-bar{
  position:absolute;top:8px;left:8px;z-index:4;
  display:flex;gap:6px;
  opacity:0;pointer-events:none;
  transition:opacity .2s ease;
}
.arc-card:hover .arc-owner-bar{opacity:1;pointer-events:all}
/* always visible on touch devices */
@media(hover:none){.arc-owner-bar{opacity:1;pointer-events:all}}
.arc-owner-btn{
  padding:5px 9px;border-radius:7px;font-size:11px;font-weight:600;
  cursor:pointer;border:none;backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);transition:all .15s ease;
  white-space:nowrap;
}
.arc-edit-btn{background:rgba(212,175,122,0.85);color:#0a0c18}
.arc-edit-btn:hover{background:rgba(212,175,122,1)}
.arc-delete-btn{background:rgba(244,67,54,0.80);color:#fff}
.arc-delete-btn:hover{background:rgba(244,67,54,1)}

/* ── Edit modal backdrop ── */
.arc-edit-bd{
  position:fixed;inset:0;z-index:10700;
  display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);padding:16px;box-sizing:border-box;
  overflow-y:auto;-webkit-overflow-scrolling:touch;
}
.arc-edit-modal{
  width:100%;max-width:480px;background:#0e0f15;
  border:1px solid rgba(255,255,255,0.1);border-radius:18px;
  overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.7);
  display:flex;flex-direction:column;max-height:90vh;overflow-y:auto;
  -webkit-overflow-scrolling:touch;
}
.arc-edit-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:15px 18px 11px;border-bottom:1px solid rgba(255,255,255,0.07);
  position:sticky;top:0;background:#0e0f15;z-index:2;
}
.arc-edit-title{font-size:14px;font-weight:700;color:#e8e8f0}
.arc-edit-body{display:flex;flex-direction:column;gap:10px;padding:14px 18px 0}
.arc-edit-img-preview-wrap{margin-top:4px}
.arc-edit-footer{
  display:flex;gap:8px;padding:14px 18px 18px;justify-content:flex-end;
  border-top:1px solid rgba(255,255,255,0.06);
  position:sticky;bottom:0;background:#0e0f15;
}
@media(max-width:600px){
  .arc-edit-modal{border-radius:16px 16px 0 0;max-height:94vh;position:fixed;bottom:0;left:0;right:0;max-width:100%}
  .arc-edit-bd{align-items:flex-end;padding:0}
  .arc-edit-footer{flex-direction:column-reverse}
  .arc-edit-footer .aup-cancel,.arc-edit-footer .aup-submit{width:100%;text-align:center}
}`;
    document.head.appendChild(s);
  }

  // ─── INIT ─────────────────────────────────────────────────────────
  // tabs.js (defer) creates #archiveSection before archive.js (defer) runs
  // because tabs.js appears first in index.html.
  // archive-data.js (defer) also appears before archive.js → NAT_ARCHIVE is ready.
  // Both should be available immediately; the short retry is a safety net only.
  function build() {
    if (_built) return;
    if (!window.NAT_ARCHIVE) return;
    const section = document.getElementById('archiveSection');
    if (!section) return;
    _entries = [...window.NAT_ARCHIVE.ENTRIES];
    _filtered = [..._entries];
    injectOwnerCSS();
    fillSection(section);
    bindControls(section);
    renderGrid(false);
    _built = true;
    console.log('[Archive] Ready —', _entries.length, 'entries');
  }

  function init() {
    if (window.NAT_ARCHIVE && document.getElementById('archiveSection')) { build(); return; }
    let tries = 0;
    const tick = setInterval(() => {
      tries++;
      if (window.NAT_ARCHIVE && document.getElementById('archiveSection')) { clearInterval(tick); build(); }
      else if (tries >= 30) { clearInterval(tick); console.warn('[Archive] Init timeout'); }
    }, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
