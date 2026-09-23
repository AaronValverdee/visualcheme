import pymupdf
import os
from extract_helpers import crop_figure

doc = pymupdf.open('Chemical Engineering Design, Principles, Second Edition.pdf')

# -------------------------------------------------------------
# 5. che-reactors-mixers (Chapter 15: Design of Reactors and Mixers)
# -------------------------------------------------------------
skill_dir_5 = os.path.join('.agents', 'skills', 'che-reactors-mixers')
img_dir_5 = os.path.join(skill_dir_5, 'images')
os.makedirs(img_dir_5, exist_ok=True)

print("Extracting Chapter 15 figures...")
crop_figure(doc, 15, 1, os.path.join(img_dir_5, 'fig_15_1_reactor_procedure.png'))
crop_figure(doc, 15, 7, os.path.join(img_dir_5, 'fig_15_7_tank_geometry.png'))
crop_figure(doc, 15, 8, os.path.join(img_dir_5, 'fig_15_8_impeller_types.png'))
crop_figure(doc, 15, 9, os.path.join(img_dir_5, 'fig_15_9_flow_patterns.png'))
crop_figure(doc, 15, 11, os.path.join(img_dir_5, 'fig_15_11_power_curves.png'))
crop_figure(doc, 15, 17, os.path.join(img_dir_5, 'fig_15_17_reactor_cooling.png'))
crop_figure(doc, 15, 25, os.path.join(img_dir_5, 'fig_15_25_fixed_bed.png'))

skill_content_5 = r"""---
name: che-reactors-mixers
description: >-
  Chemical engineering guide to reactor design (CSTR, PFR, Batch, Catalytic Packed Bed)
  and fluid mixing/agitation equipment (impeller selection, power number curves N_p vs Re,
  baffle sizing, blending time, and jacket/coil heat transfer). Use when modeling, designing,
  or visualizing chemical reactors and mixing units in Visualcheme.
---

# Design of Chemical Reactors and Mixers

This skill covers reactor sizing, kinetics, mixing aerodynamics, impeller power consumption, and thermal management, based on *Chemical Engineering Design* (Chapter 15).

---

## 1. Reactor Types & Performance Equations

![Reactor Design Procedure](images/fig_15_1_reactor_procedure.png)

### 1.1 Ideal Reactor Models Comparison

| Reactor Model | Design Equation | Key Characteristics |
| :--- | :--- | :--- |
| **Continuous Stirred-Tank (CSTR)** | $V = \frac{F_{A0} X_A}{(-r_A)_{exit}}$ | Perfectly mixed; composition and temperature inside vessel equal exit stream; operates at lowest concentration and reaction rate. |
| **Plug Flow Reactor (PFR)** | $V = F_{A0} \int_0^{X_A} \frac{dX_A}{-r_A}$ | No axial mixing; composition changes continuously with length; highest conversion per unit volume for positive-order kinetics. |
| **Batch Reactor** | $t_R = N_{A0} \int_0^{X_A} \frac{dX_A}{(-r_A) V}$ | Unsteady-state; flexible for specialty chemicals, pharmaceuticals, and multi-step reactions. Total cycle time includes charge, heat, cool, discharge. |

### 1.2 Space Time and Space Velocity
* **Space Time ($\tau$)**:
  $$\tau = \frac{V}{\dot{V}_0}$$
* **Damköhler Number ($Da$)** (for 1st-order reaction $r_A = k C_A$):
  $$Da = k \tau = \frac{\text{Reaction rate}}{\text{Convective mass transport rate}}$$
  * In CSTR: $X_A = \frac{Da}{1 + Da}$
  * In PFR: $X_A = 1 - e^{-Da}$

---

## 2. Mixing & Agitation in Stirred Vessels

![Standard Agitated Tank Geometry](images/fig_15_7_tank_geometry.png)

### 2.1 Standard Geometry Proportions
For a standard cylindrical baffled tank with a dished bottom:
* Liquid depth: $H_L = D_t$ (liquid height equal to tank diameter).
* Impeller diameter: $D = \frac{1}{3} D_t$ to $\frac{1}{2} D_t$.
* Impeller clearance from bottom: $C = \frac{1}{3} D_t$.
* Baffle width: $W = \frac{1}{10} D_t$ to $\frac{1}{12} D_t$ (standard: 4 vertical wall baffles offset by $W/5$ to prevent stagnant solids buildup).

### 2.2 Impeller Selection & Flow Patterns

![Impeller Types](images/fig_15_8_impeller_types.png)

![Flow Patterns and Vortexing](images/fig_15_9_flow_patterns.png)

1. **Marine Propeller (Axial Flow)**:
   * Low-viscosity liquids ($\mu < 2\\text{ Pa}\\cdot\\text{s}$), high-speed blending, solids suspension.
2. **Flat-Blade Rushton Turbine (Radial Flow)**:
   * High shear, excellent for gas-liquid dispersion and liquid-liquid emulsions.
3. **Pitched-Blade Turbine (Mixed Flow - $45^\circ$)**:
   * General purpose: blending + solids suspension with moderate shear.
4. **Anchor & Helical Ribbon (Laminar Flow)**:
   * High-viscosity liquids ($\mu > 50\\text{ Pa}\\cdot\\text{s}$), polymerizations, scrapes vessel walls to promote heat transfer.

### 2.3 Agitator Power Consumption Calculation
Power consumed by an impeller rotating at speed $N$ (rev/s) is governed by dimensionless groups:
* **Impeller Reynolds Number**:
  $$Re_I = \frac{\rho N D^2}{\mu}$$
* **Power Number**:
  $$N_P = \frac{P}{\rho N^3 D^5}$$

![Power Number vs Reynolds Number](images/fig_15_11_power_curves.png)

* **Flow Regimes in Agitated Tanks**:
  * **Laminar Regime ($Re_I < 10$)**:
    $$N_P = \frac{K_L}{Re_I} \implies P = K_L \mu N^2 D^3$$
    (Power is independent of fluid density $\rho$).
  * **Turbulent Regime ($Re_I > 10^4$ in baffled tanks)**:
    $$N_P = K_T = \text{constant} \implies P = K_T \rho N^3 D^5$$
    (Power is independent of fluid viscosity $\mu$). For Rushton turbine, $N_P \approx 5.0$; for 4-blade $45^\circ$ pitched turbine, $N_P \approx 1.27$.

---

## 3. Heat Transfer in Stirred Reactors

Exothermic reactions require aggressive heat removal to prevent thermal runaway.

![Reactor Cooling Jackets and Coils](images/fig_15_17_reactor_cooling.png)

### 3.1 Heat Transfer Area Configurations
1. **Conventional Outer Jacket**:
   * Low cost, easy cleaning; limited heat transfer area ($A = \pi D_t H_L$). As scale increases ($V \propto D_t^3$, $A \propto D_t^2$), area-to-volume ratio drops sharply ($A/V \propto 1/D_t$).
2. **Half-Pipe Coil Jacket**:
   * High coolant velocities, high internal pressure rating, structural reinforcement.
3. **Internal Helical Coils**:
   * High heat transfer area, high heat transfer coefficients ($U = 400 - 800\\text{ W}/\\text{m}^2\\text{K}$); harder to clean, occupies vessel volume.

### 3.2 Vessel Wall Heat Transfer Correlation
Inside film heat transfer coefficient ($h_i$) for agitated vessel:
$$\frac{h_i D_t}{k} = C \left(Re_I\right)^a \left(Pr\right)^b \left(\frac{\mu}{\mu_w}\right)^c$$
(Typically $a = 2/3$, $b = 1/3$, $c = 0.14$).

---

## 4. Catalytic Packed Bed Reactors

![Fixed Bed Catalytic Reactors](images/fig_15_25_fixed_bed.png)

* **Ergun Equation for Pressure Drop across Catalyst Bed**:
  $$\frac{\Delta P}{L} = 150 \frac{(1 - \varepsilon)^2}{\varepsilon^3} \frac{\mu v_0}{d_p^2} + 1.75 \frac{1 - \varepsilon}{\varepsilon^3} \frac{\rho v_0^2}{d_p}$$
  where $\varepsilon$ is bed voidage, $d_p$ is effective catalyst pellet diameter, and $v_0$ is superficial velocity.

---

## 5. Visualcheme Implementation Guide

* **Fluid Dynamics Visualization**:
  * Animate rotating impeller blades and dynamic fluid particles tracking axial or radial circulation loops.
  * In unbaffled mode, simulate the central surface vortex pulling down toward the impeller.
* **Thermal Hotspot & Runaway Demonstration**:
  * Provide interactive sliders for feed temperature, cooling water flow, and activation energy ($E_a$).
  * Display real-time 2D temperature gradient inside the reactor, demonstrating the ignition point and parametric sensitivity (Semenov / Frank-Kamenetskii thermal explosion).
"""

with open(os.path.join(skill_dir_5, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_5)
print(f"Created {os.path.join(skill_dir_5, 'SKILL.md')}")

# -------------------------------------------------------------
# 6. che-fluid-separators (Chapter 16: Separation of Fluids)
# -------------------------------------------------------------
skill_dir_6 = os.path.join('.agents', 'skills', 'che-fluid-separators')
img_dir_6 = os.path.join(skill_dir_6, 'images')
os.makedirs(img_dir_6, exist_ok=True)

print("Extracting Chapter 16 figures...")
crop_figure(doc, 16, 14, os.path.join(img_dir_6, 'fig_16_14_vertical_separator.png'))
crop_figure(doc, 16, 15, os.path.join(img_dir_6, 'fig_16_15_horizontal_separator.png'))
crop_figure(doc, 16, 16, os.path.join(img_dir_6, 'fig_16_16_souders_brown.png'))
crop_figure(doc, 16, 20, os.path.join(img_dir_6, 'fig_16_20_decanter_layout.png'))
crop_figure(doc, 16, 21, os.path.join(img_dir_6, 'fig_16_21_droplet_settling.png'))

skill_content_6 = r"""---
name: che-fluid-separators
description: >-
  Chemical engineering design skill for phase separation equipment: vertical knock-out pots,
  horizontal flash drums, Souders-Brown terminal vapor velocity, mist eliminator pads, and
  liquid-liquid gravity decanters (Stokes settling, weir design). Use when modeling, sizing,
  or visualizing phase separators in Visualcheme.
---

# Separation of Fluids (Phase Separators & Decanters)

This skill covers the thermodynamic and hydrodynamic design of gas-liquid separators and liquid-liquid decanters, based on *Chemical Engineering Design* (Chapter 16).

---

## 1. Gas-Liquid Separators (Flash Drums & Knockout Pots)

Separators allow entrained liquid droplets to disengage from vapor under gravity and momentum redirection.

![Vertical Gas-Liquid Separator](images/fig_16_14_vertical_separator.png)

![Horizontal Gas-Liquid Separator](images/fig_16_15_horizontal_separator.png)

### 1.1 Orientation Selection
* **Vertical Separators**:
  * Preferred when vapor-to-liquid volumetric ratio is high ($V/L \gg 1$), plot space is constrained, or liquid holdup is small.
  * Easy liquid level control; small footprint.
* **Horizontal Separators**:
  * Preferred when liquid load is large ($V/L < 1$), for three-phase gas-liquid-liquid separation (oil/water/gas), or when large liquid surge capacity is needed.
  * Larger gas-liquid interface area reduces entrainment.

### 1.2 Maximum Allowable Vapor Velocity (Souders-Brown Equation)
To prevent vapor from carrying entrained liquid droplets overhead:
$$v_{max} = K_{SB} \sqrt{\frac{\rho_L - \rho_V}{\rho_V}} \quad [\text{m/s}]$$
where $K_{SB}$ is the empirical Souders-Brown separation factor.

![Souders-Brown K Factor Chart](images/fig_16_16_souders_brown.png)

* **Typical $K_{SB}$ Values (for vertical vessels)**:
  * **With wire mesh mist eliminator (demister pad)**: $K_{SB} \approx 0.07 - 0.107\text{ m/s}$ ($0.23 - 0.35\text{ ft/s}$).
  * **Without demister (plain gravity settling)**: $K_{SB} \approx 0.035 - 0.06\text{ m/s}$.
  * For vacuum systems: reduce $K_{SB}$ by 20-30%.

### 1.3 Vessel Sizing Procedure (Vertical Drum)
1. **Required Cross-Sectional Area**:
   $$A_{drum} = \frac{\dot{V}_{vapor}}{0.80 \times v_{max}} \implies D_{drum} = \sqrt{\frac{4 A_{drum}}{\pi}}$$
2. **Liquid Surge & Holdup Time ($t_h$)**:
   * Minimum liquid volume: $V_L = \dot{V}_{liq} \times t_h$.
   * Typical holdup: 5 to 10 minutes (between Low Liquid Level LLL and High Liquid Level HLL).
3. **Total Height ($H$)**:
   * Minimum disengagement height above inlet nozzle: $1.0\text{ m}$ (or $D_{drum}/2$).
   * Demister pad thickness: $100 - 150\text{ mm}$ with $0.3\text{ m}$ clearance to top head.
   * Standard aspect ratio: $H/D \approx 2.5$ to $4.0$.

---

## 2. Liquid-Liquid Gravity Decanters

Used to separate two immiscible liquid phases (e.g. water and organic solvent) relying on density difference $\Delta \rho = \rho_{heavy} - \rho_{light}$.

![Horizontal Liquid-Liquid Decanter](images/fig_16_20_decanter_layout.png)

### 2.1 Terminal Droplet Settling Velocity (Stokes' Law)
Separation rate is limited by settling velocity of dispersed phase droplets (typically $d_p \ge 100 - 150\,\mu\text{m}$):
$$u_t = \frac{g d_p^2 (\rho_d - \rho_c)}{18 \mu_c}$$
(where subscript $d$ is dispersed phase, $c$ is continuous phase).

![Droplet Settling Dynamics](images/fig_16_21_droplet_settling.png)

* Maximum continuous phase velocity:
  $$u_{c} \le 0.8 u_t$$
* Required interfacial settling area:
  $$A_{interface} = \frac{\dot{V}_{continuous}}{u_t}$$

### 2.2 Decanter Hydrostatic Liquid Seal (Heavy Phase U-Tube Leg)
To maintain stable interface height $z_{interface}$:
$$\rho_L g (z_T - z_i) + \rho_H g z_i = \rho_H g z_2$$
$$z_2 = z_i + (z_T - z_i) \frac{\rho_L}{\rho_H}$$
where $z_T$ is light liquid overflow weir height, $z_2$ is heavy liquid siphon overflow height, and $z_i$ is interface level.
"""

with open(os.path.join(skill_dir_6, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_6)
print(f"Created {os.path.join(skill_dir_6, 'SKILL.md')}")

# -------------------------------------------------------------
# 7. che-distillation-columns (Chapter 17: Separation Columns)
# -------------------------------------------------------------
skill_dir_7 = os.path.join('.agents', 'skills', 'che-distillation-columns')
img_dir_7 = os.path.join(skill_dir_7, 'images')
os.makedirs(img_dir_7, exist_ok=True)

print("Extracting Chapter 17 figures...")
crop_figure(doc, 17, 1, os.path.join(img_dir_7, 'fig_17_1_distillation_layout.png'))
crop_figure(doc, 17, 2, os.path.join(img_dir_7, 'fig_17_2_stage_flows.png'))
crop_figure(doc, 17, 5, os.path.join(img_dir_7, 'fig_17_5_mccabe_thiele.png'))
crop_figure(doc, 17, 6, os.path.join(img_dir_7, 'fig_17_6_q_line_angles.png'))
crop_figure(doc, 17, 14, os.path.join(img_dir_7, 'fig_17_14_sieve_tray_layout.png'))
crop_figure(doc, 17, 18, os.path.join(img_dir_7, 'fig_17_18_flooding_correlation.png'))
crop_figure(doc, 17, 20, os.path.join(img_dir_7, 'fig_17_20_tray_operating_envelope.png'))
crop_figure(doc, 17, 37, os.path.join(img_dir_7, 'fig_17_37_packing_types.png'))
crop_figure(doc, 17, 40, os.path.join(img_dir_7, 'fig_17_40_gpdc_chart.png'))

skill_content_7 = r"""---
name: che-distillation-columns
description: >-
  Master chemical engineering skill for distillation, absorption, and stripping columns:
  McCabe-Thiele graphical method, Fenske-Underwood-Gilliland shortcut multicomponent,
  rigorous MESH tray balances, Sieve/Valve tray hydraulic rating (Fair's flooding, weeping,
  downcomer backup, tray pressure drop), and packed column sizing (GPDC, HETP). Use when
  modeling, designing, or visualizing separation columns in Visualcheme.
---

# Design of Separation Columns (Distillation & Absorption)

This skill synthesizes stage-by-stage equilibrium theory, graphical construction, hydraulic rating, and column internals design from *Chemical Engineering Design* (Chapter 17).

---

## 1. Continuous Distillation: Process Anatomy & Fundamentals

![Continuous Distillation System Layout](images/fig_17_1_distillation_layout.png)

A continuous distillation column separates a feed mixture based on differences in vapor pressure (relative volatility $\alpha_{ij} = K_i / K_j$).
* **Rectifying (Enriching) Section**: Trays above the feed tray; enriches vapor in the more volatile (light) component.
* **Stripping Section**: Trays below the feed tray; strips light components out of the descending liquid, leaving heavy bottoms.

### 1.1 Stage Material, Equilibrium, Summation, and Heat (MESH) Equations

![Stage Mass and Energy Flows](images/fig_17_2_stage_flows.png)

For stage $n$:
1. **M (Material)**: $L_{n-1} + V_{n+1} + F_n = (L_n + U_n) + (V_n + W_n)$
2. **E (Equilibrium)**: $y_{n,i} = K_{n,i} x_{n,i}$
3. **S (Summation)**: $\sum_{i=1}^C x_{n,i} = 1.0, \quad \sum_{i=1}^C y_{n,i} = 1.0$
4. **H (Heat / Enthalpy)**: $L_{n-1} h_{L,n-1} + V_{n+1} H_{V,n+1} + F_n h_{F,n} = L_n h_{L,n} + V_n H_{V,n} + Q_n$

---

## 2. Binary Distillation: The McCabe-Thiele Method

Valid under Constant Molar Overflow (CMO) assumptions: equal molar latent heats ($\lambda_A \approx \lambda_B$), negligible sensible heat changes, adiabatic shell.

![McCabe-Thiele Construction](images/fig_17_5_mccabe_thiele.png)

### 2.1 Governing Operating Lines
1. **Rectifying Operating Line (ROL)**:
   $$y = \frac{R}{R + 1} x + \frac{x_D}{R + 1}$$
   Passes through $(x_D, x_D)$ on the $45^\circ$ line with slope $\frac{L}{V} = \frac{R}{R+1}$.
2. **Stripping Operating Line (SOL)**:
   $$y = \frac{L'}{V'} x - \frac{B}{V'} x_B$$
   Passes through $(x_B, x_B)$ on the $45^\circ$ line.
3. **Feed Line ($q$-Line)**:
   $$y = \frac{q}{q - 1} x - \frac{z_F}{q - 1}$$
   where $q$ is the thermal quality of the feed:
   $$q = \frac{\text{Heat to bring 1 mole feed to saturated vapor}}{\text{Molar latent heat } \Delta H_{vap}}$$

![Feed Condition q-Line Angles](images/fig_17_6_q_line_angles.png)

* **$q$-Line Slopes by Feed Condition**:
  * Cold subcooled liquid: $q > 1$ (slope $> 0$, points up and right).
  * Saturated liquid (bubble point): $q = 1$ (vertical line $x = z_F$).
  * Partially vaporized (two-phase): $0 < q < 1$ (slope $< 0$, points up and left).
  * Saturated vapor (dew point): $q = 0$ (horizontal line $y = z_F$).
  * Superheated vapor: $q < 0$ (slope $> 0$, points down and left).

### 2.2 Key Operational Limits
* **Minimum Theoretical Stages ($N_{min}$)**: Occurs at Total Reflux ($R = \infty$), calculated by the **Fenske Equation**:
  $$N_{min} = \frac{\ln\left(\frac{x_D / (1 - x_D)}{x_B / (1 - x_B)}\right)}{\ln \alpha_{avg}}$$
* **Minimum Reflux Ratio ($R_{min}$)**: Occurs when the ROL and SOL intersect the $q$-line directly ON the VLE equilibrium curve (a "pinch point"), requiring infinite stages:
  $$\frac{R_{min}}{R_{min} + 1} = \frac{x_D - y_p}{x_D - x_p}$$
* **Economic Optimum Reflux Ratio**: Typically $R = 1.10$ to $1.30 \times R_{min}$.

---

## 3. Plate Hydraulic Design & Operating Limits

![Sieve Tray Geometry Layout](images/fig_17_14_sieve_tray_layout.png)

A sieve tray consists of:
* Active bubbling area $A_a$ with perforations ($d_h \approx 3 - 6\text{ mm}$).
* Outlet weir ($h_w \approx 40 - 50\text{ mm}$) to maintain liquid pool.
* Downcomer ($A_d \approx 10 - 15\% \text{ of } A_{col}$) for liquid disengagement.

### 3.1 Flooding Velocity (Fair's Correlation)
Flooding occurs when vapor velocity is so high that liquid droplets are entrained up to the tray above (jet flooding), or downcomer backs up:
$$u_f = C_{sb} \left(\frac{\rho_L - \rho_V}{\rho_V}\right)^{0.5} \left(\frac{\sigma}{20}\right)^{0.2} \quad [\text{m/s}]$$
where $\sigma$ is surface tension (mN/m) and $C_{sb}$ is evaluated as a function of the **Flow Parameter ($F_{LV}$)**:
$$F_{LV} = \frac{L}{V} \sqrt{\frac{\rho_V}{\rho_L}}$$

![Fair's Flooding Correlation](images/fig_17_18_flooding_correlation.png)

* **Design Velocity**: $u_{design} = (0.75 - 0.85) \times u_f$.
* **Net Vapor Area**: $A_n = A_{col} - A_d = \frac{\dot{V}_{max}}{u_{design}}$.

### 3.2 The Sieve Tray Operating Envelope

![Sieve Tray Operating Limits Envelope](images/fig_17_20_tray_operating_envelope.png)

A properly designed tray must operate safely within 4 boundaries:
1. **Jet Flooding (Upper Vapor Limit)**: Excess vapor entrains liquid up into next tray.
2. **Downcomer Backup Flooding (Liquid/Vapor Limit)**: Total head in downcomer exceeds tray spacing:
   $$h_{dc} = h_w + h_{ow} + h_t + h_{da} < 0.5 \times (\text{Tray Spacing})$$
3. **Weeping / Dumping (Lower Vapor Limit)**: Vapor velocity through holes is too low to support liquid, causing liquid to dump through perforations instead of traversing to downcomer. Weep point check:
   $$u_{hole,min} = \frac{K_2 - 0.9 (25.4 - d_h)}{\rho_V^{0.5}}$$
4. **Downcomer Choking (Upper Liquid Limit)**: Liquid velocity in downcomer exceeds disengagement capacity ($v_{dc} > 0.15\text{ m/s}$).

---

## 4. Packed Columns

Used extensively for vacuum distillation, corrosive systems, low pressure drop ($< 0.5\text{ kPa/m}$), and small diameters ($D < 1.0\text{ m}$).

![Random and Structured Packings](images/fig_17_37_packing_types.png)

### 4.1 Hydraulic Rating via GPDC
Flooding and pressure drop are evaluated via the Generalized Pressure Drop Correlation (GPDC):

![GPDC Chart for Packed Columns](images/fig_17_40_gpdc_chart.png)

* **Height Equivalent to a Theoretical Plate (HETP)**:
  $$Z = N_{theoretical} \times \text{HETP}$$
  * Typical structured packing: $\text{HETP} = 0.3 - 0.5\text{ m}$.
  * Typical random packing (50mm Pall rings): $\text{HETP} = 0.6 - 0.9\text{ m}$.

---

## 5. Visualcheme Didactic Architecture

* **Synchronized Views**:
  * Stepping off McCabe-Thiele stages in real time as the user drags the reflux ratio $R$ or feed quality $q$.
  * Visualizing the column cross-section with real-time particle animation: vapor bubbles through froth, liquid cascading down weirs.
  * Real-time Flooding / Weeping Operating Point indicator on the hydraulic envelope.
"""

with open(os.path.join(skill_dir_7, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_7)
print(f"Created {os.path.join(skill_dir_7, 'SKILL.md')}")

print("Batch 2 completed successfully!")
