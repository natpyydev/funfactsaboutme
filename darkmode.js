/* darkmode.js — legacy compat shim.
   Theme is now fully managed by themes.js via data-theme.
   This file remains so nothing breaks if it's referenced elsewhere.
*/
(function () {
  // Respect prefers-color-scheme on first visit: map to dark/light theme
  function init() {
    const saved = localStorage.getItem('natnat-theme');
    if (!saved) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark && window.setTheme) window.setTheme('dark');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
