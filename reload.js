// A refresh starts at the header. Ordinary links and browser Back/Forward
// keep their native anchor and scroll-restoration behavior.
(() => {
  if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') return;
  const restoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  window.addEventListener('pageshow', () => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      history.scrollRestoration = restoration;
    });
  }, { once: true });
})();
