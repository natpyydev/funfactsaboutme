/* ============================================================
   cutscene-start-cyber.js
   Cyber biometric start screen.
   Injects a fullscreen overlay BEFORE cutscene-player.js runs audio.
   Architecture: called by cutscene-cyber.js before _launchCutscene.
   Exports: window._showCyberStartScreen(onComplete)
   ============================================================ */

(function () {
  'use strict';

  /* ── SVG fingerprint (procedural-looking lines) ─────────── */
  const FP_SVG = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="rgba(0,255,80,0.7)" stroke-linecap="round">
    <!-- outer whorls -->
    <path d="M60 10 C28 10 8 35 8 60 C8 92 30 112 60 112 C90 112 112 92 112 60 C112 35 92 10 60 10"/>
    <path d="M60 20 C34 20 16 38 16 60 C16 86 34 104 60 104 C86 104 104 86 104 60 C104 38 86 20 60 20"/>
    <path d="M60 28 C38 28 24 44 24 60 C24 78 38 94 60 94 C82 94 96 78 96 60 C96 44 82 28 60 28"/>
    <path d="M60 36 C43 36 32 48 32 60 C32 74 43 86 60 86 C77 86 88 74 88 60 C88 48 77 36 60 36"/>
    <path d="M60 44 C48 44 40 52 40 60 C40 70 48 78 60 78 C72 78 80 70 80 60 C80 52 72 44 60 44"/>
    <path d="M60 51 C54 51 48 55 48 60 C48 66 54 70 60 70"/>
    <!-- ridge details top -->
    <path d="M44 28 C38 20 32 12 30 6"/>
    <path d="M76 28 C82 20 88 12 90 6"/>
    <path d="M28 48 C22 44 14 42 10 40"/>
    <path d="M92 48 C98 44 106 42 110 40"/>
    <path d="M28 72 C20 76 12 80 8 84"/>
    <path d="M92 72 C100 76 108 80 112 84"/>
    <!-- center dot -->
    <circle cx="60" cy="60" r="3" fill="rgba(0,255,80,0.6)" stroke="none"/>
  </svg>`;

  /* ── Typing sequences ────────────────────────────────────── */
  const BOOT_LINES = [
    'SYSTEM ONLINE…',
    'BIOMETRIC MODULE LOADED',
    'SCANNING…',
  ];
  const VERIFIED_LINES = [
    'MATCH FOUND',
    'IDENTITY CONFIRMED',
    'ACCESS GRANTED',
  ];

  /* ── Utility ─────────────────────────────────────────────── */
  function raf(fn) { return requestAnimationFrame(fn); }

  function typeText(el, text, speed, onDone) {
    let i = 0;
    el.textContent = '';
    function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, speed);
      } else if (onDone) {
        onDone();
      }
    }
    setTimeout(step, 0);
  }

  /* ── Main function ──────────────────────────────────────── */
  window._showCyberStartScreen = function (onComplete) {
    /* Guard: don't double-inject */
    if (document.getElementById('cs-start-cyber')) {
      onComplete?.();
      return;
    }

    /* ── DOM ─────────────────────────────────────────────── */
    const el = document.createElement('div');
    el.id        = 'cs-start-cyber';
    el.className = 'cs-start cs-start-cyber';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Click to begin cutscene');

    el.innerHTML = `
      <!-- Scanline sweep -->
      <div class="cbs-sweep" aria-hidden="true"></div>

      <!-- Corner brackets -->
      <div class="cbs-brackets" aria-hidden="true"></div>

      <!-- Fingerprint + text -->
      <div class="cbs-fp-wrap">
        <div class="cbs-fp" id="cbsFpRoot">
          <div class="cbs-fp-svg" id="cbsFpSvg">${FP_SVG}</div>
          <div class="cbs-fp-ring" aria-hidden="true"></div>
          <div class="cbs-fp-scan" aria-hidden="true"></div>
        </div>
        <div class="cbs-title" id="cbsTitle">VERIFY IDENTITY</div>
        <div class="cbs-status cbs-status-cursor" id="cbsStatus"></div>
      </div>

      <!-- Click prompt -->
      <div class="cbs-prompt" id="cbsPrompt">[ CLICK TO AUTHENTICATE ]</div>
    `;

    document.body.appendChild(el);

    /* ── Elements ────────────────────────────────────────── */
    const statusEl = el.querySelector('#cbsStatus');
    const promptEl = el.querySelector('#cbsPrompt');
    const fpRoot   = el.querySelector('#cbsFpRoot');

    /* ── Boot typing sequence ────────────────────────────── */
    let lineIdx    = 0;
    let canClick   = false;
    let exiting    = false;

    function runBootLine() {
      if (lineIdx >= BOOT_LINES.length) {
        canClick = true;
        promptEl.style.opacity = '';  /* restore pulse */
        return;
      }
      typeText(statusEl, BOOT_LINES[lineIdx], 38, () => {
        lineIdx++;
        setTimeout(runBootLine, 420);
      });
    }

    /* Start typing after brief mount delay */
    setTimeout(runBootLine, 300);

    /* Hide prompt during initial typing */
    promptEl.style.opacity = '0';
    setTimeout(() => { promptEl.style.opacity = ''; }, BOOT_LINES.join('').length * 38 + 800);

    /* ── Click / tap handler ─────────────────────────────── */
    function onActivate() {
      if (!canClick || exiting) return;
      exiting = true;

      el.removeEventListener('click', onActivate);
      el.removeEventListener('keydown', onKeyActivate);

      /* Verified state */
      fpRoot.classList.add('cbs-fp-verified');
      statusEl.classList.remove('cbs-status-cursor');

      let vi = 0;
      function runVerifiedLine() {
        if (vi >= VERIFIED_LINES.length) {
          /* Glitch exit — fire onComplete the moment animation starts so the
             cutscene overlay mounts underneath while we glitch out.
             This eliminates the black-gap between start screen and cutscene. */
          setTimeout(() => {
            el.classList.add('cbs-exiting');
            onComplete?.();  /* launch cutscene immediately, don't wait for anim */
            el.addEventListener('animationend', () => el.remove(), { once: true });
          }, 350);
          return;
        }
        typeText(statusEl, VERIFIED_LINES[vi], 30, () => {
          vi++;
          setTimeout(runVerifiedLine, 280);
        });
      }
      runVerifiedLine();
    }

    function onKeyActivate(e) {
      if (e.key === 'Enter' || e.key === ' ') onActivate();
    }

    el.addEventListener('click', onActivate);
    el.addEventListener('keydown', onKeyActivate);
  };

})();
