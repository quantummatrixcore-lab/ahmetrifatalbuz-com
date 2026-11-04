// Runs synchronously in <head> so the chosen theme is applied before first paint (no flash).
(function () {
  var mode = 'system';
  try { mode = localStorage.getItem('arn-theme') || 'system'; } catch (e) { /* storage unavailable */ }
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme-mode', mode);
})();
