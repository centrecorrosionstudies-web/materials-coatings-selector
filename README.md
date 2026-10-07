# Materials & Coatings Selector

A first-pass screening tool for corrosion engineers, inspectors and small engineering firms. Describe the service environment and it ranks:

- **Materials**: carbon and galvanized steel, stainless grades, duplex and super duplex, Cu-Ni, titanium, aluminium, FRP and HDPE
- **Coating systems** on carbon steel: alkyd, epoxy/PU, C5 zinc-rich systems, duplex galvanizing, thermally sprayed aluminium, glass-flake, FBE and 3LPE
- **Cathodic protection**: sacrificial anodes and impressed current

Each option shows a score, a fit tier, the reasons for its rank, warnings and practical notes. Options that fail a hard limit are listed separately with the reason, such as temperature, pH, chloride or an unsuitable environment.

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

It has no dependencies and no build step. It is static HTML plus ES modules, so it can be hosted anywhere, including GitHub Pages.

```bash
npm start        # serves on http://localhost:8080 (needs python3)
npm test         # rules-engine tests (Node 18+)
```

Opening `index.html` directly from disk will not work, because browsers block ES modules on `file://`. Use a local server.

## Layout

- `src/data.js`: environments and candidate options with scores, limits and notes. **Edit this file to tune the engineering data.**
- `src/engine.js`: validation, hard exclusions, scoring and ranking
- `src/app.js`: browser UI
- `test/engine.test.js`: engine tests

## Roadmap ideas

- Add more options: rubber linings, nickel alloys (625/C-276) and concrete rebar protection
- Model galvanic compatibility when two materials are joined
- Export a PDF selection report for clients
- Life-cycle cost comparison (installed cost plus maintenance over design life)
- Offline install as a PWA for field use
