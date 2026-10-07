import { ENVIRONMENTS, CP_NOTE, ASHBY_AXES } from './data.js';
import { select, materialPoints, galvanic, METALS } from './engine.js';
import { renderAshby, renderAshbyTable } from './ashby.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const envSelect = $('environment');
const chloride = $('chloride');
const resistivityWrap = $('resistivity-wrap');
const output = document.querySelector('.output');
const results = $('results');
const error = $('error');
const xAxis = $('x-axis');
const yAxis = $('y-axis');
const metalA = $('metal-a');
const metalB = $('metal-b');

const SHOWN_PER_GROUP = 3;

for (const [id, e] of Object.entries(ENVIRONMENTS)) envSelect.add(new Option(e.label, id));
envSelect.value = 'marine';
for (const [id, a] of Object.entries(ASHBY_AXES)) {
  xAxis.add(new Option(a.short, id));
  yAxis.add(new Option(a.short, id));
}
xAxis.value = 'costPerKg';
yAxis.value = 'strengthMPa';
for (const m of METALS) {
  metalA.add(new Option(m.name, m.id));
  metalB.add(new Option(m.name, m.id));
}
metalA.value = 'carbon-steel';
metalB.value = 'ss316l';

let lastResult = null;

function syncEnv() {
  chloride.value = ENVIRONMENTS[envSelect.value].defaultChloride;
  resistivityWrap.hidden = envSelect.value !== 'soil';
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

const COST = ['', 'Low cost', 'Medium cost', 'High cost'];
const BUDGET = ['', 'Low', 'Medium', 'High'];

function card(item) {
  const c = el('div', 'card');
  const head = el('div', 'card-head');
  head.append(el('span', 'name', item.name), el('span', `badge ${item.tier}`, `${item.tier} · ${item.score}`));
  const renew = item.renewals === 0 ? 'no renewals' : `${item.renewals} renewal${item.renewals > 1 ? 's' : ''}`;
  c.append(head, el('div', 'meta', `${COST[item.cost]} · life-cycle cost index ${item.lccIndex} (${renew} over design life)`));
  const ul = el('ul');
  for (const r of item.reasons) ul.append(el('li', '', r));
  for (const w of item.warnings) ul.append(el('li', 'warn', w));
  c.append(ul, el('p', 'notes', item.notes));
  return c;
}

function group(kind, title, items, empty, extraNote) {
  const g = el('section', 'group');
  g.id = `group-${kind}`;
  g.append(el('h2', '', title));
  if (extraNote && items.length) g.append(el('p', 'notes', extraNote));
  if (!items.length) g.append(el('p', 'muted', empty));
  items.forEach((item, i) => {
    const c = card(item);
    if (i >= SHOWN_PER_GROUP) c.classList.add('extra');
    g.append(c);
  });
  const more = items.length - SHOWN_PER_GROUP;
  if (more > 0) {
    const btn = el('button', 'more no-print', `Show ${more} more`);
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const open = g.classList.toggle('expanded');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Show fewer' : `Show ${more} more`;
    });
    g.append(btn);
  }
  return g;
}

function renderSummary(r) {
  const box = $('summary');
  box.replaceChildren();
  for (const [kind, label] of [['material', 'Material'], ['coating', 'Coating system'], ['cp', 'Cathodic protection']]) {
    const top = r[kind][0];
    const cell = el('div', 'summary-item');
    cell.append(el('div', 'summary-label', label));
    if (top) {
      cell.append(el('div', 'summary-name', top.name), el('span', `badge ${top.tier}`, `${top.tier} · ${top.score}`));
    } else {
      cell.append(el('div', 'muted', kind === 'cp' ? 'Not applicable here' : 'None passed'));
    }
    box.append(cell);
  }
}

function renderChart() {
  if (!lastResult) return;
  const pts = materialPoints(lastResult);
  renderAshby($('chart'), pts, xAxis.value, yAxis.value);
  renderAshbyTable($('chart-table'), pts, xAxis.value, yAxis.value);
}
xAxis.addEventListener('change', renderChart);
yAxis.addEventListener('change', renderChart);

// Redraw when the chart's width changes (rotation, window resize).
let lastWidth = 0;
new ResizeObserver(([entry]) => {
  const w = Math.round(entry.contentRect.width);
  if (Math.abs(w - lastWidth) > 8) { lastWidth = w; renderChart(); }
}).observe($('chart'));

function renderReportHead(input) {
  const dl = el('dl');
  const rows = [
    ['Date', new Date().toLocaleDateString()],
    ['Environment', ENVIRONMENTS[input.environment].label],
    ['Temperature', `${input.temperatureC} °C`],
    ['pH', String(input.ph)],
    ['Chloride', `${input.chloridePpm} ppm`],
    ['Design life', `${input.lifeYears} years`],
    ['Budget', BUDGET[input.budget]],
  ];
  if (input.resistivityOhmCm !== undefined) rows.push(['Soil resistivity', `${input.resistivityOhmCm} Ω·cm`]);
  for (const [k, v] of rows) dl.append(el('dt', '', k), el('dd', '', v));
  $('report-head').replaceChildren(el('h2', '', 'Selection report: inputs'), dl);
}

function render(r) {
  results.replaceChildren(
    group('material', 'Materials', r.material, 'No material passed the screening.'),
    group('coating', 'Coating systems (on carbon steel)', r.coating, 'No coating system passed the screening.'),
    group('cp', 'Cathodic protection', r.cp, 'Not applicable to this environment.', CP_NOTE),
  );
  if (r.excluded.length) {
    const d = el('details', 'excluded');
    d.append(el('summary', '', `Excluded options (${r.excluded.length})`));
    const ul = el('ul');
    for (const x of r.excluded) ul.append(el('li', 'muted', `${x.name}: ${x.reason}`));
    d.append(ul);
    results.append(d);
  }
}

function renderGalvanic() {
  const out = $('galvanic-result');
  if (metalA.value === metalB.value) {
    out.replaceChildren(el('p', 'muted', 'Same metal, so there is no galvanic couple.'));
    return;
  }
  const g = galvanic(metalA.value, metalB.value, envSelect.value);
  const verdict = g.compatible
    ? el('p', 'ok', `✓ Acceptable: ${g.diffV} V difference, within the ${g.limitV} V limit`)
    : el('p', 'bad', `✕ Galvanic corrosion risk: ${g.diffV} V difference, over the ${g.limitV} V limit`);
  const detail = el('p', 'notes', g.anode
    ? `${g.anode} is the anode and corrodes preferentially; ${g.cathode} is protected. ` +
      'Avoid a small anode area against a large cathode. Isolate the joint, coat the cathode, or use compatible fasteners.'
    : 'Both metals have the same anodic index.');
  out.replaceChildren(verdict, detail,
    el('p', 'notes', `Limit used: ${g.harsh ? 'harsh / wetted' : 'normal atmospheric'} environment.`));
}
metalA.addEventListener('change', renderGalvanic);
metalB.addEventListener('change', renderGalvanic);

function fieldName(input) {
  return input.closest('label')?.firstChild?.textContent.trim() ?? input.name;
}

function run() {
  // Native constraint checks first, so the message names the field.
  const bad = [...form.elements].find((e) => e.willValidate && !e.checkValidity());
  if (bad) {
    error.textContent = `${fieldName(bad)}: ${bad.validationMessage}`;
    output.classList.add('stale');
    return;
  }
  const f = new FormData(form);
  const num = (k) => (f.get(k) === '' ? NaN : Number(f.get(k)));
  const input = {
    environment: f.get('environment'),
    temperatureC: num('temperatureC'),
    ph: num('ph'),
    chloridePpm: num('chloridePpm'),
    lifeYears: num('lifeYears'),
    budget: Number(f.get('budget')),
  };
  const res = num('resistivityOhmCm');
  if (input.environment === 'soil' && Number.isFinite(res)) input.resistivityOhmCm = res;
  try {
    lastResult = select(input);
  } catch (e) {
    error.textContent = e.message;
    output.classList.add('stale');
    return;
  }
  error.textContent = '';
  output.classList.remove('stale');
  renderSummary(lastResult);
  render(lastResult);
  renderChart();
  renderReportHead(input);
  renderGalvanic();
}

let timer;
form.addEventListener('input', (ev) => {
  if (ev.target === envSelect) syncEnv();
  clearTimeout(timer);
  timer = setTimeout(run, ev.target.tagName === 'SELECT' ? 0 : 250);
});
form.addEventListener('submit', (ev) => { ev.preventDefault(); run(); });

$('print').addEventListener('click', () => {
  if (lastResult && !output.classList.contains('stale')) window.print();
});

syncEnv();
run();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
