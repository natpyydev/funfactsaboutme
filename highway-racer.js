/**
 * highway-racer.js — NAT Highway Racer
 *
 * Endless neon 4-lane highway racer. Self-contained IIFE.
 * The game card is already in tabs.js buildGamesSection().
 * This file just provides window.openHighwayRacer().
 *
 * Firebase: uses window._natDB (exposed by app2.js).
 * Storage:  uses window._natFirebase.app via firebase-extensions.js.
 * Load order: after tabs.js and app2.js.
 */
(() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════
  const DB_PATH        = 'racingGame';
  const LANES          = 4;
  const LANE_W         = 88;
  const CANVAS_W       = LANES * LANE_W;  // 352
  const CAR_W          = 50;
  const CAR_H          = 88;
  const TRAFFIC_W      = 50;
  const TRAFFIC_H      = 84;
  const COIN_R         = 12;
  const GEM_R          = 11;
  const POWERUP_R      = 18;
  const SPEED_BASE     = 280;
  const SPEED_RAMP     = 4;
  const SPEED_MAX      = 780;

  const OWNER_UID  = 'zNDEej9J3kg79fUYxJjxLqrXJpz2';
  const VIP_UIDS   = ['zNDEej9J3kg79fUYxJjxLqrXJpz2', 'FfSIOOqNV6NTqb4eKV8RbAARDm33', '8IumnftXW1gJCa4iNbicZ0M0LOg2'];
  const VIP_EMAILS = ['nieytan.smth@gmail.com'];

  // ═══════════════════════════════════════════════════════════════════
  // CAR DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════
  const CARS = [
    {
      id: 'cruiser', name: 'City Cruiser', desc: 'Reliable starter. Gets the job done.',
      cost: 0, unlock: 'free',
      body: '#4fc3f7', accent: '#0288d1', glow: 'rgba(79,195,247,0.6)',
      stats: { speed: 3, handling: 5, boost: 3, armor: 3, coins: 1 },
    },
    {
      id: 'phantom', name: 'Phantom GT', desc: 'Sleek and fast. Smooth cornering.',
      cost: 1200, unlock: 'buy',
      body: '#b39ddb', accent: '#7b1fa2', glow: 'rgba(179,157,219,0.65)',
      stats: { speed: 5, handling: 7, boost: 4, armor: 3, coins: 2 },
    },
    {
      id: 'inferno', name: 'Inferno X', desc: 'Born to burn. High speed, lower control.',
      cost: 3500, unlock: 'buy',
      body: '#ef5350', accent: '#b71c1c', glow: 'rgba(239,83,80,0.75)',
      stats: { speed: 8, handling: 4, boost: 7, armor: 4, coins: 2 },
    },
    {
      id: 'stealth', name: 'Stealth Shadow', desc: 'Dark. Silent. High armor absorbs hits.',
      cost: 7000, unlock: 'buy',
      body: '#37474f', accent: '#00e5ff', glow: 'rgba(0,229,255,0.7)',
      stats: { speed: 6, handling: 6, boost: 5, armor: 9, coins: 3 },
    },
    {
      id: 'nova', name: 'NOVA-9 ∞', desc: 'The endgame. Insanely overpowered. Max everything.',
      cost: 50000, unlock: 'buy', legendary: true,
      body: '#ffd740', accent: '#ff6d00', glow: 'rgba(255,215,64,0.95)',
      stats: { speed: 10, handling: 9, boost: 10, armor: 10, coins: 5 },
    },
    {
      id: 'vip', name: '💎 VIP Exclusive', desc: 'Unlocked for VIP members. Broken on purpose.',
      cost: 0, unlock: 'vip',
      body: '#e040fb', accent: '#ea80fc', glow: 'rgba(224,64,251,0.88)',
      stats: { speed: 9, handling: 9, boost: 9, armor: 9, coins: 4 },
    },
    {
      id: 'dev', name: '🛠 DEV//UNIT', desc: 'No damage. No limits. Hidden unlock.',
      cost: 0, unlock: 'dev', hidden: true, invincible: true, infiniteBoost: true,
      body: '#00e676', accent: '#1b5e20', glow: 'rgba(0,230,118,0.92)',
      stats: { speed: 10, handling: 10, boost: 10, armor: 10, coins: 10 },
    },
  ];

  const POWERUP_DEFS = [
    { id: 'magnet',    label: '🧲', color: '#ffd740', dur: 8000  },
    { id: 'invincible',label: '⚡', color: '#00e5ff', dur: 60000 },
    { id: 'rocket',    label: '🚀', color: '#ff6d00', dur: 5000  },
    { id: 'slow',      label: '🐢', color: '#69f0ae', dur: 7000  },
    { id: 'shield',    label: '🛡', color: '#40c4ff', dur: 10000 },
    { id: 'x2coins',   label: '×2', color: '#ffd740', dur: 12000 },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  let canvas, ctx, raf;
  let W, H;
  let gs = null;
  let saveData    = {};
  let ghostData   = [];
  let lbUnsub     = null;
  let activeCarId = 'cruiser';

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════
  const laneX  = lane => (CANVAS_W - LANES * LANE_W) / 2 + lane * LANE_W + LANE_W / 2;
  const uid    = ()   => window.currentUID || null;
  const db     = ()   => window._natDB || null;
  const carDef = id   => CARS.find(c => c.id === id) || CARS[0];
  const statV  = (base, upg, key) => Math.min(10, base + ((upg && upg[key]) || 0) * 0.5);

  function isVip() {
    const u = uid(); if (!u) return false;
    if (VIP_UIDS.includes(u)) return true;
    const email = window._natFirebase?.auth?.currentUser?.email || '';
    return VIP_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
  }
  function isDev()          { return uid() === OWNER_UID; }
  function isUnlocked(car)  {
    if (car.unlock === 'free') return true;
    if (car.unlock === 'dev')  return isDev();
    if (car.unlock === 'vip')  return isVip() || isDev();
    return !!(saveData.ownedCars?.[car.id]);
  }
  function isActive(id) { return gs?.effects?.[id] && gs.effects[id] > Date.now(); }

  // ═══════════════════════════════════════════════════════════════════
  // FIREBASE SAVE / LEADERBOARD
  // ═══════════════════════════════════════════════════════════════════
  function loadSave(cb) {
    const d = db(), u = uid();
    if (!d || !u) { cb({}); return; }
    d.get(d.ref(d.db, `${DB_PATH}/players/${u}`))
      .then(s => { saveData = s.val() || {}; cb(saveData); })
      .catch(() => { saveData = {}; cb({}); });
  }

  function persist(patch) {
    Object.assign(saveData, patch);
    const d = db(), u = uid(); if (!d || !u) return;
    Object.entries(patch).forEach(([k, v]) =>
      d.set(d.ref(d.db, `${DB_PATH}/players/${u}/${k}`), v).catch(() => {})
    );
  }

  function saveScore(score, dist) {
    const d = db(), u = uid(); if (!d || !u) return;
    if (score > (saveData.bestScore || 0)) {
      saveData.bestScore = score;
      d.runTransaction(d.ref(d.db, `${DB_PATH}/lb/${u}/score`), v => Math.max(v || 0, score)).catch(() => {});
      d.set(d.ref(d.db, `${DB_PATH}/lb/${u}/uid`), u).catch(() => {});
    }
    if (dist > (saveData.bestDist || 0)) {
      saveData.bestDist = dist;
      d.runTransaction(d.ref(d.db, `${DB_PATH}/lb/${u}/dist`), v => Math.max(v || 0, dist)).catch(() => {});
    }
    const day = new Date().toISOString().slice(0, 10);
    d.runTransaction(d.ref(d.db, `${DB_PATH}/daily/${day}/${u}`), v => Math.max(v || 0, score)).catch(() => {});
  }

  function pushGhost() {
    const d = db(), u = uid(); if (!d || !u || !gs) return;
    d.set(d.ref(d.db, `${DB_PATH}/ghosts/${u}`), {
      uid: u, lane: gs.player.lane, car: activeCarId,
      score: gs.score, dist: Math.round(gs.dist), ts: Date.now(),
    }).catch(() => {});
  }

  function subGhosts() {
    const d = db(); if (!d) return;
    lbUnsub = d.onValue(d.ref(d.db, `${DB_PATH}/ghosts`), snap => {
      const val = snap.val() || {};
      ghostData = Object.values(val).filter(g => g.uid !== uid() && Date.now() - g.ts < 15000);
    });
  }
  function unsubGhosts() { if (lbUnsub) { try { lbUnsub(); } catch {} lbUnsub = null; } }

  // ═══════════════════════════════════════════════════════════════════
  // CSS (injected once)
  // ═══════════════════════════════════════════════════════════════════
  function injectCSS() {
    if (document.getElementById('hrStyles')) return;
    const s = document.createElement('style');
    s.id = 'hrStyles';
    s.textContent = `
.hr-overlay{position:fixed;inset:0;z-index:10500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);padding:12px;box-sizing:border-box}
.hr-overlay.hr-hidden{display:none}
.hr-panel{background:#080b14;border:1px solid rgba(255,255,255,0.1);border-radius:18px;width:100%;max-width:400px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;position:relative;box-shadow:0 24px 80px rgba(0,0,0,0.85)}
.hr-panel.hr-hidden{display:none!important}
.hr-topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.07);position:sticky;top:0;background:#080b14;z-index:2}
.hr-logo{font-size:15px;font-weight:800;color:#00e5ff;letter-spacing:.04em}
.hr-xbtn{background:none;border:1px solid rgba(255,255,255,0.15);color:#aaa;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center}
.hr-xbtn:hover{color:#fff;border-color:#fff}
.hr-wallet{display:flex;gap:16px;padding:8px 16px;font-size:14px;font-weight:700;color:#ffd740}
.hr-car-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px 12px}
.hr-car{border:1.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 8px;cursor:pointer;text-align:center;transition:all .2s;position:relative;background:rgba(255,255,255,0.03)}
.hr-car:hover,.hr-car.sel{border-color:var(--cg);box-shadow:0 0 16px var(--cg);background:rgba(255,255,255,0.07)}
.hr-car.locked{opacity:.55}
.hr-car.legendary{border-color:#ffd740;background:linear-gradient(135deg,rgba(255,215,64,.07),rgba(255,109,0,.05))}
.hr-leg-badge{position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:800;letter-spacing:.1em;background:#ffd740;color:#000;border-radius:4px;padding:1px 5px}
.hr-car-art{width:50px;height:70px;margin:0 auto 6px;border-radius:8px;background:var(--cb);box-shadow:0 0 16px var(--cg)}
.hr-car-name{font-size:11px;font-weight:700;color:#e8e8f0;margin-bottom:2px}
.hr-car-desc{font-size:9px;color:rgba(232,232,240,0.5);margin-bottom:5px;line-height:1.3}
.hr-car-cost{font-size:10px;font-weight:700;color:#ffd740;margin-top:4px}
.hr-stat-row{display:flex;align-items:center;gap:4px;margin-bottom:2px;font-size:9px;color:#aaa}
.hr-stat-row span{width:42px;text-align:right;flex-shrink:0}
.hr-stat-track{flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden}
.hr-stat-fill{height:100%;background:linear-gradient(90deg,#00e5ff,#69f0ae);border-radius:2px}
.hr-upg-panel{margin:0 12px 10px;padding:10px 12px;border:1px solid rgba(255,215,64,0.2);border-radius:10px;background:rgba(255,215,64,0.04)}
.hr-upg-title{font-size:12px;font-weight:700;color:#ffd740;margin-bottom:8px}
.hr-upg-row{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.hr-upg-key{width:60px;font-size:11px;color:#ccc;text-transform:capitalize}
.hr-upg-lvl{width:32px;font-size:10px;color:#aaa}
.hr-btn{padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#e8e8f0;transition:all .2s}
.hr-btn:hover:not(:disabled){background:rgba(255,255,255,0.12)}
.hr-btn-play{background:rgba(0,229,255,0.18);border-color:#00e5ff;color:#00e5ff}
.hr-btn-play:hover:not(:disabled){background:rgba(0,229,255,0.3)}
.hr-btn-lb{background:rgba(255,215,64,0.12);border-color:#ffd740;color:#ffd740}
.hr-btn-lb:hover{background:rgba(255,215,64,0.24)}
.hr-btn-gem{background:rgba(105,240,174,0.12);border-color:#69f0ae;color:#69f0ae;font-size:11px;padding:5px 10px}
.hr-btn-gem.maxed{opacity:.4;cursor:default}
.hr-btn-danger{border-color:#f44336;color:#f44336;background:rgba(244,67,54,0.1)}
.hr-garage-footer{display:flex;gap:10px;padding:10px 16px 14px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,0.06);position:sticky;bottom:0;background:#080b14}
.hr-lb-tabs{display:flex;gap:6px;padding:10px 12px 0}
.hr-lb-tab{padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:none;color:#aaa}
.hr-lb-tab.active{background:rgba(0,229,255,0.15);border-color:#00e5ff;color:#00e5ff}
.hr-lb-list{padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-height:80px}
.hr-lb-msg{color:#aaa;font-size:12px;text-align:center;padding:20px}
.hr-lb-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:7px;background:rgba(255,255,255,0.03)}
.hr-lb-me{background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.2)}
.hr-lb-rank{width:28px;font-size:13px}
.hr-lb-uid{flex:1;font-size:11px;color:#ccc;font-family:monospace}
.hr-lb-val{font-size:12px;font-weight:700;color:#ffd740}
#hrGamePanel{position:relative;padding:0;overflow:hidden;background:#000}
#hrCanvas{display:block;width:100%;height:auto}
.hr-hud{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-start;padding:10px 14px;pointer-events:none}
.hr-hud-score{font-size:20px;font-weight:800;color:#00e5ff;text-shadow:0 0 10px #00e5ff}
.hr-hud-dist{font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px}
.hr-pu-hud{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:140px}
.hr-pu-chip{font-size:11px;font-weight:700;background:rgba(0,0,0,0.5);border-radius:5px;padding:2px 6px}
.hr-pause-btn{position:absolute;right:10px;top:10px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:8px;width:34px;height:34px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.hr-mctrl{position:absolute;bottom:6px;left:0;right:0;display:flex;justify-content:space-between;padding:0 8px}
.hr-mc{width:70px;height:54px;border-radius:12px;background:rgba(0,229,255,0.12);border:1.5px solid rgba(0,229,255,0.35);color:#00e5ff;font-size:22px;font-weight:700;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none}
.hr-mc:active{background:rgba(0,229,255,0.28)}
.hr-overlay-panel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px)}
.hr-overlay-panel.hr-hidden{display:none}
.hr-ob{display:flex;flex-direction:column;gap:10px;align-items:center;background:#080b14;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px 28px}
.hr-ob-title{font-size:22px;font-weight:800;letter-spacing:.05em}
.hr-ob-title.cyan{color:#00e5ff;text-shadow:0 0 16px #00e5ff}
.hr-ob-title.red{color:#f44336;text-shadow:0 0 16px #f44336}
.hr-death-stats{font-size:12px;color:#ccc;display:flex;flex-direction:column;gap:3px;text-align:center}
.hr-death-stats strong{color:#ffd740}
`;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════════
  // OVERLAY HTML
  // ═══════════════════════════════════════════════════════════════════
  function buildHTML() {
    return `
<div id="hrOverlay" class="hr-overlay hr-hidden">
  <!-- GARAGE -->
  <div id="hrGarage" class="hr-panel">
    <div class="hr-topbar">
      <span class="hr-logo">🏎 NAT HIGHWAY</span>
      <button class="hr-xbtn" onclick="window.closeHighwayRacer()">✕</button>
    </div>
    <div class="hr-wallet">
      <span>🪙 <span id="hrCoins">0</span></span>
      <span>💎 <span id="hrGems">0</span></span>
    </div>
    <div id="hrCarGrid" class="hr-car-grid"></div>
    <div id="hrUpgPanel" class="hr-upg-panel" style="display:none"></div>
    <div class="hr-garage-footer">
      <button class="hr-btn hr-btn-lb" onclick="hrShowLb()">🏆 Leaderboard</button>
      <button class="hr-btn hr-btn-play" onclick="hrStartRace()">🚦 Race!</button>
    </div>
  </div>

  <!-- LEADERBOARD -->
  <div id="hrLb" class="hr-panel hr-hidden">
    <div class="hr-topbar">
      <span class="hr-logo">🏆 Leaderboard</span>
      <button class="hr-xbtn" onclick="document.getElementById('hrLb').classList.add('hr-hidden');document.getElementById('hrGarage').classList.remove('hr-hidden')">✕</button>
    </div>
    <div class="hr-lb-tabs">
      <button class="hr-lb-tab active" onclick="hrLbTab(this,'score')">Score</button>
      <button class="hr-lb-tab"        onclick="hrLbTab(this,'dist')">Distance</button>
      <button class="hr-lb-tab"        onclick="hrLbTab(this,'daily')">Daily</button>
    </div>
    <div id="hrLbList" class="hr-lb-list"></div>
  </div>

  <!-- GAME -->
  <div id="hrGamePanel" class="hr-panel hr-hidden" style="padding:0;overflow:hidden">
    <canvas id="hrCanvas"></canvas>
    <div class="hr-hud">
      <div>
        <div class="hr-hud-score" id="hrHudScore">0</div>
        <div class="hr-hud-dist" id="hrHudDist">0m</div>
      </div>
      <div class="hr-pu-hud" id="hrPuHud"></div>
    </div>
    <button class="hr-pause-btn" onclick="hrTogglePause()">⏸</button>
    <div class="hr-mctrl">
      <button class="hr-mc" id="hrBtnL" ontouchstart="hrDir(-1)" ontouchend="hrDir(0)" onmousedown="hrDir(-1)" onmouseup="hrDir(0)">◀</button>
      <button class="hr-mc" id="hrBtnR" ontouchstart="hrDir(1)"  ontouchend="hrDir(0)" onmousedown="hrDir(1)"  onmouseup="hrDir(0)">▶</button>
    </div>
    <div id="hrPauseOv" class="hr-overlay-panel hr-hidden">
      <div class="hr-ob">
        <div class="hr-ob-title cyan">PAUSED</div>
        <button class="hr-btn hr-btn-play" onclick="hrTogglePause()">▶ Resume</button>
        <button class="hr-btn hr-btn-danger" onclick="hrQuit()">🚪 Quit</button>
      </div>
    </div>
    <div id="hrDeathOv" class="hr-overlay-panel hr-hidden">
      <div class="hr-ob">
        <div class="hr-ob-title red">WRECKED 💥</div>
        <div id="hrDeathStats" class="hr-death-stats"></div>
        <button class="hr-btn hr-btn-play" onclick="hrStartRace()">🔄 Try Again</button>
        <button class="hr-btn" onclick="hrQuit()">🚗 Garage</button>
      </div>
    </div>
  </div>
</div>`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // OPEN / CLOSE
  // ═══════════════════════════════════════════════════════════════════
  window.openHighwayRacer = function () {
    injectCSS();
    let ov = document.getElementById('hrOverlay');
    if (!ov) {
      document.body.insertAdjacentHTML('beforeend', buildHTML());
      ov = document.getElementById('hrOverlay');
      document.addEventListener('keydown', globalKey);
    }
    ov.classList.remove('hr-hidden');
    loadSave(() => { refreshWallet(); buildGarage(); });
    subGhosts();
  };

  window.closeHighwayRacer = function () {
    stopGame();
    unsubGhosts();
    document.getElementById('hrOverlay')?.classList.add('hr-hidden');
  };

  // Expose for tab button (set by tabs.js)
  window.openHighwayRacer = window.openHighwayRacer;

  // ═══════════════════════════════════════════════════════════════════
  // WALLET
  // ═══════════════════════════════════════════════════════════════════
  function refreshWallet() {
    const c = document.getElementById('hrCoins'), g = document.getElementById('hrGems');
    if (c) c.textContent = (saveData.coins || 0).toLocaleString();
    if (g) g.textContent = (saveData.gems  || 0).toLocaleString();
  }

  // ═══════════════════════════════════════════════════════════════════
  // GARAGE
  // ═══════════════════════════════════════════════════════════════════
  function buildGarage() {
    const grid = document.getElementById('hrCarGrid');
    if (!grid) return;
    const visible = CARS.filter(c => !c.hidden || isDev());
    grid.innerHTML = visible.map(car => {
      const unlocked = isUnlocked(car);
      const sel      = car.id === activeCarId;
      const costStr  = car.cost > 0 ? `🪙 ${car.cost.toLocaleString()}` :
                       car.unlock === 'vip' ? '💎 VIP' :
                       car.unlock === 'dev' ? '🛠 DEV' : 'FREE';
      return `
        <div class="hr-car ${sel ? 'sel' : ''} ${unlocked ? '' : 'locked'} ${car.legendary ? 'legendary' : ''}"
          style="--cb:${car.body};--cg:${car.glow}" onclick="hrSelectCar('${car.id}')">
          ${car.legendary ? '<span class="hr-leg-badge">LEGENDARY</span>' : ''}
          <div class="hr-car-art"></div>
          <div class="hr-car-name">${car.name}</div>
          <div class="hr-car-desc">${car.desc}</div>
          <div>
            ${['speed','handling','boost','armor','coins'].map(k => `
              <div class="hr-stat-row">
                <span>${k}</span>
                <div class="hr-stat-track"><div class="hr-stat-fill" style="width:${car.stats[k]*10}%"></div></div>
              </div>`).join('')}
          </div>
          <div class="hr-car-cost">${unlocked ? (sel ? '✓ Selected' : 'Select') : costStr}</div>
        </div>`;
    }).join('');
  }

  window.hrSelectCar = function (id) {
    const car = carDef(id);
    if (!car) return;
    if (!isUnlocked(car)) {
      if (car.cost > 0 && (saveData.coins || 0) >= car.cost) {
        if (!confirm(`Buy ${car.name} for 🪙 ${car.cost.toLocaleString()}?`)) return;
        saveData.coins = (saveData.coins || 0) - car.cost;
        if (!saveData.ownedCars) saveData.ownedCars = {};
        saveData.ownedCars[id] = true;
        persist({ coins: saveData.coins, ownedCars: saveData.ownedCars });
        refreshWallet();
      } else if (car.cost > 0) {
        alert(`Need 🪙 ${car.cost.toLocaleString()} coins. Keep racing!`); return;
      } else return;
    }
    activeCarId = id;
    buildGarage();
    buildUpgrades(id);
  };

  function buildUpgrades(id) {
    const panel = document.getElementById('hrUpgPanel');
    if (!panel) return;
    const car    = carDef(id);
    const upg    = saveData.upgrades?.[id] || {};
    const COSTS  = [5, 15, 30, 60, 100];
    panel.style.display = 'block';
    panel.innerHTML = `
      <div class="hr-upg-title">⬆ Upgrades — ${car.name}</div>
      ${['speed','handling','boost','armor','coins'].map(k => {
        const lvl  = upg[k] || 0;
        const cost = COSTS[Math.min(lvl, COSTS.length - 1)];
        const maxed = lvl >= 5;
        return `<div class="hr-upg-row">
          <span class="hr-upg-key">${k}</span>
          <span class="hr-upg-lvl">Lv ${lvl}/5</span>
          <button class="hr-btn hr-btn-gem ${maxed ? 'maxed' : ''}"
            onclick="hrUpgrade('${id}','${k}',${cost})" ${maxed ? 'disabled' : ''}>
            ${maxed ? 'MAX' : `💎 ${cost}`}
          </button>
        </div>`;
      }).join('')}`;
  }

  window.hrUpgrade = function (carId, key, cost) {
    if ((saveData.gems || 0) < cost) { alert(`Need 💎 ${cost} gems!`); return; }
    if (!saveData.upgrades) saveData.upgrades = {};
    if (!saveData.upgrades[carId]) saveData.upgrades[carId] = {};
    const cur = saveData.upgrades[carId][key] || 0;
    if (cur >= 5) return;
    saveData.upgrades[carId][key] = cur + 1;
    saveData.gems = (saveData.gems || 0) - cost;
    persist({ gems: saveData.gems, upgrades: saveData.upgrades });
    refreshWallet(); buildUpgrades(carId);
  };

  // ═══════════════════════════════════════════════════════════════════
  // LEADERBOARD
  // ═══════════════════════════════════════════════════════════════════
  window.hrShowLb = function () {
    document.getElementById('hrGarage').classList.add('hr-hidden');
    document.getElementById('hrLb').classList.remove('hr-hidden');
    loadLb('score');
  };

  window.hrLbTab = function (btn, mode) {
    document.querySelectorAll('.hr-lb-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadLb(mode);
  };

  function loadLb(mode) {
    const list = document.getElementById('hrLbList');
    const d    = db();
    if (!list) return;
    list.innerHTML = '<div class="hr-lb-msg">Loading…</div>';
    if (!d) { list.innerHTML = '<div class="hr-lb-msg">Sign in to view.</div>'; return; }

    if (mode === 'daily') {
      const day = new Date().toISOString().slice(0, 10);
      d.get(d.ref(d.db, `${DB_PATH}/daily/${day}`)).then(snap => {
        const sorted = Object.entries(snap.val() || {}).sort((a, b) => b[1] - a[1]).slice(0, 20);
        renderLb(list, sorted.map(([u, v], i) => ({ rank: i + 1, uid: u, val: v, lbl: 'pts' })));
      }).catch(() => { list.innerHTML = '<div class="hr-lb-msg">Error</div>'; });
      return;
    }
    d.get(d.ref(d.db, `${DB_PATH}/lb`)).then(snap => {
      const arr    = Object.values(snap.val() || {});
      const sorted = arr.sort((a, b) => (b[mode] || 0) - (a[mode] || 0)).slice(0, 20);
      renderLb(list, sorted.map((e, i) => ({
        rank: i + 1, uid: e.uid,
        val: mode === 'dist' ? (e.dist || 0) : (e.score || 0),
        lbl: mode === 'dist' ? 'm' : 'pts',
      })));
    }).catch(() => { list.innerHTML = '<div class="hr-lb-msg">Error</div>'; });
  }

  function renderLb(list, rows) {
    if (!rows.length) { list.innerHTML = '<div class="hr-lb-msg">No data yet!</div>'; return; }
    const me = uid();
    list.innerHTML = rows.map(r => {
      const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`;
      return `<div class="hr-lb-row ${r.uid === me ? 'hr-lb-me' : ''}">
        <span class="hr-lb-rank">${medal}</span>
        <span class="hr-lb-uid">${r.uid === me ? 'You' : r.uid.slice(0, 8) + '…'}</span>
        <span class="hr-lb-val">${r.val.toLocaleString()} ${r.lbl}</span>
      </div>`;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════════
  // RACE START / STOP
  // ═══════════════════════════════════════════════════════════════════
  window.hrStartRace = function () {
    showPanel('hrGamePanel');
    canvas = document.getElementById('hrCanvas');
    const panel = document.getElementById('hrGamePanel');
    W = panel.clientWidth  || 360;
    H = panel.clientHeight || Math.round(W * 1.55);
    canvas.width  = CANVAS_W;
    canvas.height = Math.round(CANVAS_W * 1.55);
    ctx = canvas.getContext('2d');

    const car = carDef(activeCarId);
    const upg = saveData.upgrades?.[activeCarId] || {};
    const startLane = 1;

    gs = {
      car, upg,
      score: 0, dist: 0, speed: SPEED_BASE,
      time: 0, paused: false, dead: false,
      lastTS: null,
      player: { lane: startLane, x: laneX(startLane), y: canvas.height - CAR_H - 30, targetX: laneX(startLane) },
      traffic: [], coinItems: [], gemItems: [], powerups: [], particles: [],
      effects: {},
      marks: Array.from({ length: 8 }, (_, i) => ({ y: i * (canvas.height / 4) })),
      spLines: Array.from({ length: 20 }, () => ({ x: Math.random() * CANVAS_W, y: Math.random() * canvas.height, len: 30 + Math.random() * 60 })),
      timers: { spawn: 0, coin: 0, gem: 0, pu: 0, ghost: 0 },
      moveCooldown: 0,
      _coins: 0, _gems: 0,
    };

    document.getElementById('hrDeathOv').classList.add('hr-hidden');
    document.getElementById('hrPauseOv').classList.add('hr-hidden');
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  };

  function stopGame() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    gs = null;
  }

  window.hrQuit = function () { stopGame(); showPanel('hrGarage'); loadSave(() => { refreshWallet(); buildGarage(); }); };
  window.hrTogglePause = function () {
    if (!gs || gs.dead) return;
    gs.paused = !gs.paused;
    document.getElementById('hrPauseOv').classList.toggle('hr-hidden', !gs.paused);
    if (!gs.paused) { gs.lastTS = null; raf = requestAnimationFrame(loop); }
  };

  function showPanel(id) {
    ['hrGarage', 'hrLb', 'hrGamePanel'].forEach(pid => {
      const el = document.getElementById(pid);
      if (el) el.classList.toggle('hr-hidden', pid !== id);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════════════
  function globalKey(e) {
    if (!gs || gs.dead || gs.paused) { if (e.key === 'Escape') window.hrTogglePause?.(); return; }
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') moveLane(-1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(1);
    if (e.key === 'Escape') window.hrTogglePause();
  }

  window.hrDir = function (dir) { if (!gs || gs.dead || gs.paused) return; if (dir !== 0) moveLane(dir); };

  function moveLane(dir) {
    if (!gs || gs.moveCooldown > 0) return;
    const nl = Math.max(0, Math.min(LANES - 1, gs.player.lane + dir));
    if (nl === gs.player.lane) return;
    gs.player.lane    = nl;
    gs.player.targetX = laneX(nl);
    gs.moveCooldown   = 150;
  }

  // ═══════════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════════
  function loop(ts) {
    if (!gs || gs.dead || gs.paused) return;
    if (!gs.lastTS) gs.lastTS = ts;
    const dt = Math.min((ts - gs.lastTS) / 1000, 0.05);
    gs.lastTS = ts;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════
  function update(dt) {
    gs.time += dt;
    gs.moveCooldown = Math.max(0, gs.moveCooldown - dt * 1000);

    const spd    = statV(gs.car.stats.speed, gs.upg, 'speed');
    const rocket = isActive('rocket'), slow = isActive('slow');
    gs.speed = Math.min(SPEED_MAX, (SPEED_BASE + gs.time * SPEED_RAMP + spd * 10) * (rocket ? 2.2 : 1) * (slow ? 0.45 : 1));
    gs.dist += gs.speed * dt;
    gs.score = Math.round(gs.dist / 10 + gs._coins * 100 + gs._gems * 500);

    const hand = statV(gs.car.stats.handling, gs.upg, 'handling');
    gs.player.x += (gs.player.targetX - gs.player.x) * Math.min(1, (6 + hand * 1.2) * dt);

    gs.marks.forEach(m => { m.y += gs.speed * dt; if (m.y > canvas.height + 40) m.y -= canvas.height + 80; });
    gs.spLines.forEach(l => { l.y += gs.speed * dt * 0.6; if (l.y > canvas.height) { l.y = -l.len; l.x = Math.random() * CANVAS_W; } });

    // Spawn
    gs.timers.spawn += dt;
    const spawnRate = Math.max(0.4, 2.2 - gs.time * 0.012);
    if (gs.timers.spawn >= spawnRate) { gs.timers.spawn = 0; spawnTraffic(); }
    gs.timers.coin += dt; if (gs.timers.coin >= 0.9) { gs.timers.coin = 0; spawnCoin(); }
    gs.timers.gem  += dt; if (gs.timers.gem  >= 2.2) { gs.timers.gem  = 0; if (Math.random() < 0.8) spawnGem(); }
    gs.timers.pu   += dt; if (gs.timers.pu   >= 12 + Math.random() * 8) { gs.timers.pu = 0; spawnPowerup(); }

    const inv  = isActive('invincible') || gs.car.invincible;
    const mag  = isActive('magnet');
    const arm  = statV(gs.car.stats.armor, gs.upg, 'armor');

    // Traffic
    gs.traffic = gs.traffic.filter(t => {
      t.y += (gs.speed + t.rel) * dt;
      if (t.y > canvas.height + 120) return false;
      if (!inv) {
        const dx = Math.abs(gs.player.x - laneX(t.lane)), dy = Math.abs(gs.player.y - t.y);
        if (dx < (CAR_W + TRAFFIC_W) * 0.42 && dy < (CAR_H + TRAFFIC_H) * 0.42) {
          if (gs.car.id === 'stealth' && arm >= 9) {
            gs._armorHits = (gs._armorHits || 0) + 1;
            spawnImpact(gs.player.x, gs.player.y);
            if (gs._armorHits > 3) die();
          } else { spawnImpact(gs.player.x, gs.player.y); die(); }
        }
      }
      return true;
    });

    // Coins
    gs.coinItems = gs.coinItems.filter(c => {
      c.y += gs.speed * dt; c.a = (c.a || 0) + dt * 4;
      if (mag) { const dx = gs.player.x - c.x, dy = gs.player.y - c.y, d = Math.sqrt(dx*dx+dy*dy); if (d < 180) { c.x += dx*6*dt; c.y += dy*6*dt; } }
      const dx = Math.abs(gs.player.x - c.x), dy = Math.abs(gs.player.y - c.y);
      if (dx < CAR_W * 0.7 && dy < CAR_H * 0.7) {
        const cm  = statV(gs.car.stats.coins, gs.upg, 'coins');
        const mul = isActive('x2coins') ? 2 : 1;
        gs._coins += Math.round(cm * mul);
        spawnCollect(c.x, c.y, `+${Math.round(cm*mul)}🪙`);
        return false;
      }
      return c.y < canvas.height + 30;
    });

    // Gems
    gs.gemItems = gs.gemItems.filter(g => {
      g.y += gs.speed * dt; g.a = (g.a || 0) + dt * 3;
      if (mag) { const dx = gs.player.x - g.x, dy = gs.player.y - g.y, d = Math.sqrt(dx*dx+dy*dy); if (d < 200) { g.x += dx*7*dt; g.y += dy*7*dt; } }
      const dx = Math.abs(gs.player.x - g.x), dy = Math.abs(gs.player.y - g.y);
      if (dx < CAR_W * 0.7 && dy < CAR_H * 0.7) {
        gs._gems++; spawnCollect(g.x, g.y, '+1💎', '#69f0ae'); return false;
      }
      return g.y < canvas.height + 30;
    });

    // Powerups
    gs.powerups = gs.powerups.filter(p => {
      p.y += gs.speed * dt * 0.7; p.a = (p.a || 0) + dt * 2;
      const dx = Math.abs(gs.player.x - p.x), dy = Math.abs(gs.player.y - p.y);
      if (dx < CAR_W * 0.7 && dy < CAR_H * 0.7) {
        const def = POWERUP_DEFS.find(x => x.id === p.id);
        if (def) gs.effects[p.id] = Date.now() + def.dur;
        spawnCollect(p.x, p.y, def?.label || '✨', def?.color || '#fff');
        updatePuHUD(); return false;
      }
      return p.y < canvas.height + 30;
    });

    // Expire effects
    const now = Date.now();
    Object.keys(gs.effects).forEach(k => { if (gs.effects[k] <= now) delete gs.effects[k]; });

    // Particles
    gs.particles = gs.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; return p.life > 0;
    });

    // HUD
    const hs = document.getElementById('hrHudScore'), hd = document.getElementById('hrHudDist');
    if (hs) hs.textContent = gs.score.toLocaleString();
    if (hd) hd.textContent = `${Math.round(gs.dist / 10)}m`;
    updatePuHUD();

    // Ghost
    gs.timers.ghost += dt;
    if (gs.timers.ghost >= 2) { gs.timers.ghost = 0; pushGhost(); }
  }

  function spawnTraffic() {
    const used = gs.traffic.filter(t => t.y < 80).map(t => t.lane);
    const free = [0,1,2,3].filter(l => !used.includes(l));
    if (!free.length) return;
    const lane = free[Math.floor(Math.random() * free.length)];
    gs.traffic.push({ lane, y: -TRAFFIC_H, rel: -(30 + Math.random() * 60), color: `hsl(${Math.random()*360},70%,55%)` });
  }
  function spawnCoin() {
    const lane = Math.floor(Math.random() * LANES);
    for (let i = 0; i < 1 + Math.floor(gs.time / 30); i++)
      gs.coinItems.push({ x: laneX(lane) + (Math.random() - 0.5) * 20, y: -20 - i * 30, a: 0 });
  }
  function spawnGem() {
    gs.gemItems.push({ x: laneX(Math.floor(Math.random() * LANES)), y: -20, a: 0 });
  }
  function spawnPowerup() {
    const def = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
    gs.powerups.push({ x: laneX(Math.floor(Math.random() * LANES)), y: -30, id: def.id, a: 0 });
  }
  function spawnImpact(x, y) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 200;
      gs.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 0.5 + Math.random()*0.3, color: `hsl(${20+Math.random()*30},100%,60%)`, r: 2+Math.random()*4 });
    }
  }
  function spawnCollect(x, y, label, color = '#ffd740') {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      gs.particles.push({ x, y, vx: Math.cos(a)*60, vy: Math.sin(a)*60-100, life: 0.6, color, r: 3+Math.random()*3 });
    }
  }
  function updatePuHUD() {
    const hud = document.getElementById('hrPuHud'); if (!hud || !gs) return;
    const now = Date.now();
    hud.innerHTML = Object.entries(gs.effects)
      .filter(([,e]) => e > now)
      .map(([id, end]) => {
        const def = POWERUP_DEFS.find(p => p.id === id);
        return `<span class="hr-pu-chip" style="color:${def?.color||'#fff'}">${def?.label||id} ${Math.ceil((end-now)/1000)}s</span>`;
      }).join('');
  }

  // ─── DIE ──────────────────────────────────────────────────────────
  function die() {
    if (!gs || gs.dead) return;
    gs.dead = true;
    saveData.coins = (saveData.coins || 0) + gs._coins;
    saveData.gems  = (saveData.gems  || 0) + gs._gems;
    persist({ coins: saveData.coins, gems: saveData.gems });
    saveScore(gs.score, Math.round(gs.dist / 10));
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    draw();
    const el = document.getElementById('hrDeathStats');
    if (el) el.innerHTML = `
      <div>🏁 Score: <strong>${gs.score.toLocaleString()}</strong></div>
      <div>📏 Distance: <strong>${Math.round(gs.dist/10)}m</strong></div>
      <div>🪙 Earned: <strong>${gs._coins}</strong></div>
      <div>💎 Gems: <strong>${gs._gems}</strong></div>
      <div>🏆 Best: <strong>${(saveData.bestScore||0).toLocaleString()}</strong></div>`;
    document.getElementById('hrDeathOv')?.classList.remove('hr-hidden');
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW
  // ═══════════════════════════════════════════════════════════════════
  function draw() {
    if (!ctx || !gs) return;
    const cw = canvas.width, ch = canvas.height;
    const roadL = 0, roadR = cw;

    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, cw, ch);

    const rg = ctx.createLinearGradient(roadL, 0, roadR, 0);
    rg.addColorStop(0, '#0a0c18'); rg.addColorStop(0.5, '#0e1020'); rg.addColorStop(1, '#0a0c18');
    ctx.fillStyle = rg;
    ctx.fillRect(roadL, 0, LANES * LANE_W, ch);

    // Speed lines
    ctx.save();
    ctx.globalAlpha = Math.min(0.28, gs.speed / SPEED_MAX * 0.45);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    gs.spLines.forEach(l => { ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x, l.y + l.len); ctx.stroke(); });
    ctx.restore();

    // Neon edges
    ctx.save(); ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12; ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(roadL, 0); ctx.lineTo(roadL, ch); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(roadR, 0); ctx.lineTo(roadR, ch); ctx.stroke();
    ctx.restore();

    // Lane dividers
    ctx.setLineDash([28, 20]); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
    for (let l = 1; l < LANES; l++) { const x = l * LANE_W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke(); }
    ctx.setLineDash([]);

    // Road marks
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    gs.marks.forEach(m => ctx.fillRect(cw/2 - 2, m.y, 4, 22));

    // Ghosts
    ghostData.forEach(g => drawCar(laneX(g.lane), ch - CAR_H - 30, carDef(g.car || 'cruiser'), 0.3));

    // Traffic
    gs.traffic.forEach(t => drawTraffic(laneX(t.lane), t.y, t.color));

    // Coins
    gs.coinItems.forEach(c => {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
      ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 14; ctx.fillStyle = '#ffd740';
      ctx.beginPath(); ctx.arc(0, 0, COIN_R, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${COIN_R}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1); ctx.restore();
    });

    // Gems
    gs.gemItems.forEach(g => {
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.a);
      ctx.shadowColor = '#69f0ae'; ctx.shadowBlur = 16; ctx.fillStyle = '#69f0ae';
      ctx.beginPath(); ctx.moveTo(0,-GEM_R*1.2); ctx.lineTo(GEM_R,0); ctx.lineTo(0,GEM_R*1.2); ctx.lineTo(-GEM_R,0); ctx.closePath(); ctx.fill();
      ctx.restore();
    });

    // Powerups
    gs.powerups.forEach(p => {
      const def = POWERUP_DEFS.find(x => x.id === p.id);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.shadowColor = def?.color || '#fff'; ctx.shadowBlur = 20;
      ctx.fillStyle = (def?.color || '#fff') + '33';
      ctx.beginPath(); ctx.arc(0, 0, POWERUP_R, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = def?.color || '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${POWERUP_R}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(def?.label || '?', 0, 1); ctx.restore();
    });

    // Player
    const glow = isActive('invincible') ? 'rgba(0,229,255,0.9)' :
                 isActive('rocket')     ? 'rgba(255,109,0,0.9)' :
                 isActive('shield')     ? 'rgba(64,196,255,0.8)' : gs.car.glow;
    drawCar(gs.player.x, gs.player.y, gs.car, 1.0, glow);

    // Rocket exhaust
    if (isActive('rocket')) {
      ctx.save(); ctx.translate(gs.player.x, gs.player.y + CAR_H * 0.5 + 10);
      const ex = ctx.createLinearGradient(0,-10,0,40);
      ex.addColorStop(0,'rgba(255,109,0,0.9)'); ex.addColorStop(1,'rgba(255,109,0,0)');
      ctx.fillStyle = ex; ctx.shadowColor = '#ff6d00'; ctx.shadowBlur = 20;
      ctx.fillRect(-8, 0, 16, 30 + Math.random() * 20); ctx.restore();
    }

    // Particles
    gs.particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
    });

    // Road neon reflection
    ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = gs.car.glow;
    ctx.fillRect(0, gs.player.y + CAR_H/2, cw, 40); ctx.restore();
  }

  function drawCar(x, y, car, alpha, glowOverride) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.shadowColor = glowOverride || car.glow; ctx.shadowBlur = alpha < 0.5 ? 8 : 22;
    const bx = -CAR_W/2, by = -CAR_H/2;
    ctx.fillStyle = alpha < 0.5 ? car.body + '60' : car.body;
    ctx.beginPath(); ctx.roundRect(bx+4, by, CAR_W-8, CAR_H, 6); ctx.fill();
    ctx.fillStyle = car.accent;
    ctx.beginPath(); ctx.roundRect(bx+10, by+12, CAR_W-20, CAR_H*0.38, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,200,255,0.4)';
    ctx.beginPath(); ctx.roundRect(bx+12, by+14, CAR_W-24, CAR_H*0.2, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
    ctx.fillRect(bx+6, by+2, 10, 6); ctx.fillRect(bx+CAR_W-16, by+2, 10, 6);
    ctx.fillStyle = '#f44336'; ctx.shadowColor = '#f44336';
    ctx.fillRect(bx+6, by+CAR_H-8, 10, 5); ctx.fillRect(bx+CAR_W-16, by+CAR_H-8, 10, 5);
    if (car.legendary && alpha >= 1) {
      ctx.strokeStyle = car.glow; ctx.lineWidth = 3;
      ctx.shadowColor = car.glow; ctx.shadowBlur = 30 + Math.sin(Date.now()/200)*10;
      ctx.beginPath(); ctx.ellipse(0, 0, CAR_W*0.7, CAR_H*0.55, 0, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawTraffic(x, y, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(-TRAFFIC_W/2+3, -TRAFFIC_H/2, TRAFFIC_W-6, TRAFFIC_H, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.roundRect(-TRAFFIC_W/2+8, -TRAFFIC_H/2+10, TRAFFIC_W-16, TRAFFIC_H*0.3, 3); ctx.fill();
    ctx.fillStyle = '#ffeb3b'; ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 10;
    ctx.fillRect(-TRAFFIC_W/2+4, TRAFFIC_H/2-8, 9, 5); ctx.fillRect(TRAFFIC_W/2-13, TRAFFIC_H/2-8, 9, 5);
    ctx.restore();
  }

  console.log('[HighwayRacer] Ready — window.openHighwayRacer()');
})();
