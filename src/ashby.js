import { ASHBY_AXES } from './data.js';

const SVG = 'http://www.w3.org/2000/svg';
const TIER_ORDER = ['Strong', 'Suitable', 'Marginal', 'Excluded'];
const M = { top: 16, right: 24, bottom: 52, left: 64 };

function svg(tag, attrs = {}, text) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
}

// Log-scale domain padded to whole 1-2-5 steps, with tick values inside it.
function logScale(values, lo, hi) {
  const min = Math.min(...values) / 1.4, max = Math.max(...values) * 1.4;
  const l0 = Math.log10(min), l1 = Math.log10(max);
  const ticks = [];
  for (let e = Math.floor(l0); e <= Math.ceil(l1); e++) {
    for (const m of [1, 2, 5]) {
      const t = m * 10 ** e;
      if (t >= min && t <= max) ticks.push(t);
    }
  }
  const map = (v) => lo + ((Math.log10(v) - l0) / (l1 - l0)) * (hi - lo);
  return { map, ticks };
}

const fmt = (v) => (v >= 100 ? Math.round(v).toLocaleString() : String(Math.round(v * 10) / 10));

function overlaps(a, b) {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

export function renderAshby(container, points, xKey, yKey) {
  const xa = ASHBY_AXES[xKey], ya = ASHBY_AXES[yKey];
  // Draw at the container's real pixel width so text stays 11px on phones.
  const W = Math.max(300, Math.min(760, Math.round(container.clientWidth || 640)));
  const H = Math.round(Math.max(280, Math.min(440, W * 0.62)));
  const narrow = W < 520;
  const xTitle = `${narrow ? xa.short : xa.label} · log`, yTitle = `${narrow ? ya.short : ya.label} · log`;
  const xs = logScale(points.map(xa.value), M.left, W - M.right);
  const ys = logScale(points.map(ya.value), H - M.bottom, M.top);

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ashby', role: 'img',
    'aria-label': `Ashby chart of ${ya.label} against ${xa.label}` });

  const grid = svg('g', { class: 'grid' });
  for (const t of xs.ticks) {
    const x = xs.map(t);
    grid.append(svg('line', { x1: x, x2: x, y1: M.top, y2: H - M.bottom }),
      svg('text', { x, y: H - M.bottom + 16, 'text-anchor': 'middle' }, fmt(t)));
  }
  for (const t of ys.ticks) {
    const y = ys.map(t);
    grid.append(svg('line', { x1: M.left, x2: W - M.right, y1: y, y2: y }),
      svg('text', { x: M.left - 8, y: y + 4, 'text-anchor': 'end' }, fmt(t)));
  }
  grid.append(
    svg('text', { class: 'axis-title', x: (M.left + W - M.right) / 2, y: H - 10, 'text-anchor': 'middle' }, xTitle),
    svg('text', { class: 'axis-title', transform: `translate(16 ${(M.top + H - M.bottom) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, yTitle),
  );
  root.append(grid);

  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;

  // Draw excluded first so passing materials sit on top.
  const sorted = [...points].sort((a, b) => TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier));
  const marks = svg('g');
  const labels = svg('g', { class: 'labels' });
  root.append(marks, labels);
  container.replaceChildren(root, tip);
  root.addEventListener('click', () => { tip.hidden = true; });

  // Dots are obstacles for labels too, so a label never covers another material.
  const placed = points.map((p) => {
    const cx = xs.map(xa.value(p)), cy = ys.map(ya.value(p));
    return { x: cx - 6, y: cy - 6, width: 12, height: 12 };
  });

  for (const p of sorted) {
    const cx = xs.map(xa.value(p)), cy = ys.map(ya.value(p));
    const g = svg('g', { class: `pt tier-${p.tier}`, tabindex: 0,
      'aria-label': `${p.name}: ${xa.label} ${fmt(xa.value(p))}, ${ya.label} ${fmt(ya.value(p))}, ${p.tier}` });
    g.append(svg('circle', { class: 'hit', cx, cy, r: 12 }), svg('circle', { class: 'dot', cx, cy, r: 5 }));
    marks.append(g);

    const show = () => {
      tip.replaceChildren();
      const b = document.createElement('strong');
      b.textContent = p.name;
      tip.append(b);
      for (const line of [`${xa.label}: ${fmt(xa.value(p))}`, `${ya.label}: ${fmt(ya.value(p))}`,
        p.tier === 'Excluded' ? `Excluded: ${p.reason}` : `${p.tier} fit · score ${p.score}`]) {
        const d = document.createElement('div');
        d.textContent = line;
        tip.append(d);
      }
      tip.hidden = false;
      const box = root.getBoundingClientRect();
      const px = (cx / W) * box.width, py = (cy / H) * box.height;
      tip.style.left = `${Math.max(0, Math.min(px + 14, box.width - tip.offsetWidth - 4))}px`;
      tip.style.top = `${Math.max(py - tip.offsetHeight - 10, 0)}px`;
    };
    const hide = () => { tip.hidden = true; };
    // Hover is mouse-only; on touch a tap opens the tooltip until the next tap elsewhere.
    g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(); });
    g.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    g.addEventListener('focus', show);
    g.addEventListener('blur', (e) => { if (!g.matches(':hover')) hide(); });
    g.addEventListener('click', (e) => { e.stopPropagation(); show(); });
  }

  // Direct-label materials that passed screening, best fit first; a label that
  // would collide in both positions is skipped (tooltip and table still carry it).
  const toLabel = points.filter((p) => p.tier !== 'Excluded')
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  const fits = (bb) => bb.x >= M.left && bb.x + bb.width <= W - 2 && !placed.some((q) => overlaps(bb, q));
  for (const p of toLabel) {
    const cx = xs.map(xa.value(p)), cy = ys.map(ya.value(p));
    const t = svg('text', { x: cx + 9, y: cy + 4 }, p.short);
    labels.append(t);
    let bb = t.getBBox();
    if (!fits(bb)) {
      t.setAttribute('x', cx - 9);
      t.setAttribute('text-anchor', 'end');
      bb = t.getBBox();
      if (!fits(bb)) { t.remove(); continue; }
    }
    placed.push(bb);
  }
}

export function renderAshbyTable(table, points, xKey, yKey) {
  const xa = ASHBY_AXES[xKey], ya = ASHBY_AXES[yKey];
  const row = (cells, tag) => {
    const tr = document.createElement('tr');
    for (const c of cells) {
      const td = document.createElement(tag);
      td.textContent = c;
      tr.append(td);
    }
    return tr;
  };
  const thead = document.createElement('thead');
  thead.append(row(['Material', xa.label, ya.label, 'Screening'], 'th'));
  const tbody = document.createElement('tbody');
  for (const p of points) {
    tbody.append(row([p.name, fmt(xa.value(p)), fmt(ya.value(p)), p.tier === 'Excluded' ? `Excluded: ${p.reason}` : p.tier], 'td'));
  }
  table.replaceChildren(thead, tbody);
}
