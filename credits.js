/* 🎬 CREDITS TAB — built by natnat, for natnat 😭 */
(() => {
  function build() {
    if (document.getElementById('creditsSection')) return;

    const sec = document.createElement('section');
    sec.id = 'creditsSection';
    sec.className = 'credits-section';
    sec.innerHTML = `
      <h2 class="section-title">🎬 credits</h2>
      <p class="section-sub">the masterminds behind this whole mess ✨</p>

      <div class="credits-roll">

        <div class="credits-block">
          <div class="credits-label">✨ Creator</div>
          <div class="credits-name">Natnat</div>
          <div class="credits-note">had the vision, the ideas, and the audacity 💅</div>
        </div>

        <div class="credits-divider">· · · · · · · · · ·</div>

        <div class="credits-block">
          <div class="credits-label">👑 Owner</div>
          <div class="credits-name">Natnat</div>
          <div class="credits-note">literally owns everything on this page 😌</div>
        </div>

        <div class="credits-divider">· · · · · · · · · ·</div>

        <div class="credits-block">
          <div class="credits-label">💻 Developer</div>
          <div class="credits-name">Natnat</div>
          <div class="credits-note">wrote the code at 2am and somehow it works 😭</div>
        </div>

        <div class="credits-divider">· · · · · · · · · ·</div>

        <div class="credits-block">
          <div class="credits-label">🔍 Debugger</div>
          <div class="credits-name">Natnat</div>
          <div class="credits-note">found the bugs, fixed the bugs, introduced new bugs 🐛</div>
        </div>

        <div class="credits-divider">· · · · · · · · · ·</div>

        <div class="credits-block credits-block-special">
          <div class="credits-label">🎀 Special Thanks</div>
          <div class="credits-name">You 👀</div>
          <div class="credits-note">for actually reading this far<br>you're a real one 💗</div>
        </div>

        <div class="credits-footer">
          <div class="credits-tagline">made with 💗 by natnat · v2.0 · 2025</div>
          <div class="credits-tagline" style="opacity:.5;font-size:.8rem">yes, all of these are the same person 😭</div>
        </div>

      </div>
    `;

    document.querySelector('main').appendChild(sec);
    startRoll();
  }

  function startRoll() {
    const blocks = document.querySelectorAll('.credits-block');
    blocks.forEach((b, i) => {
      b.style.opacity = '0';
      b.style.transform = 'translateY(30px)';
      b.style.transition = 'all 0.6s ease';
      setTimeout(() => {
        b.style.opacity = '1';
        b.style.transform = 'translateY(0)';
      }, i * 200);
    });
  }

  // Re-run roll animation when credits tab is shown
  window.addEventListener('nattabchange', e => {
    if (e.detail.tab === 'credits') {
      setTimeout(startRoll, 100);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
