---
id: pipe-flow-index
title: Pipe Flow Module — Complete UI-to-Theory Traceability Map
unit: pipe_flow
ui_elements:
  - unit-tab:pipe_flow
code_files:
  - index.html
  - src/main.ts
  - src/core/units/pipe/pipe_unit.ts
  - src/ui/components/controls_panel.ts
  - src/ui/components/property_bar.ts
  - src/ui/components/metrics_hud.ts
  - src/ui/components/fluid_state_bar.ts
  - src/ui/components/warnings_panel.ts
  - src/ui/charts/spatial_chart.ts
  - src/ui/charts/diagram_chart.ts
  - src/ui/renderers/pipe_renderer.ts
  - src/ui/renderers/pipe_route.ts
references:
  - "[T&S] Ch. 20 (Transport and Storage of Fluids), pp. 1207–1265; Ch. 4.4, pp. 169–183"
  - "[S&L] Ch. 6.7, Ch. 7, Ch. 10, Ch. 12.3, Ch. 14.1, Ch. 15.3, Ch. 16.5, Ch. 24.1"
---

# Pipe Flow Module — UI-to-Theory Traceability Map

Every visible element on Visualcheme's **Pipe Flow** visualization page is mapped below to its exact theoretical sheet, governing equation(s), and source module.

---

## 1. Module Documents

| # | Document | Core Topics Covered |
| :-: | :--- | :--- |
| 01 | [Flow Regimes & Velocity Profiles](01-flow-regimes-and-velocity-profiles.md) | Mean velocity $v$, $\mathrm{Re}$, laminar/transition/turbulent boundaries, Hagen–Poiseuille parabola, turbulent $1/n$ power law, entrance length $L_e$, canvas tracers & Dean drift |
| 02 | [Friction & the Moody Diagram](02-friction-and-moody-diagram.md) | Darcy vs. Fanning vs. **[T&S]** $f$, Hagen–Poiseuille $64/\mathrm{Re}$, Colebrook–White, Swamee–Jain, Churchill, Petukhov–Gnielinski, surface roughness $\varepsilon$, Moody chart |
| 03 | [Minor Losses: Fittings & Valves](03-minor-losses-fittings-and-valves.md) | $K$ vs. $L_e/D$, elbows & tees, rounded/sharp/re-entrant entrances, vena contracta, sudden tank exit, gate/globe/ball valves, log-log $K(h)$, ISA $C_v$ |
| 04 | [Grade Lines (HGL/EGL) & Elevation](04-grade-lines-and-elevation.md) | Pressure drop $\Delta P$ vs. hydrostatic elevation $\rho g \Delta z$ vs. head loss $h_L$, HGL & EGL, vessel boundaries, 1D spatial profile & `minSpan` |
| 05 | [Centrifugal Pumps, System Curves & NPSH](05-centrifugal-pumps-and-npsh.md) | Pump head, $H\text{–}Q$, $\eta\text{–}Q$, $NPSH_r(Q)$, affinity laws, viscosity derating, system curve, operating point, brake power, $NPSH_a$, cavitation, velocity heuristics & economic diameter |
| 06 | [Model Validity, Phase Change, Numerics & Presets](06-validity-phase-change-and-presets.md) | Freezing, boiling, flashing, valve cavitation, RK4 201-node march & point jumps, pedagogical walkthrough of all 11 Quick Presets |
| 07 | [Textbook Contrast & Codebase Audit](07-textbook-contrast-and-audit.md) | Comprehensive **[T&S]** vs. **[S&L]** vs. Visualcheme synthesis table, exact citation discrepancies identified in code & skills, roadmap for next learning features |

Shared fundamentals referenced across all units:
- [Thermophysical Properties & DIPPR / ChemSep Correlations](../fundamentals/01-thermophysical-properties.md)
- [Conservation Laws, Liquid Energy Balance & Second-Law Context](../fundamentals/02-conservation-and-second-law.md)
- [Master Nomenclature & Convention Reconciliation](../nomenclature.md)

---

## 2. Complete UI-Element Traceability Matrix

### 2.1 Plotted Variable Bar (`#property-bar`)

| UI Pill | Symbol | Unit | Governing Definition | Theory Sheet |
| :--- | :---: | :---: | :--- | :--- |
| **Pressure** | `P` | kPa | Integrated from $dP/dx = -f\rho v^2/(2D) - \rho g \sin\theta$ + discrete jumps | [04-grade-lines](04-grade-lines-and-elevation.md), [02-conservation](../fundamentals/02-conservation-and-second-law.md) |
| **Hydraulic Grade** | `HGL` | m | $z(x) + P(x)/(\rho(x) g)$ | [04-grade-lines](04-grade-lines-and-elevation.md) |
| **Energy Grade** | `EGL` | m | $\text{HGL}(x) + v(x)^2/(2g)$ (equals HGL inside still vessels/tanks) | [04-grade-lines](04-grade-lines-and-elevation.md) |
| **Temperature** | `T` | °C | Coupled liquid enthalpy ODE with $q'$, viscous heating & $\beta T$ term | [02-conservation](../fundamentals/02-conservation-and-second-law.md) |
| **Head Loss** | `h_L` | m | Cumulative irreversible $\int (f v^2 / 2gD)\,dx + \sum K v^2/(2g)$ | [02-friction](02-friction-and-moody-diagram.md), [04-grade-lines](04-grade-lines-and-elevation.md) |
| **Dynamic Viscosity** | `μ` | cP | $\mu(T(x))$ from DIPPR 101 | [01-properties](../fundamentals/01-thermophysical-properties.md) |
| **Reynolds Number** | `Re` | — | $4\dot{m}/(\pi D \mu(T(x)))$ | [01-flow-regimes](01-flow-regimes-and-velocity-profiles.md) |

### 2.2 Left Panel — Equipment Controls (`#controls-container`)

| Category | Control (`param id`) | Range / Options | Theory Sheet |
| :--- | :--- | :--- | :--- |
| **Fluid / Substance** | Working Fluid (`fluid`) | Water, Ethanol, Benzene, Acetone, Toluene, Ethylene glycol | [01-properties](../fundamentals/01-thermophysical-properties.md) |
| **Inlet Conditions** | Inlet Mean Velocity (`velocity`) | $0.05\text{–}8.0\text{ m/s}$ (ignored in `operating_point` mode) | [01-flow-regimes](01-flow-regimes-and-velocity-profiles.md) |
| **Inlet Conditions** | Inlet Fluid Temperature (`temp_c`) | $2\text{–}95\,^\circ\text{C}$ | [01-properties](../fundamentals/01-thermophysical-properties.md), [02-conservation](../fundamentals/02-conservation-and-second-law.md) |
| **Inlet Conditions** | Ambient Temperature (`ambient_temp_c`) | $-10\text{–}50\,^\circ\text{C}$ | [02-conservation](../fundamentals/02-conservation-and-second-law.md) |
| **Inlet Conditions** | Inlet Pressure, abs. (`p_inlet_kpa`) | $100\text{–}1000\text{ kPa}$ ($P_1$ in NPSH) | [04-grade-lines](04-grade-lines-and-elevation.md), [05-pumps](05-centrifugal-pumps-and-npsh.md) |
| **Geometry** | Internal Diameter (`diameter_mm`) | $10\text{–}300\text{ mm}$ | [01-flow-regimes](01-flow-regimes-and-velocity-profiles.md), [02-friction](02-friction-and-moody-diagram.md) |
| **Geometry** | Pipe Length (`length_m`) | $2\text{–}200\text{ m}$ | [02-friction](02-friction-and-moody-diagram.md), [06-validity](06-validity-phase-change-and-presets.md) |
| **Geometry** | Elevation Rise (`elevation_m`) | $-30\text{ to }+30\text{ m}$ (clipped to $\pm L$) | [04-grade-lines](04-grade-lines-and-elevation.md) |
| **Geometry** | Pipe Material (`material`) | Drawn tubing, Stainless, Commercial steel, Galvanized, Cast iron, Concrete | [02-friction](02-friction-and-moody-diagram.md) |
| **Geometry** | Conduit Insulation (`heat_transfer_mode`) | Bare ($U=15$), Insulated ($U=0.5$), Adiabatic ($U=0$) | [02-conservation](../fundamentals/02-conservation-and-second-law.md) |
| **Fittings (accidentes)** | Entrance (`entrance`) | None, Rounded ($0.05$), Sharp ($0.5$), Re-entrant ($0.8$) | [03-minor-losses](03-minor-losses-fittings-and-valves.md), [04-grade-lines](04-grade-lines-and-elevation.md) |
| **Fittings (accidentes)** | Exit (`exit`) | None, Sudden exit into tank ($K = 1.0$) | [03-minor-losses](03-minor-losses-fittings-and-valves.md), [04-grade-lines](04-grade-lines-and-elevation.md) |
| **Fittings (accidentes)** | 6 Line Fitting Counts (`n_elbow_*`, `n_tee_*`) | $0\text{–}12$ each: 90° std, 90° LR, 45°, Square, Tee into/from branch | [03-minor-losses](03-minor-losses-fittings-and-valves.md) |
| **Operations & Valves** | In-Line Valve Opening (`valve_opening_pct`) | $5\text{–}100\%$ at $x = 0.6 L$ | [03-minor-losses](03-minor-losses-fittings-and-valves.md) |
| **Operations & Valves** | Valve Type (`valve_type`) | Gate, Globe (plug disk), Ball / Plug Cock | [03-minor-losses](03-minor-losses-fittings-and-valves.md) |
| **Centrifugal Pump** | Install Pump (`pump_enabled`) & Drive (`drive_mode`) | On/Off; `imposed` vs. `operating_point` | [05-pumps](05-centrifugal-pumps-and-npsh.md) |
| **Centrifugal Pump** | Pump Station (`pump_position_pct`) | $0\text{–}80\%$ of $L$ (splits suction vs. discharge) | [05-pumps](05-centrifugal-pumps-and-npsh.md) |
| **Centrifugal Pump** | Curve Params (`h_shutoff_m`, `q_max_m3h`, `q_bep_m3h`, `eta_bep`, `npshr_m`) | Parabolic $H(Q)$, $\eta(Q)$, quadratic $NPSH_r(Q)$ | [05-pumps](05-centrifugal-pumps-and-npsh.md) |
| **Centrifugal Pump** | Delivery Pressure, abs. (`p_delivery_kpa`) | $50\text{–}1200\text{ kPa}$ (sets $H_{\text{static}}$) | [05-pumps](05-centrifugal-pumps-and-npsh.md) |
| **Model Options** | Friction Correlation (`friction_model`) | Colebrook–White, Swamee–Jain, Churchill 1977 | [02-friction](02-friction-and-moody-diagram.md) |

### 2.3 Center Stage — KPI Strip, Bulk HUD, Warnings & 2D Canvas

| UI Region | Displayed Element | Theory Sheet |
| :--- | :--- | :--- |
| **KPI Cards (`#metrics-strip`)** | `Flow Regime` (`Re`, `f`, correlation), `Total Pressure Drop` (component split), `Valve Loss` ($K$, $\Delta P$), `Fittings` ($\Sigma K$, $L_e$), `Discharge Temperature`, `Head Loss` ($h_L$, $Q$, $\dot{m}$), `Pump Head` ($H$, $\eta$, $P_B$), `NPSHa` ($NPSH_a$, $NPSH_r$, margin) | [01](01-flow-regimes-and-velocity-profiles.md), [02](02-friction-and-moody-diagram.md), [03](03-minor-losses-fittings-and-valves.md), [04](04-grade-lines-and-elevation.md), [05](05-centrifugal-pumps-and-npsh.md), [02-conservation](../fundamentals/02-conservation-and-second-law.md) |
| **Validity Strip (`#warnings-strip`)** | `Model invalid` alerts (freezing, boiling, flashing, cavitation, dead-head); `Caution` warnings (valve cavitation, transition, $L_e/L$, low NPSH margin, runout, velocity bands, correlation range); `Note` advisories | [06-validity](06-validity-phase-change-and-presets.md), [05-pumps](05-centrifugal-pumps-and-npsh.md) |
| **Bulk & Transport Bar (`#fluid-state-bar`)** | Inlet $\to$ outlet $v$, $\mathrm{Re}$ + regime tag, $f$, $\rho$, $\mu$, entrance length $L_e$ & profile shape (`parabolic` vs. `1/n power law`) | [01-flow-regimes](01-flow-regimes-and-velocity-profiles.md), [01-properties](../fundamentals/01-thermophysical-properties.md) |
| **2D Canvas (`#simulation-canvas`)** | Routed bend radii ($1D$, $1.5D$, mitred), tee dead legs, entrance vena contracta & exit jet, valve cutaways, rotating impeller status colors, velocity profile overlay, tracer advection/turbulent mixing/wakes/Dean drift, cavitation & flashing bubbles, heatmap colorbar (`minSpan`), transit clock, hover probe | [01-flow-regimes](01-flow-regimes-and-velocity-profiles.md), [03-minor-losses](03-minor-losses-fittings-and-valves.md), [04-grade-lines](04-grade-lines-and-elevation.md), [05-pumps](05-centrifugal-pumps-and-npsh.md), [06-validity](06-validity-phase-change-and-presets.md) |

### 2.4 Right Panel — Synchronized Figures

| Figure Container | Diagnostic Plot | Theory Sheet |
| :--- | :--- | :--- |
| `#spatial-chart-wrapper` | **1D Spatial Profile** along $x \in [0, L]$ with fitting ticks and valve/pump vertical markers | [04-grade-lines](04-grade-lines-and-elevation.md), [06-validity](06-validity-phase-change-and-presets.md) |
| `#pump-chart-wrapper` | **Pump & System Head vs. Capacity** ($H_{\text{pump}}$, $H_{\text{sys}}$, $NPSH_a$, $NPSH_r$, duty point & balance markers) | [05-pumps](05-centrifugal-pumps-and-npsh.md) |
| `#diagram-chart-wrapper` | **Moody Chart** ($\log f_D$ vs. $\log \mathrm{Re}$, laminar line, 9 Colebrook $\varepsilon/D$ curves, active pipe curve with dashed transition bridge, operating point) | [02-friction](02-friction-and-moody-diagram.md) |
