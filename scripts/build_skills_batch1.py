import pymupdf
import os
import re
from extract_helpers import crop_figure

doc = pymupdf.open('Chemical Engineering Design, Principles, Second Edition.pdf')

# -------------------------------------------------------------
# 1. che-utilities-pinch (Chapter 3: Utilities and Energy Efficient Design)
# -------------------------------------------------------------
skill_dir_1 = os.path.join('.agents', 'skills', 'che-utilities-pinch')
img_dir_1 = os.path.join(skill_dir_1, 'images')
os.makedirs(img_dir_1, exist_ok=True)

print("Extracting Chapter 3 figures...")
crop_figure(doc, 3, 1, os.path.join(img_dir_1, 'fig_3_1_cogeneration.png'))
crop_figure(doc, 3, 2, os.path.join(img_dir_1, 'fig_3_2_steam_system.png'))
crop_figure(doc, 3, 3, os.path.join(img_dir_1, 'fig_3_3_cooling_water.png'))
crop_figure(doc, 3, 4, os.path.join(img_dir_1, 'fig_3_4_psychrometric_chart.png'))
crop_figure(doc, 3, 5, os.path.join(img_dir_1, 'fig_3_5_refrigeration_cycle.png'))
crop_figure(doc, 3, 14, os.path.join(img_dir_1, 'fig_3_14_composite_curves.png'))
crop_figure(doc, 3, 17, os.path.join(img_dir_1, 'fig_3_17_grand_composite_curve.png'))
crop_figure(doc, 3, 20, os.path.join(img_dir_1, 'fig_3_20_grid_diagram.png'))

skill_content_1 = """---
name: che-utilities-pinch
description: >-
  Chemical engineering guide for site utilities (steam, cooling water, refrigeration)
  and energy integration using Pinch Analysis (Composite Curves, Grand Composite Curve,
  Problem Table Algorithm, and Heat Exchanger Network synthesis). Use when designing,
  modeling, or teaching utility systems, energy recovery, and thermal integration in Visualcheme.
---

# Utilities and Energy Efficient Design (Pinch Analysis)

This skill provides chemical engineering fundamentals, design procedures, heuristics, and mathematical formulations for process utilities and energy integration, based on *Chemical Engineering Design* (Chapter 3).

---

## 1. Process Utilities

Chemical processes require heat addition (hot utilities) and heat removal (cold utilities), power, and water.

### 1.1 Steam Systems
Steam is the most widely used heating medium because of its high latent heat of vaporization, high heat-transfer coefficients during condensation, and non-toxicity.

![Steam System Distribution](images/fig_3_2_steam_system.png)

* **Steam Header Pressure Levels**:
  * **High Pressure (HP)**: 30 to 50 bar ($230 - 265^\\circ\\text{C}$) - used for high-temperature process heating and power generation via back-pressure turbines.
  * **Medium Pressure (MP)**: 10 to 20 bar ($180 - 215^\\circ\\text{C}$) - primary process heating (reboilers, reactors).
  * **Low Pressure (LP)**: 2.5 to 5 bar ($130 - 155^\\circ\\text{C}$) - low-temperature reboilers, preheaters, building heating.
* **Thermal Duty Calculation**:
  $$\\dot{Q}_{steam} = \\dot{m}_{steam} \\Delta H_{vap}(P_{sat})$$
* **Boiler Efficiency**: Typically 80% to 85% based on Lower Heating Value (LHV) of fuel.

### 1.2 Cooling Water Systems
Cooling water absorbs waste process heat and rejects it to the atmosphere via evaporative cooling towers.

![Cooling Water System](images/fig_3_3_cooling_water.png)

* **Key Parameters**:
  * **Supply Temperature**: Typically $25^\\circ\\text{C}$ to $30^\\circ\\text{C}$ (depending on ambient climate).
  * **Return Temperature**: Max $45^\\circ\\text{C}$ to $50^\\circ\\text{C}$ (to prevent scaling and calcium carbonate precipitation).
  * **Temperature Rise ($\\Delta T_{cw}$)**: Typically $10^\\circ\\text{C}$ to $15^\\circ\\text{C}$.
  * **Approach to Wet-Bulb**: $\\Delta T_{approach} = T_{cw,supply} - T_{wb}$, typically $3^\\circ\\text{C}$ to $5^\\circ\\text{C}$.
* **Psychrometric Evaluation**:
  Evaporative cooling limit is governed by the ambient wet-bulb temperature ($T_{wb}$), evaluated via the psychrometric chart:

![Psychrometric Chart](images/fig_3_4_psychrometric_chart.png)

* **Water Losses**:
  * Evaporation loss: $\\dot{m}_{evap} \\approx 0.0018 \\times \\dot{m}_{cw} \\times \\Delta T_{cw}$ ($^\\circ\\text{C}$).
  * Drift / Windage loss: 0.1% to 0.2% of circulation rate.
  * Blowdown: $\\dot{m}_{bd} = \\frac{\\dot{m}_{evap}}{\\text{Cycles of Concentration} - 1}$ (Cycles typically 3 to 7).

### 1.3 Refrigeration Systems
Used when process cooling is required below $35^\\circ\\text{C}$ (where cooling water is ineffective).

![Refrigeration Cycle](images/fig_3_5_refrigeration_cycle.png)

* **Mechanical Vapor Compression Cycle**:
  1. **Evaporator**: Refrigerant absorbs heat at low $T_e, P_e$: $\\dot{Q}_c = \\dot{m}_{ref} (h_1 - h_4)$.
  2. **Compressor**: Vapor compressed to high $P_c$: $\\dot{W}_s = \\dot{m}_{ref} (h_2 - h_1) / \\eta_{is}$.
  3. **Condenser**: Heat rejected to cooling water/air at $T_c, P_c$: $\\dot{Q}_h = \\dot{m}_{ref} (h_2 - h_3)$.
  4. **Expansion Valve (Joule-Thomson isenthalpic expansion)**: $h_4 = h_3$.
* **Coefficient of Performance (COP)**:
  $$\\text{COP} = \\frac{\\dot{Q}_c}{\\dot{W}_s} \\le \\frac{T_e}{T_c - T_e}$$

### 1.4 Cogeneration (Combined Heat and Power - CHP)
Generates electricity and useful thermal energy simultaneously, achieving total thermal efficiencies of 75-85%.

![Cogeneration Plant](images/fig_3_1_cogeneration.png)

---

## 2. Pinch Analysis & Heat Integration Fundamentals

Pinch Analysis determines the thermodynamically optimal heat recovery network prior to designing individual heat exchangers.

### 2.1 Stream Definitions
* **Hot Streams**: Must be cooled from supply temperature $T_s$ to target temperature $T_t$ (releases heat $\\Delta H < 0$).
* **Cold Streams**: Must be heated from supply temperature $t_s$ to target temperature $t_t$ (absorbs heat $\\Delta H > 0$).
* **Heat Capacity Flowrate ($CP$)**:
  $$CP = \\dot{m} \\cdot C_p \\quad [\\text{kW}/^\\circ\\text{C}]$$
  $$\\Delta H = CP \\cdot (T_{target} - T_{supply})$$

### 2.2 Composite Curves (CC)
Constructed by plotting cumulative enthalpy ($H$) against temperature ($T$) for all hot streams combined and all cold streams combined.

![Composite Curves](images/fig_3_14_composite_curves.png)

* **Minimum Temperature Approach ($\\Delta T_{min}$)**: The closest vertical distance between the Hot and Cold Composite Curves.
  * Determines the economic trade-off: small $\\Delta T_{min} \\rightarrow$ low energy cost, high capital cost (large heat exchanger area).
  * Typical chemical plant $\\Delta T_{min}$: $10^\\circ\\text{C}$ to $20^\\circ\\text{C}$ for liquids, $20^\\circ\\text{C}$ to $40^\\circ\\text{C}$ for gases.
* **Energy Targets**:
  * **$Q_{H,min}$ (Minimum Hot Utility Target)**: Enthalpy deficit at the top of the curve.
  * **$Q_{C,min}$ (Minimum Cold Utility Target)**: Enthalpy excess at the bottom of the curve.

### 2.3 The Pinch Point & The Golden Rules of Pinch Design
The point where $T_{hot} - T_{cold} = \\Delta T_{min}$ defines the **Pinch Point**. It divides the process into two independent thermodynamic systems:
1. **Above the Pinch**: An energy sink (requires net heat input $Q_{H,min}$).
2. **Below the Pinch**: An energy source (rejects net heat to cold utility $Q_{C,min}$).

> [!IMPORTANT]
> **The 3 Inviolable Pinch Rules**:
> 1. **Do NOT transfer heat across the pinch**: Crossing the pinch by $Q_{cross}$ increases both hot utility and cold utility by $Q_{cross}$:
>    $$Q_H = Q_{H,min} + Q_{cross}, \\quad Q_C = Q_{C,min} + Q_{cross}$$
> 2. **No Cold Utility Above the Pinch**: Do not use cooling water or refrigeration above the pinch.
> 3. **No Hot Utility Below the Pinch**: Do not use steam or fired heating below the pinch.

### 2.4 The Grand Composite Curve (GCC)
Plots the net heat deficit or surplus against shifted temperature $T^* = T \\pm \\frac{\\Delta T_{min}}{2}$.

![Grand Composite Curve](images/fig_3_17_grand_composite_curve.png)

* Identifies optimal utility temperature levels (e.g. matching LP vs MP steam, flue gas, cooling water, and refrigeration).

### 2.5 Heat Exchanger Network (HEN) Synthesis & Grid Diagram
HEN design is conducted on a **Grid Diagram**, where hot streams run left-to-right (top) and cold streams run right-to-left (bottom).

![Grid Diagram HEN](images/fig_3_20_grid_diagram.png)

* **Design Matching Criteria at the Pinch**:
  * **Immediately Above the Pinch**:
    $$CP_{hot} \\le CP_{cold}$$
    (to ensure temperature driving forces expand away from the pinch).
  * **Immediately Below the Pinch**:
    $$CP_{hot} \\ge CP_{cold}$$
* **Minimum Number of Exchangers ($N_{min}$)**:
  $$N_{min} = (N_{streams} + N_{utilities} - 1)_{above} + (N_{streams} + N_{utilities} - 1)_{below}$$

---

## 3. Didactic Implementation in Visualcheme

When building the energy and utility visualizer in Visualcheme:
1. **Interactive Composite Curves**:
   * Allow users to slide $\\Delta T_{min}$ horizontally and watch the Hot and Cold Composite curves shift, displaying immediate real-time trade-off between $Q_{H,min}$, $Q_{C,min}$, and total required surface area $A_{total}$.
2. **Pinch Violation Detector**:
   * If a user connects a cooler above the pinch or a heater below the pinch in the grid diagram, trigger an immediate visual warning showing the resulting exergy destruction and wasted utility penalty.
3. **Utility Heatmaps**:
   * Shading streams and heat exchangers by thermodynamic temperature level and exergy content ($Ex = \\Delta H - T_0 \\Delta S$).
"""

with open(os.path.join(skill_dir_1, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_1)
print(f"Created {os.path.join(skill_dir_1, 'SKILL.md')}")

# -------------------------------------------------------------
# 2. che-process-simulation (Chapter 4: Process Simulation)
# -------------------------------------------------------------
skill_dir_2 = os.path.join('.agents', 'skills', 'che-process-simulation')
img_dir_2 = os.path.join(skill_dir_2, 'images')
os.makedirs(img_dir_2, exist_ok=True)

print("Extracting Chapter 4 figures...")
crop_figure(doc, 4, 1, os.path.join(img_dir_2, 'fig_4_1_sm_vs_eo.png'))
crop_figure(doc, 4, 4, os.path.join(img_dir_2, 'fig_4_4_thermo_tree_1.png'))
crop_figure(doc, 4, 5, os.path.join(img_dir_2, 'fig_4_5_thermo_tree_2.png'))
crop_figure(doc, 4, 7, os.path.join(img_dir_2, 'fig_4_7_flash_drum.png'))
crop_figure(doc, 4, 23, os.path.join(img_dir_2, 'fig_4_23_wegstein_tear.png'))

skill_content_2 = """---
name: che-process-simulation
description: >-
  Comprehensive chemical engineering skill for flowsheet simulation architecture,
  thermodynamic property model selection decision trees (Equations of State vs Activity Coefficients),
  recycle convergence (Wegstein, Newton-Raphson), and isothermal/adiabatic flash solvers (Rachford-Rice).
  Use when building or evaluating simulation engines and backend thermodynamic solvers.
---

# Process Simulation & Thermodynamic Modeling

This skill details the architecture, mathematical algorithms, convergence techniques, and thermodynamic selection principles used in modern chemical process simulators (such as DWSIM, Aspen Plus, and Visualcheme), based on *Chemical Engineering Design* (Chapter 4).

---

## 1. Flowsheet Simulation Architectures

Process simulators solve heat, mass, and momentum balances for networks of unit operations.

![Sequential Modular vs Equation Oriented](images/fig_4_1_sm_vs_eo.png)

### 1.1 Sequential Modular (SM) Architecture
* **Approach**: Units are solved sequentially, stream-by-stream, following process flow direction. Each unit operation is a self-contained computational module (subroutine).
* **Pros**: Modular, robust, intuitive physical debugging, reliable convergence for individual units.
* **Cons**: Recycle loops require iterative guessing and tearing; optimization and parameter design specs require nested loops.

### 1.2 Equation-Oriented (EO) Architecture
* **Approach**: All unit equations, physical property models, and connectivity equations are assembled into one large sparse system of nonlinear algebraic equations:
  $$\\mathbf{f}(\\mathbf{x}) = \\mathbf{0}$$
* **Solver**: Solved simultaneously using sparse Newton-Raphson or SQP (Successive Quadratic Programming).
* **Pros**: Rapid convergence for complex recycles, seamless optimization.
* **Cons**: Highly sensitive to initial guesses; failure to converge leaves no intermediate results.

---

## 2. Selection of Physical Property Models

Choosing the incorrect thermodynamic model is the most common cause of catastrophic failure in chemical process simulation.

### 2.1 The Thermodynamic Selection Decision Trees

![Thermodynamic Selection Tree 1](images/fig_4_4_thermo_tree_1.png)

![Thermodynamic Selection Tree 2](images/fig_4_5_thermo_tree_2.png)

### 2.2 Model Categories and Applications

| Property Package Type | Key Equations | Recommended Systems | Limitations |
| :--- | :--- | :--- | :--- |
| **Equations of State (EOS)** | **Peng-Robinson (PR)**, **Soave-Redlich-Kwong (SRK)** | Hydrocarbons, refinery gases, light gases ($H_2, N_2, CO_2$), high-pressure gas processing. | Poor for polar liquids, azeotropes, and electrolyte systems. |
| **Activity Coefficient Models** | **NRTL**, **UNIQUAC**, **Wilson**, **Van Laar** | Highly non-ideal liquid mixtures (alcohols, water, aromatics, ketones), azeotropic distillation. | Valid only at low-to-moderate pressures ($P < 10\\text{ bar}$). Gas phase modeled separately (ideal or RK). |
| **Predictive Activity** | **UNIFAC** (Group Contribution) | Mixtures lacking experimental binary interaction parameters ($k_{ij}$). | Approximate; not reliable for precise sizing near pinch points. |
| **Specialized Packages** | **Steam Tables (IAPWS-95)**, **Electrolyte NRTL**, **Sour Water** | Dedicated utility water/steam, acid gases ($H_2S, NH_3$), strong electrolyte salts. | Narrow chemical scope. |

---

## 3. Vapor-Liquid Equilibrium (VLE) & Flash Calculations

At thermodynamic equilibrium:
$$\\mu_{i,V} = \\mu_{i,L} \\iff f_{i,V} = f_{i,L} \\iff y_i \\phi_{i,V} P = x_i \\gamma_i P_{i}^{sat} \\phi_{i}^{sat} \\exp\\left(\\frac{V_{i,L} (P - P_i^{sat})}{RT}\\right)$$
Defining the equilibrium $K$-value:
$$K_i = \\frac{y_i}{x_i} = \\frac{\\gamma_i P_i^{sat} \\varphi_{i}^{sat}}{\\phi_{i,V} P}$$

![Flash Drum Operation](images/fig_4_7_flash_drum.png)

### 3.1 The Rachford-Rice Formulation (Isothermal Flash)
Given feed composition $z_i$ and specified $T, P$:
1. Compute equilibrium constants $K_i(T, P)$.
2. Overall and component mass balance:
   $$F z_i = L x_i + V y_i = (F - V) x_i + V K_i x_i$$
   $$x_i = \\frac{z_i}{1 + \\psi (K_i - 1)}, \\quad y_i = \\frac{K_i z_i}{1 + \\psi (K_i - 1)}$$
   where $\\psi = V / F$ is the molar vapor fraction.
3. Summation constraint $\\sum y_i - \\sum x_i = 0$ yields the **Rachford-Rice Equation**:
   $$f(\\psi) = \\sum_{i=1}^C \\frac{z_i (K_i - 1)}{1 + \\psi (K_i - 1)} = 0$$
4. Monotonic derivative ensures guaranteed Newton-Raphson convergence:
   $$f'(\\psi) = -\\sum_{i=1}^C \\frac{z_i (K_i - 1)^2}{[1 + \\psi (K_i - 1)]^2} < 0$$
   $$\\psi^{(k+1)} = \\psi^{(k)} - \\frac{f(\\psi^{(k)})}{f'(\\psi^{(k)})}$$

---

## 4. Convergence of Recycle Loops

In processes with material or energy recycle, a "tear stream" is chosen to break the cycle.

![Recycle Tear Stream Convergence](images/fig_4_23_wegstein_tear.png)

### 4.1 Convergence Algorithms
* **Successive Substitution (Direct Iteration)**:
  $$x^{(k+1)} = g(x^{(k)})$$
  Stable but slow; diverges if $|\partial g / \partial x| > 1$.
* **Wegstein Acceleration Method**:
  Extrapolates next guess using secant slope $s = \\frac{g(x^{(k)}) - g(x^{(k-1)})}{x^{(k)} - x^{(k-1)}}$:
  $$x^{(k+1)} = q \\cdot x^{(k)} + (1 - q) g(x^{(k)}), \\quad q = \\frac{s}{s - 1}$$
  Accelerates convergence dramatically. Bounds on $q$ (typically $-5 \\le q \\le 0$) prevent instability.
* **Broyden / Quasi-Newton**:
  Updates an approximation of the inverse Jacobian matrix without recomputing full partial derivatives.

---

## 5. Visualcheme Pedagogical Integration

1. **Live Flash Inspector**:
   * Allow users to vary feed $T$ and $P$ and watch the Rachford-Rice objective function $f(\\psi)$ dynamically find its root $\\psi \\in [0, 1]$, displaying liquid and vapor stream compositions instantly.
2. **Property Package Comparison Mode**:
   * Allow users to toggle between Ideal (Raoult's Law), Peng-Robinson, and NRTL for an Ethanol-Water or Benzene-Toluene mixture to observe how neglecting non-ideality causes massive sizing errors.
"""

with open(os.path.join(skill_dir_2, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_2)
print(f"Created {os.path.join(skill_dir_2, 'SKILL.md')}")

# -------------------------------------------------------------
# 3. che-instrumentation-control (Chapter 5: Instrumentation & Control)
# -------------------------------------------------------------
skill_dir_3 = os.path.join('.agents', 'skills', 'che-instrumentation-control')
img_dir_3 = os.path.join(skill_dir_3, 'images')
os.makedirs(img_dir_3, exist_ok=True)

print("Extracting Chapter 5 figures...")
crop_figure(doc, 5, 1, os.path.join(img_dir_3, 'fig_5_1_pid_symbols.png'))
crop_figure(doc, 5, 4, os.path.join(img_dir_3, 'fig_5_4_basic_loops.png'))
crop_figure(doc, 5, 6, os.path.join(img_dir_3, 'fig_5_6_cascade_control.png'))
crop_figure(doc, 5, 9, os.path.join(img_dir_3, 'fig_5_9_ratio_control.png'))
crop_figure(doc, 5, 11, os.path.join(img_dir_3, 'fig_5_11_valve_characteristics.png'))

skill_content_3 = """---
name: che-instrumentation-control
description: >-
  Chemical engineering guide to Piping and Instrumentation Diagrams (P&IDs), process control loops
  (feedback, cascade, ratio, split-range), sensor placement, and control valve sizing/characteristics.
  Use when designing dynamic interactive unit controls and instrument overlays in Visualcheme.
---

# Instrumentation and Process Control

This skill details process instrumentation symbology, feedback and advanced control architectures, and control valve selection, based on *Chemical Engineering Design* (Chapter 5).

---

## 1. P&ID Symbology (ISA Standard)

Process and Instrumentation Diagrams (P&IDs) represent the physical equipment, piping, sensors, and control elements.

![P&ID Standard Symbols](images/fig_5_1_pid_symbols.png)

### 1.1 Instrument Tag Identification (Letter Codes)
* **First Letter (Measured Variable)**:
  * **T**: Temperature, **P**: Pressure, **F**: Flow rate, **L**: Level, **A**: Composition / Analysis, **d/P**: Differential Pressure.
* **Succeeding Letters (Function)**:
  * **I**: Indicator, **R**: Recorder, **C**: Controller, **T**: Transmitter, **V**: Valve, **A**: Alarm (LAH = Level Alarm High).
* *Example*: **TIC-101** = Temperature Indicating Controller in loop 101.

---

## 2. Basic and Advanced Control Architectures

![Basic Feedback Control Loops](images/fig_5_4_basic_loops.png)

### 2.1 Standard Feedback Control
Compares process variable ($PV$) against setpoint ($SP$) to compute error $e(t) = SP - PV$, adjusting manipulated variable ($MV$) via PID algorithm:
$$u(t) = K_c \\left[ e(t) + \\frac{1}{\\tau_I} \\int_0^t e(\\tau) d\\tau + \\tau_D \\frac{de(t)}{dt} \\right]$$

### 2.2 Cascade Control
Used when disturbances occur in the manipulated variable line or when the primary process has a large time lag (e.g. heating a reactor or reboiler).

![Cascade Control](images/fig_5_6_cascade_control.png)

* **Primary (Master) Controller**: Measures primary variable (e.g. reactor temperature $T$).
* **Secondary (Slave) Controller**: Measures auxiliary intermediate variable (e.g. steam flow $F_{steam}$ or jacket temperature) and directly manipulates the valve.
* Secondary loop must be substantially faster than the master loop (rule of thumb: $\\tau_{slave} \\le 0.2 \\tau_{master}$).

### 2.3 Ratio Control
Maintains a fixed ratio $R = F_B / F_A$ between two streams (e.g. reactants in a stoichiometric reactor, or reflux-to-feed in distillation).

![Ratio Control](images/fig_5_9_ratio_control.png)

### 2.4 Control Valve Characteristics & Selection

![Control Valve Characteristics](images/fig_5_11_valve_characteristics.png)

* **Valve Flow Coefficient ($C_v$)**:
  $$Q = C_v \\sqrt{\\frac{\\Delta P_{valve}}{SG}}$$
* **Inherent Characteristics**:
  1. **Linear**: Flow fraction $m$ is directly proportional to stem lift $x$: $m = x$. (Best for level control and systems where pressure drop across valve is constant).
  2. **Equal Percentage**: Equal increments of stem travel produce equal percentage changes in flow: $\\frac{dm}{dx} = \\alpha m \\implies m = R^{x-1}$. (Industry workhorse; compensates for varying pipeline pressure drops).
  3. **Quick Opening**: High flow achieved at small lift. (Used for on/off safety and relief isolation).
* **Failure Modes**:
  * **Fail Closed (FC / Air-to-Open)**: Fuel gas to furnaces, feed to exothermic reactors.
  * **Fail Open (FO / Air-to-Close)**: Cooling water to reactors, relief vent lines.
"""

with open(os.path.join(skill_dir_3, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_3)
print(f"Created {os.path.join(skill_dir_3, 'SKILL.md')}")

# -------------------------------------------------------------
# 4. che-equipment-specification (Chapter 13: Equipment Specification)
# -------------------------------------------------------------
skill_dir_4 = os.path.join('.agents', 'skills', 'che-equipment-specification')
os.makedirs(skill_dir_4, exist_ok=True)

skill_content_4 = """---
name: che-equipment-specification
description: >-
  Chemical engineering standard guidelines for equipment sizing heuristics, design margins,
  safety factors, and equipment data sheet specifications. Use when establishing baseline
  design parameters and realistic industrial constraints for unit operations in Visualcheme.
---

# Equipment Selection, Specification, and Design Margins

This skill synthesizes equipment specification principles, design safety margins, and sizing heuristics from *Chemical Engineering Design* (Chapter 13).

---

## 1. General Sizing Procedure & Design Factors

Equipment is never sized for the bare nominal flowsheet balance. Designers apply **Design Margins (Overdesign Factors)** to accommodate:
* Plant debottlenecking and future capacity expansions.
* Off-design feed variations, fouling, and atmospheric temperature swings.
* Control margin (control valves require dynamic pressure drop authority).

### 1.1 Recommended Standard Design Margins

| Equipment Category | Flow / Capacity Margin | Pressure Margin | Temperature Margin |
| :--- | :--- | :--- | :--- |
| **Pumps & Drivers** | $+10\\%$ to $+20\\%$ on flow; $+10\\%$ on head | Design pressure: $\\max(P_{op} + 1.7\\text{ bar}, 1.10 P_{op})$ | Maximum operating $T + 15^\\circ\\text{C}$ |
| **Compressors** | $+10\\%$ to $+15\\%$ on flow | Settling-out pressure & maximum relief | Discharge $T + 20^\\circ\\text{C}$ |
| **Heat Exchangers** | $+15\\%$ to $+25\\%$ on surface area (fouling allowance) | Minimum 10 bar or $1.10 P_{op}$ | Design for maximum utility source temp |
| **Separation Columns** | Design at $70\\%$ to $85\\%$ of Fair's flood velocity | Minimum 3.5 bar gauge or $1.10 P_{op}$ | Reboiler max temperature $+25^\\circ\\text{C}$ |
| **Pressure Vessels / Drums**| Hold-up surge volume: 5 to 10 min normal; 15 min feed | ASME Section VIII margin: MAWP $> P_{op} + 10\\%$ | $T_{design} = T_{op} + 25^\\circ\\text{C}$ |
| **Piping Systems** | Sized for maximum pump runout or relief | ASME B31.3 flange ratings (150#, 300#, 600#) | Design to match connected vessel |

---

## 2. Equipment Data Sheets

A complete chemical engineering equipment specification requires two sections:
1. **Process Data Sheet**: Filled out by process engineers (flow rates, inlet/outlet states, duties, fluid physical properties, materials recommendation).
2. **Mechanical Data Sheet**: Completed by mechanical/vessel engineers (materials ASTM grades, wall thickness, corrosion allowance, nozzle schedules, structural supports).

---

## 3. Heuristics Summary for Visualcheme Presets

When initializing default parameters in Visualcheme:
* **Liquid Velocities in Pipes**: $1.0 - 2.0\\text{ m/s}$ (pump discharge), $0.5 - 1.0\\text{ m/s}$ (pump suction).
* **Gas/Vapor Velocities**: $15 - 30\\text{ m/s}$ (atmospheric/moderate pressure), $5 - 10\\text{ m/s}$ (vacuum systems).
* **Column Tray Spacing**: Standard $0.45\\text{ m}$ ($18\\text{ in}$) to $0.60\\text{ m}$ ($24\\text{ in}$).
* **Heat Exchanger Tube Sizes**: $19.05\\text{ mm}$ ($3/4\\text{ in}$) or $25.4\\text{ mm}$ ($1\\text{ in}$) OD on triangular or square pitch.
"""

with open(os.path.join(skill_dir_4, 'SKILL.md'), 'w', encoding='utf-8') as f:
    f.write(skill_content_4)
print(f"Created {os.path.join(skill_dir_4, 'SKILL.md')}")

print("Batch 1 completed successfully!")
