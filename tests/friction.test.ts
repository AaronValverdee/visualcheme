import { describe, it, expect } from 'vitest';
import { FrictionSolver, RE_LAMINAR_MAX, RE_TURBULENT_MIN } from '../src/core/thermo/friction';

const relErr = (got: number, ref: number) => Math.abs(got - ref) / Math.abs(ref);

const colebrookResidual = (f: number, Re: number, eD: number) =>
  1 / Math.sqrt(f) + 2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(f)));

describe('Darcy friction factor', () => {
  it('laminar flow is exactly Hagen-Poiseuille 64/Re, independent of roughness', () => {
    for (const Re of [100, 1000, 2000]) {
      for (const eD of [0, 0.01, 0.05]) {
        expect(FrictionSolver.calculateFrictionFactor(Re, eD).f).toBeCloseTo(64 / Re, 12);
      }
    }
  });

  it('Colebrook solver satisfies the implicit equation to machine precision', () => {
    for (const Re of [4e3, 1e4, 1e5, 1e6, 1e7, 1e8]) {
      for (const eD of [0, 1e-6, 1e-4, 1e-3, 1e-2, 0.05]) {
        const f = FrictionSolver.solveColebrook(Re, eD);
        expect(Math.abs(colebrookResidual(f, Re, eD))).toBeLessThan(1e-9);
      }
    }
  });

  it('matches classic Moody chart values', () => {
    expect(FrictionSolver.solveColebrook(1e5, 0)).toBeCloseTo(0.0180, 4);
    expect(FrictionSolver.solveColebrook(1e6, 0.001)).toBeCloseTo(0.0199, 4);
    // Fully rough limit (von Karman): 1/sqrt(f) = -2 log10((e/D)/3.7)
    const fRough = 1 / Math.pow(-2 * Math.log10(0.01 / 3.7), 2);
    expect(relErr(FrictionSolver.solveColebrook(1e9, 0.01), fRough)).toBeLessThan(0.001);
  });

  it('Swamee-Jain stays within 3% of Colebrook over its validity range', () => {
    // Often quoted as "within 1%"; the worst case, at Re = 5000 and e/D = 0.01, is 2.8%.
    for (const Re of [5e3, 1e4, 1e5, 1e6, 1e8]) {
      for (const eD of [1e-6, 1e-4, 1e-3, 1e-2]) {
        const sj = FrictionSolver.calculateFrictionFactor(Re, eD, 'swamee_jain').f;
        expect(relErr(sj, FrictionSolver.solveColebrook(Re, eD))).toBeLessThan(0.03);
      }
    }
  });

  it('Churchill reproduces laminar and turbulent limits', () => {
    expect(relErr(FrictionSolver.churchill(1000, 0.001), 0.064)).toBeLessThan(0.01);
    for (const Re of [1e4, 1e5, 1e6, 1e7]) {
      for (const eD of [0, 1e-4, 1e-3, 1e-2]) {
        expect(relErr(FrictionSolver.churchill(Re, eD), FrictionSolver.solveColebrook(Re, eD))).toBeLessThan(0.03);
      }
    }
  });

  it('transition bridge is continuous at both ends', () => {
    for (const eD of [0, 1e-3, 1e-2]) {
      const f = (Re: number) => FrictionSolver.calculateFrictionFactor(Re, eD).f;
      expect(relErr(f(RE_LAMINAR_MAX - 1e-6), f(RE_LAMINAR_MAX))).toBeLessThan(1e-6);
      expect(relErr(f(RE_TURBULENT_MIN - 1e-6), f(RE_TURBULENT_MIN))).toBeLessThan(1e-6);
    }
  });
});

describe('Valve loss coefficients (Towler Table 20.4)', () => {
  it('reproduces tabulated gate and globe values', () => {
    expect(FrictionSolver.getValveK('gate_valve', 1.0)).toBeCloseTo(0.15, 10);
    expect(FrictionSolver.getValveK('gate_valve', 0.75)).toBeCloseTo(1, 10);
    expect(FrictionSolver.getValveK('gate_valve', 0.5)).toBeCloseTo(4, 10);
    expect(FrictionSolver.getValveK('gate_valve', 0.25)).toBeCloseTo(16, 10);
    expect(FrictionSolver.getValveK('globe_valve', 1.0)).toBeCloseTo(9, 10);
    expect(FrictionSolver.getValveK('globe_valve', 0.5)).toBeCloseTo(36, 10);
    expect(FrictionSolver.getValveK('globe_valve', 0.25)).toBeCloseTo(112, 10);
  });

  it('K rises monotonically as every valve closes', () => {
    for (const type of ['gate_valve', 'globe_valve', 'ball_valve'] as const) {
      let prev = 0;
      for (let h = 1.0; h >= 0.05 - 1e-9; h -= 0.05) {
        const K = FrictionSolver.getValveK(type, h);
        expect(K).toBeGreaterThan(prev);
        prev = K;
      }
    }
  });
});
