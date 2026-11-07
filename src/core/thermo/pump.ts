/**
 * Centrifugal pump curve, system head, and NPSH.
 * Towler & Sinnott, Chemical Engineering Design, 2nd ed., Chapter 20.
 *
 * Head curve: H(Q) = H_shutoff (1 − (Q/Q_max)²), zero at runout.
 * Efficiency: parabola peaking at the best-efficiency flow, zero at shutoff and at 2 Q_bep.
 * NPSHr grows with Q², pinned to the manufacturer's value at Q_bep.
 * System head: H_sys = Δz + (P_delivery − P_suction)/(ρg) + f (L/D) v²/(2g) + ΣK v²/(2g)
 *   + (a_out − a_in) v²/(2g), where a = 1 at an end that is a flowing pipe and 0 at a still vessel.
 */

import { FrictionCorrelation, FrictionSolver } from './friction';

export const G = 9.80665;

export interface PumpCurve {
  /** Head at zero flow, m. */
  hShutoff: number;
  /** Flow at which the curve reaches zero head, m³/s. */
  qMax: number;
  /** Best-efficiency flow, m³/s. */
  qBep: number;
  etaBep: number;
  /** NPSH required at Q_bep, m. */
  npshrBep: number;
}

export interface LossModel {
  area: number;
  diameter: number;
  length: number;
  rho: number;
  mu: number;
  relativeRoughness: number;
  correlation: FrictionCorrelation;
  /** Valve + fitting K, referenced to the pipe velocity. */
  kMinor: number;
  dz: number;
  pIn: number;
  pDelivery: number;
  /** Velocity heads carried by the suction end: 1 for a flowing pipe, 0 (default) for a still vessel. */
  aIn?: number;
  /** Velocity heads carried by the delivery end: 1 for a flowing pipe, 0 (default) for a still vessel. */
  aOut?: number;
}

export interface HeadParts {
  hFriction: number;
  hMinor: number;
  hStatic: number;
  /** (a_out − a_in) v²/(2g): kinetic energy gained between the two ends. */
  hKinetic: number;
  vHead: number;
  hSystem: number;
  f: number;
  Re: number;
}

export type DutyStatus = 'ok' | 'dead_head' | 'runout';

export interface DutyPoint {
  Q: number;
  H: number;
  status: DutyStatus;
}

export function pumpHead(curve: PumpCurve, Q: number): number {
  if (curve.qMax <= 0) return 0;
  if (Q <= 0) return curve.hShutoff;
  const r = Q / curve.qMax;
  if (r >= 1) return 0;
  return curve.hShutoff * (1 - r * r);
}

/** Dimensionless parabola: 0 at Q = 0 and Q = 2 Q_bep, peak η_bep at Q_bep. */
export function pumpEfficiency(curve: PumpCurve, Q: number): number {
  if (curve.qBep <= 0 || Q <= 0) return 0;
  const q = Q / curve.qBep;
  if (q >= 2) return 0;
  return Math.max(0, curve.etaBep * (2 * q - q * q));
}

export function npshRequired(curve: PumpCurve, Q: number): number {
  if (curve.qBep <= 0) return curve.npshrBep;
  const q = Math.max(0, Q / curve.qBep);
  return curve.npshrBep * q * q;
}

/**
 * Towler eq. 20.15: NPSHa = (P1 − Pv)/(ρg) + z1 − h_fs.
 * z1 is the liquid surface elevation above the pump centerline.
 */
export function npshAvailable(p1: number, pVapor: number, rho: number, z1: number, hFs: number): number {
  return (p1 - pVapor) / (rho * G) + z1 - hFs;
}

export function lineHead(model: LossModel, Q: number): HeadParts {
  const hStatic = model.dz + (model.pDelivery - model.pIn) / (model.rho * G);
  if (Q <= 1e-12 || model.area <= 0 || model.diameter <= 0 || model.mu <= 0) {
    return { hFriction: 0, hMinor: 0, hStatic, hKinetic: 0, vHead: 0, hSystem: hStatic, f: 0, Re: 0 };
  }
  const v = Q / model.area;
  const vHead = (v * v) / (2 * G);
  const Re = (model.rho * v * model.diameter) / model.mu;
  const friction = FrictionSolver.calculateFrictionFactor(Re, Math.max(0, model.relativeRoughness), model.correlation);
  const hFriction = friction.f * (model.length / model.diameter) * vHead;
  const hMinor = model.kMinor * vHead;
  const hKinetic = ((model.aOut ?? 0) - (model.aIn ?? 0)) * vHead;
  return { hFriction, hMinor, hStatic, hKinetic, vHead, hSystem: hStatic + hFriction + hMinor + hKinetic, f: friction.f, Re };
}

/**
 * h_fs for Towler eq. 20.15, net of the velocity head the liquid already carries
 * when the suction end is a flowing pipe rather than a still vessel.
 */
export function suctionLoss(model: LossModel, Q: number): number {
  const h = lineHead(model, Q);
  return h.hFriction + h.hMinor - (model.aIn ?? 0) * h.vHead;
}

export function solveOperatingPoint(curve: PumpCurve, model: LossModel): DutyPoint {
  const shutoff = curve.hShutoff;
  const qMax = curve.qMax;
  const hStatic = lineHead(model, 0).hStatic;
  if (!(qMax > 0) || hStatic >= shutoff) return { Q: 0, H: Math.max(0, shutoff), status: 'dead_head' };

  const gap = (Q: number) => pumpHead(curve, Q) - lineHead(model, Q).hSystem;
  if (gap(qMax) > 1e-6) return { Q: qMax, H: pumpHead(curve, qMax), status: 'runout' };

  let lo = 0;
  let hi = qMax;
  for (let i = 0; i < 70; i++) {
    const mid = 0.5 * (lo + hi);
    if (gap(mid) > 0) lo = mid;
    else hi = mid;
  }
  const Q = 0.5 * (lo + hi);
  return { Q, H: pumpHead(curve, Q), status: 'ok' };
}

export interface PumpChartSample {
  qM3h: number;
  head: number;
  system: number;
  npsha: number;
  npshr: number;
}

export function samplePumpChart(
  curve: PumpCurve,
  line: LossModel,
  suction: LossModel,
  z1: number,
  pVapor: number,
  steps = 40
): PumpChartSample[] {
  const samples: PumpChartSample[] = [];
  for (let i = 0; i <= steps; i++) {
    const Q = (i / steps) * curve.qMax;
    samples.push({
      qM3h: Q * 3600,
      head: pumpHead(curve, Q),
      system: lineHead(line, Q).hSystem,
      npsha: npshAvailable(line.pIn, pVapor, line.rho, z1, suctionLoss(suction, Q)),
      npshr: npshRequired(curve, Q)
    });
  }
  return samples;
}
