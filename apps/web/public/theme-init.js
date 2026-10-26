// Anti-flash: roda antes da primeira pintura. Arquivo externo porque o CSP da API (helmet)
// bloqueia script inline. Mantenha em sincronia com src/lib/theme.ts.
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem('theme');
  } catch {
    /* storage bloqueado: segue o sistema */
  }
  var dark =
    theme === 'dark' ||
    (theme !== 'light' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
})();
