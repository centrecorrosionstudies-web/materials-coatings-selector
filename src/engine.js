import { CANDIDATES, ENVIRONMENTS } from './data.js';

const TYPICAL_LIFE_Y = { 3: 25, 2: 12, 1: 4 };

export function validate(input) {
  if (!input || !ENVIRONMENTS[input.environment]) throw new Error('Unknown environment');
  for (const k of ['temperatureC', 'chloridePpm', 'ph', 'lifeYears']) {
    if (!Number.isFinite(input[k])) throw new Error(`${k} must be a number`);
  }
  if (input.ph < 0 || input.ph > 14) throw new Error('ph must be between 0 and 14');
  if (input.chloridePpm < 0) throw new Error('chloridePpm cannot be negative');
  if (input.lifeYears <= 0) throw new Error('lifeYears must be positive');
  if (![1, 2, 3].includes(input.budget)) throw new Error('budget must be 1, 2 or 3');
}

function tier(score) {
  if (score >= 75) return 'Strong';
  if (score >= 45) return 'Suitable';
  return 'Marginal';
}

function evaluate(c, input) {
  const envInfo = ENVIRONMENTS[input.environment];
  const envScore = c.env[input.environment];
  if (envScore === 0) return { excluded: `Not suited to ${envInfo.label}` };
  if (input.temperatureC > c.maxTempC) return { excluded: `Service temperature above its ~${c.maxTempC} C limit` };
  if (c.minPH !== undefined && (input.ph < c.minPH || input.ph > c.maxPH)) {
    return { excluded: `pH ${input.ph} is outside its ${c.minPH}-${c.maxPH} range` };
  }
  if (envInfo.wet && c.maxChloridePpm !== undefined && input.chloridePpm > c.maxChloridePpm) {
    return { excluded: `Chloride above its ~${c.maxChloridePpm} ppm limit` };
  }
  const extra = c.check ? c.check(input) : {};
  if (extra.exclude) return { excluded: extra.exclude };

  const reasons = [];
  const warnings = [];
  let score = envScore * 30 + (4 - c.cost) * 2;
  reasons.push(['Poor', 'Marginal', 'Good', 'Excellent'][envScore] + ' fit for this environment');

  if (c.cost > input.budget) {
    score -= 15 * (c.cost - input.budget);
    warnings.push('Cost is above your stated budget level');
  }
  const typical = TYPICAL_LIFE_Y[envScore];
  if (input.lifeYears > typical) {
    score -= Math.min(30, (input.lifeYears - typical) * 1.5);
    warnings.push(`Typical life of ~${typical} y is shorter than the ${input.lifeYears} y required; plan maintenance or renewal`);
  } else {
    reasons.push(`Typical life of ~${typical} y meets the ${input.lifeYears} y target`);
  }
  if (extra.warn) warnings.push(extra.warn);

  score = Math.max(0, Math.round(score));
  return { item: { id: c.id, kind: c.kind, name: c.name, cost: c.cost, score, tier: tier(score), reasons, warnings, notes: c.notes } };
}

export function select(input) {
  validate(input);
  const out = { material: [], coating: [], cp: [], excluded: [] };
  for (const c of CANDIDATES) {
    const r = evaluate(c, input);
    if (r.excluded) out.excluded.push({ id: c.id, kind: c.kind, name: c.name, reason: r.excluded });
    else out[c.kind].push(r.item);
  }
  for (const k of ['material', 'coating', 'cp']) out[k].sort((a, b) => b.score - a.score || a.cost - b.cost);
  return out;
}
