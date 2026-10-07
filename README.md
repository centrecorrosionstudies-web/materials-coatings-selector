# Materials & Coatings Selector

A first-pass screening tool for corrosion engineers, inspectors and small engineering firms. Describe the service environment and it ranks:

- **Materials**: carbon and galvanized steel, stainless grades, duplex and super duplex, Cu-Ni, titanium, aluminium, nickel alloys 625 and C-276, FRP and HDPE
- **Coating systems** on carbon steel: alkyd, epoxy/PU, C5 zinc-rich systems, duplex galvanizing, thermally sprayed aluminium, glass-flake, FBE, 3LPE and rubber lining
- **Cathodic protection**: sacrificial anodes and impressed current

Each option shows a score, a fit tier, a relative life-cycle cost, the reasons for its rank, warnings and practical notes.

It also provides:

- **Ashby chart**: a log-log property map of every material, coloured by how well it screened for the current environment. Each axis can be price per kg, strength, density, specific strength or maximum temperature. It has hover and keyboard tooltips, plus a data-table view.
- **Galvanic check**: pick two metals in contact. It compares their anodic-index difference with the limit for the environment (0.15 V harsh/wetted, 0.25 V normal atmospheric) and names the metal that will corrode.
- **Life-cycle cost index**: initial cost plus the renewals needed to reach the design life, weighted by kind (material 1.2×, coating 0.8×, CP 0.5× of initial cost per renewal).
- **Print / save PDF report**: a clean printout with the inputs, chart and ranked options.
- **Works offline**: it can be installed as a PWA. A service worker caches the app after the first visit, so it works on site without a connection. Options that fail a hard limit are listed separately with the reason, such as temperature, pH, chloride or an unsuitable environment.

> Screening guidance only. The data are generalised rules of thumb, not design values. Confirm any final selection with a qualified corrosion engineer and the relevant standards (ISO 12944, AMPP/NACE SP0169, ISO 15589, etc.).

## Inputs

| Input | Used for |
|---|---|
| Environment | Base suitability score (0-3) per option |
| Temperature (°C) | Hard upper limit per option; extra warnings, e.g. 316L in warm chlorides or zinc anodes above 50 °C |
| pH | Hard pH window per option |
| Chloride (ppm) | Hard limit for stainless grades in wetted environments |
| Soil resistivity (Ω·cm) | Warning on sacrificial anodes above ~5000 Ω·cm |
| Design life (years) | Penalty and warning when typical life falls short |
| Budget (low / medium / high) | Penalty and warning for options above budget |

## Run it

### Live site

Pushes to `main` run the tests and deploy to GitHub Pages (`.github/workflows/pages.yml`). This needs a one-time setup: in **Settings → Pages**, set *Source* to **GitHub Actions**.

### Locally

It has no dependencies and no build step. It is static HTML plus ES modules, so it can be hosted anywhere, including GitHub Pages.

```bash
npm start        # serves on http://localhost:8080 (needs python3)
npm test         # rules-engine tests (Node 18+)
```

Opening `index.html` directly from disk will not work, because browsers block ES modules on `file://`. Use a local server.

## Layout

- `src/data.js`: environments and candidate options with scores, limits and notes. **Edit this file to tune the engineering data.**
- `src/engine.js`: validation, hard exclusions, scoring and ranking
- `src/ashby.js`: Ashby chart (plain SVG, no library)
- `src/app.js`: browser UI
- `sw.js`, `manifest.webmanifest`, `icon.svg`: offline / installable app
- `test/engine.test.js`: engine tests

## Roadmap ideas

- Review and calibrate `src/data.js` against C2S field experience and supplier data
- Concrete rebar protection options (epoxy-coated, galvanized and stainless rebar, inhibitors, CP)
- Real cost inputs (local USD/m² or GHS/m²) in place of the 1-3 cost index
- Area-ratio input for the galvanic check
- Branded report header (C2S logo, project and engineer fields)
