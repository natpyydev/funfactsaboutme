/* 🎨 SEASONAL THEMES — auto-applied based on date
   Override with ?theme=christmas|halloween|valentines|birthday|none in URL */
(() => {
  const KEY = 'nat-theme-override';

  function pick() {
    // ?theme= URL override (persisted)
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
  };

  // animation flavours per theme
  const ANIM = {
    valentines: 'seasonFall',   // gentle drift
    birthday:   'seasonFall',
    halloween:  'seasonDrift',
    christmas:  'snowFall',     // sway-and-fall
  };

  function clear() {
    document.body.classList.remove(
      'theme-valentines','theme-birthday','theme-halloween','theme-christmas'
    );
    document.getElementById('seasonalFloaters')?.remove();
    document.getElementById('seasonalDeco')?.remove();
  }

  function apply() {
    clear();
    const t = pick();
    if (!t) return;
    document.body.classList.add('theme-' + t);

    // floating overlay (snow / hearts / pumpkins / candy)
    const host = document.createElement('div');
    host.id = 'seasonalFloaters';
    host.className = 'seasonal-floaters seasonal-' + t;
    document.body.appendChild(host);
    const e = FLOATERS[t];
    const anim = ANIM[t] || 'seasonFall';
    const count = t === 'christmas' ? 50 : 26;
    for (let i = 0; i < count; i++) {
      const f = document.createElement('span');
      f.textContent = e[i % e.length];
      f.style.left = Math.random() * 100 + '%';
      f.style.animationName = anim;
      f.style.animationDelay = (Math.random() * -20) + 's';
      f.style.animationDuration = (10 + Math.random() * 16) + 's';
      f.style.fontSize = (12 + Math.random() * 22) + 'px';
      f.style.opacity = (0.55 + Math.random() * 0.45).toFixed(2);
      host.appendChild(f);
    }

    // decorations layer (hats on header, garlands, etc.)
    const deco = document.createElement('div');
    deco.id = 'seasonalDeco';
    deco.className = 'seasonal-deco seasonal-deco-' + t;
    deco.innerHTML = decoHTML(t);
    document.body.appendChild(deco);
  }

  function decoHTML(t) {
    if (t === 'christmas') {
      return `
        <!-- garland of lights along the top -->
        <div class="xmas-garland">
          ${Array.from({length: 30}).map((_,i) =>
            `<span class="xmas-light" style="--i:${i}"></span>`).join('')}
        </div>
      `;
    }
    if (t === 'halloween') {
      return `
        <div class="hallo-bats">
          ${['🦇','🦇','🦇','🦇'].map((b,i) =>
            `<span class="hallo-bat" style="--i:${i}">${b}</span>`).join('')}
        </div>
        <div class="hallo-spider"><span>🕷</span></div>
      `;
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
        </div>
      `;
    }
    return '';
  }

  // wire up santa hats on the title once the DOM is ready, regardless of when this runs
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

  function init() {
    apply();
    attachSantaHats();
    // re-attach when tabs swap content visibility
    window.addEventListener('nattabchange', () => setTimeout(attachSantaHats, 80));
    // also after a short delay so dynamically-built sections get hats
    setTimeout(attachSantaHats, 800);
    setTimeout(attachSantaHats, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
