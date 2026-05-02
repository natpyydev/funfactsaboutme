/* 🗂 TAB SYSTEM — every section gets its own bite-sized tab */
(() => {
  const TABS = [
    { id: 'profile',     label: '👤 Profile',     selectors: ['#profileSection'] },
    { id: 'photos',      label: '📷 Photos',      selectors: ['.gallery-section'] },
    { id: 'facts',       label: '🌷 Fun Facts',   selectors: ['.facts-section'] },
    { id: 'hobbies',     label: '🎨 Hobbies',     selectors: ['.hobbies-section'] },
    { id: 'services',    label: '⭐ Services',    selectors: ['.services-section','.premium-section'] },
    { id: 'wall',        label: '📸 Photo Wall',  selectors: ['#photoWallSection'] },
    { id: 'map',         label: '🗺 Map',         selectors: ['#worldMapSection'] },
    { id: 'messages',    label: '💌 Messages',    selectors: ['.message-section'] },
    { id: 'guestbook',   label: '📖 Sticky Wall', selectors: ['#guestbookSection'] },
    { id: 'leaderboard', label: '🏆 Leaderboard', selectors: ['.leaderboard-section'] },
    { id: 'play',        label: '🎮 Play',        selectors: ['#quizSection','#challengesSection','#questsSection'] },
    { id: 'rate',        label: '💅 Rate Po',     selectors: ['.react-section'] },
    { id: 'credits',     label: '🎬 Credits',     selectors: ['#creditsSection'] },
  ];
  let active = localStorage.getItem('nat-tab') || 'photos';
  if (!TABS.some(t => t.id === active)) active = 'photos';

  function tag() {
    TABS.forEach(t => t.selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.dataset.tab = t.id);
    }));
  }
  function switchTo(id) {
    active = id;
    localStorage.setItem('nat-tab', id);
    document.querySelectorAll('.nat-tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('main [data-tab]').forEach(s => {
      s.style.display = s.dataset.tab === id ? '' : 'none';
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('nattabchange', { detail: { tab: id } }));
  }
  window.natSwitchTab = switchTo;

  function build() {
    const main = document.querySelector('main');
    if (!main || document.getElementById('natTabsNav')) return false;
    tag();
    const nav = document.createElement('nav');
    nav.id = 'natTabsNav';
    nav.className = 'nat-tabs-nav';
    nav.innerHTML = TABS.map(t =>
      `<button class="nat-tab-btn ${t.id===active?'active':''}" data-tab="${t.id}">${t.label}</button>`
    ).join('');
    main.parentNode.insertBefore(nav, main);
    nav.addEventListener('click', e => {
      const b = e.target.closest('.nat-tab-btn');
      if (b) switchTo(b.dataset.tab);
    });
    switchTo(active);
    return true;
  }

  function init() {
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      const ready = document.getElementById('creditsSection') && document.getElementById('photoWallSection')
                 && document.getElementById('worldMapSection')
                 && document.getElementById('quizSection')
                 && document.getElementById('challengesSection')
                 && document.getElementById('guestbookSection')
                 && document.getElementById('profileSection')
                 && document.getElementById('questsSection');
      if (ready || tries > 60) {
        build();
        clearInterval(id);
      }
    }, 80);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
