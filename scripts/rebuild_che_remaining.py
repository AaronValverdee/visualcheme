import sys, pymupdf, os
sys.path.append('scripts')
from extract_helpers import crop_equation, crop_figure, crop_table

doc = pymupdf.open('Chemical Engineering Design, Principles, Second Edition.pdf')

# =============================================================
# 8. che-solids-handling (Chapter 18: pages 946-1054)
# =============================================================
out_dir_18 = '.agents/skills/che-solids-handling/images'
os.makedirs(out_dir_18, exist_ok=True)
print("Extracting Chapter 18 equations & figures...")
for n in [1, 2, 3, 4, 5, 10, 15, 16, 17, 18, 19, 20, 25, 26, 27, 28, 30, 35]:
    crop_equation(doc, 18, n, os.path.join(out_dir_18, f'eq_18_{n}.png'))
for f in [27, 28, 35, 47]:
    crop_figure(doc, 18, f, os.path.join(out_dir_18, f'fig_18_{f}.png'))

content_18 = r"""---
name: che-solids-handling
description: >-
  Chemical engineering guide to particulate solids processing: gas-solids cyclones
  (Lapple design, cut diameter d_50, pressure drop), solid-liquid filtration (cake resistance,
  rotary drum vacuum filters), and drying operations (rotary dryers, drying rate curves).
  Use when modeling or visualizing particulate and solids unit operations in Visualcheme.
---

# Specification and Design of Solids-Handling Equipment

This skill provides an authoritative, detailed, textbook-grounded reference on particulate characterization, cyclone separation, cake filtration, and industrial drying, based directly on Chapter 18 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 946–1054).

---

## 1. Particle Characterization & Bulk Solids Properties

Particulate solids are characterized by particle size distribution (PSD), shape factor (sphericity $\phi_s$), and porosity.

### 1.1 Sauter Mean Diameter ($d_{32}$)
The volume-to-surface mean diameter, critical for fluidization and mass/heat transfer:
$$d_{32} = \frac{\sum n_i d_i^3}{\sum n_i d_i^2} = \frac{1}{\sum (w_i / d_i)}$$
where $w_i$ is the mass fraction of particles in size interval $d_i$.

---

## 2. Gas-Solids Separation: Reverse-Flow Cyclones

Cyclones separate solid particles from a gas stream using centrifugal force created by tangential gas entry into a cylindrical/conical body.

![Standard Cyclone Geometry](images/fig_18_27.png)

### 2.1 Standard Lapple Proportions (Reference: Barrel Diameter $D_c$)
The standard high-efficiency Lapple design dimensions:
* Inlet height: $a = D_c / 2 = 0.5 D_c$
* Inlet width: $b = D_c / 4 = 0.25 D_c$
* Gas vortex finder outlet diameter: $D_e = D_c / 2 = 0.5 D_c$
* Vortex finder length: $S = D_c / 2 = 0.5 D_c$
* Cylindrical barrel height: $h = 2.0 D_c$
* Conical section height: $z = 2.0 D_c$
* Total cyclone height: $H = h + z = 4.0 D_c$
* Dust discharge diameter: $B = D_c / 4 = 0.25 D_c$

### 2.2 Cut Diameter ($d_{50}$ or $d_{pc}$)
The cut diameter is the particle size collected with exactly $50\%$ efficiency:

![Equation 18.15](images/eq_18_15.png)

![Equation 18.16](images/eq_18_16.png)

$$d_{pc} = \sqrt{\frac{9 \mu b}{2 \pi N_e v_{in} (\rho_p - \rho_g)}}$$
$$\text{Where:}$$
* $\mu$ = Gas dynamic viscosity ($\text{Pa}\cdot\text{s}$)
* $b$ = Inlet width ($D_c / 4$, m)
* $v_{in}$ = Inlet gas velocity ($15 - 25\text{ m/s}$)
* $\rho_p, \rho_g$ = Densities of particle and gas ($\text{kg/m}^3$)
* $N_e$ = Number of effective gas spiral revolutions inside cyclone ($N_e \approx 5$ for Lapple design)

![Cyclone Collection Efficiency Curve](images/fig_18_28.png)

* **Grade Efficiency Curve ($\eta_i$)**:
  $$\eta_i = \frac{1}{1 + (d_{pc} / d_i)^2}$$
  Particles with $d_i \ge 2 d_{pc}$ are captured with $> 80\%$ efficiency; particles with $d_i \ge 5 d_{pc}$ with $> 96\%$ efficiency.

### 2.3 Cyclone Pressure Drop
Pressure drop across a cyclone is proportional to inlet velocity head:

![Equation 18.17](images/eq_18_17.png)

![Equation 18.18](images/eq_18_18.png)

$$\Delta P = \frac{1}{2} \rho_g v_{in}^2 N_H$$
where $N_H$ is the number of inlet velocity heads:
$$N_H = K \frac{a b}{D_e^2} \approx 16 \frac{(0.5 D_c)(0.25 D_c)}{(0.5 D_c)^2} \approx 8.0$$
* Typical pressure drop: $\Delta P = 0.5\text{ to } 2.5\text{ kPa}$ ($2 - 10\text{ in. } H_2O$).

---

## 3. Solid-Liquid Filtration

Separates insoluble solid particles from a liquid slurry by passing the suspension through a porous filter medium that retains solids as a "cake".

![Rotary Drum Vacuum Filter](images/fig_18_35.png)

### 3.1 Fundamental Filtration Theory (The Ruth Equation)

![Equation 18.25](images/eq_18_25.png)

![Equation 18.26](images/eq_18_26.png)

![Equation 18.27](images/eq_18_27.png)

The rate of filtrate flow through the cake and filter medium:
$$\frac{dV}{dt} = \frac{A \Delta P}{\mu (R_c + R_m)} = \frac{A^2 \Delta P}{\mu (r c V + A R_m)}$$
In linearized form for constant pressure ($\Delta P = \text{const}$):
$$\frac{dt}{dV} = \left(\frac{\mu r c}{A^2 \Delta P}\right) V + \frac{\mu R_m}{A \Delta P}$$
Plotting $\frac{dt}{dV}$ versus filtrate volume $V$ yields a straight line with:
$$\text{Slope } K_p = \frac{\mu r c}{A^2 \Delta P} \implies \text{Specific Cake Resistance } r$$
$$\text{Intercept } B = \frac{\mu R_m}{A \Delta P} \implies \text{Medium Resistance } R_m$$

### 3.2 Rotary Drum Vacuum Filters (Continuous)
* A horizontal drum rotates through an agitated slurry trough under vacuum ($40 - 80\text{ kPa}$ differential).
* Cycle is divided into 4 sequential zones:
  1. **Cake Formation**: Drum submerged ($30 - 40\%$ of circumference); vacuum draws filtrate into internal manifold, depositing cake.
  2. **Cake Washing**: Wash liquor sprayed to displace mother liquor without cake disturbance.
  3. **Drying / Dewatering**: Air drawn through cake reduces moisture content.
  4. **Cake Discharge**: Doctor blade, string discharge, or air blowback removes cake continuously.

---

## 4. Industrial Drying

Thermal removal of volatile liquid (typically water or solvent) from wet solids.

![Direct-Heat Rotary Dryer](images/fig_18_47.png)

### 4.1 Drying Kinetics: Two Classical Regimes
1. **Constant Rate Period**:
   * The solid surface is covered with a continuous film of free liquid.
   * Evaporation rate is governed purely by gas-phase boundary layer heat and mass transfer:
     $$R_c = \frac{h (T_g - T_s)}{\Delta H_{vap}} = k_y (Y_s - Y_g)$$
   * Surface temperature $T_s$ remains at the adiabatic wet-bulb temperature.
2. **Falling Rate Period**:
   * Surface liquid depletes at the **Critical Moisture Content ($X_c$)**.
   * Drying rate is limited by internal liquid diffusion through particle pores. Surface temperature rises toward the gas temperature.
"""
with open(os.path.join('.agents', 'skills', 'che-solids-handling', 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(content_18)
print("Rebuilt che-solids-handling.")


# =============================================================
# 9. che-heat-exchangers (Chapter 19: pages 1056-1210)
# =============================================================
out_dir_19 = '.agents/skills/che-heat-exchangers/images'
os.makedirs(out_dir_19, exist_ok=True)
print("Extracting Chapter 19 equations & figures...")
for n in [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 35, 40, 45, 50, 55, 60, 65]:
    crop_equation(doc, 19, n, os.path.join(out_dir_19, f'eq_19_{n}.png'))
for f in [1, 4, 8, 13, 23, 34, 35, 42]:
    crop_figure(doc, 19, f, os.path.join(out_dir_19, f'fig_19_{f}.png'))

content_19 = r"""---
name: che-heat-exchangers
description: >-
  Master chemical engineering skill for thermal and hydraulic design of heat transfer equipment:
  Shell and Tube exchangers (TEMA standards, LMTD, F_T correction), tube-side and shell-side rating
  (Kern's method, Bell-Delaware method), reboilers (Kettle, Thermosiphon), condensers, and plate
  heat exchangers. Use when modeling, designing, or visualizing heat exchangers in Visualcheme.
---

# Heat-Transfer Equipment Design

This skill provides an authoritative, detailed, textbook-grounded reference on thermal sizing, geometry configuration, Kern shortcut rating, Bell-Delaware rigorous stream analysis, condensers, reboilers, and plate heat exchangers, based directly on Chapter 19 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 1056–1210).

---

## 1. Overall Heat-Transfer Equation & Thermal Sizing

The basic design equation for heat transfer equipment:

![Equation 19.1](images/eq_19_1.png)

$$Q = U \cdot A \cdot \Delta T_m = U \cdot A \cdot (F_T \cdot \Delta T_{lm})$$
where:
* $Q$ = Total heat duty ($\text{W}$)
* $U$ = Overall heat-transfer coefficient ($\text{W}/\text{m}^2\cdot\text{K}$)
* $A$ = Heat transfer area based on outside tube surface ($\text{m}^2$)
* $\Delta T_{lm}$ = Log Mean Temperature Difference for pure countercurrent flow
* $F_T$ = Temperature cross correction factor ($F_T \le 1.0$)

### 1.1 Overall Heat-Transfer Coefficient ($U_o$) Formulation

![Equation 19.2](images/eq_19_2.png)

![Equation 19.3](images/eq_19_3.png)

$$\frac{1}{U_o} = \frac{1}{h_o} + R_{fo} + \frac{d_o \ln(d_o / d_i)}{2 k_w} + \left(\frac{d_o}{d_i}\right) R_{fi} + \left(\frac{d_o}{d_i}\right) \frac{1}{h_i}$$
$$\text{Where:}$$
* $h_o, h_i$ = Shell-side and tube-side fluid film coefficients ($\text{W}/\text{m}^2\cdot\text{K}$)
* $R_{fo}, R_{fi}$ = Shell-side and tube-side fouling resistances ($\text{m}^2\cdot\text{K}/\text{W}$)
* $d_o, d_i$ = Outside and inside tube diameters ($\text{m}$)
* $k_w$ = Thermal conductivity of tube wall metal ($\text{W}/\text{m}\cdot\text{K}$)

---

### 1.2 Log Mean Temperature Difference & $F_T$ Correction Factor

![Equation 19.4](images/eq_19_4.png)

![Equation 19.5](images/eq_19_5.png)

$$\Delta T_{lm} = \frac{(T_1 - t_2) - (T_2 - t_1)}{\ln\left[ \frac{T_1 - t_2}{T_2 - t_1} \right]}$$
For multipass shell-and-tube exchangers (e.g. 1-2 exchanger: 1 shell pass, 2 tube passes), the true mean temperature difference is corrected by $F_T$:

![FT Temperature Correction Factor](images/fig_19_13.png)

* Dimensionless temperature parameters:
  $$R = \frac{T_1 - T_2}{t_2 - t_1} = \frac{(m C_p)_{cold}}{(m C_p)_{hot}}, \quad P = \frac{t_2 - t_1}{T_1 - t_1}$$
* **Critical Design Constraint**: Never specify an exchanger with $F_T < 0.75$. If $F_T < 0.75$, temperature cross occurs; the design must use multiple shells in series (e.g. two 1-2 shells in series).

---

## 2. Shell-and-Tube Construction & TEMA Standards

![TEMA Exchanger Designations](images/fig_19_1.png)

![Shell and Tube Construction Cutaway](images/fig_19_4.png)

### 2.1 TEMA 3-Letter Designation
Identifies stationary front head, shell type, and rear head (e.g., **AES**, **BEM**, **AEL**):
* **Front Head**: **A** (channel with removable cover, standard), **B** (bonnet welded cover, cheap, high pressure).
* **Shell Type**: **E** (one-pass shell, most common), **F** (two-pass shell with longitudinal baffle), **J** (divided flow), **K** (kettle reboiler).
* **Rear Head**: **S** (floating head with backing device, allows thermal expansion and tube bundle removal), **U** (U-tube bundle, cheap thermal expansion, cannot rod tubes mechanically), **M** (fixed tubesheet, low cost, cannot handle differential thermal expansion $> 50^\circ\text{C}$ without expansion joint).

### 2.2 Tube Layout & Pitch
* **Triangular Pitch ($30^\circ \text{ or } 60^\circ$)**: $p_t = 1.25 d_o$. Maximum tube density (highest $A$ per shell volume); higher heat transfer coefficient. Cleaned chemically.
* **Square Pitch ($90^\circ \text{ or } 45^\circ$)**: Continuous cleaning lanes ($> 6.35\text{ mm}$ clearance). Mandatory when shell-side fluid fouls heavily, requiring mechanical rodding or hydroblasting.

---

## 3. Tube-Side Heat Transfer & Pressure Drop

For fluid flowing inside tubes of inside diameter $d_i$:
$$Re_t = \frac{\rho v_t d_i}{\mu}, \quad Pr = \frac{C_p \mu}{k}$$

![Equation 19.8](images/eq_19_8.png)

![Equation 19.9](images/eq_19_9.png)

![Equation 19.10](images/eq_19_10.png)

### 3.1 Sieder-Tate Correlation (Turbulent Flow $Re_t > 10,000$)
$$Nu_t = \frac{h_i d_i}{k} = 0.027 Re_t^{0.8} Pr^{0.33} \left(\frac{\mu}{\mu_w}\right)^{0.14}$$

### 3.2 Tube-Side Pressure Drop
$$\Delta P_t = N_p \left[ 8 j_f \left(\frac{L}{d_i}\right) \left(\frac{\rho v_t^2}{2}\right) + 2.5 \left(\frac{\rho v_t^2}{2}\right) \right] \left(\frac{\mu}{\mu_w}\right)^{-0.14}$$
where $N_p$ is number of tube passes, and the second term accounts for nozzle and turnaround losses ($2.5$ velocity heads per pass).

---

## 4. Shell-Side Rating: Kern's Method

![Kern Baffle Flow Patterns](images/fig_19_8.png)

### 4.1 Geometric Parameters

![Equation 19.11](images/eq_19_11.png)

![Equation 19.12](images/eq_19_12.png)

1. **Cross-Flow Area ($A_s$)**:
   $$A_s = \frac{(p_t - d_o) D_s B}{p_t}$$
   where $D_s$ is shell inside diameter and $B$ is baffle pitch ($B \approx 0.2 - 0.5 D_s$).
2. **Equivalent Diameter ($d_e$)**:
   * For triangular pitch ($30^\circ$):
     $$d_e = \frac{1.10}{d_o} (p_t^2 - 0.917 d_o^2)$$
   * For square pitch ($90^\circ$):
     $$d_e = \frac{1.27}{d_o} (p_t^2 - 0.785 d_o^2)$$

### 4.2 Shell-Side Heat Transfer & Pressure Drop

![Equation 19.13](images/eq_19_13.png)

![Equation 19.14](images/eq_19_14.png)

![Equation 19.15](images/eq_19_15.png)

* **Shell-Side Reynolds Number**: $Re_s = \frac{\rho v_s d_e}{\mu}$
* **Kern Nusselt Correlation**:
  $$\frac{h_o d_e}{k} = 0.36 Re_s^{0.55} Pr^{0.33} \left(\frac{\mu}{\mu_w}\right)^{0.14}$$
* **Kern Pressure Drop**:
  $$\Delta P_s = 8 j_f \left(\frac{D_s}{d_e}\right) \left(\frac{L}{B}\right) \left(\frac{\rho v_s^2}{2}\right) \left(\frac{\mu}{\mu_w}\right)^{-0.14}$$

---

## 5. The Bell-Delaware Rigorous Method

Kern's method assumes pure cross-flow and neglects clearances. The **Bell-Delaware Method** calculates real heat transfer and pressure drop by modeling the 5 distinct shell leakage and bypass streams:

![Bell-Delaware Stream Analysis](images/fig_19_23.png)

* **Stream A**: Leakage through tube-to-baffle hole clearances.
* **Stream B**: True cross-flow across the tube bundle (effective heat transfer).
* **Stream C**: Bundle-to-shell bypass stream through clearance lanes.
* **Stream E**: Baffle-to-shell leakage stream (major cold bypass).
* **Stream F**: Bypass through pass-partition lanes.
* **Actual Shell Heat Transfer Coefficient**:
  $$h_o = h_{ideal} \times J_c \times J_l \times J_b \times J_s \times J_r$$
  where $J_c$ is baffle cut correction ($0.8 - 1.15$), $J_l$ is baffle leakage factor ($0.7 - 0.8$), $J_b$ is bundle bypass factor ($0.7 - 0.9$), and $J_s$ is baffle spacing gradient factor.

---

## 6. Reboilers & Plate Heat Exchangers

![Kettle Reboiler Geometry](images/fig_19_34.png)

![Vertical Thermosiphon Reboiler](images/fig_19_35.png)

![Plate Heat Exchanger Corrugated Chevrons](images/fig_19_42.png)

### 6.1 Kettle Reboilers
* Tube bundle submerged in an enlarged shell (vapor space diameter $D_{shell} \approx 1.5 - 2.0 D_{bundle}$).
* Overflow weir separates the boiling pool from the bottoms product surge compartment.
* Acts as one theoretical equilibrium stage.
* Sizing limit: Maximum heat flux must stay well below Critical Heat Flux (CHF / pool boiling burnout):
  $$q_{max} \approx 0.18 \Delta H_{vap} \rho_V^{0.5} [g \sigma (\rho_L - \rho_V)]^{0.25}$$

### 6.2 Vertical Thermosiphon Reboilers
* Natural circulation driven by hydrostatic density difference between liquid in the column sump and the boiling two-phase mixture inside the vertical tubes:
  $$\rho_L g H_{sump} > \bar{\rho}_{two-phase} g H_{tubes} + \Delta P_{friction}$$
* High circulation rates ($3:1$ to $10:1$ liquid-to-vapor ratio) wash tube surfaces and prevent fouling.
"""
with open(os.path.join('.agents', 'skills', 'che-heat-exchangers', 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(content_19)
print("Rebuilt che-heat-exchangers.")


# =============================================================
# 10. che-fluid-transport-piping (Chapter 20: pages 1216-1272)
# =============================================================
out_dir_20 = '.agents/skills/che-fluid-transport-piping/images'
os.makedirs(out_dir_20, exist_ok=True)
print("Extracting Chapter 20 equations & figures...")
for n in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]:
    crop_equation(doc, 20, n, os.path.join(out_dir_20, f'eq_20_{n}.png'))
for f in [1, 3, 10, 11, 20]:
    crop_figure(doc, 20, f, os.path.join(out_dir_20, f'fig_20_{f}.png'))

content_20 = r"""---
name: che-fluid-transport-piping
description: >-
  Master chemical engineering skill for fluid flow in pipes, pressure drop (Darcy-Weisbach,
  Moody diagram, Colebrook-White), economic pipe diameter selection, centrifugal pump rating
  (head-capacity curves, system resistance, NPSH, cavitation prevention), and gas compression.
  Use when modeling, designing, or visualizing piping and fluid transport units in Visualcheme.
---

# Transport and Storage of Fluids (Piping, Pumps & Compressors)

This skill provides an authoritative, detailed, textbook-grounded reference on fluid flow in pipes, frictional pressure drop, economic pipe sizing, centrifugal pumps, cavitation prevention (NPSH), and gas compressors, based directly on Chapter 20 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 1216–1272).

---

## 1. Pipeline Fluid Dynamics & Frictional Pressure Drop

![Velocity Profiles in Pipes](images/fig_20_1.png)

### 1.1 The Darcy-Weisbach Equation
The fundamental equation for pressure loss due to wall friction in circular pipes of diameter $D$ and length $L$:

![Equation 20.1](images/eq_20_1.png)

![Equation 20.2](images/eq_20_2.png)

$$\Delta P_f = f \left(\frac{L}{D}\right) \left(\frac{\rho v^2}{2}\right) \quad [\text{Pa}]$$
In terms of frictional head loss $h_f$:
$$h_f = \frac{\Delta P_f}{\rho g} = f \left(\frac{L}{D}\right) \left(\frac{v^2}{2g}\right) \quad [\text{m}]$$
*(Note: $f$ is the Darcy-Weisbach friction factor; the Fanning friction factor is $f_{Fanning} = f / 4$)*.

---

### 1.2 The Moody Diagram & Friction Factor Formulations

![The Moody Diagram](images/fig_20_3.png)

#### 1.2.1 Laminar Flow ($Re < 2100$)

![Equation 20.3](images/eq_20_3.png)

$$f = \frac{64}{Re}$$
Flow is governed strictly by viscous shear; wall roughness $\varepsilon$ has zero effect.

#### 1.2.2 Turbulent Flow ($Re > 4000$)

![Equation 20.4](images/eq_20_4.png)

![Equation 20.5](images/eq_20_5.png)

* **Colebrook-White Equation (Implicit Standard)**:
  $$\frac{1}{\sqrt{f}} = -2.0 \log_{10}\left( \frac{\varepsilon / D}{3.7} + \frac{2.51}{Re \sqrt{f}} \right)$$
* **Swamee-Jain Equation (Explicit, $< 1\%$ Error)**:
  $$f = \frac{0.25}{\left[ \log_{10}\left( \frac{\varepsilon / D}{3.7} + \frac{5.74}{Re^{0.9}} \right) \right]^2}$$
* **Churchill Correlation (Continuous Across All Regimes)**:
  Valid seamlessly across laminar, transition, and fully rough turbulent flow:
  $$f = 8 \left[ \left(\frac{8}{Re}\right)^{12} + \frac{1}{(A + B)^{1.5}} \right]^{1/12}$$
  $$A = \left[ 2.457 \ln\left( \frac{1}{(7/Re)^{0.9} + 0.27 (\varepsilon / D)} \right) \right]^{16}, \quad B = \left( \frac{37530}{Re} \right)^{16}$$

---

### 1.3 Minor Losses in Fittings and Valves

![Equation 20.6](images/eq_20_6.png)

![Equation 20.7](images/eq_20_7.png)

$$\Delta P_{minor} = \sum K \left(\frac{\rho v^2}{2}\right) \quad \text{or} \quad L_{equiv} = \sum \left(\frac{K \cdot D}{f}\right)$$
* Standard $90^\circ$ elbow: $K \approx 0.75$
* Long radius $90^\circ$ elbow: $K \approx 0.45$
* Tee (through flow): $K \approx 0.35$; (branch flow): $K \approx 1.5$
* Gate valve (wide open): $K \approx 0.17$; (half open): $K \approx 4.5$
* Globe valve (wide open): $K \approx 6.0$
* Swing check valve: $K \approx 2.0$

---

## 2. Economic Pipe Diameter Selection

Optimal pipe diameter balances annualized capital cost (piping, fittings, valves, installation) against lifetime operating cost (pumping electricity).

### 2.1 Velocity Rules of Thumb

| Service | Recommended Velocity ($v$) | Allowable $\Delta P / L$ |
| :--- | :--- | :--- |
| **Pump Suction (Liquids)** | $0.5 - 1.2\text{ m/s}$ ($1.5 - 4\text{ ft/s}$) | $10 - 20\text{ kPa}/100\text{m}$ ($0.1 - 0.2\text{ bar/km}$) |
| **Pump Discharge (Liquids)**| $1.2 - 2.5\text{ m/s}$ ($4 - 8\text{ ft/s}$) | $50 - 150\text{ kPa}/100\text{m}$ ($0.5 - 1.5\text{ bar/km}$) |
| **Gases (Moderate Pressure)**| $15 - 30\text{ m/s}$ ($50 - 100\text{ ft/s}$) | $10 - 50\text{ kPa}/100\text{m}$ |
| **Vacuum Vapors** | $30 - 75\text{ m/s}$ | Minimize $\Delta P$ ($< 5\text{ kPa}/100\text{m}$) |
| **High-Pressure Steam** | $25 - 40\text{ m/s}$ | $20 - 50\text{ kPa}/100\text{m}$ |

---

## 3. Centrifugal Pumps & System Hydraulics

![Centrifugal Pump and System Head Curves](images/fig_20_10.png)

### 3.1 Operating Point Determination
* **System Head Curve ($H_{sys}$)**:
  $$H_{sys}(Q) = \Delta z + \frac{\Delta P_{static}}{\rho g} + k Q^2$$
  where $\Delta z$ is static elevation rise, $\Delta P_{static}$ is differential vessel pressure, and $k Q^2$ represents frictional head losses in piping and fittings.
* **Operating Point**: The intersection where the pump manufacturer's $H-Q$ curve meets the process $H_{sys}(Q)$ curve.
* **Brake Horsepower (BHP / Shaft Power)**:

![Equation 20.10](images/eq_20_10.png)

![Equation 20.11](images/eq_20_11.png)

$$P_{shaft} = \frac{\rho g Q H}{\eta_{pump}}$$

---

### 3.2 Net Positive Suction Head (NPSH) & Cavitation

![NPSH and Cavitation Mechanics](images/fig_20_11.png)

Cavitation occurs when local static pressure at the pump impeller blade suction drops below liquid vapor pressure ($P_{vap}$), causing vapor bubbles to nucleate and collapse violently against metal surfaces.

* **Available NPSH ($NPSH_A$)**:

![Equation 20.12](images/eq_20_12.png)

![Equation 20.13](images/eq_20_13.png)

$$NPSH_A = \frac{P_{suction} - P_{vap}}{\rho g} + \frac{v_s^2}{2g} = \frac{P_{vessel} - P_{vap}}{\rho g} \pm z_s - h_{f,suction}$$
* **Design Rule**:
  $$NPSH_A \ge NPSH_R + 0.5\text{ m} \quad (\text{or } 1.5\text{ ft safety margin})$$

### 3.3 Pump Affinity Laws
* Flowrate: $\frac{Q_1}{Q_2} = \frac{N_1}{N_2} = \frac{D_1}{D_2}$
* Head: $\frac{H_1}{H_2} = \left(\frac{N_1}{N_2}\right)^2 = \left(\frac{D_1}{D_2}\right)^2$
* Power: $\frac{P_1}{P_2} = \left(\frac{N_1}{N_2}\right)^3 = \left(\frac{D_1}{D_2}\right)^3$

---

## 4. Gas Compression

![Multistage Gas Compression with Intercooling](images/fig_20_20.png)

### 4.1 Isentropic Work and Discharge Temperature

![Equation 20.20](images/eq_20_20.png)

![Equation 20.21](images/eq_20_21.png)

![Equation 20.22](images/eq_20_22.png)

* **Isentropic Work for Ideal Gas**:
  $$W_{is} = \dot{m} \left(\frac{\gamma}{\gamma - 1}\right) R T_1 \left[ \left(\frac{P_2}{P_1}\right)^{\frac{\gamma - 1}{\gamma}} - 1 \right]$$
* **Discharge Temperature**:
  $$T_2 = T_1 \left(\frac{P_2}{P_1}\right)^{\frac{\gamma - 1}{\gamma}}$$
* **Shaft Power**: $P_{shaft} = \frac{W_{is}}{\eta_{is}}$.

### 4.2 Multistage Compression Heuristics
* Limit stage compression ratio: $r_p = P_{out} / P_{in} \le 3.5 - 4.0$.
* Limit stage discharge temperature: $T_{dis} \le 150 - 160^\circ\text{C}$ (to prevent lube oil carbonization and thermal seal breakdown).
* If total pressure ratio $> 4.0$, split into $N$ equal stages ($r_{p,stage} = (P_{final} / P_{initial})^{1/N}$) with intercoolers and knockout drums between stages.
"""
with open(os.path.join('.agents', 'skills', 'che-fluid-transport-piping', 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(content_20)
print("Rebuilt che-fluid-transport-piping.")

print("All remaining skills rebuilt successfully!")
