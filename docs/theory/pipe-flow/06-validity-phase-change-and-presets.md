---
id: pipe-flow-validity-phase-change-presets
title: Model Validity Diagnostics, Phase-Change Limits, RK4 Numerics & Quick Presets
unit: pipe_flow
ui_elements:
  - warnings-strip
  - preset-select (all 11 presets)
  - canvas:flashing-bubbles
  - canvas:cavitation-bubbles
code_files:
  - src/core/units/pipe/pipe_unit.ts
  - src/ui/components/warnings_panel.ts
  - src/ui/renderers/pipe_renderer.ts
  - src/main.ts
  - index.html
  - tests/pipe_unit.test.ts
  - tests/pump_line.test.ts
references:
  - "[T&S] Ch. 20.4.1 (Two-Phase Mixtures), p. 1216; Ch. 20.7.4 (Cavitation), pp. 1236–1237; Ch. 20.11 (ISA flashing/cavitation), p. 1258; Ch. 4.4.6 (Validation), p. 182"
  - "[S&L] Ch. 14.1 (Cavitation), p. 399; Ch. 10.9 Example 10.3 (Isenthalpic flashing across valve), p. 301"
  - "[EXT] Classical 4th-order Runge–Kutta (RK4); single-phase liquid thermodynamic boundaries; vena-contracta pressure recovery"
---

# Model Validity Diagnostics, Phase-Change Limits, RK4 Numerics & Quick Presets

## 1. Philosophy of Transparent Model-Validity Diagnostics

A core pedagogical principle of Visualcheme is that **every engineering model has boundaries where its physical assumptions break** — and a simulator should **announce** those failures explicitly rather than silently clamping values or displaying unphysical output (`warnings_panel.ts`, `pipe_unit.ts` `checkValidity` & `pumpWarnings`).

Diagnostics are sorted strictly by severity:
1. **`Model invalid` (`alert`, rose/red)**: A fundamental assumption of the steady single-phase incompressible liquid model has been violated; calculated numbers downstream of the violation are no longer physically realizable.
2. **`Caution` (`warning`, amber)**: The single-phase model still runs, but operates in an uncertain, risky, or off-design engineering region.
3. **`Note` (`info`, muted)**: Informative context explaining mode overrides, geometric clips, or mild developing-flow effects.

---

## 2. Complete Catalog of Validity Rules & Physical Mechanisms

### 2.1 `Model invalid` Alerts (Hard Physical Failures)

| Condition Checked | Trigger Criterion (`pipe_unit.ts`) | Physical Meaning & Canvas Response |
| :--- | :--- | :--- |
| **Inlet or Downstream Freezing** | $T_{\text{in}} < T_f$ or $\exists\,i: T_i < T_f$ | Liquid cools below its normal melting point $T_f$ (`compounds.json`, e.g., Benzene $5.5\,^\circ\text{C}$, Water $0.0\,^\circ\text{C}$); solidification plugs the line. |
| **Inlet Boiling** | $P_{\text{in}} \le P^{\text{sat}}(T_{\text{in}})$ | Feed enters at or below saturation vapor pressure — fluid is vapor or two-phase before entering the pipe. |
| **In-Line / Post-Valve Flashing** | $\exists\,i: P_i \le P^{\text{sat}}(T_i)$ | Static pressure falls below $P^{\text{sat}}(T(x))$ (commonly immediately downstream of a throttled valve!). Liquid spontaneously flashes into a two-phase vapor–liquid mixture (**[S&L]** Example 10.3, p. 301; **[T&S]** p. 1216 notes two-phase pressure drop requires Lockhart–Martinelli). **Canvas**: growing vapor bubbles (`grow: true`) spawn from `flashXNorm` to the outlet. |
| **Pump Cavitation** | $NPSH_a < NPSH_r$ (with flow) | Local pressure at the impeller eye drops to $P^{\text{sat}}$ (**[T&S]** p. 1236; **[S&L]** p. 399). **Canvas**: pump casing turns red and collapsing cavitation bubbles (`grow: false`) animate at the impeller suction. |
| **Pump Dead-Head** | $H_{\text{shutoff}} \le H_{\text{static}}$ in `operating_point` mode | Pump cannot overcome elevation + delivery pressure; $Q = 0$ (`NO FLOW`), pipe holds a static hydrostatic column. **Canvas**: pump casing dims to muted gray while impeller still spins (churning liquid at shutoff). |

### 2.2 `Caution` Warnings (Engineering Risk or Model Strain)

| Condition Checked | Trigger Criterion | Engineering Basis |
| :--- | :--- | :--- |
| **Valve Cavitation Risk** | $P_{\text{valve}+1} > P^{\text{sat}}$ (no permanent flashing), **yet** $(P_{\text{valve}+1} - P^{\text{sat}}) < \Delta P_{\text{valve}}$ | Fluid accelerates into a tight **vena contracta** inside the valve trim where pressure dips well *below* the recovered downstream pressure $P_{\text{valve}+1}$ (**[T&S]** p. 1258 notes partial downstream pressure recovery). Vapor bubbles form in the throat and violently collapse upon pressure recovery downstream — damaging valve trim even when outlet $P > P^{\text{sat}}$! |
| **Transitional Flow** | $2300 \le \mathrm{Re} < 4000$ | Intermittent laminar/turbulent regime where $f$ is physically uncertain (dashed bridge on Moody chart; **[T&S]** p. 1080). |
| **Long Laminar Entrance Region** | Laminar & $L_e / L > 0.25$ ($L_e = 0.05\,\mathrm{Re}\,D$) | Over $25\%$ of the pipe is hydrodynamically developing, where true wall shear exceeds fully developed $64/\mathrm{Re}$. |
| **Tight NPSH Margin** | $0 \le (NPSH_a - NPSH_r) < 0.5\text{ m}$ | Insufficient safety cushion against temperature/flow upsets (target $\ge 0.5\text{ m}$ cold, $\ge 1.5\text{ m}$ near bubble point). **Canvas**: amber pump casing. |
| **Pump Runout / Unmet Curve** | `duty.status === 'runout'`, or `dead_head` in `imposed` mode, or $\eta < 0.05$ | Pump operating off the valid end of its head or efficiency parabola; brake power suppressed when $\eta < 0.08$. |
| **Excessive Line Velocity** | Pump on & $v > 3.0\text{ m/s}$ (above discharge band) or $1.5 < v \le 3.0\text{ m/s}$ (above suction band) | High velocity risks erosion and burns suction NPSH on a single-diameter pipe (**[T&S]** Ch. 20.10, p. 1248). |
| **Property Extrapolation** | $T \notin [T_{\min}, T_{\max}]$ for any DIPPR/ChemSep correlation | Correlation evaluated outside its experimental regression window (`correlations.ts`). |

### 2.3 `Note` Advisories (Informational Context)

- Moderate laminar entrance length ($0.05 < L_e / L \le 0.25$).
- Requested elevation rise exceeds pipe length ($|\Delta z_{\text{req}}| > L$), automatically clipped to $\pm L$.
- Pump velocity below $0.5\text{ m/s}$, efficiency below $55\%$ of $\eta_{\text{BEP}}$, operating-point mode ignoring the velocity slider, or imposed velocity diverging $> 15\%$ from the natural pump–system balance flow.

---

## 3. Numerical Integration Architecture (`pipe_unit.ts`)

### 3.1 Four-Component State Vector & 201-Node Spatial Grid

The pipe domain $[0, L]$ is discretized into $N = 201$ uniform stations ($\Delta x = L / 200$; e.g., $\Delta x = 0.10\text{ m}$ on the default $20\text{ m}$ pipe), carrying a 4-element ODE state vector:

$$\mathbf{y}(x) = \begin{bmatrix} P(x) \\ T(x) \\ h_L(x) \\ \Delta P_{\text{friction}}(x) \end{bmatrix}, \qquad \frac{d\mathbf{y}}{dx} = \mathbf{f}(\mathbf{y}) = \begin{bmatrix} -\dfrac{f\rho v^2}{2D} - \rho g\sin\theta \\[6pt] \dfrac{1}{c_p}\!\left(\dfrac{q'}{\dot{m}} + \dfrac{f v^2}{2D} + \dfrac{\beta T}{\rho}\dfrac{dP}{dx}\right) \\[6pt] \dfrac{f v^2}{2gD} \\[6pt] \dfrac{f\rho v^2}{2D} \end{bmatrix}$$

### 3.2 Classical 4th-Order Runge–Kutta (RK4) with Point Jumps

Because $\rho, \mu, c_p, \beta, \mathrm{Re}, f$ all depend on local $T(x)$, marching each interval $\Delta x$ uses **classical RK4** (`pipe_unit.ts`, lines 649–653), achieving $\mathcal{O}(\Delta x^4)$ global accuracy in $< 0.5\text{ ms}$ in the browser:

$$\begin{aligned}
\mathbf{k}_1 &= \mathbf{f}(\mathbf{y}_i), &
\mathbf{k}_2 &= \mathbf{f}(\mathbf{y}_i + \tfrac{\Delta x}{2}\mathbf{k}_1), \\
\mathbf{k}_3 &= \mathbf{f}(\mathbf{y}_i + \tfrac{\Delta x}{2}\mathbf{k}_2), &
\mathbf{k}_4 &= \mathbf{f}(\mathbf{y}_i + \Delta x\,\mathbf{k}_3), \\
\mathbf{y}_{i+1} &= \mathbf{y}_i + \frac{\Delta x}{6}\big(\mathbf{k}_1 + 2\mathbf{k}_2 + 2\mathbf{k}_3 + \mathbf{k}_4\big)
\end{aligned}$$

**Exact Per-Station Sequence (Record $\to$ Jump $\to$ Step)**:
1. **Record** upstream state $\mathbf{y}_i$ into output arrays (`pArr`, `tArr`, `headArr`, etc.) — ensuring Node $0$ holds exact inlet/vessel conditions.
2. **Apply discrete jumps** at node $i$ (never smeared into $dP/dx$):
   - If $i = 0$ and `entrance ≠ none`: reversible `vesselAcceleration`.
   - Any fitting $K$ located at index $i$: `irreversibleDrop`.
   - If $i = 120$ ($0.60 L$): in-line valve isenthalpic drop.
   - If `pump_enabled` and $i = \text{pumpIdx}$: `pumpJump`.
3. **Advance** from $i \to i+1$ via one RK4 step.
4. **Post-loop Receiving Tank** (Node $200$ only): If `exit = 'sudden'`, add $+v^2/(2g)$ to $h_L$ and $+v^2/(2c_p)$ to $T$ at the final node while keeping $P_{\text{out}}$ unchanged.

---

## 4. Pedagogical Guide to All 11 Quick Presets (`#preset-select`)

Every preset in `src/main.ts` (lines 90–165) isolates a specific concept from this theoretical environment:

| # | Preset Name | Key Configuration | Core Concept Demonstrated |
| :-: | :--- | :--- | :--- |
| 1 | **Turbulent Water ($\mathrm{Re} \approx 83{,}000$)** | Water, $1.5\text{ m/s}$, $50\text{ mm}$, $20\text{ m}$, commercial steel, $25\,^\circ\text{C}$, bare ($T_{\text{amb}} = 20\,^\circ\text{C}$) | Baseline turbulent flow: $f = 0.02232$, flat $1/6.7$ power-law profile, $\Delta P = 10.2\text{ kPa}$, $-16.9\text{ mK}$ net ambient cooling vs. $+2.4\text{ mK}$ viscous heating |
| 2 | **Laminar Glycol ($\mathrm{Re} \approx 330$)** | Ethylene glycol, $0.25\text{ m/s}$, $25\text{ mm}$, $10\text{ m}$, drawn tubing, $20\,^\circ\text{C}$ | Exact Hagen–Poiseuille laminar flow ($f = 64/\mathrm{Re} = 0.194$), sharp parabolic velocity profile ($u_{\max} = 2\bar{v}$), parallel non-mixing streamlines |
| 3 | **Severe Valve Throttling (85% Shut)** | Water, $2.0\text{ m/s}$, $50\text{ mm}$, globe valve at $15\%$ open, $500\text{ kPa}$ | Massive localized point drop ($K \approx 259$, $\Delta P_{\text{valve}} \approx 515\text{ kPa}$), steep step on spatial profile, liquid Joule–Thomson warming, valve cavitation / flashing risk |
| 4 | **High-Roughness Cast Iron Pipe** | Water, $3.0\text{ m/s}$, $100\text{ mm}$, $50\text{ m}$, cast iron ($\varepsilon = 0.26\text{ mm}$) | High $\varepsilon/D = 0.0026$ lifts the active curve high into the rough turbulent zone of the Moody chart |
| 5 | **Towler Example 20.1 ($25\text{ mm}$, $120\text{ m}$)** | Water, $1.98\text{ m/s}$, $25\text{ mm}$, $120\text{ m}$, steel, $21\,^\circ\text{C}$, gate $50\%$ open | Direct validation against **[T&S]** Example 20.1 (p. 1218): $\mathrm{Re} \approx 5\times 10^4$, $\Delta P_f \approx 240\text{ kPa}$, half-open gate $K = 4$ |
| 6 | **Uphill Line: Pressure Drop $\ne$ Head Loss** | Water, $1.5\text{ m/s}$, $50\text{ mm}$, $100\text{ m}$, $\Delta z = +25\text{ m}$, $500\text{ kPa}$ | Compares `Pressure` ($\Delta P \approx 295\text{ kPa}$), `Head Loss` ($h_L \approx 5.2\text{ m}$), and `HGL` (falls only by $5.2\text{ m}$, not $30\text{ m}$!) |
| 7 | **Hot Acetone Throttled: Flashing** | Acetone, $3.0\text{ m/s}$, $50\text{ mm}$, $50\,^\circ\text{C}$ ($P^{\text{sat}} = 81.7\text{ kPa}$), $200\text{ kPa}$, globe $40\%$ open | Post-valve pressure plunges from $183.7\text{ kPa}$ to $6.6\text{ kPa} \ll P^{\text{sat}}$: triggers flashing `Model invalid` alert and growing downstream vapor bubbles |
| 8 | **Fittings: elbows, tees, entrance and exit** | Water, $2.2\text{ m/s}$, $80\text{ mm}$, $60\text{ m}$, sharp in, sudden out, $6\times 90^\circ$, $2\times \text{LR}$, $1\times \text{Sq}$, $2\times \text{Tee}$ | Routed canvas bends ($1D$, $1.5D$, mitred, blind tee legs), $\Sigma K = 12.3$ ($L_e \approx 50\text{ m}$), Dean drift, vena contracta, and EGL vs. HGL across vessels |
| 9 | **Centrifugal pump operating point** | Water, pump ON (`operating_point`), $50\text{ mm}$, $120\text{ m}$, $\Delta z = 18\text{ m}$, $P_{\text{in}} = 180 \to P_{\text{del}} = 320\text{ kPa}$, fittings, $H_0 = 55\text{ m}$ | Live pump–system intersection ($Q^* \approx 13.5\text{ m}^3/\text{h}$, $H^* \approx 43.9\text{ m}$, $\eta \approx 70\%$, healthy $NPSH_a = 14.5\text{ m}$); try throttling the valve to watch the duty point shift! |
| 10 | **Suction line with a thin NPSH margin** | Water at $70\,^\circ\text{C}$ ($P^{\text{sat}} = 31.2\text{ kPa}$), $P_{\text{in}} = 120\text{ kPa}$, pump at $50\%$ of $80\text{ m}$ uphill ($\Delta z = 12\text{ m} \implies z_1 = -6\text{ m}$), 4 elbows + sharp inlet | Combines high $P^{\text{sat}}$, suction lift ($-6\text{ m}$), and suction friction: $NPSH_a = 1.86\text{ m} < NPSH_r = 4.50\text{ m}$ $\to$ red cavitating impeller & collapsing bubbles |
| 11 | **Pump cannot meet the static head** | Water, `operating_point`, $\Delta z = 25\text{ m}$, $P_{\text{in}} = 400 \to P_{\text{del}} = 550\text{ kPa}$ ($H_{\text{static}} = 40.3\text{ m}$), $H_{\text{shutoff}} = 12\text{ m}$ | Dead-head failure ($H_{\text{shutoff}} < H_{\text{static}}$): $Q = 0$, curves never cross, hydrostatic pressure profile only |
