// Drop the approved PDF into assets/resume.pdf to enable its download link.
// This checks one file on this site; it sends no analytics or visitor state.
const resume = document.querySelector('.resume-link');
if (resume) {
  const url = new URL('./assets/resume.pdf', import.meta.url);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  fetch(url, {
    method: 'HEAD',
    credentials: 'omit',
    cache: 'no-store',
    signal: controller.signal,
  }).then(response => {
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!response.ok || type !== 'application/pdf') return;
    resume.href = url.href;
    resume.download = 'Samuel-Shmidman-Resume.pdf';
    resume.removeAttribute('aria-disabled');
    resume.removeAttribute('role');
    resume.classList.add('is-available');
    resume.querySelector('.coming-soon').hidden = true;
    resume.dataset.tooltip = 'Download my résumé as a PDF';
    document.dispatchEvent(new Event('portfolio-assetschange'));
  }).catch(() => {
    // A missing file or failed request leaves the clearly labelled placeholder.
  }).finally(() => window.clearTimeout(timeout));
}
