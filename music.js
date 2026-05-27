/* ⚙️ SETTINGS WIDGET — music, chibi controls, themes, graphics, volume, sfx */
(() => {
  const THEME_OVERRIDE_KEY = 'nat-theme-override';
  const themeOverride = localStorage.getItem(THEME_OVERRIDE_KEY);

  // Apply special theme body class immediately so the page looks right on load
  if (themeOverride && themeOverride !== '') {
    const _apply = () => document.body.classList.add(`theme-${themeOverride}`);
    if (document.body) _apply();
    else document.addEventListener('DOMContentLoaded', _apply, { once: true });
  }

  // ── Auto-switch music based on active theme ──
  const BUILTIN_SONGS = (() => {
    if (themeOverride === 'christmas')  return [
      { name: '🎄 Cozy Bells (Christmas)', src: 'audio/Cozy Bells.wav' },
      { name: 'Cozy Clicks',               src: 'audio/Cozy Clicks.mp3' },
    ];
    if (themeOverride === 'underwater') return [
      { name: '🌊 Cozy Water (Underwater)', src: 'audio/cozywater.wav' },
      { name: 'Cozy Clicks',                src: 'audio/Cozy Clicks.mp3' },
    ];
    if (themeOverride === 'cyber')  return [{ name: '💻 Synthwave (Cyber)',      src: 'audio/synthwave.wav' }, { name: 'Cozy Clicks', src: 'audio/Cozy Clicks.mp3' }];
    if (themeOverride === 'hell')   return [{ name: '🔥 Infernal Bass (Hell)',   src: 'audio/hell.wav'       }, { name: 'Cozy Clicks', src: 'audio/Cozy Clicks.mp3' }];
    if (themeOverride === 'heaven') return [{ name: '✨ Angelic Harp (Heaven)',  src: 'audio/heaven.wav'     }, { name: 'Cozy Clicks', src: 'audio/Cozy Clicks.mp3' }];
    if (themeOverride === 'forest') return [{ name: '🌿 Forest Ambience',        src: 'audio/forest.wav'     }, { name: 'Cozy Clicks', src: 'audio/Cozy Clicks.mp3' }];
    if (themeOverride === 'space')  return [{ name: '🚀 Cosmic Drift (Space)',   src: 'audio/space.wav'      }, { name: 'Cozy Clicks', src: 'audio/Cozy Clicks.mp3' }];
    if (themeOverride === 'y2k')    return [{ name: '💾 Y2K Bop',               src: 'audio/y2k.wav'        }, { name: 'Cozy Clicks', src: 'audio/Cozy Clicks.mp3' }];
    return [{ name: 'Cozy Clicks (default)', src: 'audio/Cozy Clicks.mp3' }];
  })();

  const THEMES = [
    { id: 'pink',   icon: '🌸', label: 'Pink' },
    { id: 'purple', icon: '💜', label: 'Purple' },
    { id: 'light',  icon: '☀️', label: 'Light' },
    { id: 'dark',   icon: '🌙', label: 'Dark' },
  ];
  const GRAPHICS = [
    { id: 'best',          icon: '🌟', label: 'Best',          desc: 'All effects' },
    { id: 'performance',   icon: '⚡', label: 'Performance',   desc: 'Reduced lag' },
    { id: 'superformance', icon: '🚄', label: 'Superformance', desc: '??? hidden' },
    { id: 'potato',        icon: '🥔', label: 'Potato PC',     desc: 'Ultra low' },
  ];

  // All special override themes in one table — easy to extend
  const OVERRIDE_THEMES = [
    // items[] = awarded on theme activation (kept for Christmas since it has no cutscene yet)
    // All cutscene themes: items[] empty here — item awarded inside the cutscene finish() on full watch
    { id: 'christmas', onLabel: '🎄 Christmas ON', offLabel: '🎅 Christmas', cls: 'mu-christmas-btn',  badge: 'badge_christmas',     items: ['item_santa_hat','item_santa_letter'] },
    { id: 'underwater',onLabel: '🌊 Underwater ON',offLabel: '🌊 Underwater',cls: 'mu-underwater-btn', badge: 'badge_deep_abyss',    items: [] },
    { id: 'cyber',     onLabel: '💻 Cyber ON',     offLabel: '💻 Cyber',     cls: 'mu-cyber-btn',      badge: 'badge_cyber_agent',   items: [] },
    { id: 'hell',      onLabel: '🔥 Hell ON',       offLabel: '🔥 Hell',      cls: 'mu-hell-btn',       badge: 'badge_hellfire',      items: [] },
    { id: 'heaven',    onLabel: '✨ Heaven ON',     offLabel: '✨ Heaven',    cls: 'mu-heaven-btn',     badge: 'badge_angel',         items: [] },
    { id: 'forest',    onLabel: '🌿 Forest ON',     offLabel: '🌿 Forest',    cls: 'mu-forest-btn',     badge: 'badge_forest_spirit', items: [] },
    { id: 'space',     onLabel: '🚀 Space ON',      offLabel: '🚀 Space',     cls: 'mu-space-btn',      badge: 'badge_astronaut',     items: [] },
    { id: 'y2k',       onLabel: '💾 Y2K ON',        offLabel: '💾 Y2K',       cls: 'mu-y2k-btn',        badge: 'badge_y2k',           items: [] },
  ];

  let songs = [...BUILTIN_SONGS];
  let curIdx = parseInt(localStorage.getItem('nat-song-idx') || '0', 10);
  if (curIdx >= songs.length) curIdx = 0;
  let chibiHidden = localStorage.getItem('nat-chibi-hide') === '1';
  let chibiMuted  = localStorage.getItem('nat-chibi-mute') === '1';
  let volume      = parseFloat(localStorage.getItem('nat-volume')     ?? '0.8');
  window.natVolume = volume;
  let sfxVolume   = parseFloat(localStorage.getItem('nat-sfx-volume') ?? '0.6');
  window.natSfxVolume = sfxVolume;
  let audio = null;
  function getAudio() { if (!audio) audio = document.getElementById('bgMusic'); return audio; }

  function showToast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  function applyChibi() {
    const wrap = document.getElementById('chibiWrap');
    if (wrap) wrap.style.display = chibiHidden ? 'none' : '';
    window.natChibiSilenced = chibiHidden || chibiMuted;
    const a = getAudio(); if (!a) return;
    const shouldSilence = chibiHidden || chibiMuted;
    a.muted = shouldSilence;
    if (shouldSilence) a.pause(); else a.play().catch(() => {});
    window.dispatchEvent(new CustomEvent('natChibiSettingChange'));
  }
  function applyVolume() {
    const a = getAudio(); if (a) a.volume = volume;
    window.natVolume = volume;
    const slider = document.getElementById('muVolSlider');
    if (slider) slider.value = Math.round(volume * 100);
    const label = document.getElementById('muVolLabel');
    if (label) label.textContent = Math.round(volume * 100) + '%';
  }
  function applySfxVolume() {
    window.natSfxVolume = sfxVolume;
    const slider = document.getElementById('muSfxSlider');
    if (slider) slider.value = Math.round(sfxVolume * 100);
    const label = document.getElementById('muSfxLabel');
    if (label) label.textContent = Math.round(sfxVolume * 100) + '%';
  }
  function loadCurrent() {
    const a = getAudio(); if (!a) return;
    const s = songs[curIdx] || songs[0];
    a.querySelectorAll('source').forEach(x => x.remove());
    a.src = s.src; a.load(); applyVolume();
    if (!chibiHidden && !chibiMuted) a.play().catch(() => {});
    updateUI();
  }
  function next() { curIdx = (curIdx + 1) % songs.length; localStorage.setItem('nat-song-idx', curIdx); loadCurrent(); renderSongs(); }
  function prev() { curIdx = (curIdx - 1 + songs.length) % songs.length; localStorage.setItem('nat-song-idx', curIdx); loadCurrent(); renderSongs(); }
  function togglePlay() { const a = getAudio(); if (!a) return; if (a.paused) { a.muted = chibiMuted; applyVolume(); a.play().catch(() => {}); } else a.pause(); updateUI(); }
  function toggleHide() { chibiHidden = !chibiHidden; localStorage.setItem('nat-chibi-hide', chibiHidden ? '1' : '0'); applyChibi(); updateUI(); }
  function toggleMute() { chibiMuted  = !chibiMuted;  localStorage.setItem('nat-chibi-mute', chibiMuted  ? '1' : '0'); applyChibi(); updateUI(); }

  function setTheme(id) {
    if (typeof window.setTheme === 'function') window.setTheme(id);
    else { document.body.setAttribute('data-theme', id); localStorage.setItem('natnat-theme', id); }
    document.querySelectorAll('.mu-theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === id));
    document.querySelectorAll('.ltp-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === id));
  }

  function _isHeavyGraphicsMode() {
    const g = localStorage.getItem('natnat-graphics') || 'best';
    return g === 'performance' || g === 'superformance' || g === 'potato';
  }

  function setOverrideTheme(id) {
    if (_isHeavyGraphicsMode()) { showToast('🚫 your pc/phone might explode po :<'); return; }
    const cur  = localStorage.getItem(THEME_OVERRIDE_KEY);
    const meta = OVERRIDE_THEMES.find(t => t.id === id);
    if (cur === id) {
      localStorage.removeItem(THEME_OVERRIDE_KEY);
      showToast(`${meta ? meta.offLabel.split(' ')[0] : ''}  Theme removed — reloading…`);
      setTimeout(() => location.reload(), 1200);
    } else {
      localStorage.setItem(THEME_OVERRIDE_KEY, id);
      if (meta) {
        if (window.awardLocalBadge && meta.badge) window.awardLocalBadge(meta.badge);
        if (window.awardItem) meta.items.forEach(it => window.awardItem(it));
      }
      const label = id.charAt(0).toUpperCase() + id.slice(1);
      showToast(`${meta ? meta.onLabel.split(' ')[0] : ''} ${label} theme activated! Reloading… ✨`);
      setTimeout(() => location.reload(), 1200);
    }
  }

  function setGraphics(id) {
    if (typeof window.setGraphicsMode === 'function') window.setGraphicsMode(id);
    else { localStorage.setItem('natnat-graphics', id); document.body.setAttribute('data-graphics', id); }
    document.querySelectorAll('.mu-graphics-btn').forEach(b => b.classList.toggle('active', b.dataset.graphics === id));
    if (id === 'superformance') showToast('🚄✈️ Superformance mode activated!');
    else if (id === 'potato')   showToast('🥔 Potato PC mode activated :<');
    else if (id === 'performance') showToast('⚡ Performance mode — animations reduced!');
    else if (id === 'best')     showToast('🌟 Best mode — all effects enabled!');
  }

  function renderSongs() {
    const c = document.querySelector('#musicWidget .mu-songs'); if (!c) return;
    c.innerHTML = songs.map((s, i) => `<button class="mu-song-btn ${i===curIdx?'active':''}" data-i="${i}">${i===curIdx?'🎶 ':''}${s.name}</button>`).join('');
    c.querySelectorAll('.mu-song-btn').forEach(b => {
      b.onclick = () => { curIdx = parseInt(b.dataset.i, 10); localStorage.setItem('nat-song-idx', curIdx); loadCurrent(); renderSongs(); };
    });
  }

  function updateUI() {
    const w = document.getElementById('musicWidget'); if (!w) return;
    const s = songs[curIdx] || songs[0];
    const a = getAudio();
    w.querySelector('.mu-title').textContent = s.name;
    w.querySelector('.mu-play').textContent  = (a && !a.paused) ? '⏸' : '▶';
    w.querySelector('.mu-hide').textContent  = chibiHidden ? '👁 show chibi'    : '🙈 hide chibi';
    w.querySelector('.mu-mute').textContent  = chibiMuted  ? '🔊 unmute music' : '🔇 mute music';
    w.querySelector('.mu-mute').disabled = chibiHidden;
    w.classList.toggle('chibi-hidden', chibiHidden);

    const curTheme    = localStorage.getItem('natnat-theme')    || 'pink';
    const curGraphics = localStorage.getItem('natnat-graphics') || 'best';
    const curOverride = localStorage.getItem(THEME_OVERRIDE_KEY) || '';

    document.querySelectorAll('.mu-theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === curTheme));
    document.querySelectorAll('.mu-graphics-btn').forEach(b => b.classList.toggle('active', b.dataset.graphics === curGraphics));

    OVERRIDE_THEMES.forEach(ot => {
      const btn = w.querySelector(`.${ot.cls}`);
      if (!btn) return;
      const isOn = curOverride === ot.id;
      btn.classList.toggle('active', isOn);
      btn.textContent = isOn ? ot.onLabel : ot.offLabel;
    });

    const invBtn = w.querySelector('.mu-inv-btn');
    if (invBtn && window.getInventory) {
      const count = window.getInventory().length;
      invBtn.textContent = `🎒 inventory${count > 0 ? ' ('+count+')' : ''}`;
    }
  }

  function build() {
    if (document.getElementById('musicWidget')) return;
    const curTheme    = localStorage.getItem('natnat-theme')    || 'pink';
    const curGraphics = localStorage.getItem('natnat-graphics') || 'best';
    const curOverride = localStorage.getItem(THEME_OVERRIDE_KEY) || '';

    const w = document.createElement('div');
    w.id = 'musicWidget';
    w.className = 'music-widget collapsed';
    w.innerHTML = `
      <button class="mu-toggle" title="settings">⚙️</button>
      <div class="mu-body">
        <div class="mu-section-head">🎵 music</div>
        <div class="mu-title">loading…</div>
        <div class="mu-controls">
          <button class="mu-prev" title="previous">⏮</button>
          <button class="mu-play" title="play / pause">▶</button>
          <button class="mu-next" title="next">⏭</button>
        </div>
        <div class="mu-songs"></div>
        <div class="mu-vol-row"><span class="mu-vol-icon">🎵</span><input type="range" id="muVolSlider" class="mu-vol-slider" min="0" max="100" value="80"><span id="muVolLabel" class="mu-vol-label">80%</span></div>
        <div class="mu-vol-row"><span class="mu-vol-icon">🔊</span><input type="range" id="muSfxSlider" class="mu-vol-slider" min="0" max="100" value="60"><span id="muSfxLabel" class="mu-vol-label">60%</span></div>

        <div class="mu-divider">🐱 chibi</div>
        <div class="mu-chibi"><button class="mu-hide">🙈 hide chibi</button><button class="mu-mute">🔇 mute music</button></div>

        <div class="mu-divider">🎨 theme</div>
        <div class="mu-themes">
          ${THEMES.map(t => `<button class="mu-theme-btn ${t.id===curTheme?'active':''}" data-theme="${t.id}" title="${t.label}">${t.icon}</button>`).join('')}
        </div>

        <div class="mu-divider">🌟 special themes</div>
        <div class="mu-special-themes">
          ${OVERRIDE_THEMES.map(ot => {
            const isOn = curOverride === ot.id;
            return `<button class="${ot.cls} mu-special-btn${isOn?' active':''}">${isOn ? ot.onLabel : ot.offLabel}</button>`;
          }).join('')}
        </div>

        <div class="mu-divider">🖥️ graphics</div>
        <div class="mu-graphics">
          ${GRAPHICS.map(g => `<button class="mu-graphics-btn ${g.id===curGraphics?'active':''}" data-graphics="${g.id}" title="${g.desc}">${g.icon} ${g.label}</button>`).join('')}
        </div>

        <div class="mu-divider">🎒 inventory</div>
        <div class="mu-inv-row"><button class="mu-inv-btn">🎒 inventory</button></div>
      </div>`;

    document.body.appendChild(w);

    // Always start collapsed — never re-open on refresh
    w.classList.add('collapsed');
    w.querySelector('.mu-toggle').onclick = (e) => {
      e.stopPropagation();
      w.classList.toggle('collapsed');
    };

    // Click outside → close
    document.addEventListener('click', (e) => {
      if (!w.classList.contains('collapsed') && !w.contains(e.target)) {
        w.classList.add('collapsed');
      }
    });
    w.querySelector('.mu-prev').onclick   = prev;
    w.querySelector('.mu-play').onclick   = togglePlay;
    w.querySelector('.mu-next').onclick   = next;
    w.querySelector('.mu-hide').onclick   = toggleHide;
    w.querySelector('.mu-mute').onclick   = toggleMute;
    w.querySelectorAll('.mu-theme-btn').forEach(b => b.onclick = () => setTheme(b.dataset.theme));
    w.querySelectorAll('.mu-graphics-btn').forEach(b => b.onclick = () => setGraphics(b.dataset.graphics));

    OVERRIDE_THEMES.forEach(ot => {
      const btn = w.querySelector(`.${ot.cls}`);
      if (btn) btn.onclick = () => setOverrideTheme(ot.id);
    });

    w.querySelector('#muVolSlider').oninput = e => { volume = parseInt(e.target.value,10)/100; localStorage.setItem('nat-volume',volume); applyVolume(); };
    w.querySelector('#muSfxSlider').oninput = e => { sfxVolume = parseInt(e.target.value,10)/100; localStorage.setItem('nat-sfx-volume',sfxVolume); applySfxVolume(); };
    w.querySelector('.mu-inv-btn').onclick   = () => { if (window.openInventory) window.openInventory(); };

    renderSongs(); applyVolume(); applySfxVolume(); updateUI(); applyChibi();
    loadCurrent();
    window.addEventListener('nat-item-awarded', () => updateUI());
  }

  window.addEventListener('DOMContentLoaded', build);
})();
