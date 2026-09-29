import os

content = r"""---
name: che-solids-handling
description: >-
  Chemical engineering guide to particulate solids processing from Chapter 18 of Towler & Sinnott:
  particle characterization (Sauter mean d_32), fluidization (Ergun eq, minimum fluidization
  velocity U_mf), Stairmand gas cyclones (standard geometry, cut diameter scaling, pressure drop),
  hydrocyclones (Zanker method), cake filtration (Ruth equation, rotary drum filters), and
  industrial drying operations (rotary, fluidized bed, spray dryers) for Visualcheme.
---

# Specification and Design of Solids-Handling Equipment

This skill provides an authoritative, textbook-grounded reference on particulate characterization, fluidization, cyclone separation, cake filtration, and industrial drying, based directly on Chapter 18 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 946–1054).

---

## 1. Particle Characterization & Fluidization Fundamentals

Particulate systems are governed by discrete particle size distributions (PSD), shape factors (sphericity $\phi_s$), and bed packing voidage.

### 1.1 Sauter Mean Diameter ($d_{32}$)
The Sauter mean diameter represents the volume-to-surface mean diameter and is the primary characteristic length in fluid-particle momentum and mass transfer:

![Equation 18.1](images/eq_18_1.png)

$$d_{32} = \frac{\sum n_i d_i^3}{\sum n_i d_i^2} = \frac{1}{\sum (w_i / d_i)}$$
$$\text{Where:}$$
* $w_i$ = Mass fraction of particles in size interval with mean diameter $d_i$
* $n_i$ = Number of particles of diameter $d_i$

---

### 1.2 Fluidization Mechanics & Minimum Fluidization Velocity ($U_{mf}$)
When a fluid passes upward through a packed bed of granular solids, the frictional pressure drop increases with superficial velocity $U$. At the point of minimum fluidization, the pressure drop across the bed balances the buoyant weight of the solid particles:

![Equation 18.14](images/eq_18_14.png)

$$\frac{\Delta P}{L_b} = (1 - \varepsilon_{mf})(\rho_p - \rho_f) g$$

Substituting the Ergun equation for packed-bed pressure drop gives the general quadratic equation for superficial fluid velocity at minimum fluidization ($U_{mf}$):

![Equation 18.15](images/eq_18_15.png)

$$\frac{\rho_f (\rho_p - \rho_f) g d_p^3}{\mu^2} = \frac{150(1 - \varepsilon_{mf})}{\varepsilon_{mf}^3} \left(\frac{\rho_f d_p U_{mf}}{\mu}\right) + \frac{1.75}{\varepsilon_{mf}^3} \left(\frac{\rho_f d_p U_{mf}}{\mu}\right)^2$$

#### 1.2.1 Small Particles (Laminar Regime, $Re_{p} < 20$)
For fine particles where viscous forces dominate, the kinetic energy term is negligible, yielding:

![Equation 18.16](images/eq_18_16.png)

$$U_{mf} = \frac{d_p^2 (\rho_p - \rho_f) g}{150 \mu} \frac{\varepsilon_{mf}^3}{1 - \varepsilon_{mf}}$$

#### 1.2.2 Large Particles (Turbulent Regime, $Re_{p} > 1000$)
For coarse particles where inertial drag dominates:

![Equation 18.17](images/eq_18_17.png)

$$U_{mf}^2 = \frac{d_p (\rho_p - \rho_f) g}{1.75 \rho_f} \varepsilon_{mf}^3$$

$$\text{Where:}$$
* $\varepsilon_{mf}$ = Void fraction at minimum fluidization (typically $0.40 - 0.45$ for spheres; up to $0.65$ for irregular particles)
* $\rho_p, \rho_f$ = Densities of particle and fluid ($\text{kg/m}^3$)
* $\mu$ = Fluid dynamic viscosity ($\text{Pa}\cdot\text{s}$)
* $d_p$ = Particle diameter ($d_{32}$, $\text{m}$)

---

## 2. Gas-Solids Separation: Reverse-Flow Cyclones

Reverse-flow cyclones are the workhorse separation devices for capturing dust and particulate matter from gas streams using centrifugal force.

![Reverse-Flow Cyclone Schematic](images/fig_18_31.png)

### 2.1 Standard Stairmand Cyclone Geometries
Towler & Sinnott recommend two standard industrial cyclone designs developed by Stairmand (1951):
1. **High-Efficiency Cyclone** (Figure 18.32a): Maximizes the capture of fine particles ($1 - 10\ \mu\text{m}$) at the expense of higher pressure drop.
2. **High-Throughput Cyclone** (Figure 18.32b): Maximizes volumetric gas capacity for coarse dust collection.

![Standard Stairmand Cyclone Proportions](images/fig_18_32.png)

#### Geometric Ratios (Normalized to Barrel Diameter $D_c$):
| Cyclone Dimension | High-Efficiency Design | High-Throughput Design |
| :--- | :--- | :--- |
| **Inlet Height ($a$)** | $0.50\ D_c$ | $0.75\ D_c$ |
| **Inlet Width ($b$)** | $0.20\ D_c$ | $0.375\ D_c$ |
| **Gas Outlet Diameter ($D_e$)** | $0.50\ D_c$ | $0.75\ D_c$ |
| **Gas Outlet Duct Length ($S$)** | $0.50\ D_c$ | $0.875\ D_c$ |
| **Cylinder Barrel Height ($h$)** | $1.50\ D_c$ | $1.50\ D_c$ |
| **Conical Section Height ($z$)** | $2.50\ D_c$ | $2.50\ D_c$ |
| **Total Cyclone Height ($H$)** | $4.00\ D_c$ | $4.00\ D_c$ |
| **Dust Discharge Diameter ($B$)** | $0.375\ D_c$ | $0.375\ D_c$ |

---

### 2.2 Standard Performance Curves & Cut Diameter Scaling
The baseline performance of Stairmand cyclones under standard test conditions ($D_{c1} = 0.203\text{ m}$ [8 in.], air at $20^\circ\text{C}$, particle density $\rho_{p1} = 2000\text{ kg/m}^3$, inlet velocity $u_1 = 15.2\text{ m/s}$) is given by:

![Stairmand Performance Curves](images/fig_18_33.png)

To scale the grade collection efficiency curve to any proposed cyclone diameter $D_{c2}$, gas flow rate $Q_2$, fluid viscosity $\mu_2$, and solid density $\rho_{p2}$, use the **Stairmand scaling equation**:

![Equation 18.23](images/eq_18_23.png)

$$d_2 = d_1 \left[ \left(\frac{D_{c2}}{D_{c1}}\right) \left(\frac{Q_1}{Q_2}\right) \left(\frac{\rho_{p1} - \rho_{g1}}{\rho_{p2} - \rho_{g2}}\right) \left(\frac{\mu_2}{\mu_1}\right) \right]^{1/2}$$

![Cyclone Scale-Up Performance Curve Transposition](images/fig_18_34.png)

---

### 2.3 Cyclone Pressure Drop Calculation
The total static pressure drop across a Stairmand cyclone is given by Equation 18.24:

![Equation 18.24](images/eq_18_24.png)

$$\Delta P = \frac{1}{2} \rho_g u_{in}^2 \left[ 1 + 2 \phi^2 \left( \frac{2 r_1}{r_2} - 1 \right) + 2 \left( \frac{u_e}{u_{in}} \right)^2 \right]$$

$$\text{Where:}$$
* $u_{in}$ = Gas inlet duct velocity ($Q / (a \cdot b)$), optimal design range is **$15.0\text{ m/s}$ ($9 - 25\text{ m/s}$)**
* $u_e$ = Gas exit duct velocity ($4 Q / (\pi D_e^2)$)
* $r_1, r_2$ = Radii at cyclone wall ($D_c / 2$) and vortex finder ($D_e / 2$)
* $\phi$ = Pressure drop factor obtained from Figure 18.35 as a function of parameter $\psi = f_c A_s / A_{in}$

![Cyclone Pressure Drop Factor](images/fig_18_35.png)

$$\text{Where:}$$
* $A_s$ = Internal cyclone surface area exposed to spinning gas ($\approx \pi D_c (h + z)$)
* $A_{in}$ = Inlet duct area ($a \cdot b$)
* $f_c$ = Cyclone wall friction factor (typically $0.005$ for clean gas, higher for heavy solids)
* Typical allowable pressure drop: $\Delta P = 0.5\text{ to } 2.5\text{ kPa}$ ($50 - 250\text{ mm } H_2O$).

---

### 2.4 Step-by-Step Cyclone Sizing Algorithm (Towler & Sinnott Method)
1. **Determine Gas Volumetric Flow Rate**: Calculate actual volumetric flow $Q\ (\text{m}^3/\text{s})$ at operating temperature and pressure.
2. **Select Inlet Velocity**: Set target inlet velocity $u_{in} = 15\text{ m/s}$ (optimum compromise between high centrifugal capture and low pressure drop).
3. **Calculate Duct Area**: $A_{in} = Q / u_{in}$.
4. **Determine Cyclone Barrel Diameter ($D_c$)**:
   * For Stairmand High-Efficiency design: $A_{in} = 0.5 D_c \times 0.2 D_c = 0.1 D_c^2 \implies D_c = \sqrt{A_{in} / 0.1}$.
5. **Parallel Units Check**: If $D_c > 1.0\text{ m}$, collection efficiency on fines will be poor due to large radius. Split the total gas flow among $N_p$ smaller cyclones in parallel ($D_c \approx 0.3 - 0.6\text{ m}$).
6. **Calculate Scaling Factor**: Evaluate $d_2 / d_1$ from Equation 18.23.
7. **Evaluate Grade Efficiency & Total Recovery**: Read $\eta_i$ from Figure 18.33(a) at scaled diameters $d_1 = d_i / (d_2 / d_1)$ for each particle size class. Compute total mass collection efficiency:
   $$\eta_{total} = \sum w_i \eta_i$$
8. **Calculate Pressure Drop**: Compute $\Delta P$ from Equation 18.24 and Figure 18.35. Verify it falls within the process blower budget.

---

## 3. Liquid-Solid Separation: Hydrocyclones

Hydrocyclones use centrifugal settling to separate suspended solid particles from liquids, classify slurry particles by size, or separate immiscible liquid mixtures.

![Hydrocyclone Assembly](images/fig_18_54.png)

### 3.1 Zanker's Sizing Method for Hydrocyclones
Zanker (1977) developed a widely accepted design correlation for standard geometry hydrocyclones:

![Equation 18.27](images/eq_18_27.png)

$$d_{50} = 4.5 \left[ \frac{D_c^3 \mu_L}{Q^2 (\rho_p - \rho_L)} \right]^{0.5}$$

![Equation 18.28](images/eq_18_28.png)

$$\eta_i = 100 \left[ 1 - \exp\left( - \left(\frac{d_i}{d_{50}} - 0.115\right)^3 \right) \right]$$

$$\text{Where:}$$
* $d_{50}$ = Cut particle diameter collected with $50\%$ efficiency ($\mu\text{m}$)
* $D_c$ = Inside diameter of cylindrical chamber ($\text{cm}$)
* $Q$ = Slurry feed rate ($\text{L/min}$)
* $\mu_L$ = Liquid viscosity ($\text{mPa}\cdot\text{s}$ or $\text{cP}$)
* $\rho_p, \rho_L$ = Densities of solid particles and carrier liquid ($\text{g/cm}^3$)
* $\eta_i$ = Separation efficiency for particles of diameter $d_i$ ($\%$)

![Zanker Hydrocyclone Sizing Nomograph](images/fig_18_56.png)

![Standard Hydrocyclone Geometry](images/fig_18_57.png)

---

## 4. Solid-Liquid Filtration

Filtration separates solid particles from a slurry by forcing the suspension through a porous medium that retains solids as a permeable cake.

### 4.1 Fundamental Filtration Theory (The Ruth Equation)
Under constant pressure drop ($\Delta P$), filtrate volume $V$ collected over time $t$ obeys the **Ruth filtration equation**:

![Equation 18.29](images/eq_18_29.png)

$$\frac{d t}{d V} = \frac{\mu \alpha c}{A^2 \Delta P} V + \frac{\mu R_m}{A \Delta P}$$

Integrating for constant pressure cake filtration gives:

![Equation 18.30](images/eq_18_30.png)

$$\frac{t}{V} = \frac{\mu \alpha c}{2 A^2 \Delta P} V + \frac{\mu R_m}{A \Delta P}$$

$$\text{Where:}$$
* $V$ = Cumulative volume of filtrate collected ($\text{m}^3$)
* $t$ = Filtration time ($\text{s}$)
* $A$ = Total filter cake surface area ($\text{m}^2$)
* $\Delta P$ = Pressure drop across filter medium and cake ($\text{Pa}$)
* $\mu$ = Filtrate dynamic viscosity ($\text{Pa}\cdot\text{s}$)
* $c$ = Mass of dry cake deposited per unit volume of filtrate ($\text{kg/m}^3$)
* $\alpha$ = Specific cake resistance ($\text{m/kg}$)
* $R_m$ = Filter medium resistance ($\text{m}^{-1}$)

A plot of $t/V$ versus $V$ yields a straight line with:
$$\text{Slope} = \frac{\mu \alpha c}{2 A^2 \Delta P} \quad \implies \quad \alpha = \frac{2 A^2 \Delta P \times \text{Slope}}{\mu c}$$
$$\text{Intercept} = \frac{\mu R_m}{A \Delta P} \quad \implies \quad R_m = \frac{A \Delta P \times \text{Intercept}}{\mu}$$

---

### 4.2 Continuous Rotary Drum Vacuum Filters
The rotary drum filter is the standard industrial unit for continuous solid-liquid separation of free-filtering slurries:

![Rotary Drum Vacuum Filter](images/fig_18_49.png)

* **Cycle Segments**:
  1. *Cake Formation Zone ($20\% - 35\%$ of cycle)*: Drum is submerged in slurry trough under internal vacuum ($0.2 - 0.8\text{ bar}$ vac). Cake builds up on cloth surface.
  2. *Washing Zone ($20\% - 30\%$ of cycle)*: Wash water sprays remove mother liquor from cake pores.
  3. *Dewatering Zone ($20\% - 30\%$ of cycle)*: Vacuum draws air through cake to minimize moisture content.
  4. *Cake Discharge Zone ($10\% - 15\%$ of cycle)*: Doctor blade, scraper, or roller discharges cake aided by a momentary reverse air pulse.
* **Operating Heuristics**:
  * Drum speed: $0.1\text{ to } 2.0\text{ rpm}$.
  * Typical specific capacity: $100\text{ to } 1000\text{ kg/h}\cdot\text{m}^2$ of dry solids.
  * Cake thickness: $3\text{ to } 25\text{ mm}$.

---

## 5. Industrial Drying Operations

Drying removes volatile liquid (typically water or solvent) from wet solids via thermal vaporization.

### 5.1 Drying Rate Mechanics
* **Constant Rate Period**: Surface moisture evaporates freely. Surface temperature equals the wet-bulb temperature $T_{wb}$ of the gas. Rate is governed solely by external heat/mass transfer:
  $$N_c = \frac{h (T_g - T_s)}{\lambda_w}$$
* **Critical Moisture Content ($X_c$)**: The threshold moisture content below which dry spots appear on the solid surface.
* **Falling Rate Period**: Vaporization rate is limited by internal liquid and vapor diffusion through solid capillaries. Solid temperature rises toward the gas dry-bulb temperature.

### 5.2 Direct-Heat Rotary Dryers
Used for high-tonnage bulk granular solids (fertilizers, minerals, cement, grain):

![Direct-Heat Rotary Dryer](images/fig_18_60.png)

* **Drum Slope**: $10\text{ to } 80\text{ mm/m}$ ($1^\circ - 4^\circ$).
* **Rotational Speed**: $1\text{ to } 8\text{ rpm}$ (Peripheral speed $0.2 - 0.5\text{ m/s}$).
* **Internal Flights**: Lifting flights shower solid cascades through hot gas stream to maximize contact area.
* **Gas Velocity**: Kept below $1.5 - 2.5\text{ m/s}$ to minimize dust entrainment into exit gas.

### 5.3 Fluidized-Bed Dryers
Superior for heat-sensitive, uniform granular solids requiring precise temperature control and high thermal efficiency:

![Fluidized-Bed Dryer](images/fig_18_62.png)

* Gas velocity maintained between $1.5\ U_{mf}$ and $0.5\ U_{terminal}$ to ensure vigorous bubbling without excessive particle carryover.
* Fitted with internal heat-exchange tubes and exhaust cyclones to recover fines.

### 5.4 Spray Dryers
Converts liquid solutions, slurries, or pastes directly into dry free-flowing powders (dairy products, detergents, pharmaceuticals, dyestuffs):

![Spray Dryer Configurations](images/fig_18_65.png)

* Feed is atomized into a fine fog of droplets ($10 - 200\ \mu\text{m}$) using rotary atomizers or high-pressure nozzles inside a cylindrical drying chamber.
* Rapid evaporation (droplet residence time $5 - 30\text{ seconds}$) prevents thermal degradation of sensitive active ingredients.

---

## 6. Visualcheme Implementation Architecture

1. **State Variables**: Model particulate streams using size classes ($d_i, w_i$), bulk density $\rho_b$, particle density $\rho_p$, and moisture content ($X$, kg liquid / kg dry solid).
2. **Interactive Visualization Gradients**:
   * *Cyclone velocity gradient*: Tangential vortex speed $v_\theta \propto 1/r^n$ and static pressure distribution from outer wall to vortex finder.
   * *Filter cake resistance gradient*: Progressive pressure drop across growing cake layer $\Delta P_c(t)$ and cloth $\Delta P_m$.
   * *Drying temperature gradient*: Gas dry-bulb temperature drop paired with solid temperature rise through constant and falling rate regimes.
3. **Preset Scenarios**:
   * *Catalyst Recovery Cyclone*: Gas flow $10,000\text{ m}^3/\text{h}$, $\rho_p = 1500\text{ kg/m}^3$, Stairmand high-efficiency geometry.
   * *Slurry Dewatering Rotary Filter*: $\Delta P = 0.5\text{ bar}$, specific resistance $\alpha = 1 \times 10^{11}\text{ m/kg}$.
"""

with open('.agents/skills/che-solids-handling/SKILL.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("che-solids-handling/SKILL.md updated successfully!")
