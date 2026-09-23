/**
 * Evaluator for the temperature-dependent correlation forms used by the
 * ChemSep / DIPPR 801 pure-component database (compounds.json).
 *
 * ChemSep stores each model as [coefficients..., Tmin, Tmax]. The number of
 * coefficients depends on the equation number, so the validity range is read
 * from the entries that follow them.
 */
import { PropertyModel } from '../database/types';

const COEFF_COUNT: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  10: 3,
  16: 5,
  100: 5,
  101: 5,
  102: 4,
  105: 4,
  106: 5
};

export interface CorrelationValue {
  value: number;
  /** False when T lies outside the regression range [Tmin, Tmax] of the data set. */
  inRange: boolean;
  range?: [number, number];
}

export function isSupportedEquation(eq: number): boolean {
  return eq in COEFF_COUNT;
}

/**
 * Evaluate a ChemSep/DIPPR correlation at temperature T (K).
 * Returns NaN for unsupported equation numbers.
 *
 * @param Tc Critical temperature (K), required by DIPPR 106.
 */
export function evaluateCorrelation(model: PropertyModel, T: number, Tc?: number): CorrelationValue {
  const n = COEFF_COUNT[model.eq];
  if (n === undefined || model.coeffs.length < n) {
    return { value: NaN, inRange: false };
  }

  const c = model.coeffs;
  const [A, B = 0, C = 0, D = 0, E = 0] = c;
  let value: number;

  switch (model.eq) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 100:
      value = A + B * T + C * T ** 2 + D * T ** 3 + E * T ** 4;
      break;
    case 10: // Antoine
      value = Math.exp(A - B / (C + T));
      break;
    case 16: // ChemSep: Y = A + exp(B/T + C + D*T + E*T^2)
      value = A + Math.exp(B / T + C + D * T + E * T ** 2);
      break;
    case 101: // Y = exp(A + B/T + C*ln(T) + D*T^E)
      value = Math.exp(A + B / T + C * Math.log(T) + D * T ** E);
      break;
    case 102: // Y = A*T^B / (1 + C/T + D/T^2)
      value = (A * T ** B) / (1 + C / T + D / T ** 2);
      break;
    case 105: { // Rackett form: Y = A / B^(1 + (1 - T/C)^D)
      const tau = 1 - T / C;
      value = tau > 0 ? A / B ** (1 + tau ** D) : NaN;
      break;
    }
    case 106: { // Y = A*(1-Tr)^(B + C*Tr + D*Tr^2 + E*Tr^3)
      if (!Tc) {
        value = NaN;
        break;
      }
      const Tr = T / Tc;
      value = Tr < 1 ? A * (1 - Tr) ** (B + C * Tr + D * Tr ** 2 + E * Tr ** 3) : NaN;
      break;
    }
    default:
      value = NaN;
  }

  const hasRange = c.length >= n + 2;
  const range: [number, number] | undefined = hasRange ? [c[n], c[n + 1]] : undefined;
  const inRange = range ? T >= range[0] && T <= range[1] : true;
  return { value, inRange, range };
}
