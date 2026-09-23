# Visualcheme - Development History & Technical Architecture

> **Comprehensive Developer Guide**: How Visualcheme was built from inception, key architectural decisions, thermodynamic foundations, physics bugs investigated and solved, and how to extend the platform.

---

## 1. Executive Summary & Project Mission

Visualcheme is an open-source, client-side, real-time chemical engineering simulation and visualization platform. 

Traditional process simulators (Aspen Plus, HYSYS, DWSIM, PRO/II) are desktop-bound **point-state black boxes**:
* The user specifies stream inputs, clicks *Run*, and receives a static 0D output matrix.
* Spatial continuity inside equipment is obscured: boundary layer growth, localized throttling dissipation, heat transfer bottlenecks, and Second-Law irreversibilities are hidden.
* High license costs and heavy installations restrict accessible learning.

**Visualcheme's mission**: Provide a web-first, 60 FPS interactive unit operation visualizer that renders continuous internal physical gradients ($\vec{\Psi}(x)$) and live diagnostic engineering charts with sub-millisecond calculation latency.

---

## 2. Tech Stack Decisions: Why TypeScript & Client-Side Web?

| Decision Criterion | Traditional Approach (C++ / Fortran / C#) | Visualcheme Approach (Modern TypeScript + Vite) |
| :--- | :--- | :--- |
| **Execution Environment** | Desktop OS binaries (.exe / .so), heavy install footprint | 100% Client-side browser (zero installation, zero server cost) |
| **User Interaction** | Form entry $\rightarrow$ Run button $\rightarrow$ Wait $\rightarrow$ Output tables | Continuous sliders with 60 FPS live rendering (<1 ms solve time) |
| **Spatial Visualization** | Static 2D PFD icons, separate CAD / CFD tools | Native HTML5 Canvas 2D particle dynamics + interactive SVGs |
| **Thermodynamic Data** | Proprietary binary databases or multi-megabyte XML | Compact JSON databases (DIPPR® 801, DECHEMA NRTL) loaded in memory |
| **Portability** | OS-dependent compilation, licensing managers | Any modern web browser (Chrome, Edge, Firefox, Safari) |

Client-side TypeScript was chosen because:
1. **Mathematical Solvers are Fast**: 1D discretized fluid and thermal equations ($N = 100$ spatial nodes) execute in <0.5 ms in JavaScript V8, well within the 16.6 ms frame budget for 60 FPS.
2. **Instant Feedback Loop**: Sliders update internal state, particle velocities, color heatmaps, and Moody diagrams instantaneously without network lag.
3. **No Backend Infrastructure**: Entire application can be statically hosted on GitHub Pages, Vercel, or Netlify with zero operational cost.

---

## 3. Thermodynamic Backbone & Data Extraction

Industrial chemical engineering requires peer-reviewed, experimental thermophysical data. Visualcheme incorporates data from the two gold standards: **DIPPR® 801** and the **DECHEMA Chemistry Data Series**.

### 3.1. Extraction Pipeline (`scripts/`)
1. **Pure Component Database (`scripts/build_property_database.py` & `refine_compounds_json.py`)**:
   - Extracted **431 pure chemical species** into `src/core/database/compounds.json` (~1.05 MB).
   - Parameterized using DIPPR temperature correlation equations:
     - **Vapor Pressure $P^{sat}(T)$**: DIPPR 101 ($\ln P = A + B/T + C \ln T + D T^E$)
     - **Liquid Density $\rho_L(T)$**: DIPPR 105 (Rackett equation: $\rho = A / B^{1 + (1 - T/C)^D}$)
     - **Liquid Viscosity $\mu_L(T)$**: DIPPR 101 ($\ln \mu = A + B/T + C \ln T + D T^E$)
     - **Vapor Viscosity $\mu_V(T)$**: DIPPR 102
     - **Liquid Thermal Conductivity $k_L(T)$**: DIPPR 101
     - **Heat of Vaporization $\Delta H_{vap}(T)$**: DIPPR 106
     - **Heat Capacities $C_{p,L}(T), C_{p,V}(T)$**: DIPPR 107 / DIPPR 100
2. **Binary VLE Database (`src/core/database/binary_nrtl.json`)**:
   - Extracted **352 experimental binary pairs** from DECHEMA regressed data.
   - Contains NRTL parameters ($A_{12}, A_{21}, \alpha_{12}$) for non-ideal liquid activity coefficient calculations.
3. **High-Pressure EOS Matrix (`src/core/database/binary_pr.json`)**:
   - Extracted binary interaction coefficients ($k_{ij}$) for 38 common species under Peng-Robinson cubic equation of state.

### 3.2. Property Calculation Service (`src/core/database/property_service.ts`)
- All stored correlations are evaluated by one function, `evaluateCorrelation` in `src/core/thermo/correlations.ts`, which implements the ChemSep/DIPPR equation forms by number (1–5, 10, 16, 100, 101, 102, 105, 106) and reads each model's `[Tmin, Tmax]` regression range.
- Accessors for pure species: `calcLiquidDensity`, `calcLiquidViscosity`, `calcLiquidHeatCapacity`, `calcLiquidThermalConductivity`, `calcVaporPressure`, `calcHeatOfVaporization`, `calcLiquidExpansivity`, `calcVaporViscosity`.
- `getLiquidState(compound, T_K)` returns the full SI property set (ρ, μ, cp, k, P_vap, β) plus warnings when a correlation is extrapolated or missing. There are no per-compound special cases.

---

## 4. Codified Engineering Knowledge Base (`.agents/skills/`)

To ensure simulation accuracy, 10 specialized agent skills were created from **"Chemical Engineering Design"** (G. Towler & R. Sinnott, 2nd Edition), containing over 350 extracted figures, charts, and equations:

| Skill Directory | Focus Area | Key Equations & Methods |
| :--- | :--- | :--- |
| `che-fluid-transport-piping` | Pipe flow & pumping | Darcy-Weisbach, Colebrook-White, Churchill, Moody chart, pump NPSH |
| `che-heat-exchangers` | Thermal design | TEMA standards, LMTD, Kern method, Bell-Delaware, boiling/condensation |
| `che-reactors-mixers` | Reaction & mixing | CSTR/PFR sizing, impeller power curves ($N_P$ vs $Re$), blending times |
| `che-fluid-separators` | Phase separation | Souders-Brown terminal velocity, wire-mesh demisters, Stokes decanters |
| `che-distillation-columns` | Staged separation | MESH balances, McCabe-Thiele, Fenske-Underwood-Gilliland, Fair flooding |
| `che-process-simulation` | Flowsheet solvers | EOS vs. Activity selection tree, Rachford-Rice flash, tear streams |
| `che-utilities-pinch` | Energy integration | Composite Curves, Grand Composite Curve, Problem Table, HEN synthesis |
| `che-instrumentation-control` | Process control | P&ID symbols, control loops (feedback/cascade/ratio), valve $C_v$ sizing |
| `che-equipment-specification` | Sizing heuristics | Standard design safety margins, rules of thumb, data sheets |
| `che-solids-handling` | Particulate systems | Cyclone cut diameter ($d_{50}$), cake filtration resistance, rotary dryers |

---

## 5. Architectural Blueprint & Extensibility Pattern

The frontend and simulation engine are completely decoupled through a modular interface.

```
src/
├── core/
│   ├── database/          # Pure & binary JSON data + property service
│   ├── thermo/            # Friction & thermodynamic equation solvers
│   ├── types/
│   │   ├── properties.ts  # Central property registry & color scales
│   │   └── unit.ts        # UnitOperation common interface
│   └── units/
│       ├── pipe/          # Conduit & Pipe Flow unit implementation
│       └── registry.ts    # Unit registry singleton
├── ui/
│   ├── charts/            # Diagnostic charts (Moody SVG, 1D Spatial SVG)
│   ├── components/        # UI panels (controls sliders, HUD metrics, property bar)
│   └── renderers/         # 2D Canvas physics renderers (PipeRenderer)
├── index.css              # Custom Vanilla CSS design system (Dark HUD)
└── main.ts                # Application coordinator & event loop
```

### 5.1. The `UnitOperation` Interface (`src/core/types/unit.ts`)
Any chemical equipment unit implements:
```typescript
interface UnitOperation {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  getParameters(): UnitParameter[];
  setParameters(params: Record<string, number | string | boolean>): void;
  resetParameters(): void;
  
  calculate(): UnitSimulationResult;
}
```

### 5.2. Discretized Spatial State Vector $\vec{\Psi}(x)$
The calculation returns a 1D discretized array of spatial states:
$$\vec{\Psi}(x) = \left[ P(x),\, T(x),\, h_L(x),\, \frac{d\dot{E}x_{dest}}{dx}(x),\, v(x),\, Re(x),\, f(x),\, \rho(x),\, \mu(x) \right]$$
This vector feeds both the canvas heatmap and the 1D spatial SVG chart. Transport properties are evaluated at the local temperature, so they vary along the pipe when the fluid heats or cools (strongly so for viscous liquids such as ethylene glycol). Each property has a `minSpan` so that negligible variations are not stretched into full-scale color gradients.

### 5.3. Validity Diagnostics & Validation Tests
- Every `UnitSimulationResult` carries `warnings: SimulationWarning[]` (`info` / `warning` / `alert`). An `alert` means a model assumption is violated (e.g. the liquid would flash) and results past that point are not physical. The UI lists them under the KPI cards.
- `tests/` holds the physics validation suite (`npm test`): property data vs. NIST/Perry's, friction factors vs. Colebrook/Moody limits, the pipe unit vs. Towler Example 20.1 and Hagen-Poiseuille, and conservation checks (energy balance, hydrostatics, exergy = (T₀/T)·dissipation, exponential cooling).

### 5.4. Dynamic Property Registry (`src/core/types/properties.ts`)
Allows one-click switching of which continuous spatial physical gradient drives the fluid heatmap and 1D profile:
- **Pressure $P$** (`coolwarm` colormap: blue to red)
- **Temperature $T$** (`plasma` colormap: blue-purple to yellow)
- **Cumulative Head Loss $h_L$** (`viridis` colormap)
- **Exergy Destruction Rate $\frac{d\dot{E}x_{dest}}{dx}$** (`inferno` colormap: black/red to bright yellow)

---

## 6. Detailed Implementation: Conduit & Pipe Flow Unit

### 6.1. Hydrodynamic Solvers (`src/core/thermo/friction.ts`)
All friction factors are Darcy factors. Towler's Figure 20.5 plots $f_{Darcy}/8$ (Fanning is $f_{Darcy}/4$).
* **Laminar Flow ($Re < 2300$)**: $f = 64/Re$ (exact).
* **Turbulent Flow ($Re \ge 4000$)**, selectable:
  - Colebrook-White, solved by Newton-Raphson on $x = 1/\sqrt{f}$ to machine precision:
    $$\frac{1}{\sqrt{f}} = -2 \log_{10}\left( \frac{\varepsilon / D}{3.7} + \frac{2.51}{Re \sqrt{f}} \right)$$
  - Swamee-Jain explicit approximation (max 2.8% deviation from Colebrook, at $Re = 5000$, $\varepsilon/D = 0.01$).
  - Churchill (1977), a single equation for all regimes.
* **Transition ($2300 \le Re < 4000$)**: the flow is intermittent and $f$ is physically indeterminate. Colebrook and Swamee-Jain bridge it by log-log interpolation between $64/2300$ and the turbulent value at $Re = 4000$ (continuous at both ends); Churchill uses its own blend. The unit raises a caution in this range.
* **Valves**: $\Delta P_{valve} = K \rho v^2 / 2$, with $K$(opening) log-log interpolated from Towler Table 20.4 (gate: 0.15 / 1 / 4 / 16 at fully / ¾ / ½ / ¼ open; globe plug disk: 9 / 36 / 112 at fully / ½ / ¼ open). Ball-valve data are classic quarter-turn plug-cock values, not from Towler. Below the lowest tabulated opening the last segment's power law is extrapolated, consistent with $K \propto a^{-2}$ near closure.

### 6.2. Governing Equations (`src/core/units/pipe/pipe_unit.ts`)
Steady 1D incompressible liquid flow at fixed mass flow rate $\dot m = \rho_{in} v_{in} A$, integrated with RK4 on 201 nodes with properties at the local temperature. For a liquid, $dh = c_p\,dT + (1-\beta T)\,dP/\rho$, which gives:
$$\frac{dP}{dx} = -\frac{f \rho v^2}{2D} - \rho g \sin\theta$$
$$c_p \frac{dT}{dx} = \frac{q'}{\dot m} + \frac{f v^2}{2D} + \frac{\beta T}{\rho}\frac{dP}{dx}, \qquad q' = -U \pi D (T - T_{amb})$$
* The valve (at 60% of $L$) is an isenthalpic jump: $\Delta T = (1-\beta T)\,\Delta P / (\rho c_p)$ (liquid Joule-Thomson effect; for organics $\beta T \approx 0.3$, so the rise is about 30% less than $\Delta P/\rho c_p$).
* Head loss $h_L$ counts only irreversible losses (friction + valve). With elevation, $\Delta P = \rho g (h_L + \Delta z)$.
* Exergy destruction is $T_0 \dot S_{gen}$ with $\dot S'_{gen} = \dot V\,(dP/dx)_{friction}/T$, i.e. $(T_0/T)$ times the viscous dissipation, where the dead state $T_0$ is the ambient temperature.
* Validity checks: freezing ($T < T_f$), boiling at inlet, flashing where $P \le P_{vap}(T)$, valve cavitation risk, transitional flow, laminar entrance length $0.05\,Re\,D$, and property correlations used outside their data range.

### 6.3. Radial Velocity Profile
* **Laminar (Hagen-Poiseuille)**: $u/\bar v = 2\left[1 - (r/R)^2\right]$.
* **Turbulent (power law)**: $u/u_{max} = (1 - r/R)^{1/n}$ with $n \approx 1/\sqrt{f}$ (about 6 at $Re = 10^4$, rising with $Re$) and $\bar v/u_{max} = 2n^2/[(n+1)(2n+1)]$ ($= 0.817$ for $n = 7$).
* **Transition**: linear blend of the two in $Re$ to represent intermittency.
The canvas particles read this profile directly from the unit result.

---

## 7. Deep Thermodynamic Bugs Investigated & Resolved

During development, real physical anomalies were identified when simulating temperature changes in water.

### 7.1. The 7°C Heat Balance Inversion
* **Symptom**: Below 7°C, cooling water suddenly began *increasing* in temperature along the pipe.
* **Root Cause Analysis**:
  - The continuous First-Law enthalpy balance is:
    $$\frac{dT}{dx} = \frac{\frac{d\dot{E}x_{dest}}{dx} - q_{amb}(x)}{\dot{m} C_p(T)}$$
  - The water liquid $C_p$ evaluated negative below 7.3°C. Dividing positive heat dissipation by negative $C_p$ inverted the sign of $\frac{dT}{dx}$, turning cooling into artificial heating.
* **Initial (incorrect) resolution**: hand-written polynomial "benchmarks" were added for seven compounds. Several were wrong: $C_p$ came out 11–14% low for benzene, toluene, acetone and ethylene glycol.
* **Actual root cause (found later)**: ChemSep equation 16 is **not** a polynomial. It is
  $$Y = A + \exp\!\left(\frac{B}{T} + C + D T + E T^2\right)$$
  The code had been evaluating the coefficients as $A + BT + CT^2 + \dots$. Every compound's liquid $C_p$ and thermal conductivity (both stored as eq 16) was therefore wrong, not just water's.
* **Final resolution**: a single correlation evaluator (`src/core/thermo/correlations.ts`) implements each ChemSep/DIPPR equation by number. With eq 16 evaluated correctly the database reproduces NIST $C_p$ within 1% for all six pipe fluids, and the per-compound overrides were removed. `tests/properties.test.ts` guards against regressions.

### 7.2. The 20°C Slope Reversal
* **Symptom**: Water temperature curves exhibited a directional inflection when crossing 20°C.
* **Root Cause**:
  - Ambient temperature was hardcoded at $T_{amb} = 20^\circ\text{C}$ with no insulation control.
  - Fluid entered at $T > 20^\circ\text{C}$ lost heat to ambient ($q > 0 \implies dT/dx < 0$).
  - Fluid entered at $T < 20^\circ\text{C}$ absorbed heat from ambient ($q < 0 \implies dT/dx > 0$).
* **Resolution**:
  - Added explicit user controls to `pipe_unit.ts`:
    1. `ambient_temp_c`: Ambient temperature slider ($-10^\circ\text{C}$ to $+50^\circ\text{C}$).
    2. `heat_transfer_mode`: Dropdown supporting `uninsulated`, `insulated`, and `adiabatic`.
  - In `adiabatic` mode, ambient heat exchange is zeroed ($q_{amb} = 0$), so temperature rises exclusively via viscous dissipation ($\frac{d\dot{E}x_{dest}}{dx}$).

---

## 8. Iterative Evolutions & Deprecations

1. **Multi-Stream Mixer Experiment**:
   - An experimental Multi-Stream Mixer unit was built to test multicomponent enthalpy balances and vortex canvas animation.
   - User feedback indicated the visual presentation did not meet design expectations.
   - **Action Taken**: The mixer unit (`src/core/units/mixer/`) and renderer (`src/ui/renderers/mixer_renderer.ts`) were deleted to keep the codebase focused, clean, and maintainable.
2. **Visual Branding Polish**:
   - Removed all emojis from the application title, brand HUD, and documentation for a professional, engineering-grade appearance.

---

## 9. How to Build, Test, and Extend Visualcheme

### 9.1. Local Development Setup
```bash
# Install dependencies
npm install

# Start Vite 60 FPS live development server
npm run dev

# Run TypeScript type check
npx tsc --noEmit

# Compile production bundle
npm run build

# Run the physics validation suite
npm test
```

### 9.2. How to Add a New Unit Operation
The pipe unit is the reference pattern. To add a new unit (e.g., Shell & Tube Heat Exchanger):
1. **Create Unit Model**: Create `src/core/units/heat_exchanger/heat_exchanger_unit.ts` implementing `UnitOperation`.
2. **Define Parameters**: Declare tubes, shell diameter, baffle spacing, fluids, temperatures. Label pressures as absolute or gauge.
3. **Write the Governing Equations First**: State the balances in a comment (as in `pipe_unit.ts`), then integrate them with properties from `PropertyService.getLiquidState` at local conditions. Take correlations and tabulated data from the skills / Towler and cite the table or equation.
4. **Report Validity**: Return `warnings` whenever an assumption breaks (phase change, correlation range, regime limits). Never clamp a physically impossible value silently.
5. **Expose Numeric Results**: Put key totals in `extraData.summary` so tests and charts don't parse display strings.
6. **Validate**: Add `tests/<unit>.test.ts` with (a) a worked textbook example, (b) an analytical limiting case, and (c) conservation checks (mass, energy, entropy/exergy).
7. **Create Canvas Renderer**: Create `src/ui/renderers/heat_exchanger_renderer.ts`, and drive visuals from the unit result (profiles, positions) rather than re-deriving physics in the renderer.
8. **Register Unit**: Add the unit to `src/core/units/registry.ts` and add a navigation tab in `index.html`.
