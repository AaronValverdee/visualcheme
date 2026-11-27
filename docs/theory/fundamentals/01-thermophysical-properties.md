---
id: fundamentals-thermophysical-properties
title: Thermophysical Properties & DIPPR / ChemSep Correlations
unit: shared
ui_elements:
  - brand-badge (DECHEMA / DIPPR Core)
  - param:fluid
  - hud:density
  - hud:viscosity
  - pill:viscosity
  - warnings:correlation-extrapolation
code_files:
  - src/core/thermo/correlations.ts
  - src/core/database/property_service.ts
  - src/core/database/types.ts
  - src/core/database/compounds.json
  - tests/properties.test.ts
references:
  - "[T&S] Ch. 4.4 (Selection of Physical Property Models), pp. 169–183, Eq. (4.2)"
  - "[S&L] Ch. 7.2 & 7.4 (Constitutive Property Models & DIPPR), Table 7.14 p. 188, p. 191"
  - "[EXT] DIPPR Project 801 / ChemSep Equation Catalog; Rackett (1970); Clausius–Clapeyron; Trouton's Rule"
---

# Thermophysical Properties & DIPPR / ChemSep Correlations

## 1. Role in the Visualization Page

Every hydraulic and thermal calculation in Visualcheme relies on **temperature-dependent, pure-component liquid properties** evaluated locally along the equipment — never fixed room-temperature textbook constants:

- **Top Header Badge**: `DECHEMA / DIPPR Core` reflects the underlying pure-component database (`compounds.json`, 431 species extracted from ChemSep / DIPPR® 801) and binary VLE databases (`binary_nrtl.json` from DECHEMA, `binary_pr.json` for Peng–Robinson $k_{ij}$, prepared for future separation units).
- **Working Fluid Selector** (`fluid`): Exposes 6 benchmark liquids spanning polar hydrogen-bonded (`Water`, `Ethanol`, `Ethylene glycol`), volatile ketone (`Acetone`), and non-polar aromatics (`Benzene`, `Toluene`).
- **Bulk & Transport HUD + Spatial Heatmap**: Displays local density $\rho(T)$ and dynamic viscosity $\mu(T)$ (with inlet $\to$ outlet arrows whenever thermal gradients alter a property by $>0.5\%$).
- **Model Validity Warnings**: Flags whenever local temperature $T$ leaves a correlation's regressed experimental window $[T_{\min}, T_{\max}]$.

### Textbook Grounding

- **[T&S] Section 4.4.1 (pp. 169–170)** identifies the **DIPPR® Project 801** database (AIChE Design Institute for Physical Properties) and **DECHEMA** vapor–liquid equilibrium data collection as the industry-standard evaluated data banks for computer-aided process design, emphasizing that simulator predictions should always be benchmarked against experimental data (Section 4.4.6, p. 182).
- **[S&L] Section 7.2 (p. 165) & Section 7.4 (Table 7.14, p. 188)** categorize temperature-dependent pure-component models ($P^{\text{sat}}, \rho, c_p, \Delta H_{\text{vap}}, \mu$) as **constitutive property models** retrieved from the simulator's DIPPR correlation library during rigorous flowsheeting.

---

## 2. The Local Liquid State Vector

At every Runge–Kutta stage along the pipe, `PropertyService.getLiquidState(compound, T)` evaluates a 6-property SI state vector at local absolute temperature $T$ (K):

$$\vec{\Phi}_L(T) = \Big[\, \rho(T),\; \mu(T),\; c_p(T),\; k(T),\; P^{\text{sat}}(T),\; \beta(T) \,\Big]$$

| Property | Symbol | SI Unit (UI Unit) | Primary Correlation in `compounds.json` | Fallback Model (if missing) |
| :--- | :---: | :--- | :--- | :--- |
| **Liquid mass density** | $\rho$ | $\text{kg/m}^3$ | DIPPR 105 (Rackett) or DIPPR 106 ($\text{kmol/m}^3$) $\times M_w$ | Critical-constant Rackett equation |
| **Dynamic shear viscosity** | $\mu$ | $\text{Pa}\cdot\text{s}$ ($\text{cP}$) | DIPPR 101 (Andrade-type exponential) | $1.0\text{ cP}$ ($10^{-3}\text{ Pa}\cdot\text{s}$) |
| **Isobaric heat capacity** | $c_p$ | $\text{J/(kg}\cdot\text{K)}$ | ChemSep Eq. 16 ($\text{J/(kmol}\cdot\text{K)}$) $\div (1000 M_w)$ | $2.1\text{ kJ/(kg}\cdot\text{K)}$ |
| **Thermal conductivity** | $k$ | $\text{W/(m}\cdot\text{K)}$ | ChemSep Eq. 16 | $0.15\text{ W/(m}\cdot\text{K)}$ |
| **Saturation vapor pressure** | $P^{\text{sat}}$ | $\text{Pa}$ ($\text{kPa}$) | DIPPR 101 | Antoine (Eq. 10) $\to$ Clausius–Clapeyron |
| **Thermal expansivity** | $\beta$ | $\text{K}^{-1}$ | Central finite difference of $\rho(T)$ | Derived directly from $\rho(T)$ |

*(Heat of vaporization $\Delta H_{\text{vap}}$ via DIPPR 106 with Trouton's rule fallback, and vapor viscosity $\mu_V$ via DIPPR 102, are also implemented in `property_service.ts` for future two-phase and gas modules.)*

---

## 3. Correlation Equation Catalog (`correlations.ts`)

ChemSep / DIPPR stores each pure-component correlation by an integer **equation ID** (`eq`) together with its fitted coefficients and regressed temperature limits $[T_{\min}, T_{\max}]$ **[EXT]**:

### 3.1 Polynomial Forms (Equations 1–5 and DIPPR 100)

$$Y(T) = A + B T + C T^2 + D T^3 + E T^4$$

Used for low-order polynomial fits where the equation number (1–5) indicates the number of terms; DIPPR 100 uses up to five coefficients.

### 3.2 Antoine Equation (Equation 10) — **[T&S]** Eq. (4.2), p. 173; **[S&L]** p. 191

$$P^{\text{sat}}(T) = \exp\!\left(A - \frac{B}{T + C}\right)$$

> [!NOTE]
> **Units Contrast**: **[T&S]** Eq. (4.2) writes Antoine in $\text{mmHg}$ with $T$ in $\text{K}$, whereas ChemSep's stored Eq. 10 coefficients evaluate directly in $\text{Pa}$ with $T$ in $\text{K}$.

### 3.3 ChemSep Exponential Form (Equation 16) — **[EXT]**

$$Y(T) = A + \exp\!\left(\frac{B}{T} + C + D T + E T^2\right)$$

Used in `compounds.json` for **liquid isobaric heat capacity $c_p(T)$** and **liquid thermal conductivity $k(T)$**.

> [!WARNING]
> **Why Equation Number Dispatch Matters**: ChemSep Eq. 16 has five coefficients $[A, B, C, D, E]$ just like a quartic polynomial (DIPPR 100), but is **exponential**, not polynomial. Treating Water's Eq. 16 $c_p$ coefficients as a polynomial causes $c_p$ to cross zero at $7.4\,^\circ\text{C}$ and turn negative below $7.3\,^\circ\text{C}$ ($-199\text{ J/(kg}\cdot\text{K)}$ at $7\,^\circ\text{C}$), inverting the sign of $dT/dx$! Evaluating Eq. 16 strictly as $A + \exp(B/T + C + DT + ET^2)$ reproduces NIST liquid water $c_p$ within $0.3\%$ across $0\text{–}100\,^\circ\text{C}$.

### 3.4 DIPPR 101 (Vapor Pressure & Liquid Viscosity) — **[EXT]**

$$Y(T) = \exp\!\left(A + \frac{B}{T} + C \ln T + D T^E\right)$$

- For **vapor pressure** $P^{\text{sat}}(T)$ ($\text{Pa}$): generalizes the Clausius–Clapeyron / Kirchhoff relation (where $B \propto -\Delta H_{\text{vap}}/R$ and $C \ln T$ captures $\Delta c_p/R$).
- For **liquid dynamic viscosity** $\mu(T)$ ($\text{Pa}\cdot\text{s}$): generalizes Andrade's exponential activation-energy law $\mu \propto \exp(E_a / R T)$. Liquid viscosity decreases strongly with rising temperature — especially for hydrogen-bonded polyols like **ethylene glycol**, where $\mu$ drops from $21.1\text{ cP}$ at $20\,^\circ\text{C}$ to $16.1\text{ cP}$ at $25\,^\circ\text{C}$ and $\sim 3.1\text{ cP}$ at $80\,^\circ\text{C}$.

### 3.5 DIPPR 102 (Vapor Viscosity) — **[EXT]**

$$Y(T) = \frac{A T^B}{1 + C/T + D/T^2}$$

Sutherland-type kinetic-theory form for low-pressure gas viscosity (available in `PropertyService.calcVaporViscosity` for future gas modules).

### 3.6 DIPPR 105 (Rackett Liquid Molar Density) — **[EXT]**

$$\rho_{\text{molar}}(T) = \frac{A}{B^{1 + (1 - T/C)^D}}, \qquad \rho(T) = M_w\,\rho_{\text{molar}}(T)$$

Valid strictly for subcritical temperatures $\tau = 1 - T/C > 0$ (where $C \approx T_c$). Used for organic liquids (ethanol, benzene, acetone, toluene, ethylene glycol). If missing, `PropertyService` falls back to the generalized Rackett equation using critical constants $(T_c, V_c, Z_c)$:

$$V_{\text{kmol}} = V_c\, Z_{RA}^{(1 - T_r)^{2/7}}, \qquad \rho = \frac{M_w}{V_{\text{kmol}}}$$

### 3.7 DIPPR 106 (Watson / Critical-Exponent Form) — **[EXT]**

$$Y(T) = A (1 - T_r)^{B + C T_r + D T_r^2 + E T_r^3}, \qquad T_r = \frac{T}{T_c} < 1$$

Used in `compounds.json` for **Water's liquid molar density** (because water's density maximum near $4\,^\circ\text{C}$ is not well captured by standard Rackett 105) and for **enthalpy of vaporization** $\Delta H_{\text{vap}}(T)$ across all species (with Trouton's rule $\Delta H_{\text{vap}} \approx 88\,T_b\text{ kJ/kmol}$ as fallback).

### 3.8 Isobaric Thermal Expansivity ($\beta$)

Defined thermodynamically as:

$$\beta \equiv -\frac{1}{\rho}\left(\frac{\partial \rho}{\partial T}\right)_P = \frac{1}{v}\left(\frac{\partial v}{\partial T}\right)_P$$

Visualcheme evaluates $\beta(T)$ by **second-order central finite difference** on $\rho(T)$ with $\Delta T = 0.5\text{ K}$:

$$\beta(T) \approx -\frac{\rho(T + \Delta T) - \rho(T - \Delta T)}{2\,\Delta T\,\rho(T)}$$

This property is essential to the **non-isothermal liquid energy balance** (see [Conservation Laws & Second-Law Context](02-conservation-and-second-law.md)): the dimensionless product $\beta T$ determines how much of a pressure drop converts into internal energy vs. reversible $P\,dv$ work during throttling and pumping. For water at $25\,^\circ\text{C}$, $\beta \approx 2.6\times 10^{-4}\text{ K}^{-1}$ ($\beta T \approx 0.077$), whereas for organic solvents like acetone or benzene, $\beta T \approx 0.30\text{–}0.43$!

---

## 4. Benchmark Properties of the Six Pipe-Flow Working Fluids

Values at $25\,^\circ\text{C}$ ($298.15\text{ K}$) validated against NIST Chemistry WebBook / Perry's 8th ed. in `tests/properties.test.ts`:

| Working Fluid | Formula | $T_f$ ($^\circ\text{C}$) | $T_b$ ($^\circ\text{C}$) | $\rho$ ($\text{kg/m}^3$) | $\mu$ ($\text{cP}$) | $c_p$ ($\text{kJ/(kg}\cdot\text{K)}$) | $k$ ($\text{W/(m}\cdot\text{K)}$) | $P^{\text{sat}}$ ($\text{kPa}$) | Pedagogical Role in Visualcheme |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Water** | $\text{H}_2\text{O}$ | $0.0$ | $100.0$ | $997.1$ | $0.890$ | $4.181$ | $0.607$ | $3.17$ | Standard reference liquid; high $c_p$, low $\beta T$, Towler Ex. 20.1 & hot-water NPSH cavitation |
| **Ethanol** | $\text{C}_2\text{H}_5\text{OH}$ | $-114.1$ | $78.3$ | $785.1$ | $1.074$ | $2.44$ | $0.167$ | $7.87$ | Polar organic solvent; moderate viscosity & volatility |
| **Benzene** | $\text{C}_6\text{H}_6$ | $+5.5$ | $80.1$ | $873.6$ | $0.604$ | $1.74$ | $0.141$ | $12.7$ | High freezing point ($5.5\,^\circ\text{C}$) demonstrates solidification alerts in cold pipes |
| **Acetone** | $\text{C}_3\text{H}_6\text{O}$ | $-94.7$ | $56.1$ | $784.5$ | $0.306$ | $2.16$ | $0.161$ | $30.8$ | Low boiling point & high $P^{\text{sat}}$ ($81.7\text{ kPa}$ at $50\,^\circ\text{C}$); demonstrates post-valve flashing |
| **Toluene** | $\text{C}_7\text{H}_8$ | $-95.0$ | $110.6$ | $862.2$ | $0.560$ | $1.71$ | $0.131$ | $3.79$ | Classic chemical-plant hydrocarbon (Towler Ex. 20.6, Seider Ex. 14.1) |
| **Ethylene glycol** | $\text{C}_2\text{H}_6\text{O}_2$ | $-12.9$ | $197.3$ | $1110.0$ | $16.1$ | $2.41$ | $0.258$ | $0.012$ | High viscosity ($\sim 18\times$ water) demonstrates laminar Hagen–Poiseuille flow, long entrance lengths, and dramatic $\mu(T)$ coupling when cooling |

---

## 5. Key Assumptions & Extrapolation Diagnostics

1. **Incompressible-Liquid Property Assumption (No Pressure Dependence of $\rho, \mu, c_p$)**: Properties are evaluated at saturated-liquid correlations $\Phi_L(T)$ only, neglecting isothermal compressibility $\kappa_T = \frac{1}{\rho}(\partial \rho/\partial P)_T \sim 5\times 10^{-10}\text{ Pa}^{-1}$ (valid to $<0.1\%$ below $\sim 20\text{ bar}$ far from $T_c$). Thermal expansion $\rho(T)$ *is* retained via mass conservation $v(x) = \dot{m}/(\rho(T(x)) A)$.
2. **Newtonian Fluid**: Viscosity $\mu$ is independent of shear rate. **[T&S]** Section 20.4.1 (p. 1214) explicitly warns that non-Newtonian fluids require shear-dependent apparent viscosity models.
3. **Regression Range Checking**: Every DIPPR/ChemSep model stores $[T_{\min}, T_{\max}]$ after its coefficients. Whenever $T < T_{\min}$ or $T > T_{\max}$ at inlet or outlet (e.g., Benzene near $2\,^\circ\text{C}$), `PropertyService` attaches a warning displayed in the UI's `Caution` strip rather than silently extrapolating.
