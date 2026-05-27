/* 👁 HORROR.JS — "The Site Is Watching"
   ⚠️  Only active on the UNDERWATER theme.
   Features:
   (A) Click counter + whisper overlays
   (B) Idle darkening + ghost messages
   (C) Fake live messages overlay
   (D) creator.log hidden section
   (E) Memory call-out (remembers name)
*/
(() => {
  'use strict';

  // ─── GATE: underwater theme only ─────────────────────────────────────────
  if (localStorage.getItem('nat-theme-override') !== 'underwater') return;

  // ─────────────────────────────────────────────
  // (E) MEMORY: store visitor name for call-outs
  // ─────────────────────────────────────────────
  const MEM_KEY = 'nat-horror-name';
  let rememberedName = localStorage.getItem(MEM_KEY) || '';

  function hookNameInputs() {
    const candidates = [
      document.getElementById('senderName'),
      document.getElementById('msgSenderName'),
      document.querySelector('input[placeholder*="name"]'),
      document.querySelector('input[placeholder*="Name"]'),
    ].filter(Boolean);
    candidates.forEach(inp => {
      inp.addEventListener('blur', () => {
        const v = inp.value.trim();
        if (v && v.length > 1 && v.length < 40) {
          rememberedName = v;
          localStorage.setItem(MEM_KEY, v);
        }
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(hookNameInputs, 1500));
  } else {
    setTimeout(hookNameInputs, 1500);
  }

  // ─────────────────────────────────────────────
  // (A) CLICK COUNTER + WHISPER OVERLAYS
  // ─────────────────────────────────────────────
  let clickCount = parseInt(localStorage.getItem('nat-horror-clicks') || '0');

  const WHISPERS_POOL = [
    'it sees you.',
    'you\'ve been clicking for a while.',
    'the site is counting.',
    'don\'t look away.',
    'you were here before.',
    'it remembers everything.',
    'careful. it\'s watching.',
    'this site never forgets.',
    'still here?',
    'you can\'t unsee this.',
    'every click is logged.',
    'it knows your pattern.',
  ];

  function showWhisper(text, x, y) {
    const el = document.createElement('div');
    el.className = 'horror-whisper';
    el.textContent = text;
    const cx = Math.min(Math.max(x, 10), window.innerWidth - 200);
    const cy = Math.min(Math.max(y - 30, 10), window.innerHeight - 40);
    el.style.cssText = `left:${cx}px;top:${cy}px;`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 700);
    }, 3800);
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#waterCutscene') || e.target.closest('#creatorLog')) return;
    clickCount++;
    try { localStorage.setItem('nat-horror-clicks', String(clickCount)); } catch {}

    if (clickCount === 33)  showWhisper('it sees you.', e.clientX, e.clientY);
    if (clickCount === 66)  showWhisper('you\'ve clicked 66 times.', e.clientX, e.clientY);
    if (clickCount === 100) showWhisper(rememberedName ? `still clicking, ${rememberedName}?` : 'you keep clicking.', e.clientX, e.clientY);
    if (clickCount === 200) showWhisper('the site counts. every. click.', e.clientX, e.clientY);
    if (clickCount === 333) showWhisper('are you trying to break something?', e.clientX, e.clientY);
    if (clickCount > 200 && clickCount % 111 === 0) {
      showWhisper(WHISPERS_POOL[Math.floor(Math.random() * WHISPERS_POOL.length)], e.clientX, e.clientY);
    }
  }, { passive: true });

  // ─────────────────────────────────────────────
  // (B) IDLE DARKENING + GHOST MESSAGES
  // ─────────────────────────────────────────────
  let idleTimer = null;
  let idleEl    = null;

  const IDLE_MSGS = () => [
    'are you still there?',
    rememberedName ? `${rememberedName}… are you there?` : 'hello?',
    'it notices when you\'re idle.',
    'the site keeps running.\neven when you\'re gone.',
    'it watched you leave.\nit\'s waiting.',
    'the deeper you go…\nthe more it remembers you.',
  ];

  function dismissIdle() {
    if (!idleEl) return;
    idleEl.classList.remove('show');
    setTimeout(() => { idleEl?.remove(); idleEl = null; }, 900);
  }

  function triggerIdle() {
    dismissIdle();
    idleEl = document.createElement('div');
    idleEl.id = 'horrorIdle';
    idleEl.className = 'horror-idle-overlay';
    const msgs = IDLE_MSGS();
    const msg  = msgs[Math.floor(Math.random() * msgs.length)];
    idleEl.innerHTML = `<div class="horror-idle-text">${msg.replace(/\n/g, '<br>')}</div>`;
    idleEl.addEventListener('click', dismissIdle);
    document.body.appendChild(idleEl);
    requestAnimationFrame(() => idleEl?.classList.add('show'));
    setTimeout(dismissIdle, 9000);
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(triggerIdle, 42000);
  }

  ['mousemove', 'click', 'keydown', 'touchstart', 'scroll'].forEach(ev =>
    document.addEventListener(ev, resetIdle, { passive: true })
  );
  resetIdle();

  // ─────────────────────────────────────────────
  // (C) FAKE LIVE MESSAGES
  // ─────────────────────────────────────────────
  const FAKE_USERS = [
    'str@nger_444',
    'x̷͎͘u̵͔̽s̷̞̈e̵̖̾r̶̡̔_̵̫͝7̸̼̅7̶̫̓7̷̰͝',
    'anonymous',
    'nobody_here',
    'g̴͔͗ȟ̵͜ȏ̸͖s̸̺̿ẗ̸̟́',
    '???',
    'user_deleted',
    'v̸̦̈́i̴̜͑s̸̘͝i̵̟͒t̴̜̆o̷̙̔r̵̤̀',
  ];
  const FAKE_MSGS = [
    'can you read this?',
    'i was here before you.',
    'don\'t click the profile picture.',
    'i found something in the code.',
    'is this real?',
    'h̴e̸l̵p̸',
    'the creator didn\'t mean to leave this open.',
    'you found me.',
    'null',
    '[message deleted]',
    'i know what you clicked.',
    'don\'t scroll down.',
    'there\'s something at the bottom of the page.',
    'i\'ve been here since the beginning.',
  ];

  let fakeStarted = false;
  function startFakeMessages() {
    if (fakeStarted) return;
    fakeStarted = true;

    function showTypingThenMsg() {
      const typEl = document.createElement('div');
      typEl.className = 'horror-typing';
      typEl.innerHTML = '<span class="htyp-dot"></span><span class="htyp-dot"></span><span class="htyp-dot"></span>';
      document.body.appendChild(typEl);
      requestAnimationFrame(() => typEl.classList.add('show'));

      setTimeout(() => {
        typEl.classList.remove('show');
        setTimeout(() => typEl.remove(), 600);

        const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
        const msg  = FAKE_MSGS[Math.floor(Math.random() * FAKE_MSGS.length)];

        const el = document.createElement('div');
        el.className = 'horror-fake-msg';
        el.innerHTML = `<div class="hfm-user">${user}</div><div class="hfm-text">${msg}</div><div class="hfm-time">just now</div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));

        setTimeout(() => {
          el.classList.add('vanish');
          setTimeout(() => el.remove(), 900);
        }, 5500);
      }, 3200);
    }

    setTimeout(() => {
      showTypingThenMsg();
      const schedule = () => setTimeout(() => { showTypingThenMsg(); schedule(); }, 65000 + Math.random() * 55000);
      schedule();
    }, 45000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startFakeMessages);
  } else {
    startFakeMessages();
  }

  // ─────────────────────────────────────────────
  // (D) CREATOR.LOG — hidden section
  // ─────────────────────────────────────────────
  const LOG_ENTRIES = [
    { t: '2024-03-01 22:08', msg: 'started this site. just wanted somewhere to be me.' },
    { t: '2024-03-12 02:14', msg: 'added badge system. who will ever earn all of them?' },
    { t: '2024-03-19 23:41', msg: 'message board is live. first message: "hi test"' },
    { t: '2024-04-02 01:08', msg: 'someone reacted 50 times in one session. i know who it was.' },
    { t: '2024-04-15 00:33', msg: 'underwater cutscene finished. took 12 hours.' },
    { t: '2024-04-18 03:17', msg: 'no one found the underwater theme yet. hiding it deeper.' },
    { t: '2024-05-01 22:55', msg: 'someone tried to unlock the premium photos. badge awarded. 🤮' },
    { t: '2024-05-04 01:22', msg: 'added potato mode. for the ones running on toasters.' },
    { t: '2024-05-06 03:58', msg: 'horror.js added. this file.' },
    { t: '2024-05-06 04:00', msg: 'the site has been visited more times than i expected.' },
    { t: '2024-05-06 04:13', msg: 'i wonder if anyone will reach 1 billion combos.' },
    { t: '2024-05-06 04:15', msg: 'are you still reading this? you shouldn\'t be here.' },
    { t: '???',              msg: 'i made this because i wanted to be understood.\nnot sure it worked.' },
    { t: '???',              msg: '[REDACTED]' },
    { t: '???',              msg: 'if you found creator.log — hi. i see you too.' },
  ];

  let logOpen = false;

  function buildCreatorLog() {
    const existing = document.getElementById('creatorLog');
    if (existing) {
      existing.classList.toggle('cl-open');
      logOpen = existing.classList.contains('cl-open');
      return;
    }
    logOpen = true;
    const el = document.createElement('div');
    el.id = 'creatorLog';
    el.className = 'creator-log cl-open';
    el.innerHTML = `
      <div class="cl-header">
        <span class="cl-icon">📁</span>
        <span class="cl-title">creator.log</span>
        <button class="cl-close" aria-label="Close">✕</button>
      </div>
      <div class="cl-body">
        ${LOG_ENTRIES.map((e, i) => `
          <div class="cl-entry" style="animation-delay:${i * 0.07}s">
            <span class="cl-time">[${e.t}]</span>
            <span class="cl-msg">${e.msg.replace(/\n/g, '<br>')}</span>
          </div>
        `).join('')}
      </div>
      <div class="cl-footer">— end of log — <span style="opacity:.35">or is it?</span></div>
    `;
    el.querySelector('.cl-close').onclick = () => {
      el.classList.remove('cl-open');
      logOpen = false;
    };
    document.body.appendChild(el);
  }

  function checkHash() {
    if (location.hash === '#creator.log') buildCreatorLog();
  }
  checkHash();
  window.addEventListener('hashchange', checkHash);

  let typedSeq = '';
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    typedSeq = (typedSeq + e.key.toLowerCase()).slice(-7);
    if (typedSeq === 'creator') buildCreatorLog();
  });

  window._openCreatorLog = buildCreatorLog;

})();
