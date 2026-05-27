/* ============================================================
   cutscene-player.js  —  Universal Cinematic Player Engine
   window._launchCutscene(def, handlers)
   ============================================================ */

(function () {

  /* ── Subtitle scramble for glitch lines ─────────────────── */
  const GLITCH_CHARS = '█▓▒░?!/|~<>[]アイウカキク01';
  function scramble(el, finalText) {
    const plain = finalText.replace(/\n/g, ' ');
    let r = 0;
    const iv = setInterval(() => {
      if (r >= plain.length) {
        clearInterval(iv);
        el.innerHTML = finalText.split('\n').map(l => `<span>${l}</span>`).join('');
        return;
      }
      el.innerHTML = `<span>${plain.slice(0, r) + Array.from(
        { length: plain.length - r },
        () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      ).join('')}</span>`;
      r += 4;
    }, 45);
  }

  /* ── Show subtitle with fade-swap ───────────────────────── */
  function showSub(text, style, el) {
    el.classList.remove('cs-show');
    setTimeout(() => {
      el.className = 'cs-sub cs-sub-' + style;
      el.innerHTML = text.split('\n').map(l => `<span>${l}</span>`).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.classList.add('cs-show');
        if (style === 'glitch') scramble(el, text);
      }));
    }, 360);
  }

  /* ── Overlay HTML skeleton ──────────────────────────────── */
  function buildOverlay() {
    const div = document.createElement('div');
    div.className = 'cs-overlay';
    div.innerHTML = `
      <div class="cs-ov-bg" id="csOvBg"></div>
      <div class="cs-ov-vignette"></div>
      <div class="cs-ov-fx" id="csOvFx"></div>
      <div class="cs-ov-sub-wrap">
        <div class="cs-sub" id="csOvSub"></div>
      </div>
      <div class="cs-ov-timebar"><div class="cs-ov-timefill" id="csOvTimeFill"></div></div>
      <button class="cs-ov-skip" id="csOvSkip">skip ▸▸</button>`;
    return div;
  }

  /* ── Main launcher ──────────────────────────────────────── */
  window._launchCutscene = function (def, handlers) {
    /*
      def = {
        id          : string   (unique, used for theme check)
        themeKey    : string   (localStorage key value to match)
        audioSrc    : string
        afterAudioSrc: string | null
        totalSeconds: number
        lines       : [[time, text, style], ...]
        events      : [[time, handlerName], ...]
        rewardItem  : string | null
        rewardBadge : string | null   (usually null — badge from theme activation)
      }
      handlers = { handlerName: fn(fxEl, bgEl), ... }
    */

    let _launched = false;

    function launch() {
      if (_launched) return;
      _launched = true;

      /* Build overlay */
      const ov = buildOverlay();
      ov.id = 'cutscene_' + def.id;
      if (def.autoStart) ov.classList.add('cs-ov-autostart');
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('cs-ov-show'));

      /* Elements */
      const bgEl     = document.getElementById('csOvBg');
      const fxEl     = document.getElementById('csOvFx');
      const subEl    = document.getElementById('csOvSub');
      const timeFill = document.getElementById('csOvTimeFill');
      const skipBtn  = document.getElementById('csOvSkip');

      /* Audio */
      const audio = new Audio(def.audioSrc);
      audio.volume = 0.88;

      /* State */
      let skipped      = false;
      let rafId        = null;
      const firedLines = new Set();
      const firedEvts  = new Set();

      /* ── Tick loop ────────────────────────────────────────── */
      function tick() {
        if (skipped) return;
        const t = audio.currentTime;

        /* Progress bar */
        if (timeFill) timeFill.style.width = Math.min(100, t / def.totalSeconds * 100) + '%';

        /* Events */
        for (const [evtTime, evtName] of def.events) {
          if (t >= evtTime && !firedEvts.has(evtName + '_' + evtTime)) {
            firedEvts.add(evtName + '_' + evtTime);
            try { handlers[evtName]?.(fxEl, bgEl); } catch (e) {}
          }
        }

        /* Subtitle lines — find the most recent eligible line */
        let bestIdx = -1;
        for (let i = 0; i < def.lines.length; i++) {
          if (t >= def.lines[i][0]) bestIdx = i; else break;
        }
        if (bestIdx >= 0 && !firedLines.has(bestIdx)) {
          firedLines.add(bestIdx);
          const [, text, style] = def.lines[bestIdx];
          showSub(text, style, subEl);
        }

        if (t < def.totalSeconds) {
          rafId = requestAnimationFrame(tick);
        } else {
          finish(false);
        }
      }

      /* ── After-audio phase (plays ambient track) ─────────── */
      function switchToAfterAudio() {
        if (!def.afterAudioSrc) return;
        const bg = document.getElementById('bgMusic');
        if (!bg) return;
        bg.src    = def.afterAudioSrc;
        bg.volume = window.natVolume || 0.8;
        bg.muted  = false;
        bg.loop   = true;
        bg.load();
        bg.play().catch(() => {});
      }

      /* ── Teardown ─────────────────────────────────────────── */
      function finish(wasSkipped) {
        if (skipped) return;
        skipped = true;
        if (rafId) cancelAnimationFrame(rafId);
        audio.pause();
        audio.src = '';
        /* Call each handler's cleanup if present */
        try { handlers._cleanup?.(fxEl, bgEl); } catch (e) {}
        ov.classList.add('cs-ov-ending');
        setTimeout(() => ov.remove(), 900);
        if (!wasSkipped) {
          setTimeout(() => {
            switchToAfterAudio();
            if (def.rewardItem && window.awardItem) window.awardItem(def.rewardItem);
            if (def.rewardBadge) {
              if (window.awardLocalBadge) window.awardLocalBadge(def.rewardBadge);
              const db = window._natDB;
              if (db) {
                const uid = db.getUID?.();
                if (uid) db.set(db.ref(db.db, 'userSpecialBadges/' + uid + '/' + def.rewardBadge), true).catch(() => {});
              }
            }
          }, 1200);
        }
      }

      /* ── Audio playback ───────────────────────────────────── */
      function startAudio() {
        audio.play().then(() => {
          audio.addEventListener('ended', () => finish(false), { once: true });
          rafId = requestAnimationFrame(tick);
        }).catch(() => {
          /* autoplay blocked — fall back to tick-only (silent) */
          rafId = requestAnimationFrame(tick);
        });
      }

      if (def.autoStart) {
        /* Start screen click was already a valid user gesture — go immediately */
        startAudio();
      } else {
        /* Legacy path: wait for first click on the overlay */
        ov.addEventListener('click', function onFirst(e) {
          if (e.target === skipBtn) return;
          ov.removeEventListener('click', onFirst, { capture: true });
          startAudio();
        }, { capture: true });
      }

      skipBtn.addEventListener('click', () => finish(true));
    }

    /* ── MutationObserver launch hook (waits for loader hide) ─ */
    function startWatch() {
      const loader = document.getElementById('loader');
      if (!loader) { setTimeout(launch, 80); return; }
      const alreadyDone = loader.style.display === 'none' ||
                          parseFloat(loader.style.opacity || '1') < 0.5;
      if (alreadyDone) { setTimeout(launch, 50); return; }
      const obs = new MutationObserver(() => {
        const op = parseFloat(loader.style.opacity || '1');
        if (op < 0.5 || loader.style.display === 'none') {
          obs.disconnect();
          setTimeout(launch, 50);
        }
      });
      obs.observe(loader, { attributes: true, attributeFilter: ['style'] });
    }

    /* Only run when the matching theme is active */
    if (localStorage.getItem('nat-theme-override') !== def.themeKey) return;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startWatch, { once: true });
    } else {
      startWatch();
    }

    /* Expose direct launcher (for dev / manual trigger) */
    window['_launch' + def.id.charAt(0).toUpperCase() + def.id.slice(1) + 'CutsceneNow'] = launch;
  };

})();
