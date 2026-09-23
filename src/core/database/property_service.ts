import { Compound, NRTLPair, BinaryPRMatrix, PropertyModel } from './types';
import { evaluateCorrelation } from '../thermo/correlations';
import compoundsData from './compounds.json';
import nrtlData from './binary_nrtl.json';
import prData from './binary_pr.json';

const compounds: Record<string, Compound> = (compoundsData as unknown) as Record<string, Compound>;
const nrtlPairs: NRTLPair[] = (nrtlData as unknown) as NRTLPair[];
const prMatrix: BinaryPRMatrix = (prData as unknown) as BinaryPRMatrix;

/** Complete single-phase liquid property set at one temperature (SI units). */
export interface LiquidState {
  T: number;        // K
  rho: number;      // kg/m3
  mu: number;       // Pa.s
  cp: number;       // J/(kg.K)
  k: number;        // W/(m.K)
  pvap: number;     // Pa
  beta: number;     // 1/K, isobaric thermal expansivity -(1/rho)(d rho/dT)
  /** Human-readable notes about extrapolated or missing correlations. */
  warnings: string[];
}

export class PropertyService {
  /**
   * Retrieve compound data by exact name
   */
  public static getCompound(name: string): Compound | undefined {
    return compounds[name];
  }

  /**
   * Search compounds by partial name, formula, or CAS number
   */
  public static searchCompounds(query: string, limit: number = 20): Compound[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: Compound[] = [];
    for (const c of Object.values(compounds)) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.formula.toLowerCase().includes(q) ||
        c.cas.includes(q)
      ) {
        results.push(c);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  /**
   * List all available compound names (431 species)
   */
  public static listCompoundNames(): string[] {
    return Object.keys(compounds);
  }

  /**
   * Evaluate a stored correlation, recording a warning when it is missing,
   * unsupported, or extrapolated beyond its regression range.
   */
  private static evalModel(
    c: Compound,
    model: PropertyModel | null | undefined,
    T_K: number,
    label: string,
    warnings?: string[]
  ): number {
    if (!model || !model.coeffs) {
      warnings?.push(`${c.name}: no ${label} correlation in database; generic estimate used.`);
      return NaN;
    }
    const res = evaluateCorrelation(model, T_K, c.tc);
    if (!Number.isFinite(res.value)) {
      warnings?.push(`${c.name}: ${label} correlation (eq ${model.eq}) not evaluable at ${T_K.toFixed(1)} K; generic estimate used.`);
      return NaN;
    }
    if (!res.inRange && res.range) {
      warnings?.push(
        `${c.name}: ${label} extrapolated outside data range ${(res.range[0] - 273.15).toFixed(0)}–${(res.range[1] - 273.15).toFixed(0)} °C.`
      );
    }
    return res.value;
  }

  /**
   * Calculate Vapor Pressure P_sat (Pa) at temperature T (Kelvin)
   * DIPPR 101: ln(P) = A + B/T + C*ln(T) + D*T^E
   */
  public static calcVaporPressure(c: Compound, T_K: number, warnings?: string[]): number {
    const p = this.evalModel(c, c.pv_model, T_K, 'vapor pressure', warnings);
    if (Number.isFinite(p)) return p;

    if (c.antoine_model && c.antoine_model.coeffs && c.antoine_model.coeffs.length >= 3) {
      const [A, B, C] = c.antoine_model.coeffs;
      return Math.exp(A - B / (T_K + C));
    }

    // Clausius-Clapeyron through the normal boiling point and the critical point
    if (c.tb && c.tc && c.pc) {
      const lnRatio = Math.log(c.pc / 101325) / (1 / c.tb - 1 / c.tc);
      return 101325 * Math.exp(lnRatio * (1 / c.tb - 1 / T_K));
    }

    return 101325.0;
  }

  /**
   * Calculate Liquid Density (kg/m3) at temperature T (Kelvin)
   * DIPPR 105 (Rackett form) or DIPPR 106, both in kmol/m3.
   */
  public static calcLiquidDensity(c: Compound, T_K: number, warnings?: string[]): number {
    const rhoMolar = this.evalModel(c, c.rho_l_model, T_K, 'liquid density', warnings);
    if (Number.isFinite(rhoMolar) && rhoMolar > 0) return rhoMolar * c.mw;

    // Rackett equation from critical constants
    if (c.tc && c.pc && c.vc) {
      const Zra = c.zc || 0.28;
      const Tr = T_K / c.tc;
      if (Tr < 1.0) {
        const V_kmol = c.vc * Math.pow(Zra, Math.pow(1.0 - Tr, 2.0 / 7.0));
        return c.mw / V_kmol;
      }
    }
    return 850.0;
  }

  /**
   * Isobaric thermal expansivity beta = -(1/rho)(d rho / dT) in 1/K,
   * by central difference of the density correlation.
   */
  public static calcLiquidExpansivity(c: Compound, T_K: number): number {
    const dT = 0.5;
    const rhoPlus = this.calcLiquidDensity(c, T_K + dT);
    const rhoMinus = this.calcLiquidDensity(c, T_K - dT);
    const rho = this.calcLiquidDensity(c, T_K);
    return -(rhoPlus - rhoMinus) / (2 * dT * rho);
  }

  /**
   * Calculate Liquid Dynamic Viscosity (Pa.s) at temperature T (Kelvin)
   * DIPPR 101 (Andrade-type) in Pa.s.
   */
  public static calcLiquidViscosity(c: Compound, T_K: number, warnings?: string[]): number {
    const mu = this.evalModel(c, c.mu_l_model, T_K, 'liquid viscosity', warnings);
    if (Number.isFinite(mu) && mu > 0) return mu;
    return 0.001; // 1 cP fallback
  }

  /**
   * Calculate Heat of Vaporization (J/kmol & kJ/kg) at temperature T (Kelvin)
   * DIPPR 106 in J/kmol.
   */
  public static calcHeatOfVaporization(
    c: Compound,
    T_K: number,
    warnings?: string[]
  ): { j_per_kmol: number; kj_per_kg: number } {
    const h = this.evalModel(c, c.hvap_model, T_K, 'heat of vaporization', warnings);
    const h_j_kmol = Number.isFinite(h) ? h : 88.0 * (c.tb || 373.15) * 1000.0; // Trouton's rule
    return {
      j_per_kmol: h_j_kmol,
      kj_per_kg: h_j_kmol / (c.mw * 1000.0)
    };
  }

  /**
   * Calculate Liquid Heat Capacity Cp (J/kmol.K & kJ/kg.K) at temperature T (Kelvin)
   * ChemSep eq 16: Cp = A + exp(B/T + C + D*T + E*T^2) in J/(kmol.K).
   */
  public static calcLiquidHeatCapacity(
    c: Compound,
    T_K: number,
    warnings?: string[]
  ): { j_per_kmol_k: number; kj_per_kg_k: number } {
    const mw = c.mw > 0 ? c.mw : 18.015;
    let cp_j = this.evalModel(c, c.cp_l_model, T_K, 'liquid heat capacity', warnings);
    if (!Number.isFinite(cp_j) || cp_j <= 0) {
      cp_j = 2.1 * mw * 1000.0; // typical organic liquid, 2.1 kJ/(kg.K)
    }
    return {
      j_per_kmol_k: cp_j,
      kj_per_kg_k: cp_j / (mw * 1000.0)
    };
  }

  /**
   * Calculate Liquid Thermal Conductivity (W/m.K) at temperature T (Kelvin)
   * ChemSep eq 16 in W/(m.K).
   */
  public static calcLiquidThermalConductivity(c: Compound, T_K: number, warnings?: string[]): number {
    const k = this.evalModel(c, c.k_l_model, T_K, 'liquid thermal conductivity', warnings);
    if (Number.isFinite(k) && k > 0) return k;
    return 0.15; // Typical organic liquid ~0.1-0.2 W/m.K
  }

  /**
   * All single-phase liquid properties at T, with correlation-range warnings.
   */
  public static getLiquidState(c: Compound, T_K: number): LiquidState {
    const warnings: string[] = [];
    return {
      T: T_K,
      rho: this.calcLiquidDensity(c, T_K, warnings),
      mu: this.calcLiquidViscosity(c, T_K, warnings),
      cp: this.calcLiquidHeatCapacity(c, T_K, warnings).kj_per_kg_k * 1000.0,
      k: this.calcLiquidThermalConductivity(c, T_K, warnings),
      pvap: this.calcVaporPressure(c, T_K, warnings),
      beta: this.calcLiquidExpansivity(c, T_K),
      warnings
    };
  }

  /**
   * Calculate Vapor Dynamic Viscosity (Pa.s) at temperature T (Kelvin)
   * DIPPR 102: mu_v = A * T^B / (1 + C/T + D/T^2)
   */
  public static calcVaporViscosity(c: Compound, T_K: number, warnings?: string[]): number {
    const mu = this.evalModel(c, c.mu_v_model, T_K, 'vapor viscosity', warnings);
    if (Number.isFinite(mu) && mu > 0) return mu;
    return 1.2e-5; // Typical gas viscosity ~0.012 cP (1.2e-5 Pa.s)
  }

  /**
   * Get NRTL binary parameters between two compounds
   */
  public static getNRTLParams(nameA: string, nameB: string): NRTLPair | undefined {
    const s1 = `${nameA}/${nameB}`.toLowerCase();
    const s2 = `${nameB}/${nameA}`.toLowerCase();
    return nrtlPairs.find(p => {
      const sys = p.system.toLowerCase();
      return sys.includes(s1) || sys.includes(s2);
    });
  }

  /**
   * Get Peng-Robinson binary interaction parameter kij
   */
  public static getPRKij(nameA: string, nameB: string): number {
    if (prMatrix[nameA] && prMatrix[nameA][nameB] !== undefined) {
      return prMatrix[nameA][nameB];
    }
    if (prMatrix[nameB] && prMatrix[nameB][nameA] !== undefined) {
      return prMatrix[nameB][nameA];
    }
    return 0.0;
  }
}
