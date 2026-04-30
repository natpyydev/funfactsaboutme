// =========================================================
// 🎮 NATNAT MINI-GAME — "Catch the Hearts" (with rounds + crit)
// Falls get FASTER each round. VIP unlocks Diamond OP char.
// =========================================================

import { hasPerk } from './roles.js';

export const CHARACTERS = [
  { id: 'simple',     icon: '😊',  name: 'Simple Me',
    desc: 'just vibin\'',                speed: 5, hitbox: 40, special: null,
    unlock: { combos: 0 } },
  { id: 'juggernaut', icon: '💪',  name: 'Juggernaut Me',
    desc: 'tank build, slow but absorbs 1 hit every 5s',
    speed: 3.5, hitbox: 56, special: 'shield',
    unlock: { combos: 100 } },
  { id: 'basilio',    icon: '🦅',  name: 'Basilio Me',
    desc: 'fast, every catch = double points',
    speed: 6.5, hitbox: 36, special: 'double',
    unlock: { combos: 500 } },
  { id: 'yearner',    icon: '🥺',  name: 'Yearner Final-Boss Me',
    desc: 'pulls hearts toward you (magnet)',
    speed: 7, hitbox: 32, special: 'magnet',
    unlock: { combos: 1000 } },
  { id: 'developer',  icon: '🛠',  name: 'Developer Me',
    desc: 'most OP — shield + double + magnet, ofc',
    speed: 8, hitbox: 50, special: 'all',
    unlock: { combos: 5000, requireDev: true } },
  { id: 'vip',        icon: '💎',  name: 'Diamond Me — VIP',
    desc: 'broken OP. shield + double + magnet, x3 score, +1 life.',
    speed: 9, hitbox: 56, special: 'all',
    unlock: { vip: true } },
];

const HI_KEY = 'natnat_game_hi';
const PICK_KEY = 'natnat_game_pick';

let canvas, ctx, raf;
let state = null;
let pfpImg = null;

export function isCharacterUnlocked(c, totalCombos) {
  if (c.unlock.requireDev && !hasPerk('all')) return false;
  if (c.unlock.vip && !(window.isVIP && window.isVIP())) return false;
  return (totalCombos || 0) >= (c.unlock.combos || 0);
}

export function openGame(getTotalCombos) {
  const overlay = document.getElementById('gameOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  preloadPfp();
  buildCharSelect(getTotalCombos());
}

export function closeGame() {
  const overlay = document.getElementById('gameOverlay');
  if (overlay) overlay.classList.add('hidden');
  stopGame();
}

function preloadPfp() {
  pfpImg = null;
  const db = window._natDB; if (!db) return;
  const uid = db.getUID(); if (!uid) return;
  db.get(db.ref(db.db, 'userProfiles/' + uid)).then(snap => {
    const v = snap.val() || {};
    if (v.usePfpInGame && v.pfp) {
      const img = new Image();
      img.onload = () => { pfpImg = img; };
      img.src = v.pfp;
    }
  }).catch(()=>{});
}

function buildCharSelect(totalCombos) {
  const wrap = document.getElementById('gameCharSelect');
  const stage = document.getElementById('gameStage');
  if (!wrap || !stage) return;
  stage.classList.add('hidden');
  wrap.classList.remove('hidden');

  wrap.innerHTML = `
    <div class="game-title">🎮 NATNAT — Catch the Hearts</div>
    <div class="game-sub">your combos: <b>${totalCombos.toLocaleString()}</b> · hi-score: <b>${getHiScore()}</b></div>
    <div class="game-rounds-hint">⚡ falls get faster each round · survive 60s per round to advance</div>
    <div class="game-chars">
      ${CHARACTERS.map(c => {
        const unlocked = isCharacterUnlocked(c, totalCombos);
        let lockTxt;
        if (c.unlock.vip) lockTxt = 'unlock @ VIP only 💎';
        else {
          const need = c.unlock.requireDev ? 'Dev role + ' : '';
          lockTxt = 'unlock @ ' + need + c.unlock.combos.toLocaleString() + ' combos';
        }
        return `
          <div class="game-char ${unlocked ? '' : 'locked'} ${c.id==='vip'?'gc-vip':''}" data-id="${c.id}">
            <div class="gc-icon">${unlocked ? c.icon : '🔒'}</div>
            <div class="gc-name">${c.name}</div>
            <div class="gc-desc">${c.desc}</div>
            ${unlocked
              ? `<button class="gc-play">PLAY</button>`
              : `<div class="gc-lock">${lockTxt}</div>`}
          </div>
        `;
      }).join('')}
    </div>
  `;

  wrap.querySelectorAll('.game-char').forEach(el => {
    const id = el.dataset.id;
    if (el.classList.contains('locked')) return;
    el.querySelector('.gc-play')?.addEventListener('click', () => {
      localStorage.setItem(PICK_KEY, id);
      startGame(id, 1, 0);
    });
  });
}

function getHiScore() {
  return parseInt(localStorage.getItem(HI_KEY) || '0', 10) || 0;
}

function setHiScore(s) {
  if (s > getHiScore()) localStorage.setItem(HI_KEY, String(s));
}

function startGame(charId, round = 1, carryScore = 0) {
  const wrap  = document.getElementById('gameCharSelect');
  const stage = document.getElementById('gameStage');
  if (!wrap || !stage) return;
  wrap.classList.add('hidden');
  stage.classList.remove('hidden');

  if (!stage.querySelector('canvas')) {
    stage.innerHTML = '<canvas id="gameCanvas" width="360" height="540"></canvas>';
  }
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  const char = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
  const isVip = char.id === 'vip';

  // Round-based difficulty: each round +25% fall speed, +20% spawn rate
  const speedMul = 1 + (round - 1) * 0.25;
  const spawnMul = 1 + (round - 1) * 0.20;

  state = {
    char, isVip, round,
    w: canvas.width, h: canvas.height,
    px: canvas.width / 2, py: canvas.height - 60,
    leftDown: false, rightDown: false,
    items: [],
    spawnTimer: 0,
    spawnMul, speedMul,
    score: carryScore, lives: 3 + (isVip ? 1 : 0),
    timeLeft: 60,
    lastFrame: performance.now(),
    shieldUntil: 0,
    msg: '',
  };

  // round-start banner
  showRoundBanner(round);

  bindControls();
  raf = requestAnimationFrame(loop);

  if (char.special === 'shield' || char.special === 'all') {
    state.shieldUntil = performance.now() + 5000;
  }
}

function showRoundBanner(round) {
  const stage = document.getElementById('gameStage');
  if (!stage) return;
  let b = stage.querySelector('.game-round-banner');
  if (!b) { b = document.createElement('div'); b.className = 'game-round-banner'; stage.appendChild(b); }
  b.textContent = 'ROUND ' + round + (round >= 5 ? ' — BRUTAL!' : (round >= 3 ? ' — FAST!' : ''));
  b.classList.remove('show'); void b.offsetWidth;
  b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), 1600);
}

function stopGame() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  unbindControls();
}

function onKey(e) {
  if (!state) return;
  if (e.key === 'ArrowLeft' || e.key === 'a')  state.leftDown  = e.type === 'keydown';
  if (e.key === 'ArrowRight'|| e.key === 'd')  state.rightDown = e.type === 'keydown';
}
function onTouch(e) {
  if (!state) return;
  const t = e.touches[0]; if (!t) return;
  const r = canvas.getBoundingClientRect();
  state.px = (t.clientX - r.left) * (canvas.width / r.width);
}
function bindControls() {
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup',   onKey);
  canvas.addEventListener('touchmove', onTouch, { passive: true });
  canvas.addEventListener('touchstart', onTouch, { passive: true });
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    state.px = (e.clientX - r.left) * (canvas.width / r.width);
  });
}
function unbindControls() {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('keyup',   onKey);
}

const GOOD = ['❤️','⭐','💖','🌟'];
const BAD  = ['💀','😡','💩'];
function spawn() {
  const isGood = Math.random() < 0.78;
  const list = isGood ? GOOD : BAD;
  const baseVy = 2 + Math.random() * 2.5;
  state.items.push({
    x: Math.random() * (state.w - 30) + 15,
    y: -20,
    vy: baseVy * state.speedMul,
    icon: list[Math.floor(Math.random() * list.length)],
    good: isGood,
  });
}

function loop(now) {
  if (!state) return;
  const dt = (now - state.lastFrame) / 1000;
  state.lastFrame = now;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0 || state.lives <= 0) {
    return endRound();
  }

  const sp = state.char.speed;
  if (state.leftDown)  state.px -= sp;
  if (state.rightDown) state.px += sp;
  state.px = Math.max(20, Math.min(state.w - 20, state.px));

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawn();
    const baseGap = 0.45 + Math.random() * 0.35;
    state.spawnTimer = baseGap / state.spawnMul;
  }

  const magnet = (state.char.special === 'magnet' || state.char.special === 'all');
  const dbl    = (state.char.special === 'double' || state.char.special === 'all');
  const vipMul = state.isVip ? 3 : 1;
  for (const it of state.items) {
    if (magnet && it.good) {
      const dx = state.px - it.x;
      it.x += Math.sign(dx) * Math.min(Math.abs(dx), 1.6);
    }
    it.y += it.vy;
  }

  const r = state.char.hitbox / 2;
  state.items = state.items.filter(it => {
    const hit = Math.abs(it.x - state.px) < r &&
                Math.abs(it.y - state.py) < r;
    if (hit) {
      if (it.good) {
        const gain = (dbl ? 2 : 1) * vipMul;
        state.score += gain;
        state.msg = '+' + gain;
      } else {
        if ((state.char.special === 'shield' || state.char.special === 'all') &&
            performance.now() < state.shieldUntil) {
          state.msg = 'BLOCKED';
          state.shieldUntil = performance.now() + 5000;
        } else {
          state.lives--;
          state.msg = '-1 ❤️';
          if ((state.char.special === 'shield' || state.char.special === 'all')) {
            state.shieldUntil = performance.now() + 5000;
          }
        }
      }
      return false;
    }
    return it.y < state.h + 30;
  });

  draw();
  raf = requestAnimationFrame(loop);
}

function draw() {
  const { w, h, char, items, score, lives, timeLeft, px, py, round } = state;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ffe4f0');
  grad.addColorStop(1, '#e7d6ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const it of items) ctx.fillText(it.icon, it.x, it.y);

  if ((char.special === 'shield' || char.special === 'all') &&
      performance.now() < state.shieldUntil) {
    ctx.beginPath();
    ctx.arc(px, py, char.hitbox / 2 + 8, 0, Math.PI * 2);
    ctx.strokeStyle = state.isVip ? 'rgba(255,200,80,0.95)' : 'rgba(120,200,255,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // player — PFP if loaded, otherwise icon
  if (pfpImg) {
    const sz = char.hitbox + 14;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, sz/2, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(pfpImg, px - sz/2, py - sz/2, sz, sz);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = state.isVip ? '#ffd166' : '#ff7eb6';
    ctx.beginPath(); ctx.arc(px, py, sz/2, 0, Math.PI*2); ctx.stroke();
  } else {
    ctx.font = (char.hitbox + 6) + 'px sans-serif';
    ctx.fillText(char.icon, px, py);
  }

  ctx.fillStyle = '#5c2a4e';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`R${round} · ⭐ ${score}`, 12, 24);
  ctx.textAlign = 'right';
  ctx.fillText(`❤️ ${lives}   ⏱ ${Math.ceil(timeLeft)}s`, w - 12, 24);

  if (state.msg) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4d8d';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(state.msg, px, py - char.hitbox);
  }
}

function endRound() {
  // dead → end the game
  if (state.lives <= 0) return endGame(false);
  // survived → next round (cap at 9)
  const charId = state.char.id;
  const round = Math.min(9, state.round + 1);
  const carryScore = state.score;
  stopGame();
  setTimeout(() => startGame(charId, round, carryScore), 600);
}

function endGame(won) {
  setHiScore(state.score);
  if (typeof window.saveGameScore === 'function') {
    try { window.saveGameScore(state.score); } catch {}
  }
  if (window.bumpQuest) window.bumpQuest('game', state.score);
  if (window.addExp) window.addExp(state.score, 'game');
  const stage = document.getElementById('gameStage');
  if (!stage) return;
  stage.innerHTML = `
    <div class="game-end">
      <div class="ge-title">${won ? '🏁 WIN!' : '💀 GAME OVER'}</div>
      <div class="ge-score">final score: <b>${state.score}</b> · round ${state.round}</div>
      <div class="ge-hi">hi-score: <b>${getHiScore()}</b></div>
      <div class="ge-actions">
        <button id="gePlayAgain">play again</button>
        <button id="geBack">back to chars</button>
      </div>
    </div>
  `;
  document.getElementById('gePlayAgain')?.addEventListener('click', () => {
    const id = localStorage.getItem(PICK_KEY) || 'simple';
    stage.innerHTML = '<canvas id="gameCanvas" width="360" height="540"></canvas>';
    startGame(id, 1, 0);
  });
  document.getElementById('geBack')?.addEventListener('click', () => {
    stage.innerHTML = '<canvas id="gameCanvas" width="360" height="540"></canvas>';
    const totalCombos = parseInt(localStorage.getItem('natnat_my_combo_total') || '0', 10) || 0;
    buildCharSelect(totalCombos);
  });
  stopGame();
  state = null;
}
