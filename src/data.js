// Screening data. Scores are 0-3 per environment:
//   0 = not suitable, 1 = short life / marginal, 2 = good (~10-15 y), 3 = excellent (25 y+).
// Coatings are assumed to be applied on carbon steel. Values are generalised
// engineering rules of thumb for first-pass screening, not design data.

export const ENVIRONMENTS = {
  rural: { label: 'Atmospheric - rural / inland (ISO 12944 C2)', wet: false, defaultChloride: 10 },
  industrial: { label: 'Atmospheric - urban / industrial (C3-C4)', wet: false, defaultChloride: 50 },
  marine: { label: 'Atmospheric - coastal / splash zone (C5 / CX)', wet: false, defaultChloride: 500 },
  seawater: { label: 'Immersed - seawater', wet: true, defaultChloride: 19000 },
  freshwater: { label: 'Immersed - fresh / treated water', wet: true, defaultChloride: 50 },
  soil: { label: 'Buried - soil', wet: true, defaultChloride: 100 },
  acid: { label: 'Process - acidic liquid', wet: true, defaultChloride: 500 },
};

const env = (rural, industrial, marine, seawater, freshwater, soil, acid) => ({
  rural, industrial, marine, seawater, freshwater, soil, acid,
});

// cost: 1 = low, 2 = medium, 3 = high (installed, relative)
export const CANDIDATES = [
  // ---- Materials ----
  { id: 'carbon-steel', kind: 'material', name: 'Carbon steel (bare)', cost: 1,
    env: env(2, 1, 0, 0, 1, 1, 0), maxTempC: 400, minPH: 5, maxPH: 13,
    notes: 'Needs a corrosion allowance; pair with a coating or cathodic protection for anything but mild exposure.' },
  { id: 'galvanized', kind: 'material', name: 'Hot-dip galvanized steel', cost: 1,
    env: env(3, 2, 1, 0, 1, 1, 0), maxTempC: 200, minPH: 6, maxPH: 12,
    notes: 'Zinc is attacked quickly outside pH 6-12 and in hot water (~60-80 C).' },
  { id: 'ss304', kind: 'material', name: 'Stainless steel 304', cost: 2,
    env: env(3, 3, 1, 0, 2, 1, 1), maxTempC: 800, minPH: 1, maxPH: 14, maxChloridePpm: 200,
    notes: 'Prone to chloride pitting and stress corrosion cracking.' },
  { id: 'ss316l', kind: 'material', name: 'Stainless steel 316L', cost: 2,
    env: env(3, 3, 2, 1, 3, 2, 2), maxTempC: 800, minPH: 1, maxPH: 14, maxChloridePpm: 1000,
    check: ({ temperatureC, chloridePpm }) =>
      temperatureC > 60 && chloridePpm > 200
        ? { warn: 'Above ~60 C with chlorides the risk of pitting and chloride SCC rises sharply.' } : {},
    notes: 'Good general-purpose stainless; marginal in warm chloride service.' },
  { id: 'duplex2205', kind: 'material', name: 'Duplex stainless 2205', cost: 3,
    env: env(3, 3, 3, 2, 3, 2, 2), maxTempC: 280, minPH: 1, maxPH: 14, maxChloridePpm: 5000,
    notes: 'Higher strength and chloride resistance than 316L; avoid long exposure above ~280 C.' },
  { id: 'superduplex', kind: 'material', name: 'Super duplex stainless 2507', cost: 3,
    env: env(3, 3, 3, 3, 3, 2, 2), maxTempC: 250, minPH: 1, maxPH: 14, maxChloridePpm: 60000,
    notes: 'Standard choice for seawater service; requires qualified welding procedures.' },
  { id: 'cuni', kind: 'material', name: 'Copper-nickel 90/10', cost: 3,
    env: env(3, 2, 3, 3, 2, 1, 0), maxTempC: 100, minPH: 6, maxPH: 9,
    check: () => ({ warn: 'Sensitive to sulphide-polluted water and high flow velocity (erosion-corrosion).' }),
    notes: 'Good biofouling and seawater resistance.' },
  { id: 'titanium', kind: 'material', name: 'Titanium (grade 2)', cost: 3,
    env: env(3, 3, 3, 3, 3, 3, 2), maxTempC: 300, minPH: 1, maxPH: 14,
    notes: 'Excellent in chlorides and oxidising acids; poor in reducing acids and with fluorides. Galvanic risk to other metals.' },
  { id: 'al5083', kind: 'material', name: 'Aluminium 5083', cost: 2,
    env: env(3, 2, 3, 2, 2, 0, 0), maxTempC: 65, minPH: 4, maxPH: 9,
    notes: 'Isolate from steel to avoid galvanic attack; limited above 65 C (sensitisation).' },
  { id: 'frp', kind: 'material', name: 'FRP / GRP (resin-matrix composite)', cost: 2,
    env: env(3, 3, 3, 3, 3, 3, 3), maxTempC: 90, minPH: 0, maxPH: 14,
    notes: 'Resin must be matched to the chemical; check UV protection and structural limits.' },
  { id: 'hdpe', kind: 'material', name: 'HDPE / polyethylene', cost: 1,
    env: env(2, 2, 2, 3, 3, 3, 3), maxTempC: 60, minPH: 0, maxPH: 14,
    notes: 'Pressure and temperature rating drop together; UV-stabilise if exposed.' },

  // ---- Coatings (on carbon steel) ----
  { id: 'alkyd', kind: 'coating', name: 'Alkyd paint system', cost: 1,
    env: env(2, 1, 0, 0, 0, 0, 0), maxTempC: 120, minPH: 5, maxPH: 9,
    notes: 'Economical for mild exposure; short maintenance interval.' },
  { id: 'epoxy-pu', kind: 'coating', name: 'Epoxy + polyurethane (3-coat)', cost: 2,
    env: env(3, 3, 2, 0, 1, 0, 0), maxTempC: 120, minPH: 3, maxPH: 12,
    notes: 'Workhorse atmospheric system. Blast-clean to Sa 2.5 for best results.' },
  { id: 'zn-epoxy-pu', kind: 'coating', name: 'Zinc-rich primer + epoxy + PU (C5 system)', cost: 3,
    env: env(3, 3, 3, 1, 1, 0, 0), maxTempC: 120, minPH: 5, maxPH: 11,
    notes: 'Heavy-duty coastal system; zinc primer gives cut-edge protection.' },
  { id: 'hdg-duplex', kind: 'coating', name: 'Galvanizing + paint (duplex system)', cost: 3,
    env: env(3, 3, 3, 0, 1, 1, 0), maxTempC: 120, minPH: 6, maxPH: 12,
    notes: 'Life is longer than the sum of its parts; surface prep of zinc must be correct.' },
  { id: 'tsa', kind: 'coating', name: 'Thermal-sprayed aluminium + sealer', cost: 3,
    env: env(3, 3, 3, 3, 2, 0, 0), maxTempC: 450, minPH: 5, maxPH: 9,
    notes: 'Very long life offshore and at elevated temperature; needs skilled applicators.' },
  { id: 'glassflake', kind: 'coating', name: 'High-build epoxy / glass-flake', cost: 3,
    env: env(2, 2, 2, 3, 3, 1, 2), maxTempC: 90, minPH: 2, maxPH: 13,
    notes: 'Immersion-grade lining for tanks, hulls and splash zones.' },
  { id: 'fbe', kind: 'coating', name: 'Fusion-bonded epoxy (FBE)', cost: 2,
    env: env(0, 0, 0, 1, 2, 3, 0), maxTempC: 100, minPH: 3, maxPH: 13,
    notes: 'Pipeline coating; field-joint coating is the weak point. Needs cathodic protection.' },
  { id: '3lpe', kind: 'coating', name: '3-layer polyethylene (3LPE)', cost: 2,
    env: env(0, 0, 0, 2, 2, 3, 0), maxTempC: 80, minPH: 3, maxPH: 13,
    notes: 'Tough mechanical protection for buried pipe; shields some CP current, so check for disbondment.' },

  // ---- Cathodic protection ----
  { id: 'sacrificial', kind: 'cp', name: 'Sacrificial anodes (Al / Zn / Mg)', cost: 2,
    env: env(0, 0, 0, 3, 1, 2, 0), maxTempC: 60,
    check: ({ environment, resistivityOhmCm, temperatureC }) => {
      const warn = [];
      if (environment === 'soil' && resistivityOhmCm > 5000) warn.push('Soil resistivity above ~5000 ohm.cm: anode output is low; consider impressed current or magnesium anodes.');
      if (temperatureC > 50) warn.push('Zinc anodes can passivate above ~50 C; use aluminium-based alloys.');
      return warn.length ? { warn: warn.join(' ') } : {};
    },
    notes: 'No external power. Use with a coating to reduce current demand. Applies to steel structures.' },
  { id: 'iccp', kind: 'cp', name: 'Impressed current (ICCP)', cost: 3,
    env: env(0, 0, 0, 3, 2, 3, 0), maxTempC: 80,
    notes: 'Needs power, monitoring and stray-current checks. Best for large or high-resistivity structures.' },
];

export const CP_NOTE = 'Cathodic protection applies to steel in electrolyte (soil or water) and should be combined with a coating.';
