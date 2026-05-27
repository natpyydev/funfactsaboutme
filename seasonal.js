/* 🎨 SEASONAL THEMES — auto-applied based on date
   Override with ?theme=christmas|halloween|valentines|birthday|underwater|none in URL */
(() => {
  const KEY = 'nat-theme-override';

  function pick() {
    const url = new URLSearchParams(location.search).get('theme');
    if (url) {
      if (url === 'none') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, url);
    }
    const stored = localStorage.getItem(KEY);
    if (stored && stored !== 'auto') return stored === 'none' ? null : stored;

    const d = new Date(), m = d.getMonth(), day = d.getDate();
    if (m === 1 && day <= 14) return 'valentines';
    if (m === 8 && day === 4) return 'birthday';
    if (m === 9) return 'halloween';
    if (m === 11) return 'christmas';
    return null;
  }

  const FLOATERS = {
    valentines: ['💗','💕','💖','🌹','💘','💞'],
    birthday:   ['🎂','🎈','🎉','🎁','✨','🥳'],
    halloween:  ['🎃','🦇','👻','🕷','🕸','🍬'],
    christmas:  ['❄','❄️','🎄','⛄','🎁','✨','🍬','🍭','🎅','🦌'],
    underwater: ['🫧','🐠','🐟','🦑','🌊','🐙','🐚','🦈','✨','🪼'],
  };

  const ANIM = {
    valentines: 'seasonFall',
    birthday:   'seasonFall',
    halloween:  'seasonDrift',
    christmas:  'snowFall',
    underwater: 'bubbleRise',
  };

  function clear() {
    document.body.classList.remove(
      'theme-valentines','theme-birthday','theme-halloween','theme-christmas','theme-underwater'
    );
    document.getElementById('seasonalFloaters')?.remove();
    document.getElementById('seasonalDeco')?.remove();
  }

  function apply() {
    clear();
    const t = pick();
    if (!t) return;
    document.body.classList.add('theme-' + t);

    const host = document.createElement('div');
    host.id = 'seasonalFloaters';
    host.className = 'seasonal-floaters seasonal-' + t;
    document.body.appendChild(host);
    const e = FLOATERS[t];
    if (e) {
      const anim  = ANIM[t] || 'seasonFall';
      const count = (t === 'christmas' || t === 'underwater') ? 50 : 26;
      for (let i = 0; i < count; i++) {
        const f = document.createElement('span');
        f.textContent = e[i % e.length];
        f.style.left = Math.random() * 100 + '%';
        f.style.animationName = anim;
        f.style.animationDelay = (Math.random() * -22) + 's';
        f.style.animationDuration = (10 + Math.random() * 18) + 's';
        f.style.fontSize = (11 + Math.random() * 20) + 'px';
        f.style.opacity = (0.45 + Math.random() * 0.5).toFixed(2);
        if (t === 'underwater') {
          f.style.bottom = '-40px';
          f.style.top = 'auto';
        }
        host.appendChild(f);
      }
    }

    const deco = document.createElement('div');
    deco.id = 'seasonalDeco';
    deco.className = 'seasonal-deco seasonal-deco-' + t;
    deco.innerHTML = decoHTML(t);
    document.body.appendChild(deco);
  }

  function decoHTML(t) {
    if (t === 'christmas') {
      return `
        <div class="xmas-garland">
          ${Array.from({length: 30}).map((_,i) =>
            `<span class="xmas-light" style="--i:${i}"></span>`).join('')}
        </div>`;
    }
    if (t === 'halloween') {
      return `
        <div class="hallo-bats">
          ${['🦇','🦇','🦇','🦇'].map((b,i) =>
            `<span class="hallo-bat" style="--i:${i}">${b}</span>`).join('')}
        </div>
        <div class="hallo-spider"><span>🕷</span></div>`;
    }
    if (t === 'valentines') {
      return `<div class="vday-banner">💕 valentine's mode 💕</div>`;
    }
    if (t === 'birthday') {
      return `
        <div class="bday-banner">🎂 it's nat's birthday! 🎂</div>
        <div class="bday-confetti">
          ${Array.from({length: 24}).map((_,i) =>
            `<span class="bday-piece" style="--i:${i}"></span>`).join('')}
        </div>`;
    }
    if (t === 'underwater') {
      return `
        <div class="uw-banner">🌊 The Sunken Archive 🌊</div>
        <div class="uw-caustics"></div>
        <div class="uw-kelp-row">
          ${Array.from({length:6}).map((_,i) =>
            `<div class="uw-kelp" style="--i:${i}">🌿</div>`).join('')}
        </div>`;
    }
    return '';
  }

  function attachSantaHats() {
    if (!document.body.classList.contains('theme-christmas')) return;
    document.querySelectorAll('header h1, .section-title').forEach(el => {
      if (el.querySelector('.santa-hat')) return;
      const hat = document.createElement('span');
      hat.className = 'santa-hat';
      hat.setAttribute('aria-hidden', 'true');
      hat.textContent = '🎅';
      el.prepend(hat);
    });
  }

  function attachUnderwaterDeco() {
    if (!document.body.classList.contains('theme-underwater')) return;
    document.querySelectorAll('header h1, .section-title').forEach(el => {
      if (el.querySelector('.uw-hat')) return;
      const hat = document.createElement('span');
      hat.className = 'uw-hat';
      hat.setAttribute('aria-hidden', 'true');
      hat.textContent = '🌊';
      el.prepend(hat);
    });
  }

  // ── Underwater: Floating Section Copies ──────────────────────────
  function startUnderwaterFloatingSections() {
    if (!document.body.classList.contains('theme-underwater')) return;
    const SECTION_SELECTORS = [
      '.facts-section',
      '.gallery-section',
      '.message-section',
      '.hobbies-section',
      '.react-section',
    ];

    function spawnFloatingSection() {
      const candidates = SECTION_SELECTORS.map(s => document.querySelector(s)).filter(Boolean);
      if (!candidates.length) return;
      const src = candidates[Math.floor(Math.random() * candidates.length)];
      const clone = src.cloneNode(true);

      clone.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'z-index:9',
        'opacity:0',
        'left:' + (Math.random() * 60 + 5) + 'vw',
        'top:' + (Math.random() * 40 + 30) + 'vh',
        'width:' + (260 + Math.random() * 160) + 'px',
        'transform:scale(' + (0.2 + Math.random() * 0.25) + ') rotate(' + (Math.random() * 10 - 5) + 'deg)',
        'transition:opacity 1.8s ease',
        'filter:blur(1px) brightness(0.65) hue-rotate(160deg)',
        'border-radius:16px',
        'overflow:hidden',
        'max-height:260px',
      ].join(';');

      clone.setAttribute('aria-hidden', 'true');
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      clone.classList.add('uw-floating-section-clone');
      document.body.appendChild(clone);

      requestAnimationFrame(() => { clone.style.opacity = '0.18'; });

      const drift = -30 - Math.random() * 60;
      const dur = 8000 + Math.random() * 6000;
      const startY = parseFloat(clone.style.top);

      let start = null;
      function animateFloat(ts) {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / dur);
        clone.style.top = (startY + drift * p) + 'vh';
        if (p < 1) requestAnimationFrame(animateFloat);
        else {
          clone.style.opacity = '0';
          setTimeout(() => clone.remove(), 1800);
        }
      }
      requestAnimationFrame(animateFloat);
    }

    let floatIv = setInterval(spawnFloatingSection, 7000 + Math.random() * 5000);
    setTimeout(spawnFloatingSection, 3000);
    return floatIv;
  }

  // ── Underwater: Error Count Glitch ───────────────────────────────
  function startUnderwaterCountGlitch() {
    if (!document.body.classList.contains('theme-underwater')) return;
    const ERROR_STRINGS = ['ERR', '???', 'NaN', '∅', '404', 'Ø', '✗', '##', '!?', 'ⓧ'];
    let glitchOn = false;

    function toggleGlitch() {
      glitchOn = !glitchOn;
      document.querySelectorAll(
        '.upvote-count, .cnt, .msg-react-count, .svc-totals span, .reply-count-label, #cnt-0, #cnt-1, #cnt-2, #cnt-3, #cnt-4'
      ).forEach(el => {
        if (!el._uwOrigText) el._uwOrigText = el.textContent;
        if (glitchOn) {
          el.textContent = ERROR_STRINGS[Math.floor(Math.random() * ERROR_STRINGS.length)];
          el.style.color = '#ff3333';
          el.style.fontStyle = 'italic';
        } else {
          el.textContent = el._uwOrigText;
          el.style.color = '';
          el.style.fontStyle = '';
        }
      });

      const delay = glitchOn ? (1000 + Math.random() * 800) : (3000 + Math.random() * 2000);
      setTimeout(toggleGlitch, delay);
    }

    setTimeout(toggleGlitch, 5000);
  }

  function init() {
    apply();
    attachSantaHats();
    attachUnderwaterDeco();
    window.addEventListener('nattabchange', () => {
      setTimeout(attachSantaHats, 80);
      setTimeout(attachUnderwaterDeco, 80);
    });
    setTimeout(() => { attachSantaHats(); attachUnderwaterDeco(); }, 800);
    setTimeout(() => { attachSantaHats(); attachUnderwaterDeco(); }, 2200);

    if (document.body.classList.contains('theme-underwater')) {
      startUnderwaterFloatingSections();
      startUnderwaterCountGlitch();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
