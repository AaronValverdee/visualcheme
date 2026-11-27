---
id: theory-index
title: Visualcheme Theoretical Foundations
scope: platform-wide
primary_references:
  - "Towler, G., & Sinnott, R. (2013). Chemical Engineering Design: Principles, Practice and Economics of Plant and Process Design (2nd ed.). Butterworth-Heinemann / Elsevier."
  - "Seider, W. D., Lewin, D. R., Seader, J. D., Widagdo, S., Gani, R., & Ng, K. M. (2017). Product and Process Design Principles: Synthesis, Analysis, and Evaluation (4th ed.). John Wiley & Sons."
---

# Visualcheme — Theoretical Foundations & Reference Environment

> **Complete textbook-grounded mathematical, physical, and engineering support for every equation, factor, correlation, diagram, visual cue, and diagnostic shown in Visualcheme.**

Visualcheme is designed as a transparent, real-time learning platform for process engineering. Rather than hiding balances behind black-box simulator tables, every number, color gradient, curve, and warning on screen corresponds to a specific physical law, empirical correlation, or engineering heuristic. This Markdown environment documents **every single technical concept presented to the user**, derives its governing equations, grounds it in canonical chemical engineering design textbooks, and explicitly **contrasts** differences in conventions, scope, and assumptions across references and the software implementation.

---

## 1. Authoritative Reference Sources & Citation Tags

Every theoretical sheet uses consistent inline provenance tags so learners and developers can verify the exact origin of each equation, table, or heuristic:

| Tag | Source | Role in Visualcheme |
| :--- | :--- | :--- |
| **[T&S]** | **Towler, G., & Sinnott, R. (2013).** *Chemical Engineering Design: Principles, Practice and Economics of Plant and Process Design* (2nd ed.). Butterworth-Heinemann / Elsevier. (`reference texts/Chemical Engineering Design, Principles, Second Edition.pdf`) | Primary equipment-design reference: pipeline pressure drop (Ch. 20.4), pipe roughness & fitting/valve $K$ values (Tables 20.3–20.4), valve selection & $C_v$ sizing (Ch. 20.5, 20.11), centrifugal pump hydraulics & NPSH (Ch. 20.7), economic pipe sizing & velocity guides (Ch. 20.10), physical property models (Ch. 4.4), and heat-transfer fundamentals (Ch. 19). |
| **[S&L]** | **Seider, W. D., Lewin, D. R., Seader, J. D., Widagdo, S., Gani, R., & Ng, K. M. (2017).** *Product and Process Design Principles: Synthesis, Analysis, and Evaluation* (4th ed.). John Wiley & Sons. (`reference texts/Product_and_Process_Design_Principles.pdf`) | Process synthesis, simulation, and thermodynamic framework: pressure-change heuristics (Ch. 6.7, Heuristics 37–43), process simulation & DIPPR property architecture (Ch. 7), Second-Law & lost-work analysis of friction, valves, and pumps (Ch. 10), Darcy/Fanning pressure drop & tube heat transfer (Ch. 12.3), pump total head, affinity laws, viscosity derating & simulator heating (Ch. 14.1), laminar parabolic velocity profile (Ch. 15.3), pump selection, efficiency correlations & NPSH worked design (Ch. 16.5), and laminar entry length & Hagen–Poiseuille flow (Ch. 24.1). |
| **[EXT]** | **Classical Fluid Mechanics, DIPPR® 801 / ChemSep & Numerical Analysis** (Colebrook 1939; Moody 1944; Swamee & Jain 1976; Churchill 1977; Crane TP-410; Weisbach; White / Çengel; ChemSep / DIPPR Project 801) | Explicit extensions where Visualcheme goes beyond the two process-design textbooks to provide continuous 1D spatial resolution, explicit/implicit Moody correlations, radial velocity fields, animated flow diagnostics, and non-isothermal RK4 marching. |

> [!NOTE]
> **Page Number Convention**: All textbook page citations refer to the **printed book page numbers** (not raw PDF page indices). For Towler & Sinnott 2nd ed., PDF page $\approx$ printed page $+ 9$ in Ch. 20 (e.g., Ch. 20 begins on printed p. 1207 / PDF p. 1216). For Seider et al. 4th ed., PDF page $=$ printed page $+ 36$ (e.g., Ch. 14 begins on printed p. 397 / PDF p. 433).

---

## 2. Environment Map & Navigation

This documentation tree separates **cross-unit fundamentals** (shared by all current and future equipment modules) from **unit-specific theory** (currently `pipe-flow/`, with future units designed to slot in as sibling directories):

```text
docs/theory/
├── README.md                                       ← You are here
├── nomenclature.md                                 ← Master symbols, units & convention reconciliation
├── fundamentals/                                   ← Shared across all process units
│   ├── 01-thermophysical-properties.md             ← DIPPR 801 / ChemSep equations, β, fluids, range checks
│   └── 02-conservation-and-second-law.md           ← 1D mass/momentum/enthalpy ODEs, JT effect, U/NTU, Lost Work
└── pipe-flow/                                      ← Active Unit 1: Pipe Flow
    ├── README.md                                   ← Complete UI-Element → Theory traceability matrix
    ├── 01-flow-regimes-and-velocity-profiles.md    ← v, Re, regimes, parabolic & 1/n profiles, Le, canvas physics
    ├── 02-friction-and-moody-diagram.md            ← Darcy vs Fanning vs T&S f, Colebrook, Swamee–Jain, Churchill, ε/D, Moody
    ├── 03-minor-losses-fittings-and-valves.md      ← K vs Le/D, fittings, entrances/exits, valves, log-log K(h), Cv
    ├── 04-grade-lines-and-elevation.md             ← ΔP vs h_L vs ρgΔz, HGL, EGL, vessel boundaries, minSpan
    ├── 05-centrifugal-pumps-and-npsh.md            ← H–Q, η–Q, system curve, duty point, power, NPSH, cavitation, sizing
    ├── 06-validity-phase-change-and-presets.md     ← Freezing, boiling, flashing, cavitation alerts, RK4, 11 presets
    └── 07-textbook-contrast-and-audit.md           ← Side-by-side T&S vs S&L vs Visualcheme contrast & code citation audit
```

### Quick Reading Paths

- **Starting from the UI?** Open the [Pipe Flow UI-to-Theory Map](pipe-flow/README.md) to jump straight from any slider, KPI card, badge, chart, warning, or preset to its exact governing equations.
- **Checking symbol & friction-factor conventions?** Read [Master Nomenclature & Conventions](nomenclature.md) — especially the critical $f_D = 4 C_f = 8 f_{\text{T\&S}}$ reconciliation.
- **Studying Pipe Flow sequentially (course order)?**
  1. [Thermophysical Properties](fundamentals/01-thermophysical-properties.md)
  2. [Conservation Laws & Second-Law Context](fundamentals/02-conservation-and-second-law.md)
  3. [Flow Regimes & Velocity Profiles](pipe-flow/01-flow-regimes-and-velocity-profiles.md)
  4. [Friction Correlations & the Moody Diagram](pipe-flow/02-friction-and-moody-diagram.md)
  5. [Minor Losses: Fittings, Entrances, Exits & Valves](pipe-flow/03-minor-losses-fittings-and-valves.md)
  6. [Grade Lines (HGL/EGL) & Elevation](pipe-flow/04-grade-lines-and-elevation.md)
  7. [Centrifugal Pumps, System Curves & NPSH](pipe-flow/05-centrifugal-pumps-and-npsh.md)
  8. [Model Validity, Phase Change, Numerics & Presets](pipe-flow/06-validity-phase-change-and-presets.md)
  9. [Textbook Contrast & Codebase Audit](pipe-flow/07-textbook-contrast-and-audit.md)

---

## 3. Design for Future Platform Integration & New Units

Each Markdown file includes structured **YAML frontmatter** (`id`, `title`, `unit`, `ui_elements`, `symbols`, `code_files`, `references`) so that when Visualcheme expands its interactive learning features:

1. **In-App Learning Drawers & Equation Popovers**: Frontend components (`controls_panel.ts`, `metrics_hud.ts`, `fluid_state_bar.ts`, `warnings_panel.ts`, `diagram_chart.ts`) can query `ui_elements` IDs to render contextual theory cards with KaTeX/MathJax.
2. **Future Unit Operations**: Adding new modules from the Visualcheme roadmap follows the exact same pattern:
   - `docs/theory/heat-exchangers/` (grounded in **[T&S]** Ch. 19 & **[S&L]** Ch. 12)
   - `docs/theory/phase-separators/` (grounded in **[T&S]** Ch. 16 & **[S&L]** Ch. 6.9, 9)
   - `docs/theory/distillation/` (grounded in **[T&S]** Ch. 17 & **[S&L]** Ch. 9, 13)
   - `docs/theory/reactors/` (grounded in **[T&S]** Ch. 15 & **[S&L]** Ch. 8, 15)
   - `docs/theory/exergy-and-pinch/` (grounded in **[T&S]** Ch. 3 & **[S&L]** Ch. 10, 11)
