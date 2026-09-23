import { describe, it, expect } from 'vitest';
import { PropertyService } from '../src/core/database/property_service';

const relErr = (got: number, ref: number) => Math.abs(got - ref) / Math.abs(ref);

/**
 * Saturated-liquid reference data at 25 °C (NIST Chemistry WebBook / Perry's 8th ed.):
 * density kg/m3, viscosity mPa.s, Cp kJ/(kg.K), thermal conductivity W/(m.K), vapor pressure kPa.
 */
const REF_25C: Record<string, { rho: number; mu: number; cp: number; k: number; pv: number }> = {
  Water: { rho: 997.05, mu: 0.890, cp: 4.181, k: 0.607, pv: 3.17 },
  Ethanol: { rho: 785.1, mu: 1.074, cp: 2.44, k: 0.167, pv: 7.87 },
  Benzene: { rho: 873.6, mu: 0.604, cp: 1.74, k: 0.141, pv: 12.7 },
  Acetone: { rho: 784.5, mu: 0.306, cp: 2.16, k: 0.161, pv: 30.8 },
  Toluene: { rho: 862.2, mu: 0.560, cp: 1.71, k: 0.131, pv: 3.79 },
  'Ethylene glycol': { rho: 1110.0, mu: 16.1, cp: 2.41, k: 0.258, pv: 0.012 }
};

describe('Pure liquid properties vs reference data at 25 °C', () => {
  for (const [name, ref] of Object.entries(REF_25C)) {
    it(name, () => {
      const c = PropertyService.getCompound(name)!;
      const s = PropertyService.getLiquidState(c, 298.15);
      expect(relErr(s.rho, ref.rho)).toBeLessThan(0.01);
      expect(relErr(s.cp / 1000, ref.cp)).toBeLessThan(0.015);
      expect(relErr(s.k, ref.k)).toBeLessThan(0.03);
      expect(relErr(s.pvap / 1000, ref.pv)).toBeLessThan(0.06);
      expect(relErr(s.mu * 1000, ref.mu)).toBeLessThan(0.06);
      expect(s.warnings).toEqual([]);
    });
  }
});

describe('Correlation forms', () => {
  it('ChemSep eq 16 liquid Cp of water stays physical from 0 to 100 °C', () => {
    const water = PropertyService.getCompound('Water')!;
    for (let t = 0; t <= 100; t += 5) {
      const cp = PropertyService.calcLiquidHeatCapacity(water, t + 273.15).kj_per_kg_k;
      expect(cp).toBeGreaterThan(4.17);
      expect(cp).toBeLessThan(4.23);
    }
  });

  it('boiling points: vapor pressure equals 1 atm at the normal boiling point', () => {
    for (const name of Object.keys(REF_25C)) {
      const c = PropertyService.getCompound(name)!;
      expect(relErr(PropertyService.calcVaporPressure(c, c.tb), 101325)).toBeLessThan(0.02);
    }
  });

  it('thermal expansivity of water at 25 °C is about 2.6e-4 1/K', () => {
    const water = PropertyService.getCompound('Water')!;
    expect(relErr(PropertyService.calcLiquidExpansivity(water, 298.15), 2.57e-4)).toBeLessThan(0.08);
  });

  it('flags extrapolation outside the correlation range', () => {
    const benzene = PropertyService.getCompound('Benzene')!;
    const s = PropertyService.getLiquidState(benzene, 275.15);
    expect(s.warnings.length).toBeGreaterThan(0);
  });
});
