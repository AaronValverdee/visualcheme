import os

content = r"""---
name: che-utilities-pinch
description: >-
  Comprehensive chemical engineering skill for site utilities and energy integration
  from Chapter 3 of Towler & Sinnott: steam distribution headers (HP, MP, LP), BFW treatment,
  fuel-to-steam costing, cooling towers, psychrometric chart, refrigeration vapor compression
  cycles, and Pinch Analysis (Composite Curves, Grand Composite Curve, Problem Table Algorithm,
  grid diagrams, HEN synthesis above/below pinch, capital-energy tradeoff) for Visualcheme.
---

# Utilities and Energy Efficient Design (Pinch Analysis)

This skill provides an authoritative, textbook-grounded reference on industrial site utilities and thermal energy integration, based directly on Chapter 3 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 114–169).

---

## 1. Process Utilities

Industrial chemical processes require utilities to supply heat at high temperatures, remove waste heat at low temperatures, and deliver shaft power.

### 1.1 Electricity & Combined Heat and Power (Cogeneration)
Electricity is typically 2.5 to 3.5 times more expensive per unit energy than fuel-fired heat.
* **Cogeneration / Combined Heat and Power (CHP)**: Generates high-pressure steam in a fuel-fired boiler and expands it through a back-pressure steam turbine to drive an electric generator or process compressor, exhausting steam into the medium- or low-pressure process headers (Figure 3.1).

![Cogeneration Cycle](images/fig_3_1.png)

---

### 1.2 Steam Systems & Boiler Feed Water (BFW)
Steam is the most widely used industrial heating medium due to its high latent heat of vaporization ($\approx 2100 - 2300\text{ kJ/kg}$), constant condensing temperature at fixed pressure, non-toxicity, and high film heat transfer coefficient ($h \approx 6000 - 15000\text{ W/m}^2\cdot\text{K}$).

![Steam System Distribution](images/fig_3_2.png)

#### 1.2.1 Standard Industrial Steam Headers (Table 3.1):
| Steam Header | Typical Pressure Range | Saturation Temperature | Primary Process Applications |
| :--- | :--- | :--- | :--- |
| **High-Pressure (HP)** | **$30 - 50\text{ bar}$ ($450 - 750\text{ psig}$)** | **$235 - 265^\circ\text{C}$** | Direct-fired boiler generation; major turbine drivers; high-temperature reboilers. |
| **Medium-Pressure (MP)**| **$10 - 20\text{ bar}$ ($150 - 300\text{ psig}$)** | **$180 - 215^\circ\text{C}$** | Turbine exhaust; primary distillation reboilers; reactor heating jackets. |
| **Low-Pressure (LP)** | **$2.5 - 5\text{ bar}$ ($35 - 75\text{ psig}$)** | **$130 - 155^\circ\text{C}$** | General reboilers, preheaters, tank heating, pipe tracing, vacuum ejectors. |

#### 1.2.2 Boiler Feed Water Treatment
Raw water contains calcium, magnesium, silica, and dissolved gases ($O_2, CO_2$) that cause severe tube scaling, foaming, and oxygen pitting corrosion.
* **Treatment Sequence**: Filtration $\rightarrow$ Demineralization (Ion Exchange / Reverse Osmosis) $\rightarrow$ Thermal Deaeration (stripping $O_2$ down to $< 0.005\text{ mg/L}$ with LP steam) $\rightarrow$ Chemical Scavenging (hydrazine or sodium sulfite) and pH alkalization.
* **Boiler Blowdown**: Continuous water purge ($1\% - 5\%$ of feed rate) to control Total Dissolved Solids (TDS).

#### 1.2.3 Steam Cost and Pricing Formulation (Equation 3.1)
The marginal manufacturing cost of high-pressure steam is given by:

![Equation 3.1](images/eq_3_1.png)

$$P_{HPS} = \frac{P_F \cdot \Delta H_b}{\eta_B} + P_{BFW}$$
$$\text{Where:}$$
* $P_{HPS}$ = Price of high-pressure steam (\$/metric ton or \$/GJ)
* $P_F$ = Price of fuel on lower heating value (LHV) basis (\$/GJ)
* $\Delta H_b$ = Enthalpy added to water in boiler ($H_{steam} - h_{BFW}$, typically $2.7 - 2.9\text{ MJ/kg}$)
* $\eta_B$ = Boiler thermal efficiency (typically $0.80 - 0.85$ on LHV basis)
* $P_{BFW}$ = Cost of treated boiler feed water (\$/metric ton)

---

### 1.3 Cooling Water Systems & Evaporative Cooling Towers
Process heat is rejected to ambient air via circulating cooling water and an evaporative cooling tower:

![Cooling Water System](images/fig_3_3.png)

#### 1.3.1 Operating Conditions (Table 3.2):
* **Supply Temperature**: Typically $20^\circ\text{C} - 30^\circ\text{C}$ (dependent on ambient wet-bulb temperature).
* **Return Temperature**: Maximum $45^\circ\text{C} - 50^\circ\text{C}$ (higher temperatures cause severe calcium carbonate tube scaling).
* **Cooling Water Range**: $\Delta T_{cw} = T_{return} - T_{supply} = 10^\circ\text{C} - 15^\circ\text{C}$.
* **Approach to Wet-Bulb**: $\Delta T_{approach} = T_{supply} - T_{wb} = 3^\circ\text{C} - 5^\circ\text{C}$.

#### 1.3.2 Psychrometric Limits
The lowest temperature to which water can be cooled by evaporative contact with air is the **ambient wet-bulb temperature ($T_{wb}$)**, evaluated using the psychrometric chart (Figure 3.4):

![Psychrometric Chart](images/fig_3_4.png)

#### 1.3.3 Tower Water Balances & Makeup Water Requirement
1. **Evaporation Loss ($\dot{m}_{evap}$)**: Latent heat of vaporization dissipates heat load:
   $$\dot{m}_{evap} \approx 0.0018 \cdot \dot{m}_{circ} \cdot \Delta T_{cw}\ (^\circ\text{C})$$
   (Approximately $1\%$ of circulating water evaporates per $5.5^\circ\text{C}$ of cooling).
2. **Drift (Windage) Loss ($\dot{m}_{drift}$)**: Entrained droplets: $\approx 0.05\% - 0.2\%$ of circulation rate.
3. **Blowdown ($\dot{m}_{bd}$)**: Purge to maintain cycles of concentration ($COC = C_{basin} / C_{makeup} \approx 3 - 7$):
   $$\dot{m}_{bd} = \frac{\dot{m}_{evap}}{COC - 1}$$
4. **Total Makeup**: $\dot{m}_{makeup} = \dot{m}_{evap} + \dot{m}_{drift} + \dot{m}_{bd}$.

---

### 1.4 Refrigeration Systems
Required when process streams must be cooled below what can be achieved economically with cooling water or ambient air (i.e. temperatures below $35^\circ\text{C}$, and especially below $0^\circ\text{C}$).

![Refrigeration Cycle](images/fig_3_5.png)

#### 1.4.1 Mechanical Vapor Compression Cycle
* **Evaporator**: Refrigerant evaporates at low temperature $T_e$, absorbing heat: $\dot{Q}_c = \dot{m}_{ref} (h_1 - h_4)$.
* **Compressor**: Elevates pressure from $P_e$ to $P_c$: $\dot{W}_s = \dot{m}_{ref} (h_2 - h_1) / \eta_{is}$.
* **Condenser**: Rejects heat to cooling water or air at $T_c$: $\dot{Q}_h = \dot{m}_{ref} (h_2 - h_3)$.
* **Expansion Valve**: Isenthalpic flash across valve: $h_4 = h_3$.

#### 1.4.2 Coefficient of Performance (COP) Equations (Equations 3.2 and 3.3)
The thermodynamic efficiency is defined by the Coefficient of Performance:

![Equation 3.2](images/eq_3_2.png)

$$COP = \frac{\text{Heat Absorbed in Evaporator}}{\text{Net Work Input}} = \frac{\dot{Q}_c}{\dot{W}_s} = \frac{h_1 - h_4}{h_2 - h_1}$$

For an ideal reverse Carnot cycle operating between absolute temperatures $T_e$ and $T_c$ (Kelvin):

![Equation 3.3](images/eq_3_3.png)

$$COP_{Carnot} = \frac{T_e}{T_c - T_e}$$
* Real industrial compression cycles achieve $COP_{actual} \approx 0.55 - 0.70 \times COP_{Carnot}$.
* For large temperature lifts, multi-temperature staged refrigeration (Figure 3.8) reduces compressor shaft power.

---

## 2. Pinch Analysis & Heat Exchanger Network (HEN) Synthesis

Pinch Analysis is a rigorous thermodynamic methodology developed by Bodo Linnhoff to optimize industrial heat recovery and determine minimum external utility requirements prior to designing heat exchanger networks.

### 2.1 Hot and Cold Composite Curves (Figure 3.14)
All process streams requiring cooling ("hot streams") and all streams requiring heating ("cold streams") are combined into two single composite curves on a Temperature-Enthalpy ($T-H$) coordinate plane:

![Hot and Cold Composite Curves](images/fig_3_14.png)

* Within any temperature interval, the composite slope is:
  $$\frac{d T}{d H} = \frac{1}{\sum CP_i} = \frac{1}{\sum \dot{m}_i C_{p,i}}$$
* **The Process Pinch Point**: The hot and cold curves are shifted horizontally until their closest vertical approach equals the specified minimum temperature approach ($\Delta T_{min}$, typically $10^\circ\text{C} - 20^\circ\text{C}$). The location of closest approach is the **Pinch Point** (Figure 3.15).

![Shifting Composite Curves for Utility Targets](images/fig_3_15.png)

* **Minimum Utility Targets**:
  * **$Q_{H,min}$**: Minimum hot utility (steam/furnace fuel) required at top of system.
  * **$Q_{C,min}$**: Minimum cold utility (cooling water/refrigeration) required at bottom.
  * **$Q_{rec,max}$**: Maximum internal process-to-process heat recovery.

---

### 2.2 The Grand Composite Curve (GCC) (Figure 3.17)
The Grand Composite Curve plots net heat deficit versus shifted temperature ($T^* = T - \Delta T_{min}/2$ for hot streams; $T^* = T + \Delta T_{min}/2$ for cold streams):

![Grand Composite Curve](images/fig_3_17.png)

* At the Pinch, the net heat flow is exactly zero ($H = 0$).
* **Utility Selection on the GCC (Figure 3.18)**:
  * Shows exact temperature levels and heat duties for multi-level steam (HP, MP, LP) and cooling utilities to minimize operating cost without violating process pinch constraints.

![Utility Integration on the GCC](images/fig_3_18.png)

---

### 2.3 The Three Golden Rules of Pinch Design
1. **Never transfer heat across the pinch!** (Transferring heat $Q_{cross}$ across the pinch increases hot utility by $Q_{cross}$ AND increases cold utility by $Q_{cross}$, creating double penalty).
2. **Never use hot utilities below the pinch!** (Heat below the pinch cannot be absorbed by the process and must ultimately be dumped into cooling water).
3. **Never use cold utilities above the pinch!** (Heat removed above the pinch must be replaced by additional steam).

---

### 2.4 Heat Exchanger Network Grid Diagram (Figure 3.20)
HEN synthesis is performed on a grid diagram where hot streams run left-to-right (top) and cold streams run right-to-left (bottom):

![Grid Diagram](images/fig_3_20.png)

#### 2.4.1 Matching Rules at the Pinch (Figure 3.21):
To ensure temperatures diverge away from the pinch and avoid $\Delta T < \Delta T_{min}$:

![Above and Below Pinch Design Rules](images/fig_3_21.png)

* **Immediately Above the Pinch**:
  $$CP_{hot} \le CP_{cold}$$
  (If a hot stream has $CP_{hot} > CP_{cold}$, it must be split into parallel branches until the condition is satisfied).
* **Immediately Below the Pinch**:
  $$CP_{hot} \ge CP_{cold}$$
  (If a cold stream has $CP_{cold} > CP_{hot}$, it must be split).

---

### 2.5 Capital-Energy Tradeoff & Optimum $\Delta T_{min}$ (Figure 3.26)
Choosing $\Delta T_{min}$ involves an economic optimization:

![Capital Energy Tradeoff](images/fig_3_26.png)

* Small $\Delta T_{min}$ ($5^\circ\text{C}$): Low utility fuel consumption, but very large heat exchanger surface area ($A \propto 1/\Delta T$) and high capital cost.
* Large $\Delta T_{min}$ ($30^\circ\text{C}$): Low exchanger area and cheap capital cost, but high recurring fuel bills.
* **Optimum $\Delta T_{min}$**: Typically **$10^\circ\text{C} - 20^\circ\text{C}$** for chemical petrochemical processes; **$3^\circ\text{C} - 5^\circ\text{C}$** for low-temperature refrigeration systems.

---

### 2.6 Distillation Column Integration Across the Pinch (Figure 3.28)
A distillation column acts as a heat engine taking heat into the reboiler at $T_{reb}$ and rejecting heat at the condenser at $T_{cond}$:

![Distillation Column Integration Across the Pinch](images/fig_3_28.png)

* **Correct Placement**:
  * *Entirely Above the Pinch*: Reboiler and condenser both above pinch. Heat rejected by condenser is absorbed by cold process streams!
  * *Entirely Below the Pinch*: Reboiler heat is supplied by hot process streams!
* **Incorrect Placement (Spanning the Pinch)**: Reboiler above pinch (consuming steam) and condenser below pinch (dumping to cooling water) provides zero energy integration benefit and wastes exergy.

---

## 3. Visualcheme Implementation Architecture

1. **State Variables**: Model process utility networks with steam pressures/temperatures ($P, T, h$), cooling water circulation ($\dot{m}_{cw}, T_{supply}, T_{return}$), and heat stream parameters ($\dot{m}, C_p, T_{in}, T_{out}, CP$).
2. **Interactive Visualization Gradients**:
   * *Interactive Composite Curve Plotter*: Dynamic $T-H$ diagram updating pinch temperature and minimum utility bars as user alters stream flows.
   * *Grid Diagram Drag-and-Drop*: Interactive exchanger placement widget enforcing the $CP_{hot} \le CP_{cold}$ above-pinch matching rule.
   * *Grand Composite Curve Utility Shading*: Color-coded utility blocks (HP steam red, LP steam orange, cooling water blue, refrigeration cyan) demonstrating energy targeting.
3. **Preset Scenarios**:
   * *Aromatics Plant Pinch Analysis*: 4 hot streams, 3 cold streams, $\Delta T_{min} = 15^\circ\text{C}$.
   * *Cooling Tower Water Balance*: $500\text{ m}^3/\text{h}$ circulation, $\Delta T = 12^\circ\text{C}$, $COC = 5$.
"""

with open('.agents/skills/che-utilities-pinch/SKILL.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("che-utilities-pinch/SKILL.md updated successfully!")
