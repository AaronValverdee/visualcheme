---
id: fundamentals-conservation-and-second-law
title: Conservation Laws, Non-Isothermal Liquid Energy Balance & Second-Law Context
unit: shared
ui_elements:
  - pill:temperature
  - pill:pressure
  - pill:head_loss
  - param:heat_transfer_mode
  - param:ambient_temp_c
  - param:temp_c
  - kpi:thermal_trend
  - kpi:total_dp
  - kpi:head_loss
code_files:
  - src/core/units/pipe/pipe_unit.ts
  - tests/pipe_unit.test.ts
references:
  - "[T&S] Ch. 20.7.2 Eq. (20.16), p. 1232; Ch. 19.2–19.3, pp. 1048–1052"
  - "[S&L] Ch. 10.3–10.8 (Second-Law Analysis & Lost Work), Eqs. (10.1)–(10.32), pp. 289–301; Ch. 12.3 Eqs. (12.8)–(12.10), p. 375; Ch. 14.1, p. 400"
  - "[EXT] First Law for steady 1D liquid flow; thermodynamic identity dh = cp dT + (1 - βT)dP/ρ; classical RK4"
---

# Conservation Laws, Non-Isothermal Liquid Energy Balance & Second-Law Context

## 1. Why a Coupled Momentum + Thermal Balance?

Most introductory pipe-flow calculators assume **strictly isothermal, constant-property flow**. Visualcheme instead integrates the coupled **1D steady-state mass, momentum, and enthalpy balances** with temperature-dependent liquid properties along $x \in [0, L]$ (`pipe_unit.ts`, lines 537–654). This reveals three real process-engineering phenomena invisible in isothermal black boxes:

1. **Ambient Heat Exchange ($U$, $T_{\text{amb}}$)**: A hot or cold line exchanges heat with the surroundings; for viscous liquids (e.g., hot ethylene glycol cooling in a bare pipe), $\mu(T)$ can more than double along the pipe, driving $\mathrm{Re}(x)$ down and shifting the friction factor $f(x)$ continuously!
2. **Viscous Heating & Liquid Joule–Thomson Throttling**: Even in a perfectly adiabatic pipe ($U = 0$), irreversible friction and valve throttling raise the liquid temperature — but by $(1 - \beta T)\,\Delta P / (\rho c_p)$, **not** simply $\Delta P / (\rho c_p)$.
3. **Pump Efficiency Heating**: Shaft inefficiency $(1/\eta - 1)$ plus reversible liquid compression $(\beta T)$ heat the pumped fluid, reproducing the exact behavior described for commercial simulators in **[S&L]** Ch. 14.1 (p. 400, Example 14.1).

---

## 2. Governing Continuous Differential Equations (Straight Pipe)

Consider a differential slice $dx$ of a circular conduit of constant internal diameter $D$, cross-sectional area $A = \pi D^2/4$, inclined at angle $\theta$ ($\sin\theta = \Delta z / L$) with no shaft work inside the straight run.

### 2.1 Conservation of Mass (Continuity)

At steady state, mass flow rate $\dot{m}$ is strictly invariant along the conduit:

$$\dot{m} = \rho_{\text{in}} v_{\text{in}} A = \rho(T(x))\,v(x)\,A = \text{const.}$$

Therefore local mean velocity and local Reynolds number adapt to local temperature $T(x)$:

$$v(x) = \frac{\dot{m}}{\rho(T(x))\,A}, \qquad \mathrm{Re}(x) = \frac{\rho(x)\,v(x)\,D}{\mu(x)} = \frac{4\,\dot{m}}{\pi D\,\mu(T(x))}$$

> [!NOTE]
> Notice that $\mathrm{Re}(x)$ depends on temperature **solely through $\mu(T)$** because $\rho v = \dot{m}/A$ is constant in a uniform-diameter pipe!

### 2.2 Axial Momentum Balance (Mechanical Energy Differential)

Balancing pressure forces, wall shear stress $\tau_w = (f/8)\rho v^2$, and gravitational body force along the pipe axis (neglecting thermal-expansion acceleration $\rho v\,dv/dx$, which is $\mathcal{O}(10^{-4})$ for liquids):

$$\frac{dP}{dx} = -\underbrace{\frac{f\,\rho v^2}{2 D}}_{\left(\frac{dP}{dx}\right)_{\text{friction}} \ge 0} - \underbrace{\rho g \sin\theta}_{\text{hydrostatic gravity}}$$

Comparing with the integrated textbook mechanical energy balance:
- **[T&S]** Eq. (20.16) (p. 1232): $g(z_1 - z_2) + (P_1 - P_2)/\rho - \Delta P_f/\rho - W = 0$. Rearranging for a straight pipe without shaft work ($W = 0$) and $\Delta z = z_2 - z_1$ recovers $P_1 - P_2 = \Delta P_f + \rho g \Delta z$, the exact integral of the momentum ODE above for constant $\rho$.
- **[S&L]** Eq. (12.18) (p. 378) gives the isothermal horizontal frictional term $-\Delta P = f_D G^2 L / (2 g_c \rho D_i) = f_D (L/D_i)(\rho v^2/2)$, noting on the same page that vertical flow shifts outlet pressure by $\pm \rho g \Delta z$.

### 2.3 Irreversible Head Loss Differential

Head loss $h_L(x)$ accumulates **strictly irreversible mechanical dissipation** — never reversible gravity ($\rho g \Delta z$) and never pump energy input:

$$\frac{dh_L}{dx} = \frac{1}{\rho g}\left(\frac{dP}{dx}\right)_{\text{friction}} = \frac{f\,v^2}{2 g D} \ge 0$$

### 2.4 Steady-Flow First Law & Liquid Enthalpy Identity

For steady 1D flow with wall heat input $q'$ ($\text{W/m}$) and zero shaft work inside the straight run, neglecting $O(10^{-4})$ kinetic-energy change from thermal expansion **[EXT]**:

$$\frac{dh}{dx} + g\sin\theta = \frac{q'}{\dot{m}}$$

Now apply the exact thermodynamic differential of specific enthalpy $h = h(T, P)$ for a single-phase substance **[EXT]**:

$$dh = \left(\frac{\partial h}{\partial T}\right)_P dT + \left(\frac{\partial h}{\partial P}\right)_T dP = c_p\,dT + \frac{1 - \beta T}{\rho}\,dP$$

where $\beta = -\frac{1}{\rho}\left(\frac{\partial \rho}{\partial T}\right)_P$ is the isobaric thermal expansivity. Substituting $dh/dx$ into the steady-flow energy balance gives:

$$c_p \frac{dT}{dx} + \frac{1 - \beta T}{\rho}\frac{dP}{dx} + g\sin\theta = \frac{q'}{\dot{m}}$$

Now substitute the momentum equation $\frac{dP}{dx} = -\left(\frac{dP}{dx}\right)_{\text{friction}} - \rho g \sin\theta$. The reversible pressure–elevation exchange $\left(-\frac{1}{\rho}\rho g\sin\theta + g\sin\theta\right)$ **cancels identically**, leaving:

$$\boxed{\frac{dT}{dx} = \frac{1}{c_p}\left[\,\underbrace{\frac{q'}{\dot{m}}}_{\text{wall heat transfer}} + \underbrace{\frac{1}{\rho}\left(\frac{dP}{dx}\right)_{\text{friction}}}_{\text{viscous dissipation} \; (+)} + \underbrace{\frac{\beta T}{\rho}\frac{dP}{dx}}_{\text{reversible } P\text{–}T \text{ coupling}}\,\right]}$$

Check the **horizontal adiabatic limit** ($q' = 0$, $\sin\theta = 0$, so $dP/dx = -(dP/dx)_{\text{friction}}$):

$$\frac{dT}{dx} = \frac{1 - \beta T}{\rho c_p}\left(\frac{dP}{dx}\right)_{\text{friction}} = -\frac{1 - \beta T}{\rho c_p}\frac{dP}{dx}$$

Because $\beta T < 1$ for normal subcritical liquids ($\sim 0.08$ for water, $\sim 0.30\text{–}0.43$ for organics), the **liquid Joule–Thomson coefficient** $\mu_{\text{JT}} = (\partial T / \partial P)_h = -(1 - \beta T)/(\rho c_p)$ is **negative**: dropping pressure **warms** a liquid!

> [!TIP]
> **Physical Intuition**: In a horizontal adiabatic pipe, pressure energy $-\Delta P / \rho$ is not 100% converted into sensible temperature rise $c_p \Delta T$: a fraction $\beta T$ goes into internal intermolecular expansion work as the liquid decompresses slightly. That is why the temperature rise is $(1 - \beta T)\Delta P / (\rho c_p)$ — about $30\%$ smaller for organic solvents than the naive $\Delta P / (\rho c_p)$ estimate!

---

## 3. Wall Heat Transfer Model (`heat_transfer_mode`, `ambient_temp_c`)

Heat entering the fluid per unit pipe length is modeled by Newton's law of cooling referenced to the inner pipe surface area $\pi D$:

$$q'(x) = -U\,\pi D\,\big(T(x) - T_{\text{amb}}\big)$$

| UI Mode (`heat_transfer_mode`) | $U$ ($\text{W/(m}^2\cdot\text{K)}$) | Physical Interpretation |
| :--- | :---: | :--- |
| **Bare Conduit (`uninsulated`)** | $15.0$ | Uninsulated metal pipe in still/lightly moving ambient air; external air natural/mild-forced convection ($h_o \approx 10\text{–}25\text{ W/(m}^2\cdot\text{K)}$) dominates the overall thermal resistance $1/U_i \approx (D_i/D_o)/h_o$ (**[S&L]** Eq. 12.10, p. 375). |
| **Thermal Insulation (`insulated`)** | $0.5$ | Standard mineral-wool / fiberglass jacketed process line (e.g., $\sim 50\text{–}75\text{ mm}$ insulation with $k_{\text{ins}} \approx 0.04\text{ W/(m}\cdot\text{K)}$). |
| **Adiabatic (`adiabatic`)** | $0.0$ | Perfectly insulated boundary; isolates viscous dissipation, liquid Joule–Thomson throttling, and pump heating in `Discharge Temperature` KPI. |

### Exponential Cooling / NTU Analytical Limit

When viscous heating is small relative to ambient heat loss and properties are nearly constant, the thermal ODE integrates analytically to exponential relaxation toward $T_{\text{amb}}$:

$$T(L) = T_{\text{amb}} + (T_{\text{in}} - T_{\text{amb}})\,\exp(-\mathrm{NTU}), \qquad \mathrm{NTU} = \frac{U\,\pi D\,L}{\dot{m}\,c_p}$$

This exact limit is directly verified in `tests/pipe_unit.test.ts` (bare hot pipe cooling test) and ties into the **effectiveness–NTU** heat-transfer theory in **[T&S]** Ch. 19.2 (p. 1049).

---

## 4. Point Discontinuities (Jumps at Fittings, Valves, Vessels & Pumps)

Discrete components act over lengths negligible compared to $L$ and are applied as exact algebraic jumps between RK4 integration steps rather than smeared into $dP/dx$:

| Event | Pressure Jump $\Delta P$ | Head-Loss Jump $\Delta h_L$ | Temperature Jump $\Delta T$ | Thermodynamic Path |
| :--- | :--- | :--- | :--- | :--- |
| **Fittings & In-Line Valve** (`irreversibleDrop`) | $-\Delta P_m = -K\dfrac{\rho v^2}{2}$ | $+\dfrac{\Delta P_m}{\rho g} = K\dfrac{v^2}{2g}$ | $+\dfrac{(1 - \beta T)\,\Delta P_m}{\rho c_p}$ | **Isenthalpic** ($\Delta h = 0$, adiabatic throttling; **[S&L]** Fig. 10.14 p. 294) |
| **Still-Vessel Entrance Acceleration** (`vesselAcceleration`) | $-\dfrac{\rho v^2}{2}$ | $0$ (reversible!) | $-\dfrac{\beta T\,v^2}{2 c_p}$ | **Isentropic / Constant Stagnation Enthalpy** ($\Delta h + v^2/2 = 0$, $ds = 0$) |
| **Sudden Exit into Receiving Tank** (`intoTank`) | $0$ (jet enters at tank $P$) | $+K_{\text{exit}}\dfrac{v^2}{2g}$ ($K_{\text{exit}} = 1$) | $+K_{\text{exit}}\dfrac{v^2}{2 c_p}$ | **Constant-$P$ Stagnation Dissipation** ($\Delta h = v^2/2$) |
| **Centrifugal Pump** (`pumpJump`) | $+\rho g H$ | $0$ (pump adds head; inefficiency heats fluid) | $+\dfrac{g H}{c_p}\!\left(\dfrac{1}{\eta} - 1 + \beta T\right)$ | **Adiabatic Shaft Work** ($\Delta h = g H / \eta$; **[S&L]** Ch. 14.1 p. 400) |

> [!NOTE]
> **Deriving the Pump Temperature Rise**: Shaft work per unit mass raises fluid enthalpy by $\Delta h = w_s = g H / \eta$. Substituting into $\Delta h = c_p \Delta T + (1 - \beta T)\Delta P / \rho$ with $\Delta P = \rho g H$ yields:
> $$c_p \Delta T = \frac{g H}{\eta} - (1 - \beta T)\,g H = g H \left(\frac{1}{\eta} - 1\right) + \beta T\,g H$$
> Even at $\eta = 100\%$ (reversible adiabatic/isentropic pumping), $\Delta T = \beta T g H / c_p > 0$ — exactly matching **[S&L]** Example 14.1 (p. 400), where isentropic toluene pumping ($\eta = 100\%$) warms from $75.00\,^\circ\text{F}$ to $75.78\,^\circ\text{F}$, and $\eta = 75\%$ warms further to $77.37\,^\circ\text{F}$!

---

## 5. Dissipation, Second-Law Analysis & Lost Work (**[S&L]** Ch. 10)

### 5.1 Mechanical Dissipation Rate in Visualcheme

Visualcheme computes the total rate of mechanical energy irreversibly dissipated into thermal energy across straight-pipe friction, fittings, entrance/exit losses, and the valve (`summary.dissipation_W`):

$$\dot{W}_{\text{diss}} = \dot{m}\,g\,h_L$$

### 5.2 Connection to Seider et al. Second-Law Lost Work

**[S&L]** Chapter 10 (*Second-Law Analysis*, pp. 287–306) emphasizes that the First Law tracks energy conservation while the **Second Law** identifies *where useful work potential is destroyed*. Combining the steady-flow energy and entropy balances around a control volume exchanging heat with surroundings at dead-state temperature $T_0$ (**[S&L]** Eqs. 10.24–10.25, 10.32, pp. 295–296):

$$B = H - T_0 S, \qquad L\dot{W} = T_0\,\Delta \dot{S}_{\text{irr}} = \sum (\dot{m} B)_{\text{in}} - \sum (\dot{m} B)_{\text{out}} + \sum \dot{W}_{\text{in}} - \sum \dot{W}_{\text{out}} + \sum \dot{Q}_{\text{in}}\!\left(1 - \frac{T_0}{T}\right)$$

For adiabatic incompressible pipe friction and throttling at local fluid temperature $T$:
- Local entropy generation per unit length is $\dot{S}'_{\text{gen}} = \dfrac{\dot{V}}{T}\left(\dfrac{dP}{dx}\right)_{\text{friction}} = \dfrac{\dot{m} g}{T}\dfrac{dh_L}{dx}$.
- Therefore local **lost work (exergy destruction)** is:

$$\frac{d(L\dot{W})}{dx} = T_0\,\dot{S}'_{\text{gen}} = \frac{T_0}{T}\,\dot{m} g\,\frac{dh_L}{dx}$$

**[S&L]** Section 10.8 (p. 300) explicitly lists **fluid friction/drag** (Cause #3), **throttling valves** (Fig. 10.14 p. 294 & Example 10.3 p. 301, where isenthalpic throttling with $H_1 = H_2$ yields $L\dot{W} = \dot{m} T_0 (S_2 - S_1)$), and **mechanical/fluid inefficiency in pumps** (Cause #6 & Fig. 10.6 p. 290) among the six primary industrial sources of lost work.

> [!NOTE]
> **Platform Scope**: As documented in `README.md`, Visualcheme's current Pipe Flow UI focuses on First-Law balances, head loss $h_L$, and mechanical dissipation $\dot{W}_{\text{diss}}$; dedicated exergy-destruction / lost-work spatial heatmaps ($d(L\dot{W})/dx$) are reserved for a future Second-Law learning module built directly on **[S&L]** Ch. 10.
