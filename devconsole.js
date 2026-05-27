/* 🛠 NAT DEV CONSOLE — admin-only floating JS console
   Open/close: Ctrl+` (backtick)   or   window._natConsole.open()
   Only renders for admin UIDs — invisible to all other users.
*/
(function () {
  var ADMIN_UIDS = [
    'zNDEej9J3kg79fUYxJjxLqrXJpz2',
    'FfSIOOqNV6NTqb4eKV8RbAARDm33',
    '8IumnftXW1gJCa4iNbicZ0M0LOg2',
  ];

  var cmdHistory = [];
  var histIdx    = -1;
  var panel, outputEl, inputEl;
  var built = false;

  // ── wait for auth, then check if admin ──────────────────────────────────
  function waitForAdmin(cb, tries) {
    tries = tries || 0;
    var db  = window._natDB;
    if (!db) { if (tries < 100) setTimeout(function(){ waitForAdmin(cb, tries+1); }, 200); return; }
    var uid = db.getUID();
    if (!uid) { if (tries < 100) setTimeout(function(){ waitForAdmin(cb, tries+1); }, 200); return; }
    if (ADMIN_UIDS.indexOf(uid) !== -1) cb();
  }

  // ── build DOM (admin only) ──────────────────────────────────────────────
  function build() {
    if (built) return;
    built = true;

    var style = document.createElement('style');
    style.textContent = [
      '#natDevConsole{',
        'position:fixed;bottom:0;right:0;',
        'width:480px;max-width:100vw;height:320px;',
        'background:#0d0d12;',
        'border-top:2px solid #ff7eb6;border-left:2px solid #ff7eb6;',
        'border-radius:12px 0 0 0;',
        'display:flex;flex-direction:column;',
        'font-family:"Courier New",monospace;font-size:12px;',
        'z-index:999999;',
        'box-shadow:-4px -4px 24px rgba(255,126,182,.25);',
        'transform:translateY(100%);',
        'transition:transform .25s cubic-bezier(.4,0,.2,1);',
        'pointer-events:none;',
      '}',
      '#natDevConsole.nat-dc-open{transform:translateY(0);pointer-events:all;}',
      '#natDcBar{',
        'display:flex;align-items:center;gap:8px;',
        'padding:6px 10px;background:#1a0d1a;',
        'border-radius:12px 0 0 0;border-bottom:1px solid #2a1a2a;',
        'user-select:none;',
      '}',
      '#natDcBar .dc-title{flex:1;color:#ff7eb6;font-weight:700;font-size:11px;letter-spacing:.5px;}',
      '#natDcBar button{background:none;border:none;cursor:pointer;padding:2px 6px;color:#888;font-size:13px;border-radius:4px;line-height:1;}',
      '#natDcBar button:hover{background:#2a1a2a;color:#ff7eb6;}',
      '#natDcOut{flex:1;overflow-y:auto;padding:6px 10px;display:flex;flex-direction:column;gap:2px;}',
      '#natDcOut::-webkit-scrollbar{width:4px;}',
      '#natDcOut::-webkit-scrollbar-thumb{background:#3a1a3a;border-radius:2px;}',
      '.dc-line{padding:2px 0;border-bottom:1px solid #1a0d1a;word-break:break-all;white-space:pre-wrap;line-height:1.4;}',
      '.dc-line.cmd{color:#c47bff;}',
      '.dc-line.ok{color:#8ee88e;}',
      '.dc-line.info{color:#aaddff;}',
      '.dc-line.warn{color:#f9c74f;}',
      '.dc-line.error{color:#ff6b6b;}',
      '.dc-line.ret{color:#e0e0e0;}',
      '#natDcInputRow{display:flex;align-items:center;border-top:1px solid #2a1a2a;padding:0 0 0 10px;}',
      '#natDcInputRow .dc-prompt{color:#ff7eb6;font-weight:700;margin-right:6px;}',
      '#natDcInput{flex:1;background:transparent;border:none;outline:none;color:#e0e0e0;font-family:"Courier New",monospace;font-size:12px;padding:6px 0;caret-color:#ff7eb6;}',
      '#natDcInput::placeholder{color:#555;}',
      '#natDcRunBtn{background:#ff7eb6;border:none;cursor:pointer;color:#0d0d12;font-weight:700;font-size:11px;padding:6px 12px;transition:background .15s;}',
      '#natDcRunBtn:hover{background:#c47bff;}',
      '#natDcFab{',
        'position:fixed;bottom:16px;right:16px;',
        'width:40px;height:40px;',
        'background:#1a0d1a;border:2px solid #ff7eb6;border-radius:50%;',
        'cursor:pointer;z-index:999998;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:18px;color:#ff7eb6;',
        'box-shadow:0 2px 12px rgba(255,126,182,.3);',
        'transition:transform .15s,box-shadow .15s;',
      '}',
      '#natDcFab:hover{transform:scale(1.1);box-shadow:0 4px 20px rgba(255,126,182,.5);}',
    ].join('');
    document.head.appendChild(style);

    // floating toggle button
    var fab = document.createElement('button');
    fab.id = 'natDcFab';
    fab.title = 'Dev Console  (Ctrl+`)';
    fab.textContent = '🛠';
    fab.onclick = toggle;
    document.body.appendChild(fab);

    // panel
    panel = document.createElement('div');
    panel.id = 'natDevConsole';
    panel.innerHTML = [
      '<div id="natDcBar">',
        '<span class="dc-title">🛠 nat dev console</span>',
        '<button id="natDcClear" title="Clear">⊘ clear</button>',
        '<button id="natDcClose" title="Close">✕</button>',
      '</div>',
      '<div id="natDcOut"></div>',
      '<div id="natDcInputRow">',
        '<span class="dc-prompt">&gt;</span>',
        '<input id="natDcInput" type="text"',
          ' placeholder="_seedVisitors() · _seedMapPins() · any JS…"',
          ' autocomplete="off" spellcheck="false"/>',
        '<button id="natDcRunBtn">▶ run</button>',
      '</div>',
    ].join('');
    document.body.appendChild(panel);

    outputEl = document.getElementById('natDcOut');
    inputEl  = document.getElementById('natDcInput');

    document.getElementById('natDcClose').onclick = close;
    document.getElementById('natDcClear').onclick  = clearOut;
    document.getElementById('natDcRunBtn').onclick = run;

    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { run(); return; }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < cmdHistory.length - 1) {
          histIdx++;
          inputEl.value = cmdHistory[cmdHistory.length - 1 - histIdx];
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; inputEl.value = cmdHistory[cmdHistory.length - 1 - histIdx]; }
        else { histIdx = -1; inputEl.value = ''; }
        return;
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === '`' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggle(); }
    });

    log('nat dev console ready 🛠', 'info');
    log('try: _seedVisitors(200)  ·  _seedMapPins()  ·  _natDB.getUID()', 'info');
    log('tip: ↑↓ for history · Ctrl+` to show/hide', 'info');
  }

  // ── panel control ───────────────────────────────────────────────────────
  function toggle() { if (panel) { panel.classList.contains('nat-dc-open') ? close() : open(); } }
  function open()   { if (panel) { panel.classList.add('nat-dc-open'); inputEl.focus(); } }
  function close()  { if (panel) panel.classList.remove('nat-dc-open'); }
  function clearOut(){ if (outputEl) outputEl.innerHTML = ''; }

  // ── log a line ──────────────────────────────────────────────────────────
  function log(msg, level) {
    if (!outputEl) { console.log('[natConsole]', msg); return; }
    var line = document.createElement('div');
    line.className = 'dc-line ' + (level || 'info');
    var d   = new Date();
    var ts  = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    line.textContent = '[' + ts + '] ' + String(msg);
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }
  function pad(n){ return n < 10 ? '0'+n : ''+n; }

  // ── execute ─────────────────────────────────────────────────────────────
  function run() {
    var code = inputEl.value.trim();
    if (!code) return;
    cmdHistory.push(code);
    histIdx = -1;
    inputEl.value = '';

    log('> ' + code, 'cmd');

    try {
      // try as expression first (shows return value)
      // eslint-disable-next-line no-new-func
      var result = (new Function('return (' + code + ')'))();
      if (result instanceof Promise) {
        result
          .then(function(v) { if (v !== undefined) log('← ' + fmt(v), 'ret'); })
          .catch(function(e) { log('✗ ' + (e && e.message ? e.message : String(e)), 'error'); });
        log('← Promise…', 'ok');
      } else if (result !== undefined) {
        log('← ' + fmt(result), 'ret');
      }
    } catch (_) {
      // fall back to statement execution
      try {
        // eslint-disable-next-line no-new-func
        (new Function(code))();
      } catch(e2) {
        log('✗ ' + (e2 && e2.message ? e2.message : String(e2)), 'error');
      }
    }
  }

  function fmt(v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    try { return JSON.stringify(v, null, 2); } catch(_) { return String(v); }
  }

  // ── global API ──────────────────────────────────────────────────────────
  // Available immediately so other scripts can call _natConsoleLog before the panel builds
  window._natConsoleLog = log;
  window._natConsole = { open: open, close: close, toggle: toggle, log: log, clear: clearOut };

  // ── boot ─────────────────────────────────────────────────────────────────
  waitForAdmin(function() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
  });
})();
