---
id: pipe-flow-friction-moody
title: Pipe Friction Correlations, Surface Roughness & the Moody Diagram
unit: pipe_flow
ui_elements:
  - param:material
  - param:friction_model
  - param:diameter_mm
  - param:length_m
  - kpi:reynolds
  - kpi:total_dp
  - hud:friction_factor
  - chart:moody-diagram
  - preset:pipe_default
  - preset:pipe_laminar
  - preset:pipe_cast_iron
  - preset:pipe_towler_20_1
code_files:
  - src/core/thermo/friction.ts
  - src/core/units/pipe/moody_data.ts
  - tests/friction.test.ts
  - tests/pipe_unit.test.ts
references:
  - "[T&S] Ch. 20.4.1 Eqs. (20.1), (20.1b), Fig. 20.5, Table 20.3, Example 20.1, pp. 1213–1218; Ch. 19.8 Eq. (19.19) & Fig. 19.24, pp. 1081–1082"
  - "[S&L] Ch. 12.3 Eqs. (12.15), (12.18)–(12.19), pp. 377–378; Ch. 24.1 (Hagen–Poiseuille), p. 650"
  - "[EXT] Colebrook (1939); Moody (1944); Swamee & Jain (1976); Churchill (1977); von Kármán rough limit"
---

# Pipe Friction Correlations, Surface Roughness & the Moody Diagram

## 1. The Darcy–Weisbach Equation & Friction-Factor Conventions

For steady, incompressible, fully developed flow in a straight circular pipe of internal diameter $D$ and length $L$, frictional pressure drop $\Delta P_f$ and frictional head loss $h_f$ are given by the **Darcy–Weisbach equation**:

$$\Delta P_f = f\,\left(\frac{L}{D}\right)\left(\frac{\rho v^2}{2}\right), \qquad h_f = \frac{\Delta P_f}{\rho g} = f\,\left(\frac{L}{D}\right)\left(\frac{v^2}{2g}\right)$$

where $f \equiv f_D = 8\tau_w / (\rho v^2)$ is the **Darcy (Moody) friction factor** used throughout Visualcheme (`friction.ts`, Bulk HUD `f`, and the Moody Chart vertical axis).

### Textbook Convention Contrast (**Critical!**)

| Source | Equation Cited | Friction Factor Definition | Equivalent Form of $\Delta P_f$ | Conversion to Visualcheme $f$ |
| :--- | :--- | :--- | :--- | :---: |
| **Visualcheme** | `pipe_unit.ts`, `friction.ts` | Darcy–Weisbach $f = 8\tau_w/(\rho v^2)$ | $\Delta P_f = f\,(L/D)\,(\rho v^2 / 2)$ | $f = f_D$ |
| **[T&S] Primary** | Eq. (20.1) & Fig. 20.5 (pp. 1213–1215) | Coulson–Richardson $f_{\text{T\&S}} = R/(\rho u^2)$ | $\Delta P_f = 8 f_{\text{T\&S}}\,(L/d_i)\,(\rho u^2 / 2)$ | $f = 8 f_{\text{T\&S}}$ |
| **[T&S] Fanning Note** | Eq. (20.1b) (p. 1214) | Fanning $C_f = 2 R / (\rho u^2)$ | $\Delta P_f = 4 C_f\,(L/d_i)\,(\rho u^2 / 2)$ | $f = 4 C_f$ |
| **[S&L] Both Forms** | Eq. (12.18) (p. 378) | Darcy $f_D$ and Fanning $f$ ($f_D = 4 f$) | $-\Delta P = \dfrac{f_D G^2 L}{2 g_c \rho D_i} = \dfrac{2 f G^2 L}{g_c \rho D_i}$ | $f = f_D = 4 f_{\text{Fanning}}$ |

> [!WARNING]
> **Watch the Factor of 8 When Reading Towler Figure 20.5**: In **[T&S]** Example 20.1 (p. 1218), Towler reads $f_{\text{T\&S}} = 0.0032$ from Fig. 20.5 at $\mathrm{Re} = 5\times 10^4$, $e/d = 0.002$. On Visualcheme's Moody chart, that exact same operating point sits at $f_D = 8 \times 0.0032 = 0.0256$ (Colebrook gives $0.0256$ at $\varepsilon/D = 0.00184$). Both yield the identical frictional pressure drop $\Delta P_f \approx 240\text{ kPa}$!

---

## 2. Laminar Friction: Exact Hagen–Poiseuille Solution

For $\mathrm{Re} < 2300$, integrating the parabolic velocity profile relates wall shear stress directly to viscosity $\mu$ with **zero dependence on pipe roughness $\varepsilon/D$** (**[S&L]** Ch. 24.1, p. 650):

$$\Delta P_f = \frac{32\,\mu\,L\,v}{D^2} = \left(\frac{64}{\mathrm{Re}}\right)\left(\frac{L}{D}\right)\left(\frac{\rho v^2}{2}\right) \implies \boxed{f_D = \frac{64}{\mathrm{Re}}}$$

(Equivalently $C_f = 16/\mathrm{Re}$ in Fanning notation, or $f_{\text{T\&S}} = 8/\mathrm{Re}$ on **[T&S]** Fig. 20.5.)
- On the log–log Moody diagram, $\log_{10} f_D = \log_{10}(64) - \log_{10}\mathrm{Re}$ forms a straight line of slope $-1$.
- Verified directly in `tests/pipe_unit.test.ts` on the **Laminar Glycol** preset ($\mathrm{Re} \approx 330$, $f = 64/330 \approx 0.194$).

---

## 3. Turbulent Friction Factor Correlations (`friction_model`)

Neither **[T&S]** Ch. 20 (which reads Fig. 20.5 graphically) nor **[S&L]** Ch. 12 (which presents the smooth-pipe Petukhov–Gnielinski formula, Eq. 12.15) prints the rough-pipe implicit Colebrook equation explicitly — although **[T&S]** Fig. 20.5 is itself a graphical rendering of the Colebrook–Moody relation. Visualcheme implements **three selectable industry-standard correlations** **[EXT]** in `FrictionSolver` (`src/core/thermo/friction.ts`):

### 3.1 Colebrook–White (1939) — Default Reference (Implicit)

$$\frac{1}{\sqrt{f}} = -2.0 \log_{10}\!\left(\frac{\varepsilon / D}{3.7} + \frac{2.51}{\mathrm{Re}\sqrt{f}}\right), \qquad \mathrm{Re} \ge 4000$$

- **Asymptotic Limits**:
  - *Hydraulically smooth wall* ($\varepsilon/D \to 0$): reduces to the Prandtl–von Kármán smooth-pipe law $1/\sqrt{f} = 2\log_{10}(\mathrm{Re}\sqrt{f}) - 0.8$.
  - *Fully rough / complete turbulence* ($\mathrm{Re} \to \infty$): the viscous sublayer thins below the wall roughness height $\varepsilon$, $\mathrm{Re}$ drops out, and $f$ approaches the horizontal **von Kármán rough limit** $f = \left[-2\log_{10}\!\left(\frac{\varepsilon/D}{3.7}\right)\right]^{-2}$.
- **Numerical Solver in Visualcheme** (`solveColebrook`): Transforms the unknown to $x = 1/\sqrt{f}$, where the residual $g(x) = x + 2\log_{10}(a + bx)$ (with $a = (\varepsilon/D)/3.7$, $b = 2.51/\mathrm{Re}$) is smooth, strictly monotonic, and nearly linear. Seeded from Swamee–Jain, Newton–Raphson:
  $$x_{k+1} = x_k - \frac{g(x_k)}{g'(x_k)}, \qquad g'(x) = 1 + \frac{2 b}{\ln(10)\,(a + b x)}$$
  converges to relative tolerance $< 10^{-12}$ in typically **2–3 iterations**.

### 3.2 Swamee–Jain (1976) — Explicit Approximation

$$f = \frac{0.25}{\left[\log_{10}\!\left(\dfrac{\varepsilon / D}{3.7} + \dfrac{5.74}{\mathrm{Re}^{0.9}}\right)\right]^2}, \qquad 5000 \le \mathrm{Re} \le 10^8,\quad 10^{-6} \le \frac{\varepsilon}{D} \le 10^{-2}$$

- Explicit, iteration-free approximation to Colebrook–White.
- **Accuracy audit** (`tests/friction.test.ts`): Often quoted casually as "within $1\%$"; exact testing shows a maximum deviation of **$2.8\%$** relative to Colebrook at the corner $\mathrm{Re} = 5000$, $\varepsilon/D = 0.01$, and $< 1\%$ across most typical industrial turbulent flows (e.g., on the default pipe, Swamee–Jain gives $f = 0.02248$ vs. Colebrook $0.02232$, a $+0.7\%$ difference).

### 3.3 Churchill (1977) — Single All-Regime Explicit Correlation

$$f = 8 \left[\left(\frac{8}{\mathrm{Re}}\right)^{12} + \frac{1}{(A + B)^{3/2}}\right]^{1/12}$$

where:

$$A = \left[2.457 \ln\!\left(\frac{1}{(7/\mathrm{Re})^{0.9} + 0.27\,(\varepsilon / D)}\right)\right]^{16}, \qquad B = \left(\frac{37{,}530}{\mathrm{Re}}\right)^{16}$$

- Reproduces $64/\mathrm{Re}$ as $\mathrm{Re} \to 0$, blends smoothly through the transition zone via the $B = (37{,}530/\mathrm{Re})^{16}$ switching term, and reproduces Colebrook–White within $\sim 1\text{–}3\%$ across all turbulent $\mathrm{Re}$ and $\varepsilon/D$.
- Because Churchill is a single published continuous expression, Visualcheme renders its full curve **solid** across the transition zone on the Moody chart.

### 3.4 Textbook Comparison: Smooth-Pipe Petukhov–Gnielinski (**[S&L]**) & Genereaux (**[T&S]**)

For completeness and contrast, the two design textbooks also provide two specialized explicit friction equations not exposed as UI selectors:

- **[S&L]** Eq. (12.15) (p. 377, Petukhov / Gnielinski for **smooth tubes**, $2300 \le N_{\text{Re}} \le 10^6$):
  $$f_D = (1.82 \log_{10} N_{\text{Re}} - 1.64)^{-2}$$
  *(Compare at $\mathrm{Re} = 10^5$, $\varepsilon/D = 0$: Petukhov gives $0.01797$ vs. Colebrook $0.01799$, within $0.1\%$; ignores wall roughness $\varepsilon$.)*
- **[T&S]** Section 20.10 (p. 1250, Genereaux 1937 for clean commercial steel economic sizing):
  $$C_f = 0.04\,\mathrm{Re}^{-0.16} \iff f_D = 0.16\,\mathrm{Re}^{-0.16}$$
- **Non-isothermal wall-viscosity correction**: Both **[T&S]** Eq. (19.19) (p. 1081, $(\mu/\mu_w)^{-m}$ with $m = 0.25$ laminar / $0.14$ turbulent) and **[S&L]** Eq. (12.19) (p. 378, $\phi = 1.02(\mu_b/\mu_w)^{0.14}$) note that when strong radial temperature gradients exist between bulk and pipe wall (heat exchangers), wall viscosity shifts $f$. Visualcheme evaluates $\mu(T_{\text{bulk}})$ axially along $x$ without a radial wall-film correction, appropriate for piping runs with modest ambient heat loss ($U \le 15\text{ W/(m}^2\cdot\text{K)}$).

---

## 4. Transition Zone Bridging ($2300 \le \mathrm{Re} < 4000$)

Because flow in $[2300, 4000)$ alternates unpredictably between laminar and turbulent slugs, no exact deterministic $f$ exists.
- For **Colebrook–White** and **Swamee–Jain**, Visualcheme avoids an artificial jump discontinuity by bridging $\mathrm{Re}_1 = 2300$ ($f_{\text{lam}} = 64/2300 = 0.02783$) to $\mathrm{Re}_2 = 4000$ ($f_{\text{turb}}(4000, \varepsilon/D)$) linearly in **log–log coordinates** (`friction.ts`, lines 114–117):
  $$\ln f(\mathrm{Re}) = \ln f_{\text{lam}} + s\,\big(\ln f_{\text{turb}} - \ln f_{\text{lam}}\big), \qquad s = \frac{\ln(\mathrm{Re} / 2300)}{\ln(4000 / 2300)}$$
- On the Moody chart (`moody_data.ts`), this interpolated bridge is explicitly drawn **dashed** so learners immediately see that $f$ is uncertain there, accompanied by a `Caution` warning.

---

## 5. Pipe Surface Roughness ($\varepsilon$) & Relative Roughness ($\varepsilon / D$)

Turbulent friction depends on the dimensionless **relative roughness** $\varepsilon / D$ (written $e$ or $e/d$ in **[T&S]** p. 1214).

| Pipe Material (`material`) | Visualcheme $\varepsilon$ ($\text{mm}$) | **[T&S]** Table 20.3 (p. 1216) | Notes & Physical Origin |
| :--- | :---: | :---: | :--- |
| **Drawn Tubing / Copper / PVC** | $0.0015$ | $0.0015\text{ mm}$ (`Drawn tubing`) | Hydraulically smooth at moderate $\mathrm{Re}$; exact **[T&S]** match |
| **Stainless Steel** | $0.015$ | *(Not listed in Table 20.3)* | Standard piping handbook value for seamless drawn/cold-finished stainless **[EXT]** |
| **Commercial Steel** (default) | $0.046$ | $0.046\text{ mm}$ (`Commercial steel pipe`) | Standard clean Schedule 40 carbon steel; exact **[T&S]** match |
| **Galvanized Iron** | $0.15$ | *(Not listed in Table 20.3)* | Classic Moody (1944) standard roughness value **[EXT]** |
| **Cast Iron** | $0.26$ | $0.26\text{ mm}$ (`Cast iron pipe`) | Uncoated cast iron; exact **[T&S]** match |
| **Concrete** | $1.2$ | $0.3\text{–}3.0\text{ mm}$ (`Concrete pipe`) | Mid-range representative value inside **[T&S]** Table 20.3 span |

---

## 6. Anatomy of Visualcheme's Moody Chart (`#diagram-chart-wrapper`)

The Moody chart (`moody_data.ts`, `diagram_chart.ts`) plots $\log_{10} f_D \in [0.006, 0.12]$ against $\log_{10} \mathrm{Re} \in [500, 10^8]$:

1. **Pale Background Reference Curves**:
   - Laminar line $f_D = 64/\mathrm{Re}$ for $\mathrm{Re} \in [500, 2300]$.
   - Nine Colebrook–White iso-roughness curves for $\mathrm{Re} \in [4000, 10^8]$: smooth pipe ($\varepsilon/D = 0$, lavender) and $\varepsilon/D \in \{5\times 10^{-5},\, 2\times 10^{-4},\, 10^{-3},\, 4\times 10^{-3},\, 8\times 10^{-3},\, 0.015,\, 0.03,\, 0.05\}$.
2. **Highlighted Gold Curve (Active Pipe)**: Tracks the exact $\varepsilon/D$ of the currently configured material and diameter using the **currently selected** `friction_model` (dashed across $2300\text{–}4000$ for Colebrook/Swamee–Jain; solid for Churchill).
3. **Glowing Operating Point**: Marks $(\mathrm{Re}_{\text{in}}, f_{\text{in}})$ live as you drag velocity, diameter, temperature, fluid, or roughness sliders.

### Worked Textbook Verification: **[T&S]** Example 20.1 (p. 1218)

Preset `Towler Example 20.1 (25 mm, 120 m)` reproduces **[T&S]** Example 20.1 ($3500\text{ kg/h}$ water at $\sim 21\,^\circ\text{C}$, $D = 25\text{ mm}$, $L = 120\text{ m}$, commercial steel, half-open gate valve):
- Velocity $v = 1.98\text{ m/s}$, $\mathrm{Re} \approx 49{,}900$, $\varepsilon/D = 0.046/25 = 0.00184$.
- **[T&S]** rounds $\varepsilon/D \approx 0.002$, reads $f_{\text{T\&S}} = 0.0032$ ($f_D = 0.0256$) from Fig. 20.5, and obtains straight-pipe friction $\Delta P_f = 240.4\text{ kPa}$ and gate valve loss ($K = 4$) $\Delta P_{\text{valve}} = 7.83\text{ kPa}$.
- Visualcheme's `tests/pipe_unit.test.ts` asserts agreement with **[T&S]** Example 20.1 on $\mathrm{Re}$, $\Delta P_f$, and $\Delta P_{\text{valve}}$ directly!
