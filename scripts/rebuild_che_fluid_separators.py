import sys, pymupdf, os
sys.path.append('scripts')
from extract_helpers import crop_equation, crop_figure, crop_table

doc = pymupdf.open('Chemical Engineering Design, Principles, Second Edition.pdf')
out_dir = '.agents/skills/che-fluid-separators/images'
os.makedirs(out_dir, exist_ok=True)

print("Extracting Chapter 16 equations...")
for n in range(1, 12):
    crop_equation(doc, 16, n, os.path.join(out_dir, f'eq_16_{n}.png'))

print("Extracting Chapter 16 figures...")
for f in [14, 15, 16, 20, 21]:
    crop_figure(doc, 16, f, os.path.join(out_dir, f'fig_16_{f}.png'))

skill_file = '.agents/skills/che-fluid-separators/SKILL.md'

content = r"""---
name: che-fluid-separators
description: >-
  Chemical engineering design skill for phase separation equipment: vertical knock-out pots,
  horizontal flash drums, Souders-Brown terminal vapor velocity, mist eliminator pads, and
  liquid-liquid gravity decanters (Stokes settling, weir design). Use when modeling, sizing,
  or visualizing phase separators in Visualcheme.
---

# Separation of Fluids (Phase Separators & Decanters)

This skill provides an authoritative, detailed, textbook-grounded reference on gas-liquid separators, flash drums, mist elimination, and liquid-liquid gravity decanters, based directly on Chapter 16 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 762–814).

---

## 1. Gas-Liquid Phase Separation Fundamentals

Gas-liquid separators (knockout pots, flash drums, compressor suction scrubbers) separate liquid droplets entrained in vapor streams via gravitational settling, momentum redirection, and impingement.

![Vertical Gas-Liquid Separator](images/fig_16_14.png)

![Horizontal Gas-Liquid Separator](images/fig_16_15.png)

### 1.1 Vessel Orientation Selection
* **Vertical Separators**:
  * Preferred when vapor volume is high relative to liquid ($V/L \gg 1$).
  * Small plot footprint; simpler liquid level control; easier solids drainage.
  * Typical services: Compressor suction scrubbers, fuel gas knockout drums, relief flash drums.
* **Horizontal Separators**:
  * Preferred when liquid volume is large or when 3-phase separation is required (gas / light hydrocarbon liquid / heavy aqueous phase).
  * Lower vapor velocities and larger surface area promote droplet settling; provides massive liquid holdup capacity for slug handling.

---

## 2. Terminal Settling Velocity & The Souders-Brown Equation

A liquid droplet suspended in a rising vapor stream experiences downward gravitational force and upward aerodynamic drag.

### 2.1 Droplet Drag & Terminal Settling Velocity

![Equation 16.5](images/eq_16_5.png)

![Equation 16.6](images/eq_16_6.png)

The terminal settling velocity $u_t$ of a spherical droplet of diameter $d_p$:
$$u_t = \sqrt{\frac{4 g d_p (\rho_L - \rho_V)}{3 \rho_V C_D}}$$
where drag coefficient $C_D$ depends on droplet Reynolds number $Re_p = \frac{\rho_V u_t d_p}{\mu_V}$.
* For laminar settling ($Re_p < 2$ - Stokes' Law):
  $$C_D = \frac{24}{Re_p} \implies u_t = \frac{g d_p^2 (\rho_L - \rho_V)}{18 \mu_V}$$
* For intermediate regime ($2 < Re_p < 500$):
  $$C_D = \frac{18.5}{Re_p^{0.6}}$$
* For Newton's turbulent regime ($500 < Re_p < 200,000$):
  $$C_D \approx 0.44 \implies u_t = 1.74 \sqrt{\frac{g d_p (\rho_L - \rho_V)}{\rho_V}}$$

### 2.2 Maximum Allowable Vapor Velocity (Souders-Brown Equation)
To prevent re-entrainment of settled liquid droplets, the maximum allowable vapor velocity is calculated using the semi-empirical **Souders-Brown Equation**:

![Equation 16.7](images/eq_16_7.png)

$$v_{max} = K_{SB} \sqrt{\frac{\rho_L - \rho_V}{\rho_V}} \quad [\text{m/s}]$$
where $K_{SB}$ is the empirical Souders-Brown separation factor.

![Souders-Brown K Factor Chart](images/fig_16_16.png)

#### 2.2.1 Design Values for $K_{SB}$ (Vertical Vessels)
* **With Wire Mesh Mist Eliminator (Demister Pad)**:
  * Standard operating pressure ($1 - 30\text{ bar}$):
    $$K_{SB} = 0.107\text{ m/s} \quad (0.35\text{ ft/s})$$
  * At high pressure ($P > 40\text{ bar}$): derate $K_{SB}$ according to Fig 16.16 due to decreasing surface tension and droplet breakup.
* **Without Demister (Plain Gravity Disengagement)**:
  * Design factor:
    $$K_{SB} = 0.035 - 0.06\text{ m/s} \quad (0.11 - 0.20\text{ ft/s})$$
* **Operating Design Velocity**:
  $$v_{design} = (0.70 - 0.85) \times v_{max}$$

### 2.3 Demister Pads (Mist Eliminators)
Knitted wire mesh pads (typically $100 - 150\text{ mm}$ thick, $97 - 99\%$ void fraction, made of 316SS or polypropylene) capture fine droplets ($d_p \ge 3 - 5\,\mu\text{m}$) via inertial impaction.
* Droplets coalesce on wire filaments and drain down as large drops against rising gas.
* **Pressure Drop**: Extremely low ($\Delta P \approx 250 - 500\text{ Pa}$ / $1 - 2\text{ in. } H_2O$).

---

## 3. Step-by-Step Separator Sizing Procedure

### 3.1 Vertical Drum Sizing
1. **Calculate Maximum Allowable Vapor Velocity**:
   $$v_{max} = K_{SB} \sqrt{\frac{\rho_L - \rho_V}{\rho_V}}$$
2. **Determine Net Cross-Sectional Area**:
   $$A_{drum} = \frac{\dot{V}_{vapor}}{v_{design}} \implies D = \sqrt{\frac{4 A_{drum}}{\pi}}$$
   (Round up to nearest standard pipe size or $150\text{ mm}$ / 6 in. vessel increment).
3. **Determine Liquid Surge Volume**:
   $$V_L = \dot{V}_{liquid} \times t_{holdup}$$
   * Normal service: $t_{holdup} = 5\text{ minutes}$ (between LLL and HLL).
   * Feed drum to distillation column: $t_{holdup} = 10 - 15\text{ minutes}$.
   * Compressor suction knockout: hold volume for 20–30 minutes of normal condensate or slug capacity.
   * Liquid height in vessel: $H_L = \frac{V_L}{\frac{\pi}{4} D^2}$.
4. **Determine Disengagement and Total Height ($H_{total}$)**:
   * Clearance from liquid high level (HLL) to feed nozzle: $\ge 0.3\text{ m}$ (or $D/2$).
   * Clearance from feed nozzle to bottom of demister pad: $\ge 0.9\text{ m}$ (or $D$).
   * Demister pad thickness: $0.15\text{ m}$.
   * Clearance above demister pad to top tangent line: $\ge 0.3 - 0.45\text{ m}$.
   * Standard aspect ratio check: $H_{total} / D \approx 2.5 - 4.0$.

---

## 4. Liquid-Liquid Gravity Decanters

Used to separate continuous mixtures of two immiscible liquid phases (e.g. water and hydrocarbons).

![Horizontal Liquid-Liquid Decanter](images/fig_16_20.png)

### 4.1 Droplet Settling in Continuous Phase (Stokes' Law)

![Equation 16.8](images/eq_16_8.png)

![Equation 16.9](images/eq_16_9.png)

![Droplet Settling Dynamics](images/fig_16_21.png)

The continuous phase velocity through the decanter must not exceed the terminal settling velocity of the dispersed droplets (typically sized to capture droplets $d_p \ge 100 - 150\,\mu\text{m}$):
$$u_t = \frac{g d_p^2 (\rho_d - \rho_c)}{18 \mu_c}$$
where subscript $d$ refers to the dispersed phase and $c$ to the continuous phase.

* **Interfacial Settling Area Target**:
  $$A_{interface} = \frac{\dot{V}_{continuous}}{0.80 u_t}$$

### 4.2 Hydrostatic Siphon Seal Equation
To ensure that both liquid phases overflow continuously without mechanical pump control, a heavy-phase liquid seal leg is installed:

![Equation 16.10](images/eq_16_10.png)

![Equation 16.11](images/eq_16_11.png)

$$\rho_L g (z_T - z_i) + \rho_H g z_i = \rho_H g z_2$$
$$z_2 = z_i + (z_T - z_i) \left(\frac{\rho_L}{\rho_H}\right)$$
$$\text{Where:}$$
* $z_T$ = Light phase overflow weir height (measured from inside vessel bottom)
* $z_2$ = Heavy phase siphon overflow takeoff height
* $z_i$ = Desired interface level inside the vessel (normally set at mid-height: $z_i \approx 0.5 D$)
* $\rho_L, \rho_H$ = Densities of light and heavy phases
"""

with open(skill_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully rebuilt {skill_file} with complete textbook fidelity!")
