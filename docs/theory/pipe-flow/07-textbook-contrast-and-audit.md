---
id: pipe-flow-textbook-contrast-audit
title: Textbook Contrast Synthesis (Towler & Sinnott vs. Seider et al. vs. Visualcheme) & Codebase Audit
unit: pipe_flow
ui_elements:
  - all
code_files:
  - src/core/thermo/friction.ts
  - src/core/thermo/fittings.ts
  - src/core/thermo/pump.ts
  - src/core/units/pipe/pipe_unit.ts
  - .agents/skills/che-fluid-transport-piping/SKILL.md
references:
  - "[T&S] Towler & Sinnott (2013), 2nd ed., Ch. 4.4, Ch. 19, Ch. 20"
  - "[S&L] Seider, Lewin, Seader, Widagdo, Gani & Ng (2017), 4th ed., Ch. 6.7, Ch. 7, Ch. 10, Ch. 12.3, Ch. 14.1, Ch. 15.3, Ch. 16.5, Ch. 24.1"
---

# Textbook Contrast Synthesis & Codebase Citation Audit

## 1. Strategic Role of Each Reference Textbook

The two textbooks in `reference texts/` were written with complementary pedagogical goals, which explains why their depth and notation diverge across pipe-flow topics:

- **Towler & Sinnott (2nd ed., 2013) [T&S]** is a **detailed plant & equipment design manual** (descended from Coulson & Richardson Vol. 6). Chapter 20 (*Transport and Storage of Fluids*, 59 pages) provides granular hydraulic calculation methods: friction charts, pipe roughness tables, itemized fitting and partial-opening valve $K$ tables, pump–system curve intersection, NPSH worked designs, economic pipe diameter derivation, mechanical ASME B31.3 pipe schedules, and ISA $C_v$ valve sizing.
- **Seider, Lewin, Seader, Widagdo, Gani, & Ng (4th ed., 2017) [S&L]** is a **process synthesis, simulation, and thermodynamic integration textbook**. Rather than tabulating individual pipe elbows or Colebrook charts, it teaches *how fluid transport fits into a plant flowsheet*: synthesis heuristics (Ch. 6.7), DIPPR/simulator architecture (Ch. 7), **Second-Law lost work** across pipes, valves, and pumps (Ch. 10), heat-exchanger tube Darcy/Fanning equations (Ch. 12.3), pump total head, affinity laws, viscosity derating & simulator heating (Ch. 14.1), laminar parabolic profiles & entry lengths (Ch. 15.3, Ch. 24.1), and pump selection/efficiency/costing (Ch. 16.5).
- **Visualcheme** synthesizes **detailed hydraulics from [T&S]**, **simulator-grade DIPPR properties and non-isothermal / pump-heating thermodynamics echoed by [S&L]**, and **continuous 1D spatial visualization + analytical correlations from classical fluid mechanics [EXT]** into an interactive 60 FPS learning environment.

---

## 2. Master Side-by-Side Technical Contrast

| Technical Concept | Towler & Sinnott **[T&S]** (2nd ed.) | Seider et al. **[S&L]** (4th ed.) | Visualcheme Implementation (`src/`) |
| :--- | :--- | :--- | :--- |
| **Friction factor convention** | **Coulson–Richardson**: $f_{\text{T\&S}} = \tau_w/(\rho u^2)$, $\Delta P_f = 8 f_{\text{T\&S}}(L/d_i)(\rho u^2/2)$ (Eq. 20.1, Fig. 20.5). Mentions Fanning $C_f = 2 f_{\text{T\&S}}$ (Eq. 20.1b). | Presents **both** Darcy $f_D$ and Fanning $f$ ($f_D = 4 f$) in Eq. (12.18), p. 378. | **Darcy–Weisbach** $f = f_D = 8 f_{\text{T\&S}} = 4 C_f$ everywhere (`friction.ts`, Moody chart). |
| **Friction calculation method** | Graphical chart reading (Fig. 20.5, p. 1215) + Genereaux $C_f = 0.04\,\mathrm{Re}^{-0.16}$ for economic sizing (p. 1250). | Smooth-tube Petukhov–Gnielinski $f_D = (1.82\log_{10} N_{\text{Re}} - 1.64)^{-2}$ (Eq. 12.15, p. 377) + Hagen–Poiseuille $32\mu L V/D_i^2$ (p. 650). | **Three selectable correlations** **[EXT]**: Colebrook–White (Newton–Raphson), Swamee–Jain (1976), Churchill (1977), plus exact $64/\mathrm{Re}$ laminar. |
| **Laminar / transition cutoffs** | Fig. 20.5 critical zone $\sim 2000\text{–}4000$; Ch. 19 Eq. (19.19) uses $\mathrm{Re} = 2100$; Ch. 19.8 warns to avoid transition. | Ch. 15.3 (p. 407) uses $\mathrm{Re} < 2300$ laminar; Ch. 12.3 uses $2300$ (Gnielinski) and $10{,}000$ (Dittus–Boelter/Sieder–Tate). | $\mathrm{Re} < 2300$ laminar; $2300 \le \mathrm{Re} < 4000$ transition (dashed log–log bridge + `Caution` warning); $\mathrm{Re} \ge 4000$ turbulent. |
| **Velocity profiles & entrance length** | Not derived in Ch. 20 (assumes fully developed bulk $u$). | Exact laminar parabola $u/u_{\text{mean}} = 2[1-(R/R_t)^2]$ (Eq. 15.8, p. 407) and laminar entry length $L = 0.05 D_i N_{\text{Re}}$ (p. 649). | Laminar parabola + turbulent $1/n$ power law ($n = 1/\sqrt{f} \in [4,12]$) + transition blend + laminar $0.05\,\mathrm{Re}\,D$ & turbulent $4.4\,\mathrm{Re}^{1/6}D$ entrance lengths **[EXT]**. |
| **Pipe roughness data** | Table 20.3 (p. 1216): 4 materials (drawn tubing, commercial steel, cast iron, concrete). | Not tabulated (uses smooth-tube correlation for exchanger tubes). | 6 materials: all 4 from **[T&S]** Table 20.3 plus stainless steel ($0.015\text{ mm}$) & galvanized iron ($0.15\text{ mm}$) **[EXT]**. |
| **Minor losses (fittings & valves)** | Table 20.4 (p. 1217): itemized turbulent $K$ and $L_e/d_i$ (implicitly assuming $f_D \approx 0.02$). States $K$ is more fundamentally correct (p. 1218). | Heuristic 38 (p. 151): $2\text{ psi}/100\text{ ft}$ pipe, $\ge 10\text{ psi}$ control valve; Ch. 12.3 Eq. (12.19): lumped $K_p \approx 1.2$. | Uses exact $K$ point jumps (`fittings.ts`, `friction.ts`) + displays dynamic $L_e = (\Sigma K)D/f$; adds rounded/re-entrant entrances (Crane) & Weisbach ball valve **[EXT]**; log–log power-law $K(h)$. |
| **Mechanical energy & grade lines** | Eq. (20.16)–(20.17) (p. 1232): omits kinetic energy terms; sign convention $\Delta z = z_1 - z_2$, $W$ by fluid. | Eq. (14.2) (p. 397): **includes velocity head $V^2/(2g)$** in pump total head! | Explicit **HGL** & **EGL**, distinguishing still vessels ($a = 0$, reversible mouth acceleration $-\rho v^2/2$, sudden exit dissipation) from continuing pipes ($a = 1$). |
| **Thermal balance & heating** | Ch. 20 assumes isothermal pipelines & pumps (Ch. 19 adds wall-viscosity ratio $(\mu/\mu_w)^{-m}$). | Ch. 14.1 (p. 400, Example 14.1) explicitly discusses simulator pump discharge heating from $\rho(T)$ compression & inefficiency; Ch. 10 treats throttling as isenthalpic ($H_1 = H_2$). | Full **non-isothermal 1D RK4 march** with $dh = c_p dT + (1-\beta T)dP/\rho$, ambient $U$ ($15 / 0.5 / 0$), viscous & JT heating, and exact pump $\Delta T = \frac{gH}{c_p}(1/\eta - 1 + \beta T)$. |
| **Centrifugal pump curves & duty** | Empirical vendor curves (Figs. 20.15–20.17); graphical intersection of pump & system curve (Example 20.8). | Figs. 14.2–14.5; adds **affinity laws** (Eqs. 14.3–14.6), **viscosity derating** ($\nu < 100\text{ cSt}$), empirical $\eta_P(Q)$ & $\eta_M(P_B)$ (Eqs. 16.17–16.18); notes commercial simulators lack $H\text{–}Q$ curves. | Analytical parabolic $H(Q)$ & $\eta(Q)$, quadratic $NPSH_r(Q)$, 70-step bisection duty solver, dead-head & runout detection; **no viscosity derating or affinity-law speed slider yet**. |
| **NPSH & cavitation** | Eq. (20.21) (p. 1237, Example 20.7); rule of thumb $NPSH > 3\text{ m}$ ($\le 100\text{ m}^3/\text{h}$) or $> 6\text{ m}$. | Ch. 14.1 (p. 399): $NPSH_r \approx 2\text{–}10\text{ ft}$; Ch. 16.5 (p. 451, Example 16.6): select centrifugal if $NPSH_a > 5\text{ ft}$ ($1.52\text{ m}$). | Eq. (20.21) + flowing-pipe velocity head correction ($-a_{\text{in}}v^2/2g$); red cavitation alert ($<0$), amber caution ($<0.5\text{ m}$, advises $\ge 1.5\text{ m}$ near boiling), collapsing bubbles. |
| **Liquid velocity & pipe sizing** | Ch. 20.10 (pp. 1248–1252): pumped liquid $1\text{–}3\text{ m/s}$, $\Delta P = 0.5\text{ kPa/m}$, Rase suction/discharge equations, economic $d_{i,\text{opt}}$ Eqs. (20.29)–(20.31). | Ch. 6.7 Heuristic 38 (p. 151): $2\text{ psi}/100\text{ ft}$ ($\approx 0.45\text{ kPa/m}$); Ch. 12.4 (p. 380): tube-side $1\text{–}10\text{ ft/s}$ (typical $4\text{ ft/s} \approx 1.2\text{ m/s}$). | Warns on single-bore suction ($0.5\text{–}1.5\text{ m/s}$) and discharge ($1.5\text{–}3.0\text{ m/s}$) bands when pump is enabled; economic sizing not yet a UI calculator. |
| **Thermophysical properties** | Ch. 4.4 (pp. 169–183): DIPPR 801, DECHEMA, Antoine Eq. (4.2), Lydersen, Chueh–Swanson, Haggenmacher. | Ch. 7 (Table 7.14 p. 188, p. 191): DIPPR correlations for pure-component $P^{\text{sat}}, \rho, c_p, \Delta H_{\text{vap}}, \mu$. | 431 pure species (`compounds.json`, ChemSep/DIPPR eqs. 10, 16, 100, 101, 102, 105, 106), 352 DECHEMA NRTL pairs, PR $k_{ij}$; explicit $[T_{\min}, T_{\max}]$ range warnings. |
| **Second-Law / Lost Work** | Not developed in Ch. 20. | Full Ch. 10 (*Second-Law Analysis*, pp. 287–306): $B = H - T_0 S$, $L\dot{W} = T_0 \Delta \dot{S}_{\text{irr}}$ for friction, valves, pumps. | Computes mechanical dissipation $\dot{W}_{\text{diss}} = \dot{m} g h_L$ internally; full exergy destruction UI planned for future learning module. |

---

## 3. Codebase & Knowledge-Base Citation Audit (Resolved)

Direct verification against both textbook PDFs in `reference texts/` uncovered **four concrete citation/documentation discrepancies** in the repository, all of which have been corrected:

| # | Location in Repo | Former Statement | Corrected Reference (Verified from PDF) | Status |
| :-: | :--- | :--- | :--- | :---: |
| 1 | `src/core/thermo/pump.ts` (L90, L113) | Cited `Towler eq. 20.15` for $NPSH_a = (P_1 - P_v)/(\rho g) + z_1 - h_{fs}$ | Updated to **[T&S]** **Eq. (20.21)** (p. 1237); Eq. (20.15) is US impeller specific speed $N'_S$. *(Physics unchanged — was already exact.)* | **Fixed** |
| 2 | `src/core/units/pipe/pipe_unit.ts` (L988, L998) | UI warning text cited `(Towler Table 20.1)` for suction ($0.5\text{–}1.5\text{ m/s}$) and discharge ($1.5\text{–}3.0\text{ m/s}$) velocity bands | Updated to **`(Towler Section 20.10)`** (p. 1248); Table 20.1 (p. 1210) is compressor/blower operating ranges. | **Fixed** |
| 3 | `.agents/skills/che-fluid-transport-piping/SKILL.md` | Called **[T&S]** $f$ Fanning ($f_D = 4f$), misnumbered $h_f$, Eq. 20.2–20.4, Table 20.1/20.2, Eq. 20.12–20.15, Eq. 20.24–20.25, and Eq. 20.31–20.32 | Rewritten against **[T&S]** 2nd ed. PDF: Coulson–Richardson $f_{\text{T\&S}} = f_D / 8$, corrected Eq. 20.1–20.32, Tables 20.3–20.4, Figs. 20.5/20.15/20.17, and Section 20.10. | **Fixed** |
| 4 | `src/core/units/pipe/pipe_unit.ts` (L291) | Valve Type tooltip cited `(Towler Table 20.4)` for all three valve types | Updated to specify `gate & globe: Towler Table 20.4; ball: Weisbach plug-cock data`, matching `friction.ts`. | **Fixed** |

---

## 4. Physical Simplifications & Opportunities for Future Learning Expansion

Contrasting the live Pipe Flow simulator against **[T&S]** and **[S&L]** naturally highlights high-value learning features to build next:

1. **In-App Equation & Concept Drawer**: Link every slider, KPI card, warning, and chart in `src/ui/` directly to the YAML `ui_elements` tags in this `docs/theory/` environment.
2. **Economic Pipe Diameter & Velocity Advisor** (**[T&S]** Eqs. 20.29–20.31): Display $d_{i,\text{opt}}$ alongside the user's chosen $D$ and plot capital vs. pumping power cost curves live.
3. **Pump Speed / Impeller Affinity-Law Slider & Viscosity Derating** (**[S&L]** Eqs. 14.3–14.6, Fig. 14.5): Let learners compare **variable-speed drive (VFD)** control vs. **discharge-valve throttling** directly on brake power $P_B$ and Second-Law lost work!
4. **Second-Law Lost Work / Exergy Destruction Overlay** (**[S&L]** Ch. 10): Add an interactive `Lost Work (LẆ)` pill contrasting mechanical head loss $h_L$ against thermodynamic availability destruction across friction, valve throttling, ambient heat loss, and pump inefficiency.
5. **Control Valve $C_v$ Readout** (**[T&S]** Eq. 20.32): Show the equivalent ISA $C_v$ alongside $K_{\text{valve}}$ and highlight the $30\%$ dynamic-drop control-authority rule.
6. **Laminar Minor-Loss Correction & Two-Phase / Compressible Extensions**: Upgrade low-$\mathrm{Re}$ fitting $K$ (Hooper 2-$K$) and add Lockhart–Martinelli flashing (**[T&S]** p. 1216) or compressible gas pipeline modules.
