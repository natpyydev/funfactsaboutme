/* Fix 5 — Chibi wanders the screen + is draggable
   Overrides the fixed bottom-right position with JS-driven
   smooth wandering. User can also drag it anywhere.
*/
(function () {
  let pos = { x: 0, y: 0 };
  let dragging = false;
  let dragOff  = { x: 0, y: 0 };
  let wanderTimer = null;

  function getWrap() { return document.getElementById('chibiWrap'); }

  function applyPos(wrap) {
    wrap.style.left = pos.x + 'px';
    wrap.style.top  = pos.y + 'px';
  }

  function pickTarget() {
    const W = window.innerWidth, H = window.innerHeight;
    const margin = 80;
    return {
      x: margin + Math.random() * Math.max(0, W - margin * 2 - 150),
      y: margin + Math.random() * Math.max(0, H - margin * 2 - 180),
    };
  }

  function scheduleWander(delay) {
    clearTimeout(wanderTimer);
    wanderTimer = setTimeout(function () {
      if (dragging) { scheduleWander(1500); return; }
      const wrap = getWrap();
      if (!wrap) return;
      const t = pickTarget();
      pos.x = t.x; pos.y = t.y;
      wrap.style.transition = 'left 2s cubic-bezier(0.25,0.46,0.45,0.94), top 2s cubic-bezier(0.25,0.46,0.45,0.94)';
      applyPos(wrap);
      scheduleWander(5000 + Math.random() * 7000);
    }, delay);
  }

  function startDrag(cx, cy) {
    const wrap = getWrap();
    if (!wrap) return;
    dragging    = true;
    dragOff.x   = cx - pos.x;
    dragOff.y   = cy - pos.y;
    wrap.style.transition = 'none';
    wrap.style.cursor     = 'grabbing';
  }

  function moveDrag(cx, cy) {
    if (!dragging) return;
    const wrap = getWrap();
    if (!wrap) return;
    pos.x = cx - dragOff.x;
    pos.y = cy - dragOff.y;
    applyPos(wrap);
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    const wrap = getWrap();
    if (wrap) {
      wrap.style.cursor     = 'grab';
      wrap.style.transition = 'left 0.6s cubic-bezier(0.34,1.56,0.64,1), top 0.6s cubic-bezier(0.34,1.56,0.64,1)';
    }
    scheduleWander(3000);
  }

  function init() {
    const wrap = getWrap();
    if (!wrap) return;

    const W = window.innerWidth, H = window.innerHeight;
    pos.x = W - 170;
    pos.y = H - 190;

    wrap.style.position   = 'fixed';
    wrap.style.bottom     = 'auto';
    wrap.style.right      = 'auto';
    wrap.style.left       = pos.x + 'px';
    wrap.style.top        = pos.y + 'px';
    wrap.style.transition = 'none';
    wrap.style.cursor     = 'grab';
    wrap.style.userSelect = 'none';

    wrap.addEventListener('mousedown',  function (e) { startDrag(e.clientX, e.clientY); e.preventDefault(); });
    wrap.addEventListener('touchstart', function (e) { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: true });

    document.addEventListener('mousemove',  function (e) { moveDrag(e.clientX, e.clientY); });
    document.addEventListener('mouseup',    endDrag);
    document.addEventListener('touchmove',  function (e) { if (!dragging) return; e.preventDefault(); const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }, { passive: false });
    document.addEventListener('touchend',   endDrag);

    scheduleWander(4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
