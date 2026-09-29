import os

content = r"""---
name: che-equipment-specification
description: >-
  Chemical engineering guide for equipment selection, specification, design margins,
  and engineering data sheets from Chapter 13 of Towler & Sinnott. Covers proprietary vs
  non-proprietary equipment workflows, Table 13.1 Equipment Selection Guide, Table 13.2
  Separation Processes Guide, industry overdesign factors (pumps, exchangers, columns, vessels),
  and standard procurement specification sheets for Visualcheme.
---

# Equipment Selection, Specification, and Design

This skill provides an authoritative, textbook-grounded reference on equipment selection, engineering specification, standard overdesign factors (design margins), and data sheet preparation, based directly on Chapter 13 of *Chemical Engineering Design* (Towler & Sinnott, 2nd Edition, pp. 566–571).

---

## 1. Proprietary vs. Non-Proprietary Process Equipment

Chemical process equipment falls into two distinct engineering categories with fundamentally different design and procurement workflows:

```mermaid
graph TD
    A["Process Equipment"] --> B["Proprietary Equipment<br/>(Standard Commercial Catalog)"]
    A --> C["Non-Proprietary Equipment<br/>(Custom Fabricated / Engineered)"]
    
    B --> B1["Pumps, Compressors, Centrifuges"]
    B --> B2["Standard Plate Exchangers, Filters"]
    B --> B3["Engineered Vendors Provide Sizing & Guarantee"]
    
    C --> C1["Distillation Columns, Knock-out Drums"]
    C --> C2["Shell-and-Tube Heat Exchangers"]
    C --> C3["Chemical Reactors, Storage Vessels"]
    C --> C4["Process Engineer Specifies Full Geometry & Internals"]
```

### 1.1 Proprietary Equipment (Vendor-Engineered Catalog Items)
* **Equipment Types**: Centrifugal pumps, positive-displacement pumps, compressors, blowers, centrifuges, hydrocyclones, proprietary plate heat exchangers, specialized solids handling equipment (rotary drum filters, spray dryers, bagging units).
* **Engineering Workflow**:
  1. The process engineer specifies the required duty, inlet/outlet stream compositions, physical properties, operating temperatures, pressures, and control constraints on a standard specification sheet.
  2. The equipment vendor or specialist manufacturer selects the closest standard frame or model from their manufacturing line and guarantees mechanical and process performance.
  3. Detailed mechanical sizing is performed by the vendor according to proprietary design codes.

### 1.2 Non-Proprietary Equipment (Custom-Fabricated Process Vessels)
* **Equipment Types**: Distillation, absorption, and stripping columns; vertical and horizontal flash separators; gravity decanters; shell-and-tube heat exchangers (TEMA types); jacketed stirred-tank reactors; catalytic tubular reactors; pressure storage vessels.
* **Engineering Workflow**:
  1. The chemical engineer establishes the complete process and hydraulic design: diameter, height, number of stages or packing depth, tray hydraulic layout (hole pitch, weir dimensions), heat transfer surface area, tube count and pitch, nozzle locations, and internals.
  2. The mechanical design engineer calculates wall thicknesses, head geometries (torispherical, elliptical, hemispherical), flange ratings, vessel skirts, and support saddles in accordance with ASME Boiler and Pressure Vessel Code (Section VIII, Division 1 or 2) or BS 5500.
  3. A detailed fabrication drawing and specification package is sent out to custom pressure vessel fabrication shops for bidding.

---

## 2. Master Equipment Selection Guides

### 2.1 Guide to Process Equipment Selection (Table 13.1)
Table 13.1 summarizes the standard chemical engineering selection criteria across all major equipment classes:

![Table 13.1 Equipment Selection Guide](images/tab_13_1.png)

#### Key Selection Heuristics from Table 13.1:
1. **Fluid Transport**:
   * *Liquids*: Centrifugal pumps are default for viscosities $< 100\text{ mPa}\cdot\text{s}$ and flows $> 0.1\text{ m}^3/\text{h}$. Positive displacement (gear, screw, reciprocating) for high viscosities ($> 500\text{ mPa}\cdot\text{s}$) or high-pressure low-flow metering.
   * *Gases*: Centrifugal fans for $\Delta P < 0.03\text{ bar}$; blowers (Roots rotary lobe) for $\Delta P \le 1.0\text{ bar}$; centrifugal compressors for high volumetric flow ($> 1000\text{ m}^3/\text{h}$) up to 50 bar; reciprocating compressors for high discharge pressures ($> 50\text{ bar}$) and moderate flows.
2. **Heat Transfer**:
   * *Shell and Tube (TEMA)*: Universal workhorse for all pressures ($< 1\text{ bar}$ to $> 300\text{ bar}$) and temperatures ($-200^\circ\text{C}$ to $> 600^\circ\text{C}$).
   * *Gasketed Plate*: Preferred for clean fluids, low pressures ($< 20\text{ bar}$), and close approach temperatures ($\Delta T_{approach} < 3^\circ\text{C}$).
   * *Air-Cooled (Fin-Fan)*: Essential when cooling water is unavailable or expensive; best for process temperatures $> 50^\circ\text{C}$.
3. **Mass Transfer & Separation**:
   * *Distillation / Absorption*: Trays (sieve or valve) for large diameters ($D > 1.0\text{ m}$), fouling fluids, or high turn-down requirements. Structured packing for vacuum distillation ($\Delta P < 2\text{ mmHg/stage}$) or diameter $< 0.8\text{ m}$.
4. **Reactors**:
   * *Continuous Stirred Tank (CSTR)*: Liquid phase, slow kinetics ($\tau > 15\text{ min}$), highly exothermic reactions requiring intense agitation and high heat transfer.
   * *Plug Flow Tubular (PFR)*: Fast gas or liquid kinetics, high selectivity requirements, high pressures.

---

### 2.2 Guide to Separation Processes (Table 13.2)
Table 13.2 provides a systematic decision tree for separating mixtures based on the physical phases present:

![Table 13.2 Guide to Separation Processes](images/tab_13_2.png)

#### Master Separation Phase Classification:
* **Gas - Liquid**:
  * *High volatility difference*: Vertical knock-out pot with wire mesh demister pad ($K_{SB} = 0.07 - 0.11\text{ m/s}$).
  * *Low volatility difference*: Continuous fractionation column (distillation).
  * *Soluble gas in inert carrier*: Packed or plate absorption column with chemical or physical solvent.
* **Liquid - Liquid**:
  * *Immiscible liquids ($\Delta \rho > 50\text{ kg/m}^3$)*: Horizontal gravity decanter with light and heavy liquid weirs.
  * *Close density or emulsion*: Centrifugal liquid-liquid separator or coalescing filter.
  * *Miscible liquids*: Distillation, liquid-liquid extraction (LLE), or azeotropic/extractive distillation.
* **Solid - Liquid**:
  * *Fast settling particles ($> 50\ \mu\text{m}$)*: Gravity thickeners, hydrocyclones.
  * *Concentrated slurry*: Rotary vacuum drum filter, plate-and-frame filter press, continuous basket centrifuge.
  * *Fine dilute suspensions*: Cartridge or candle pre-coat filters.
* **Solid - Gas**:
  * *Coarse particles ($> 5\ \mu\text{m}$)*: Stairmand high-efficiency reverse-flow cyclone.
  * *Fine dust ($< 5\ \mu\text{m}$)*: Reverse-jet fabric filter (baghouse) or electrostatic precipitator (ESP).
  * *Corrosive or sticky gases*: Venturi scrubber with water quench.

---

## 3. Standard Design Margins (Overdesign Factors)

Process units must be sized not merely for the nominal average steady-state heat and mass balances, but with explicit **design margins (safety factors)** to accommodate process control fluctuations, feed composition variations, operational fouling, and plant turn-down/ramp-up.

| Equipment Class | Sizing Parameter | Recommended Overdesign Margin | Technical Rationale |
| :--- | :--- | :--- | :--- |
| **Centrifugal Pumps** | Flow rate ($\dot{V}$) | **$+10\%$ to $+20\%$** | Accommodates control valve pressure drop margin and sudden throughput increases. |
| | Developed Head ($\Delta H$) | **$+10\%$ to $+15\%$** | Accounts for pipeline aging, pipe scaling, and future expansion. |
| **Compressors** | Volumetric Flow | **$+10\%$ to $+15\%$** | Allows driver margin and operational flexibility. |
| | Discharge Pressure | **$+5\%$ to $+10\%$** | Relief valve setpoint margin. |
| **Shell & Tube Exchangers**| Surface Area ($A_o$) | **$+10\%$ to $+25\%$** | Compensates for progressive fouling resistances ($R_{fi}, R_{fo}$) over run length. |
| **Distillation Columns** | Column Cross-Section ($A_c$)| **$+10\%$ to $+20\%$** (Design at $75-80\%$ of flooding) | Prevents premature liquid entrainment, foaming, and hydraulic jet flooding. |
| | Number of Trays ($N_{actual}$)| **$+10\%$ to $+20\%$** | Buffers against lower plate efficiency during off-spec feed conditions. |
| **Separation Drums (Flash)**| Vessel Diameter ($D_v$) | **Design at $75-85\%$ $u_{max}$** | Ensures droplet terminal settling below Souders-Brown velocity. |
| | Liquid Holdup Volume | **$+100\%$** (Operate half-full) | Provides 5–10 minutes surge capacity between low and high level alarms. |
| **Chemical Reactors** | Working Volume ($V_r$) | **$+15\%$ to $+30\%$** vapor space | Accommodates liquid swell, foaming, and vortex creation during agitation. |
| **Raw Material Tanks** | Storage Volume | **15 to 30 days inventory** | Buffers site against supply chain and shipping disruptions. |
| **Finished Product Tanks**| Storage Volume | **15 to 30 days production** | Accommodates batch testing, quality certification, and customer logistics. |

---

## 4. Equipment Specification Data Sheets

Equipment specification data sheets are formal engineering contract documents transmitted between engineering procurement contractors (EPCs) and equipment fabricators.

### 4.1 Required Data Sheet Sections
1. **Header Block**: Plant name, project number, equipment tag number (e.g. `P-101A/B`, `E-204`, `V-301`), service description, P&ID reference, sheet revision.
2. **Operating Conditions**:
   * Normal, minimum, and maximum operating temperatures and pressures.
   * Design pressure (typically $P_{oper} + 10\%$ or $+1.7\text{ bar}$, whichever is greater) and design temperature (typically $T_{oper} + 15^\circ\text{C}$ to $25^\circ\text{C}$).
   * Full vacuum design requirement (if steam out or cooling could cause vacuum).
3. **Process Stream Characteristics**:
   * Mass and volumetric flow rates (liquid, vapor, solid fractions).
   * Fluid density, dynamic viscosity, heat capacity, thermal conductivity, surface tension.
   * Corrosive or hazardous contaminants ($H_2S, CO_2, Cl^-$, heavy metals).
4. **Mechanical Construction Details**:
   * Materials of construction (shell, tubes, internals, lining, gasket, bolts).
   * Corrosion allowance ($1.5\text{ mm}$ for non-corrosive hydrocarbons; $3.0 - 5.0\text{ mm}$ for aqueous / corrosive service).
   * Code of construction (ASME Section VIII, TEMA Class R/C/B, API 650, API 610).
5. **Nozzle Schedule**:
   * Flange size (NPS), pressure rating (ANSI Class 150, 300, 600), facing (RF, RTJ), and process duty (feed, vapor return, drain, vent, manway, relief valve).

---

## 5. Visualcheme Implementation Architecture

1. **Preset Scenarios**: Automatically calibrate all unit operations in Visualcheme using the design margins established above (e.g., set pump rated flow to $1.15 \times \text{nominal}$ flow; set column diameter to evaluate hydraulic loading at $80\%$ of flood).
2. **Visual Inspection Gradients**: Color code equipment performance widgets based on the margin consumption:
   * *Green*: Operating at $50\% - 85\%$ of rated equipment limit.
   * *Amber*: Operating at $85\% - 98\%$ of limit (design margin being consumed).
   * *Red*: Operating at $> 100\%$ of rated capacity (flooding, cavitation, or thermal bottleneck).
"""

with open('.agents/skills/che-equipment-specification/SKILL.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("che-equipment-specification/SKILL.md updated successfully!")
