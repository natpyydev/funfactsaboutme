/* 🐱 FULL BONGO CAT SYSTEM
   ✅ Typing animation
   ✅ Mouse click animation
   ✅ Draggable
   ✅ Mobile support
   ✅ Saved position
   ✅ Overlay-ready
   ✅ Fixed mobile double-trigger
   ✅ Smooth spam typing
*/

(() => {

  const IDLE_FRAMES = [
    'bongo/idle1.png',
    'bongo/idle2.png',
    'bongo/idle3.png'
  ];

  const LEFT_FRAME = 'bongo/left.png';
  const RIGHT_FRAME = 'bongo/right.png';
  const MOUSECLICK_FRAME = 'bongo/mouseclick.png';

  const OPACITY_IDLE = '0.55';
  const OPACITY_ACTIVE = '1';

  const CAT_W = 90;
  const CAT_H = 90;

  let container;
  let img;

  let nextHand = 'left';
  let idleIdx = 0;

  let animTimer = null;
  let fadeTimer = null;
  let posTimer = null;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  // AUDIO
  const audioCtx = new (
    window.AudioContext ||
    window.webkitAudioContext
  )();

  function unlockAudio() {
    audioCtx.resume();
  }

  function playTapSound() {

    const osc =
      audioCtx.createOscillator();

    const gain =
      audioCtx.createGain();

    osc.type = 'triangle';

    osc.frequency.value = 480;

    gain.gain.value = 0.018;

    osc.connect(gain);

    gain.connect(
      audioCtx.destination
    );

    osc.start();

    osc.frequency.exponentialRampToValueAtTime(
      420,
      audioCtx.currentTime + 0.04
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + 0.04
    );

    osc.stop(
      audioCtx.currentTime + 0.04
    );
  }

  function playClickSound() {

    const osc =
      audioCtx.createOscillator();

    const gain =
      audioCtx.createGain();

    osc.type = 'triangle';

    osc.frequency.value = 220;

    gain.gain.value = 0.02;

    osc.connect(gain);

    gain.connect(
      audioCtx.destination
    );

    osc.start();

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + 0.06
    );

    osc.stop(
      audioCtx.currentTime + 0.06
    );
  }

  function build() {

    if (document.getElementById('bongoCat')) return;

    container = document.createElement('div');

    container.id = 'bongoCat';

    container.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:12px',
      'width:' + CAT_W + 'px',
      'height:' + CAT_H + 'px',
      'z-index:999999',
      'pointer-events:auto',
      'touch-action:none',
      'cursor:grab',
      'opacity:' + OPACITY_IDLE,
      'transition:opacity 0.25s ease, top 0.2s ease, left 0.2s ease, transform 0.08s ease',
      'image-rendering:pixelated',
      'user-select:none'
    ].join(';');

    img = document.createElement('img');

    img.id = 'bongoCatImg';

    img.style.cssText = [
      'width:100%',
      'height:100%',
      'object-fit:contain',
      'image-rendering:pixelated',
      'pointer-events:none'
    ].join(';');

    img.draggable = false;

    img.src = IDLE_FRAMES[0];

    container.appendChild(img);

    document.body.appendChild(container);

    const savedX =
      localStorage.getItem('bongoX');

    const savedY =
      localStorage.getItem('bongoY');

    if (savedX && savedY) {

      container.style.left = savedX;
      container.style.top = savedY;
      container.style.right = 'auto';
    }
  }

  function setOpacity(val) {

    if (container) {
      container.style.opacity = val;
    }
  }

  function setFrame(src) {

    if (img) {
      img.src = src;
    }
  }

  function advanceIdle() {

    setFrame(
      IDLE_FRAMES[
        idleIdx++
        % IDLE_FRAMES.length
      ]
    );
  }

  function squash() {

    container.style.transform =
      'scale(1.08,0.92)';

    setTimeout(() => {

      container.style.transform =
        'scale(1,1)';

    }, 70);
  }

  function positionAbove(el) {

    if (!container || !el || dragging)
      return;

    const rect =
      el.getBoundingClientRect();

    const vw =
      window.innerWidth;

    const catLeft = Math.min(
      Math.max(
        0,
        rect.left +
        rect.width / 2 -
        CAT_W / 2
      ),
      vw - CAT_W - 8
    );

    const catTop = Math.max(
      4,
      rect.top - CAT_H - 6
    );

    container.style.top =
      catTop + 'px';

    container.style.left =
      catLeft + 'px';

    container.style.right =
      'auto';
  }

  function positionDefault() {

    if (!container || dragging)
      return;

    const savedX =
      localStorage.getItem('bongoX');

    const savedY =
      localStorage.getItem('bongoY');

    if (savedX && savedY) {

      container.style.left =
        savedX;

      container.style.top =
        savedY;

      container.style.right =
        'auto';

      return;
    }

    container.style.top =
      '12px';

    container.style.right =
      '12px';

    container.style.left =
      'auto';
  }

  function animateKey() {

    if (dragging) return;

    clearTimeout(animTimer);
    clearTimeout(fadeTimer);

    setOpacity(
      OPACITY_ACTIVE
    );

    playTapSound();

    const focused =
      document.activeElement;

    if (
      focused &&
      (
        focused.tagName === 'INPUT' ||
        focused.tagName === 'TEXTAREA' ||
        focused.isContentEditable
      )
    ) {
      positionAbove(focused);
    }

    const hand =
      nextHand;

    nextHand =
      hand === 'left'
      ? 'right'
      : 'left';

    advanceIdle();

    squash();

    setFrame(
  hand === 'left' ?
  LEFT_FRAME :
  RIGHT_FRAME
);

clearTimeout(animTimer);

animTimer = setTimeout(() => {
  
  advanceIdle();
  
  fadeTimer = setTimeout(() => {
    
    setOpacity(
      OPACITY_IDLE
    );
    
    positionDefault();
    
  }, 1200);
  
}, 90);
  }

  function animateMouse() {

    if (dragging) return;

    clearTimeout(animTimer);
    clearTimeout(fadeTimer);

    setOpacity(
      OPACITY_ACTIVE
    );

    playClickSound();

    advanceIdle();

    squash();

    animTimer = setTimeout(() => {

      setFrame(
        MOUSECLICK_FRAME
      );

      animTimer = setTimeout(() => {

        advanceIdle();

        fadeTimer = setTimeout(() => {

          setOpacity(
            OPACITY_IDLE
          );

        }, 1200);

      }, 110);

    }, 60);
  }

  function isTypingKey(key) {

    return (
      (key.length === 1 &&
      key !== 'Dead') ||

      key === 'Backspace' ||
      key === 'Delete' ||
      key === 'Enter' ||
      key === ' '
    );
  }

  function handleKeydown(e) {

    const active =
      document.activeElement;

    const tag =
      (active?.tagName || '')
      .toLowerCase();

    const editable =
      active?.isContentEditable;

    if (
      tag === 'input' ||
      tag === 'textarea' ||
      editable
    ) {

      if (isTypingKey(e.key)) {
        animateKey();
      }
    }
  }

  function enableDragging() {

    const startDrag = (x, y) => {

      dragging = true;

      const rect =
        container.getBoundingClientRect();

      offsetX =
        x - rect.left;

      offsetY =
        y - rect.top;

      container.style.cursor =
        'grabbing';

      container.style.transition =
        'opacity 0.25s ease';
    };

    const moveDrag = (x, y) => {

      if (!dragging) return;

      const left =
        x - offsetX;

      const top =
        y - offsetY;

      container.style.left =
        left + 'px';

      container.style.top =
        top + 'px';

      container.style.right =
        'auto';

      localStorage.setItem(
        'bongoX',
        container.style.left
      );

      localStorage.setItem(
        'bongoY',
        container.style.top
      );
    };

    const endDrag = () => {

      dragging = false;

      container.style.cursor =
        'grab';

      container.style.transition =
        'opacity 0.25s ease, top 0.2s ease, left 0.2s ease, transform 0.08s ease';
    };

    container.addEventListener(
      'pointerdown',
      (e) => {

        startDrag(
          e.clientX,
          e.clientY
        );

      }
    );

    document.addEventListener(
      'pointermove',
      (e) => {

        moveDrag(
          e.clientX,
          e.clientY
        );

      }
    );

    document.addEventListener(
      'pointerup',
      endDrag
    );
  }

  function init() {

    build();

    enableDragging();

    document.addEventListener(
      'click',
      unlockAudio,
      { once:true }
    );

    const isMobile =
      /Android|iPhone|iPad|iPod/i
      .test(navigator.userAgent);

    if (isMobile) {

      window.addEventListener(
        'input',
        (e) => {

          const target = e.target;

          const tag =
            (target?.tagName || '')
            .toLowerCase();

          const editable =
            target?.isContentEditable;

          if (
            tag === 'input' ||
            tag === 'textarea' ||
            editable
          ) {
            animateKey();
          }

        },
        true
      );

    } else {

      document.addEventListener(
        'keydown',
        handleKeydown,
        true
      );
    }

    document.addEventListener(
      'pointerdown',
      animateMouse
    );

    document.addEventListener(
      'focusout',
      () => {

        clearTimeout(posTimer);

        posTimer = setTimeout(() => {

          const active =
            document.activeElement;

          if (
            !active ||

            (
              active.tagName !== 'INPUT' &&
              active.tagName !== 'TEXTAREA' &&
              !active.isContentEditable
            )
          ) {
            positionDefault();
          }

        }, 300);

      }
    );
  }

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();

  }

})();