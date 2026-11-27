---
id: nomenclature
title: Master Nomenclature, Units & Convention Reconciliation
unit: shared
ui_elements:
  - all
code_files:
  - src/core/types/properties.ts
  - src/core/thermo/friction.ts
  - src/core/thermo/pump.ts
  - src/core/units/pipe/pipe_unit.ts
references:
  - "[T&S] Ch. 20 Nomenclature, pp. 1261–1263"
  - "[S&L] Ch. 10, 12, 14, 15, 16"
---

# Master Nomenclature, Units & Convention Reconciliation

> [!IMPORTANT]
> **Why this file exists**: Chemical engineering textbooks do **not** share a single symbol set or sign convention. In particular, **friction factor definitions differ by factors of 2, 4, and 8**, and **sign conventions for $\Delta P$, $\Delta z$, and shaft work $W$ flip** between Towler & Sinnott **[T&S]**, Seider et al. **[S&L]**, and Visualcheme's internal SI solver. This table reconciles every symbol used across the platform.

---

## 1. Critical Convention Reconciliations

### 1.1 The Friction Factor Triad (Factor of 4 & Factor of 8)

All three friction factor definitions relate wall shear stress $\tau_w$ (written $R$ in **[T&S]**) to fluid kinetic energy per unit volume, but differ in their leading numerical multiplier:

| Convention | Symbol | Wall-Shear Definition | Straight-Pipe $\Delta P_f$ Formula | Laminar Value | Relation to Darcy $f_D$ | Where Used |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Darcy–Weisbach (Moody)** | $f$ or $f_D$ | $f_D = \dfrac{8 \tau_w}{\rho v^2}$ | $\Delta P_f = f_D \dfrac{L}{D} \dfrac{\rho v^2}{2}$ | $\dfrac{64}{\mathrm{Re}}$ | $1 \times f_D$ | **Visualcheme** (`friction.ts`, Moody chart), **[S&L]** Eq. (12.15, 12.18) |
| **Fanning** | $C_f$ or $f_F$ | $C_f = \dfrac{2 \tau_w}{\rho v^2}$ | $\Delta P_f = 4 C_f \dfrac{L}{D} \dfrac{\rho v^2}{2} = 2 C_f \dfrac{L}{D} \rho v^2$ | $\dfrac{16}{\mathrm{Re}}$ | $\dfrac{1}{4} f_D$ | **[T&S]** Eq. (20.1b) & Eq. (20.26); **[S&L]** Eq. (12.18) |
| **Coulson–Richardson (Basic)** | $f_{\text{T\&S}}$ or $j_f$ | $f_{\text{T\&S}} = \dfrac{\tau_w}{\rho v^2}$ | $\Delta P_f = 8 f_{\text{T\&S}} \dfrac{L}{d_i} \dfrac{\rho u^2}{2} = 4 f_{\text{T\&S}} \dfrac{L}{d_i} \rho u^2$ | $\dfrac{8}{\mathrm{Re}}$ | $\dfrac{1}{8} f_D$ | **[T&S]** Eq. (20.1), Fig. 20.5 (p. 1215), Ch. 19 Eq. (19.19) & Fig. 19.24 |

$$\boxed{f_D = 4 C_f = 8 f_{\text{T\&S}}}$$

### 1.2 Sign Conventions for Differences ($\Delta P$, $\Delta z$) and Work ($W$)

| Quantity | Visualcheme Internal / UI | Towler & Sinnott **[T&S]** (Ch. 20.7.2) | Seider et al. **[S&L]** (Ch. 10 & Ch. 14) |
| :--- | :--- | :--- | :--- |
| **Elevation change** | $\Delta z = z_{\text{out}} - z_{\text{in}}$ (positive = uphill) | $\Delta z = z_1 - z_2$ (Eq. 20.16, p. 1232: **negative** = uphill!) | $z_d - z_s$ (Eq. 14.2, p. 397: positive = uphill) |
| **Pressure drop** | $\Delta P_{\text{total}} = P_{\text{in}} - P_{\text{out}}$ (positive when $P$ falls) | $\Delta P = P_1 - P_2$ (Eq. 20.16: positive when $P$ falls) | $-\Delta P = P_{\text{in}} - P_{\text{out}}$ (Eq. 12.18); $P_d - P_s$ for pumps (Eq. 14.2) |
| **Shaft work** | Pump adds $+gH/\eta$ to fluid enthalpy; brake power $P_B > 0$ | $W$ = work done **by** fluid (Eq. 20.16: $W < 0$ for a pump) | Ch. 10: $\dot{W}$ positive **by** system ($\dot{W}_{\text{in}} > 0$ explicitly labeled); Ch. 14: $\dot{W} = F v \Delta P > 0$ required by pump |
| **Heat transfer** | $q' = -U\pi D(T - T_{\text{amb}})$ (positive **into** fluid) | $Q = U A \Delta T_m$ (Ch. 19) | $\dot{Q}$ positive **into** system (Ch. 10 Eq. 10.20) |
| **Gravitational constant** | $g = 9.80665\text{ m/s}^2$ (SI; $g_c = 1$) | $g = 9.8\text{ m/s}^2$ in worked examples | $g = 9.81\text{ m/s}^2$ or $32.2\text{ ft/s}^2$; uses $g_c = 32.17\text{ ft}\cdot\text{lb}_m/(\text{lb}_f\cdot\text{s}^2)$ in U.S. customary formulas |

---

## 2. Complete Symbol Table

### 2.1 Geometry & Coordinates

| Symbol | Visualcheme UI / Code | **[T&S]** | **[S&L]** | Description | SI Unit (UI Unit) |
| :---: | :--- | :---: | :---: | :--- | :--- |
| $x$ | `spatialGrid` | — | $Z$ | Axial coordinate along pipe centerline ($0 \le x \le L$) | $\text{m}$ |
| $r$ | `rNorm` ($r/R \in [-1, 1]$) | — | $R$ | Radial coordinate from pipe centerline ($0 \le r \le R$) | $\text{m}$ |
| $D$ | `diameter_mm` ($D$) | $d_i$ | $D_i$ | Internal pipe bore diameter | $\text{m}$ ($\text{mm}$) |
| $R$ | `D / 2` | — | $R_t$ | Internal pipe radius ($D/2$) | $\text{m}$ |
| $A$ | `area` | $A$ | $S_i$ | Internal cross-sectional flow area, $\pi D^2 / 4$ | $\text{m}^2$ |
| $L$ | `length_m` | $L$ | $L$ | Total straight pipe length (suction + discharge) | $\text{m}$ |
| $L_e$ | `le` / `entranceLength` | $L_e$ | $L$ (entry) | Context-dependent: (a) equivalent pipe length of fittings $(\Sigma K) D / f$; (b) hydrodynamic entrance length | $\text{m}$ |
| $z$, $\Delta z$ | `elevation_m` | $z$, $\Delta z = z_1 - z_2$ | $z$ | Elevation above datum; $\Delta z = z_{\text{out}} - z_{\text{in}}$ | $\text{m}$ |
| $\theta$ | `sinTheta = dz / L` | — | — | Pipe inclination angle from horizontal ($\sin\theta = \Delta z / L$) | $\text{rad}$ |
| $\varepsilon$ | `PIPE_ROUGHNESS` | absolute roughness | — | Absolute internal pipe wall roughness | $\text{m}$ ($\text{mm}$) |
| $\varepsilon / D$ | `eD` | $e$ or $e/d$ | — | Relative pipe roughness | dimensionless |
| $s$ | `s` (`pipe_route.ts`) | — | — | Canvas arc-length coordinate along routed pipe centerline | $\text{px}$ |

### 2.2 Fluid Flow, Hydrodynamics & Losses

| Symbol | Visualcheme UI / Code | **[T&S]** | **[S&L]** | Description | SI Unit (UI Unit) |
| :---: | :--- | :---: | :---: | :--- | :--- |
| $v$ or $\bar{v}$ | `velocity` ($v$) | $u$ | $V$ or $u_{\text{mean}}$ | Cross-sectional mean (bulk) fluid velocity, $\dot{m}/(\rho A)$ | $\text{m/s}$ |
| $u(r)$ | `radialProfile` | — | $u\{R\}$ | Local axial velocity at radial position $r$ | $\text{m/s}$ |
| $u_{\max}$ | — | — | $2 u_{\text{mean}}$ (lam.) | Centerline ($r = 0$) maximum axial velocity | $\text{m/s}$ |
| $Q$ | `Q_in`, `Q_actual` | $Q$ | $Q$ | Volumetric flow rate, $v A$ | $\text{m}^3/\text{s}$ ($\text{m}^3/\text{h}$) |
| $\dot{m}$ | `mDot` | $m$ | $\dot{m}$ | Mass flow rate, $\rho v A$ | $\text{kg/s}$ |
| $G$ | — | — | $G$ | Mass flux (mass velocity), $\dot{m}/A = \rho v$ | $\text{kg/(m}^2\cdot\text{s)}$ |
| $\mathrm{Re}$ | `reynolds` (`Re`) | $\mathrm{Re}$ | $N_{\text{Re}}$ or $\mathrm{Re}$ | Reynolds number, $\rho v D / \mu = 4\dot{m}/(\pi D \mu)$ | dimensionless |
| $f$ | `friction_factor` ($f$) | $8 f_{\text{T\&S}}$ | $f_D$ ($= 4 f$) | Darcy–Weisbach friction factor | dimensionless |
| $n$ | `powerLawN` | — | — | Turbulent power-law velocity profile exponent, $n \approx 1/\sqrt{f}$ | dimensionless |
| $K$ | `K`, `K_valve`, `kTotal` | $K$ | — | Minor-loss resistance coefficient (number of velocity heads lost) | dimensionless |
| $h$ | `valveOpen` | fractional opening | — | Fractional valve stem/plug opening, $h \in (0, 1]$ | dimensionless ($\%$) |
| $C_v$ | — (reference) | $C_v$ | — | ISA control valve flow coefficient (gpm water at $1\text{ psi}$ $\Delta P$) | $\text{gpm/psi}^{1/2}$ |
| $h_L$ | `head_loss` ($h_L$) | $\Delta P_f / (\rho g)$ | — | Cumulative irreversible head loss (friction + fittings + valve) | $\text{m}$ |
| $\text{HGL}$ | `hydraulic_grade` | — | — | Hydraulic grade line (piezometric head), $z + P/(\rho g)$ | $\text{m}$ |
| $\text{EGL}$ | `energy_grade` | — | total head | Energy grade line (total head), $z + P/(\rho g) + v^2/(2g)$ | $\text{m}$ |
| $a_{\text{in}}, a_{\text{out}}$ | `aIn`, `aOut` | — | — | End-boundary velocity-head flags ($0$ = still vessel, $1$ = flowing pipe) | dimensionless |
| $I$ | `baseMixing` | — | — | Pipe-core turbulence intensity estimate, $I \approx 0.16\,\mathrm{Re}^{-1/8}$ | dimensionless |

### 2.3 Thermodynamics, Thermophysical Properties & Heat Transfer

| Symbol | Visualcheme UI / Code | **[T&S]** | **[S&L]** | Description | SI Unit (UI Unit) |
| :---: | :--- | :---: | :---: | :--- | :--- |
| $P$ | `pressure` ($P$) | $P$ | $P$ | Absolute static fluid pressure | $\text{Pa}$ ($\text{kPa}$) |
| $P^{\text{sat}}$ or $P_v$ | `pvap` | $P_i^\circ$, $P_v$ | $P_v$ | Pure-liquid saturation vapor pressure at $T$ | $\text{Pa}$ ($\text{kPa}$) |
| $T$ | `temperature` ($T$) | $T$ | $T$ | Absolute bulk (mixing-cup) temperature | $\text{K}$ ($^\circ\text{C}$) |
| $T_{\text{amb}}$, $T_0$ | `T_amb` | — | $T_0$ | Ambient / dead-state surroundings temperature | $\text{K}$ ($^\circ\text{C}$) |
| $T_f, T_b, T_c$ | `tf`, `tb`, `tc` | $T_b, T_c$ | $T_c$ | Normal freezing, normal boiling, and critical temperatures | $\text{K}$ ($^\circ\text{C}$) |
| $T_r, P_r$ | `Tr` | $T_r, P_r$ | $T_r, P_r$ | Reduced temperature $T/T_c$ and reduced pressure $P/P_c$ | dimensionless |
| $\rho$ | `density` ($\rho$) | $\rho$ | $\rho$ | Liquid mass density at local $T$ | $\text{kg/m}^3$ |
| $\mu$ | `viscosity` ($\mu$) | $\mu$ | $\mu$ | Dynamic (shear) viscosity at local $T$ ($1\text{ cP} = 10^{-3}\text{ Pa}\cdot\text{s}$) | $\text{Pa}\cdot\text{s}$ ($\text{cP}$) |
| $\nu$ | — | — | $\nu$ (cSt) | Kinematic viscosity, $\mu/\rho$ ($1\text{ cSt} = 10^{-6}\text{ m}^2/\text{s}$) | $\text{m}^2/\text{s}$ |
| $c_p$ | `cp` | $C_p$ | $c_p$ or $C_p$ | Specific isobaric liquid heat capacity | $\text{J/(kg}\cdot\text{K)}$ |
| $k$ | `k` | $k$ | $k$ | Liquid thermal conductivity | $\text{W/(m}\cdot\text{K)}$ |
| $\beta$ | `beta` | — | — | Isobaric thermal expansivity, $-\frac{1}{\rho}\left(\frac{\partial \rho}{\partial T}\right)_P$ | $\text{K}^{-1}$ |
| $h$ (thermo) | — | $H$ | $H$ | Specific enthalpy, $u + P/\rho$ | $\text{J/kg}$ |
| $s$ (thermo) | — | — | $S$ | Specific entropy | $\text{J/(kg}\cdot\text{K)}$ |
| $B$ | — | — | $B = H - T_0 S$ | Specific flow availability (exergy) function | $\text{J/kg}$ |
| $U$ | `U_BY_MODE` | $U$ | $U_i$ | Overall wall heat-transfer coefficient (referenced to inner wall area) | $\text{W/(m}^2\cdot\text{K)}$ |
| $q'$ | `qIn` | — | — | Heat transfer rate into fluid per unit pipe length, $-U \pi D (T - T_{\text{amb}})$ | $\text{W/m}$ |
| $\text{NTU}$ | `ntu` (tests) | $\text{NTU}$ | — | Number of transfer units, $U \pi D L / (\dot{m} c_p)$ | dimensionless |
| $\dot{W}_{\text{diss}}$ | `dissipation_W` | — | — | Mechanical power dissipated to heat, $\dot{m} g h_L$ | $\text{W}$ |
| $L\dot{W}$ | — (roadmap) | — | $L\dot{W} = T_0 \Delta \dot{S}_{\text{irr}}$ | Rate of lost work (exergy destruction rate) | $\text{W}$ |

### 2.4 Centrifugal Pump & Cavitation

| Symbol | Visualcheme UI / Code | **[T&S]** | **[S&L]** | Description | SI Unit (UI Unit) |
| :---: | :--- | :---: | :---: | :--- | :--- |
| $H$ or $H_{\text{pump}}$ | `H_pump` | $h$ | $H$ | Total head developed by the pump | $\text{m}$ |
| $H_{\text{shutoff}}$ | `h_shutoff_m` | — | — | Pump head at zero flow ($Q = 0$) | $\text{m}$ |
| $H_{\text{sys}}$ | `hSystem` | total head | — | System head required at flow $Q$ | $\text{m}$ |
| $H_{\text{static}}$ | `hStatic` | static head | — | Static head, $\Delta z + (P_{\text{delivery}} - P_{\text{in}})/(\rho g)$ | $\text{m}$ |
| $Q_{\max}$ | `q_max_m3h` | — | — | Pump runout capacity where $H(Q_{\max}) = 0$ | $\text{m}^3/\text{s}$ ($\text{m}^3/\text{h}$) |
| $Q_{\text{BEP}}$ | `q_bep_m3h` | — | — | Best-efficiency point (BEP) volumetric flow rate | $\text{m}^3/\text{s}$ ($\text{m}^3/\text{h}$) |
| $\eta$, $\eta_{\text{BEP}}$ | `eta`, `eta_bep` | $\eta_p$ ($\%$) | $\eta$, $\eta_P$ | Pump hydraulic/total efficiency ($0 < \eta < 1$) | dimensionless ($\%$) |
| $\eta_M$ | — (reference) | $E_e$ | $\eta_M$ | Electric motor driver efficiency | dimensionless |
| $P_{\text{hyd}}$ | `hydraulicPower` | — | $P_T$ (THp) | Hydraulic (theoretical) fluid power, $\rho g Q H$ | $\text{W}$ ($\text{kW}$) |
| $P_B$ | `brakePower` | Power | $P_B$ (BHp) | Pump shaft (brake) power, $\rho g Q H / \eta$ | $\text{W}$ ($\text{kW}$) |
| $NPSH_a$ | `npsha` | $NPSH_{\text{avail}}$ | $NPSH_A$ | Net positive suction head available at pump suction | $\text{m}$ |
| $NPSH_r$ | `npshr` | $NPSH_{\text{reqd}}$ | required $NPSH$ | Net positive suction head required by pump impeller | $\text{m}$ |
| $z_1$ | `z1 = -pumpX * dz` | $H$ (Eq. 20.21) | — | Suction liquid surface elevation above pump centerline | $\text{m}$ |
| $h_{fs}$ | `suctionLoss` | $P_f / (\rho g)$ | — | Suction-line frictional & minor head loss (net of $-a_{\text{in}} v^2/2g$) | $\text{m}$ |
| $N_s$, $N'_s$ | — (reference) | $N_s, N'_S$ | — | Pump specific speed (dimensionless / US customary) | — |
