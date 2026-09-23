/**
 * Hydrodynamic friction factor & minor-loss solver.
 * Sourced from Towler & Sinnott, Chemical Engineering Design (2nd ed.), Ch. 20.
 *
 * All friction factors here are Darcy-Weisbach factors: dP = f (L/D) (rho v^2 / 2).
 * Towler's Figure 20.5 plots f_Towler = f_Darcy / 8 (and Fanning C_f = f_Darcy / 4).
 */

export type FlowRegime = 'laminar' | 'transition' | 'turbulent';
export type FrictionCorrelation = 'colebrook' | 'swamee_jain' | 'churchill';
export type ValveType = 'gate_valve' | 'globe_valve' | 'ball_valve';

/** Upper limit of stable laminar pipe flow. */
export const RE_LAMINAR_MAX = 2300;
/** Lower limit of fully turbulent pipe flow. */
export const RE_TURBULENT_MIN = 4000;

export interface FrictionResult {
  f: number;
  regime: FlowRegime;
  reynolds: number;
  relativeRoughness: number;
  correlation: FrictionCorrelation;
}

export function classifyRegime(Re: number): FlowRegime {
  if (Re < RE_LAMINAR_MAX) return 'laminar';
  if (Re < RE_TURBULENT_MIN) return 'transition';
  return 'turbulent';
}

/**
 * K versus fractional opening for partially open valves (turbulent flow).
 * Gate and globe data: Towler & Sinnott Table 20.4.
 * Ball valve data: classic quarter-turn plug-cock data (Weisbach), with opening
 * mapped as 1 - theta/90deg; it is not part of Towler Table 20.4.
 */
const VALVE_K_DATA: Record<ValveType, [number, number][]> = {
  gate_valve: [
    [0.25, 16],
    [0.5, 4],
    [0.75, 1],
    [1.0, 0.15]
  ],
  globe_valve: [
    [0.25, 112],
    [0.5, 36],
    [1.0, 9]
  ],
  ball_valve: [
    [0.278, 486],
    [0.333, 206],
    [0.444, 52.6],
    [0.556, 17.3],
    [0.667, 5.47],
    [0.778, 1.56],
    [0.889, 0.29],
    [1.0, 0.05]
  ]
};

/** Fixed K values for fittings, Towler & Sinnott Table 20.4. */
const FITTING_K: Record<string, number> = {
  elbow_45_standard: 0.35,
  elbow_45_long: 0.2,
  elbow_90_standard: 0.8,
  elbow_90_long: 0.45,
  elbow_90_square: 1.5,
  tee_entry_from_leg: 1.2,
  tee_entry_into_leg: 1.8,
  union_coupling: 0.04,
  entrance_sharp: 0.5,
  exit_sudden_expansion: 1.0
};

/** Absolute roughness in meters. */
const PIPE_ROUGHNESS: Record<string, number> = {
  drawn_tubing: 0.0000015,     // Towler Table 20.3
  copper_plastic: 0.0000015,
  stainless_steel: 0.000015,
  commercial_steel: 0.000046,  // Towler Table 20.3
  galvanized_iron: 0.00015,
  cast_iron: 0.00026,          // Towler Table 20.3
  concrete: 0.0012             // Towler Table 20.3 gives 0.3-3.0 mm
};

export class FrictionSolver {
  /**
   * Darcy friction factor for any Reynolds number.
   *
   * Laminar: f = 64/Re (exact, Hagen-Poiseuille).
   * Turbulent: selected correlation.
   * Transition: the flow is intermittent and f is physically indeterminate;
   * Colebrook and Swamee-Jain bridge it by log-log interpolation between the
   * laminar value at Re = 2300 and the turbulent value at Re = 4000.
   * Churchill (1977) is a single continuous equation over all regimes.
   */
  public static calculateFrictionFactor(
    Re: number,
    relativeRoughness: number,
    correlation: FrictionCorrelation = 'colebrook'
  ): FrictionResult {
    const eD = Math.max(0, relativeRoughness);
    const regime = classifyRegime(Re);
    const result = (f: number): FrictionResult => ({ f, regime, reynolds: Re, relativeRoughness: eD, correlation });

    if (Re <= 0) return result(NaN);
    if (correlation === 'churchill') return result(this.churchill(Re, eD));
    if (regime === 'laminar') return result(64.0 / Re);

    const turbulent = (r: number) => (correlation === 'swamee_jain' ? this.swameeJain(r, eD) : this.solveColebrook(r, eD));
    if (regime === 'turbulent') return result(turbulent(Re));

    const fLam = 64.0 / RE_LAMINAR_MAX;
    const fTurb = turbulent(RE_TURBULENT_MIN);
    const s = Math.log(Re / RE_LAMINAR_MAX) / Math.log(RE_TURBULENT_MIN / RE_LAMINAR_MAX);
    return result(Math.exp(Math.log(fLam) + s * (Math.log(fTurb) - Math.log(fLam))));
  }

  /**
   * Colebrook-White: 1/sqrt(f) = -2 log10( (e/D)/3.7 + 2.51/(Re sqrt(f)) ).
   * Solved by Newton-Raphson on x = 1/sqrt(f), where the residual is smooth and
   * nearly linear, starting from Swamee-Jain.
   */
  public static solveColebrook(Re: number, eD: number): number {
    const a = eD / 3.7;
    const b = 2.51 / Re;
    let x = 1.0 / Math.sqrt(this.swameeJain(Re, eD));

    for (let i = 0; i < 20; i++) {
      const inner = a + b * x;
      const g = x + 2.0 * Math.log10(inner);
      const dg = 1.0 + (2.0 * b) / (Math.LN10 * inner);
      const step = g / dg;
      x -= step;
      if (Math.abs(step) < 1e-12 * x) break;
    }
    return 1.0 / (x * x);
  }

  /** Swamee-Jain (1976) explicit approximation to Colebrook (turbulent only). */
  public static swameeJain(Re: number, eD: number): number {
    return 0.25 / Math.pow(Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
  }

  /** Churchill (1977), valid across laminar, transition and turbulent flow. */
  public static churchill(Re: number, eD: number): number {
    const A = Math.pow(2.457 * Math.log(1.0 / (Math.pow(7.0 / Re, 0.9) + 0.27 * eD)), 16);
    const B = Math.pow(37530.0 / Re, 16);
    return 8.0 * Math.pow(Math.pow(8.0 / Re, 12) + 1.0 / Math.pow(A + B, 1.5), 1.0 / 12.0);
  }

  /**
   * Valve loss coefficient at fractional opening (0-1], log-log interpolation
   * of tabulated data. Below the lowest tabulated opening the last segment's
   * power law is extrapolated, consistent with K ~ (open area)^-2 near closure.
   */
  public static getValveK(valveType: ValveType, opening: number): number {
    const data = VALVE_K_DATA[valveType] ?? VALVE_K_DATA.gate_valve;
    const h = Math.min(1.0, Math.max(1e-3, opening));

    let i = data.findIndex(([hi]) => hi >= h);
    if (i <= 0) i = 1;
    const [h0, k0] = data[i - 1];
    const [h1, k1] = data[i];
    const slope = Math.log(k1 / k0) / Math.log(h1 / h0);
    return k0 * Math.pow(h / h0, slope);
  }

  /** Fixed fitting loss coefficient (Towler Table 20.4). */
  public static getFittingK(fittingType: string): number {
    return FITTING_K[fittingType] ?? 0.0;
  }

  public static getPipeRoughness(material: string): number {
    return PIPE_ROUGHNESS[material] ?? PIPE_ROUGHNESS.commercial_steel;
  }
}
