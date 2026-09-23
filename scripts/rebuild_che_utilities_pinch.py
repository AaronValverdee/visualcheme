import os

skill_file = os.path.join('.agents', 'skills', 'che-utilities-pinch', 'SKILL.md')

content = r"""---
name: che-utilities-pinch
description: >-
  Comprehensive chemical engineering skill for site utilities (steam, cooling water, refrigeration,
  thermal fluids, power) and energy integration using Pinch Analysis (Composite Curves, Grand
  Composite Curve, Problem Table Algorithm, Heat Exchanger Network synthesis, and capital-energy
  tradeoffs). Use when modeling, designing, or teaching utility systems, energy recovery, and
  thermal integration in Visualcheme.
---

# Utilities and Energy Efficient Design (Pinch Analysis)

This skill provides an authoritative, detailed, textbook-grounded reference on site utilities and energy integration, based directly on Chapter 3 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 114–169).

---

## 1. Process Utilities

Process plants require energy inputs to heat, cool, compress, pump, and separate materials. The major utilities include electricity, steam, cooling water, air cooling, refrigeration, thermal fluids, compressed air, and inert gases.

### 1.1 Electricity & Power Generation
* **Power Demand Drivers**: Pumping liquids, compressing gases, driving agitators, solids transport, and electric heating (used only when very high temperatures $> 400^\circ\text{C}$ or strict cleanliness are required, as electricity is typically 2–3 times more expensive per unit energy than fuel-fired heat).
* **Voltage Levels**: Taken from national/regional grid or generated on site:
  * High voltage ($11\text{ kV} - 132\text{ kV}$): Primary incoming site feeds.
  * Medium voltage ($3.3\text{ kV} - 6.6\text{ kV}$): Large motors ($> 200\text{ kW}$), major compressors, feed pumps.
  * Low voltage ($400\text{ V} - 480\text{ V}$ 3-phase, $220\text{ V} - 240\text{ V}$ single-phase): General motor drives, lighting, control instrumentation.
* **Large Drivers**: On large sites, consider driving large compressors and pumps directly with steam turbines or gas turbines rather than electric motors to avoid double conversion losses.

---

### 1.2 Steam Systems & Boiler Feed Water
Steam is the most universal heating medium in the chemical process industry due to its high latent heat, high condensation heat transfer coefficient, non-toxicity, and precise temperature control via pressure regulation.

![Steam System Distribution](images/fig_3_2.png)

#### 1.2.1 Steam Distribution Headers
Industrial sites operate multiple common steam distribution headers:
1. **High-Pressure (HP) Steam**: 30 to 50 bar ($230 - 265^\circ\text{C}$). Generated in primary fuel-fired boilers and waste-heat boilers. Used for high-temperature process heating and power generation via back-pressure turbines.
2. **Medium-Pressure (MP) Steam**: 10 to 20 bar ($180 - 215^\circ\text{C}$). Exhaust from HP back-pressure turbines or letdown stations. Primary heating utility for distillation column reboilers and reactors.
3. **Low-Pressure (LP) Steam**: 2.5 to 5 bar ($130 - 155^\circ\text{C}$). Exhaust from MP turbines. Used for light reboilers, preheaters, vacuum ejectors, tank heating, and tracing.

#### 1.2.2 Boiler Feed Water (BFW) Treatment
Raw water contains dissolved salts (calcium, magnesium, silica) and dissolved gases ($O_2, CO_2$) that cause severe scaling, tube burnout, and corrosion.
* **Treatment Train**: Coagulation/filtration $\rightarrow$ Demineralization (ion exchange or reverse osmosis) $\rightarrow$ Deaeration (stripping $O_2$ and $CO_2$ with steam down to $< 0.005\text{ mg/L}$) $\rightarrow$ Chemical dosing (oxygen scavengers such as hydrazine/sodium sulfite, and pH alkalization with amines/phosphates).
* **Boiler Blowdown**: Continuous purge ($1-5\%$ of feed rate) to maintain total dissolved solids (TDS) within boiler manufacturer limits.

#### 1.2.3 Steam Cost and Pricing Formulation
The economic value of steam depends on fuel cost, boiler efficiency, and boiler feed water treatment cost:

![Equation 3.1](images/eq_3_1.png)

$$\text{Where:}$$
* $P_{HPS}$ = Price of High-Pressure Steam (\$/metric ton or \$/GJ)
* $P_F$ = Price of fuel on lower heating value (LHV) basis (\$/GJ)
* $dH_b$ = Enthalpy added to water in the boiler ($H_{steam} - h_{BFW}$, typically $\approx 2.7 - 2.9\text{ MJ/kg}$)
* $\eta_B$ = Boiler thermal efficiency (typically $0.80 - 0.85$ based on LHV)
* $P_{BFW}$ = Cost of treated boiler feed water (\$/metric ton)

---

### 1.3 Cooling Water Systems & Towers
Water absorbs waste process heat and rejects it to the ambient atmosphere via evaporative cooling towers.

![Cooling Water System](images/fig_3_3.png)

#### 1.3.1 Operating Conditions
* **Supply Temperature**: $20^\circ\text{C}$ to $30^\circ\text{C}$ (dependent on ambient wet-bulb temperature).
* **Return Temperature**: Maximum $45^\circ\text{C}$ to $50^\circ\text{C}$ to prevent heavy calcium carbonate scaling on exchanger surfaces.
* **Cooling Water Range ($\Delta T_{cw}$)**: Temperature rise across process coolers, typically $\Delta T_{cw} = T_{return} - T_{supply} = 10^\circ\text{C}$ to $15^\circ\text{C}$.
* **Approach to Wet-Bulb**: $\Delta T_{approach} = T_{supply} - T_{wb}$, typically $3^\circ\text{C}$ to $5^\circ\text{C}$.

#### 1.3.2 Psychrometric Evaluation of Evaporative Limits
The lowest temperature to which water can be cooled evaporatively is the **ambient wet-bulb temperature ($T_{wb}$)**, evaluated using the psychrometric chart:

![Psychrometric Chart](images/fig_3_4.png)

#### 1.3.3 Cooling Tower Water Balances & Makeup
Water is lost through three mechanisms:
1. **Evaporation Loss ($\dot{m}_{evap}$)**: Latent heat of vaporization ($\approx 2450\text{ kJ/kg}$) dissipates the heat load:
   $$\dot{m}_{evap} \approx 0.0018 \times \dot{m}_{circulation} \times \Delta T_{cw} \quad (^\circ\text{C})$$
   (Approximately $1\%$ of circulation flow evaporates for every $5.5^\circ\text{C}$ of cooling).
2. **Drift (Windage) Loss ($\dot{m}_{drift}$)**: Entrained water droplets carried away in plume: $\approx 0.05\% - 0.2\%$ of circulation flow.
3. **Blowdown ($\dot{m}_{bd}$)**: Purge to maintain cycles of concentration ($COC = C_{basin} / C_{makeup} \approx 3 - 7$):
   $$\dot{m}_{bd} = \frac{\dot{m}_{evap}}{COC - 1}$$
4. **Total Makeup**: $\dot{m}_{makeup} = \dot{m}_{evap} + \dot{m}_{drift} + \dot{m}_{bd}$.

---

### 1.4 Air-Cooled Heat Exchangers (Fin-Fans)
Used when water is scarce, expensive, or to reduce effluent discharge.
* **Operating Range**: Process fluids can be cooled to within $15^\circ\text{C} - 20^\circ\text{C}$ of ambient dry-bulb temperature (rarely cools below $40^\circ\text{C} - 45^\circ\text{C}$ in summer).
* **Construction**: Finned tubes (aluminum fins wrapped or extruded on steel tubes, extending surface area by $15 - 25\times$) with large induced-draft or forced-draft axial fans.
* **Design Rule**: Design for the $95\%$ or $99\%$ summer dry-bulb temperature from meteorological tables.

---

### 1.5 Refrigeration Systems
Required when process temperatures must be maintained below what can be achieved economically with cooling water or air (i.e. temperatures below $35^\circ\text{C}$, and especially below $0^\circ\text{C}$).

![Refrigeration Cycle](images/fig_3_5.png)

#### 1.5.1 The Mechanical Vapor Compression Cycle
A closed loop circulating a volatile working fluid (refrigerant):
1. **Evaporator**: Refrigerant boils at low pressure and low temperature $T_e$, absorbing latent heat from the process stream:
   $$\dot{Q}_c = \dot{m}_{ref} (h_1 - h_4)$$
2. **Compressor**: Vapor is compressed from low pressure $P_e$ to high pressure $P_c$, requiring shaft work:
   $$\dot{W}_s = \frac{\dot{m}_{ref} (h_2 - h_1)}{\eta_{is}}$$
3. **Condenser**: High-pressure vapor condenses at $T_c$, rejecting heat to cooling water or ambient air:
   $$\dot{Q}_h = \dot{m}_{ref} (h_2 - h_3)$$
4. **Expansion Valve**: Saturated/subcooled liquid expands isenthalpically across an expansion valve to the evaporator pressure, flashing into a cold liquid-vapor mixture:
   $$h_4 = h_3$$

#### 1.5.2 Coefficient of Performance (COP) Equations
The efficiency of a refrigeration cycle is defined by the Coefficient of Performance (COP):

![Equation 3.2](images/eq_3_2.png)

For an ideal reverse Carnot cycle operating between absolute temperatures $T_e$ and $T_c$ (Kelvin):

![Equation 3.3](images/eq_3_3.png)

* **Real Refrigeration Cycle Efficiency**:
  $$\text{COP}_{actual} \approx (0.6 \text{ to } 0.9) \times \text{COP}_{Carnot}$$
  * Simple single-stage cycles achieve $\approx 0.6 \times \text{COP}_{Carnot}$.
  * Multi-stage, economized, and cascaded cycles achieve up to $0.85 - 0.90 \times \text{COP}_{Carnot}$.

#### 1.5.3 Refrigerant Selection by Temperature Level
* **Chilled Water / Air Conditioning ($0^\circ\text{C} \text{ to } 10^\circ\text{C}$)**: R-134a, R-1234yf, Water (lithium bromide absorption).
* **Medium Refrigeration ($-35^\circ\text{C} \text{ to } 0^\circ\text{C}$)**: Ammonia (R-717, high latent heat, industry standard for non-hydrocarbon plants), Propane (R-290).
* **Low-Temperature Refrigeration ($-100^\circ\text{C} \text{ to } -35^\circ\text{C}$)**: Ethane (R-170), Ethylene (R-1150), Cascaded propylene/ethylene systems.
* **Cryogenic ($< -150^\circ\text{C}$)**: Methane, Nitrogen, Helium.

---

### 1.6 Thermal Fluids (Hot Oil Systems)
When process heating is required between $200^\circ\text{C}$ and $400^\circ\text{C}$, steam requires excessively high pressures ($> 100\text{ bar}$ at $310^\circ\text{C}$).
* **Solution**: Circulating synthetic organic or silicone thermal oils (e.g. Therminol, Dowtherm) in a liquid closed loop at near-atmospheric pressure ($2 - 5\text{ bar}$).
* **Caution**: Thermal degradation occurs above $350 - 400^\circ\text{C}$; requires low watt-density heaters, nitrogen blanketing on expansion tanks, and leak containment (thermal fluids are combustible).

### 1.7 Compressed Air & Inert Gas
* **Instrument Air**: Clean, oil-free air compressed to $6 - 8\text{ bar}$ gauge and dried via regenerative desiccant dryers to a pressure dew point of $-40^\circ\text{C}$ to prevent freezing/sticking in pneumatic control valves.
* **Plant (Utility) Air**: General service air for air tools and cleaning.
* **Nitrogen Systems**: Purity $99.5 - 99.99\%$. Sourced from bulk liquid cryogenic tanks or on-site Pressure Swing Adsorption (PSA) / hollow-fiber membrane units. Used for reactor purging, pipeline pigging, and tank blanketing.

---

## 2. Energy Recovery Technologies

### 2.1 Direct Process-to-Process Heat Exchange
The most cost-effective energy recovery method: exchanging heat directly between hot effluent streams that require cooling and cold feed streams that require heating.

### 2.2 Waste-Heat Boilers (WHB)
Hot exhaust gas streams ($> 300^\circ\text{C}$) from chemical reactors, sulfur burners, reform furnaces, or incinerators generate steam:

![Waste Heat Boilers](images/fig_3_8.png)

* **Fire-Tube Boilers**: Hot gas inside tubes, water on shell side. Compact, low cost; best for clean gases at moderate pressures.
* **Water-Tube Boilers**: Water/steam inside tubes, hot gas on shell side. Essential for dirty/dusty gases, high gas volumes, or steam pressures $> 30\text{ bar}$.

### 2.3 Heat Pumps & Mechanical Vapor Recompression (MVR)
A heat pump upgrades low-temperature waste heat to a higher, usable temperature using mechanical compression.

![Heat Pump Schemes](images/fig_3_12.png)

#### 2.3.1 Heat Pump Coefficient of Performance
The heating COP is related to the refrigeration COP:

![Equation 3.4](images/eq_3_4.png)

$$\text{COP}_{HP} = \frac{\text{Heat Delivered}}{\text{Shaft Work Input}} = \text{COP}_{refrig} + 1 = \frac{T_h}{T_h - T_c}$$

* **Economic Rule of Thumb**: Heat pumps are only economically viable when the temperature lift is small:
  $$\Delta T_{lift} = T_h - T_c \le 20^\circ\text{C} \text{ to } 30^\circ\text{C}$$
  If $\Delta T_{lift} > 35^\circ\text{C}$, electricity consumption is too large compared to the value of the upgraded heat.

### 2.4 Cogeneration / Combined Heat and Power (CHP)
Generates electricity and steam simultaneously:

![Cogeneration Plant](images/fig_3_1.png)

* **Gas Turbine with Heat Recovery Steam Generator (HRSG)**: Fuel combusted in gas turbine to generate power; exhaust gas ($450 - 550^\circ\text{C}$) enters an HRSG with supplementary firing to generate HP/MP steam. Total cycle thermal efficiencies reach $75\% - 85\%$.

---

## 3. Pinch Analysis & Heat Exchanger Network Synthesis

Pinch Analysis (developed by Bodo Linnhoff and coworkers) is a rigorous thermodynamic methodology that establishes energy performance targets **before** designing the heat exchanger network.

### 3.1 Stream Data Extraction & Heat Capacity Flowrate
For every process stream requiring heating or cooling:
* Supply temperature ($T_s$)
* Target temperature ($T_t$)
* Enthalpy change ($\Delta H$) or heat capacity flowrate ($CP$):

![Equation 3.5](images/eq_3_5.png)

$$CP = \dot{m} C_p = \frac{\Delta H}{|T_t - T_s|} \quad [\text{kW}/^\circ\text{C}]$$

#### Benchmark 4-Stream Problem (from Textbook Table 3.1):

![Table 3.1](images/tab_3_1.png)

* **Stream 1 (Hot)**: $CP = 3.0\text{ kW}/^\circ\text{C}$, $T_s = 180^\circ\text{C}$, $T_t = 60^\circ\text{C}$, $\Delta H = 360\text{ kW}$
* **Stream 2 (Hot)**: $CP = 1.0\text{ kW}/^\circ\text{C}$, $T_s = 150^\circ\text{C}$, $T_t = 30^\circ\text{C}$, $\Delta H = 120\text{ kW}$
* **Stream 3 (Cold)**: $CP = 2.0\text{ kW}/^\circ\text{C}$, $T_s = 20^\circ\text{C}$, $T_t = 135^\circ\text{C}$, $\Delta H = 230\text{ kW}$
* **Stream 4 (Cold)**: $CP = 4.5\text{ kW}/^\circ\text{C}$, $T_s = 80^\circ\text{C}$, $T_t = 140^\circ\text{C}$, $\Delta H = 270\text{ kW}$
* *Total Heat Available (Hot)* = $480\text{ kW}$; *Total Heat Required (Cold)* = $500\text{ kW}$.

---

### 3.2 Composite Curves & Minimum Temperature Approach ($\Delta T_{min}$)
Constructed by plotting cumulative heat load against temperature for all hot streams combined (Hot Composite Curve) and all cold streams combined (Cold Composite Curve).

![Composite Curves Construction](images/fig_3_14.png)

![Composite Curves Sliding](images/fig_3_15.png)

1. The curves are plotted on $T-H$ coordinates.
2. The cold curve is slid horizontally toward the hot curve until the closest vertical distance equals the specified **$\Delta T_{min}$**.
3. **The Pinch Point**: The point of closest approach where $T_{hot} - T_{cold} = \Delta T_{min}$.
4. **Energy Targets**:
   * **$Q_{H,min}$**: Enthalpy overshoot of cold curve at top = Minimum Hot Utility Target.
   * **$Q_{C,min}$**: Enthalpy overshoot of hot curve at bottom = Minimum Cold Utility Target.
   * **Overlap Region**: Maximum possible process-to-process heat recovery.

---

### 3.3 The 3 Golden Rules of Pinch Design
The pinch divides the process into two thermodynamically distinct zones:
* **Above the Pinch**: An **Energy Sink** (net heat deficit = $Q_{H,min}$).
* **Below the Pinch**: An **Energy Source** (net heat surplus = $Q_{C,min}$).

> [!IMPORTANT]
> **The 3 Inviolable Rules**:
> 1. **Do NOT transfer heat across the pinch**: If heat $Q_{cross}$ crosses the pinch:
>    $$Q_H = Q_{H,min} + Q_{cross}, \quad Q_C = Q_{C,min} + Q_{cross}$$
>    Both hot and cold utility usage increase by the exact cross-pinch amount!
> 2. **No Cold Utility Above the Pinch**: Using a cooler above the pinch requires extra hot utility to make up the deficit.
> 3. **No Hot Utility Below the Pinch**: Using a heater below the pinch requires extra cooling utility to reject the surplus.

---

### 3.4 The Problem Table Algorithm (Algebraic Formulation)
The algebraic method to find the exact pinch point and utility targets without graphical error.

#### Step 1: Shifted Temperatures
Shift all temperatures by $\Delta T_{min}/2$:
* Hot streams: $T^* = T - \frac{\Delta T_{min}}{2}$
* Cold streams: $t^* = t + \frac{\Delta T_{min}}{2}$

#### Step 2: Rank Shifted Temperatures into Intervals
Sort distinct $T^*$ in descending order ($T_1^* > T_2^* > \dots > T_{n+1}^*$).

![Problem Table Data](images/tab_3_2.png)

#### Step 3: Interval Enthalpy Balances
For each temperature interval $i$:
$$\Delta H_i = (T_i^* - T_{i+1}^*) \left[ \sum CP_{cold} - \sum CP_{hot} \right]_i$$

![Heat Cascade Formulation](images/tab_3_3.png)

#### Step 4: Heat Cascade
Cascade heat through intervals assuming zero hot utility ($R_0 = 0$):
$$R_i = R_{i-1} - \Delta H_i$$

![Feasible Cascade Table](images/tab_3_4.png)

* Find the most negative heat residual: $R_{min} = \max(0, -R_i)$.
* Set the hot utility input to $Q_{H,min} = R_{min}$.
* Recalculate the cascade:
  * **Pinch Point**: The temperature where $R_i = 0$.
  * **Cold Utility Target**: The final exit heat $Q_{C,min} = R_n$.

---

### 3.5 The Grand Composite Curve (GCC)
Plots net heat flow from the feasible cascade against shifted temperature $T^*$:

![Grand Composite Curve](images/fig_3_17.png)

![GCC Utility Integration](images/fig_3_18.png)

* **Pockets**: Regions where heat can be cascaded internally without external utilities.
* **Utility Selection**: Identifies where LP, MP, and HP steam, flue gas, cooling water, and refrigeration can be matched to maximize low-cost utility usage.

---

### 3.6 Heat Exchanger Network (HEN) Synthesis on the Grid Diagram
Design is carried out on a **Grid Diagram** representing streams as horizontal lines:
* Hot streams on top running left to right (red).
* Cold streams on bottom running right to left (blue).
* The Pinch is drawn as a vertical dividing line.

![Grid Diagram Layout](images/fig_3_20.png)

![Exchanger Network Matching](images/fig_3_21.png)

#### 3.6.1 Minimum Number of Units (Euler's Network Target)
The minimum number of heat exchanger units $U_{min}$ is calculated separately above and below the pinch:

![Equation 3.6](images/eq_3_6.png)

$$U_{min} = N_{streams} + N_{utilities} - 1$$
$$U_{min,total} = U_{min,above} + U_{min,below}$$

#### 3.6.2 The $CP$ Inequality Rules at the Pinch
To ensure feasible temperature driving forces ($\Delta T \ge \Delta T_{min}$) that expand away from the pinch:
* **Immediately Above the Pinch**:
  $$CP_{hot} \le CP_{cold}$$
  (The hot stream temperature must drop slower than the cold stream temperature rises).
* **Immediately Below the Pinch**:
  $$CP_{hot} \ge CP_{cold}$$

#### 3.6.3 Stream Splitting
If a stream cannot satisfy the $CP$ rule, it must be split into parallel branches ($CP = CP_a + CP_b$) such that each branch satisfies the $CP$ inequality.

#### 3.6.4 Loop Breaking & Energy Relaxation
A network designed strictly at $U_{min,above} + U_{min,below}$ often contains redundant loops:
* Identify closed heat exchanger loops.
* Break a loop by removing the smallest exchanger ($Q_{unit} \rightarrow 0$) and reallocating heat around the loop.
* Relaxing $\Delta T_{min}$ slightly trades off a minor utility increase for the complete elimination of a capital heat exchanger unit.

![Loop Breaking Scheme](images/fig_3_26.png)

---

### 3.7 Area Targeting & Capital-Energy Tradeoff
The minimum required total network surface area can be targeted prior to design using the **Bath Formula**:

![Equation 3.7](images/eq_3_7.png)

$$A_{min} = \sum_{intervals} \frac{1}{\Delta T_{lm,i}} \left[ \sum_{hot} \frac{q_{j,i}}{h_j} + \sum_{cold} \frac{q_{k,i}}{h_k} \right]$$
where $h_j, h_k$ are stream film heat transfer coefficients.

![Optimum Approach Temperature Trade-off](images/fig_3_28.png)

* **Economic Optimization**: Total annualized cost = Annualized Capital Cost (Area, Shells) + Annual Operating Cost (Steam, Power, Cooling Water).
* The minimum point on the curve defines the optimal $\Delta T_{min,opt}$ (typically $10 - 20^\circ\text{C}$ for chemical plants).

---

## 4. Energy Management in Unsteady / Batch Processes

Batch processes feature non-coincident heating and cooling demands over time.

### 4.1 Time-Slice Modeling
The batch schedule is divided into discrete time intervals where temperatures and flowrates are constant, allowing pinch analysis within each slice.

### 4.2 Thermal Energy Storage (Sensible & Latent)
When hot streams and cold streams occur at different times, waste heat is captured in an intermediate storage medium (stratified water tanks, hot oil, or phase-change materials - PCMs):

![Equation 3.8](images/eq_3_8.png)

![Equation 3.9](images/eq_3_9.png)

![Equation 3.10](images/eq_3_10.png)

$$\text{Where:}$$
* $Q_s = \int_{t_1}^{t_2} \dot{Q}(t) dt$ = Stored heat over operating cycle
* $V_{storage} = \frac{Q_s}{\rho C_p \Delta T_{storage}}$ = Required storage volume
* Heat loss rate to ambient: $\dot{Q}_{loss} = U A (T_{storage} - T_{ambient})$

---

## 5. Visualcheme Didactic & Visual Architecture

When implementing the Pinch & Utilities module in Visualcheme:
1. **Interactive Hot/Cold Composite Curve Viewer**:
   * Drag $\Delta T_{min}$ slider and watch the composite curves slide, updating $Q_{H,min}$, $Q_{C,min}$, and $A_{min}$ in real time at 60 FPS.
2. **Interactive Problem Table Algorithm Calculator**:
   * Step through the temperature intervals, showing the shifted enthalpy balance and the heat cascade residuals dynamically.
3. **Pinch Violation Visual Alert**:
   * On the Grid Diagram, flag any user-placed heat exchanger that transfers heat across the vertical pinch line with a pulsing red highlight showing the exact double energy penalty ($+\Delta Q_H, +\Delta Q_C$).
4. **Grand Composite Curve Utility Level Matching**:
   * Allow users to drag horizontal utility lines (LP steam, cooling water, chilled water) onto the GCC to see how utilities fit into the process pockets.
"""

with open(skill_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully rebuilt {skill_file} with complete textbook fidelity!")
