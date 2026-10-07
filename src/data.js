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
  { id: 'carbon-steel', kind: 'material', short: 'Carbon steel', anodicIndexV: 0.85,
    props: { densityGcm3: 7.85, strengthMPa: 250, costPerKg: 1.0 }, name: 'Carbon steel (bare)', cost: 1,
    env: env(2, 1, 0, 0, 1, 1, 0), maxTempC: 400, minPH: 5, maxPH: 13,
    notes: 'Needs a corrosion allowance; pair with a coating or cathodic protection for anything but mild exposure.' },
  { id: 'galvanized', kind: 'material', short: 'Galvanized', anodicIndexV: 1.2,
    props: { densityGcm3: 7.85, strengthMPa: 250, costPerKg: 1.4 }, name: 'Hot-dip galvanized steel', cost: 1,
    env: env(3, 2, 1, 0, 1, 1, 0), maxTempC: 200, minPH: 6, maxPH: 12,
    notes: 'Zinc is attacked quickly outside pH 6-12 and in hot water (~60-80 C).' },
  { id: 'ss304', kind: 'material', short: '304', anodicIndexV: 0.5,
    props: { densityGcm3: 7.9, strengthMPa: 215, costPerKg: 3.5 }, name: 'Stainless steel 304', cost: 2,
    env: env(3, 3, 1, 0, 2, 1, 1), maxTempC: 800, minPH: 1, maxPH: 14, maxChloridePpm: 200,
    notes: 'Prone to chloride pitting and stress corrosion cracking.' },
  { id: 'ss316l', kind: 'material', short: '316L', anodicIndexV: 0.5,
    props: { densityGcm3: 8.0, strengthMPa: 170, costPerKg: 4.5 }, name: 'Stainless steel 316L', cost: 2,
    env: env(3, 3, 2, 1, 3, 2, 2), maxTempC: 800, minPH: 1, maxPH: 14, maxChloridePpm: 1000,
    check: ({ temperatureC, chloridePpm }) =>
      temperatureC > 60 && chloridePpm > 200
        ? { warn: 'Above ~60 C with chlorides the risk of pitting and chloride SCC rises sharply.' } : {},
    notes: 'Good general-purpose stainless; marginal in warm chloride service.' },
  { id: 'duplex2205', kind: 'material', short: '2205', anodicIndexV: 0.5,
    props: { densityGcm3: 7.8, strengthMPa: 450, costPerKg: 6 }, name: 'Duplex stainless 2205', cost: 3,
    env: env(3, 3, 3, 2, 3, 2, 2), maxTempC: 280, minPH: 1, maxPH: 14, maxChloridePpm: 5000,
    notes: 'Higher strength and chloride resistance than 316L; avoid long exposure above ~280 C.' },
  { id: 'superduplex', kind: 'material', short: '2507', anodicIndexV: 0.5,
    props: { densityGcm3: 7.8, strengthMPa: 550, costPerKg: 9 }, name: 'Super duplex stainless 2507', cost: 3,
    env: env(3, 3, 3, 3, 3, 2, 2), maxTempC: 250, minPH: 1, maxPH: 14, maxChloridePpm: 60000,
    notes: 'Standard choice for seawater service; requires qualified welding procedures.' },
  { id: 'cuni', kind: 'material', short: 'Cu-Ni 90/10', anodicIndexV: 0.35,
    props: { densityGcm3: 8.9, strengthMPa: 105, costPerKg: 12 }, name: 'Copper-nickel 90/10', cost: 3,
    env: env(3, 2, 3, 3, 2, 1, 0), maxTempC: 100, minPH: 6, maxPH: 9,
    check: () => ({ warn: 'Sensitive to sulphide-polluted water and high flow velocity (erosion-corrosion).' }),
    notes: 'Good biofouling and seawater resistance.' },
  { id: 'titanium', kind: 'material', short: 'Ti Gr2', anodicIndexV: 0.3,
    props: { densityGcm3: 4.5, strengthMPa: 275, costPerKg: 25 }, name: 'Titanium (grade 2)', cost: 3,
    env: env(3, 3, 3, 3, 3, 3, 2), maxTempC: 300, minPH: 1, maxPH: 14,
    notes: 'Excellent in chlorides and oxidising acids; poor in reducing acids and with fluorides. Galvanic risk to other metals.' },
  { id: 'al5083', kind: 'material', short: 'Al 5083', anodicIndexV: 0.9,
    props: { densityGcm3: 2.66, strengthMPa: 215, costPerKg: 4 }, name: 'Aluminium 5083', cost: 2,
    env: env(3, 2, 3, 2, 2, 0, 0), maxTempC: 65, minPH: 4, maxPH: 9,
    notes: 'Isolate from steel to avoid galvanic attack; limited above 65 C (sensitisation).' },
  { id: 'frp', kind: 'material', short: 'FRP', anodicIndexV: null,
    props: { densityGcm3: 1.9, strengthMPa: 200, costPerKg: 5 }, name: 'FRP / GRP (resin-matrix composite)', cost: 2,
    env: env(3, 3, 3, 3, 3, 3, 3), maxTempC: 90, minPH: 0, maxPH: 14,
    notes: 'Resin must be matched to the chemical; check UV protection and structural limits.' },
  { id: 'hdpe', kind: 'material', short: 'HDPE', anodicIndexV: null,
    props: { densityGcm3: 0.95, strengthMPa: 22, costPerKg: 2 }, name: 'HDPE / polyethylene', cost: 1,
    env: env(2, 2, 2, 3, 3, 3, 3), maxTempC: 60, minPH: 0, maxPH: 14,
    notes: 'Pressure and temperature rating drop together; UV-stabilise if exposed.' },

  { id: 'alloy625', kind: 'material', short: 'Alloy 625', anodicIndexV: 0.30,
    props: { densityGcm3: 8.44, strengthMPa: 415, costPerKg: 40 }, name: 'Nickel alloy 625', cost: 3,
    env: env(3, 3, 3, 3, 3, 3, 3), maxTempC: 600, minPH: 0, maxPH: 14,
    notes: 'Near-immune to chloride pitting and crevice corrosion; common as weld overlay or cladding to control cost.' },
  { id: 'c276', kind: 'material', short: 'C-276', anodicIndexV: 0.30,
    props: { densityGcm3: 8.89, strengthMPa: 355, costPerKg: 45 }, name: 'Nickel alloy C-276', cost: 3,
    env: env(3, 3, 3, 3, 3, 3, 3), maxTempC: 600, minPH: 0, maxPH: 14,
    notes: 'Strong in reducing acids, wet chlorine and hot chloride process streams; often the last resort before non-metallics.' },

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

  { id: 'rubber', kind: 'coating', name: 'Rubber lining (natural / chlorobutyl)', cost: 3,
    env: env(0, 0, 0, 3, 3, 0, 3), maxTempC: 80, minPH: 0, maxPH: 14,
    notes: 'Internal lining for tanks, pipes and pumps in acids, brines and abrasive slurries. Check the grade against the chemical.' },

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

// Cost of each renewal relative to the initial cost (access, surface prep, replacement).
export const RENEWAL_FACTOR = { material: 1.2, coating: 0.8, cp: 0.5 };

// Galvanic limits on anodic-index difference (V), after MIL-STD-889 / common practice.
export const GALVANIC_LIMIT_V = { harsh: 0.15, normal: 0.25 };
export const HARSH_ENVIRONMENTS = ['marine', 'seawater', 'freshwater', 'soil', 'acid'];

// Axes available on the Ashby chart. 'value' reads a material record.
export const ASHBY_AXES = {
  costPerKg: { label: 'Indicative price (USD/kg)', value: (m) => m.props.costPerKg },
  strengthMPa: { label: 'Strength (MPa, yield; tensile for FRP/HDPE)', value: (m) => m.props.strengthMPa },
  densityGcm3: { label: 'Density (g/cm³)', value: (m) => m.props.densityGcm3 },
  specificStrength: { label: 'Specific strength (MPa per g/cm³)', value: (m) => m.props.strengthMPa / m.props.densityGcm3 },
  maxTempC: { label: 'Max service temperature (°C)', value: (m) => m.maxTempC },
};

export const CP_NOTE = 'Cathodic protection applies to steel in electrolyte (soil or water) and should be combined with a coating.';
