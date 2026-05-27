/* ═══════════════════════════════════════════════════════════════════
   tabs.js — Tab System
   Owns the full tab list including Archive and Games.
   archive.js and highway-racer.js are called from here at build time.
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  const TABS = [
    { id: 'profile',     label: '👤 Profile',      selectors: ['#profileSection'] },
    { id: 'facts',       label: '🌷 Fun Facts',    selectors: ['.facts-section'] },
    { id: 'hobbies',     label: '🎨 Hobbies',      selectors: ['.hobbies-section'] },
    { id: 'credentials', label: '📜 Credentials',  selectors: ['#credentialsSection','#tutoringSection','#modulesSection'] },
    { id: 'photos',      label: '📷 Gallery',      selectors: ['.gallery-section','.premium-section'] },
    { id: 'wall',        label: '📸 Photo Wall',   selectors: ['#photoWallSection'] },
    { id: 'map',         label: '🗺 Map',          selectors: ['#worldMapSection'] },
    { id: 'messages',    label: '💌 Messages',     selectors: ['.message-section'] },
    { id: 'guestbook',   label: '📖 Sticky Wall',  selectors: ['#guestbookSection'] },
    { id: 'leaderboard', label: '🏆 Leaderboard',  selectors: ['.leaderboard-section'] },
    { id: 'play',        label: '🗺 Quests',        selectors: ['#challengesSection','#questsSection'] },
    { id: 'games',       label: '🎮 Games',         selectors: ['#gamesTabSection'] },
    { id: 'quiz',        label: '🎯 Quiz',          selectors: ['#quizSection'] },
    { id: 'archive',     label: '🗃 Archive',      selectors: ['#archiveSection'] },
    { id: 'rate',        label: '💅 Rate Po',      selectors: ['.react-section'] },
    { id: 'services',    label: '🚗 Services',     selectors: ['.services-section'] },
    { id: 'chibi',       label: '🐱 Chibi',        selectors: ['#chibiTabSection'] },
    { id: 'channel',     label: '📣 Channel',      selectors: ['#channelSection'] },
    { id: 'socials',     label: '🔗 Socials',      selectors: ['#socialsSection'] },
    { id: 'credits',     label: '🎬 Credits',      selectors: ['#creditsSection'] },
  ];

  let active = localStorage.getItem('nat-tab') || 'profile';
  if (!TABS.some(t => t.id === active)) active = 'profile';

  /* ── tag: assign data-tab to all sections ─────────────────────── */
  function tag() {
    TABS.forEach(t => t.selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.dataset.tab = t.id);
    }));
  }

  /* ── switchTo: show the active tab, hide everything else ─────── */
  function switchTo(id) {
    if (!TABS.some(t => t.id === id)) id = 'profile';
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

  /* ── buildSocialsSection ──────────────────────────────────────── */
  function buildSocialsSection() {
    if (document.getElementById('socialsSection')) return;
    const sec = document.createElement('section');
    sec.id = 'socialsSection';
    sec.className = 'socials-tab-section';
    sec.innerHTML = `
      <h2 class="section-title">🔗 find me online</h2>
      <p class="section-sub">say hi anytime 👋</p>
      <div class="socials-grid">
        <a class="social-card social-fb" href="https://www.facebook.com/nathan2wild" target="_blank">
          <div class="social-icon">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </div>
          <div class="social-info"><div class="social-name">Facebook</div><div class="social-handle">@nathan2wild</div></div>
          <div class="social-arrow">→</div>
        </a>
        <a class="social-card social-ig" href="https://www.instagram.com/nhyieuw" target="_blank">
          <div class="social-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </div>
          <div class="social-info"><div class="social-name">Instagram</div><div class="social-handle">@nhyieuw</div></div>
          <div class="social-arrow">→</div>
        </a>
        <a class="social-card social-gh" href="https://github.com/natpyydev" target="_blank">
          <div class="social-icon">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          </div>
          <div class="social-info"><div class="social-name">GitHub</div><div class="social-handle">@natpyydev</div></div>
          <div class="social-arrow">→</div>
        </a>
      </div>
    `;
    document.querySelector('main').appendChild(sec);
  }

  /* ── buildGamesSection ────────────────────────────────────────── */
  function buildGamesSection() {
    if (document.getElementById('gamesTabSection')) return;
    const sec = document.createElement('section');
    sec.id = 'gamesTabSection';
    sec.className = 'games-tab-section';
    sec.innerHTML = `
      <h2 class="section-title">🎮 games</h2>
      <p class="section-sub">play some mini-games! more coming soon 👾</p>
      <div class="games-grid">
        <div class="game-card">
          <div class="game-card-emoji">❤️</div>
          <div class="game-card-name">NatNat: Catch the Hearts</div>
          <div class="game-card-desc">dodge the skulls, catch the stars and hearts!</div>
          <button class="game-card-btn" onclick="openNatGame()">▶ play</button>
        </div>
        <div class="game-card game-card-role">
          <div class="game-card-emoji">🔐</div>
          <div class="game-card-name">Role Login</div>
          <div class="game-card-desc">enter your role passcode for special access</div>
          <button class="game-card-btn" onclick="openRoleLogin()">🔐 login</button>
        </div>
        <div class="game-card game-card-highway" id="highwayRacerCard">
          <div class="game-card-emoji">🏎</div>
          <div class="game-card-name">NAT Highway Racer</div>
          <div class="game-card-desc">endless neon highway · collect coins &amp; gems · beat the leaderboard!</div>
          <button class="game-card-btn" onclick="window.openHighwayRacer && window.openHighwayRacer()">▶ play</button>
        </div>
      </div>
    `;
    document.querySelector('main').appendChild(sec);
  }

  /* ── buildArchiveSection ──────────────────────────────────────── */
  function buildArchiveSection() {
    if (document.getElementById('archiveSection')) return;
    // archive.js will build the full section. We just need a placeholder
    // so tag() can assign data-tab to it before archive.js runs.
    // archive.js checks for #archiveSection existence before building.
    const sec = document.createElement('section');
    sec.id = 'archiveSection';
    sec.dataset.tab = 'archive';
    sec.style.display = 'none';
    document.querySelector('main').appendChild(sec);
  }

  /* ── build: assemble nav + all sections ─────────────────────── */
  function build() {
    const main = document.querySelector('main');
    if (!main || document.getElementById('natTabsNav')) return false;

    buildSocialsSection();
    buildGamesSection();
    buildArchiveSection(); // placeholder — archive.js fills this in
    tag();

    const nav = document.createElement('nav');
    nav.id = 'natTabsNav';
    nav.className = 'nat-tabs-nav';
    nav.innerHTML = TABS.map(t =>
      `<button class="nat-tab-btn ${t.id === active ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`
    ).join('');

    const anchor = document.getElementById('tabsTopAnchor');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(nav, anchor.nextSibling);
    } else {
      main.parentNode.insertBefore(nav, main);
    }

    nav.addEventListener('click', e => {
      const b = e.target.closest('.nat-tab-btn');
      if (b) switchTo(b.dataset.tab);
    });

    switchTo(active);
    return true;
  }

  /* ── init: wait for all required sections to exist ──────────── */
  function init() {
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      const ready = document.getElementById('quizSection')
                 && document.getElementById('creditsSection')
                 && document.getElementById('photoWallSection')
                 && document.getElementById('worldMapSection')
                 && document.getElementById('quizSection')
                 && document.getElementById('challengesSection')
                 && document.getElementById('guestbookSection')
                 && document.getElementById('profileSection')
                 && document.getElementById('questsSection');
      if (ready || tries > 60) {
        clearInterval(id);
        build();
      }
    }, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
