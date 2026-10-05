(() => {
  const frame = document.querySelector('.homelab-embed');
  if (!frame) return;
  let resizeObserver;
  let layoutObserver;
  const setHeight = height => {
    if (Number.isFinite(height) && height >= 200 && height <= 5000) {
      const value = `${Math.ceil(height) + 2}px`;
      if (frame.style.height !== value) frame.style.height = value;
    }
  };
  const measure = () => {
    const explorer = frame.contentDocument?.getElementById('explorer');
    if (explorer) setHeight(explorer.getBoundingClientRect().height);
  };
  const connect = () => {
    resizeObserver?.disconnect();
    layoutObserver?.disconnect();
    const doc = frame.contentDocument;
    const explorer = doc?.getElementById('explorer');
    if (explorer) {
      // Observe the content directly as well as accepting child messages. This
      // also handles Safari restoring a cached iframe with its initial height.
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(explorer);
      layoutObserver = new MutationObserver(measure);
      layoutObserver.observe(doc.body, {attributes:true, attributeFilter:['class']});
      doc.addEventListener('load', measure, true);
      doc.fonts?.ready.then(measure);
      measure();
      requestAnimationFrame(measure);
    }
    frame.contentWindow?.postMessage({type:'homelab:measure'}, location.origin);
  };
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame.contentWindow && event.data?.type === 'homelab:height') setHeight(Number(event.data.height));
  });
  frame.addEventListener('load', connect);
  window.addEventListener('pageshow', connect);
  window.addEventListener('resize', measure);
  connect();
})();
