/* Fix 4 — Dark mode toggle
   Respects prefers-color-scheme on first visit,
   then remembers the user's manual choice in localStorage.
*/
(function () {
  const KEY = 'natnat-dark-mode';

  function applyTheme(dark) {
    document.body.classList.toggle('dark-mode', dark);
    const btn = document.getElementById('darkModeToggle');
    if (btn) btn.textContent = dark ? '☀️' : '🌙';
    localStorage.setItem(KEY, dark ? '1' : '0');
  }

  window.toggleDarkMode = function () {
    applyTheme(!document.body.classList.contains('dark-mode'));
  };

  function init() {
    const saved = localStorage.getItem(KEY);
    const dark  = saved !== null
      ? saved === '1'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(dark);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (localStorage.getItem(KEY) === null) applyTheme(e.matches);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
