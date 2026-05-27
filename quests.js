/* 📜 WEEKLY CHALLENGES + QUESTS — harder than daily, reward EXP. */
(() => {
  // Weekly: rotates Monday→Sunday. Resets each new ISO week.
  const WEEKLY = [
    { id: 'w_msgs',   label: '💌 Send 25 messages',                goal: 25, exp: 200, src: 'msg' },
    { id: 'w_react',  label: '🔥 Tap 200 stars/hearts on services', goal: 200, exp: 250, src: 'tap' },
    { id: 'w_combo',  label: '⚡ Hit a x10 critical combo',         goal: 1, exp: 300, src: 'crit10' },
    { id: 'w_photo',  label: '📸 Post 3 things on the photo wall',  goal: 3, exp: 200, src: 'photo' },
    { id: 'w_game',   label: '🎮 Score 200+ in the mini-game',      goal: 200, exp: 250, src: 'game', type: 'max' },
  ];
  // Permanent quests: long-haul goals
  const QUESTS = [
    { id: 'q_msg100',   label: '💬 send 100 messages (lifetime)',     goal: 100,   exp: 500,  src: 'msg' },
    { id: 'q_combo100', label: '🌋 reach 100 lifetime combos',         goal: 100,   exp: 400,  src: 'combo' },
    { id: 'q_combo1k',  label: '🚀 reach 1,000 lifetime combos',       goal: 1000,  exp: 1500, src: 'combo' },
    { id: 'q_combo10k', label: '♾ reach 10,000 lifetime combos',       goal: 10000, exp: 5000, src: 'combo' },
    { id: 'q_photo10',  label: '📸 post 10 photos on the photo wall',  goal: 10,    exp: 800,  src: 'photo' },
    { id: 'q_pin5',     label: '🗺 drop 5 pins on the map (lifetime)',  goal: 5,     exp: 400,  src: 'pin' },
    { id: 'q_levels',   label: '⭐ reach LVL 10',                       goal: 10,    exp: 700,  src: 'lvl' },
    { id: 'q_levels50', label: '🌌 reach LVL 50',                       goal: 50,    exp: 5000, src: 'lvl' },
    { id: 'q_levels99', label: '👁 reach LVL 99 — MAXED',                goal: 99,    exp: 25000,src: 'lvl' },
  ];

  const W_KEY = 'nat-weekly';
  const Q_KEY = 'nat-quests';

  function isoWeekKey() {
    const d = new Date();
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((t - y0) / 86400000) + 1) / 7);
    return t.getUTCFullYear() + '-W' + week;
  }

  function loadW() {
  let s;
  try { s = JSON.parse(localStorage.getItem(W_KEY) || '{}') || {}; }
  catch { s = {}; }
  if (s.week !== isoWeekKey()) s = { week: isoWeekKey() };
  s.p = s.p || {};
  s.claimed = s.claimed || {};
  return s;
}
  function saveW(s) { localStorage.setItem(W_KEY, JSON.stringify(s)); }
 function loadQ() {
  let s;
  try { s = JSON.parse(localStorage.getItem(Q_KEY) || '{}') || {}; }
  catch { s = {}; }
  s.p = s.p || {};
  s.claimed = s.claimed || {};
  return s;
}
  function saveQ(s) { localStorage.setItem(Q_KEY, JSON.stringify(s)); }

  let w = loadW(), q = loadQ();

  function bumpSrc(src, amount = 1) {
    w = loadW();
    WEEKLY.filter(x => x.src === src).forEach(x => {
      w.p[x.id] = x.type === 'max'
        ? Math.max(w.p[x.id] || 0, amount)
        : (w.p[x.id] || 0) + amount;
    });
    saveW(w);

    q = loadQ();
    QUESTS.filter(x => x.src === src).forEach(x => {
      q.p[x.id] = x.type === 'max'
        ? Math.max(q.p[x.id] || 0, amount)
        : (q.p[x.id] || 0) + amount;
    });
    saveQ(q);

    render();
  }
  function setLifetimeAbsolute(src, value) {
    q = loadQ();
    QUESTS.filter(x => x.src === src).forEach(x => {
      q.p[x.id] = Math.max(q.p[x.id] || 0, value);
    });
    saveQ(q);
    render();
  }
  window.bumpQuest = bumpSrc;
  window.setLifetimeQuest = setLifetimeAbsolute;

  function build() {
    if (document.getElementById('questsSection')) return;
    const sec = document.createElement('section');
    sec.id = 'questsSection';
    sec.className = 'quests-section';
    sec.innerHTML = `
      <h2 class="section-title">📜 weekly challenges & quests</h2>
      <p class="section-sub">weekly resets Monday · quests are forever 🌌 · finish to claim EXP</p>
      <div class="qst-tabs">
        <button class="qst-tab active" data-qt="weekly">📅 Weekly</button>
        <button class="qst-tab" data-qt="quests">♾ Quests</button>
      </div>
      <div id="questsList" class="qst-list"></div>
    `;
    document.querySelector('main').appendChild(sec);
    sec.querySelectorAll('.qst-tab').forEach(b => b.onclick = () => {
      sec.querySelectorAll('.qst-tab').forEach(x => x.classList.toggle('active', x === b));
      render(b.dataset.qt);
    });
    render('weekly');
    setInterval(() => render(), 30000);
    // sync from level
    setInterval(() => {
      if (typeof window.getLevelInfo === 'function') {
        const i = window.getLevelInfo();
        setLifetimeAbsolute('lvl', i.level);
      }
    }, 5000);
  }

  let curView = 'weekly';
  function render(view) {
    if (view) curView = view;
    const list = document.getElementById('questsList'); if (!list) return;
    const items = curView === 'weekly' ? WEEKLY : QUESTS;
    const data  = curView === 'weekly' ? loadW() : loadQ();
    list.innerHTML = items.map(x => {
      const cur = data.p[x.id] || 0;
      const done = cur >= x.goal;
      const claimed = !!(data.claimed && data.claimed[x.id]);
      const pct = Math.min(100, Math.round((cur / x.goal) * 100));
      return `
        <div class="qst-row ${done ? 'done' : ''} ${claimed ? 'claimed' : ''}">
          <div class="qst-label">${x.label}</div>
          <div class="qst-bar"><span style="width:${pct}%"></span></div>
          <div class="qst-meta">
            <span>${Math.min(cur, x.goal).toLocaleString()} / ${x.goal.toLocaleString()}</span>
            <span class="qst-exp">+${x.exp} EXP</span>
            ${done && !claimed
              ? `<button class="qst-claim" data-id="${x.id}" data-exp="${x.exp}" data-src="${curView}">CLAIM 🎁</button>`
              : (claimed ? '<span class="qst-claimed">✓ claimed</span>' : '')
            }
          </div>
        </div>
      `;
    }).join('');
    list.querySelectorAll('.qst-claim').forEach(b => b.onclick = () => claim(b.dataset.id, parseInt(b.dataset.exp, 10), b.dataset.src));
  }
  function claim(id, exp, src) {
    const isW = src === 'weekly';
    const data = isW ? loadW() : loadQ();
    if (!data.claimed) data.claimed = {};
    if (data.claimed[id]) return;
    data.claimed[id] = Date.now();
    if (isW) saveW(data); else saveQ(data);
    if (typeof window.addExp === 'function') window.addExp(exp, 'quest reward');
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
