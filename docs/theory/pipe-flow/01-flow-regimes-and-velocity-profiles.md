---
id: pipe-flow-regimes-velocity-profiles
title: Flow Regimes, Reynolds Number, Velocity Profiles & Particle Hydrodynamics
unit: pipe_flow
ui_elements:
  - param:velocity
  - param:diameter_mm
  - pill:reynolds
  - kpi:reynolds
  - hud:velocity
  - hud:reynolds
  - hud:entrance_length
  - canvas:velocity-profile-overlay
  - canvas:tracer-particles
  - canvas:overlay-regime
  - warnings:transitional-flow
  - warnings:laminar-entrance-length
code_files:
  - src/core/thermo/friction.ts
  - src/core/units/pipe/pipe_unit.ts
  - src/ui/components/fluid_state_bar.ts
  - src/ui/renderers/pipe_renderer.ts
references:
  - "[T&S] Ch. 20.4.1 Eq. (20.2) & Fig. 20.5, pp. 1214–1215; Ch. 19.8, pp. 1080–1082"
  - "[S&L] Ch. 12.3, p. 377; Ch. 15.3 Eq. (15.8), p. 407; Ch. 24.1, p. 649"
  - "[EXT] Turbulent 1/n power law (Nikuradse / Nunner n ≈ 1/√f); turbulent entrance length (White); turbulence intensity I ≈ 0.16 Re^(-1/8); Dean secondary flow"
---

# Flow Regimes, Reynolds Number, Velocity Profiles & Particle Hydrodynamics

## 1. Mean Velocity & Volumetric / Mass Flow Rate

In a full circular pipe of internal diameter $D$ and cross-sectional area $A = \pi D^2 / 4$, the **mean (bulk) velocity** $v$ (written $u$ in **[T&S]** and $V$ or $u_{\text{mean}}$ in **[S&L]**) is the area-averaged axial velocity:

$$v = \frac{Q}{A} = \frac{\dot{m}}{\rho A} = \frac{4\,\dot{m}}{\pi \rho D^2}$$

In Visualcheme (`pipe_unit.ts`):
- **Imposed-velocity mode**: the user sets $v_{\text{in}}$ via slider, which fixes the constant mass flow rate $\dot{m} = \rho(T_{\text{in}})\,v_{\text{in}}\,A$.
- **Pump operating-point mode**: the pump–system intersection determines $Q$, setting $v_{\text{in}} = Q / A$.
- Along the pipe, thermal expansion/contraction modifies local density $\rho(T(x))$, so $v(x) = \dot{m}/(\rho(T(x)) A)$ varies slightly with temperature. The Bulk HUD (`fluid_state_bar.ts`) automatically switches from a single value to `inlet → outlet` whenever any property changes by more than $0.5\%$.

---

## 2. The Reynolds Number ($\mathrm{Re}$)

The dimensionless **Reynolds number** measures the ratio of fluid inertial forces to viscous shear forces:

$$\mathrm{Re} = \frac{\rho v D}{\mu} = \frac{v D}{\nu} = \frac{4\,\dot{m}}{\pi D \mu}$$

- **[T&S]** Eq. (20.2) (p. 1214): $\mathrm{Re} = (\rho \times u \times d_i)/\mu$; also written $4 m / (\pi \mu d)$ in Examples 20.10–20.11 (p. 1253).
- **[S&L]** Ch. 12.3 (p. 377): $N_{\text{Re}} = D_i G / \mu$ (using mass velocity $G = \dot{m}/A = \rho v$); Ch. 15.3 (p. 407): $\mathrm{Re} = \rho u_{\text{mean}} D / \mu$.
- **Temperature sensitivity**: Because $\dot{m}$ and $D$ are constant along the conduit, $\mathrm{Re}(x) \propto 1/\mu(T(x))$. When a hot viscous liquid (e.g., ethylene glycol at $80\,^\circ\text{C}$) cools in a bare pipe, $\mu(T)$ rises sharply, causing $\mathrm{Re}(x)$ to drop along $x$ — which can even transition a pipe mid-length! This spatial variation is directly visible by clicking the **`Re` Reynolds Number** or **`μ` Dynamic Viscosity** pill.

---

## 3. Flow Regime Classification & Threshold Contrast

Visualcheme classifies every node via `classifyRegime(Re)` (`friction.ts`, lines 14–30):

| Regime | Visualcheme Range | Physical Character | Textbook Benchmarks & Contrast |
| :--- | :---: | :--- | :--- |
| **Laminar** | $\mathrm{Re} < 2300$ | Smooth, layered streamlines; viscous damping suppresses perturbations; wall roughness has no effect on $f$. | **[S&L]** Ch. 15.3 (p. 407) explicitly checks $\mathrm{Re} < 2300$. **[T&S]** Ch. 19 Eq. (19.19) (p. 1081) uses $\mathrm{Re} < 2100$, and Fig. 20.5 (p. 1215) ends the laminar line at $\mathrm{Re} \approx 2000\text{–}2100$. |
| **Transition** | $2300 \le \mathrm{Re} < 4000$ | Intermittent alternating puffs of laminar and turbulent flow; friction factor is physically indeterminate and sensitive to inlet disturbances. | **[T&S]** Fig. 20.5 labels $2000\text{–}4000$ the **"Critical zone"** and Ch. 19.8 (p. 1080) warns *"The transition region should be avoided in exchanger design."* Visualcheme raises a `Caution` warning across $[2300, 4000)$. |
| **Turbulent** | $\mathrm{Re} \ge 4000$ | Self-sustaining 3D chaotic eddies; strong radial momentum transport flattens velocity profile; wall roughness $\varepsilon/D$ governs high-$\mathrm{Re}$ resistance. | **[T&S]** Example 20.10 (p. 1253) checks $\mathrm{Re} > 4000$ for turbulent flow. **[S&L]** Ch. 12.3 (p. 377) notes Gnielinski extends down to $N_{\text{Re}} = 2300$, while Dittus–Boelter / Sieder–Tate require $N_{\text{Re}} > 10{,}000$ for fully turbulent heat transfer. |

---

## 4. Radial Velocity Profiles $u(r)/\bar{v}$

The golden curve drawn on the first straight pipe section on the canvas (`drawProfile` in `pipe_renderer.ts`) and the radial speed of every animated tracer particle come directly from `PipeUnit.radialProfile(Re, f)` (`pipe_unit.ts`, lines 1102–1115).

### 4.1 Laminar Regime: Exact Hagen–Poiseuille Parabola

Solving the steady, axisymmetric, fully developed Navier–Stokes momentum equation in cylindrical coordinates with no-slip boundary condition $u(R) = 0$ yields the exact parabolic velocity profile (**[S&L]** Eq. 15.8, p. 407):

$$\frac{u(r)}{\bar{v}} = 2 \left[1 - \left(\frac{r}{R}\right)^2\right]$$

- **Centerline maximum**: $u_{\max} = u(0) = 2\bar{v}$ (the fastest core fluid moves at **twice** the bulk mean velocity).
- **Area-average check**: $\dfrac{1}{\pi R^2}\displaystyle\int_0^R 2\bar{v}\left(1 - \frac{r^2}{R^2}\right) 2\pi r\,dr = \bar{v}$.
- Shown in the Bulk HUD as `parabolic`. Try preset **Laminar Glycol ($\mathrm{Re} \approx 330$)** to see the tall, pointed parabola and slow wall layers!

### 4.2 Turbulent Regime: Empirical $1/n$ Power Law **[EXT]**

Intense turbulent eddy diffusivity transports high-momentum fluid from the core toward the wall, creating a much fuller, blunter profile with a steep velocity gradient inside the thin viscous sublayer:

$$\frac{u(r)}{u_{\max}} = \left(1 - \frac{|r|}{R}\right)^{1/n}$$

Integrating over the circular cross-section relates the mean velocity to the centerline maximum:

$$\frac{\bar{v}}{u_{\max}} = \frac{1}{\pi R^2}\int_0^R \left(1 - \frac{r}{R}\right)^{1/n} 2\pi r\,dr = \frac{2 n^2}{(n + 1)(2n + 1)}$$

Therefore:

$$\frac{u(r)}{\bar{v}} = \frac{(n + 1)(2n + 1)}{2 n^2}\left(1 - \frac{|r|}{R}\right)^{1/n}$$

Following Nunner's relation between power-law exponent and Darcy friction factor **[EXT]**, Visualcheme sets:

$$n = \operatorname{clamp}\!\left(\frac{1}{\sqrt{f}},\; 4,\; 12\right)$$

- At $n = 6$ ($\mathrm{Re} \approx 10^4$, $f \approx 0.031$): $\bar{v}/u_{\max} = 0.791$, so $u_{\max}/\bar{v} = 1.26$.
- At $n = 7$ (classic $1/7$-th power law, $\mathrm{Re} \approx 10^5$, $f \approx 0.020$): $\bar{v}/u_{\max} = 49/60 = 0.817$, so $u_{\max}/\bar{v} = 1.22$.
- On the default water pipe ($\mathrm{Re} = 83{,}263$, $f = 0.02232$): $n = 6.69$, $u_{\max}/\bar{v} = 1.24$.
- As $\mathrm{Re}$ rises (and $f$ falls), $n$ rises toward $12$ and the profile becomes even flatter (`1/n power law` in the Bulk HUD).

### 4.3 Transition Regime Blending

For $2300 \le \mathrm{Re} < 4000$, Visualcheme linearly blends the laminar parabola and turbulent power law via intermittency weight $\gamma = (\mathrm{Re} - 2300) / (4000 - 2300) \in [0, 1]$:

$$\left.\frac{u(r)}{\bar{v}}\right|_{\text{trans}} = (1 - \gamma)\left.\frac{u(r)}{\bar{v}}\right|_{\text{lam}} + \gamma\left.\frac{u(r)}{\bar{v}}\right|_{\text{turb}}$$

---

## 5. Hydrodynamic Entrance Length ($L_e$)

When fluid enters a pipe from a tank or header with a nearly uniform velocity profile, wall boundary layers grow inward until they merge at the centerline. The axial distance required to establish a fully developed velocity profile is the **hydrodynamic entrance length** $L_e$ (displayed in the Bulk HUD as `Entrance L_e`):

$$L_e = \begin{cases} 0.05\,\mathrm{Re}\,D & \text{Laminar } (\mathrm{Re} < 2300) \\[6pt] 4.4\,\mathrm{Re}^{1/6}\,D & \text{Turbulent } (\mathrm{Re} \ge 2300) \end{cases}$$

- **Laminar formula ($0.05\,\mathrm{Re}\,D$)**: Directly confirmed in **[S&L]** Ch. 24.1 (p. 649: *"Because the fully developed parabolic velocity profile for laminar flow is obtained by a fiber length, $L = 0.05 D_i N_{\text{Re}b}$"*). At $\mathrm{Re} = 2000$, $L_e = 100 D$ — for a $50\text{ mm}$ pipe that is $5\text{ m}$!
- **Turbulent formula ($4.4\,\mathrm{Re}^{1/6}\,D$)**: Standard classical fluid-mechanics correlation (White **[EXT]**); because turbulent eddies mix momentum rapidly across the bore, $L_e$ is much shorter ($\sim 25\text{–}40 D$; e.g., at $\mathrm{Re} = 83{,}263$ and $D = 50\text{ mm}$, $L_e = 1.45\text{ m}$).
- **Developing-flow validity diagnostic**: In the entrance region, thinner boundary layers produce higher wall shear stress than fully developed flow, so true $\Delta P$ exceeds the fully developed $f = 64/\mathrm{Re}$ prediction. Visualcheme therefore raises a `Note` when laminar $L_e/L > 5\%$ and a `Caution` warning when $L_e/L > 25\%$ (`pipe_unit.ts`, lines 1186–1194).

---

## 6. Canvas Tracer Particle Physics (`pipe_renderer.ts`)

The animated white tracer streaks inside the pipe are a **didactic visualization** driven by the solved 1D fields — they do not feed back into $P(x)$ or $T(x)$, which remain exact solutions of the 1D ODEs. Four physical effects govern their motion:

1. **Advection & Time-Scale Compression**: Each particle advances along $x/L$ at speed proportional to $(v(x)/v_{\text{in}}) \cdot (u(r)/\bar{v}) \cdot (\text{valve throat speedup})$. Real transit time $\tau_{\text{real}} = L / v_{\text{in}}$ is mapped smoothly into a $3\text{–}16\text{ s}$ display window ($\tau_{\text{shown}} = \operatorname{clamp}(2.6\,\tau_{\text{real}}^{0.42}, 3, 16)$), with the exact playback multiplier (`transit 13.3 s, played ×1.7`) shown in the top-right corner of the canvas.
2. **Background Turbulent Eddy Diffusion**: Radial random-walk mixing scales with the standard pipe-core **turbulence intensity** correlation **[EXT]**:
   $$I \approx 0.16\,\mathrm{Re}^{-1/8}$$
   In laminar flow, background radial diffusivity is zero, so tracers remain strictly on parallel streamlines!
3. **Fitting & Valve Wake Turbulence**: Every entrance, elbow, tee, valve, and pump injects localized cross-stream turbulence scaled by $\sqrt{K}$ that decays exponentially over a $4D$ downstream recovery length ($e^{-\Delta s / (4D)}$).
4. **Dean Secondary Flow in Bends**: Inside curved elbows (where curvature $\kappa = 1/r_{\text{bend}} \ne 0$), centrifugal imbalance pushes fast core fluid ($u/\bar{v} > 0.9$) toward the outer bend radius while slower near-wall fluid drifts back along the inner wall — visualizing the physical origin of bend secondary vortices (Dean vortices **[EXT]**).
