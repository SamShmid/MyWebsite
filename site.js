// A small, keyboard-accessible tab switcher. Both timelines remain readable
// when JavaScript is unavailable; enhancement hides the inactive panel.
const tablist = document.querySelector('.timeline-tabs');
const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

function selectTab(index, focus = false) {
  tabs.forEach((tab, current) => {
    const selected = current === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[current].hidden = !selected;
  });
  if (focus) tabs[index].focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(index));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(next, true);
  });
});
selectTab(0);
document.querySelector('.experience').classList.add('tabs-ready');
tablist.hidden = false;

// The same portrait enlargement is available by keyboard or a tap.
const portrait = document.querySelector('.portrait-zoom');
function setPortraitExpanded(expanded) {
  portrait.classList.toggle('is-expanded', expanded);
  portrait.setAttribute('aria-label', expanded ? 'Reduce portrait' : 'Enlarge portrait');
  portrait.dataset.tooltip = expanded ? 'Activate or press Escape to reduce' : 'Activate to enlarge the photo';
}
portrait.addEventListener('click', () => {
  const expanded = !portrait.classList.contains('is-expanded');
  portrait.classList.toggle('zoom-dismissed', !expanded);
  setPortraitExpanded(expanded);
});
portrait.addEventListener('mouseleave', () => portrait.classList.remove('zoom-dismissed'));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  setPortraitExpanded(false);
  // Dismiss hover zoom without making the visitor move their pointer.
  portrait.classList.add('zoom-dismissed');
});
