/**
 * sort-ui.js
 * Sort buttons for Hobbies, Reactions (Rate Po), and Gallery.
 * Vanilla JS, no dependencies.
 * Load after app2.js (defer).
 */
(() => {
  'use strict';

  // ── HOBBIES SORT ────────────────────────────────────────────────
  window.sortHobbies = function (mode) {
    const grid = document.querySelector('.hobbies-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll('.hobby-card')];

    if (mode === 'default') {
      // restore original DOM order via data-index set below
      cards.sort((a, b) => (parseInt(a.dataset.sortIdx) || 0) - (parseInt(b.dataset.sortIdx) || 0));
    } else if (mode === 'az') {
      cards.sort((a, b) => {
        const na = a.querySelector('.hobby-name')?.textContent.trim() || '';
        const nb = b.querySelector('.hobby-name')?.textContent.trim() || '';
        return na.localeCompare(nb);
      });
    } else if (mode === 'za') {
      cards.sort((a, b) => {
        const na = a.querySelector('.hobby-name')?.textContent.trim() || '';
        const nb = b.querySelector('.hobby-name')?.textContent.trim() || '';
        return nb.localeCompare(na);
      });
    } else if (mode === 'top-react') {
      cards.sort((a, b) => {
        const countOf = el => [...el.querySelectorAll('.hreact-count')]
          .reduce((s, sp) => s + (parseInt(sp.textContent) || 0), 0);
        return countOf(b) - countOf(a);
      });
    }

    // Re-append in new order with animation
    cards.forEach((c, i) => {
      c.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      c.style.opacity    = '0';
      c.style.transform  = 'translateY(12px)';
      grid.appendChild(c);
      setTimeout(() => { c.style.opacity = '1'; c.style.transform = 'translateY(0)'; }, i * 40);
    });
  };

  // ── REACTIONS SORT ───────────────────────────────────────────────
  window.sortReactions = function (mode) {
    const container = document.querySelector('.react-buttons');
    if (!container) return;
    const btns = [...container.querySelectorAll('.big-reaction-btn')];

    if (mode === 'default') {
      btns.sort((a, b) => (parseInt(a.dataset.sortIdx) || 0) - (parseInt(b.dataset.sortIdx) || 0));
    } else if (mode === 'top') {
      btns.sort((a, b) => {
        const ca = parseInt(a.querySelector('.cnt')?.textContent) || 0;
        const cb = parseInt(b.querySelector('.cnt')?.textContent) || 0;
        return cb - ca;
      });
    } else if (mode === 'az') {
      btns.sort((a, b) => {
        const la = a.querySelector('.label')?.textContent.trim() || '';
        const lb = b.querySelector('.label')?.textContent.trim() || '';
        return la.localeCompare(lb);
      });
    }

    btns.forEach((btn, i) => {
      btn.style.transition = 'opacity 0.2s ease';
      btn.style.opacity    = '0';
      container.appendChild(btn);
      setTimeout(() => { btn.style.opacity = '1'; }, i * 35);
    });
  };

  // ── GALLERY SORT ─────────────────────────────────────────────────
  window.sortGallery = function (mode) {
    const grid = document.getElementById('photosWallGrid');
    if (!grid) return;
    const frames = [...grid.querySelectorAll('.photos-wall-frame')];

    if (mode === 'default') {
      frames.sort((a, b) => (parseInt(a.dataset.idx) || 0) - (parseInt(b.dataset.idx) || 0));
    } else if (mode === 'most-reacted') {
      frames.sort((a, b) => {
        const countOf = el => {
          const overlay = el.querySelector('.photos-wall-react-overlay');
          if (!overlay) return 0;
          return [...overlay.querySelectorAll('.reaction-btn')]
            .reduce((s, btn) => {
              const txt = btn.querySelector('.reaction-count, span:last-child')?.textContent || '';
              return s + (parseInt(txt) || 0);
            }, 0);
        };
        return countOf(b) - countOf(a);
      });
    } else if (mode === 'newest') {
      // Photos have data-idx; higher idx = added later in gallery-data.js
      frames.sort((a, b) => (parseInt(b.dataset.idx) || 0) - (parseInt(a.dataset.idx) || 0));
    } else if (mode === 'oldest') {
      frames.sort((a, b) => (parseInt(a.dataset.idx) || 0) - (parseInt(b.dataset.idx) || 0));
    }

    frames.forEach((f, i) => {
      f.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      f.style.opacity    = '0';
      grid.appendChild(f);
      setTimeout(() => { f.style.opacity = '1'; f.style.transform = `rotate(${f.style.transform.match(/-?[\d.]+/)?.[0] || 0}deg)`; }, i * 30);
    });
  };

  // ── STAMP ORIGINAL ORDER on page load ────────────────────────────
  // Run once after DOM ready so "Default" can restore original order
  function stampOrder() {
    document.querySelectorAll('.hobby-card').forEach((c, i)   => c.dataset.sortIdx = i);
    document.querySelectorAll('.big-reaction-btn').forEach((b, i) => b.dataset.sortIdx = i);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', stampOrder);
  } else {
    stampOrder();
  }

  // Re-stamp when hobbies tab opens (hobby cards may not exist yet)
  window.addEventListener('nattabchange', e => {
    if (e.detail?.tab === 'hobbies') {
      setTimeout(() => {
        document.querySelectorAll('.hobby-card').forEach((c, i) => {
          if (!c.dataset.sortIdx) c.dataset.sortIdx = i;
        });
      }, 100);
    }
    if (e.detail?.tab === 'rate') {
      setTimeout(() => {
        document.querySelectorAll('.big-reaction-btn').forEach((b, i) => {
          if (!b.dataset.sortIdx) b.dataset.sortIdx = i;
        });
      }, 100);
    }
  });

  console.log('[sort-ui] Sort handlers registered ✓');
})();
