import { test } from 'node:test';
import assert from 'node:assert/strict';
import { select, validate } from '../src/engine.js';

const base = { environment: 'marine', temperatureC: 30, chloridePpm: 500, ph: 7, lifeYears: 25, budget: 3 };
const ids = (list) => list.map((x) => x.id);

test('coastal atmosphere ranks the C5 zinc system above plain alkyd, which is excluded', () => {
  const r = select(base);
  assert.ok(ids(r.coating).includes('zn-epoxy-pu'));
  assert.ok(!ids(r.coating).includes('alkyd'));
  assert.ok(r.excluded.some((e) => e.id === 'alkyd'));
});

test('seawater excludes 304 and 316L on chloride, keeps super duplex first among stainless', () => {
  const r = select({ ...base, environment: 'seawater', chloridePpm: 19000 });
  assert.ok(!ids(r.material).includes('ss304'));
  assert.ok(!ids(r.material).includes('ss316l'));
  const stainless = ids(r.material).filter((i) => ['duplex2205', 'superduplex'].includes(i));
  assert.equal(stainless[0], 'superduplex');
});

test('cathodic protection only offered for electrolyte environments', () => {
  assert.equal(select(base).cp.length, 0);
  assert.ok(select({ ...base, environment: 'soil', chloridePpm: 100 }).cp.length > 0);
});

test('high soil resistivity warns on sacrificial anodes', () => {
  const r = select({ ...base, environment: 'soil', chloridePpm: 100, resistivityOhmCm: 9000 });
  const anode = r.cp.find((x) => x.id === 'sacrificial');
  assert.ok(anode.warnings.some((w) => /resistivity/i.test(w)));
});

test('temperature limit excludes polymers', () => {
  const r = select({ ...base, environment: 'acid', ph: 2, chloridePpm: 100, temperatureC: 120 });
  assert.ok(!ids(r.material).includes('hdpe'));
  assert.ok(!ids(r.material).includes('frp'));
  assert.ok(ids(r.material).includes('titanium'));
});

test('low budget penalises expensive options and warns', () => {
  const hi = select(base).coating.find((x) => x.id === 'zn-epoxy-pu');
  const lo = select({ ...base, budget: 1 }).coating.find((x) => x.id === 'zn-epoxy-pu');
  assert.ok(lo.score < hi.score);
  assert.ok(lo.warnings.some((w) => /budget/i.test(w)));
});

test('required life longer than typical adds a warning', () => {
  const r = select({ ...base, environment: 'rural', chloridePpm: 10, lifeYears: 40 });
  assert.ok(r.coating.every((c) => c.warnings.some((w) => /shorter/.test(w))));
});

test('results are sorted by score descending', () => {
  const r = select(base);
  for (const k of ['material', 'coating']) {
    for (let i = 1; i < r[k].length; i++) assert.ok(r[k][i - 1].score >= r[k][i].score);
  }
});

test('validate rejects bad input', () => {
  assert.throws(() => validate({ ...base, environment: 'moon' }));
  assert.throws(() => validate({ ...base, ph: 20 }));
  assert.throws(() => validate({ ...base, temperatureC: NaN }));
  assert.throws(() => validate({ ...base, budget: 5 }));
});

import { galvanic, materialPoints } from '../src/engine.js';

test('life-cycle cost index grows with renewals', () => {
  const r = select({ ...base, environment: 'rural', chloridePpm: 10, lifeYears: 30 });
  const alkyd = r.coating.find((x) => x.id === 'alkyd');   // typical 12 y -> 2 renewals
  assert.equal(alkyd.renewals, 2);
  assert.equal(alkyd.lccIndex, 1 * (1 + 2 * 0.8));
  const epoxyPu = r.coating.find((x) => x.id === 'epoxy-pu'); // typical 25 y -> 1 renewal
  assert.equal(epoxyPu.renewals, 1);
});

test('nickel alloys survive hot acid where stainless does not', () => {
  const r = select({ ...base, environment: 'acid', ph: 1, chloridePpm: 20000, temperatureC: 90 });
  assert.ok(ids(r.material).includes('c276'));
  assert.ok(!ids(r.material).includes('ss316l'));
});

test('galvanic: steel to stainless fails in seawater, 316L to 2205 is fine', () => {
  const bad = galvanic('carbon-steel', 'ss316l', 'seawater');
  assert.equal(bad.compatible, false);
  assert.equal(bad.anode, 'Carbon steel (bare)');
  assert.equal(galvanic('ss316l', 'duplex2205', 'seawater').compatible, true);
});

test('galvanic: limit is looser in rural than marine exposure', () => {
  assert.equal(galvanic('cuni', 'superduplex', 'rural').compatible, true);   // 0.15 V
  assert.equal(galvanic('carbon-steel', 'al5083', 'marine').compatible, true); // 0.05 V
  assert.equal(galvanic('ss304', 'carbon-steel', 'rural').compatible, false);  // 0.35 V
  assert.throws(() => galvanic('frp', 'ss304', 'rural'));
});

test('materialPoints covers every material with a tier', () => {
  const pts = materialPoints(select(base));
  assert.equal(pts.length, 13);
  assert.ok(pts.every((p) => p.props.costPerKg > 0 && p.tier));
  assert.ok(pts.some((p) => p.tier === 'Excluded' && p.reason));
});
