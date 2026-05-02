/* 🐱 BONGO CAT — Fix 3
   Always visible (semi-transparent at rest).
   Animates on ANY keydown in inputs AND on every mousedown.
   No isAnimating guard so rapid typing works properly.
*/
(() => {
  const IDLE_FRAMES = ['bongo/idle1.png', 'bongo/idle2.png', 'bongo/idle3.png'];
  const LEFT_FRAME  = 'bongo/left.png';
  const RIGHT_FRAME = 'bongo/right.png';

  const OPACITY_IDLE   = '0.55';
  const OPACITY_ACTIVE = '1';

  let container, img;
  let nextHand  = 'left';
  let idleIdx   = 0;
  let animTimer = null;
  let fadeTimer = null;

  function build() {
    if (document.getElementById('bongoCat')) return;

    container = document.createElement('div');
    container.id = 'bongoCat';
    container.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:12px',
      'width:90px',
      'height:90px',
      'z-index:9999',
      'pointer-events:none',
      `opacity:${OPACITY_IDLE}`,
      'transition:opacity 0.4s ease',
      'image-rendering:pixelated',
    ].join(';');

    img = document.createElement('img');
    img.id  = 'bongoCatImg';
    img.alt = 'bongo cat';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated';
    img.src = IDLE_FRAMES[0];

    container.appendChild(img);
    document.body.appendChild(container);
  }

  function setOpacity(val) { if (container) container.style.opacity = val; }
  function setFrame(src)   { if (img) img.src = src; }
  function advanceIdle()   { setFrame(IDLE_FRAMES[idleIdx++ % IDLE_FRAMES.length]); }

  function animateKey() {
    setOpacity(OPACITY_ACTIVE);
    clearTimeout(animTimer);
    clearTimeout(fadeTimer);

    const hand = nextHand;
    nextHand = hand === 'left' ? 'right' : 'left';

    advanceIdle();

    animTimer = setTimeout(() => {
      setFrame(hand === 'left' ? LEFT_FRAME : RIGHT_FRAME);
      animTimer = setTimeout(() => {
        advanceIdle();
        fadeTimer = setTimeout(() => setOpacity(OPACITY_IDLE), 2200);
      }, 80);
    }, 60);
  }

  function shouldTrigger(key) {
    return key.length === 1 ||
      key === 'Backspace' || key === 'Delete' || key === 'Enter' || key === ' ';
  }

  function init() {
    build();

    function attachTo(el) {
      if (el._bongoCat) return;
      el._bongoCat = true;
      el.addEventListener('keydown', e => { if (shouldTrigger(e.key)) animateKey(); });
    }

    document.querySelectorAll(
      'input[type="text"], input[type="password"], textarea, input:not([type]), [contenteditable]'
    ).forEach(attachTo);

    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        if (shouldTrigger(e.key)) animateKey();
      }
    });

    document.addEventListener('mousedown', () => animateKey());

    new MutationObserver(() => {
      document.querySelectorAll(
        'input[type="text"], input[type="password"], textarea, input:not([type])'
      ).forEach(attachTo);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
