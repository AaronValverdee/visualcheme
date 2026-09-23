import pymupdf
import os
from extract_helpers import crop_figure

doc = pymupdf.open('Chemical Engineering Design, Principles, Second Edition.pdf')

# -------------------------------------------------------------
# 8. che-solids-handling (Chapter 18: Solids-Handling Equipment)
# -------------------------------------------------------------
skill_dir_8 = os.path.join('.agents', 'skills', 'che-solids-handling')
img_dir_8 = os.path.join(skill_dir_8, 'images')
os.makedirs(img_dir_8, exist_ok=True)

print("Extracting Chapter 18 figures...")
crop_figure(doc, 18, 27, os.path.join(img_dir_8, 'fig_18_27_cyclone_geometry.png'))
crop_figure(doc, 18, 28, os.path.join(img_dir_8, 'fig_18_28_cyclone_efficiency.png'))
crop_figure(doc, 18, 35, os.path.join(img_dir_8, 'fig_18_35_rotary_filter.png'))
crop_figure(doc, 18, 47, os.path.join(img_dir_8, 'fig_18_47_rotary_dryer.png'))

skill_content_8 = r"""---
name: che-solids-handling
description: >-
  Chemical engineering guide to particulate solids processing: gas-solids cyclones
  (Lapple design, cut diameter d_50, pressure drop), solid-liquid filtration (cake resistance,
  rotary drum vacuum filters), and drying operations (rotary dryers, drying rate curves).
  Use when modeling or visualizing particulate and solids unit operations in Visualcheme.
---

# Specification and Design of Solids-Handling Equipment

This skill covers particle characterization, gas-solids separation, liquid filtration, and drying, based on *Chemical Engineering Design* (Chapter 18).

---

## 1. Gas-Solids Separation: Cyclone Separators

Cyclones use centrifugal force to separate dust, catalyst fines, or solid particulates from gas streams without moving parts.

![Standard Cyclone Geometry](images/fig_18_27_cyclone_geometry.png)

### 1.1 Standard Lapple Proportions (Reference: Barrel Diameter $D_c$)
* Inlet height: $a = D_c / 2$
* Inlet width: $b = D_c / 4$
* Gas exit duct diameter: $D_e = D_c / 2$
* Cylinder (barrel) height: $h = 2 D_c$
* Total cyclone height: $H = 4 D_c$
* Dust discharge outlet: $B = D_c / 4$

### 1.2 Cut Diameter ($d_{50}$ or $d_{pc}$)
The particle size collected with exactly 50% efficiency:
$$d_{pc} = \sqrt{\frac{9 \mu b}{2 \pi N_e v_{in} (\rho_p - \rho_g)}}$$
where $v_{in}$ is inlet gas velocity ($15 - 25\text{ m/s}$), and $N_e$ is effective number of spiral turns (typically $N_e \approx 5$).

![Cyclone Collection Efficiency Curve](images/fig_18_28_cyclone_efficiency.png)

### 1.3 Cyclone Pressure Drop
$$\Delta P = \frac{1}{2} \rho_g v_{in}^2 N_H$$
where $N_H$ is the number of inlet velocity heads ($N_H \approx 16 \frac{a b}{D_e^2} \approx 8$ for standard Lapple design). Typical $\Delta P = 0.5 - 2.5\text{ kPa}$.

---

## 2. Solid-Liquid Filtration

Separates insoluble solids from liquid slurry via a porous filter medium.

![Rotary Drum Vacuum Filter](images/fig_18_35_rotary_filter.png)

### 2.1 Fundamental Filtration Equation (Ruth Equation)
$$\frac{dt}{dV} = \frac{\mu r c}{A^2 \Delta P} V + \frac{\mu R_m}{A \Delta P}$$
where:
* $V$ = filtrate volume collected in time $t$
* $A$ = filter surface area
* $\Delta P$ = pressure drop across filter cake and medium
* $r$ = specific cake resistance ($\text{m/kg}$)
* $R_m$ = filter medium resistance ($\text{m}^{-1}$)
* $c$ = slurry mass concentration of dry cake per unit filtrate ($\text{kg/m}^3$)

### 2.2 Continuous Rotary Drum Vacuum Filters
* Operates continuously with cycle zones:
  1. **Cake Formation**: Drum submerged in slurry trough under vacuum (30-40% of cycle).
  2. **Cake Washing**: Wash liquor sprayed to displace mother liquor.
  3. **Dewatering / Drying**: Air drawn through cake to reduce residual moisture.
  4. **Cake Discharge**: Doctor blade or air blowback removes cake.

---

## 3. Industrial Drying

Drying removes volatile liquid from wet solids via thermal vaporization.

![Direct-Heat Rotary Dryer](images/fig_18_47_rotary_dryer.png)

* **Drying Rate Periods**:
  1. **Constant Rate Period**: Surface is saturated with free moisture; rate is governed purely by heat and mass transfer through the gas boundary layer.
  2. **Falling Rate Period**: Moisture must diffuse internally from particle pores to surface; drying rate drops rapidly until equilibrium moisture content is reached.
"""

with open(os.path.join(skill_dir_8, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_8)
print(f"Created {os.path.join(skill_dir_8, 'SKILL.md')}")

# -------------------------------------------------------------
# 9. che-heat-exchangers (Chapter 19: Heat-Transfer Equipment)
# -------------------------------------------------------------
skill_dir_9 = os.path.join('.agents', 'skills', 'che-heat-exchangers')
img_dir_9 = os.path.join(skill_dir_9, 'images')
os.makedirs(img_dir_9, exist_ok=True)

print("Extracting Chapter 19 figures...")
crop_figure(doc, 19, 1, os.path.join(img_dir_9, 'fig_19_1_tema_types.png'))
crop_figure(doc, 19, 4, os.path.join(img_dir_9, 'fig_19_4_st_construction.png'))
crop_figure(doc, 19, 8, os.path.join(img_dir_9, 'fig_19_8_kern_baffles.png'))
crop_figure(doc, 19, 13, os.path.join(img_dir_9, 'fig_19_13_ft_correction.png'))
crop_figure(doc, 19, 23, os.path.join(img_dir_9, 'fig_19_23_bell_delaware.png'))
crop_figure(doc, 19, 34, os.path.join(img_dir_9, 'fig_19_34_kettle_reboiler.png'))
crop_figure(doc, 19, 35, os.path.join(img_dir_9, 'fig_19_35_thermosiphon.png'))
crop_figure(doc, 19, 42, os.path.join(img_dir_9, 'fig_19_42_plate_heat_exchanger.png'))

skill_content_9 = r"""---
name: che-heat-exchangers
description: >-
  Master chemical engineering skill for thermal and hydraulic design of heat transfer equipment:
  Shell and Tube exchangers (TEMA standards, LMTD, F_T correction), tube-side and shell-side rating
  (Kern's method, Bell-Delaware method), reboilers (Kettle, Thermosiphon), condensers, and plate
  heat exchangers. Use when modeling, designing, or visualizing heat exchangers in Visualcheme.
---

# Heat-Transfer Equipment Design

This skill synthesizes thermal sizing, geometry selection, fluid allocation, and pressure drop rating for industrial heat exchangers, based on *Chemical Engineering Design* (Chapter 19).

---

## 1. Overall Heat-Transfer Equation & Thermal Sizing

The basic design equation for any recuperative heat exchanger:
$$Q = U \cdot A \cdot \Delta T_m = U \cdot A \cdot (F_T \cdot \Delta T_{lm})$$
where:
* $Q$ = heat duty (W)
* $U$ = overall heat-transfer coefficient ($\text{W}/\text{m}^2\cdot\text{K}$)
* $A$ = outside heat transfer surface area ($\text{m}^2$)
* $\Delta T_{lm}$ = Log Mean Temperature Difference for counter-current flow
* $F_T$ = temperature cross correction factor ($F_T \le 1.0$)

### 1.1 Overall Heat Transfer Coefficient Formulation
$$\frac{1}{U_o} = \frac{1}{h_o} + R_{fo} + \frac{d_o \ln(d_o / d_i)}{2 k_w} + \left(\frac{d_o}{d_i}\right) R_{fi} + \left(\frac{d_o}{d_i}\right) \frac{1}{h_i}$$
where $h_o, h_i$ are shell and tube film coefficients, $R_{fo}, R_{fi}$ are fouling resistances, and $k_w$ is tube wall thermal conductivity.

### 1.2 Log Mean Temperature Difference & $F_T$ Factor
$$\Delta T_{lm} = \frac{(T_1 - t_2) - (T_2 - t_1)}{\ln\left(\frac{T_1 - t_2}{T_2 - t_1}\right)}$$
(where $T_1, T_2$ are hot stream inlet/outlet; $t_1, t_2$ are cold stream inlet/outlet).

![FT Temperature Correction Factor](images/fig_19_13_ft_correction.png)

* Evaluated using dimensionless temperature ratio $P$ and heat capacity ratio $R$:
  $$R = \frac{T_1 - T_2}{t_2 - t_1}, \quad P = \frac{t_2 - t_1}{T_1 - t_1}$$
* **Rule of Thumb**: Never design an exchanger with $F_T < 0.75$ (steep slope means small temperature fluctuations cause massive duty drops). If $F_T < 0.75$, switch to multiple shells in series.

---

## 2. Shell-and-Tube Construction & TEMA Standards

![TEMA Exchanger Designations](images/fig_19_1_tema_types.png)

![Shell and Tube Construction Cutaway](images/fig_19_4_st_construction.png)

### 2.1 Fluid Allocation Rules
* **Put in Tube-Side**:
  * High-pressure fluid (cheaper to contain high pressure in small tubes than thick shell).
  * Corrosive fluid (avoids expensive alloy shell).
  * Fouling fluid (tubes are much easier to clean mechanically via rodding/hydroblasting).
  * Fluid with higher heat-transfer coefficient (to balance resistances).
* **Put in Shell-Side**:
  * Viscous fluids (shell turbulence induced by baffles increases $h_o$).
  * Fluid with very low allowable pressure drop.
  * Condensing or boiling streams.

### 2.2 Standard Tube Layouts & Pitch
* **Triangular Pitch ($30^\circ, 60^\circ$)**: Compact; provides highest heat transfer coefficient per unit area, but requires chemical cleaning.
* **Square Pitch ($90^\circ, 45^\circ$)**: Used when shell-side fluid fouls heavily, allowing external mechanical lane cleaning. Pitch ratio typically $p_t / d_o = 1.25$.

---

## 3. Shell-Side Rating: Kern's Method vs. Bell-Delaware

![Kern Baffle Flow Patterns](images/fig_19_8_kern_baffles.png)

### 3.1 Kern's Method (Shortcut Rating)
* **Cross-Flow Shell-Side Area ($A_s$)**:
  $$A_s = \frac{(p_t - d_o) D_s B}{p_t}$$
  where $D_s$ is inside shell diameter, $B$ is baffle pitch (typically $B = 0.2 - 0.5 D_s$).
* **Equivalent Diameter ($d_e$)** for triangular pitch:
  $$d_e = \frac{4 \left(\frac{\sqrt{3}}{4} p_t^2 - \frac{\pi}{8} d_o^2\right)}{\frac{1}{2} \pi d_o} = \frac{1.10}{d_o} (p_t^2 - 0.917 d_o^2)$$
* **Shell-Side Heat Transfer & Pressure Drop**:
  $$Re_s = \frac{\rho v_s d_e}{\mu}, \quad Nu_s = 0.36 Re_s^{0.55} Pr^{1/3} \left(\frac{\mu}{\mu_w}\right)^{0.14}$$
  $$\Delta P_s = 8 j_f \left(\frac{D_s}{d_e}\right) \left(\frac{L}{B}\right) \left(\frac{\rho v_s^2}{2}\right) \left(\frac{\mu}{\mu_w}\right)^{-0.14}$$

### 3.2 Bell-Delaware Method (Rigorous Rating)
Accounts for real shell leakage and bypass streams using correction factors:

![Bell-Delaware Stream Analysis](images/fig_19_23_bell_delaware.png)

* **Stream A**: Leakage through tube-to-baffle hole clearances.
* **Stream B**: True cross-flow over tube bundle (effective heat transfer).
* **Stream C**: Bundle-to-shell bypass stream through clearance lanes.
* **Stream E**: Shell-to-baffle leakage stream (cold bypass).
* **Stream F**: Bypass through tube pass partition lanes.
* Rigorous film coefficient:
  $$h_o = h_{ideal} \times J_c \times J_l \times J_b \times J_s \times J_r$$
  (where $J_c$ is baffle cut factor, $J_l$ is leakage factor, $J_b$ is bypass factor).

---

## 4. Reboilers & Vaporizers

![Kettle Reboiler Geometry](images/fig_19_34_kettle_reboiler.png)

![Vertical Thermosiphon Reboiler](images/fig_19_35_thermosiphon.png)

1. **Kettle Reboiler**:
   * Tube bundle immersed in oversized shell (vapor space $D_{shell} \approx 1.5 - 2.0 D_{bundle}$).
   * Overflow weir separates boiling pool from clear liquid bottoms product draw.
   * Low circulation rate; functions effectively as one theoretical equilibrium stage.
2. **Vertical Thermosiphon Reboiler**:
   * Boiling occurs inside vertical tubes driven by natural thermosiphon head:
     $$\rho_L g H_{column} > \bar{\rho}_{two-phase} g H_{tubes} + \Delta P_{friction}$$
   * High circulation rates (typically 3:1 to 10:1 liquid recycle) prevent fouling and dryout.

---

## 5. Plate Heat Exchangers (PHE)

![Plate Heat Exchanger Corrugated Chevrons](images/fig_19_42_plate_heat_exchanger.png)

* Corrugated chevron plates create intense turbulence at low Reynolds numbers ($Re > 10 - 50$).
* Very high overall coefficients: $U = 2000 - 6000\text{ W}/\text{m}^2\cdot\text{K}$ (3-5x shell and tube).
* Ideal approach temperatures ($\Delta T_{approach} \le 1 - 2^\circ\text{C}$).
* Limitations: Max pressure $\le 25\text{ bar}$, max temperature $\le 160^\circ\text{C}$ due to elastomeric gaskets.
"""

with open(os.path.join(skill_dir_9, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_9)
print(f"Created {os.path.join(skill_dir_9, 'SKILL.md')}")

# -------------------------------------------------------------
# 10. che-fluid-transport-piping (Chapter 20: Transport and Storage of Fluids)
# -------------------------------------------------------------
skill_dir_10 = os.path.join('.agents', 'skills', 'che-fluid-transport-piping')
img_dir_10 = os.path.join(skill_dir_10, 'images')
os.makedirs(img_dir_10, exist_ok=True)

print("Extracting Chapter 20 figures...")
crop_figure(doc, 20, 1, os.path.join(img_dir_10, 'fig_20_1_velocity_profiles.png'))
crop_figure(doc, 20, 3, os.path.join(img_dir_10, 'fig_20_3_moody_diagram.png'))
crop_figure(doc, 20, 10, os.path.join(img_dir_10, 'fig_20_10_pump_curves.png'))
crop_figure(doc, 20, 11, os.path.join(img_dir_10, 'fig_20_11_npsh_cavitation.png'))
crop_figure(doc, 20, 20, os.path.join(img_dir_10, 'fig_20_20_compression_stages.png'))

skill_content_10 = r"""---
name: che-fluid-transport-piping
description: >-
  Master chemical engineering skill for fluid flow in pipes, pressure drop (Darcy-Weisbach,
  Moody diagram, Colebrook-White), economic pipe diameter selection, centrifugal pump rating
  (head-capacity curves, system resistance, NPSH, cavitation prevention), and gas compression.
  Use when modeling, designing, or visualizing piping and fluid transport units in Visualcheme.
---

# Transport and Storage of Fluids (Piping, Pumps & Compressors)

This skill provides the fluid dynamics, frictional pressure drop formulations, economic pipe sizing rules, and rotating equipment mechanics from *Chemical Engineering Design* (Chapter 20).

---

## 1. Fluid Flow & Frictional Pressure Drop in Pipes

![Velocity Profiles in Pipes](images/fig_10_1_velocity_profiles.png)

### 1.1 Darcy-Weisbach Equation
The fundamental pressure drop for incompressible pipe flow:
$$\Delta P_f = f \left(\frac{L}{D}\right) \left(\frac{\rho v^2}{2}\right) \quad [\text{Pa}]$$
In terms of frictional head loss $h_f$:
$$h_f = \frac{\Delta P_f}{\rho g} = f \left(\frac{L}{D}\right) \left(\frac{v^2}{2g}\right) \quad [\text{m}]$$
where $f$ is the Darcy-Weisbach friction factor (note: Fanning friction factor $f_{Fanning} = f / 4$).

### 1.2 The Moody Diagram & Friction Factor Correlations

![The Moody Diagram](images/fig_20_3_moody_diagram.png)

* **Laminar Flow ($Re < 2100$)**:
  $$f = \frac{64}{Re}$$
  (Completely independent of pipe wall roughness $\varepsilon$).
* **Turbulent Flow ($Re > 4000$)**:
  * **Colebrook-White Implicit Equation**:
    $$\frac{1}{\sqrt{f}} = -2.0 \log_{10}\left(\frac{\varepsilon / D}{3.7} + \frac{2.51}{Re \sqrt{f}}\right)$$
  * **Swamee-Jain Explicit Approximation** (accurate within 1% of Colebrook):
    $$f = \frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon / D}{3.7} + \frac{5.74}{Re^{0.9}}\right)\right]^2}$$
  * **Churchill Correlation** (valid continuously across all regimes: laminar, transition, turbulent):
    $$f = 8 \left[\left(\frac{8}{Re}\right)^{12} + \frac{1}{(A + B)^{1.5}}\right]^{1/12}$$
    $$A = \left[2.457 \ln\left(\frac{1}{(7/Re)^{0.9} + 0.27 (\varepsilon/D)}\right)\right]^{16}, \quad B = \left(\frac{37530}{Re}\right)^{16}$$

### 1.3 Minor Losses in Fittings & Valves
$$\Delta P_{minor} = \sum K \left(\frac{\rho v^2}{2}\right)$$
* Standard $90^\circ$ elbow: $K \approx 0.75$
* Gate valve (fully open): $K \approx 0.17$; (half open): $K \approx 4.5$
* Globe valve (fully open): $K \approx 6.0$
* Tee (through run): $K \approx 0.4$; (through branch): $K \approx 1.5$

---

## 2. Economic Pipe Diameter Selection

The optimal diameter balances capital cost (piping, valves, insulation) against operating cost (pumping power):
$$D_{opt} \approx C \cdot \dot{m}^{0.45} \rho^{-0.31}$$

### 2.1 Standard Velocity Rules of Thumb

| Fluid Service | Recommended Velocity ($v$) | Typical Pressure Drop ($\Delta P / L$) |
| :--- | :--- | :--- |
| **Pump Suction (Liquids)** | $0.5 - 1.2\text{ m/s}$ ($1.5 - 4\text{ ft/s}$) | $0.1 - 0.2\text{ bar/km}$ ($10 - 20\text{ kPa/100m}$) |
| **Pump Discharge (Liquids)**| $1.2 - 2.5\text{ m/s}$ ($4 - 8\text{ ft/s}$) | $0.5 - 1.5\text{ bar/km}$ ($50 - 150\text{ kPa/100m}$) |
| **Gases & Vapors (Moderate P)** | $15 - 30\text{ m/s}$ ($50 - 100\text{ ft/s}$) | $0.1 - 0.5\text{ bar/km}$ |
| **Vacuum Vapors** | $30 - 70\text{ m/s}$ | Minimize $\Delta P$ ($< 0.05\text{ bar/km}$) |
| **High-Pressure Steam** | $25 - 40\text{ m/s}$ | $0.2 - 0.5\text{ bar/km}$ |

---

## 3. Centrifugal Pumps & System Hydraulics

![Centrifugal Pump and System Head Curves](images/fig_20_10_pump_curves.png)

### 3.1 Operating Point Determination
* **System Head Curve**:
  $$H_{sys}(Q) = \Delta z + \frac{\Delta P_{vessels}}{\rho g} + k Q^2$$
  (Static lift + vessel pressure differential + square-law frictional resistance).
* **Operating Point**: The intersection of the pump manufacturer's $H-Q$ curve with the process system resistance curve.
* **Brake Horsepower (Shaft Power)**:
  $$P_{shaft} = \frac{\rho g Q H}{\eta_{pump}}$$

### 3.2 Net Positive Suction Head (NPSH) & Cavitation

![NPSH and Cavitation Mechanics](images/fig_20_11_npsh_cavitation.png)

Cavitation occurs when local static pressure at the pump impeller eye drops below fluid vapor pressure ($P_{vap}$), forming vapor bubbles that collapse violently on blade surfaces:
* **Available NPSH ($NPSH_A$)**:
  $$NPSH_A = \frac{P_{suction} - P_{vap}}{\rho g} + \frac{v_s^2}{2g} = \frac{P_0 - P_{vap}}{\rho g} \pm z_s - h_{f,suction}$$
* **Design Criterion**:
  $$NPSH_A \ge NPSH_R + 0.5\text{ m} \quad (\text{or } 1.5\text{ ft margin})$$

### 3.3 Pump Affinity Laws (Speed & Impeller Trimming)
$$\frac{Q_1}{Q_2} = \frac{N_1}{N_2}, \quad \frac{H_1}{H_2} = \left(\frac{N_1}{N_2}\right)^2, \quad \frac{P_1}{P_2} = \left(\frac{N_1}{N_2}\right)^3$$

---

## 4. Gas Compression

![Multistage Gas Compression with Intercooling](images/fig_20_20_compression_stages.png)

* **Isentropic Work for Ideal Gas**:
  $$W_{is} = \dot{m} \left(\frac{\gamma}{\gamma - 1}\right) R T_1 \left[\left(\frac{P_2}{P_1}\right)^{\frac{\gamma - 1}{\gamma}} - 1\right]$$
* **Discharge Temperature**:
  $$T_2 = T_1 \left(\frac{P_2}{P_1}\right)^{\frac{\gamma - 1}{\gamma}}$$
* **Compression Heuristics**:
  * Maximum stage pressure ratio $r_p = P_2 / P_1 \le 3.5 - 4.0$.
  * Maximum discharge temperature $T_{2} \le 150 - 160^\circ\text{C}$ (to prevent lube oil breakdown and thermal stress).
  * If overall pressure ratio $> 4.0$, use multi-stage compression with intercoolers to save work (approximating isothermal compression).
"""

with open(os.path.join(skill_dir_10, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_10)
print(f"Created {os.path.join(skill_dir_10, 'SKILL.md')}")

print("Batch 3 completed successfully!")
