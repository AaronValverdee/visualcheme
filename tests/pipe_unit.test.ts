import { describe, it, expect } from 'vitest';
import { PipeUnit } from '../src/core/units/pipe/pipe_unit';
import { PropertyService } from '../src/core/database/property_service';

const G = 9.80665;
const relErr = (got: number, ref: number) => Math.abs(got - ref) / Math.abs(ref);

const unit = new PipeUnit();
const defaults: Record<string, any> = Object.fromEntries(unit.getParameters().map((p) => [p.id, p.defaultVal]));
const run = (overrides: Record<string, any>) => unit.calculate({ ...defaults, ...overrides });
const summary = (r: ReturnType<typeof run>) => r.extraData!.summary;

describe('Pipe unit: textbook validation', () => {
  it('Towler & Sinnott Example 20.1: friction and half-open gate valve', () => {
    // 3500 kg/h water in 25 mm commercial steel, 120 m. Towler reads f_Darcy = 8 x 0.0032 from
    // the chart with e/D rounded to 0.002 and reports 240 kPa friction loss; gate half open K = 4.
    const r = run({ velocity: 1.98, diameter_mm: 25, length_m: 120, temp_c: 21, p_inlet_kpa: 400, valve_opening_pct: 50, heat_transfer_mode: 'adiabatic' });
    const s = summary(r);
    expect(relErr(r.extraData!.Re, 49_900)).toBeLessThan(0.03);
    expect(relErr(s.dP_friction_Pa, 240_388)).toBeLessThan(0.05);
    const rho = r.extraData!.rho;
    expect(relErr(s.dP_valve_Pa, 4 * 0.5 * rho * 1.98 ** 2)).toBeLessThan(1e-3);
  });

  it('laminar flow reproduces Hagen-Poiseuille dP = 32 mu L v / D^2', () => {
    const r = run({ fluid: 'Ethylene glycol', velocity: 0.25, diameter_mm: 25, length_m: 10, temp_c: 20, heat_transfer_mode: 'adiabatic' });
    const { mu_cP } = r.extraData!;
    const expected = (32 * (mu_cP / 1000) * 10 * 0.25) / 0.025 ** 2;
    expect(r.extraData!.regime).toBe('laminar');
    expect(relErr(summary(r).dP_friction_Pa, expected)).toBeLessThan(0.002);
  });
});

describe('Pipe unit: conservation laws and limits', () => {
  it('adiabatic horizontal flow: temperature rise equals (1 - beta T) dP / (rho cp)', () => {
    const r = run({ velocity: 3, heat_transfer_mode: 'adiabatic', valve_type: 'globe_valve', valve_opening_pct: 30, p_inlet_kpa: 1000 });
    const s = summary(r);
    const water = PropertyService.getCompound('Water')!;
    const st = PropertyService.getLiquidState(water, 298.15);
    const expected = ((1 - st.beta * 298.15) * s.dP_total_Pa) / (st.rho * st.cp);
    expect(relErr(s.T_out_C - 25, expected)).toBeLessThan(0.01);
  });

  it('elevation changes pressure by rho g dz but leaves head loss unchanged', () => {
    const flat = summary(run({ length_m: 100, p_inlet_kpa: 600 }));
    const uphill = run({ length_m: 100, elevation_m: 25, p_inlet_kpa: 600 });
    const s = summary(uphill);
    expect(relErr(s.headLoss_m, flat.headLoss_m)).toBeLessThan(1e-3);
    expect(relErr(s.dP_elevation_Pa, uphill.extraData!.rho * G * 25)).toBeLessThan(0.005);
    expect(relErr(s.dP_total_Pa - flat.dP_total_Pa, s.dP_elevation_Pa)).toBeLessThan(0.01);
  });

  it('head loss equals total dissipation divided by m g', () => {
    const s = summary(run({ valve_opening_pct: 40 }));
    expect(relErr(s.dissipation_W, s.mDot_kg_s * G * s.headLoss_m)).toBeLessThan(1e-9);
  });

  it('exergy destruction equals (T0/T) x dissipation', () => {
    const atDeadState = summary(run({ temp_c: 20, ambient_temp_c: 20, heat_transfer_mode: 'adiabatic' }));
    expect(relErr(atDeadState.exergyDestroyed_W, atDeadState.dissipation_W)).toBeLessThan(0.002);
    const hot = summary(run({ temp_c: 90, ambient_temp_c: 20, heat_transfer_mode: 'adiabatic' }));
    expect(relErr(hot.exergyDestroyed_W / hot.dissipation_W, 293.15 / 363.15)).toBeLessThan(0.002);
  });

  it('bare hot pipe cools exponentially toward ambient (NTU = U pi D L / m cp)', () => {
    const r = run({ velocity: 0.05, diameter_mm: 10, length_m: 100, temp_c: 80, ambient_temp_c: 20, heat_transfer_mode: 'uninsulated' });
    const s = summary(r);
    const water = PropertyService.getCompound('Water')!;
    const cpMean = PropertyService.getLiquidState(water, 273.15 + 50).cp;
    const ntu = (15 * Math.PI * 0.01 * 100) / (s.mDot_kg_s * cpMean);
    const expected = 20 + 60 * Math.exp(-ntu);
    expect(Math.abs(s.T_out_C - expected)).toBeLessThan(0.5);
  });

  it('local properties follow temperature: viscosity rises as a hot oil line cools', () => {
    const r = run({ fluid: 'Ethylene glycol', velocity: 0.3, diameter_mm: 15, length_m: 100, temp_c: 80, ambient_temp_c: 10 });
    const mu = r.properties.viscosity;
    const re = r.properties.reynolds;
    expect(mu[mu.length - 1]).toBeGreaterThan(1.5 * mu[0]);
    expect(re[re.length - 1]).toBeLessThan(re[0]);
  });

  it('results are grid-converged: first and last nodes are exact inlet conditions', () => {
    const r = run({});
    expect(r.properties.temperature[0]).toBe(25);
    expect(r.properties.pressure[0]).toBe(350);
    expect(r.spatialGrid[r.spatialGrid.length - 1]).toBeCloseTo(20, 12);
  });
});

describe('Pipe unit: model validity diagnostics', () => {
  const levels = (r: ReturnType<typeof run>) => r.warnings.map((w) => w.level);

  it('default case is valid', () => {
    expect(levels(run({}))).not.toContain('alert');
  });

  it('benzene below its 5.5 °C freezing point is flagged', () => {
    expect(levels(run({ fluid: 'Benzene', temp_c: 3 }))).toContain('alert');
  });

  it('throttled hot acetone that drops below its vapor pressure is flagged as flashing', () => {
    const r = run({ fluid: 'Acetone', velocity: 3, temp_c: 50, p_inlet_kpa: 200, valve_type: 'globe_valve', valve_opening_pct: 40 });
    expect(r.warnings.some((w) => w.level === 'alert' && w.message.includes('flash'))).toBe(true);
  });

  it('transitional Reynolds numbers produce a caution', () => {
    const r = run({ fluid: 'Ethylene glycol', velocity: 1.0, diameter_mm: 30, temp_c: 40 });
    expect(r.extraData!.regime).toBe('transition');
    expect(levels(r)).toContain('warning');
  });
});
