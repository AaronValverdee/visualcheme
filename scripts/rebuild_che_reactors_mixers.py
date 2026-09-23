import sys, pymupdf, os
sys.path.append('scripts')
from extract_helpers import crop_equation, crop_figure, crop_table

doc = pymupdf.open('Chemical Engineering Design, Principles, Second Edition.pdf')
out_dir = '.agents/skills/che-reactors-mixers/images'
os.makedirs(out_dir, exist_ok=True)

print("Extracting Chapter 15 equations...")
for n in range(1, 35):
    crop_equation(doc, 15, n, os.path.join(out_dir, f'eq_15_{n}.png'))

print("Extracting Chapter 15 figures...")
for f in [1, 7, 8, 9, 11, 17, 25]:
    crop_figure(doc, 15, f, os.path.join(out_dir, f'fig_15_{f}.png'))

skill_file = '.agents/skills/che-reactors-mixers/SKILL.md'

content = r"""---
name: che-reactors-mixers
description: >-
  Chemical engineering guide to reactor design (CSTR, PFR, Batch, Catalytic Packed Bed)
  and fluid mixing/agitation equipment (impeller selection, power number curves N_p vs Re,
  baffle sizing, blending time, and jacket/coil heat transfer). Use when modeling, designing,
  or visualizing chemical reactors and mixing units in Visualcheme.
---

# Design of Chemical Reactors and Mixers

This skill provides an authoritative, detailed, textbook-grounded reference on reactor sizing, chemical kinetics, agitator selection, mixing hydrodynamics, impeller power draw, and reactor heat transfer, based directly on Chapter 15 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 640–758).

---

## 1. Reactor Types & Performance Equations

A chemical reactor transforms raw materials into desired products via chemical synthesis. Reactor selection balances reaction selectivity, conversion, heat removal, residence time, and capital cost.

![Reactor Design Procedure](images/fig_15_1.png)

### 1.1 The Classical Ideal Reactor Models

#### 1.1.1 Batch Reactor
Unsteady-state operation where reactants are charged, reacted over time, and discharged.
* **Component Balance on Limiting Reactant $A$**:
  $$-\frac{d N_A}{dt} = (-r_A) V$$

![Equation 15.1](images/eq_15_1.png)

* **Reaction Residence Time ($t_R$)**:
  $$t_R = N_{A0} \int_0^{X_A} \frac{dX_A}{(-r_A) V}$$
* **Total Batch Cycle Time**:
  $$t_{cycle} = t_{charge} + t_{heat} + t_R + t_{cool} + t_{discharge} + t_{clean}$$
* **Best Used For**: Specialty chemicals, pharmaceuticals, multi-product campaigns, low production rates ($< 5000\text{ metric tons/year}$).

#### 1.1.2 Continuous Stirred-Tank Reactor (CSTR / Backmix Reactor)
Steady-state continuous flow in an intensely agitated vessel where the internal contents are spatially uniform and identical to the exit stream.

![Equation 15.2](images/eq_15_2.png)

![Equation 15.3](images/eq_15_3.png)

* **Design Equation**:
  $$V = \frac{F_{A0} X_A}{(-r_A)_{exit}} = \frac{v_0 (C_{A0} - C_A)}{(-r_A)_{exit}}$$
* **Space Time ($\tau$)**:
  $$\tau = \frac{V}{v_0} = \frac{C_{A0} X_A}{(-r_A)_{exit}}$$
* **Damköhler Number ($Da$)** (for first-order reaction $-r_A = k C_A$):
  $$Da = k \tau \implies X_A = \frac{Da}{1 + Da}, \quad C_A = \frac{C_{A0}}{1 + Da}$$
* **Characteristics**: Operates at the lowest reactant concentration (exit concentration) and therefore the lowest reaction rate; requires larger volume than a PFR for positive-order reactions, but provides excellent temperature control for highly exothermic reactions.

#### 1.1.3 Plug Flow Reactor (PFR / Tubular Reactor)
Steady-state continuous flow through a tube or conduit with zero axial backmixing (flat velocity profile).

![Equation 15.4](images/eq_15_4.png)

![Equation 15.5](images/eq_15_5.png)

![Equation 15.6](images/eq_15_6.png)

* **Differential Material Balance**:
  $$F_{A0} dX_A = (-r_A) dV$$
* **Design Equation**:
  $$V = F_{A0} \int_0^{X_A} \frac{dX_A}{-r_A}$$
* **Space Time ($\tau$) for 1st-Order Reaction**:
  $$\tau = \int_0^{X_A} \frac{C_{A0} dX_A}{k C_{A0} (1 - X_A)} = \frac{1}{k} \ln\left(\frac{1}{1 - X_A}\right)$$
  $$X_A = 1 - e^{-k \tau} = 1 - e^{-Da}$$
* **Comparison**: A PFR always requires less volume than a CSTR for identical conversion and positive reaction order because the reaction rate remains high near the inlet.

---

## 2. Chemical Kinetics & Temperature Dependence

### 2.1 Reaction Rate Formulations

![Equation 15.7](images/eq_15_7.png)

![Equation 15.8](images/eq_15_8.png)

For a general homogeneous reaction $aA + bB \rightarrow cC + dD$:
$$-r_A = k(T) C_A^\alpha C_B^\beta$$

### 2.2 Arrhenius Temperature Dependence
The reaction rate constant $k(T)$ increases exponentially with absolute temperature:

![Equation 15.9](images/eq_15_9.png)

![Equation 15.10](images/eq_15_10.png)

$$k(T) = A \exp\left( -\frac{E_a}{R T} \right)$$
where $A$ is the pre-exponential frequency factor, $E_a$ is activation energy ($\text{J/mol}$), and $R = 8.314\text{ J/mol}\cdot\text{K}$.
* **Rule of Thumb**: For reactions with typical activation energies ($E_a \approx 50 - 80\text{ kJ/mol}$), reaction rate approximately doubles for every $10^\circ\text{C}$ rise in temperature.

---

## 3. Mixing and Agitation in Stirred Vessels

Agitation promotes mass and heat transfer, blends miscible liquids, suspends solids, and disperses immiscible phases.

![Standard Agitated Tank Geometry](images/fig_15_7.png)

### 3.1 Standard Vessel Geometry Proportions
For a standard vertical cylindrical vessel with torispherical or 2:1 elliptical dished heads:
* Liquid height: $H_L = D_t$ (liquid depth equal to tank diameter).
* Impeller diameter: $D = \frac{1}{3} D_t$ to $\frac{1}{2} D_t$.
* Impeller off-bottom clearance: $C = \frac{1}{3} D_t$.
* Baffle width: $W = \frac{1}{10} D_t$ to $\frac{1}{12} D_t$ (standard: 4 equally spaced vertical wall baffles).
* Baffle clearance from wall: $0.15 W$ to prevent solids accumulation in dead zones.

### 3.2 Impeller Types & Hydrodynamic Regimes

![Impeller Types](images/fig_15_8.png)

![Flow Patterns and Vortexing](images/fig_15_9.png)

1. **Marine Propeller (Axial Flow)**:
   * 3 blades with helical pitch; operates at high rotational speeds ($400 - 1750\text{ rpm}$).
   * Best for low-viscosity liquid blending ($\mu < 2\text{ Pa}\cdot\text{s}$) and rapid suspension of light solids.
2. **Flat-Blade Rushton Turbine (Radial Flow)**:
   * 6 vertical flat blades on a central disk ($D/D_t \approx 0.33$).
   * Discharges fluid radially outwards toward vessel walls where it splits into two circulation loops.
   * Provides very high shear rates; industry benchmark for gas-liquid dispersion (fermenters, oxygenators) and liquid-liquid emulsions.
3. **Pitched-Blade Turbine (Mixed Flow - $45^\circ$)**:
   * 4 or 6 blades angled at $45^\circ$. Combines axial pumping with moderate radial shear.
   * General-purpose workhorse for blending, solids suspension, and chemical reaction with moderate viscosity ($\mu < 10\text{ Pa}\cdot\text{s}$).
4. **Anchor & Helical Ribbon (Laminar Close-Clearance)**:
   * Operates at low rotational speeds ($10 - 50\text{ rpm}$) with close clearance to vessel wall ($c \approx 0.01 D_t$).
   * Essential for high-viscosity liquids ($\mu > 50\text{ Pa}\cdot\text{s}$), polymerizations, and pastes; scrapes the heated/cooled vessel wall to prevent product degradation.

### 3.3 Agitator Power Consumption Equations
The mechanical shaft power $P$ consumed by an impeller rotating at speed $N$ (rev/s) is calculated via dimensionless analysis:

![Equation 15.11](images/eq_15_11.png)

![Equation 15.12](images/eq_15_12.png)

![Equation 15.13](images/eq_15_13.png)

* **Impeller Reynolds Number**:
  $$Re_I = \frac{\rho N D^2}{\mu}$$
* **Power Number**:
  $$N_P = \frac{P}{\rho N^3 D^5}$$
* **Froude Number** (relevant only in unbaffled tanks with free surface vortexing):
  $$Fr = \frac{N^2 D}{g}$$

![Power Number vs Reynolds Number Curves](images/fig_15_11.png)

#### 3.3.1 Power Regimes in Baffled Tanks
1. **Laminar Regime ($Re_I < 10$)**:
   $$N_P = \frac{K_L}{Re_I} \implies P = K_L \mu N^2 D^3$$
   * Power is directly proportional to fluid viscosity $\mu$ and completely independent of density $\rho$.
2. **Turbulent Regime ($Re_I > 10^4$ in baffled tanks)**:
   $$N_P = K_T = \text{constant} \implies P = K_T \rho N^3 D^5$$
   * Power is independent of viscosity $\mu$ and proportional to fluid density $\rho$ and rotational speed cubed ($N^3$).
   * Standard values of $K_T$:
     * Flat-blade Rushton turbine: $K_T \approx 5.0 - 6.0$
     * 4-blade $45^\circ$ pitched turbine: $K_T \approx 1.27$
     * Marine propeller (pitch ratio 1.0): $K_T \approx 0.32$

### 3.4 Blend Time Correlations

![Equation 15.14](images/eq_15_14.png)

![Equation 15.15](images/eq_15_15.png)

![Equation 15.16](images/eq_15_16.png)

The time $\theta_b$ required to achieve 95% composition homogeneity:
$$N \theta_b = \frac{5.9 \left(D_t / D\right)^2}{N_P^{1/3}}$$
In the turbulent regime ($Re_I > 10^4$), the product $N \theta_b$ is constant for a given tank geometry.

---

## 4. Heat Transfer in Stirred Chemical Reactors

Exothermic reactions release heat $\Delta H_{rxn} < 0$. If heat generation exceeds heat removal, **thermal runaway** occurs.

![Reactor Cooling Jackets and Coils](images/fig_15_17.png)

### 4.1 Heat Transfer Surfaces
1. **External Jackets**:
   * Plain jackets, dimpled jackets, or half-pipe coil jackets welded to the vessel shell.
   * Maximum heat transfer area is limited to the wetted vessel wall:
     $$A_{jacket} = \pi D_t H_L + \frac{\pi}{4} D_t^2$$
   * **Scale-Up Bottleneck**: As reactor volume scales up ($V \propto D_t^3$), surface area scales only as $A \propto D_t^2$. The specific surface area decreases ($A/V \propto 1/D_t$), making jacket cooling alone insufficient for large exothermic reactors ($V > 10 - 15\text{ m}^3$).
2. **Internal Coils**:
   * Helical pipe coils immersed inside the liquid provide high heat transfer area and high inside heat transfer coefficients ($U = 400 - 800\text{ W}/\text{m}^2\cdot\text{K}$).
3. **External Heat Exchanger Loop**:
   * Reaction mixture is pumped through an external shell-and-tube or plate heat exchanger and returned to the reactor.

### 4.2 Vessel Film Heat Transfer Coefficients

![Equation 15.17](images/eq_15_17.png)

![Equation 15.18](images/eq_15_18.png)

![Equation 15.19](images/eq_15_19.png)

![Equation 15.20](images/eq_15_20.png)

For agitated vessels, the inside liquid film coefficient $h_i$ is correlated by:
$$\frac{h_i D_t}{k} = C (Re_I)^a (Pr)^b \left(\frac{\mu}{\mu_w}\right)^c$$
* For jacketed baffled vessel with flat-blade turbine:
  $$\frac{h_i D_t}{k} = 0.74 (Re_I)^{0.67} (Pr)^{0.33} \left(\frac{\mu}{\mu_w}\right)^{0.14}$$
* For internal helical coil:
  $$\frac{h_c d_o}{k} = 0.17 (Re_I)^{0.67} (Pr)^{0.37} \left(\frac{D}{D_t}\right)^{0.1} \left(\frac{d_o}{D_t}\right)^{0.5} \left(\frac{\mu}{\mu_w}\right)^{0.14}$$

---

## 5. Multiphase & Catalytic Reactors

![Equation 15.21](images/eq_15_21.png)

![Equation 15.22](images/eq_15_22.png)

![Equation 15.23](images/eq_15_23.png)

![Equation 15.24](images/eq_15_24.png)

![Equation 15.25](images/eq_15_25.png)

![Equation 15.26](images/eq_15_26.png)

![Equation 15.27](images/eq_15_27.png)

![Equation 15.28](images/eq_15_28.png)

![Equation 15.29](images/eq_15_29.png)

![Equation 15.30](images/eq_15_30.png)

![Equation 15.31](images/eq_15_31.png)

![Equation 15.32](images/eq_15_32.png)

![Equation 15.33](images/eq_15_33.png)

![Equation 15.34](images/eq_15_34.png)

### 5.1 Catalytic Fixed Bed Reactors (Ergun Pressure Drop)
Solid catalyst pellets packed into tubes or beds:

![Fixed Bed Catalytic Reactor](images/fig_15_25.png)

* **Ergun Equation**:
  $$\frac{\Delta P}{L} = 150 \frac{(1 - \varepsilon)^2}{\varepsilon^3} \frac{\mu v_0}{d_p^2} + 1.75 \frac{1 - \varepsilon}{\varepsilon^3} \frac{\rho v_0^2}{d_p}$$
  where $\varepsilon$ is bed void fraction ($0.35 - 0.45$), $d_p$ is equivalent particle diameter, and $v_0$ is superficial gas velocity.
* **Internal Catalyst Effectiveness Factor ($\eta$)**:
  $$\eta = \frac{\text{Actual reaction rate}}{\text{Rate if entire interior was exposed to surface conditions}} = \frac{3}{\phi} \left(\frac{1}{\tanh \phi} - \frac{1}{\phi}\right)$$
  where $\phi$ is the Thiele Modulus ($\phi = R_p \sqrt{k / D_{eff}}$).
"""

with open(skill_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully rebuilt {skill_file} with complete textbook fidelity!")
