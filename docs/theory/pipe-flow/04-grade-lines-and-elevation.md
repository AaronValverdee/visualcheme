---
id: pipe-flow-grade-lines-elevation
title: Hydraulic & Energy Grade Lines (HGL / EGL), Elevation & Spatial Visualization
unit: pipe_flow
ui_elements:
  - pill:pressure
  - pill:hydraulic_grade
  - pill:energy_grade
  - pill:head_loss
  - param:elevation_m
  - param:p_inlet_kpa
  - kpi:total_dp
  - kpi:head_loss
  - chart:spatial-profile
  - canvas:heatmap-and-colorbar
  - canvas:hover-probe
  - preset:pipe_uphill
code_files:
  - src/core/units/pipe/pipe_unit.ts
  - src/core/types/properties.ts
  - src/ui/charts/spatial_chart.ts
  - src/ui/renderers/pipe_renderer.ts
  - tests/pipe_unit.test.ts
  - tests/pump_line.test.ts
references:
  - "[T&S] Ch. 20.7.2 Eqs. (20.16)–(20.17) & Fig. 20.13, p. 1232"
  - "[S&L] Ch. 6.7 Heuristic 38, p. 151; Ch. 12.3, p. 378; Ch. 14.1 Eq. (14.2), p. 397"
  - "[EXT] Classical fluid-mechanics definitions of Hydraulic Grade Line (HGL) and Energy Grade Line (EGL)"
---

# Hydraulic & Energy Grade Lines (HGL / EGL), Elevation & Spatial Visualization

## 1. The Core Pedagogical Distinction: Pressure Drop $\ne$ Head Loss

One of the most frequent conceptual errors in process hydraulics is equating **total static pressure drop** $\Delta P_{\text{total}} = P_{\text{in}} - P_{\text{out}}$ with **frictional head loss** $h_L$. Visualcheme separates every contribution explicitly in the **`Total Pressure Drop`** KPI card and the **`Uphill Line: Pressure Drop ≠ Head Loss`** preset:

$$\Delta P_{\text{total}} = P_{\text{in}} - P_{\text{out}} = \underbrace{\Delta P_{\text{friction}} + \Delta P_{\text{fittings}} + \Delta P_{\text{valve}}}_{\text{irreversible dissipation}} + \underbrace{\Delta P_{\text{accel}}}_{\text{reversible } \frac{1}{2}\rho v^2 \text{ at mouth}} + \underbrace{\Delta P_{\text{elevation}}}_{\approx \rho g \Delta z \text{ (reversible)}} - \underbrace{\Delta P_{\text{pump}}}_{\rho g H_{\text{pump}}}$$

- **Irreversible head loss $h_L$** (`head_loss` pill and KPI) counts **only** friction, fittings, entrance loss, valve loss, and sudden exit dissipation:
  $$h_L(x) = \int_0^x \frac{f\,v^2}{2 g D}\,dx' + \sum_{x_i \le x} K_i \frac{v_i^2}{2g}$$
- **Elevation rise $\Delta z = z_{\text{out}} - z_{\text{in}}$** (`elevation_m`, clipped to $[-L, +L]$ so $|\sin\theta| = |\Delta z/L| \le 1$) is **mechanically reversible potential energy**. Lifting water $25\text{ m}$ uphill drops static pressure by $\rho g \Delta z \approx 244\text{ kPa}$, yet leaves $h_L$ **completely unchanged** (verified in `tests/pipe_unit.test.ts`). Conversely, flowing downhill ($\Delta z < 0$) can make $P_{\text{out}} > P_{\text{in}}$ ($\Delta P_{\text{total}} < 0$) even while $h_L > 0$!
- **Textbook Cross-Check**:
  - **[T&S]** Eq. (20.16)–(20.17) (p. 1232) separates elevation $g(z_1 - z_2)$, static pressure $(P_1 - P_2)/\rho$, and irreversible friction $\Delta P_f/\rho$ cleanly.
  - **[S&L]** Heuristic 38 (p. 151) captures hydrostatic head as the quick rule *"for each $10\text{-ft}$ rise in elevation, assume a pressure drop of $4\text{ psi}$"* (exact for $\text{SG} = 0.92$, vs. $4.33\text{ psi}/10\text{ ft}$ for water), and Ch. 12.3 (p. 378) notes vertical tube elevation shifts pressure by $\pm \rho g L$.

---

## 2. Hydraulic Grade Line (HGL) & Energy Grade Line (EGL)

To visualize total mechanical energy along a pipeline regardless of elevation changes, fluid mechanics defines two canonical elevation-head curves **[EXT]** directly tied to the total-head terms in **[S&L]** Eq. (14.2) (p. 397):

### 2.1 Hydraulic Grade Line (Piezometric Head)

$$\mathrm{HGL}(x) = z(x) + \frac{P(x)}{\rho(x)\,g}$$

where $z(x) = (x / L)\,\Delta z$ is the local pipe centerline elevation relative to the inlet datum ($z(0) = 0$). Physically, $\mathrm{HGL}(x)$ is the height to which liquid would rise in an open piezometer tube tapped into the pipe wall at station $x$.

### 2.2 Energy Grade Line (Total Head)

$$\mathrm{EGL}(x) = z(x) + \frac{P(x)}{\rho(x)\,g} + \frac{v(x)^2}{2g} = \mathrm{HGL}(x) + \frac{v(x)^2}{2g}$$

Physically, $\mathrm{EGL}(x)$ is the height to which liquid would rise in a Pitot stagnation tube facing upstream — representing the **total specific mechanical energy** (potential + flow-work + kinetic) in meters of fluid head.

### 2.3 Behavior of HGL and EGL Across Every Pipeline Element

Visualcheme evaluates both grade lines after the 201-node march (`pipe_unit.ts`, lines 670–679), treating still reservoirs ($v = 0$) rigorously:

| Pipeline Feature | Effect on $\mathrm{HGL}$ | Effect on $\mathrm{EGL}$ | Separation $(\mathrm{EGL} - \mathrm{HGL})$ |
| :--- | :--- | :--- | :--- |
| **Straight pipe run** (constant $D$, any slope $\theta$) | Falls linearly at friction slope $S_f = \dfrac{f v^2}{2 g D}$ (independent of $\theta$!) | Falls identically at slope $S_f = \dfrac{f v^2}{2 g D}$ | Constant $= \dfrac{v^2}{2g}$ |
| **Still-vessel entrance** (`entrance ≠ none`) | Drops by $(1 + K_{\text{in}})\dfrac{v^2}{2g}$ (acceleration + mouth loss) | Drops **only** by irreversible $K_{\text{in}}\dfrac{v^2}{2g}$ (never rises!) | $0$ in vessel $\to \dfrac{v^2}{2g}$ inside pipe |
| **Pipe fittings & in-line valve** | Step drop $-K\dfrac{v^2}{2g}$ | Identical step drop $-K\dfrac{v^2}{2g}$ | Unchanged $= \dfrac{v^2}{2g}$ |
| **Centrifugal pump** | Steps **up** by $+H_{\text{pump}}(Q)$ | Steps **up** by $+H_{\text{pump}}(Q)$ | Unchanged $= \dfrac{v^2}{2g}$ (same bore $D$) |
| **Sudden exit into receiving tank** (`exit = sudden`) | Continuous (unchanged at tank surface level) | Drops by $-\dfrac{v^2}{2g}$ to **meet HGL** inside the tank | $\dfrac{v^2}{2g}$ inside pipe $\to 0$ in tank |

> [!TIP]
> **Diagnostic Check**: Without a pump, **EGL can never increase** in the direction of flow (a direct consequence of the Second Law of Thermodynamics). Even across an entrance from a still vessel, `tests/pump_line.test.ts` asserts $\mathrm{EGL}_i \le \mathrm{EGL}_{i-1}$ at every node! Only a shaft-work device (pump) can lift the EGL upward.

---

## 3. Reading the 1D Spatial Chart, Heatmap & Hover Probe

### 3.1 Synchronized 1D Spatial Profile (`spatial_chart.ts`)

- Plots the currently selected pill property $y(x)$ across all **201 spatial nodes** ($x_i = i \cdot L / 200$, $i = 0, \dots, 200$).
- Short gold ticks along the bottom axis mark every distributed fitting station; dashed vertical reference lines mark `valve` ($0.60 L$) and `pump` (`pump_position_pct`), allowing every step change in $P$, HGL, EGL, $h_L$, or $T$ to be traced directly back to its hardware source on the pipe drawing.

### 3.2 Heatmap Normalization & Minimum Display Span (`minSpan`)

Mapping a profile onto a colormap via naive $[y_{\min}, y_{\max}]$ would stretch microscopic numerical changes (e.g., a $0.002\,^\circ\text{C}$ temperature change in an adiabatic water pipe) across the entire color spectrum, creating a false visual impression of a steep gradient. Visualcheme prevents this via `displayRange(values, meta)` (`src/core/types/properties.ts`):

- If $(y_{\max} - y_{\min}) < \text{minSpan}$, the display axis and colormap bounds are widened symmetrically around the midpoint to span `minSpan`:

| Property Pill | Colormap Scheme | `minSpan` | Why This Span? |
| :--- | :--- | :---: | :--- |
| **Pressure (`P`)** | `coolwarm` | $1.0\text{ kPa}$ | Sub-kPa variations stay visually calm |
| **Hydraulic Grade (`HGL`)** | `coolwarm` | $0.5\text{ m}$ | Prevents sub-decimeter head noise from over-scaling |
| **Energy Grade (`EGL`)** | `viridis` | $0.5\text{ m}$ | Matches HGL visual scale directly |
| **Temperature (`T`)** | `plasma` | $0.1\,^\circ\text{C}$ | Typical mK viscous heating stays a subtle tint while real cooling/heating lights up |
| **Head Loss (`h_L`)** | `viridis` | $0.1\text{ m}$ | Clean low-loss scaling |
| **Dynamic Viscosity (`μ`)** | `coolwarm` | $0.005\text{ cP}$ | Highlights genuine non-isothermal $\mu(T)$ shifts |
| **Reynolds Number (`Re`)** | `inferno` | $10$ | Prevents negligible $\Delta \mathrm{Re}$ stretching |

### 3.3 Interactive Canvas Hover Probe (`pipe_renderer.ts`)

Moving the cursor over any section of the routed pipe projects the pointer onto the nearest centerline arc-length sample $s$, maps $s \mapsto x/L$ via the piecewise-linear route map (`pipe_route.ts`), linearly interpolates the active profile at $x$, and displays `x = ... m | Property: value | hardware annotation` (naming the exact elbow, tee, entrance, exit, valve opening & $K$, or pump head at that station). Note that when $\Delta z \ne 0$, the top-right legend explicitly reminds the user `outlet ±Δz m above inlet (not drawn)`, because the 2D canvas bends represent plan-view fitting turns rather than vertical elevation relief.
