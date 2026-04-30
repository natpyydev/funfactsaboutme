/* 🎯 DAILY CHALLENGES — resets every midnight */
(() => {
  const CHALLENGES = [
    { id: 'tap10',   label: '⭐ Tap 10 stars or hearts on services', goal: 10 },
    { id: 'msg1',    label: '💌 Send a message',                     goal: 1  },
    { id: 'gameWin', label: '🎮 Score 50+ in the mini-game',          goal: 50, type: 'max' },
    { id: 'photo1',  label: '📸 Post 1 thing on the photo wall',      goal: 1  },
    { id: 'pin1',    label: '🗺 Drop your pin on the map',            goal: 1  },
  ];
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  }
  function load() {
    const k = todayKey();
    const s = JSON.parse(localStorage.getItem('nat-challenges') || '{}');
    if (s.day !== k) return { day: k, progress: {} };
    return s;
  }
  function save(s) { localStorage.setItem('nat-challenges', JSON.stringify(s)); }
  let state = load();

  function bump(id, amount = 1) {
    state = load();
    const ch = CHALLENGES.find(c => c.id === id);
    if (!ch) return;
    const wasDone = (state.progress[id] || 0) >= ch.goal;
    state.progress[id] = ch.type === 'max'
      ? Math.max(state.progress[id] || 0, amount)
      : (state.progress[id] || 0) + amount;
    save(state);
    const nowDone = state.progress[id] >= ch.goal;
    if (!wasDone && nowDone) toast(`🎯 challenge done: ${ch.label}!`);
    render();
    // bonus toast if all done
    if (CHALLENGES.every(c => (state.progress[c.id] || 0) >= c.goal) && !state.allDone) {
      state.allDone = 1; save(state);
      toast(`🌟 ALL daily challenges done! you legend ✨`);
    }
  }
  window.bumpChallenge = bump;

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  function build() {
    if (document.getElementById('challengesSection')) return;
    const sec = document.createElement('section');
    sec.id = 'challengesSection';
    sec.className = 'challenges-section';
    sec.innerHTML = `
      <h2 class="section-title">🎯 daily challenges</h2>
      <p class="section-sub">reset at midnight · finish all 5 = certified slay 🌟</p>
      <div id="challengeList" class="challenge-list"></div>
    `;
    document.querySelector('main').appendChild(sec);
    render();
    setInterval(render, 30000);
    autoHook();
  }

  function render() {
    state = load();
    const list = document.getElementById('challengeList');
    if (!list) return;
    list.innerHTML = CHALLENGES.map(c => {
      const cur = state.progress[c.id] || 0;
      const pct = Math.min(100, Math.round((cur / c.goal) * 100));
      const done = cur >= c.goal;
      return `
        <div class="challenge-row ${done?'done':''}">
          <div class="ch-label">${c.label} ${done ? '<span class="ch-check">✅</span>' : ''}</div>
          <div class="ch-bar"><span style="width:${pct}%"></span></div>
          <div class="ch-count">${Math.min(cur, c.goal).toLocaleString()} / ${c.goal.toLocaleString()}</div>
        </div>
      `;
    }).join('');
  }

  function autoHook() {
    document.querySelectorAll('.service-row button[onclick^="rateService"], .service-row button[onclick^="heartService"]').forEach(b => {
      b.addEventListener('click', () => bump('tap10', 1));
    });
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.addEventListener('click', () => bump('msg1', 1));
    // Hook game score (wraps any prior wrap)
    const prev = window.saveGameScore;
    window.saveGameScore = function(s) {
      try { if (prev) prev(s); } catch {}
      bump('gameWin', s);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
