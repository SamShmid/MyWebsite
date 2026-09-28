// Supplementary help: all controls keep their own visible / accessible names.
// Tooltips work on focus and hover, can themselves be hovered, and have no timeout.
document.querySelectorAll('[data-tooltip]').forEach((trigger, index) => {
  const tip = document.createElement('span');
  tip.className = 'tooltip';
  tip.id = `tooltip-${index + 1}`;
  tip.setAttribute('role', 'tooltip');
  tip.textContent = trigger.dataset.tooltip;
  tip.hidden = true;
  document.body.append(tip);
  const describedBy = trigger.getAttribute('aria-describedby');
  trigger.setAttribute('aria-describedby', [describedBy, tip.id].filter(Boolean).join(' '));
  let hovered = false;
  let focused = false;
  let overTip = false;
  let dismissed = false;
  let closeTimer = 0;

  function position() {
    const anchor = trigger.getBoundingClientRect();
    if (trigger.hidden || anchor.bottom <= 0 || anchor.top >= window.innerHeight) {
      tip.hidden = true;
      return;
    }
    tip.textContent = trigger.dataset.tooltip;
    tip.hidden = false;
    const box = tip.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left + (anchor.width - box.width) / 2, window.innerWidth - box.width - 12));
    const above = anchor.top - box.height - 8;
    const top = above >= 12 ? above : Math.min(anchor.bottom + 8, window.innerHeight - box.height - 12);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(12, top)}px`;
  }
  function show() {
    window.clearTimeout(closeTimer);
    if (!dismissed) position();
  }
  function closeWhenUnused() {
    window.clearTimeout(closeTimer);
    // A short bridge lets the pointer cross the gap into the tooltip.
    closeTimer = window.setTimeout(() => {
      if (!hovered && !focused && !overTip) {
        tip.hidden = true;
        dismissed = false;
      }
    }, 180);
  }
  trigger.addEventListener('mouseenter', () => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    hovered = true; dismissed = false; show();
  });
  trigger.addEventListener('mouseleave', () => { hovered = false; closeWhenUnused(); });
  trigger.addEventListener('focus', () => {
    // Touch users get the action directly; keyboard users still get its help.
    if (!window.matchMedia('(hover: hover)').matches && !trigger.matches(':focus-visible')) return;
    focused = true; dismissed = false; show();
  });
  trigger.addEventListener('blur', () => { focused = false; closeWhenUnused(); });
  tip.addEventListener('mouseenter', () => { overTip = true; show(); });
  tip.addEventListener('mouseleave', () => { overTip = false; closeWhenUnused(); });
  const refresh = () => { if ((hovered || focused || overTip) && !dismissed) position(); };
  trigger.addEventListener('click', refresh);
  trigger.addEventListener('transitionend', refresh);
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, { passive: true });
  document.addEventListener('portfolio-motionchange', refresh);
  document.addEventListener('portfolio-assetschange', refresh);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    tip.hidden = true;
    overTip = false;
    dismissed = true;
    window.clearTimeout(closeTimer);
  });
});
