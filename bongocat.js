/* 🐱 BONGO CAT TYPING ANIMATION
   Shows at top-right when user types.
   Image files needed in /bongo/ folder:
     bongo/idle1.png  — idle frame 1 (both hands up)
     bongo/idle2.png  — idle frame 2 (both hands up)
     bongo/idle3.png  — idle frame 3 (both hands up)
     bongo/left.png   — left hand on keyboard, right hand up
     bongo/right.png  — left hand up, right hand on keyboard
   Animation pattern: idle → left → idle → right → idle → left → idle → right...
*/
(() => {
  const IDLE_FRAMES = ['bongo/idle1.png', 'bongo/idle2.png', 'bongo/idle3.png'];
  const LEFT_FRAME  = 'bongo/left.png';
  const RIGHT_FRAME = 'bongo/right.png';

  let container, img;
  let idleTimer = null;
  let hideTimer = null;
  let nextHand = 'left'; // alternates left/right
  let idleIdx = 0;
  let isAnimating = false;
  let isTyping = false;

  function build() {
    if (document.getElementById('bongoCat')) return;

    container = document.createElement('div');
    container.id = 'bongoCat';
    container.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      width: 90px;
      height: 90px;
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      image-rendering: pixelated;
    `;

    img = document.createElement('img');
    img.id = 'bongoCatImg';
    img.alt = 'bongo cat';
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    `;
    img.src = IDLE_FRAMES[0];

    container.appendChild(img);
    document.body.appendChild(container);
  }

  function showCat() {
    if (container) container.style.opacity = '1';
  }

  function hideCat() {
    if (container) container.style.opacity = '0';
  }

  function setFrame(src) {
    if (img && img.src !== location.origin + '/' + src) {
      img.src = src;
    }
  }

  function playIdleFrame() {
    setFrame(IDLE_FRAMES[idleIdx % IDLE_FRAMES.length]);
    idleIdx++;
  }

  // On each keypress: idle → hand → idle (75ms intervals)
  // Hands alternate: left, right, left, right...
  function animateKey() {
    if (isAnimating) return;
    isAnimating = true;
    showCat();
    clearTimeout(idleTimer);
    clearTimeout(hideTimer);

    const hand = nextHand;
    nextHand = hand === 'left' ? 'right' : 'left';

    // Frame 1: idle
    playIdleFrame();

    setTimeout(() => {
      // Frame 2: hand down
      setFrame(hand === 'left' ? LEFT_FRAME : RIGHT_FRAME);

      setTimeout(() => {
        // Frame 3: back to idle
        playIdleFrame();
        isAnimating = false;
      }, 80);
    }, 60);

    // Hide after 2s of no typing
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!isTyping) {
        // Slow idle animation then hide
        playIdleFrame();
        setTimeout(hideCat, 800);
      }
    }, 2000);
  }

  function onKeydown(e) {
    // Ignore non-character keys
    if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Space') return;
    isTyping = true;
    animateKey();
  }

  function onKeyup() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      isTyping = false;
    }, 300);
  }

  function init() {
    build();

    // Attach to ALL text inputs, textareas
    function attachTo(el) {
      if (!el._bongoCat) {
        el._bongoCat = true;
        el.addEventListener('keydown', onKeydown);
        el.addEventListener('keyup', onKeyup);
      }
    }

    // Initial pass
    document.querySelectorAll('input[type="text"], input[type="password"], textarea, input:not([type])').forEach(attachTo);

    // Watch for dynamic elements (like the chat input)
    const mo = new MutationObserver(() => {
      document.querySelectorAll('input[type="text"], input[type="password"], textarea, input:not([type])').forEach(attachTo);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
