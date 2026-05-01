/* 🥚 EASTER EGG HUNT — 5 hidden eggs, dev role auto-unlocks all */
(() => {
  const EGGS = [
    { id: 'logo',  label: 'Found in the logo! 🥚',     selector: 'h1 span',         taps: 3 },
    { id: 'chibi', label: 'Chibi has secrets! 🥚',     selector: '#chibiWrap',      taps: 5 },
    { id: 'foot',  label: 'Footer egg unlocked! 🥚',   selector: 'footer',          taps: 3 },
    { id: 'bday',  label: 'Birthday banner egg! 🥚',   selector: '#bdayBanner',     taps: 3 },
    { id: 'fact',  label: 'Hidden in the facts! 🥚',   selector: '.fact-number',    taps: 4 },
  ];
  function get() { return JSON.parse(localStorage.getItem('nat-eggs') || '[]'); }
  function set(a) { localStorage.setItem('nat-eggs', JSON.stringify(a)); }

  function find(id) {
    const found = get();
    if (found.includes(id)) return;
    found.push(id);
    set(found);
    showFound(EGGS.find(e => e.id === id));
    render();
  }

  function showFound(e) {
    const t = document.createElement('div');
    t.className = 'egg-popup';
    t.innerHTML = `<div class="egg-emoji">🥚✨</div><div>${e.label}</div><div class="egg-count">${get().length}/${EGGS.length} found</div>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 2600);
  }

  function attach() {
    EGGS.forEach(e => {
      document.querySelectorAll(e.selector).forEach(el => {
        if (el.dataset.eggAttached) return;
        el.dataset.eggAttached = '1';
        let n = 0, timer = null;
        el.addEventListener('click', () => {
          n++;
          clearTimeout(timer);
          if (n >= e.taps) { find(e.id); n = 0; }
          else timer = setTimeout(() => n = 0, 1500);
        });
      });
    });
  }

  function render() {
    let pill = document.getElementById('eggPill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'eggPill';
      pill.className = 'egg-pill';
      pill.title = 'Easter egg hunt — tap secret spots around the site!';
      document.body.appendChild(pill);
    }
    const found = get().length;
    pill.innerHTML = `🥚 ${found}/${EGGS.length}`;
    pill.classList.toggle('all-found', found === EGGS.length);
  }

  function devAutoUnlock() {
    if (document.body.classList.contains('role-dev') && get().length < EGGS.length) {
      set(EGGS.map(e => e.id));
      render();
      const t = document.createElement('div');
      t.className = 'egg-popup';
      t.innerHTML = `<div class="egg-emoji">🛠✨</div><div>dev role: all eggs auto-found</div><div class="egg-count">${EGGS.length}/${EGGS.length} unlocked</div>`;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 2600);
    }
  }

  function init() {
    attach();
    render();
    devAutoUnlock();
    setInterval(devAutoUnlock, 2500);
    window.addEventListener('nattabchange', () => setTimeout(attach, 150));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
