// A full-screen sheet of characters, pulled from the upper-left corner.
// The original 5.5-second pass repeats, with an invisible seam between cycles.
const canvas = document.querySelector('#character-field');
const context = canvas.getContext('2d', { alpha: false });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SETTINGS = Object.freeze({
  background: '#0b0d11',
  duration: 5500,
  rampDuration: 1080,
  cruiseSpeed: .882,
  sheetLength: 2.16,
  glyphs: '.:;!+*#%@/\\{}<>=-',
  shades: 10,
  frameInterval: 1000 / 30,
});
let width = 0;
let height = 0;
let cellWidth = 12;
let cellHeight = 16;
let pixelRatio = 1;
let frameInterval = SETTINGS.frameInterval;
let atlas;
let frame = 0;
let lastTime = null;
let lastPaint = -Infinity;
let elapsed = 0;
let paused = false;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

function sheetTravel(progress) {
  const ramp = SETTINGS.rampDuration / SETTINGS.duration;
  const rampDistance = t => .5 * (t - ramp / Math.PI * Math.sin(Math.PI * t / ramp));
  if (progress < ramp) return rampDistance(progress) / (1 - ramp);
  if (progress > 1 - ramp) return 1 - rampDistance(1 - progress) / (1 - ramp);
  return (progress - ramp / 2) / (1 - ramp);
}
function clear() {
  context.globalAlpha = 1;
  context.fillStyle = SETTINGS.background;
  context.fillRect(0, 0, width, height);
}
function createGlyphAtlas() {
  atlas = document.createElement('canvas');
  atlas.width = cellWidth * SETTINGS.glyphs.length * pixelRatio;
  atlas.height = cellHeight * SETTINGS.shades * pixelRatio;
  const ink = atlas.getContext('2d');
  ink.scale(pixelRatio, pixelRatio);
  ink.font = `400 ${cellHeight - 2}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  for (let shade = 0; shade < SETTINGS.shades; shade++) {
    const gray = 54 + shade * 13;
    ink.fillStyle = `rgb(${gray} ${gray} ${gray})`;
    for (let glyph = 0; glyph < SETTINGS.glyphs.length; glyph++) {
      ink.fillText(SETTINGS.glyphs[glyph], (glyph + .5) * cellWidth, (shade + .46) * cellHeight);
    }
  }
}
function resize() {
  const nextWidth = window.innerWidth;
  const nextHeight = window.innerHeight;
  const compact = nextWidth <= 620;
  const nextRatio = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);
  if (width === nextWidth && height === nextHeight && pixelRatio === nextRatio) return;
  const nextCellWidth = compact ? 14 : 12;
  const nextCellHeight = compact ? 18 : 16;
  const atlasChanged = !atlas || nextRatio !== pixelRatio || nextCellWidth !== cellWidth || nextCellHeight !== cellHeight;
  width = nextWidth;
  height = nextHeight;
  pixelRatio = nextRatio;
  cellWidth = nextCellWidth;
  cellHeight = nextCellHeight;
  frameInterval = 1000 / (compact ? 24 : 30);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (atlasChanged) createGlyphAtlas();
  clear();
}
function hash(column, row) {
  const value = Math.imul(column, 374761393) ^ Math.imul(row, 668265263);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967295;
}
function render(elapsed) {
  clear();
  const time = elapsed / 1000;
  const progress = clamp(elapsed / SETTINGS.duration);
  const travelDistance = SETTINGS.cruiseSpeed * (SETTINGS.duration - SETTINGS.rampDuration) / 1000;
  const pull = .14 + travelDistance * sheetTravel(progress);
  const entrance = smooth(elapsed / 500);
  const release = 1 - smooth((elapsed - (SETTINGS.duration - 1000)) / 1000);
  const flowX = width * pull * .5;
  const flowY = height * pull * .5;
  const shiftX = Math.floor(flowX / cellWidth);
  const shiftY = Math.floor(flowY / cellHeight);
  const offsetX = flowX % cellWidth;
  const offsetY = flowY % cellHeight;
  const columns = Math.ceil(width / cellWidth);
  const rows = Math.ceil(height / cellHeight);
  for (let row = -2; row <= rows + 2; row++) {
    for (let column = -2; column <= columns + 2; column++) {
      const baseX = column * cellWidth + offsetX;
      const baseY = row * cellHeight + offsetY;
      const sourceColumn = column - shiftX;
      const sourceRow = row - shiftY;
      const materialX = (sourceColumn + .5) * cellWidth / width;
      const materialY = (sourceRow + .5) * cellHeight / height;
      const cross = materialX - materialY;
      const materialDiagonal = materialX + materialY + .075 * (1 - Math.cos(cross * 2));
      const front = smooth(-materialDiagonal / .20);
      const back = smooth((materialDiagonal + SETTINGS.sheetLength) / .22);
      const opacity = front * back * entrance * release;
      if (opacity < .008) continue;
      const noise = hash(sourceColumn, sourceRow);
      const phase = materialX * 5 + materialY * 4 + time * .55;
      const wave = Math.sin(phase);
      const curl = Math.exp(-Math.pow((materialDiagonal + .16) * 8, 2));
      const x = baseX + Math.sin(materialY * 6 + time * .5) * (4 + curl * 4);
      const y = baseY + wave * (7 + curl * 5);
      const band = (Math.sin(sourceColumn * .033 + sourceRow * .12) + 1) / 2;
      const glyph = Math.min(SETTINGS.glyphs.length - 1, Math.floor((band * .7 + noise * .3) * SETTINGS.glyphs.length));
      const shade = Math.min(SETTINGS.shades - 1, Math.floor((.35 + (wave + 1) * .16 + noise * .12 + curl * .18) * SETTINGS.shades));
      context.globalAlpha = opacity * (.56 + noise * .2);
      context.drawImage(atlas,
        glyph * cellWidth * pixelRatio, shade * cellHeight * pixelRatio,
        cellWidth * pixelRatio, cellHeight * pixelRatio,
        x, y, cellWidth, cellHeight);
    }
  }
  context.globalAlpha = 1;
}
function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = null;
}
function tick(now) {
  frame = 0;
  if (paused || document.hidden || reducedMotion.matches) return;
  if (lastTime !== null) elapsed += now - lastTime;
  lastTime = now;
  if (elapsed - lastPaint >= frameInterval) {
    render(elapsed % SETTINGS.duration);
    lastPaint = Number.isFinite(lastPaint)
      ? elapsed - (elapsed - lastPaint) % frameInterval
      : elapsed;
  }
  frame = requestAnimationFrame(tick);
}
function start() {
  if (!frame && !paused && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(tick);
}
window.addEventListener('resize', resize);
window.addEventListener('pagehide', stop);
window.addEventListener('pageshow', start);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else start();
});
document.addEventListener('portfolio-motionchange', event => {
  paused = event.detail.paused;
  if (paused) stop();
  else start();
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) { stop(); clear(); }
  else start();
});
resize();
start();
