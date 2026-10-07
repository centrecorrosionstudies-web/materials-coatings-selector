import { ENVIRONMENTS, CP_NOTE } from './data.js';
import { select } from './engine.js';

const form = document.getElementById('form');
const envSelect = document.getElementById('environment');
const chloride = document.getElementById('chloride');
const resistivityWrap = document.getElementById('resistivity-wrap');
const results = document.getElementById('results');
const error = document.getElementById('error');

for (const [id, e] of Object.entries(ENVIRONMENTS)) envSelect.add(new Option(e.label, id));
envSelect.value = 'marine';

function syncEnv() {
  chloride.value = ENVIRONMENTS[envSelect.value].defaultChloride;
  resistivityWrap.hidden = envSelect.value !== 'soil';
}
envSelect.addEventListener('change', syncEnv);
syncEnv();

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

const COST = ['', 'Low cost', 'Medium cost', 'High cost'];

function card(item) {
  const c = el('div', 'card');
  const head = el('div', 'card-head');
  head.append(el('span', 'name', item.name), el('span', `badge ${item.tier}`, `${item.tier} · ${item.score}`));
  c.append(head, el('div', 'muted', COST[item.cost]));
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
    render(select(input));
  } catch (e) {
    error.textContent = e.message;
    results.replaceChildren();
  }
});

form.requestSubmit();
