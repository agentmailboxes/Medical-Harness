(() => {
  let stored;
  try { stored = localStorage.getItem('medical-harness-theme'); } catch {}
  const theme = ['light', 'dark'].includes(stored) ? stored : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
