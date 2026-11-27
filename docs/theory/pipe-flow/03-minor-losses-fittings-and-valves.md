---
id: pipe-flow-minor-losses-fittings-valves
title: Minor Losses — Pipe Fittings, Entrances, Exits & Valves
unit: pipe_flow
ui_elements:
  - param:entrance
  - param:exit
  - param:n_elbow_90
  - param:n_elbow_90_long
  - param:n_elbow_45
  - param:n_elbow_square
  - param:n_tee_branch
  - param:n_tee_run
  - param:valve_type
  - param:valve_opening_pct
  - kpi:fittings
  - kpi:valve
  - canvas:routed-bends
  - canvas:vessels-and-ports
  - canvas:valve-cutaway
  - preset:pipe_throttled
  - preset:pipe_fittings
code_files:
  - src/core/thermo/fittings.ts
  - src/core/thermo/friction.ts
  - src/core/units/pipe/pipe_unit.ts
  - src/ui/renderers/pipe_route.ts
  - src/ui/renderers/pipe_renderer.ts
  - tests/friction.test.ts
  - tests/pump_line.test.ts
references:
  - "[T&S] Ch. 20.4.2 Table 20.4 & Example 20.1, pp. 1216–1218; Ch. 20.5 Fig. 20.6, pp. 1219–1221; Ch. 20.7.5, p. 1238; Ch. 20.11 Eq. (20.32), pp. 1256–1259"
  - "[S&L] Ch. 6.7 Heuristic 38, p. 151; Ch. 10.4 Fig. 10.14 p. 294 & Example 10.3 p. 301; Ch. 12.3 Eq. (12.19), p. 378"
  - "[EXT] Crane TP-410 / Çengel (rounded & re-entrant entrance K); Weisbach (quarter-turn plug-cock / ball valve K); log-log power-law K(h) interpolation"
---

# Minor Losses — Pipe Fittings, Entrances, Exits & Valves

## 1. Two Methods for Minor Losses: Velocity Heads ($K$) vs. Equivalent Length ($L_e/D$)

Whenever flow changes direction, accelerates through a contraction, decelerates into an expansion, or passes through a valve trim, boundary-layer separation and secondary vortices irreversibly dissipate mechanical energy into internal energy. **[T&S]** Section 20.4.2 (pp. 1216–1218) presents two standard engineering methods:

### Method 1: Velocity-Head Resistance Coefficient ($K$) — *Used by Visualcheme's Solver*

$$\Delta P_m = K \left(\frac{\rho v^2}{2}\right), \qquad h_m = K \left(\frac{v^2}{2g}\right)$$

where $v^2/(2g)$ is one **velocity head** ($\text{m}$ of liquid) and $\frac{1}{2}\rho v^2$ is one **dynamic pressure** ($\text{Pa}$).

### Method 2: Equivalent Straight-Pipe Length ($L_e / D$) — *Reported as a Derived Readout*

Equating minor loss to straight-pipe Darcy friction $f (L_e / D)(v^2 / 2g) = K (v^2 / 2g)$ yields:

$$\frac{L_e}{D} = \frac{K}{f} \implies L_e = \frac{(\Sigma K)\,D}{f}$$

### Textbook Contrast

- **[T&S]** Example 20.1 (p. 1218) explicitly solves the same pipeline both ways ($270\text{ kPa}$ by $K$ vs. $277\text{ kPa}$ by $L_e/d_i$) and concludes: *"The method using velocity heads is the more fundamentally correct approach, but the use of equivalent diameters is easier to apply and sufficiently accurate for use in preliminary design calculations."* Note that **[T&S]** Table 20.4's fixed $L_e/d_i$ column implicitly assumes a typical turbulent friction factor $f_D \approx 0.020$ ($L_e/d_i \approx 50 K$).
- **[S&L]** operates at flowsheet-synthesis level: Heuristic 38 (p. 151) uses an overall line allowance ($2\text{ psi}/100\text{ ft}$ pipe + $\ge 10\text{ psi}$ control valve), and Ch. 12.3 Eq. (12.19) (p. 378) lumps header contraction/expansion/reversal losses into a single multiplier $K_p \approx 1.2$.
- **Visualcheme** marches the exact $K$ velocity-head drop at each fitting's station (`irreversibleDrop`) and displays the dynamic equivalent length $L_e = (\Sigma K) D / f$ (evaluated at the actual pipe $f$) on the **`Fittings (accidentes)`** KPI card.

> [!NOTE]
> **Turbulent Scope Limitation**: As **[T&S]** Table 20.4's title notes (*"for Turbulent Flow"*), tabulated fixed $K$ values assume high-$\mathrm{Re}$ inertial separation. At very low laminar $\mathrm{Re}$ ($\mathrm{Re} < 500$), true fitting resistance rises inversely with $\mathrm{Re}$ (e.g., Hooper's 2-$K$ or Darby's 3-$K$ methods **[EXT]**); Visualcheme keeps fixed turbulent $K$ values across all regimes.

---

## 2. Line Fittings Catalog (`fittings.ts`, `pipe_route.ts`)

Every elbow and tee added by the user both drops pressure by $K \rho v^2 / 2$ in the 1D march **and** physically turns the pipe centerline on the 2D canvas (`pipe_route.ts`, `TURN_SPECS`):

| UI Label (`param`) | $K$ | **[T&S]** Table 20.4 (p. 1217) | Canvas Bend Geometry (`pipe_route.ts`) | Physical Loss Mechanism |
| :--- | :---: | :---: | :--- | :--- |
| **90° standard elbow** (`n_elbow_90`) | $0.80$ | $0.6\text{–}0.8$ ($L_e/d_i = 30\text{–}40$) | $90^\circ$ arc, centerline radius $r = 1.0\,D$ | Inner-wall flow separation + Dean secondary vortices; conservative upper bound of **[T&S]** range |
| **90° long-radius elbow** (`n_elbow_90_long`) | $0.45$ | $0.45$ ($L_e/d_i = 23$) | $90^\circ$ arc, centerline radius $r = 1.5\,D$ | Gentler curvature suppresses inner-wall separation, cutting loss nearly in half |
| **45° elbow** (`n_elbow_45`) | $0.35$ | $0.35$ ($L_e/d_i = 15$) | $45^\circ$ arc, centerline radius $r = 1.0\,D$ | Half the turning angle yields smaller secondary circulation |
| **Square elbow** (`n_elbow_square`) | $1.50$ | $1.5$ ($L_e/d_i = 75$) | $90^\circ$ mitred corner ($r = 0$, weld seam) | Severe sharp-corner separation bubble and recirculation zone |
| **Tee into branch** (`n_tee_branch`) | $1.80$ | $1.8$ ($L_e/d_i = 90$) | $90^\circ$ mitred turn + blind leg straight ahead | Fluid impacts stagnant dead-leg cushion before turning $90^\circ$ (`Tee-entry into leg`) |
| **Tee from branch** (`n_tee_run`) | $1.20$ | $1.2$ ($L_e/d_i = 60$) | $90^\circ$ mitred turn + blind leg behind outflow | Fluid turns out of side branch (`Tee-entry from leg`) with less frontal stagnation |

*(Note: `friction.ts` also stores `elbow_45_long` $K = 0.20$ and `union_coupling` $K = 0.04$ from **[T&S]** Table 20.4.)*

### Spatial Placement Algorithm (`layoutFittings`)

Requested elbows and tees are distributed evenly over the free fractional pipe length $[0.04, 0.96]$, automatically keeping a clear exclusion band of $\pm 0.04 L$ (`STATION_CLEARANCE`) around both the in-line valve ($0.60 L$) and the centrifugal pump (if enabled), so discrete jumps never overlap on the same grid node or collide visually.

---

## 3. Vessel Entrances & Tank Exit (Boundary Physics)

Selecting an entrance or exit in Visualcheme switches that pipe end from a **continuing flowing conduit** to a **large, still vessel ($v_{\text{vessel}} \approx 0$)** — with crucial thermodynamic and hydraulic consequences verified in `tests/pump_line.test.ts`:

### 3.1 Pipe Entrances from a Still Vessel (`entrance`)

| Option | $K_{\text{in}}$ | Source | Canvas Rendering |
| :--- | :---: | :--- | :--- |
| **None** | $0$ | Pipe continues from upstream (already at velocity $v$) | Open flange with flow arrow |
| **Rounded mouth** | $0.05$ | Crane TP-410 / Çengel **[EXT]** | Smooth bellmouth fillet; no separation |
| **Sharp-edged** | $0.50$ | **[T&S]** Table 20.4 (`Sharp reduction (tank outlet)`, p. 1217) | Flush wall entry + dashed vena contracta |
| **Re-entrant / Borda** | $0.80$ | Crane TP-410 / Çengel **[EXT]** | Pipe protrudes $0.9 D$ inside tank + deeper vena contracta |

**Two-Step Physics at Node 0 (Still Vessel $\to$ Pipe Mouth)**:
1. **Reversible Acceleration** (`vesselAcceleration`, $K$-independent): Accelerating fluid from $v = 0$ in the vessel to $v$ inside the pipe converts static pressure into kinetic energy:
   $$\Delta P_{\text{accel}} = -\frac{1}{2}\rho v^2, \qquad \Delta h_L = 0, \qquad \Delta T_{\text{accel}} = -\frac{\beta T\,v^2}{2 c_p}$$
   Notice HGL drops by $v^2/(2g)$, while **EGL remains flat** (energy is conserved!).
2. **Irreversible Entrance Separation** (`irreversibleDrop`): For sharp or re-entrant mouths, fluid detaches at the sharp lip, contracts into a narrower **vena contracta**, and loses energy during turbulent re-expansion to the full pipe bore:
   $$\Delta P_{\text{ent}} = -K_{\text{in}}\frac{\rho v^2}{2}, \qquad \Delta h_L = K_{\text{in}}\frac{v^2}{2g}, \qquad \Delta T_{\text{ent}} = \frac{(1 - \beta T)\,\Delta P_{\text{ent}}}{\rho c_p}$$

Thus total static pressure drop right inside a sharp entrance ($K_{\text{in}} = 0.5$) is $(1 + 0.5)\frac{1}{2}\rho v^2 = 1.5\left(\frac{1}{2}\rho v^2\right)$, of which $1.0$ velocity head is reversible acceleration and $0.5$ velocity head is irreversible loss!

### 3.2 Sudden Exit into a Receiving Tank (`exit = 'sudden'`, $K_{\text{out}} = 1.0$)

- Source: **[T&S]** Table 20.4 (`Sudden expansion (tank inlet)`, $K = 1.0$, p. 1217).
- **Physics**: The pipe discharges as a submerged free jet into a large stagnant tank. Because the jet issues at the tank's ambient static pressure (no static pressure recovery for an infinite area ratio $A_{\text{pipe}}/A_{\text{tank}} \to 0$), its **entire kinetic energy** $v^2/(2g)$ is dissipated by turbulent mixing inside the tank:
  $$\Delta P_{\text{exit, static}} = 0, \qquad \Delta h_{L,\text{exit}} = 1.0\,\frac{v^2}{2g}, \qquad \Delta T_{\text{exit}} = \frac{v^2}{2 c_p}$$
- Consequently, on the last node, **HGL stays continuous** while **EGL drops by $v^2/(2g)$ to meet HGL** inside the still tank!

---

## 4. Industrial Valves & Partial-Opening Throttling (`valve_type`, `valve_opening_pct`)

### 4.1 Valve Engineering Functions (**[T&S]** Ch. 20.5, pp. 1219–1221 & Fig. 20.6)

**[T&S]** classifies process valves into two primary duties:
1. **Shutoff (Block / Isolation) Valves** — positive tight seal when closed, minimal $\Delta P$ when fully open:
   - **Gate valve**: Straight-through bore when open ($K = 0.15$). Multi-turn handwheel. **[T&S]** p. 1219 explicitly warns **not** to throttle with gate valves because high-velocity flow erodes/deforms the seating faces and ruins shutoff sealing.
   - **Ball / Plug valve**: Quarter-turn ($90^\circ$) rapid on/off action, very low open resistance ($K = 0.05$ full-bore ball; **[T&S]** Table 20.4 lists $K = 0.4$ for standard open plug valve).
2. **Throttling / Control Valves** — smooth, controllable flow modulation over the stroke:
   - **Globe valve (plug disk)**: Tortuous S-shaped internal path (fluid makes two sharp $90^\circ$ turns through the annular seat-to-plug clearance, **[T&S]** p. 1258). Even fully open it imposes $K = 9.0$ ($6.0$ for bevel seat), climbing to $K = 112$ at $25\%$ open — providing strong control authority and precise throttling.

### 4.2 Tabulated $K(h)$ Data & Log–Log Power-Law Interpolation (`friction.ts`)

Visualcheme places the in-line valve at $x = 0.60\,L$ (station 120 of 201) and stores $K$ vs. fractional opening $h \in (0, 1]$:

| Valve Type | Source | Tabulated $(h,\; K)$ Points |
| :--- | :--- | :--- |
| **Gate Valve** (`gate_valve`) | **[T&S]** Table 20.4 (p. 1217) | $(1.00,\; 0.15)$, $(0.75,\; 1.0)$, $(0.50,\; 4.0)$, $(0.25,\; 16)$ |
| **Globe Valve, Plug Disk** (`globe_valve`) | **[T&S]** Table 20.4 (p. 1217) | $(1.00,\; 9.0)$, $(0.50,\; 36)$, $(0.25,\; 112)$ |
| **Ball / Plug Cock** (`ball_valve`) | Weisbach quarter-turn plug-cock data ($h = 1 - \theta/90^\circ$) **[EXT]** | $(1.00,\; 0.05)$, $(0.889,\; 0.29)$, $(0.778,\; 1.56)$, $(0.667,\; 5.47)$, $(0.556,\; 17.3)$, $(0.444,\; 52.6)$, $(0.333,\; 206)$, $(0.278,\; 486)$ |

Between any two adjacent tabulated points $(h_0, K_0)$ and $(h_1, K_1)$, Visualcheme performs **log–log (power-law) interpolation** (`FrictionSolver.getValveK`):

$$K(h) = K_0 \left(\frac{h}{h_0}\right)^{m}, \qquad m = \frac{\ln(K_1 / K_0)}{\ln(h_1 / h_0)}$$

Below the lowest tabulated opening (down to $h = 5\%$), the lowest segment's power law is extrapolated, consistent with orifice physics $K \propto (A_{\text{open}}/A_{\text{pipe}})^{-2}$ near closure. For example, a globe valve at $40\%$ open (the `Hot Acetone Flashing` preset) interpolates to $K = 51.9$; at $15\%$ open (`Severe Valve Throttling` preset) it extrapolates to $K \approx 259$.

### 4.3 Thermodynamic Jump & Relation to Control Valve $C_v$ (**[T&S]** Ch. 20.11)

- **Isenthalpic Throttling**: Across the valve, $\Delta P_{\text{valve}} = K\,\frac{1}{2}\rho v^2$, $\Delta h_L = K v^2/(2g)$, and $\Delta T_{\text{valve}} = (1 - \beta T)\Delta P_{\text{valve}}/(\rho c_p)$. As **[S&L]** Ch. 10 (Fig. 10.14 p. 294; Example 10.3 p. 301) shows, adiabatic throttling conserves enthalpy ($H_{\text{in}} = H_{\text{out}}$) while generating entropy and destroying work availability ($L\dot{W} = \dot{m} T_0 \Delta S > 0$).
- **Bridge to Industrial Control Valve Sizing ($C_v$)**: While Visualcheme parameterizes valves via dimensionless $K$, industrial instrumentation engineers specify control valves by the **ISA 75.01 flow coefficient $C_v$** (**[T&S]** Eq. 20.32, p. 1258):
  $$C_v = \frac{Q}{N}\sqrt{\frac{\rho_1 / \rho_0}{\Delta P}}$$
  where $N = 1$ for $Q$ in $\text{gpm}$ and $\Delta P$ in $\text{psi}$ ($N = 0.865$ for $Q$ in $\text{m}^3/\text{h}$ and $\Delta P$ in $\text{bar}$), and $\rho_1/\rho_0 = \text{SG}$ relative to water at $15\,^\circ\text{C}$. Converting between $C_v$ (US customary) and pipe-referenced $K$ for bore $D$ (in inches, $d_{\text{in}}$) gives the exact geometric link **[EXT]**:
  $$K = \frac{891\,d_{\text{in}}^4}{C_v^2} \quad \Longleftrightarrow \quad C_v \approx \frac{29.84\,d_{\text{in}}^2}{\sqrt{K}}$$
  **[T&S]** p. 1258 also recommends sizing a control valve for $\Delta P_{\text{valve}} \ge 30\%$ of total system dynamic loss (minimum $100\text{ kPa}$, rule of thumb $140\text{ kPa}$ or $20\text{ psi}$; compare **[S&L]** Heuristic 38, p. 151: *"at least $10\text{ psi}$"*), targeting normal operation near $\sim 50\%$ open.
