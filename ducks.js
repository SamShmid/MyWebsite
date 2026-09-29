// A small, decorative family peeks over component edges as the reader scrolls.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggles = document.querySelectorAll('.motion-toggle');
const ARRIVAL_DELAY = 5 * 60_000;
const FAMILY_WIDTH = 216;
const MOTHER_HEIGHT = 40;
const FOLLOW_DELAY = 170;
const HOP_DURATION = 1500;
// Stable component identities; hidden panels are filtered during measurement.
const perchElements = Array.from(document.querySelectorAll(
  '.timeline-panel, .timeline-entry + .timeline-entry, .role-group, .project-card, .site-footer'
));
let size = window.innerWidth <= 620 ? .8 : 1;
let cachedPerches = null;
const mother = ['   __', ' <(o )___', '  ( ._> /', "   `---'"].join('\n');
const duckling = [' <(o)_', '  (__/'].join('\n');
const family = document.createElement('div');
family.className = 'duck-hideout';
family.setAttribute('aria-hidden', 'true');
family.hidden = true;
document.body.append(family);
const ducks = Array.from({ length: 5 }, (_, index) => {
  const element = document.createElement('div');
  element.className = `wandering-duck ${index === 0 ? 'duck-mother' : 'duckling'}`;
  const art = document.createElement('pre');
  art.textContent = index === 0 ? mother : duckling;
  element.append(art);
  family.append(element);
  return { element, art, x: 0, y: 0, direction: -1 };
});
let timer = 0;
let frame = 0;
let paused = false;
let moving = false;
let currentPerch = null;
// Page-local timing only: no cookies, browser storage, or network reporting.
let activeTime = 0;
let visibleSince = document.hidden ? null : performance.now();
let arrivalTimer = 0;
const timeOnPage = () => activeTime + (visibleSince === null ? 0 : performance.now() - visibleSince);
const ready = () => timeOnPage() >= ARRIVAL_DELAY;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const smooth = value => value * value * (3 - 2 * value);
const explored = () => window.scrollY > Math.min(120, window.innerHeight * .18);
function perches() {
  if (cachedPerches) return cachedPerches;
  const spots = [];
  const familyWidth = FAMILY_WIDTH * size;
  perchElements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    if (rect.width < familyWidth + 16 || rect.height === 0) return;
    const left = Math.max(8, rect.left + 8);
    const right = Math.min(rect.right - familyWidth - 8, window.innerWidth - familyWidth - 8);
    if (right < left) return;
    const room = right - left;
    const positions = room < 48 ? [(left + right) / 2]
      : room < 144 ? [left, right] : [left, (left + right) / 2, right];
    // Reserved gaps keep the whole family and its hop clear of nearby text.
    positions.forEach((x, side) => spots.push({
      id: `${index}-${side}`,
      component: index,
      x,
      y: rect.top + window.scrollY - MOTHER_HEIGHT * size - 4,
    }));
  });
  cachedPerches = spots;
  return spots;
}
function onScreen(spot) {
  return spot && spot.y >= window.scrollY + 12 && spot.y + MOTHER_HEIGHT * size <= window.scrollY + window.innerHeight - 6;
}
function invalidatePerches() {
  cachedPerches = null;
  size = window.innerWidth <= 620 ? .8 : 1;
}
function visiblePerches() {
  if (!ready() || !explored()) return [];
  return perches().filter(onScreen);
}
function pose(perch, index, direction) {
  const offset = direction < 0
    ? (index === 0 ? 0 : 60 + (index - 1) * 40)
    : (index === 0 ? 156 : (4 - index) * 40);
  return { x: perch.x + offset * size, y: perch.y + (index === 0 ? 0 : 20 * size), direction };
}
function paint(duck, position) {
  Object.assign(duck, position);
  duck.element.style.transform = `translate3d(${position.x.toFixed(1)}px, ${position.y.toFixed(1)}px, 0) scale(${size})`;
  duck.art.style.transform = position.direction > 0 ? 'scaleX(-1)' : 'none';
}
function place(perch) {
  currentPerch = perch;
  family.hidden = false;
  ducks.forEach((duck, index) => paint(duck, pose(perch, index, -1)));
}
function stop() {
  window.clearTimeout(timer);
  cancelAnimationFrame(frame);
  timer = 0;
  frame = 0;
  moving = false;
}
function schedule(delay = 9500 + Math.random() * 3500) {
  window.clearTimeout(timer);
  if (ready() && explored() && !paused && !reducedMotion.matches && !document.hidden) timer = window.setTimeout(hop, delay);
}
function hop() {
  timer = 0;
  if (!ready() || paused || reducedMotion.matches || document.hidden) return;
  const visible = visiblePerches();
  const otherComponents = visible.filter(spot => spot.component !== currentPerch?.component);
  const otherPositions = visible.filter(spot => spot.id !== currentPerch?.id);
  const choices = otherComponents.length ? otherComponents : otherPositions.length ? otherPositions : visible;
  if (!choices.length) { schedule(); return; }
  const target = choices[Math.floor(Math.random() * choices.length)];
  // Scrolling to a new area brings the family to a nearby ledge rather than
  // sending it across the entire page from its old off-screen position.
  if (family.hidden || !onScreen(currentPerch)) {
    place(target);
  }
  const direction = target.x > currentPerch.x ? 1 : -1;
  const from = ducks.map(({ x, y }) => ({ x, y }));
  const destination = ducks.map((_, index) => pose(target, index, direction));
  const distance = Math.hypot(target.x - currentPerch.x, target.y - currentPerch.y);
  const hops = Math.max(2, Math.min(5, Math.ceil(distance / 90)));
  let started = null;
  moving = true;
  const animate = now => {
    if (started === null) started = now;
    const elapsed = now - started;
    ducks.forEach((duck, index) => {
      const progress = clamp((elapsed - index * FOLLOW_DELAY) / HOP_DURATION, 0, 1);
      const travel = smooth(progress);
      const bounce = Math.abs(Math.sin(progress * Math.PI * hops)) * (index === 0 ? 10 : 7) * size;
      paint(duck, {
        x: from[index].x + (destination[index].x - from[index].x) * travel,
        y: from[index].y + (destination[index].y - from[index].y) * travel - bounce,
        direction,
      });
    });
    if (elapsed < HOP_DURATION + 4 * FOLLOW_DELAY) frame = requestAnimationFrame(animate);
    else { frame = 0; moving = false; currentPerch = target; schedule(); }
  };
  frame = requestAnimationFrame(animate);
}
function settle() {
  const spots = visiblePerches();
  const target = spots.find(spot => spot.id === currentPerch?.id) || spots[0];
  if (target) place(target);
  else { family.hidden = true; currentPerch = null; }
}

function updateToggles() {
  toggles.forEach(toggle => {
    toggle.hidden = reducedMotion.matches;
    toggle.textContent = paused ? 'Resume motion' : 'Pause motion';
    toggle.dataset.tooltip = paused ? 'Resume animations on this page' : 'Pause animations on this page';
  });
}
updateToggles();
toggles.forEach(toggle => {
  toggle.addEventListener('click', () => {
    paused = !paused;
    updateToggles();
    document.dispatchEvent(new CustomEvent('portfolio-motionchange', { detail: { paused } }));
    if (paused) stop();
    else schedule(500);
  });
});
window.addEventListener('scroll', () => {
  if (!explored()) { stop(); family.hidden = true; currentPerch = null; return; }
  if (!ready()) return;
  if (reducedMotion.matches) { settle(); return; }
  if (paused || moving) return;
  if (!onScreen(currentPerch)) schedule(900);
}, { passive: true });
function componentChanged() {
  invalidatePerches();
  stop();
  if (family.hidden) return;
  settle();
  schedule();
}
const timelineTabs = document.querySelector('.timeline-tabs');
timelineTabs?.addEventListener('click', componentChanged);
timelineTabs?.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) componentChanged();
});
window.addEventListener('resize', () => {
  invalidatePerches();
  stop();
  if (!family.hidden) settle();
  schedule();
});
function awaitArrival() {
  window.clearTimeout(arrivalTimer);
  if (document.hidden || visibleSince === null) return;
  const remaining = ARRIVAL_DELAY - timeOnPage();
  if (remaining > 0) {
    arrivalTimer = window.setTimeout(awaitArrival, Math.ceil(remaining));
  } else if (reducedMotion.matches) settle();
  else if (!paused && explored()) {
    if (family.hidden) hop();
    else schedule(1200);
  }
}
function suspend() {
  if (visibleSince !== null) activeTime += performance.now() - visibleSince;
  visibleSince = null;
  window.clearTimeout(arrivalTimer);
  stop();
}
function resume() {
  if (document.hidden) return;
  if (visibleSince === null) visibleSince = performance.now();
  invalidatePerches();
  awaitArrival();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
  else resume();
});
window.addEventListener('pagehide', suspend);
window.addEventListener('pageshow', resume);
reducedMotion.addEventListener('change', () => {
  stop();
  updateToggles();
  if (reducedMotion.matches) settle();
  else schedule(1200);
});
// Reflow (including larger text) invalidates geometry, not every scroll event.
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(componentChanged);
  observer.observe(document.querySelector('.page'));
}
awaitArrival();
