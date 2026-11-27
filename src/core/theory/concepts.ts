import { TheoryConcept } from './types';
import { TheoryRepository } from './repository';

/**
 * Curated concept previews for every technical feature shown in Visualcheme's UI.
 * Each entry powers Wikipedia-style hover previews (with live KaTeX equations and textbook citations)
 * and deep-links to the exact section inside `docs/theory/`.
 */
export const THEORY_CONCEPTS: Record<string, TheoryConcept> = {
  // ── Header & Global Reference ──────────────────────────────────────────────
  'header:dippr-core': {
    id: 'header:dippr-core',
    eyebrow: 'Fundamentals · Property Core',
    title: 'DIPPR 801 & DECHEMA Property Core',
    equation: '\\vec{\\Phi}_L(T) = [\\rho,\\; \\mu,\\; c_p,\\; k,\\; P^{\\text{sat}},\\; \\beta]',
    summary:
      'Pure-component liquid properties are evaluated locally at $T(x)$ from 431 species parameterized in DIPPR 801 / ChemSep correlation forms (eqs. 10, 16, 100–106), alongside 352 DECHEMA NRTL binary pairs.',
    citation: '**[T&S]** Ch. 4.4 · **[S&L]** Ch. 7.4 · **[EXT]** DIPPR 801',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '1-role-in-the-visualization-page'
  },
  'header:presets': {
    id: 'header:presets',
    eyebrow: 'Pipe Flow · Guided Scenarios',
    title: 'Pedagogical Quick Presets',
    summary:
      'All 11 presets isolate canonical fluid-mechanics phenomena: Hagen–Poiseuille laminar flow, Towler Example 20.1, uphill pressure drop vs. head loss, post-valve flashing, routed fittings, pump duty points, cavitation, and dead-head.',
    citation: '**[T&S]** Ex. 20.1, 20.7–20.8 · **[S&L]** Ex. 10.3, 14.1',
    docSlug: 'pipe-flow/06-validity-phase-change-and-presets',
    anchor: '4-pedagogical-guide-to-all-11-quick-presets-preset-select'
  },
  'header:nomenclature': {
    id: 'header:nomenclature',
    eyebrow: 'Reference · Conventions',
    title: 'Master Nomenclature & Friction Factor Triad',
    equation: 'f_D = 4\\,C_f = 8\\,f_{\\text{T\\&S}}',
    summary:
      'Reconciles every symbol, unit, and sign convention across Towler & Sinnott, Seider et al., and Visualcheme — including the critical factor-of-4 (Fanning) and factor-of-8 (Coulson–Richardson) friction factor conversions.',
    citation: '**[T&S]** Ch. 20 Nomenclature · **[S&L]** Ch. 10, 12, 14',
    docSlug: 'nomenclature',
    anchor: '11-the-friction-factor-triad-factor-of-4-and-factor-of-8'
  },

  // ── Plotted Variable Bar (#property-bar) ───────────────────────────────────
  'pill:header': {
    id: 'pill:header',
    eyebrow: 'Pipe Flow · Visualization',
    title: 'Spatial Heatmaps & Minimum Span',
    summary:
      'Maps any solved 1D spatial field $y(x)$ across 201 nodes onto the pipe heatmap and profile chart. Each variable enforces a physical `minSpan` so microscopic numerical variations are never stretched into misleading gradients.',
    citation: '**[EXT]** Normalized 1D field mapping (`displayRange`)',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '32-heatmap-normalization-and-minimum-display-span-minspan'
  },
  'pill:pressure': {
    id: 'pill:pressure',
    eyebrow: 'Pipe Flow · Momentum Balance',
    title: 'Absolute Static Pressure $P(x)$',
    equation: '\\frac{dP}{dx} = -\\frac{f\\,\\rho v^2}{2D} - \\rho g\\sin\\theta',
    summary:
      'Static fluid pressure marched by RK4 along the pipe with discrete point jumps at entrances, fittings, the valve, and any pump. Unlike head loss $h_L$, static pressure includes reversible elevation ($\\rho g\\Delta z$) and pump head.',
    citation: '**[T&S]** Eq. (20.16) · **[S&L]** Eq. (12.18)',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '1-the-core-pedagogical-distinction-pressure-drop-ne-head-loss'
  },
  'pill:hydraulic_grade': {
    id: 'pill:hydraulic_grade',
    eyebrow: 'Pipe Flow · Grade Lines',
    title: 'Hydraulic Grade Line (HGL)',
    equation: '\\mathrm{HGL}(x) = z(x) + \\frac{P(x)}{\\rho(x)\\,g}',
    summary:
      'Piezometric head — the liquid height in an open tube tapped into the wall. Because elevation $z$ and hydrostatic pressure cancel, HGL slopes downward purely at the friction rate $f v^2/(2gD)$ regardless of pipe tilt.',
    citation: '**[T&S]** Ch. 20.7.2 · **[S&L]** Eq. (14.2) · **[EXT]**',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '21-hydraulic-grade-line-piezometric-head'
  },
  'pill:energy_grade': {
    id: 'pill:energy_grade',
    eyebrow: 'Pipe Flow · Grade Lines',
    title: 'Energy Grade Line (EGL)',
    equation: '\\mathrm{EGL}(x) = z(x) + \\frac{P(x)}{\\rho(x)\\,g} + \\frac{v(x)^2}{2g}',
    summary:
      'Total mechanical head (HGL plus velocity head $v^2/2g$). By the Second Law, EGL can never rise in the flow direction unless shaft work is added by a pump; inside still vessels, EGL meets HGL.',
    citation: '**[S&L]** Eq. (14.2) · **[EXT]** Total head / Pitot head',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '22-energy-grade-line-total-head'
  },
  'pill:temperature': {
    id: 'pill:temperature',
    eyebrow: 'Fundamentals · Energy Balance',
    title: 'Bulk Fluid Temperature $T(x)$',
    equation: '\\frac{dT}{dx} = \\frac{1}{c_p}\\!\\left[\\frac{q\'}{\\dot{m}} + \\frac{f v^2}{2D} + \\frac{\\beta T}{\\rho}\\frac{dP}{dx}\\right]',
    summary:
      'Mixing-cup temperature from the coupled 1D liquid enthalpy balance ($dh = c_p\\,dT + (1-\\beta T)dP/\\rho$), combining ambient wall heat exchange, viscous dissipation, liquid Joule–Thomson warming, and pump inefficiency heating.',
    citation: '**[S&L]** Ch. 10 & Ch. 14.1 · **[T&S]** Ch. 19.2 · **[EXT]**',
    docSlug: 'fundamentals/02-conservation-and-second-law',
    anchor: '24-steady-flow-first-law-and-liquid-enthalpy-identity'
  },
  'pill:head_loss': {
    id: 'pill:head_loss',
    eyebrow: 'Pipe Flow · Dissipation',
    title: 'Cumulative Irreversible Head Loss $h_L$',
    equation: 'h_L(x) = \\int_0^x \\frac{f\\,v^2}{2gD}\\,dx\' + \\sum_{x_i \\le x} K_i\\frac{v_i^2}{2g}',
    summary:
      'Tracks strictly irreversible mechanical energy dissipated by wall friction, fittings, valve throttling, and tank-exit jet mixing. Independent of reversible elevation changes $\\Delta z$ and pump input.',
    citation: '**[T&S]** Ch. 20.4 & 20.7.2 · **[S&L]** Ch. 10.8',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '1-the-core-pedagogical-distinction-pressure-drop-ne-head-loss'
  },
  'pill:viscosity': {
    id: 'pill:viscosity',
    eyebrow: 'Fundamentals · Transport Properties',
    title: 'Dynamic Shear Viscosity $\\mu(T)$',
    equation: '\\mu(T) = \\exp\\!\\left(A + \\frac{B}{T} + C\\ln T + D\\,T^E\\right)',
    summary:
      'Evaluated locally along the pipe using the DIPPR 101 exponential correlation ($1\\text{ cP} = 10^{-3}\\text{ Pa}\\cdot\\text{s}$). Strongly temperature-dependent for viscous liquids like ethylene glycol, shifting $\\mathrm{Re}(x)$ axially.',
    citation: '**[S&L]** Table 7.14 · **[T&S]** Ch. 4.4 · **[EXT]** DIPPR 101',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '34-dippr-101-vapor-pressure-and-liquid-viscosity-ext'
  },
  'pill:reynolds': {
    id: 'pill:reynolds',
    eyebrow: 'Pipe Flow · Flow Regimes',
    title: 'Local Reynolds Number $\\mathrm{Re}(x)$',
    equation: '\\mathrm{Re}(x) = \\frac{\\rho v D}{\\mu} = \\frac{4\\,\\dot{m}}{\\pi D\\,\\mu(T(x))}',
    summary:
      'Dimensionless ratio of inertial to viscous forces. Because $\\dot{m}$ and $D$ are invariant along a uniform pipe, $\\mathrm{Re}(x)$ varies axially purely through local viscosity $\\mu(T(x))$.',
    citation: '**[T&S]** Eq. (20.2) · **[S&L]** Ch. 12.3 & 15.3',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '2-the-reynolds-number-re'
  },

  // ── Control Category Headers ───────────────────────────────────────────────
  'cat:Fluid / Substance': {
    id: 'cat:Fluid / Substance',
    eyebrow: 'Fundamentals · Properties',
    title: 'Working Fluids & DIPPR Correlations',
    equation: '\\vec{\\Phi}_L(T) = [\\rho,\\; \\mu,\\; c_p,\\; k,\\; P^{\\text{sat}},\\; \\beta]',
    summary:
      'Six benchmark pure liquids spanning water, polar alcohols/glycols, volatile acetone, and aromatics — all evaluated continuously from DIPPR 801 / ChemSep correlations with regression-range checking.',
    citation: '**[T&S]** Ch. 4.4 · **[S&L]** Ch. 7.4',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '4-benchmark-properties-of-the-six-pipe-flow-working-fluids'
  },
  'cat:Inlet Conditions': {
    id: 'cat:Inlet Conditions',
    eyebrow: 'Fundamentals · Balances',
    title: 'Inlet State & Boundary Conditions',
    equation: '\\dot{m} = \\rho(T_{\\text{in}})\\,v_{\\text{in}}\\,A',
    summary:
      'Fixes the steady mass flow rate (in imposed-velocity mode), inlet enthalpy and pressure $P_1$, and surrounding air temperature $T_{\\text{amb}}$ driving ambient heat exchange.',
    citation: '**[T&S]** Ch. 20.7.2 · **[S&L]** Ch. 12.3',
    docSlug: 'fundamentals/02-conservation-and-second-law',
    anchor: '2-governing-continuous-differential-equations-straight-pipe'
  },
  'cat:Geometry': {
    id: 'cat:Geometry',
    eyebrow: 'Pipe Flow · Conduit',
    title: 'Pipe Bore, Length, Elevation & Wall',
    equation: '\\Delta P_f = f\\,\\frac{L}{D}\\frac{\\rho v^2}{2}, \\qquad \\sin\\theta = \\frac{\\Delta z}{L}',
    summary:
      'Conduit diameter $D$, length $L$, elevation rise $\\Delta z$, absolute roughness $\\varepsilon$, and thermal insulation $U$ jointly govern wall friction, hydrostatic pressure change, and heat loss.',
    citation: '**[T&S]** Ch. 20.4.1 & Table 20.3 · **[S&L]** Ch. 12.3',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '1-the-darcy-weisbach-equation-and-friction-factor-conventions'
  },
  'cat:Fittings (accidentes)': {
    id: 'cat:Fittings (accidentes)',
    eyebrow: 'Pipe Flow · Minor Losses',
    title: 'Pipe Fittings, Entrances & Tank Exit',
    equation: '\\Delta P_m = K\\,\\frac{\\rho v^2}{2}, \\qquad L_e = \\frac{(\\Sigma K)\\,D}{f}',
    summary:
      'Localized velocity-head losses at vessel mouths, bends, tees, and tank discharges. Every added fitting physically routes the 2D pipe drawing and introduces a discrete step drop in the RK4 march.',
    citation: '**[T&S]** Ch. 20.4.2 Table 20.4 · **[EXT]** Crane TP-410',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '1-two-methods-for-minor-losses-velocity-heads-k-vs-equivalent-length-led'
  },
  'cat:Operations & Valves': {
    id: 'cat:Operations & Valves',
    eyebrow: 'Pipe Flow · Flow Control',
    title: 'Industrial Valves & Throttling',
    equation: 'K(h) = K_0\\left(\\frac{h}{h_0}\\right)^m, \\qquad \\Delta P_v = K\\,\\frac{\\rho v^2}{2}',
    summary:
      'Contrasts isolation valves (gate, ball) against throttling control valves (globe) via log–log partial-opening resistance curves, isenthalpic throttling warming, and ISA $C_v$ conversion.',
    citation: '**[T&S]** Ch. 20.5 & 20.11 · **[S&L]** Fig. 10.14',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '4-industrial-valves-and-partial-opening-throttling-valvetype-valveopeningpct'
  },
  'cat:Centrifugal Pump': {
    id: 'cat:Centrifugal Pump',
    eyebrow: 'Pipe Flow · Pumping',
    title: 'Centrifugal Pumps, System Curve & NPSH',
    equation: 'H_{\\text{pump}}(Q^*) = H_{\\text{sys}}(Q^*), \\qquad NPSH_a > NPSH_r',
    summary:
      'Models parabolic $H(Q)$ and $\\eta(Q)$ vendor curves, quadratic $NPSH_r(Q)$, bisection operating-point intersection, brake power, discharge heating, and impeller cavitation diagnostics.',
    citation: '**[T&S]** Ch. 20.7 · **[S&L]** Ch. 14.1 & 16.5',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '1-operating-principle-and-total-pump-head'
  },
  'cat:Model Options': {
    id: 'cat:Model Options',
    eyebrow: 'Pipe Flow · Friction Models',
    title: 'Selectable Friction Factor Correlations',
    equation: '\\frac{1}{\\sqrt{f}} = -2\\log_{10}\\!\\left(\\frac{\\varepsilon/D}{3.7} + \\frac{2.51}{\\mathrm{Re}\\sqrt{f}}\\right)',
    summary:
      'Switch live between implicit Colebrook–White (Newton–Raphson reference), explicit Swamee–Jain, and all-regime Churchill (1977) and watch the active curve update on the Moody diagram.',
    citation: '**[T&S]** Fig. 20.5 · **[EXT]** Colebrook / Swamee–Jain / Churchill',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '3-turbulent-friction-factor-correlations-frictionmodel'
  },

  // ── Controls Parameters (`param:...`) ──────────────────────────────────────
  'param:fluid': {
    id: 'param:fluid',
    eyebrow: 'Fundamentals · Working Fluids',
    title: 'Working Fluid Selection',
    equation: '\\vec{\\Phi}_L(T) = [\\rho,\\; \\mu,\\; c_p,\\; k,\\; P^{\\text{sat}},\\; \\beta]',
    summary:
      'Loads NIST-validated pure-liquid correlations from `compounds.json`. Contrasts water (high $c_p$), volatile acetone ($T_b = 56.1\\,^\\circ\\text{C}$), high-freezing benzene ($T_f = 5.5\\,^\\circ\\text{C}$), and viscous ethylene glycol ($16.1\\text{ cP}$ at $25\\,^\\circ\\text{C}$).',
    citation: '**[T&S]** Ch. 4.4 · **[S&L]** Ch. 7.4',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '4-benchmark-properties-of-the-six-pipe-flow-working-fluids'
  },
  'param:velocity': {
    id: 'param:velocity',
    eyebrow: 'Pipe Flow · Continuity',
    title: 'Inlet Mean Velocity $v$',
    equation: 'v = \\frac{Q}{A} = \\frac{4\\,\\dot{m}}{\\pi\\rho D^2}',
    summary:
      'Bulk cross-sectional speed at the inlet (ignored in pump operating-point mode, where the pump–system intersection fixes $Q$). Typical pumped liquid design speeds are $0.5\\text{–}1.5\\text{ m/s}$ suction and $1.5\\text{–}3.0\\text{ m/s}$ discharge.',
    citation: '**[T&S]** Ch. 20.10 · **[S&L]** Ch. 6.7 Heuristic 38',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '1-mean-velocity-and-volumetric-mass-flow-rate'
  },
  'param:diameter_mm': {
    id: 'param:diameter_mm',
    eyebrow: 'Pipe Flow · Sizing & Scaling',
    title: 'Internal Pipe Diameter $D$',
    equation: '\\Delta P_f \\propto \\frac{f\\,L\\,Q^2}{D^5}, \\qquad \\mathrm{Re} = \\frac{4\\,\\dot{m}}{\\pi D\\mu}',
    summary:
      'At fixed volumetric flow $Q$, frictional pressure drop scales inversely with the fifth power of diameter ($D^{-5}$)! Economic sizing balances rising pipe capital cost against falling pumping power.',
    citation: '**[T&S]** Ch. 20.10 Eqs. (20.29)–(20.31) · **[S&L]** Ch. 12.3',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '6-design-velocity-guidelines-and-economic-pipe-sizing'
  },
  'param:length_m': {
    id: 'param:length_m',
    eyebrow: 'Pipe Flow · Darcy–Weisbach',
    title: 'Total Pipe Length $L$',
    equation: '\\Delta P_f = f\\left(\\frac{L}{D}\\right)\\frac{\\rho v^2}{2}',
    summary:
      'Straight-pipe frictional pressure drop and heat-transfer surface area ($\\pi D L$) both scale linearly with $L$. Visualcheme discretizes $[0, L]$ into 201 uniform RK4 nodes ($\\Delta x = L/200$).',
    citation: '**[T&S]** Eq. (20.1) · **[EXT]** 201-node RK4 march',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '1-the-darcy-weisbach-equation-and-friction-factor-conventions'
  },
  'param:elevation_m': {
    id: 'param:elevation_m',
    eyebrow: 'Pipe Flow · Hydrostatics',
    title: 'Elevation Rise $\\Delta z = z_{\\text{out}} - z_{\\text{in}}$',
    equation: '\\Delta P_{\\text{elev}} = \\rho g\\,\\Delta z, \\qquad \\sin\\theta = \\frac{\\Delta z}{L}',
    summary:
      'Positive for uphill flow (clipped to $\\pm L$). Elevation shifts static pressure and system static head reversibly without altering irreversible head loss $h_L$ or HGL slope.',
    citation: '**[T&S]** Eq. (20.16) · **[S&L]** Heuristic 38 & Eq. (14.2)',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '1-the-core-pedagogical-distinction-pressure-drop-ne-head-loss',
    presetId: 'pipe_uphill'
  },
  'param:material': {
    id: 'param:material',
    eyebrow: 'Pipe Flow · Wall Roughness',
    title: 'Pipe Material & Relative Roughness $\\varepsilon/D$',
    equation: 'f_{\\text{rough}} = \\left[-2\\log_{10}\\!\\left(\\frac{\\varepsilon/D}{3.7}\\right)\\right]^{-2}',
    summary:
      'Sets absolute wall roughness $\\varepsilon$ (from $0.0015\\text{ mm}$ drawn tubing to $1.2\\text{ mm}$ concrete). Has zero effect in laminar flow ($64/\\mathrm{Re}$), but dominates fully rough turbulent resistance.',
    citation: '**[T&S]** Table 20.3 (p. 1216) · **[EXT]** Moody (1944)',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '5-pipe-surface-roughness-epsilon-and-relative-roughness-epsilon-d',
    presetId: 'pipe_cast_iron'
  },
  'param:heat_transfer_mode': {
    id: 'param:heat_transfer_mode',
    eyebrow: 'Fundamentals · Heat Transfer',
    title: 'Conduit Insulation & Overall $U$',
    equation: 'q\'(x) = -U\\,\\pi D\\,(T - T_{\\text{amb}}), \\qquad \\mathrm{NTU} = \\frac{U\\pi D L}{\\dot{m}c_p}',
    summary:
      'Sets inner-wall overall heat-transfer coefficient: Bare ($15\\text{ W/m}^2\\text{K}$, air convection limited), Insulated ($0.5\\text{ W/m}^2\\text{K}$), or Adiabatic ($U = 0$, isolating viscous/JT/pump heating).',
    citation: '**[S&L]** Eq. (12.10) · **[T&S]** Ch. 19.2',
    docSlug: 'fundamentals/02-conservation-and-second-law',
    anchor: '3-wall-heat-transfer-model-heattransfermode-ambienttempc'
  },
  'param:temp_c': {
    id: 'param:temp_c',
    eyebrow: 'Fundamentals · Properties & Phase',
    title: 'Inlet Fluid Temperature $T_{\\text{in}}$',
    equation: '\\mathrm{Re}(T) \\propto \\frac{1}{\\mu(T)}, \\qquad P^{\\text{sat}}(T) \\uparrow \\text{ exponentially}',
    summary:
      'Governs every local thermophysical property ($\\rho, \\mu, c_p, \\beta, P^{\\text{sat}}$). Raising $T$ slashes viscosity (raising $\\mathrm{Re}$) and spikes vapor pressure (reducing NPSH margin and flashing headroom).',
    citation: '**[T&S]** Ch. 4.4 · **[S&L]** Ch. 7.4',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '2-the-local-liquid-state-vector'
  },
  'param:ambient_temp_c': {
    id: 'param:ambient_temp_c',
    eyebrow: 'Fundamentals · Heat Transfer',
    title: 'Ambient Surroundings Temperature $T_{\\text{amb}}$',
    equation: 'T(L) \\approx T_{\\text{amb}} + (T_{\\text{in}} - T_{\\text{amb}})\\,e^{-\\mathrm{NTU}}',
    summary:
      'Drives convective wall heat exchange whenever $U > 0$. Cold surroundings can cool a viscous fluid enough to shift its Reynolds regime or even trigger freezing alerts (e.g., Benzene below $5.5\\,^\\circ\\text{C}$).',
    citation: '**[T&S]** Ch. 19.2 · **[S&L]** Eq. (12.10)',
    docSlug: 'fundamentals/02-conservation-and-second-law',
    anchor: '3-wall-heat-transfer-model-heattransfermode-ambienttempc'
  },
  'param:p_inlet_kpa': {
    id: 'param:p_inlet_kpa',
    eyebrow: 'Pipe Flow · Boundary Pressure',
    title: 'Inlet Absolute Pressure $P_{\\text{in}}$',
    equation: 'NPSH_a = \\frac{P_1 - P_v(T)}{\\rho g} + z_1 - h_{fs}',
    summary:
      'Sets absolute upstream static pressure (suction vessel pressure $P_1$ in the NPSH balance). Must remain above saturation vapor pressure $P^{\\text{sat}}(T)$ everywhere to avoid boiling or flashing.',
    citation: '**[T&S]** Eq. (20.21) · **[S&L]** Ch. 14.1',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '52-npsha-governing-equation'
  },
  'param:entrance': {
    id: 'param:entrance',
    eyebrow: 'Pipe Flow · Vessel Boundary',
    title: 'Pipe Entrance from Still Vessel',
    equation: '\\Delta P_{\\text{mouth}} = -(1 + K_{\\text{in}})\\frac{\\rho v^2}{2}, \\qquad \\Delta h_L = K_{\\text{in}}\\frac{v^2}{2g}',
    summary:
      'Switches node 0 from a flowing conduit to a still vessel ($v = 0$): $1.0$ velocity head accelerates fluid reversibly (dropping HGL only), while $K_{\\text{in}}$ ($0.05$ rounded, $0.5$ sharp, $0.8$ re-entrant) dissipates irreversibly via vena-contracta separation.',
    citation: '**[T&S]** Table 20.4 · **[EXT]** Crane TP-410',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '31-pipe-entrances-from-a-still-vessel-entrance',
    presetId: 'pipe_fittings'
  },
  'param:exit': {
    id: 'param:exit',
    eyebrow: 'Pipe Flow · Vessel Boundary',
    title: 'Sudden Exit into Receiving Tank ($K = 1$)',
    equation: '\\Delta P_{\\text{exit}} = 0, \\qquad \\Delta h_{L,\\text{exit}} = 1.0\\,\\frac{v^2}{2g}',
    summary:
      'Submerged free jet exits at tank static pressure with zero pressure recovery; its entire kinetic energy $v^2/(2g)$ dissipates inside the stagnant tank, dropping EGL down to meet HGL.',
    citation: '**[T&S]** Table 20.4 (`Sudden expansion`, p. 1217)',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '32-sudden-exit-into-a-receiving-tank-exit-sudden-kout-10',
    presetId: 'pipe_fittings'
  },
  'param:n_elbow_90': {
    id: 'param:n_elbow_90',
    eyebrow: 'Pipe Flow · Line Fitting',
    title: '90° Standard Elbow ($K = 0.80$)',
    equation: '\\Delta P_m = 0.80\\left(\\frac{\\rho v^2}{2}\\right), \\qquad r_{\\text{bend}} = 1.0\\,D',
    summary:
      'Turns the pipe $90^\\circ$ at centerline radius $1.0\\,D$. Inner-wall boundary-layer separation and centrifugal Dean secondary vortices dissipate $0.80$ velocity heads per elbow ($L_e/D \\approx 30\\text{–}40$).',
    citation: '**[T&S]** Table 20.4 (p. 1217)',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '2-line-fittings-catalog-fittingsts-piperoutets',
    presetId: 'pipe_fittings'
  },
  'param:n_elbow_90_long': {
    id: 'param:n_elbow_90_long',
    eyebrow: 'Pipe Flow · Line Fitting',
    title: '90° Long-Radius Elbow ($K = 0.45$)',
    equation: '\\Delta P_m = 0.45\\left(\\frac{\\rho v^2}{2}\\right), \\qquad r_{\\text{bend}} = 1.5\\,D',
    summary:
      'Gentler $1.5\\,D$ curvature radius suppresses inner-wall separation compared to a standard $1.0\\,D$ elbow, cutting minor head loss nearly in half ($K = 0.45$ vs. $0.80$).',
    citation: '**[T&S]** Table 20.4 (p. 1217)',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '2-line-fittings-catalog-fittingsts-piperoutets'
  },
  'param:n_elbow_45': {
    id: 'param:n_elbow_45',
    eyebrow: 'Pipe Flow · Line Fitting',
    title: '45° Standard Elbow ($K = 0.35$)',
    equation: '\\Delta P_m = 0.35\\left(\\frac{\\rho v^2}{2}\\right), \\qquad r_{\\text{bend}} = 1.0\\,D',
    summary:
      'Half the turning angle of a $90^\\circ$ elbow produces weaker secondary circulation and smaller wake separation ($K = 0.35$, $L_e/D \\approx 15$).',
    citation: '**[T&S]** Table 20.4 (p. 1217)',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '2-line-fittings-catalog-fittingsts-piperoutets'
  },
  'param:n_elbow_square': {
    id: 'param:n_elbow_square',
    eyebrow: 'Pipe Flow · Line Fitting',
    title: 'Square (Mitred) Elbow ($K = 1.50$)',
    equation: '\\Delta P_m = 1.50\\left(\\frac{\\rho v^2}{2}\\right), \\qquad r_{\\text{bend}} = 0',
    summary:
      'Sharp $90^\\circ$ mitred corner creates a severe inner-corner separation bubble and recirculation zone, nearly doubling the loss of a standard curved elbow ($K = 1.50$, $L_e/D \\approx 75$).',
    citation: '**[T&S]** Table 20.4 (p. 1217)',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '2-line-fittings-catalog-fittingsts-piperoutets'
  },
  'param:n_tee_branch': {
    id: 'param:n_tee_branch',
    eyebrow: 'Pipe Flow · Line Fitting',
    title: 'Tee — Entry into Branch ($K = 1.80$)',
    equation: '\\Delta P_m = 1.80\\left(\\frac{\\rho v^2}{2}\\right), \\qquad \\frac{L_e}{D} \\approx 90',
    summary:
      'Flow impacts a stagnant blind-leg cushion straight ahead before turning $90^\\circ$ into the branch — the highest-loss standard fitting in the line catalog.',
    citation: '**[T&S]** Table 20.4 (`Tee-entry into leg`, p. 1217)',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '2-line-fittings-catalog-fittingsts-piperoutets'
  },
  'param:n_tee_run': {
    id: 'param:n_tee_run',
    eyebrow: 'Pipe Flow · Line Fitting',
    title: 'Tee — Entry from Branch ($K = 1.20$)',
    equation: '\\Delta P_m = 1.20\\left(\\frac{\\rho v^2}{2}\\right), \\qquad \\frac{L_e}{D} \\approx 60',
    summary:
      'Flow turns $90^\\circ$ out of a side branch with a blind leg behind the outflow, producing less frontal stagnation loss than entry into a branch ($K = 1.20$ vs. $1.80$).',
    citation: '**[T&S]** Table 20.4 (`Tee-entry from leg`, p. 1217)',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '2-line-fittings-catalog-fittingsts-piperoutets'
  },
  'param:valve_opening_pct': {
    id: 'param:valve_opening_pct',
    eyebrow: 'Pipe Flow · Valve Throttling',
    title: 'Partial-Opening Valve Resistance $K(h)$',
    equation: 'K(h) = K_0\\left(\\frac{h}{h_0}\\right)^m, \\qquad m = \\frac{\\ln(K_1/K_0)}{\\ln(h_1/h_0)}',
    summary:
      'Interpolated in log–log space between tabulated openings at station $x = 0.60\\,L$. Closing a valve causes $K$ to climb steeply ($\\propto h^{-2}$ near closure), shifting pump operating points and risking vena-contracta cavitation or flashing.',
    citation: '**[T&S]** Table 20.4 & Ch. 20.11 · **[S&L]** Ex. 10.3',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '42-tabulated-kh-data-and-log-log-power-law-interpolation-frictionts',
    presetId: 'pipe_throttled'
  },
  'param:valve_type': {
    id: 'param:valve_type',
    eyebrow: 'Pipe Flow · Valve Selection',
    title: 'Gate, Globe & Ball Valve Geometry',
    equation: 'C_v = \\frac{Q}{N}\\sqrt{\\frac{\\text{SG}}{\\Delta P}} \\iff K = \\frac{891\\,d_{\\text{in}}^4}{C_v^2}',
    summary:
      'Gate ($K = 0.15$ open) and ball ($K = 0.05$ open) valves are low-loss isolation valves; globe valves ($K = 9.0$ open, S-shaped path) provide smooth throttling authority for flow control.',
    citation: '**[T&S]** Ch. 20.5, Table 20.4, Eq. (20.32) · **[EXT]** Weisbach',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '41-valve-engineering-functions-t-and-s-ch-205-pp-1219-1221-and-fig-206'
  },
  'param:pump_enabled': {
    id: 'param:pump_enabled',
    eyebrow: 'Pipe Flow · Centrifugal Pump',
    title: 'Centrifugal Pump Head & Pressure Rise',
    equation: '\\Delta P_{\\text{pump}} = \\rho g H, \\qquad \\Delta T_{\\text{pump}} = \\frac{gH}{c_p}\\!\\left(\\frac{1}{\\eta} - 1 + \\beta T\\right)',
    summary:
      'Places an in-line radial centrifugal pump that boosts static pressure (and HGL/EGL) by $\\rho g H$. Curves are plotted in head $H$ (meters of liquid) because head is nearly independent of density $\\rho$ for low-viscosity liquids.',
    citation: '**[T&S]** Ch. 20.7 · **[S&L]** Eq. (14.2) & Ex. 14.1',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '11-total-head-developed-by-a-pump',
    presetId: 'pipe_pump_duty'
  },
  'param:drive_mode': {
    id: 'param:drive_mode',
    eyebrow: 'Pipe Flow · Pump–System Coupling',
    title: 'Operating Point vs. Imposed Velocity',
    equation: 'H_{\\text{pump}}(Q^*) = H_{\\text{sys}}(Q^*)',
    summary:
      'In **operating-point mode**, 70-step bisection solves the unique flow $Q^*$ where pump head meets system resistance so the outlet reaches $P_{\\text{delivery}}$. In **imposed mode**, the velocity slider overrides $Q$ for didactic comparison.',
    citation: '**[T&S]** Fig. 20.17 & Ex. 20.8 · **[S&L]** Ch. 14.1',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '33-drive-modes-and-the-pump-chart-pump-chart-wrapper',
    presetId: 'pipe_pump_duty'
  },
  'param:pump_position_pct': {
    id: 'param:pump_position_pct',
    eyebrow: 'Pipe Flow · Suction Hydraulics',
    title: 'Pump Station & Suction Line Split',
    equation: 'z_1 = -x_{\\text{pump}}\\,\\Delta z, \\qquad NPSH_a = \\frac{P_1 - P_v}{\\rho g} + z_1 - h_{fs}',
    summary:
      'Everything upstream of `pump_position_pct` belongs to the suction line. Moving a pump farther downstream along an uphill pipe increases both suction lift ($-z_1$) and suction friction $h_{fs}$, draining $NPSH_a$.',
    citation: '**[T&S]** Eq. (20.21) & Ex. 20.7',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '52-npsha-governing-equation',
    presetId: 'pipe_npsh'
  },
  'param:h_shutoff_m': {
    id: 'param:h_shutoff_m',
    eyebrow: 'Pipe Flow · Pump Curve',
    title: 'Shutoff Head $H_{\\text{shutoff}}$ & $H\\text{–}Q$ Curve',
    equation: 'H(Q) = H_{\\text{shutoff}}\\left[1 - \\left(\\frac{Q}{Q_{\\max}}\\right)^2\\right]',
    summary:
      'Maximum head developed at zero flow (closed discharge valve). If static head $H_{\\text{static}} \\ge H_{\\text{shutoff}}$, the pump dead-heads and delivers zero flow.',
    citation: '**[T&S]** Figs. 20.15–20.17 · **[EXT]** Parabolic $H(Q)$',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '21-head-capacity-h-q-curve',
    presetId: 'pipe_dead_head'
  },
  'param:q_max_m3h': {
    id: 'param:q_max_m3h',
    eyebrow: 'Pipe Flow · Pump Curve',
    title: 'Runout Flow $Q_{\\max}$',
    equation: 'H(Q_{\\max}) = 0',
    summary:
      'Capacity where internal impeller and volute losses consume the entire head rise. If $H_{\\text{pump}}(Q_{\\max}) > H_{\\text{sys}}(Q_{\\max})$, the pump runs out beyond its curve.',
    citation: '**[T&S]** Ch. 20.7.5 · **[S&L]** Fig. 14.2',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '21-head-capacity-h-q-curve'
  },
  'param:q_bep_m3h': {
    id: 'param:q_bep_m3h',
    eyebrow: 'Pipe Flow · Pump Efficiency',
    title: 'Best-Efficiency Point $Q_{\\text{BEP}}$',
    equation: '\\eta(Q) = \\eta_{\\text{BEP}}\\left[2\\frac{Q}{Q_{\\text{BEP}}} - \\left(\\frac{Q}{Q_{\\text{BEP}}}\\right)^2\\right]',
    summary:
      'Design capacity where impeller vane angles match flow direction with minimum shock loss. Operating far left or right of $Q_{\\text{BEP}}$ wastes brake power as fluid heating.',
    citation: '**[T&S]** Fig. 20.14 · **[S&L]** Eq. (16.17)',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '22-pump-efficiency-eta-q-curve'
  },
  'param:eta_bep': {
    id: 'param:eta_bep',
    eyebrow: 'Pipe Flow · Shaft Power',
    title: 'Peak Pump Efficiency $\\eta_{\\text{BEP}}$',
    equation: 'P_B = \\frac{\\rho g Q H}{\\eta}, \\qquad \\Delta T_{\\text{loss}} = \\frac{gH}{c_p}\\left(\\frac{1}{\\eta} - 1\\right)',
    summary:
      'Peak hydraulic-to-shaft efficiency at $Q_{\\text{BEP}}$ (typically $45\\text{–}85\\%$ depending on capacity). The missing fraction $(1/\\eta - 1)$ dissipates directly into heat in the discharged liquid.',
    citation: '**[T&S]** Eqs. (20.18)–(20.19) · **[S&L]** Eq. (16.17) & Ex. 14.1',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '4-hydraulic-power-brake-power-and-pump-heating'
  },
  'param:npshr_m': {
    id: 'param:npshr_m',
    eyebrow: 'Pipe Flow · Cavitation',
    title: 'Required Net Positive Suction Head ($NPSH_r$)',
    equation: 'NPSH_r(Q) = NPSH_{r,\\text{BEP}}\\left(\\frac{Q}{Q_{\\text{BEP}}}\\right)^2',
    summary:
      'Minimum head above vapor pressure required at the pump suction flange to prevent flashing inside the impeller eye. Scales quadratically with capacity as eye inlet velocity rises.',
    citation: '**[T&S]** Ch. 20.7.4 · **[S&L]** Ch. 14.1 & 16.5',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '23-required-net-positive-suction-head-npshr-q-curve',
    presetId: 'pipe_npsh'
  },
  'param:p_delivery_kpa': {
    id: 'param:p_delivery_kpa',
    eyebrow: 'Pipe Flow · System Curve',
    title: 'Delivery Pressure & System Static Head',
    equation: 'H_{\\text{static}} = \\Delta z + \\frac{P_{\\text{delivery}} - P_{\\text{in}}}{\\rho g}',
    summary:
      'Target absolute pressure at the discharge vessel. Together with elevation rise $\\Delta z$, sets the zero-flow intercept $H_{\\text{static}}$ of the system resistance curve $H_{\\text{sys}}(Q)$.',
    citation: '**[T&S]** Eq. (20.17) & Ch. 20.7.5',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '31-system-head-equation-linehead-in-pumpts'
  },
  'param:friction_model': {
    id: 'param:friction_model',
    eyebrow: 'Pipe Flow · Friction Correlations',
    title: 'Colebrook–White, Swamee–Jain & Churchill',
    equation: '\\frac{1}{\\sqrt{f}} = -2.0\\log_{10}\\!\\left(\\frac{\\varepsilon/D}{3.7} + \\frac{2.51}{\\mathrm{Re}\\sqrt{f}}\\right)',
    summary:
      'Selects the turbulent Darcy friction factor solver: implicit Colebrook–White (Newton–Raphson to $10^{-12}$), explicit Swamee–Jain (within $2.8\\%$), or continuous all-regime Churchill (1977).',
    citation: '**[T&S]** Fig. 20.5 · **[EXT]** Colebrook / Swamee–Jain / Churchill',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '3-turbulent-friction-factor-correlations-frictionmodel'
  },

  // ── KPI Cards (`kpi:...`) ──────────────────────────────────────────────────
  'kpi:reynolds': {
    id: 'kpi:reynolds',
    eyebrow: 'Pipe Flow · Flow Regime',
    title: 'Flow Regime Classification ($\\mathrm{Re}$ & $f$)',
    equation: '\\mathrm{Re} = \\frac{\\rho v D}{\\mu} \\;:\\; \\text{Lam. } (<2300) \\mid \\text{Trans.} \\mid \\text{Turb. } (\\ge 4000)',
    summary:
      'Classifies flow from laminar ($f = 64/\\mathrm{Re}$, roughness-independent) through the indeterminate transition zone to fully turbulent flow governed by $\\mathrm{Re}$ and $\\varepsilon/D$.',
    citation: '**[S&L]** Ch. 15.3 · **[T&S]** Fig. 20.5 & Ch. 19.8',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '3-flow-regime-classification-and-threshold-contrast'
  },
  'kpi:total_dp': {
    id: 'kpi:total_dp',
    eyebrow: 'Pipe Flow · Pressure Balance',
    title: 'Total Pressure Drop Decomposition',
    equation: '\\begin{aligned}\\Delta P_{\\text{total}} &= \\Delta P_f + \\Delta P_{\\text{fit}} + \\Delta P_{\\text{valve}} \\\\ &\\quad + \\Delta P_{\\text{accel}} + \\rho g\\Delta z - \\rho g H\\end{aligned}',
    summary:
      'Separates irreversible frictional/minor drops from reversible hydrostatic elevation ($\\rho g\\Delta z$), mouth acceleration ($\\frac{1}{2}\\rho v^2$), and pump pressure boost ($\\rho g H$).',
    citation: '**[T&S]** Eqs. (20.16)–(20.17) · **[S&L]** Eq. (12.18)',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '1-the-core-pedagogical-distinction-pressure-drop-ne-head-loss'
  },
  'kpi:valve': {
    id: 'kpi:valve',
    eyebrow: 'Pipe Flow · Throttling Loss',
    title: 'In-Line Valve Loss ($K$ & $\\Delta P_{\\text{valve}}$)',
    equation: '\\Delta P_{\\text{valve}} = K(h)\\,\\frac{\\rho v^2}{2}, \\qquad \\Delta T = \\frac{(1 - \\beta T)\\,\\Delta P_{\\text{valve}}}{\\rho c_p}',
    summary:
      'Isenthalpic point drop at $x = 0.60\\,L$. Adiabatic throttling conserves enthalpy ($\\Delta h = 0$) while generating entropy and destroying flow availability ($L\\dot{W} = \\dot{m}T_0\\Delta S > 0$).',
    citation: '**[T&S]** Table 20.4 & Ch. 20.11 · **[S&L]** Fig. 10.14 & Ex. 10.3',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '43-thermodynamic-jump-and-relation-to-control-valve-cv-t-and-s-ch-2011'
  },
  'kpi:fittings': {
    id: 'kpi:fittings',
    eyebrow: 'Pipe Flow · Minor Losses',
    title: 'Fittings Sum ($\\Sigma K$) & Equivalent Length ($L_e$)',
    equation: '\\Delta P_{\\text{fittings}} = (\\Sigma K)\\frac{\\rho v^2}{2}, \\qquad L_e = \\frac{(\\Sigma K)\\,D}{f}',
    summary:
      'Solver marches each fitting via velocity heads $K$ (which Towler notes is fundamentally more accurate) and reports the equivalent straight-pipe length $L_e$ evaluated at the actual pipe friction factor $f$.',
    citation: '**[T&S]** Ch. 20.4.2 Table 20.4 & Ex. 20.1',
    docSlug: 'pipe-flow/03-minor-losses-fittings-and-valves',
    anchor: '1-two-methods-for-minor-losses-velocity-heads-k-vs-equivalent-length-led'
  },
  'kpi:thermal_trend': {
    id: 'kpi:thermal_trend',
    eyebrow: 'Fundamentals · Thermal Balance',
    title: 'Discharge Temperature & Liquid Joule–Thomson',
    equation: '\\left.\\frac{dT}{dx}\\right|_{\\text{adiab. horiz.}} = \\frac{1 - \\beta T}{\\rho c_p}\\left(\\frac{dP}{dx}\\right)_{\\text{friction}}',
    summary:
      'Even in an adiabatic pipe ($U = 0$), friction and throttling warm a liquid — reduced by the factor $(1 - \\beta T)$ because part of the pressure drop performs reversible expansion work.',
    citation: '**[S&L]** Ch. 10 & Ex. 14.1 · **[EXT]** Liquid enthalpy identity',
    docSlug: 'fundamentals/02-conservation-and-second-law',
    anchor: '24-steady-flow-first-law-and-liquid-enthalpy-identity'
  },
  'kpi:head_loss': {
    id: 'kpi:head_loss',
    eyebrow: 'Pipe Flow · Irreversible Dissipation',
    title: 'Irreversible Head Loss $h_L$ & Flow Rate',
    equation: 'h_L = \\int_0^L \\frac{f v^2}{2gD}\\,dx + \\sum K_i\\frac{v_i^2}{2g}, \\qquad \\dot{W}_{\\text{diss}} = \\dot{m} g h_L',
    summary:
      'Total mechanical head irreversibly converted to thermal energy by wall shear, fittings, valve throttling, and tank-exit mixing. Unaffected by elevation rise $\\Delta z$.',
    citation: '**[T&S]** Ch. 20.4 & 20.7.2 · **[S&L]** Ch. 10.8',
    docSlug: 'fundamentals/02-conservation-and-second-law',
    anchor: '5-dissipation-second-law-analysis-and-lost-work-s-and-l-ch-10'
  },
  'kpi:pump': {
    id: 'kpi:pump',
    eyebrow: 'Pipe Flow · Pump Duty',
    title: 'Pump Head $H$, Efficiency $\\eta$ & Brake Power $P_B$',
    equation: 'P_{\\text{hyd}} = \\rho g Q H, \\qquad P_B = \\frac{\\rho g Q H}{\\eta}',
    summary:
      'Reports total head developed on the $H(Q)$ curve, hydraulic efficiency $\\eta(Q)$, and shaft brake power $P_B$. Motor electrical power is $P_B / \\eta_M$.',
    citation: '**[T&S]** Eqs. (20.18)–(20.19) · **[S&L]** Eq. (14.1) & (16.16)',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '4-hydraulic-power-brake-power-and-pump-heating'
  },
  'kpi:npsh': {
    id: 'kpi:npsh',
    eyebrow: 'Pipe Flow · Cavitation Safety',
    title: 'Net Positive Suction Head Available ($NPSH_a$)',
    equation: 'NPSH_a = \\frac{P_1 - P_v(T)}{\\rho g} + z_1 - h_{fs} > NPSH_r',
    summary:
      'Head margin above liquid vapor pressure at the pump suction flange. If $NPSH_a < NPSH_r$, vapor bubbles nucleate and violently collapse inside the impeller eye, eroding vanes and destroying head.',
    citation: '**[T&S]** Eq. (20.21) & Ch. 20.7.4 · **[S&L]** Ch. 14.1 & 16.5',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '5-net-positive-suction-head-npsh-and-cavitation',
    presetId: 'pipe_npsh'
  },

  // ── Bulk & Transport Bar (`hud:...`) ───────────────────────────────────────
  'hud:velocity': {
    id: 'hud:velocity',
    eyebrow: 'Pipe Flow · Continuity',
    title: 'Mean Velocity $v(x)$',
    equation: 'v(x) = \\frac{\\dot{m}}{\\rho(T(x))\\,A}',
    summary:
      'Cross-sectional bulk velocity. Shifts slightly from inlet to outlet only when heating or cooling changes local liquid density $\\rho(T)$ by more than $0.5\\%$.',
    citation: '**[T&S]** Ch. 20.4.1 · **[S&L]** Ch. 12.3',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '1-mean-velocity-and-volumetric-mass-flow-rate'
  },
  'hud:reynolds': {
    id: 'hud:reynolds',
    eyebrow: 'Pipe Flow · Hydrodynamics',
    title: 'Reynolds Number $\\mathrm{Re}$',
    equation: '\\mathrm{Re} = \\frac{\\rho v D}{\\mu} = \\frac{4\\,\\dot{m}}{\\pi D\\,\\mu(T)}',
    summary:
      'Ratio of inertial to viscous forces governing flow regime, radial velocity profile shape, entrance length, and friction factor. Displays `inlet → outlet` whenever temperature alters $\\mu(T)$ along the line.',
    citation: '**[T&S]** Eq. (20.2) · **[S&L]** Ch. 12.3 & 15.3',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '2-the-reynolds-number-re'
  },
  'hud:friction_factor': {
    id: 'hud:friction_factor',
    eyebrow: 'Pipe Flow · Moody Factor',
    title: 'Darcy–Weisbach Friction Factor $f$',
    equation: 'f = f_D = \\frac{8\\tau_w}{\\rho v^2} = 4\\,C_f = 8\\,f_{\\text{T\\&S}}',
    summary:
      'Dimensionless wall friction factor ($64/\\mathrm{Re}$ in laminar flow; Colebrook/Swamee–Jain/Churchill in turbulent flow). Note: Towler Fig. 20.5 plots $f_{\\text{T\\&S}} = f_D / 8$.',
    citation: '**[T&S]** Eq. (20.1) & Fig. 20.5 · **[S&L]** Eq. (12.18)',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '1-the-darcy-weisbach-equation-and-friction-factor-conventions'
  },
  'hud:density': {
    id: 'hud:density',
    eyebrow: 'Fundamentals · Volumetric Property',
    title: 'Liquid Mass Density $\\rho(T)$',
    equation: '\\rho_{\\text{molar}}(T) = \\frac{A}{B^{1 + (1 - T/C)^D}}, \\qquad \\beta = -\\frac{1}{\\rho}\\left(\\frac{\\partial\\rho}{\\partial T}\\right)_P',
    summary:
      'Evaluated via DIPPR 105 (Rackett) for organic liquids and DIPPR 106 for water. Its temperature derivative yields thermal expansivity $\\beta(T)$ used in the non-isothermal liquid energy balance.',
    citation: '**[S&L]** Table 7.14 · **[EXT]** DIPPR 105 / 106',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '36-dippr-105-rackett-liquid-molar-density-ext'
  },
  'hud:viscosity': {
    id: 'hud:viscosity',
    eyebrow: 'Fundamentals · Transport Property',
    title: 'Dynamic Shear Viscosity $\\mu(T)$',
    equation: '\\mu(T) = \\exp\\!\\left(A + \\frac{B}{T} + C\\ln T + D\\,T^E\\right)',
    summary:
      'Liquid dynamic viscosity from DIPPR 101 ($1\\text{ cP} = 10^{-3}\\text{ Pa}\\cdot\\text{s}$). Decreases steeply with temperature following an Andrade-type activation-energy relation.',
    citation: '**[S&L]** Table 7.14 · **[T&S]** Ch. 4.4 · **[EXT]** DIPPR 101',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '34-dippr-101-vapor-pressure-and-liquid-viscosity-ext'
  },
  'hud:entrance_length': {
    id: 'hud:entrance_length',
    eyebrow: 'Pipe Flow · Boundary Layer',
    title: 'Hydrodynamic Entrance Length $L_e$ & Profile',
    equation: 'L_e = \\begin{cases} 0.05\\,\\mathrm{Re}\\,D & \\text{Laminar} \\\\ 4.4\\,\\mathrm{Re}^{1/6}D & \\text{Turbulent} \\end{cases}',
    summary:
      'Axial distance required for wall boundary layers to merge into a fully developed profile — Hagen–Poiseuille parabola ($u_{\\max} = 2\\bar{v}$) in laminar flow or $1/n$ power law ($n \\approx 1/\\sqrt{f}$) in turbulent flow.',
    citation: '**[S&L]** Eq. (15.8) & Ch. 24.1 (p. 649) · **[EXT]** White / Nikuradse',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '5-hydrodynamic-entrance-length-le',
    presetId: 'pipe_laminar'
  },

  // ── Charts & 2D Canvas ─────────────────────────────────────────────────────
  'chart:spatial-profile': {
    id: 'chart:spatial-profile',
    eyebrow: 'Pipe Flow · 1D Spatial Profile',
    title: '1D Axial Profile & RK4 Integration',
    equation: '\\mathbf{y}(x) = [P(x),\\; T(x),\\; h_L(x),\\; \\Delta P_f(x)]^T',
    summary:
      'Plots the selected property across 201 stations ($x \\in [0, L]$) integrated by 4th-order Runge–Kutta with exact point jumps at gold fitting ticks, the dashed valve line ($0.60\\,L$), and the pump station.',
    citation: '**[EXT]** Classical RK4 · **[T&S]** Ch. 20.4 & 20.7.2',
    docSlug: 'pipe-flow/04-grade-lines-and-elevation',
    anchor: '3-reading-the-1d-spatial-chart-heatmap-and-hover-probe'
  },
  'chart:pump-system-npsh': {
    id: 'chart:pump-system-npsh',
    eyebrow: 'Pipe Flow · Pump Characteristics',
    title: 'Pump Head, System Curve & NPSH vs. Capacity',
    equation: 'H_{\\text{sys}}(Q) = H_{\\text{static}} + \\left(f\\frac{L}{D} + \\Sigma K + a_{\\text{out}} - a_{\\text{in}}\\right)\\frac{v^2}{2g}',
    summary:
      'Superimposes pump head $H(Q)$, system demand $H_{\\text{sys}}(Q)$, $NPSH_a(Q)$, and $NPSH_r(Q)$. The crossing $(Q^*, H^*)$ is the steady operating point; cavitation begins wherever dashed green $NPSH_a$ drops below rose $NPSH_r$.',
    citation: '**[T&S]** Figs. 20.15–20.17 & Ex. 20.8 · **[S&L]** Ch. 14.1',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '3-system-resistance-curve-and-operating-point',
    presetId: 'pipe_pump_duty'
  },
  'chart:moody-diagram': {
    id: 'chart:moody-diagram',
    eyebrow: 'Pipe Flow · Moody Chart',
    title: 'Moody Diagram ($\\log f_D$ vs. $\\log \\mathrm{Re}$)',
    equation: 'f_{\\text{lam}} = \\frac{64}{\\mathrm{Re}}, \\qquad \\frac{1}{\\sqrt{f}} = -2\\log_{10}\\!\\left(\\frac{\\varepsilon/D}{3.7} + \\frac{2.51}{\\mathrm{Re}\\sqrt{f}}\\right)',
    summary:
      'Displays the laminar line, 9 Colebrook iso-roughness reference curves, the active pipe curve in gold (dashed across the $2300\\text{–}4000$ transition zone for Colebrook/Swamee–Jain), and the live operating point.',
    citation: '**[T&S]** Fig. 20.5 (note $f_D = 8 f_{\\text{T\\&S}}$) · **[EXT]** Moody (1944)',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '6-anatomy-of-visualchemes-moody-chart-diagram-chart-wrapper',
    presetId: 'pipe_towler_20_1'
  },
  'canvas:flow-physics': {
    id: 'canvas:flow-physics',
    eyebrow: 'Pipe Flow · 2D Visualization',
    title: 'Velocity Profile, Tracers, Dean Drift & Bubbles',
    equation: '\\frac{u(r)}{\\bar{v}} = 2\\left[1 - \\left(\\frac{r}{R}\\right)^2\\right] \\;\\text{(lam.)}, \\qquad I \\approx 0.16\\,\\mathrm{Re}^{-1/8}',
    summary:
      'Tracers follow the solved radial profile, mix radially at turbulence intensity $I$, drift outward in curved elbows (Dean secondary flow), shed wakes downstream of fittings, and spawn growing flashing or collapsing cavitation bubbles.',
    citation: '**[S&L]** Eq. (15.8) · **[EXT]** Dean flow & turbulence intensity',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '6-canvas-tracer-particle-physics-piperendererts'
  },

  // ── Validity Diagnostics (`warning:...`) ───────────────────────────────────
  'warning:freezing': {
    id: 'warning:freezing',
    eyebrow: 'Model Validity · Phase Limit',
    title: 'Freezing / Solidification Alert ($T < T_f$)',
    equation: 'T(x) < T_f',
    summary:
      'Fluid temperature falls below the pure-component normal melting point $T_f$ (e.g., Benzene at $5.5\\,^\\circ\\text{C}$). Solidification plugs the pipe, invalidating single-phase liquid flow.',
    citation: '**[T&S]** Ch. 4.4.6 · DIPPR $T_f$',
    docSlug: 'pipe-flow/06-validity-phase-change-and-presets',
    anchor: '21-model-invalid-alerts-hard-physical-failures'
  },
  'warning:boiling': {
    id: 'warning:boiling',
    eyebrow: 'Model Validity · Phase Limit',
    title: 'Inlet Boiling Alert ($P_{\\text{in}} \\le P^{\\text{sat}}$)',
    equation: 'P_{\\text{in}} \\le P^{\\text{sat}}(T_{\\text{in}})',
    summary:
      'Feed enters at or below saturation vapor pressure at $T_{\\text{in}}$, so the stream is already vapor or two-phase before entering the pipe.',
    citation: '**[T&S]** Ch. 20.4.1 (p. 1216)',
    docSlug: 'pipe-flow/06-validity-phase-change-and-presets',
    anchor: '21-model-invalid-alerts-hard-physical-failures'
  },
  'warning:flashing': {
    id: 'warning:flashing',
    eyebrow: 'Model Validity · Phase Change',
    title: 'In-Line / Post-Valve Flashing ($P \\le P^{\\text{sat}}$)',
    equation: 'P(x) \\le P^{\\text{sat}}(T(x))',
    summary:
      'Static pressure falls below saturation vapor pressure (often right across a throttled valve). Liquid spontaneously flashes into two-phase flow; single-phase liquid predictions stop being valid past that point.',
    citation: '**[S&L]** Ex. 10.3 (p. 301) · **[T&S]** Ch. 20.4.1 & 20.11',
    docSlug: 'pipe-flow/06-validity-phase-change-and-presets',
    anchor: '21-model-invalid-alerts-hard-physical-failures',
    presetId: 'pipe_flashing'
  },
  'warning:valve-cavitation': {
    id: 'warning:valve-cavitation',
    eyebrow: 'Model Validity · Valve Trim Risk',
    title: 'Valve Vena-Contracta Cavitation Risk',
    equation: 'P_{\\text{out}} - P^{\\text{sat}} < \\Delta P_{\\text{valve}}',
    summary:
      'Even when downstream recovered pressure stays above $P^{\\text{sat}}$, high-speed liquid inside the valve vena contracta dips below $P^{\\text{sat}}$; bubbles form and violently implode as pressure recovers.',
    citation: '**[T&S]** Ch. 20.11 (p. 1258) · **[EXT]** Vena-contracta recovery',
    docSlug: 'pipe-flow/06-validity-phase-change-and-presets',
    anchor: '22-caution-warnings-engineering-risk-or-model-strain',
    presetId: 'pipe_throttled'
  },
  'warning:pump-cavitation': {
    id: 'warning:pump-cavitation',
    eyebrow: 'Model Validity · Pump Cavitation',
    title: 'Impeller Cavitation ($NPSH_a < NPSH_r$)',
    equation: 'NPSH_a - NPSH_r < 0',
    summary:
      'Pressure inside the impeller eye drops to $P^{\\text{sat}}(T)$, nucleating vapor bubbles that collapse violently against the vanes — causing pitting, noise, vibration, and loss of head.',
    citation: '**[T&S]** Ch. 20.7.4 & Eq. (20.21) · **[S&L]** Ch. 14.1',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '53-cavitation-criterion-safety-margin-and-visual-status',
    presetId: 'pipe_npsh'
  },
  'warning:npsh-tight': {
    id: 'warning:npsh-tight',
    eyebrow: 'Model Validity · Suction Margin',
    title: 'Tight NPSH Safety Margin',
    equation: '0 \\le NPSH_a - NPSH_r < 0.5\\text{ m}',
    summary:
      'Margin is too thin to absorb process temperature or flow upsets. Maintain at least $0.5\\text{ m}$ for stable cold liquids and $\\ge 1.5\\text{ m}$ near the bubble point.',
    citation: '**[T&S]** Ch. 20.7.4 (p. 1236) · **[S&L]** Ch. 16.5',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '53-cavitation-criterion-safety-margin-and-visual-status'
  },
  'warning:pump-dead-head': {
    id: 'warning:pump-dead-head',
    eyebrow: 'Model Validity · Pump Failure',
    title: 'Dead-Head Condition ($H_{\\text{shutoff}} \\le H_{\\text{static}}$)',
    equation: 'H_{\\text{shutoff}} \\le \\Delta z + \\frac{P_{\\text{delivery}} - P_{\\text{in}}}{\\rho g}',
    summary:
      'Even at zero flow, the pump cannot overcome the required static elevation plus pressure rise. Flow halts ($Q = 0$), and churning liquid inside a dead-headed casing rapidly overheats.',
    citation: '**[T&S]** Ch. 20.7.5 · **[S&L]** Ch. 14.1',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '32-finding-the-operating-point-solveoperatingpoint',
    presetId: 'pipe_dead_head'
  },
  'warning:pump-runout': {
    id: 'warning:pump-runout',
    eyebrow: 'Model Validity · Off-Design Pump',
    title: 'Pump Runout / Off-Curve Efficiency',
    equation: 'H_{\\text{pump}}(Q_{\\max}) > H_{\\text{sys}}(Q_{\\max})',
    summary:
      'System resistance is lower than the pump curve right endpoint, or flow exceeds $2\\,Q_{\\text{BEP}}$ where the efficiency parabola drops toward zero.',
    citation: '**[T&S]** Ch. 20.7.5 · **[S&L]** Fig. 14.2',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '32-finding-the-operating-point-solveoperatingpoint'
  },
  'warning:velocity-band': {
    id: 'warning:velocity-band',
    eyebrow: 'Pipe Flow · Design Heuristics',
    title: 'Liquid Suction & Discharge Velocity Bands',
    equation: 'v_{\\text{suction}} \\in [0.5,\\; 1.5]\\text{ m/s}, \\qquad v_{\\text{discharge}} \\in [1.5,\\; 3.0]\\text{ m/s}',
    summary:
      'Standard chemical-plant liquid sizing guidelines balancing erosion and suction NPSH preservation against pipe capital cost and solids settling.',
    citation: '**[T&S]** Section 20.10 (p. 1248) · **[S&L]** Heuristic 38',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '6-design-velocity-guidelines-and-economic-pipe-sizing'
  },
  'warning:transition': {
    id: 'warning:transition',
    eyebrow: 'Model Validity · Critical Zone',
    title: 'Transitional Flow Zone ($2300 \\le \\mathrm{Re} < 4000$)',
    equation: '\\ln f = \\ln f_{\\text{lam}} + s\\,(\\ln f_{\\text{turb}} - \\ln f_{\\text{lam}})',
    summary:
      'Intermittent alternating laminar and turbulent slugs make the friction factor physically indeterminate (drawn dashed on the Moody chart). Process designs intentionally avoid this band.',
    citation: '**[T&S]** Fig. 20.5 & Ch. 19.8 · **[S&L]** Ch. 15.3',
    docSlug: 'pipe-flow/02-friction-and-moody-diagram',
    anchor: '4-transition-zone-bridging-2300-le-re-4000'
  },
  'warning:entrance-length': {
    id: 'warning:entrance-length',
    eyebrow: 'Model Validity · Developing Flow',
    title: 'Long Laminar Entrance Region ($L_e / L$)',
    equation: 'L_e \\approx 0.05\\,\\mathrm{Re}\\,D',
    summary:
      'In the developing entrance region, thinner wall boundary layers produce higher shear stress than fully developed Hagen–Poiseuille flow ($f = 64/\\mathrm{Re}$), so true $\\Delta P$ exceeds the fully developed prediction.',
    citation: '**[S&L]** Ch. 24.1 (p. 649)',
    docSlug: 'pipe-flow/01-flow-regimes-and-velocity-profiles',
    anchor: '5-hydrodynamic-entrance-length-le'
  },
  'warning:elevation-clip': {
    id: 'warning:elevation-clip',
    eyebrow: 'Pipe Flow · Geometry',
    title: 'Elevation Geometric Limit ($|\\Delta z| \\le L$)',
    equation: '|\\sin\\theta| = \\left|\\frac{\\Delta z}{L}\\right| \\le 1',
    summary:
      'A pipe of total length $L$ cannot climb or descend more than $L$ vertically; requested elevation beyond $\\pm L$ is clamped to vertical flow.',
    citation: '**[EXT]** Conduit geometry',
    docSlug: 'pipe-flow/06-validity-phase-change-and-presets',
    anchor: '23-note-advisories-informational-context'
  },
  'warning:property-range': {
    id: 'warning:property-range',
    eyebrow: 'Model Validity · Thermophysical Data',
    title: 'DIPPR Correlation Extrapolation Window',
    equation: 'T \\notin [T_{\\min},\\; T_{\\max}]',
    summary:
      'Local temperature lies outside the experimental regression bounds $[T_{\\min}, T_{\\max}]$ stored in `compounds.json`, so the correlation is extrapolating beyond verified data.',
    citation: '**[T&S]** Ch. 4.4.6 · **[S&L]** Table 7.14',
    docSlug: 'fundamentals/01-thermophysical-properties',
    anchor: '5-key-assumptions-and-extrapolation-diagnostics'
  },
  'warning:pump-mode': {
    id: 'warning:pump-mode',
    eyebrow: 'Pipe Flow · Drive Mode',
    title: 'Pump–System Balance vs. Imposed Flow',
    equation: 'H_{\\text{pump}}(Q^*) = H_{\\text{sys}}(Q^*)',
    summary:
      'Explains whether the solver is computing the natural pump–system intersection $Q^*$ (matching $P_{\\text{delivery}}$) or forcing the velocity slider through the line.',
    citation: '**[T&S]** Ch. 20.7.5 & Ex. 20.8',
    docSlug: 'pipe-flow/05-centrifugal-pumps-and-npsh',
    anchor: '33-drive-modes-and-the-pump-chart-pump-chart-wrapper'
  }
};

/**
 * Look up a concept preview by ID, falling back automatically to YAML `ui_elements`
 * indexing in `TheoryRepository` so future unit docs work automatically.
 */
export function getTheoryConcept(conceptId: string): TheoryConcept | undefined {
  const curated = THEORY_CONCEPTS[conceptId];
  if (curated) return curated;

  const fallbackDoc = TheoryRepository.findByUiElement(conceptId);
  if (!fallbackDoc) return undefined;

  return {
    id: conceptId,
    eyebrow: fallbackDoc.sectionLabel,
    title: fallbackDoc.title,
    equation: fallbackDoc.leadEquation,
    summary: fallbackDoc.excerpt || fallbackDoc.title,
    citation: fallbackDoc.frontmatter.references[0] ?? '',
    docSlug: fallbackDoc.slug
  };
}

/**
 * Build a hash route `#/theory/<slug>[#<anchor>]` for a concept ID.
 */
export function conceptHref(conceptId: string): string {
  const c = getTheoryConcept(conceptId);
  if (!c) return '#/theory';
  return c.anchor ? `#/theory/${c.docSlug}#${c.anchor}` : `#/theory/${c.docSlug}`;
}

/**
 * Classify a dynamic `SimulationWarning.message` into its exact theory concept ID.
 */
export function resolveWarningConceptId(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('freezing')) return 'warning:freezing';
  if (m.includes('would boil')) return 'warning:boiling';
  if (m.includes('would flash')) return 'warning:flashing';
  if (m.includes('valve cavitation')) return 'warning:valve-cavitation';
  if (m.includes('pump cavitates')) return 'warning:pump-cavitation';
  if (m.includes('npsh margin')) return 'warning:npsh-tight';
  if (m.includes('shutoff head')) return 'warning:pump-dead-head';
  if (m.includes('run out') || m.includes('past the efficiency curve') || m.includes('below the peak')) {
    return 'warning:pump-runout';
  }
  if (m.includes('suction band') || m.includes('discharge band')) return 'warning:velocity-band';
  if (m.includes('transitional flow')) return 'warning:transition';
  if (m.includes('entrance length')) return 'warning:entrance-length';
  if (m.includes('elevation rise limited')) return 'warning:elevation-clip';
  if (m.includes('pump–system intersection') || m.includes('imposed flow')) return 'warning:pump-mode';
  return 'warning:property-range';
}

/** Human-readable preset labels shared between simulator and theory pages. */
export const PRESET_LABELS: Record<string, string> = {
  pipe_default: 'Turbulent Water (Re ≈ 83,000)',
  pipe_laminar: 'Laminar Glycol (Re ≈ 330)',
  pipe_throttled: 'Severe Valve Throttling (85% Shut)',
  pipe_cast_iron: 'High-Roughness Cast Iron Pipe',
  pipe_towler_20_1: 'Towler Example 20.1 (25 mm, 120 m)',
  pipe_uphill: 'Uphill Line: Pressure Drop ≠ Head Loss',
  pipe_flashing: 'Hot Acetone Throttled: Flashing',
  pipe_fittings: 'Fittings: elbows, tees, entrance and exit',
  pipe_pump_duty: 'Centrifugal pump operating point',
  pipe_npsh: 'Suction line with a thin NPSH margin',
  pipe_dead_head: 'Pump cannot meet the static head'
};
