// ──────────────────────────────────────────────────────────
// PHOTO‑ME  —  Full-screen cover photo
//              Title BEHIND image · Desc overlay box ON image
//              Rich below-the-fold content section
// ──────────────────────────────────────────────────────────

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const canvas  = document.getElementById('photo-canvas');
    const wrap    = document.getElementById('photo-wrap');
    const titleEl = document.getElementById('photo-title');
    const descEl  = document.getElementById('photo-desc-overlay');
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');

    const PHOTO_SRC = 'me-photo.jpg';

    const SECTIONS = [
      {
        threshold: 0.0,  exitThreshold: 0.24,
        text: 'MUNTINLUPA',
        label: 'Hometown',
        desc: 'A bustling city in Metro Manila — known for its commercial hubs, lakeside views, and the Festival Supermall.',
        accent: '📍 Philippines'
      },
      {
        threshold: 0.25, exitThreshold: 0.49,
        text: 'JAVASCRIPT',
        label: 'Language',
        desc: 'The language of the web. Self-taught developer who loves clean code, dark mode, and building things people actually use.',
        accent: '< / > 999+ years coding'
      },
      {
        threshold: 0.50, exitThreshold: 0.74,
        text: 'CUBE MASTER',
        label: 'Secret Skill',
        desc: "Can solve a Rubik's Cube in under 45 seconds. It's all algorithms — same as coding, honestly.",
        accent: '⬛ 3×3 Speed Cuber'
      },
      {
        threshold: 0.75, exitThreshold: 1.0,
        text: 'JAPAN · ICELAND',
        label: 'Wanderlust',
        desc: 'Chasing northern lights, volcano hikes, cherry blossoms, bullet trains. Already visited 0 countries. lol',
        accent: '✈️ 0 Countries So Far'
      }
    ];

    // ─── LOAD PHOTO ────────────────────────────────────────
    const photo = new Image();
    photo.src = PHOTO_SRC;
    let photoReady = false;
    photo.onload  = () => { photoReady = true; sizeAndDraw(); };
    if (photo.complete && photo.naturalWidth > 0) { photoReady = true; }

    // ─── SIZING — full viewport canvas, image contained (no crop, no black bars) ──
    // Canvas is always 100vw × 100vh. The image (2364×1772, ratio ~4:3) is
    // scaled with Math.min so it fits entirely — centered, fully visible.
    // The canvas background is transparent, so any side/top gaps show the
    // page's black background — no hard black bar borders.
    function resizeCanvas() {
      const vw  = window.innerWidth;
      const vh  = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width        = Math.round(vw * dpr);
      canvas.height       = Math.round(vh * dpr);
      canvas.style.width  = vw + 'px';
      canvas.style.height = vh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawPhoto() {
      if (!photoReady) return;
      resizeCanvas();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      ctx.clearRect(0, 0, vw, vh);

      // Contain: scale so image fits fully, centered, no crop
      const scaleW = vw / photo.naturalWidth;
      const scaleH = vh / photo.naturalHeight;
      const scale  = Math.min(scaleW, scaleH);
      const dw = photo.naturalWidth  * scale;
      const dh = photo.naturalHeight * scale;
      const dx = (vw - dw) / 2;
      const dy = (vh - dh) / 2;
      ctx.drawImage(photo, dx, dy, dw, dh);

      // Bottom vignette
      const gradBottom = ctx.createLinearGradient(0, vh * 0.4, 0, vh);
      gradBottom.addColorStop(0,   'rgba(0,0,0,0)');
      gradBottom.addColorStop(0.6, 'rgba(0,0,0,0.5)');
      gradBottom.addColorStop(1,   'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradBottom;
      ctx.fillRect(0, 0, vw, vh);

      // Top vignette
      const gradTop = ctx.createLinearGradient(0, 0, 0, vh * 0.3);
      gradTop.addColorStop(0, 'rgba(0,0,0,0.55)');
      gradTop.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradTop;
      ctx.fillRect(0, 0, vw, vh);
    }

    function sizeAndDraw() {
      drawPhoto();
      if (titleEl) updateText(currentSection, false);
    }

    // ─── ANIMATED TEXT SWAP ────────────────────────────────
    let animating = false;

    function animateOut(el, onDone) {
      el.style.transition = 'opacity 0.22s ease, transform 0.28s cubic-bezier(.4,0,.2,1)';
      el.style.opacity = '0';
      el.style.transform = (el.dataset.baseTransform || '') + ' translateY(-12px)';
      setTimeout(onDone, 270);
    }

    function animateIn(el) {
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = (el.dataset.baseTransform || '') + ' translateY(12px)';
      void el.offsetHeight;
      el.style.transition = 'opacity 0.36s ease, transform 0.4s cubic-bezier(.2,0,.2,1)';
      el.style.opacity = '1';
      el.style.transform = el.dataset.baseTransform || '';
    }

    function updateText(idx, animate) {
      const cfg = SECTIONS[idx];

      if (!animate || animating) {
        if (titleEl) {
          titleEl.textContent = cfg.text || '';
          titleEl.style.transition = 'none';
          titleEl.style.opacity = '1';
          titleEl.style.transform = titleEl.dataset.baseTransform || '';
        }
        if (descEl) {
          buildDescBox(descEl, cfg);
          descEl.style.transition = 'none';
          descEl.style.opacity = '1';
          descEl.style.transform = descEl.dataset.baseTransform || '';
        }
        return;
      }

      animating = true;

      if (titleEl) {
        animateOut(titleEl, () => {
          titleEl.textContent = cfg.text || '';
          animateIn(titleEl);
        });
      }
      if (descEl) {
        setTimeout(() => {
          animateOut(descEl, () => {
            buildDescBox(descEl, cfg);
            animateIn(descEl);
            setTimeout(() => { animating = false; }, 400);
          });
        }, 70);
      } else {
        setTimeout(() => { animating = false; }, 420);
      }
    }

    function buildDescBox(el, cfg) {
      el.innerHTML = `
        <div class="pdesc-label">${cfg.label}</div>
        <p class="pdesc-body">${cfg.desc}</p>
        <div class="pdesc-accent">${cfg.accent}</div>
      `;
    }

    // ─── NO EXIT FADE ──────────────────────────────────────
    // Visibility is controlled by scriptreduced.js (finishSprite / maybeRestoreSprite).
    // photo-me.js only handles drawing and text updates.
    let currentProgress = 0;

    // ─── SECTION SWITCHING ─────────────────────────────────
    let currentSection = 0;

    function setSection(idx) {
      if (idx === currentSection) return;
      currentSection = idx;
      updateText(idx, true);
    }

    // ─── SCROLL ────────────────────────────────────────────
    function onScroll() {
      const track    = document.getElementById('scroll-track');
      const trackH   = track ? track.offsetHeight : 0;
      const progress = trackH > 0 ? Math.max(0, Math.min(1, window.scrollY / trackH)) : 0;
      currentProgress = progress;

      let target = 0;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        if (progress >= SECTIONS[i].threshold) { target = i; break; }
      }
      setSection(target);
    }

    // ─── INIT ──────────────────────────────────────────────
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { drawPhoto(); });

    if (titleEl) titleEl.dataset.baseTransform = '';
    if (descEl)  descEl.dataset.baseTransform  = '';

    if (photoReady) {
      sizeAndDraw();
    } else {
      const check = setInterval(() => {
        if (photoReady) { clearInterval(check); sizeAndDraw(); }
      }, 80);
    }
  }
})();
