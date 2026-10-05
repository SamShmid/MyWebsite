const frame = document.querySelector('.homelab-embed');
const requestHeight = () => frame?.contentWindow?.postMessage({type:'homelab:measure'},location.origin);
window.addEventListener('message', event => {
  if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'homelab:height') return;
  const height = Number(event.data.height);
  if (Number.isFinite(height) && height >= 200 && height <= 5000) frame.style.height = `${Math.ceil(height) + 2}px`;
});
frame?.addEventListener('load',requestHeight);
requestHeight();
