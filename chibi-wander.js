/* Chibi — lives in the Chibi tab. Tap/click to trigger random gif reactions. */
(function () {
  const BUBBLES = [
    'hiii 👋', 'tap me again 🥺', 'ehh 😭', 'boo! 👻',
    'owo', '😆', 'stop that 😤', 'hihi 🌸', 'go do ur homework', '🎀',
    'kaya mo yan!', 'Shalom po 🙏', 'ayy galing mo', 'uwu',
  ];

  // Click animations — cycles Angry → Happy → Idle → repeat
  const CLICK_ANIMS = [
    'animations/angry.gif',
    'animations/happy.gif',
    'animations/idle.gif',
  ];
  let animIdx = 0;

  let bubbleTimer = null;

  function showBubble(text) {
    const bubble = document.getElementById('chibiBubble');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.style.opacity = '1';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.style.opacity = '0'; }, 2200);
  }

  function isChibiHidden() {
    return localStorage.getItem('nat-chibi-hide') === '1';
  }

  function isMuted() {
    return localStorage.getItem('nat-chibi-mute') === '1';
  }

  function isOnChibiTab() {
    return localStorage.getItem('nat-tab') === 'chibi';
  }

  function init() {
    const wrap = document.getElementById('chibiWrap');
    if (!wrap) return;

    wrap.classList.add('chibi-tab-inner');
    wrap.style.position = 'relative';
    wrap.style.display  = 'inline-flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';

    const img = document.getElementById('chibi');
    if (img) {
      img.draggable = false;
      img.style.cursor = 'pointer';

      img.addEventListener('click', () => {
        // Don't react if chibi is hidden or on a different tab
        if (isChibiHidden()) return;

        // Pick next animation in cycle
        const gifSrc = CLICK_ANIMS[animIdx % CLICK_ANIMS.length];
        animIdx++;

        // Use playChibi if available (from app.js), otherwise swap src directly
        if (typeof window.playChibi === 'function') {
          window.playChibi(gifSrc, false);
        } else {
          img.src = gifSrc;
          setTimeout(() => { img.src = 'animations/idle.gif'; }, 2000);
        }

        // Show a random bubble
        const text = BUBBLES[Math.floor(Math.random() * BUBBLES.length)];
        showBubble(text);

        // Bounce effect
        img.style.transform = 'scale(0.88)';
        setTimeout(() => { img.style.transform = ''; }, 180);
      });
    }

    // Suppress idle chibi chatter when hidden, muted, or on a different tab
    document.addEventListener('visibilitychange', () => {
      const bubble = document.getElementById('chibiBubble');
      if (bubble && document.hidden) bubble.style.opacity = '0';
    });

    // Patch the global chibiSay to respect hide/mute/tab
    const _origSay = window.chibiSay;
    window.chibiSay = function(text, duration) {
      if (isChibiHidden()) return;
      if (!isOnChibiTab() && document.hidden) return;
      if (_origSay) _origSay(text, duration);
      else showBubble(text);
    };

    // Patch idle loop: stop chibi gif when hidden
    const _origPlayChibi = window.playChibi;
    if (_origPlayChibi) {
      window.playChibi = function(src, loop) {
        if (isChibiHidden()) return;
        _origPlayChibi(src, loop);
      };
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
