import os

content = r"""---
name: che-distillation-columns
description: >-
  Master chemical engineering skill for distillation, absorption, and stripping columns
  from Chapter 17 of Towler & Sinnott: Continuous distillation anatomy, stage MESH equations,
  McCabe-Thiele graphical method (ROL, SOL, q-line, Rmin, Nmin), Fenske-Underwood-Gilliland (FUG)
  shortcut multicomponent rating, sieve/valve tray hydraulics (Fair's flooding, weeping,
  total plate pressure drop, downcomer backup choke), and packed column design (GPDC, HETP) for Visualcheme.
---

# Design of Separation Columns (Distillation, Absorption, and Stripping)

This skill provides an authoritative, textbook-grounded reference on distillation column modeling, binary and multicomponent stage sizing, tray hydraulic rating, and packed column sizing, based directly on Chapter 17 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 816–941).

---

## 1. Continuous Distillation: Process Anatomy & Fundamentals

Distillation separates chemical mixtures into pure product fractions exploiting differences in vapor pressure (relative volatility $\alpha_{ij}$).

![Continuous Distillation Column Layout](images/fig_17_1.png)

### 1.1 Column Sections & Streams (Figure 17.1)
* **Feed Stream ($F$)**: Introduced at intermediate feed stage $f$, dividing column into:
  * **Rectifying (Enriching) Section**: Stages above feed tray. Vapor flows upward, stripped of heavy components by falling reflux liquid ($L$).
  * **Stripping Section**: Stages below feed tray. Liquid flows downward, stripped of light components by rising reboiler vapor ($V$).
* **Condenser**: Condenses overhead vapor into liquid. Liquid is partitioned into **Reflux ($L$)** (returned to top tray) and **Distillate product ($D$)**:
  $$R = \frac{L}{D} \quad (\text{Reflux Ratio})$$
* **Reboiler**: Boils a fraction of bottoms liquid into vapor traffic returned to the column base, withdrawing the remainder as **Bottoms product ($B$)**:
  $$V_B = \frac{V}{B} \quad (\text{Boilup Ratio})$$

---

### 1.2 The Rigorous Stage MESH Equations (Figure 17.2)
At steady state, each individual equilibrium tray $n$ obeys four coupled fundamental conservation equations (MESH):

![Stage Mass and Energy Flows](images/fig_17_2.png)

1. **M - Material Balances (Equation 17.1)**:
   For each chemical component $i$ across stage $n$:

![Equation 17.1](images/eq_17_1.png)

$$V_{n+1} y_{n+1,i} + L_{n-1} x_{n-1,i} + F_n z_{n,i} = V_n y_{n,i} + L_n x_{n,i} + S_n x_{n,i}$$

2. **E - Equilibrium Relationships (Equation 17.2)**:
   Vapor and liquid leaving stage $n$ are in thermodynamic phase equilibrium:

![Equation 17.2](images/eq_17_2.png)

$$y_{n,i} = K_{n,i} x_{n,i} = \frac{\gamma_{n,i} P_{sat,i}(T_n)}{P_n} x_{n,i}$$

3. **S - Summation Constraints (Equation 17.3)**:
   The mole fractions in each phase must sum identically to unity:

![Equation 17.3](images/eq_17_3.png)

$$\sum_{i=1}^C x_{n,i} = 1.0 \quad \text{and} \quad \sum_{i=1}^C y_{n,i} = 1.0$$

4. **H - Heat / Enthalpy Balances (Equation 17.4)**:
   Conservation of thermal energy across stage $n$:

![Equation 17.4](images/eq_17_4.png)

$$V_{n+1} H_{n+1} + L_{n-1} h_{n-1} + F_n h_{Fn} = V_n H_n + L_n h_n + S_n h_{Sn} + Q_n$$

---

## 2. Binary Distillation: The McCabe-Thiele Method

The McCabe-Thiele graphical method determines theoretical stage requirements under the assumption of **Constant Molar Overflow (CMO)** (equal molar heats of vaporization, negligible sensible heat, adiabatic column).

![McCabe-Thiele Construction](images/fig_17_5.png)

### 2.1 The Governing Operating Lines
1. **Rectifying Operating Line (ROL, Equation 17.12)**:
   Relates vapor leaving stage $n+1$ to liquid leaving stage $n$:

![Equation 17.12](images/eq_17_12.png)

$$y_{n+1} = \frac{R}{R + 1} x_n + \frac{x_D}{R + 1}$$
* Slope = $R / (R + 1) < 1.0$; $y$-intercept = $x_D / (R + 1)$; passes through diagonal ($x = x_D, y = x_D$).

2. **Feed Condition Line ($q$-Line, Equations 17.14 and 17.15)**:
   Locus of intersection of ROL and SOL:

![Equation 17.14](images/eq_17_14.png)

![Equation 17.15](images/eq_17_15.png)

$$y = \frac{q}{q - 1} x - \frac{z_F}{q - 1}$$
* $q$ represents the moles of liquid added to the stripping section per mole of feed:
  $$q = \frac{\text{Heat required to vaporize 1 mole of feed}}{\text{Molar latent heat of feed}} = \frac{C_{pL}(T_b - T_F) + \lambda}{\lambda}$$
* **Feed Thermal Conditions**:
  * Subcooled liquid: $q > 1$ (slope $> 0$)
  * Saturated liquid (bubble point): $q = 1$ (vertical line, $x = z_F$)
  * Partially vaporized mixture: $0 < q < 1$ (negative slope, $q = 1 - \text{vapor fraction}$)
  * Saturated vapor (dew point): $q = 0$ (horizontal line, $y = z_F$)
  * Superheated vapor: $q < 0$ (positive slope)

3. **Stripping Operating Line (SOL, Equation 17.16)**:
   Mass balance below the feed plate:

![Equation 17.16](images/eq_17_16.png)

$$y_{m+1} = \frac{L_m}{V_m} x_m - \frac{B}{V_m} x_B$$
* Passes through diagonal ($x = x_B, y = x_B$) and the intersection of the ROL with the $q$-line.

---

### 2.2 Operational Limits: Total Reflux vs. Minimum Reflux

![Total Reflux (Minimum Stages)](images/fig_17_6.png)

![Minimum Reflux (Infinite Stages)](images/fig_17_7.png)

#### 2.2.1 Total Reflux ($R \to \infty$, Minimum Theoretical Stages $N_{min}$)
Operating lines collapse onto the $45^\circ$ diagonal ($y = x$). Minimum stages is evaluated analytically via the **Fenske equation** (Equation 17.8):

![Equation 17.8](images/eq_17_8.png)

$$N_{min} = \frac{\ln\left[ \left(\frac{x_D}{1 - x_D}\right) \left(\frac{1 - x_B}{x_B}\right) \right]}{\ln \alpha_{avg}}$$

#### 2.2.2 Minimum Reflux Ratio ($R_{min}$, Infinite Stages)
Occurs when the ROL and SOL intersect directly on the VLE equilibrium curve (Figure 17.7), creating a **"pinch point"** where driving force $\Delta y \to 0$ requiring infinite stages:

![Equation 17.17](images/eq_17_17.png)

$$\frac{R_{min}}{R_{min} + 1} = \frac{x_D - y'}{x_D - x'}$$
* **Economic Optimum Reflux Ratio**: Operating between **$1.10\ R_{min}$ and $1.30\ R_{min}$** balances annual capital cost of column trays against utility steam and cooling water bills.

---

## 3. Multicomponent Shortcut Sizing: The FUG Method

For mixtures of $C \ge 3$ components, the **Fenske-Underwood-Gilliland (FUG)** shortcut method provides rapid stage and reflux estimates.

### 3.1 Step 1: Minimum Stages (Fenske Equation, Eq 17.8)
Evaluated between light key ($LK$) and heavy key ($HK$):
$$N_{min} = \frac{\ln\left[ \left(\frac{d_{LK}}{b_{LK}}\right) \left(\frac{b_{HK}}{d_{HK}}\right) \right]}{\ln \alpha_{LK,HK}}$$

### 3.2 Step 2: Minimum Reflux Ratio (Underwood Equations, Eq 17.9–17.11)
Find root $\theta$ lying between relative volatilities of the keys ($\alpha_{HK} < \theta < \alpha_{LK}$):

![Equation 17.9](images/eq_17_9.png)

$$\sum_{i=1}^C \frac{\alpha_i z_{F,i}}{\alpha_i - \theta} = 1 - q$$

Calculate $R_{min}$:

![Equation 17.10](images/eq_17_10.png)

$$R_{min} + 1 = \sum_{i=1}^C \frac{\alpha_i x_{D,i}}{\alpha_i - \theta}$$

### 3.3 Step 3: Actual Theoretical Stages (Gilliland Correlation)
Relates stage ratio $(N - N_{min})/(N + 1)$ to reflux ratio $(R - R_{min})/(R + 1)$:

![Gilliland Correlation Chart](images/fig_17_18.png)

![Equation 17.18a](images/eq_17_18a.png)

$$\frac{N - N_{min}}{N + 1} = 1 - \exp\left[ \left(\frac{1 + 54.4 X}{11 + 117.2 X}\right) \left(\frac{X - 1}{X^{0.5}}\right) \right] \quad \text{where } X = \frac{R - R_{min}}{R + 1}$$

### 3.4 Step 4: Optimum Feed Stage Location (Kirkbride Equation)
$$\ln\left(\frac{N_R}{N_S}\right) = 0.206 \ln\left[ \left(\frac{z_{HK}}{z_{LK}}\right) \left(\frac{x_{B,LK}}{x_{D,HK}}\right)^2 \left(\frac{B}{D}\right) \right]$$

---

## 4. Plate Hydraulic Design (Sieve & Valve Trays)

Trays must operate stably inside a defined hydraulic envelope bounded by severe physical malfunctions:

![Liquid and Vapor Flow on a Cross-Flow Plate](images/fig_17_23.png)

![Sieve Plate Geometry](images/fig_17_24.png)

![Valve Plate Geometry](images/fig_17_26.png)

![Plate Operating Limits Envelope](images/fig_17_33.png)

### 4.1 Plate Operating Malfunctions:
1. **Jet Flooding (Entrainment)**: Vapor velocity exceeds droplet fallout velocity; liquid droplets are swept upward to the tray above, destroying concentration gradients.
2. **Weeping**: Vapor velocity through tray orifices drops too low to support the liquid head; liquid dumps directly through perforations, bypassing mass transfer.
3. **Downcomer Backup Choke**: Total tray pressure drop plus downcomer friction forces aerated liquid froth to back up the downcomer and flood the tray above.
4. **Coning**: Extremely low liquid rates allow vapor to blow liquid clear off the tray deck.

---

### 4.2 Column Diameter Calculation via Fair's Flooding Correlation
The maximum allowable vapor velocity prior to flooding is evaluated using **Fair's correlation** (Equations 17.46, 17.47):

#### Step 1: Evaluate Liquid-Vapor Flow Parameter ($F_{LV}$, Equation 17.45):

![Equation 17.45](images/eq_17_45.png)

$$F_{LV} = \left(\frac{L_w}{V_w}\right) \sqrt{\frac{\rho_v}{\rho_L}}$$

#### Step 2: Determine Flooding Capacity Factor ($K_1$, Figure 17.34):

![Fair's Flooding Correlation](images/fig_17_34.png)

Read $K_1$ from Figure 17.34 as a function of tray spacing ($t_t = 0.45 - 0.60\text{ m}$, typical $0.50\text{ m}$ [20 in.]).

#### Step 3: Compute Flooding Velocity ($u_f$, Equation 17.47):

![Equation 17.47](images/eq_17_47.png)

$$u_f = K_1 \sqrt{\frac{\rho_L - \rho_v}{\rho_v}} \left(\frac{\sigma}{0.02}\right)^{0.2}$$

#### Step 4: Calculate Column Cross-Sectional Area ($A_c$) & Diameter ($D_c$):
Set design velocity at **$75\% - 85\%$ of flooding** ($u_v = 0.80 u_f$):
* Net vapor flow area: $A_n = \dot{V}_v / u_v$
* Total column area ($A_c$ with $12\%$ downcomer area): $A_c = A_n / (1 - A_d/A_c) = A_n / 0.88$

![Equation 17.36](images/eq_17_36.png)

$$D_c = \sqrt{\frac{4 A_c}{\pi}}$$

---

### 4.3 Weeping Velocity Check (Equation 17.48)
To prevent weeping, the actual hole vapor velocity $u_h$ must exceed minimum velocity $u_w$:

![Equation 17.48](images/eq_17_48.png)

$$u_h \ge \frac{K_2 - 0.90(25.4 - d_h)}{\rho_v^{0.5}}$$

![Weeping Correlation Factor](images/fig_17_37.png)

Read $K_2$ from Figure 17.37 as a function of $(h_w + h_{ow})$.

---

### 4.4 Total Tray Pressure Drop ($h_t$)
Total plate pressure drop in millimeters of clear liquid is the sum of dry hole loss and aerated liquid pool head:

![Equation 17.49](images/eq_17_49.png)

1. **Dry Plate Drop ($h_d$, Equation 17.49)**:
   $$h_d = 51 \left(\frac{u_h}{C_0}\right)^2 \left(\frac{\rho_v}{\rho_L}\right)$$
   Where $C_0$ is orifice coefficient ($C_0 \approx 0.70 - 0.74$).

2. **Residual Aerated Liquid Head ($h_l$, Equation 17.50)**:
   $$h_l = \beta (h_w + h_{ow})$$
   Where $h_w$ is outlet weir height ($40 - 50\text{ mm}$), $h_{ow}$ is liquid crest over weir ($h_{ow} = 750 [L_w / (\rho_L l_w)]^{2/3}$), and $\beta$ is the aeration factor ($\approx 0.5 - 0.6$).

3. **Total Head Drop**:
   $$h_t = h_d + h_l \quad (\Delta P_{tray} = h_t \rho_L g \times 10^{-3}\ \text{Pa} \approx 0.007 - 0.010\text{ bar/tray})$$

---

### 4.5 Downcomer Backup Check (Figure 17.43, Equation 17.55)
Liquid backs up in the downcomer to overcome plate pressure drop and liquid apron restriction:

![Downcomer Backup Liquid Levels](images/fig_17_43.png)

![Equation 17.55](images/eq_17_55.png)

$$h_b = h_w + h_{ow} + h_t + h_{da}$$
$$\text{Where:}$$
* $h_{da} = 166 (L_{wd} / A_{ap})^2$ = Head loss under downcomer apron
* **Flooding Criterion**:
  $$h_b \le 0.50 (t_t + h_w)$$
  The clear liquid backup must not exceed $50\%$ of the tray spacing plus weir height to prevent aerated froth overflowing onto the tray above!
* **Downcomer Residence Time Check**:
  $$t_r = \frac{A_d h_b \rho_L}{L_w} \ge \mathbf{3.0 - 5.0\text{ seconds}}$$
  (Ensures complete disengagement of entrained vapor bubbles from descending liquid).

---

## 5. Packed Columns: Hydraulic Sizing & Efficiency

Packed columns are preferred for vacuum service (where $\Delta P < 2\text{ mmHg/stage}$ is required to prevent bottom boiling temperature degradation) and small diameters ($D_c < 0.8\text{ m}$).

![Random Packings](images/fig_17_46.png)

![Structured Packing](images/fig_17_47.png)

### 5.1 Generalized Pressure Drop Correlation (GPDC Chart, Figure 17.54)
Packed columns are sized using the Sherwood-Eckert GPDC correlation:

![GPDC Chart for Packed Columns](images/fig_17_54.png)

* **Abscissa (Flow Parameter $F_{LV}$)**:
  $$F_{LV} = \left(\frac{L_w}{V_w}\right) \sqrt{\frac{\rho_v}{\rho_L}}$$
* **Ordinate**:
  $$\frac{u_v^2 F_p}{g} \left(\frac{\rho_v}{\rho_L}\right) f(\mu_L, \rho_L)$$
  Where $F_p$ is the packing factor ($\text{m}^{-1}$, Table 17.2).
* **Operating Limit**: Columns are designed for a pressure drop of **$15 - 50\text{ mm } H_2O / \text{m}$ of packing** ($0.15 - 0.5\text{ kPa/m}$) for atmospheric distillation; **$4 - 10\text{ mm } H_2O / \text{m}$** for vacuum service.

### 5.2 Height Equivalent to a Theoretical Plate (HETP)
Total packed bed height:
$$Z = N_{theoretical} \times HETP$$
* Standard structured packing: $HETP \approx 0.35 - 0.50\text{ m}$.
* Standard random packing ($25\text{ mm}$ Pall rings): $HETP \approx 0.50 - 0.75\text{ m}$.
* Packed beds must not exceed $6 - 8\text{ m}$ height without an intermediate **liquid redistributor** (Figures 17.57–17.64) to counteract liquid wall channelling.

---

## 6. Visualcheme Implementation Architecture

1. **State Variables**: Model stage profiles with temperature $T(n)$, pressure $P(n)$, liquid composition $\mathbf{x}(n)$, vapor composition $\mathbf{y}(n)$, liquid flow $L(n)$, vapor flow $V(n)$, downcomer backup $h_b(n)$, and percent flooding.
2. **Interactive Visualization Gradients**:
   * *Interactive McCabe-Thiele Step Stepper*: Live drawing of equilibrium curve, ROL, SOL, and stepped theoretical stages dynamically reacting to reflux slider changes.
   * *Column Hydraulic Profile (Flooding & Weeping HUD)*: Tray-by-tray vertical heatmap showing local vapor velocity relative to Fair's limit and weeping threshold.
   * *Downcomer Backup Warning Panel*: Visual warning when $h_b > 0.5 t_t$, predicting column dump or flooding.
3. **Preset Scenarios**:
   * *Deethanizer Fractionator*: 30 sieve trays, high-pressure hydrocarbon fractionation, Fair's rating.
   * *Methanol-Water Packed Column*: Vacuum distillation, structured packing with GPDC evaluation.
"""

with open('.agents/skills/che-distillation-columns/SKILL.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("che-distillation-columns/SKILL.md updated successfully!")
