---
id: pipe-flow-centrifugal-pumps-npsh
title: Centrifugal Pumps, System Curves, Operating Point, NPSH & Economic Pipe Sizing
unit: pipe_flow
ui_elements:
  - param:pump_enabled
  - param:drive_mode
  - param:pump_position_pct
  - param:h_shutoff_m
  - param:q_max_m3h
  - param:q_bep_m3h
  - param:eta_bep
  - param:npshr_m
  - param:p_delivery_kpa
  - kpi:pump
  - kpi:npsh
  - chart:pump-system-npsh
  - canvas:pump-impeller-and-status
  - canvas:cavitation-bubbles
  - warnings:pump-dead-head
  - warnings:pump-runout
  - warnings:npsh-cavitation
  - warnings:npsh-tight-margin
  - warnings:velocity-bands
  - preset:pipe_pump_duty
  - preset:pipe_npsh
  - preset:pipe_dead_head
code_files:
  - src/core/thermo/pump.ts
  - src/core/units/pipe/pipe_unit.ts
  - src/ui/charts/diagram_chart.ts
  - src/ui/renderers/pipe_renderer.ts
  - tests/pump_line.test.ts
references:
  - "[T&S] Ch. 20.3.2 Table 20.2 & Fig. 20.3, pp. 1211–1212; Ch. 20.7 Eqs. (20.14)–(20.21) & Figs. 20.12–20.17 & Examples 20.6–20.8, pp. 1230–1240; Ch. 20.8 Eq. (20.22) & Table 20.5, p. 1244; Ch. 20.10 Eqs. (20.25)–(20.31), pp. 1248–1255"
  - "[S&L] Ch. 6.7 Heuristics 37–43 & Eqs. (6.3), (6.5)–(6.6), pp. 151–152; Ch. 14.1 Eqs. (14.1)–(14.6) & Figs. 14.1–14.5 & Example 14.1, pp. 397–400; Ch. 16.5 Eqs. (16.13)–(16.18) & Example 16.6, pp. 451–455"
  - "[EXT] Parabolic analytical pump H(Q), η(Q), and quadratic NPSHr(Q) parameterization; bisection duty-point solver"
---

# Centrifugal Pumps, System Curves, Operating Point, NPSH & Economic Pipe Sizing

## 1. Operating Principle & Total Pump Head

A **radial centrifugal pump** is the workhorse of chemical process plants — selected in roughly $90\%$ of industrial liquid services (**[S&L]** Ch. 16.5, p. 451; **[T&S]** Ch. 20.3.2, p. 1211). Liquid enters axially into the **eye** of a rapidly spinning vaned impeller (typically $1750\text{–}3600\text{ rpm}$), accelerates radially outward acquiring tangential kinetic energy, and decelerates inside an expanding spiral **volute** casing where kinetic energy converts into static pressure (**[T&S]** Fig. 20.12, p. 1231; **[S&L]** Fig. 14.1, p. 397).

### 1.1 Total Head Developed by a Pump

**[S&L]** Eq. (14.2) (p. 397) defines pump head $H$ ($\text{m}$ or $\text{ft}$ of flowing liquid) as the increase in total mechanical head (Energy Grade Line) from suction ($s$) to discharge ($d$):

$$H = \left(\frac{v_d^2}{2g} + z_d + \frac{P_d}{\rho_d g}\right) - \left(\frac{v_s^2}{2g} + z_s + \frac{P_s}{\rho_s g}\right)$$

For Visualcheme's uniform-diameter in-line pump ($v_d = v_s$, $z_d = z_s$, $\rho_d \approx \rho_s$), this reduces directly to the static pressure jump $\Delta P_{\text{pump}} = \rho g H$ (`pumpJump` in `pipe_unit.ts`). Crucially, both **[T&S]** (p. 1236) and **[S&L]** (p. 397) emphasize that centrifugal pump curves are plotted in **head $H$ (meters of liquid)** rather than $\Delta P$, because for low-viscosity liquids a given impeller and speed produces the **same head $H$** regardless of fluid density $\rho$, while the pressure rise $\Delta P = \rho g H$ scales proportionally with $\rho$.

### 1.2 Pump Selection Scope & Specific Speed (Textbook Context)

| Criterion | Towler & Sinnott **[T&S]** | Seider et al. **[S&L]** |
| :--- | :--- | :--- |
| **Centrifugal capacity & head** | Table 20.2 (p. 1212): $0.25\text{–}10^3\text{ m}^3/\text{h}$, single-stage $10\text{–}50\text{ m}$, multistage up to $300\text{ m}$ | Heuristic 37 (p. 151) & Ch. 16.5 (p. 451): $10\text{–}5000\text{ gpm}$ ($2.3\text{–}1135\text{ m}^3/\text{h}$), single-stage $\le 500\text{ ft}$ ($152\text{ m}$), multistage up to $3200\text{ ft}$ ($975\text{ m}$) |
| **Viscosity ceiling for centrifugal** | $\mu < 50\text{ cP}$ (p. 1236) — constant-head water curve holds below this | $\nu < 100\text{ cSt}$ (Ch. 16.5, p. 451; Fig. 14.5, p. 399) — above this, switch to gear or reciprocating pumps |
| **Specific speed** | Eqs. (20.14)–(20.15) (p. 1231): $N_s = N Q^{1/2}/(g h)^{3/4}$; radial $N'_S = 400\text{–}4000$, mixed $4000\text{–}9000$, axial $> 9000$ | Uses size factor $S = Q H^{0.5}$ for costing (Eq. 16.13, p. 451) |
| **Pumping liquid vs. compressing gas** | Ch. 20.6–20.7 | Heuristic 43 & Eq. (6.6) (p. 152): $W = \int V\,dP$; pump liquid whenever possible ($\sim 100\times$ smaller molar volume than gas!) |

---

## 2. Analytical Pump Characteristic Curves (`src/core/thermo/pump.ts`)

Both **[T&S]** (Figs. 20.15–20.17, pp. 1235–1240) and **[S&L]** (Figs. 14.2–14.4, p. 398) show empirical vendor curves. **[S&L]** p. 400 explicitly points out that commercial process simulators *"do not provide built-in characteristic curves to help select a suitable centrifugal pump."* Visualcheme bridges this educational gap by parameterizing the three canonical vendor curves analytically **[EXT]**:

### 2.1 Head–Capacity ($H\text{–}Q$) Curve

$$H(Q) = \begin{cases} H_{\text{shutoff}}\!\left[1 - \left(\dfrac{Q}{Q_{\max}}\right)^2\right] & 0 \le Q \le Q_{\max} \\[8pt] 0 & Q > Q_{\max} \end{cases}$$

- At zero flow ($Q = 0$, discharge valve shut), the pump develops its maximum **shutoff head** $H_{\text{shutoff}}$ (`h_shutoff_m`).
- As flow increases, internal impeller shock and casing friction reduce head monotonically until $H = 0$ at the **runout capacity** $Q_{\max}$ (`q_max_m3h`).

### 2.2 Pump Efficiency ($\eta\text{–}Q$) Curve

$$\eta(Q) = \begin{cases} \eta_{\text{BEP}}\!\left[2\!\left(\dfrac{Q}{Q_{\text{BEP}}}\right) - \left(\dfrac{Q}{Q_{\text{BEP}}}\right)^2\right] & 0 < Q < 2\,Q_{\text{BEP}} \\[8pt] 0 & Q \le 0 \text{ or } Q \ge 2\,Q_{\text{BEP}} \end{cases}$$

- Zero at shutoff ($Q = 0$, all shaft work turns to heat inside the casing) and zero at $Q = 2 Q_{\text{BEP}}$; peaks smoothly at $\eta_{\text{BEP}}$ (`eta_bep`) at the **Best Efficiency Point** $Q_{\text{BEP}}$ (`q_bep_m3h`, clamped $\le 0.95 Q_{\max}$).
- **Textbook Preliminary Efficiency Estimates**: **[T&S]** Fig. 20.14 (p. 1233) plots centrifugal efficiency vs. capacity and head ($45\text{–}75\%$); **[S&L]** Eq. (16.17) (p. 453) gives the empirical BEP efficiency correlation (for $Q \in [50, 5000]\text{ gpm}$):
  $$\eta_P = -0.316 + 0.24015\ln Q - 0.01199(\ln Q)^2$$

### 2.3 Required Net Positive Suction Head ($NPSH_r\text{–}Q$) Curve

$$NPSH_r(Q) = NPSH_{r,\text{BEP}}\left(\frac{Q}{Q_{\text{BEP}}}\right)^2$$

Captures the physical quadratic growth of eye-inlet acceleration and vane-entrance pressure losses with capacity ($\propto Q^2$), pinned to the manufacturer's rated value $NPSH_{r,\text{BEP}}$ (`npshr_m`) at $Q_{\text{BEP}}$.

### 2.4 Affinity Laws & Viscosity Derating (Textbook Context Beyond Current UI)

- **Affinity Laws** (**[S&L]** Eqs. 14.3–14.6, p. 399): For a given pump geometry when changing shaft rotational speed $N$ or trimming impeller diameter $D_{\text{imp}}$:
  $$\frac{Q_2}{Q_1} = \frac{N_2}{N_1} = \frac{D_2}{D_1}, \qquad \frac{H_2}{H_1} = \left(\frac{N_2}{N_1}\right)^2 = \left(\frac{D_2}{D_1}\right)^2, \qquad \frac{P_{B,2}}{P_{B,1}} = \left(\frac{N_2}{N_1}\right)^3$$
  *(This explains why **[T&S]** p. 1238 recommends variable-speed drives over discharge-valve throttling for large flows: reducing speed cuts power as $Q^3$ instead of dissipating head across a valve!)*
- **Viscosity Derating** (**[S&L]** Fig. 14.5, p. 399): High liquid viscosity lowers $H(Q)$ and $\eta(Q)$ while increasing $P_B$. Visualcheme currently evaluates the water-basis $H(Q)$ curve without viscosity derating — an important assumption to recognize when pumping viscous fluids like cold ethylene glycol ($\sim 20\text{ cP}$, still below Towler's $50\text{ cP}$ threshold).

---

## 3. System Resistance Curve & Operating Point

### 3.1 System Head Equation (`lineHead` in `pump.ts`)

The total head required by the piping system to deliver flow $Q$ from inlet state $(P_{\text{in}}, z_{\text{in}})$ to delivery state $(P_{\text{delivery}}, z_{\text{out}})$ combines a flow-independent **static head** and flow-dependent **dynamic + kinetic head** (**[T&S]** Ch. 20.7.5, p. 1238 & Eq. 20.17, p. 1232):

$$H_{\text{sys}}(Q) = \underbrace{\Delta z + \frac{P_{\text{delivery}} - P_{\text{in}}}{\rho g}}_{H_{\text{static}}} + \underbrace{\left[f(Q)\frac{L}{D} + \Sigma K_{\text{fittings}} + K_{\text{valve}}\right]\frac{v^2}{2g}}_{h_{\text{friction}} + h_{\text{minor}}} + \underbrace{(a_{\text{out}} - a_{\text{in}})\frac{v^2}{2g}}_{h_{\text{kinetic}}}$$

where $a_{\text{in}} = 0$ if drawing from a still vessel (`entrance ≠ none`) else $1$ (flowing pipe), and $a_{\text{out}} = 0$ if discharging into a still tank (`exit = sudden`, where $K_{\text{out}} = 1$ already accounts for dissipating $v^2/2g$) else $1$.

### 3.2 Finding the Operating Point (`solveOperatingPoint`)

The **operating (duty) point** $(Q^*, H^*)$ is the unique steady-state intersection where head supplied equals head demanded (**[T&S]** Fig. 20.17 & Example 20.8, pp. 1239–1240):

$$H_{\text{pump}}(Q^*) = H_{\text{sys}}(Q^*)$$

Because $H_{\text{pump}}(Q)$ decreases monotonically while $H_{\text{sys}}(Q)$ increases monotonically with $Q$:
1. **Dead-Head Detection**: If $H_{\text{static}} \ge H_{\text{shutoff}}$, the curves never intersect ($Q^* = 0$, `status: 'dead_head'`). In `operating_point` mode, flow stops (`NO FLOW`), pressure reduces to a hydrostatic liquid column $P(x) = P_{\text{in}} - \rho g z(x)$, and a red `Model invalid` alert fires (preset `Pump cannot meet the static head`).
2. **Runout Detection**: If $H_{\text{pump}}(Q_{\max}) > H_{\text{sys}}(Q_{\max})$, the system offers less resistance than the pump curve's rightmost endpoint (`status: 'runout'`), triggering a `Caution` warning.
3. **Bisection Solver**: Otherwise, 70 iterations of bisection on $g(Q) = H_{\text{pump}}(Q) - H_{\text{sys}}(Q)$ over $[0, Q_{\max}]$ locate $Q^*$ to relative precision $2^{-70} \approx 10^{-21}$.

### 3.3 Drive Modes & the Pump Chart (`#pump-chart-wrapper`)

- **`Operating point (pump meets system)`**: Automatically sets $v_{\text{in}} = Q^* / A$ (disabling the velocity slider's effect) so the RK4 march lands the outlet right at $P_{\text{delivery}}$ (within tiny non-isothermal $\rho(T)$ drift). Throttling the in-line valve raises $K_{\text{valve}}$, steepening the amber **System** curve and sliding the operating point left and up along the gold **Pump head** curve — exactly illustrating discharge throttling (**[T&S]** p. 1238; **[S&L]** p. 398)!
- **`Imposed velocity (slider)`**: Forces the slider flow $Q$ through the line and plots both the pump head at $Q$ and separate markers for $H_{\text{sys}}(Q)$ and the natural balance intersection $(Q^*, H^*)$, showing why imposing an arbitrary flow misses $P_{\text{delivery}}$.

---

## 4. Hydraulic Power, Brake Power & Pump Heating

| Power Quantity | Equation | Visualcheme / Textbook Source |
| :--- | :--- | :--- |
| **Hydraulic (Theoretical) Power** | $P_{\text{hyd}} = \rho g Q H = \dot{m} g H = Q\,\Delta P_{\text{pump}}$ | `pipe_unit.ts` L690; **[S&L]** Eq. (14.1) p. 397 & Heuristic 39 Eq. (6.3) p. 151 ($\text{THp} = \text{gpm}\cdot\Delta P_{\text{psi}}/1714$) |
| **Pump Shaft (Brake) Power** | $P_B = \dfrac{P_{\text{hyd}}}{\eta} = \dfrac{\rho g Q H}{\eta}$ | Reported on **`Pump Head`** KPI card (blank if $\eta < 0.08$); **[T&S]** Eqs. (20.18)–(20.19) p. 1233; **[S&L]** Eq. (16.16) p. 453 |
| **Electric Motor Power** *(reference)* | $P_C = \dfrac{P_B}{\eta_M}$ | **[T&S]** Eq. (20.22) & Table 20.5 p. 1244 ($E_e = 80\text{–}97\%$); **[S&L]** Eqs. (16.16, 16.18) p. 453 ($\eta_M = 0.80 + 0.0319\ln P_B - 0.00182(\ln P_B)^2$) |
| **Pump Discharge Heating** | $\Delta T_{\text{pump}} = \dfrac{g H}{c_p}\!\left(\dfrac{1}{\eta} - 1 + \beta T\right)$ | `pumpJump` (`pipe_unit.ts` L91–96); physically matches **[S&L]** Ch. 14.1 p. 400 & Example 14.1 ($\eta$ held $\ge 0.08$ in division) |

---

## 5. Net Positive Suction Head (NPSH) & Cavitation

### 5.1 Cavitation Physics

Inside a centrifugal pump, liquid accelerates sharply into the impeller eye, creating a local low-pressure minimum below the suction flange pressure. If local static pressure drops to the liquid's saturation vapor pressure $P_v(T)$, vapor bubbles nucleate rapidly; as they sweep into higher-pressure impeller passages, they **collapse violently**, generating micro-jet shock waves that pit metal vanes, destroy mechanical seals, induce heavy noise/vibration, and collapse pump head and efficiency (**[T&S]** Ch. 20.7.4, p. 1236; **[S&L]** Ch. 14.1, p. 399).

### 5.2 $NPSH_a$ Governing Equation

**[T&S]** Eq. (20.21) (p. 1237, Example 20.7) defines the **Net Positive Suction Head Available** ($NPSH_a$) at the pump suction centerline:

$$NPSH_a = \frac{P_1 - P_v(T)}{\rho g} + z_1 - h_{fs}$$

where in Visualcheme (`pump.ts` L93–95, L116–119; `pipe_unit.ts` L510–531):
- $P_1 = P_{\text{in}}$: absolute pressure above the liquid in the suction feed vessel (or static pressure at inlet pipe).
- $P_v = P^{\text{sat}}(T_{\text{in}})$: saturation vapor pressure of the working fluid at suction temperature.
- $z_1 = -x_{\text{pump}}\,\Delta z$: elevation of the suction liquid surface **above** the pump centerline (positive if the tank sits above the pump = *flooded suction*; negative if the pump sits partway up an uphill line = *suction lift*!).
- $h_{fs}$: suction-line frictional and minor head losses upstream of the pump station ($x \le x_{\text{pump}}$), net of the inlet kinetic head already carried when the inlet is a flowing pipe rather than a still vessel:
  $$h_{fs} = h_{f,\text{suction}} + h_{m,\text{suction}} - a_{\text{in}}\frac{v^2}{2g}$$
  *(Notice why: from a still vessel, $a_{\text{in}} = 0$ and the pump's total suction head is $P_1/(\rho g) + z_1 - h_{f,s} - h_{m,s}$; from an already-flowing pipe at static pressure $P_1$, the fluid arrives with stagnation head $P_1/(\rho g) + v^2/(2g)$, so $a_{\text{in}} = 1$ adds $+v^2/(2g)$ to $NPSH_a$! Verified in `tests/pump_line.test.ts` lines 236–262.)*

### 5.3 Cavitation Criterion, Safety Margin & Visual Status

$$\text{NPSH Margin} = NPSH_a - NPSH_r$$

| Margin Condition | Visualcheme Status & Canvas Color | Diagnostic Action |
| :--- | :--- | :--- |
| $\text{Margin} < 0$ ($NPSH_a < NPSH_r$) | `Model invalid` alert; **rose/red pump casing** + **collapsing cavitation bubbles** at impeller eye | Pump cavitates! Increase $P_1$, lower $T$, move pump closer to inlet (`pump_position_pct`), reduce suction fittings, or increase $D$ |
| $0 \le \text{Margin} < 0.5\text{ m}$ | `Caution` warning; **amber pump casing** | Tight margin — unsafe for process fluctuations |
| $\text{Margin} \ge 0.5\text{ m}$ | `normal`; **green pump casing** | Acceptable for stable cold liquids; aim for $\ge 1.5\text{ m}$ near boiling point |

**Textbook Reference Rules**:
- **[T&S]** p. 1236: *"As a general guide, the NPSH should be above $3\text{ m}$ for pump capacities up to $100\text{ m}^3/\text{h}$, and $6\text{ m}$ above this capacity."*
- **[S&L]** Ch. 14.1 (p. 399): typical $NPSH_r = 2\text{–}10\text{ ft}$ ($0.6\text{–}3.0\text{ m}$); Ch. 16.5 (p. 451 & Example 16.6 p. 455): select centrifugal pump when $NPSH_a > 5\text{ ft}$ ($1.52\text{ m}$).

---

## 6. Design Velocity Guidelines & Economic Pipe Sizing

When a pump is enabled, Visualcheme checks pipe velocity against standard liquid suction/discharge design bands (`pipe_unit.ts`, lines 985–1000):

| Service | Visualcheme Warning Band | **[T&S]** Section 20.10 (p. 1248) | **[S&L]** Ch. 6.7 Heuristic 38 (p. 151) |
| :--- | :--- | :--- | :--- |
| **Pump Suction (Liquid)** | $0.5\text{–}1.5\text{ m/s}$ (warns if $> 1.5\text{ m/s}$ on single bore; notes if $< 0.5\text{ m/s}$) | Rase (1953): $u = 0.02\,d_i + 0.1\text{ m/s}$ ($d_i$ in mm; e.g., $1.1\text{ m/s}$ at $50\text{ mm}$) | Included via $2\text{ psi}/100\text{ ft}$ ($\approx 0.45\text{ kPa/m}$) overall line $\Delta P$ |
| **Pump Discharge (Liquid)** | $1.5\text{–}3.0\text{ m/s}$ (warns if $> 3.0\text{ m/s}$) | Pumped non-viscous liquids: **$1\text{–}3\text{ m/s}$**, $\Delta P \approx 0.5\text{ kPa/m}$; Rase: $0.06\,d_i + 0.4\text{ m/s}$; Simpson (1968): $2.4\text{–}3.0\text{ m/s}$ for $\rho = 800\text{–}1600\text{ kg/m}^3$ | $2\text{ psi}/100\text{ ft}$ ($\approx 0.45\text{ kPa/m}$) — remarkably close to **[T&S]**'s $0.5\text{ kPa/m}$! |

### Economic Optimum Pipe Diameter (**[T&S]** Ch. 20.10, Eqs. 20.25–20.31, pp. 1249–1252)

Sizing a pumped line minimizes total annualized cost $C_t = C_C + C_w$, balancing **piping capital & maintenance** (which rise with $d_i^n$) against **annual pumping electricity** (which falls as $d_i^{-4.84}$ in turbulent flow using Genereaux's $C_f = 0.04\,\mathrm{Re}^{-0.16}$). Differentiating $dC_t / dd_i = 0$ yields **[T&S]** Eq. (20.29) (p. 1251), which simplifies for typical industrial costs to:

- **A106 Carbon Steel** (**[T&S]** Eq. 20.30, p. 1252):
  $$d_{i,\text{opt}} = \begin{cases} 0.664\,\dot{m}^{0.51}\rho^{-0.36} & (25\text{–}200\text{ mm}) \\ 0.534\,\dot{m}^{0.43}\rho^{-0.30} & (250\text{–}600\text{ mm}) \end{cases}$$
- **304 Stainless Steel** (**[T&S]** Eq. 20.31, p. 1252 — smaller optimal bore due to higher alloy capital cost!):
  $$d_{i,\text{opt}} = \begin{cases} 0.550\,\dot{m}^{0.49}\rho^{-0.35} & (25\text{–}200\text{ mm}) \\ 0.465\,\dot{m}^{0.43}\rho^{-0.31} & (250\text{–}600\text{ mm}) \end{cases}$$
- **Refinery rule of thumb** (**[T&S]** p. 1249): $d_{i,\text{opt}} = 3.2\,(\dot{m}/\rho)^{0.5}$ (meters; equivalent to $d_{\text{in}} = \sqrt{Q_{\text{gpm}}}$).
