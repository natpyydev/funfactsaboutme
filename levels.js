/* ⭐ LEVEL & EXP SYSTEM (1 → 99, harder per level)
   Public API on window:
     window.addExp(amount, reason)
     window.getLevelInfo() -> { level, exp, next, pct }
     window.equipPlate(plateId)  // if unlocked
     window.getUnlockedPlates() -> [plateId,...]
   Plates ONLY unlock through level-ups (every 10 levels).
*/
(() => {
  const LS = 'nat-level-state';
  const MAX_LEVEL = 99;

  // EXP needed to GO FROM level L to L+1.  Curve: 100 * L^1.65
  function expForLevel(L) {
    if (L >= MAX_LEVEL) return Infinity;
    return Math.round(100 * Math.pow(L, 1.65));
  }
  // total exp needed to REACH level L from 1
  function totalExpToReach(L) {
    let t = 0;
    for (let i = 1; i < L; i++) t += expForLevel(i);
    return t;
  }

  const PLATES = [
    { id: 'paper',     unlock: 1,  name: 'Paper',         class: 'plate-paper' },
    { id: 'pastel',    unlock: 10, name: 'Pastel Cloud',  class: 'plate-pastel' },
    { id: 'sunset',    unlock: 20, name: 'Sunset',        class: 'plate-sunset' },
    { id: 'aqua',      unlock: 30, name: 'Aqua Wave',     class: 'plate-aqua' },
    { id: 'cherry',    unlock: 40, name: 'Cherry Bloom',  class: 'plate-cherry' },
    { id: 'galaxy',    unlock: 50, name: 'Galaxy',        class: 'plate-galaxy' },
    { id: 'gold',      unlock: 60, name: 'Pure Gold',     class: 'plate-gold' },
    { id: 'inferno',   unlock: 70, name: 'Inferno',       class: 'plate-inferno' },
    { id: 'aurora',    unlock: 80, name: 'Aurora',        class: 'plate-aurora' },
    { id: 'celestial', unlock: 90, name: 'Celestial',     class: 'plate-celestial' },
    { id: 'mythic',    unlock: 99, name: 'MYTHIC ✦',      class: 'plate-mythic' },
  ];

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || '{}');
      return { level: s.level || 1, exp: s.exp || 0, plate: s.plate || 'paper', unlocked: s.unlocked || ['paper'] };
    } catch { return { level: 1, exp: 0, plate: 'paper', unlocked: ['paper'] }; }
  }
  function save(s) {
    try { localStorage.setItem(LS, JSON.stringify(s)); } catch {}
    syncToFirebase(s);
  }
  let state = load();

  function syncToFirebase(s) {
    const db = window._natDB; if (!db) return;
    const uid = db.getUID(); if (!uid) return;
    db.set(db.ref(db.db, 'userLevels/' + uid), {
      level: s.level, exp: s.exp, plate: s.plate, ts: Date.now(),
    }).catch(()=>{});
  }

  function info() {
    const need = expForLevel(state.level);
    return {
      level: state.level,
      exp: state.exp,
      need,
      next: need - state.exp,
      pct: state.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((state.exp / need) * 100)),
      plate: state.plate,
      unlocked: state.unlocked,
    };
  }

  function plateInfo(id) { return PLATES.find(p => p.id === id) || PLATES[0]; }
  function getPlates() { return PLATES; }

  function addExp(amount, reason = '') {
    if (!amount || amount < 0) return;
    state.exp += amount;
    let leveled = false;
    while (state.level < MAX_LEVEL && state.exp >= expForLevel(state.level)) {
      state.exp -= expForLevel(state.level);
      state.level += 1;
      leveled = true;
      // unlock plate(s) gated by this level
      PLATES.forEach(p => {
        if (state.level >= p.unlock && !state.unlocked.includes(p.id)) {
          state.unlocked.push(p.id);
        }
      });
      showLevelUpToast(state.level, reason);
    }
    save(state);
    paintBar();
    return leveled;
  }

  function equipPlate(id) {
    if (!state.unlocked.includes(id)) return false;
    state.plate = id;
    save(state);
    window.dispatchEvent(new CustomEvent('plate-changed', { detail: { plate: id } }));
    return true;
  }

  function showLevelUpToast(lvl, reason) {
    const t = document.createElement('div');
    t.className = 'level-up-toast';
    const newPlate = PLATES.find(p => p.unlock === lvl);
    t.innerHTML = `
      <div class="lu-glow"></div>
      <div class="lu-body">
        <div class="lu-cap">LEVEL UP</div>
        <div class="lu-num">LVL ${lvl}</div>
        ${newPlate ? `<div class="lu-plate">unlocked plate: <b>${newPlate.name}</b></div>` : ''}
        ${reason ? `<div class="lu-reason">+exp from ${reason}</div>` : ''}
      </div>
    `;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 30);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 4200);
    if (window.SFX?.upvote) try { window.SFX.upvote(); } catch {}
  }

  function paintBar() {
    const bar = document.getElementById('lvlBarFill');
    const num = document.getElementById('lvlNum');
    const txt = document.getElementById('lvlTxt');
    if (!bar) return;
    const i = info();
    bar.style.width = i.pct + '%';
    if (num) num.textContent = 'LVL ' + i.level;
    if (txt) txt.textContent = i.level >= MAX_LEVEL
      ? 'MAX 🌌'
      : `${i.exp.toLocaleString()} / ${i.need.toLocaleString()} EXP`;
  }

  function buildBar() {
    if (document.getElementById('lvlBar')) return;
    const main = document.querySelector('main');
    const bar = document.createElement('div');
    bar.id = 'lvlBar';
    bar.className = 'lvl-bar-wrap';
    bar.innerHTML = `
      <div class="lvl-row">
        <span id="lvlNum" class="lvl-num">LVL 1</span>
        <div class="lvl-track"><span id="lvlBarFill" class="lvl-fill"></span></div>
        <span id="lvlTxt" class="lvl-txt">0 / 100 EXP</span>
      </div>
    `;
    main?.parentNode?.insertBefore(bar, main);
    paintBar();
  }

  // public
  window.addExp = addExp;
  window.getLevelInfo = info;
  window.equipPlate = equipPlate;
  window.getUnlockedPlates = () => state.unlocked.slice();
  window.getAllPlates = getPlates;
  window.getPlateInfo = plateInfo;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildBar);
  else buildBar();
})();
