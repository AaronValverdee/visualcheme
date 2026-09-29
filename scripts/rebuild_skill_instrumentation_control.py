import os

content = r"""---
name: che-instrumentation-control
description: >-
  Chemical engineering guide to Piping and Instrumentation Diagrams (P&IDs) and process
  control from Chapter 5 of Towler & Sinnott: ISA symbology, feedback, cascade, ratio,
  override, split-range, feedforward loops, control valve characteristics (Linear, Equal %,
  Quick Opening), and complete control schemes for distillation columns and reactors in Visualcheme.
---

# Instrumentation and Process Control (P&ID Symbology & Loop Architecture)

This skill provides an authoritative, textbook-grounded reference on Piping and Instrumentation Diagrams (P&IDs), process control architectures, control valve characteristics, and unit control schemes, based directly on Chapter 5 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 262–285).

---

## 1. Piping and Instrumentation Diagram (P&ID) Symbology

The P&ID (or Engineering Flowsheet) is the master design blueprint of a chemical plant, illustrating all equipment, piping, valves, sensors, controllers, and safety interlocks.

### 1.1 Instrument Tag Identification (ISA Standard S5.1)
Instruments are depicted as balloon circles enclosing a alphanumeric identification code:

![Table 5.1 Instrument Letter Codes](images/tab_5_1.png)

#### Standard Letter Decoding:
* **First Letter (Measured Variable)**:
  * `F` = Flow rate
  * `L` = Liquid level
  * `P` = Pressure
  * `T` = Temperature
  * `A` = Analysis (composition, pH, chromatography)
  * `d` = Differential (e.g. `d P` = Differential pressure)
* **Subsequent Letters (Modifier & Function)**:
  * `I` = Indicator (local readout or control room display)
  * `R` = Recorder (historical data logging)
  * `C` = Controller (automatic control algorithm)
  * `T` = Transmitter (converts sensor signal to 4–20 mA or digital bus)
  * `V` = Control valve (final control element)
  * `A` = Alarm (`LAH` = Level Alarm High, `LAL` = Level Alarm Low)
  * `S` = Switch / Solenoid
* **Examples**:
  * `TIC-101`: Temperature Indicating Controller (Loop 101)
  * `FCV-204`: Flow Control Valve (Loop 204)
  * `PAHH-301`: Pressure Alarm High-High (Safety trip loop 301)

---

### 1.2 P&ID Line & Location Symbology (Figure 5.1)
Lines connecting instrument bubbles represent signal transmission media:

![P&ID Symbology](images/fig_5_1.png)

* **Solid Heavy Line**: Primary process fluid pipeline.
* **Solid Thin Line**: Secondary / utility pipeline (cooling water, steam, vent).
* **Double Cross-Hatched Line**: Pneumatic signal line ($3 - 15\text{ psig}$ or $0.2 - 1.0\text{ bar}$).
* **Dashed Line**: Electric signal ($4 - 20\text{ mA}$ analog or $24\text{ V DC}$).
* **Internal Bubble Lines**:
  * *No line inside circle*: Field-mounted instrument (located on pipe or vessel in plant).
  * *Solid horizontal line inside circle*: Board-mounted in main central control room (accessible to operator).
  * *Dashed horizontal line*: Mounted behind control panel (inaccessible to operator).
  * *Square enclosing circle*: Distributed Control System (DCS) / shared display software tag.

---

### 1.3 Control Valve Actuators & Failure Positions (Figure 5.2)
Control valves are driven by pneumatic diaphragm actuators opposing a heavy coil spring:

![Control Valve Failure Positions](images/fig_5_2.png)

* **Fail Closed (FC / Air-to-Open)**:
  * Air pressure drives the diaphragm downward to open the valve; spring pushes the valve shut upon loss of instrument air.
  * *Safety Duty*: Reactor reactant feed lines, fuel gas lines to fired heaters, high-pressure steam supply.
* **Fail Open (FO / Air-to-Close)**:
  * Air pressure drives the valve shut; spring forces valve wide open upon air failure.
  * *Safety Duty*: Reactor cooling water lines, relief depressurizing vents, column bottoms drain lines to prevent vessel flooding.
* **Fail Locked (FL / Fail in Place)**:
  * Pneumatic lockup valve holds the current stem position on air loss (used on critical distillation reflux or compressor anti-surge lines).

---

## 2. Advanced Process Control Loop Architectures

### 2.1 Basic Single-Input Single-Output (SISO) Feedback Control (Figure 5.4)
The classic feedback loop: a sensor measures the controlled variable ($CV$), compares it with the setpoint ($SP$) to generate an error $e(t) = SP - CV$, and a PID algorithm adjusts the manipulated variable ($MV$).

![Basic Feedback Loops](images/fig_5_4.png)

* **Flow Control**: Fast process response ($< 2\text{ seconds}$). Usually PI control (derivative action omitted due to flow turbulence noise).
* **Level Control**: Integrating process. P-only or PI with loose tuning ("averaging level control") to absorb flow surges without upsetting downstream units.
* **Pressure Control**: Fast to moderate response. Vapor space pressure manipulated via overhead vent, condenser coolant flow, or fuel throttling.
* **Temperature Control**: Slow process response with substantial thermal dead time and lag. Full PID control required.

---

### 2.2 Cascade Control (Figures 5.5 and 5.6)
Used when a disturbance enters the manipulated stream before affecting the primary process variable. A primary (master) controller adjusts the setpoint of a secondary (slave) controller:

![Cascade Control of Exchanger](images/fig_5_5.png)

![Cascade Control of Distillation Tray](images/fig_5_6.png)

* **Operating Principle**:
  * *Slave loop (inner)*: Must be fast (e.g. flow control valve `FC`). It immediately measures and rejects supply header pressure fluctuations before they alter the heat transfer rate.
  * *Master loop (outer)*: Slower primary process variable (e.g. process outlet temperature `TC` or column tray temperature). Its output acts as the setpoint to the slave controller: $SP_{FC} = MV_{TC}$.

---

### 2.3 Ratio Control (Figure 5.7)
Maintains a fixed stoichiometric or operational ratio between two flowing streams ($R = F_2 / F_1$):

![Ratio Control](images/fig_5_7.png)

* **Application**: Reactant feeds to a chemical reactor (e.g. hydrogen to benzene ratio); combustion air-to-fuel ratio in fired heaters; blending operations.
* **Architecture**: The uncontrolled "wild" stream flow $F_1$ is measured, multiplied by the desired ratio factor $K$, and passed as the setpoint to the controlled stream flow loop: $SP_{F2} = K \cdot F_1$.

---

### 2.4 Override & High/Low Selector Control (Figure 5.8)
Protects equipment from exceeding safe operating limits during normal control:

![Override Control](images/fig_5_8.png)

* Two or more controllers feed a High-Selector (`HS`) or Low-Selector (`LS`) module, which passes only the most constraining signal to the control valve.
* *Example*: Gas compressor discharge pressure controller normally throttles the discharge valve; if compressor motor amps exceed maximum rating, a current controller overrides the pressure loop to throttle the valve and prevent motor burnout.

---

### 2.5 Split-Range Control (Figure 5.9)
A single controller output ($0\% - 100\%$) operates two or more control valves across different signal ranges:

![Split-Range Control](images/fig_5_9.png)

* **Reactor Thermal Control**:
  * $0\% - 50\%$ controller output: Opens cooling water valve from $100\%$ to $0\%$.
  * $50\%$: Both valves fully closed (deadband).
  * $50\% - 100\%$ controller output: Opens steam heating valve from $0\%$ to $100\%$.
* **Vessel Pressure Blanket Control**:
  * Low pressure ($0\% - 50\%$): Opens nitrogen pad gas supply valve.
  * High pressure ($50\% - 100\%$): Opens flare / vent valve.

---

### 2.6 Feedforward Plus Feedback Control (Figure 5.10)
Measures measurable external disturbances upstream (e.g. sudden feed flow or feed temperature changes) and makes predictive corrections to the manipulated variable before the error appears at the process outlet:

![Feedforward Control](images/fig_5_10.png)

---

## 3. Control Valve Inherent Flow Characteristics

The flow characteristic describes the relationship between valve stem travel ($h$, $0$ to $100\%$) and the volumetric flow capacity ($C_v$):

![Control Valve Characteristics](images/fig_5_11.png)

1. **Linear Characteristic**:
   $$\frac{d Q}{d h} = \text{constant} \implies Q = Q_{max} \cdot h$$
   Flow is directly proportional to stem position.
   * *Best suited for*: Liquid level control where system pressure drop is concentrated entirely across the control valve ($\Delta P_{valve} / \Delta P_{system} > 0.6$).
2. **Equal Percentage (Logarithmic) Characteristic**:
   $$\frac{d Q}{d h} = k Q \implies Q = Q_{max} \cdot R^{h - 1}$$
   Equal increments of stem travel produce equal percentage increases in flow rate (where $R$ is rangeability, typically $30 - 50$).
   * *Best suited for*: Pressure control, heat exchangers, and systems where pipeline frictional pressure drop is large compared to valve pressure drop ($\Delta P_{valve} / \Delta P_{system} < 0.33$). As flow increases and line losses steal pressure drop from the valve, the equal percentage curve linearizes into an effective linear installed characteristic.
3. **Quick Opening Characteristic**:
   Provides maximum flow with small initial stem travel.
   * *Best suited for*: On/off safety relief valves, batch dumping, emergency isolation.

---

## 4. Master Unit Operation Control Schemes

### 4.1 Distillation Column Complete Control Scheme (Figure 5.12)
A continuous binary distillation column possesses 5 degrees of freedom requiring 5 independent control loops:

![Distillation Column Control Scheme](images/fig_5_12.png)

1. **Column Pressure**: Controlled by manipulating overhead condenser cooling water flow, vapor vent, or refrigerant pressure.
2. **Reflux Drum Liquid Level**: Controlled by manipulating distillate product draw ($D$).
3. **Column Sump (Bottoms) Liquid Level**: Controlled by manipulating bottoms product draw ($B$).
4. **Top Composition / Temperature**: Controlled by manipulating reflux flow rate ($L$) cascaded to a sensitive tray temperature near the column top.
5. **Bottom Composition / Temperature**: Controlled by manipulating reboiler steam flow rate ($V$) cascaded to a sensitive stripping tray temperature.

---

### 4.2 Exothermic Chemical Reactor Complete Control Scheme (Figure 5.13)
Maintains stable temperature and conversion while eliminating thermal runaway hazards:

![Reactor Control Scheme](images/fig_5_13.png)

1. **Temperature Cascade**: Primary reactor core temperature controller (`TC`) sets the setpoint of the jacket coolant flow or coolant temperature loop (`FC` or `TC_jacket`).
2. **Feed Ratio Control**: Reactants A and B are metered through a ratio controller to ensure exact stoichiometric consumption.
3. **Emergency Interlock**: High-High temperature alarm (`TAHH`) triggers an automatic safety interlock: trips feed pumps, opens emergency quench, and vents reactor contents to blowout tank.

---

## 5. Visualcheme Implementation Architecture

1. **State Variables**: Model control loops with Setpoint ($SP$), Process Variable ($CV$), Manipulated Output ($MV$, $0\% - 100\%$), Controller Mode (Auto/Manual), and PID tuning parameters ($K_c, \tau_I, \tau_D$).
2. **Interactive Visualization Gradients**:
   * *Control Loop Error Widget*: Visual LED gradient showing tracking error $|SP - CV|$.
   * *Valve Stroke Visualizer*: Animate valve stem travel ($0 - 100\%$) and dynamically recalculate valve $\Delta P$ and cavitation index.
   * *Safety Alarm HUD*: Display flashing high/low alarm annunciators (`LAH`, `PAHH`, `TAL`) when state variables breach operating envelopes.
3. **Preset Scenarios**:
   * *Distillation Column Energy Balance Control*: Dual composition cascade loops.
   * *Batch CSTR Thermal Runaway Prevention*: Split-range jacket cooling/heating with emergency quench trigger.
"""

with open('.agents/skills/che-instrumentation-control/SKILL.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("che-instrumentation-control/SKILL.md updated successfully!")
