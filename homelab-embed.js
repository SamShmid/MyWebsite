const frame = document.querySelector('.homelab-embed');
window.addEventListener('message', event => {
  if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'homelab:height') return;
  const height = Number(event.data.height);
  if (Number.isFinite(height) && height >= 400 && height <= 4000) frame.style.height = `${Math.ceil(height) + 2}px`;
});
