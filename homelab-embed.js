(() => {
  const frame = document.querySelector('.homelab-embed');
  if (!frame) return;
  const note = document.querySelector('.homelab-note');
  let resizeObserver;
  let layoutObserver;
  const setHeight = height => {
    if (Number.isFinite(height) && height >= 200 && height <= 5000) {
      const value = `${Math.ceil(height) + 2}px`;
      if (frame.style.height !== value) frame.style.height = value;
    }
  };
  const measure = () => {
    const doc = frame.contentDocument;
    const explorer = doc?.getElementById('explorer');
    if (explorer) setHeight(explorer.getBoundingClientRect().height);
    const ready = doc?.body?.dataset?.gpuReady;
    if (note && ready !== undefined) note.hidden = ready === 'true';
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
      layoutObserver.observe(doc.body, {attributes:true, attributeFilter:['class','data-gpu-ready']});
      doc.addEventListener('load', measure, true);
      doc.fonts?.ready.then(measure);
      measure();
      requestAnimationFrame(measure);
    }
    frame.contentWindow?.postMessage({type:'homelab:measure'}, location.origin);
  };
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'homelab:height') setHeight(Number(event.data.height));
    if (note && event.data?.type === 'homelab:renderer' && typeof event.data.gpuReady === 'boolean') note.hidden = event.data.gpuReady;
  });
  frame.addEventListener('load', connect);
  window.addEventListener('pageshow', connect);
  window.addEventListener('resize', measure);
  connect();
})();
