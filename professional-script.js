// ─── BUILD FRAME ARRAY ───────────────────────────────
const FRAMES = [];

for (let i = 1; i <= 210; i++) {

  const frameNum = String(i).padStart(3, '0');

  FRAMES.push(`sprites/ezgif-frame-${frameNum}.png`);
}
// ─── PHONE CANVAS ───────────────────────────────────────
const phoneCanvas = document.getElementById('phone-canvas');
const pCtx = phoneCanvas.getContext('2d');
// ─── SPRITE STATE ─────────────────────────────────────────
const imgs = [];
let loaded = 0;
const totalFrames = FRAMES.length;
let currentFrame = 0;
let targetFrame = 0;
let spriteAnimDone = false;

function preload() {
  FRAMES.forEach((src, i) => {
    const img = new Image();
    img.onload = () => { loaded++; if (loaded === totalFrames) onReady(); };
    img.src = src;
    imgs[i] = img;
  });
}

// ─── CANVAS SIZING — sprite frames are 1164×720px ──────────
function setCanvasSize() {
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  // Sprite native ratio: 1164 / 720 ≈ 1.617
  let w = vw;
  let h = Math.round(vw * 720 / 1164);
  if (h > vh) { h = vh; w = Math.round(vh * 1164 / 720); }
  phoneCanvas.width        = Math.round(w * dpr);
  phoneCanvas.height       = Math.round(h * dpr);
  phoneCanvas.style.width  = w + 'px';
  phoneCanvas.style.height = h + 'px';
  pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ─── DRAW SPRITE FRAME ───────────────────────────────────
function drawFrame(progressFloat) {
  const w = parseInt(phoneCanvas.style.width);
  const h = parseInt(phoneCanvas.style.height);
  pCtx.clearRect(0, 0, w, h);
  const frame = Math.min(FRAMES.length - 1, Math.max(0, progressFloat));
  const i0 = Math.floor(frame);
  const i1 = Math.min(i0 + 1, FRAMES.length - 1);
  const t  = frame - i0;
  const img0 = imgs[i0];
  const img1 = imgs[i1];
  if (!img0 || !img0.complete) return;
  drawImgContain(pCtx, img0, w, h);
  if (i1 !== i0 && img1 && img1.complete) {
    pCtx.save(); pCtx.globalAlpha = t;
    drawImgContain(pCtx, img1, w, h);
    pCtx.restore();
  }
}

function drawImgContain(ctx, img, cw, ch) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let dw, dh, dx, dy;
  if (ir > cr) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
  else         { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ─── RENDER LOOP ─────────────────────────────────────────
function renderLoop() {
  if (Math.abs(targetFrame - currentFrame) > 0.01) {
    currentFrame += (targetFrame - currentFrame) * 0.12;
    drawFrame(currentFrame);
  } else if (currentFrame !== targetFrame) {
    currentFrame = targetFrame;
    drawFrame(currentFrame);
  }
  requestAnimationFrame(renderLoop);
}

// ─── VIRTUAL PROGRESS (drives sprite before scroll unlocks) ─
let lastTouchY = null;

// ─── SCROLL LOCK ─────────────────────────────────────────
// During sprite phase we block native scroll and translate
// wheel/touch into window.scrollBy so scroll position drives frames.
let scrollLocked = true;

const SCROLL_KEYS = {32:1,33:1,34:1,35:1,36:1,37:1,38:1,39:1,40:1};
function preventKeyScroll(e) { if (SCROLL_KEYS[e.keyCode]) { e.preventDefault(); } }

function enableScrollLock() {
  // Key scroll prevention only — wheel/touch handled by onWheelDrive/onTouchMoveDrive
  window.addEventListener('keydown', preventKeyScroll, { passive: false });
}
function disableScrollLock() {
  scrollLocked = false;
  window.removeEventListener('keydown', preventKeyScroll);
}

// ─── SPRITE DRIVING ───────────────────────────────────────
// Wheel/touch call scrollBy which moves window.scrollY.
// updateSpriteFromScroll() reads scrollY → drives frames forward AND backward.
// We clamp so the user can't accidentally scroll past the track end while locked.
function onWheelDrive(e) {
  e.preventDefault();
  const track = document.getElementById('scroll-track');
  const trackH = track ? track.offsetHeight : 0;
  const newY = Math.max(0, Math.min(trackH, window.scrollY + e.deltaY * 17));
  window.scrollTo(0, newY);
}
function onTouchStart(e) { lastTouchY = e.touches[0].clientY; }
function onTouchMoveDrive(e) {
  e.preventDefault();
  if (lastTouchY === null) return;
  const dy = lastTouchY - e.touches[0].clientY;
  lastTouchY = e.touches[0].clientY;
  const track = document.getElementById('scroll-track');
  const trackH = track ? track.offsetHeight : 0;
  const newY = Math.max(0, Math.min(trackH, window.scrollY + dy * 20));
  window.scrollTo(0, newY);
}

// ─── SPRITE PROGRESS FROM SCROLL ─────────────────────────
function updateSpriteFromScroll() {
  const track = document.getElementById('scroll-track');
  if (!track) return;
  const trackH = track.offsetHeight; // 800vh in px

  // Only drive sprite while within the track zone
  if (window.scrollY > trackH) return;

  const p = Math.max(0, Math.min(1, window.scrollY / trackH));

  const MAX_SPRITE_FRAME = 185;
  targetFrame = Math.min(p * (totalFrames - 1), MAX_SPRITE_FRAME);
  const spriteDone = targetFrame >= MAX_SPRITE_FRAME || p >= 1;

  const fcEl = document.getElementById('fc-display');
  if (fcEl) fcEl.textContent = String(Math.round(targetFrame) + 1).padStart(2, '0');
  document.getElementById('progress-bar').style.width = (p * 100) + '%';

  const panels = document.querySelectorAll('.info-panel');
  panels.forEach(el => el.classList.remove('active'));
  if      (p < 0.25) document.getElementById('panel-0').classList.add('active');
  else if (p < 0.5)  document.getElementById('panel-1').classList.add('active');
  else if (p < 0.75) document.getElementById('panel-2').classList.add('active');
  else               document.getElementById('panel-3').classList.add('active');

  const hint = document.querySelector('.scroll-hint');
  if (hint) hint.style.opacity = p > 0.05 ? '0' : '1';

  // When sprite reaches the end, unlock real scroll — user can now scroll into #sections
  // Switch phone-wrap and photo-wrap to position:absolute so they scroll away naturally.
  if (spriteDone && !spriteAnimDone) {
    spriteAnimDone = true;
    disableScrollLock();
    window.removeEventListener('wheel',      onWheelDrive);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove',  onTouchMoveDrive);

    const anchorY = window.scrollY;
    const phoneWrap = document.getElementById('phone-wrap');
    const photoWrap = document.getElementById('photo-wrap');
    if (phoneWrap) {
      phoneWrap.style.position = 'absolute';
      phoneWrap.style.top = anchorY + 'px';
    }
    if (photoWrap) {
      photoWrap.style.position = 'absolute';
      photoWrap.style.top = anchorY + 'px';
    }
  }

  // Scrolled back into track while sprite was done — re-lock, re-drive, restore fixed
  if (!spriteDone && spriteAnimDone) {
    spriteAnimDone = false;
    enableScrollLock();
    window.addEventListener('wheel',      onWheelDrive,     { passive: false });
    window.addEventListener('touchstart', onTouchStart,     { passive: true  });
    window.addEventListener('touchmove',  onTouchMoveDrive, { passive: false });

    const phoneWrap = document.getElementById('phone-wrap');
    const photoWrap = document.getElementById('photo-wrap');
    if (phoneWrap) { phoneWrap.style.position = 'fixed'; phoneWrap.style.top = ''; }
    if (photoWrap) { photoWrap.style.position = 'fixed'; photoWrap.style.top = ''; }
  }
}

// ─── REAL SCROLL ─────────────────────────────────────────
function onScroll() {
  updateSpriteFromScroll();
}


// ─── CURSOR ──────────────────────────────────────────────
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
});
(function cursorRing() {
  rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
  ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
  requestAnimationFrame(cursorRing);
})();

// ─── INTERSECTION OBSERVER ───────────────────────────────
function setupObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.ht-eyebrow,.ht-h1,.ht-body,.cta-btn,.feat-card,.stat-num')
    .forEach(el => observer.observe(el));
}

// ─── INTRO / READY ──────────────────────────────────────
function onReady() {
  setCanvasSize();
  drawFrame(0);
  renderLoop();

  setTimeout(() => {
    document.getElementById('intro').classList.add('fade-out');
    setTimeout(() => {
      document.getElementById('intro').style.display = 'none';
      document.getElementById('app').classList.add('visible');
      document.getElementById('hud').classList.add('visible');
      document.getElementById('frame-counter').classList.add('visible');
      document.getElementById('hud-bottom').classList.add('visible');
      setupObserver();

      enableScrollLock();
      window.addEventListener('wheel',      onWheelDrive,    { passive: false });
      window.addEventListener('touchstart', onTouchStart,    { passive: true  });
      window.addEventListener('touchmove',  onTouchMoveDrive,{ passive: false });
    }, 1200);
  }, 2600);
}

// ─── BG CANVAS PARTICLES ────────────────────────────────
const bgCanvas = document.getElementById('bg-canvas');
const bCtx     = bgCanvas.getContext('2d');
const COLORS   = ['#ff2d78','#00f5ff','#ffe600','#ff6b00','#b44fff'];
let particles  = [];

function resizeBg() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
function initParticles() {
  particles = [];
  const count = Math.min(40, Math.floor(window.innerWidth / 30));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random()*bgCanvas.width, y: Math.random()*bgCanvas.height,
      r: Math.random()*2+0.5,
      vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3,
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
      alpha:Math.random()*0.4+0.1, life:Math.random()*Math.PI*2
    });
  }
}
function animateBg() {
  bCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
  particles.forEach(p => {
    p.life+=0.01; p.x+=p.vx; p.y+=p.vy;
    if(p.x<0)p.x=bgCanvas.width; if(p.x>bgCanvas.width)p.x=0;
    if(p.y<0)p.y=bgCanvas.height; if(p.y>bgCanvas.height)p.y=0;
    const a=p.alpha*(0.5+0.5*Math.sin(p.life));
    bCtx.beginPath(); bCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
    bCtx.fillStyle=p.color; bCtx.globalAlpha=a; bCtx.fill(); bCtx.globalAlpha=1;
  });
  requestAnimationFrame(animateBg);
}

// ─── INIT ────────────────────────────────────────────────
resizeBg(); initParticles(); animateBg();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  setCanvasSize(); resizeBg();
  if (loaded === totalFrames) drawFrame(currentFrame);
});
preload();
