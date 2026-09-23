export interface PropertyModel {
  eq: number;
  units: string;
  coeffs: number[];
}

export interface Compound {
  name: string;
  formula: string;
  cas: string;
  mw: number;         // kg/kmol (g/mol)
  tc: number;         // Critical temperature (K)
  pc: number;         // Critical pressure (Pa)
  vc: number;         // Critical volume (m3/kmol)
  zc: number;         // Critical compressibility factor
  omega: number;      // Acentric factor
  tb: number;         // Normal boiling point (K)
  tf: number;         // Normal melting/freezing point (K)
  hf: number;         // Standard enthalpy of formation (J/kmol)
  parachor?: number;  // Parachor for surface tension (kg^0.25 m^3 / s^0.5 kmol)
  pv_model?: PropertyModel | null;
  antoine_model?: PropertyModel | null;
  rho_l_model?: PropertyModel | null;
  mu_l_model?: PropertyModel | null;
  mu_v_model?: PropertyModel | null;
  k_l_model?: PropertyModel | null;
  k_v_model?: PropertyModel | null;
  hvap_model?: PropertyModel | null;
  cp_ig_model?: PropertyModel | null;
  cp_l_model?: PropertyModel | null;
}

export interface NRTLPair {
  id1: number;
  id2: number;
  a12_cal_mol: number;
  a21_cal_mol: number;
  alpha: number;
  system: string;
}

export type BinaryPRMatrix = Record<string, Record<string, number>>;
