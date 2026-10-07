import { ENVIRONMENTS, CP_NOTE, ASHBY_AXES } from './data.js';
import { select, materialPoints, galvanic, METALS } from './engine.js';
import { renderAshby, renderAshbyTable } from './ashby.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const envSelect = $('environment');
const chloride = $('chloride');
const resistivityWrap = $('resistivity-wrap');
const results = $('results');
const error = $('error');
const xAxis = $('x-axis');
const yAxis = $('y-axis');
const metalA = $('metal-a');
const metalB = $('metal-b');

for (const [id, e] of Object.entries(ENVIRONMENTS)) envSelect.add(new Option(e.label, id));
envSelect.value = 'marine';
for (const [id, a] of Object.entries(ASHBY_AXES)) {
  xAxis.add(new Option(a.label, id));
  yAxis.add(new Option(a.label, id));
}
xAxis.value = 'costPerKg';
yAxis.value = 'strengthMPa';
for (const m of METALS) {
  metalA.add(new Option(m.name, m.id));
  metalB.add(new Option(m.name, m.id));
}
metalA.value = 'carbon-steel';
metalB.value = 'ss316l';

let lastInput = null;
let lastResult = null;

function syncEnv() {
  chloride.value = ENVIRONMENTS[envSelect.value].defaultChloride;
  resistivityWrap.hidden = envSelect.value !== 'soil';
}
envSelect.addEventListener('change', () => { syncEnv(); form.requestSubmit(); });
syncEnv();

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
  const renew = item.renewals === 0 ? 'no renewal' : `${item.renewals} renewal${item.renewals > 1 ? 's' : ''}`;
  c.append(head, el('div', 'muted', COST[item.cost]),
    el('div', 'lcc', `Relative life-cycle cost ${item.lccIndex} (initial ${item.cost}, ${renew} over the design life)`));
  const ul = el('ul');
  for (const r of item.reasons) ul.append(el('li', '', r));
  for (const w of item.warnings) ul.append(el('li', 'warn', w));
  c.append(ul, el('p', 'notes', item.notes));
  return c;
}

function group(title, items, empty, extraNote) {
  const g = el('div', 'group');
  g.append(el('h2', '', title));
  if (extraNote && items.length) g.append(el('p', 'notes', extraNote));
  if (!items.length) g.append(el('p', 'muted', empty));
  for (const i of items) g.append(card(i));
  return g;
}

function renderChart() {
  if (!lastResult) return;
  const pts = materialPoints(lastResult);
  renderAshby($('chart'), pts, xAxis.value, yAxis.value);
  renderAshbyTable($('chart-table'), pts, xAxis.value, yAxis.value);
}
xAxis.addEventListener('change', renderChart);
yAxis.addEventListener('change', renderChart);

function renderReportHead(input) {
  const head = $('report-head');
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
  head.replaceChildren(el('h2', '', 'Selection report: inputs'), dl);
}

function render(r) {
  results.replaceChildren(
    group('Materials', r.material, 'No material passed the screening.'),
    group('Coating systems (on carbon steel)', r.coating, 'No coating system passed the screening.'),
    group('Cathodic protection', r.cp, 'Not applicable to this environment.', CP_NOTE),
  );
  if (r.excluded.length) {
    const d = el('details');
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
    ? el('p', 'ok', `Acceptable: ${g.diffV} V difference, within the ${g.limitV} V limit`)
    : el('p', 'bad', `Risk of galvanic corrosion: ${g.diffV} V difference, over the ${g.limitV} V limit`);
  const detail = el('p', 'notes', g.anode
    ? `${g.anode} is the anode and corrodes preferentially; ${g.cathode} is protected. ` +
      'Avoid a small anode area against a large cathode. Isolate the joint, coat the cathode, or use compatible fasteners.'
    : 'Both metals have the same anodic index.');
  out.replaceChildren(verdict, detail,
    el('p', 'notes', `Limit used: ${g.harsh ? 'harsh / wetted' : 'normal atmospheric'} environment.`));
}
metalA.addEventListener('change', renderGalvanic);
metalB.addEventListener('change', renderGalvanic);

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
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
    error.textContent = '';
    lastResult = select(input);
    lastInput = input;
    render(lastResult);
    renderChart();
    renderReportHead(input);
  } catch (e) {
    error.textContent = e.message;
    results.replaceChildren();
  }
  renderGalvanic();
});

$('print').addEventListener('click', () => {
  if (lastInput) window.print();
});

form.requestSubmit();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
