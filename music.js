/* 🎵 MUSIC PLAYER + 🐱 CHIBI CONTROLS (hide / mute / change song) */
(() => {
  const DEFAULT = { name: 'Cozy Clicks (default)', src: 'Cozy Clicks.mp3' };
  let songs = JSON.parse(localStorage.getItem('nat-songs') || 'null');
  if (!songs || !songs.length) {
    songs = [DEFAULT];
    localStorage.setItem('nat-songs', JSON.stringify(songs));
  }
  let curIdx = parseInt(localStorage.getItem('nat-song-idx') || '0', 10);
  if (curIdx >= songs.length) curIdx = 0;

  let chibiHidden = localStorage.getItem('nat-chibi-hide') === '1';
  let chibiMuted  = localStorage.getItem('nat-chibi-mute') === '1';

  let audio = null;

  function getAudio() {
    if (!audio) audio = document.getElementById('bgMusic');
    return audio;
  }

  function applyChibi() {
    const wrap = document.getElementById('chibiWrap');
    if (wrap) wrap.style.display = chibiHidden ? 'none' : '';
    // expose globally so chibiSay (in app.js) can skip its pop / typing SFX
    window.natChibiSilenced = chibiHidden || chibiMuted;
    const a = getAudio();
    if (!a) return;
    const shouldSilence = chibiHidden || chibiMuted;
    a.muted = shouldSilence;
    if (shouldSilence) a.pause();
    else a.play().catch(() => {});
  }

  function loadCurrent() {
    const a = getAudio(); if (!a) return;
    const s = songs[curIdx] || songs[0];
    // remove existing <source> tags
    a.querySelectorAll('source').forEach(x => x.remove());
    a.src = s.src;
    a.load();
    if (!chibiHidden && !chibiMuted) a.play().catch(() => {});
    updateUI();
  }

  function next() { curIdx = (curIdx + 1) % songs.length; localStorage.setItem('nat-song-idx', curIdx); loadCurrent(); renderSongs(); }
  function prev() { curIdx = (curIdx - 1 + songs.length) % songs.length; localStorage.setItem('nat-song-idx', curIdx); loadCurrent(); renderSongs(); }
  function togglePlay() {
    const a = getAudio(); if (!a) return;
    if (a.paused) { a.muted = chibiMuted; a.play().catch(() => {}); }
    else a.pause();
    updateUI();
  }

  function addSong() {
    const name = prompt('song name?');
    if (!name) return;
    const url = prompt('mp3 URL or filename (must be reachable from this site):');
    if (!url) return;
    songs.push({ name: name.slice(0,40), src: url });
    localStorage.setItem('nat-songs', JSON.stringify(songs));
    curIdx = songs.length - 1;
    localStorage.setItem('nat-song-idx', curIdx);
    loadCurrent();
    renderSongs();
  }
  function removeCurrent() {
    if (curIdx === 0) { alert("can't remove the default song 🥺"); return; }
    songs.splice(curIdx, 1);
    curIdx = Math.max(0, curIdx - 1);
    localStorage.setItem('nat-songs', JSON.stringify(songs));
    localStorage.setItem('nat-song-idx', curIdx);
    loadCurrent();
    renderSongs();
  }

  function toggleHide() {
    chibiHidden = !chibiHidden;
    localStorage.setItem('nat-chibi-hide', chibiHidden ? '1' : '0');
    applyChibi();
    updateUI();
  }
  function toggleMute() {
    chibiMuted = !chibiMuted;
    localStorage.setItem('nat-chibi-mute', chibiMuted ? '1' : '0');
    applyChibi();
    updateUI();
  }

  function renderSongs() {
    const c = document.querySelector('#musicWidget .mu-songs');
    if (!c) return;
    c.innerHTML = songs.map((s, i) =>
      `<button class="mu-song-btn ${i===curIdx?'active':''}" data-i="${i}">${i===curIdx?'🎶 ':''}${s.name}</button>`
    ).join('');
    c.querySelectorAll('.mu-song-btn').forEach(b => {
      b.onclick = () => {
        curIdx = parseInt(b.dataset.i, 10);
        localStorage.setItem('nat-song-idx', curIdx);
        loadCurrent();
        renderSongs();
      };
    });
  }

  function updateUI() {
    const w = document.getElementById('musicWidget');
    if (!w) return;
    const s = songs[curIdx] || songs[0];
    const a = getAudio();
    w.querySelector('.mu-title').textContent = s.name;
    w.querySelector('.mu-play').textContent = (a && !a.paused) ? '⏸' : '▶';
    w.querySelector('.mu-hide').textContent = chibiHidden ? '👁 show chibi' : '🙈 hide chibi';
    w.querySelector('.mu-mute').textContent = chibiMuted ? '🔊 unmute chibi' : '🔇 mute chibi';
    w.querySelector('.mu-mute').disabled = chibiHidden;
    w.classList.toggle('chibi-hidden', chibiHidden);
  }

  function build() {
    if (document.getElementById('musicWidget')) return;
    const w = document.createElement('div');
    w.id = 'musicWidget';
    w.className = 'music-widget collapsed';
    w.innerHTML = `
      <button class="mu-toggle" title="music + chibi controls">🎵</button>
      <div class="mu-body">
        <div class="mu-title">Cozy Clicks</div>
        <div class="mu-controls">
          <button class="mu-prev" title="previous">⏮</button>
          <button class="mu-play" title="play / pause">▶</button>
          <button class="mu-next" title="next">⏭</button>
        </div>
        <div class="mu-songs"></div>
        <div class="mu-actions">
          <button class="mu-add">+ song</button>
          <button class="mu-rm">remove</button>
        </div>
        <div class="mu-divider">🐱 chibi</div>
        <div class="mu-chibi">
          <button class="mu-hide">🙈 hide chibi</button>
          <button class="mu-mute">🔇 mute chibi</button>
        </div>
        <div class="mu-hint">hide auto-mutes · mute keeps chibi visible</div>
      </div>
    `;
    document.body.appendChild(w);
    w.querySelector('.mu-toggle').onclick = () => w.classList.toggle('collapsed');
    w.querySelector('.mu-prev').onclick = prev;
    w.querySelector('.mu-next').onclick = next;
    w.querySelector('.mu-play').onclick = togglePlay;
    w.querySelector('.mu-add').onclick = addSong;
    w.querySelector('.mu-rm').onclick = removeCurrent;
    w.querySelector('.mu-hide').onclick = toggleHide;
    w.querySelector('.mu-mute').onclick = toggleMute;
    renderSongs();
    const a = getAudio();
    if (a) {
      a.addEventListener('play', updateUI);
      a.addEventListener('pause', updateUI);
    }
    applyChibi();
    updateUI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
