import { describe, it, expect } from 'vitest';
import { PipeUnit } from '../src/core/units/pipe/pipe_unit';
import { PropertyService } from '../src/core/database/property_service';
import { layoutFittings } from '../src/core/thermo/fittings';
import {
  G,
  pumpHead,
  pumpEfficiency,
  npshRequired,
  lineHead,
  solveOperatingPoint,
  LossModel,
  PumpCurve
} from '../src/core/thermo/pump';

const relErr = (got: number, ref: number) => Math.abs(got - ref) / Math.abs(ref);

const unit = new PipeUnit();
const defaults: Record<string, any> = Object.fromEntries(unit.getParameters().map((p) => [p.id, p.defaultVal]));
const run = (overrides: Record<string, any>) => unit.calculate({ ...defaults, ...overrides });
const summary = (r: ReturnType<typeof run>) => r.extraData!.summary;

describe('Fitting layout', () => {
  it('places entrance, distributed elbows, and exit, and keeps them off the valve', () => {
    const lay = layoutFittings({
      entrance: 'sharp',
      exit: 'sudden',
      counts: { n_elbow_90: 4 },
      valveX: 0.6,
      pumpX: 0.15
    });
    expect(lay.kTotal).toBeCloseTo(0.5 + 1 + 4 * 0.8, 10);
    expect(lay.stations[0].xNorm).toBe(0);
    expect(lay.stations[lay.stations.length - 1].xNorm).toBe(1);
    expect(lay.stations.filter((s) => s.glyph === 'elbow')).toHaveLength(4);
    expect(lay.kSuction).toBeCloseTo(0.5, 10);
    for (const s of lay.stations) {
      if (s.glyph === 'elbow') expect(Math.abs(s.xNorm - 0.6)).toBeGreaterThan(0.02);
    }
  });

  it('never stacks fittings, even at the maximum counts', () => {
    const counts = Object.fromEntries(
      ['n_elbow_90', 'n_elbow_90_long', 'n_elbow_45', 'n_elbow_square', 'n_tee_branch', 'n_tee_run'].map((k) => [k, 12])
    );
    const lay = layoutFittings({ entrance: 'none', exit: 'none', counts, valveX: 0.6, pumpX: 0.3 });
    const xs = lay.stations.map((s) => s.xNorm);
    expect(xs).toHaveLength(72);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(0.005);
    for (const x of xs) {
      expect(Math.abs(x - 0.6)).toBeGreaterThanOrEqual(0.04 - 1e-12);
      expect(Math.abs(x - 0.3)).toBeGreaterThanOrEqual(0.04 - 1e-12);
    }
  });
});

describe('Vessel entrance and tank exit', () => {
  const tankRun = (overrides: Record<string, any>) =>
    run({ heat_transfer_mode: 'adiabatic', velocity: 2, p_inlet_kpa: 300, ...overrides });

  it('energy grade never rises across an entrance from a still vessel', () => {
    for (const entrance of ['rounded', 'sharp', 'reentrant']) {
      const egl = tankRun({ entrance }).properties.energy_grade;
      for (let i = 1; i < egl.length; i++) expect(egl[i]).toBeLessThanOrEqual(egl[i - 1] + 1e-9);
    }
  });

  it('static pressure inside the mouth falls by (1 + K) ρ v² / 2, of which only K ρ v² / 2 is lost', () => {
    const r = tankRun({ entrance: 'sharp' });
    const s = summary(r);
    const rho = r.extraData!.rho;
    expect(relErr(s.dP_accel_Pa, 0.5 * rho * 4)).toBeLessThan(1e-9);
    expect(relErr(s.dP_fittings_Pa, 0.5 * 0.5 * rho * 4)).toBeLessThan(1e-9);
    const p = r.properties.pressure;
    const pOpen = tankRun({}).properties.pressure;
    const mouthDrop = (p[0] - p[1] - (pOpen[0] - pOpen[1])) * 1000;
    expect(relErr(mouthDrop, 1.5 * 0.5 * rho * 4)).toBeLessThan(1e-3);
  });

  it('a sudden exit leaves the outlet pressure alone and loses exactly one velocity head', () => {
    const open = tankRun({});
    const tank = tankRun({ exit: 'sudden' });
    const pOpen = open.properties.pressure;
    const pTank = tank.properties.pressure;
    expect(pTank[pTank.length - 1]).toBeCloseTo(pOpen[pOpen.length - 1], 9);
    const vOut = tank.properties.velocity[tank.properties.velocity.length - 1];
    expect(relErr(summary(tank).headLoss_m - summary(open).headLoss_m, vOut ** 2 / (2 * G))).toBeLessThan(1e-9);
    const hgl = tank.properties.hydraulic_grade;
    const egl = tank.properties.energy_grade;
    expect(egl[egl.length - 1]).toBeCloseTo(hgl[hgl.length - 1], 9);
  });

  it('operating point lands the outlet on the delivery pressure for every end condition', () => {
    for (const [entrance, exit] of [['none', 'none'], ['sharp', 'none'], ['none', 'sudden'], ['rounded', 'sudden']]) {
      const r = run({
        pump_enabled: true,
        drive_mode: 'operating_point',
        heat_transfer_mode: 'adiabatic',
        diameter_mm: 50,
        length_m: 60,
        elevation_m: 6,
        p_inlet_kpa: 200,
        p_delivery_kpa: 260,
        entrance,
        exit,
        n_elbow_90: 3,
        pump_position_pct: 10,
        h_shutoff_m: 40,
        q_max_m3h: 40,
        q_bep_m3h: 20
      });
      expect(summary(r).pumpStatus).toBe('ok');
      const p = r.properties.pressure;
      expect(Math.abs(p[p.length - 1] - 260)).toBeLessThan(0.3);
    }
  });
});

describe('Pump curve and system head', () => {
  const curve: PumpCurve = { hShutoff: 30, qMax: 0.01, qBep: 0.005, etaBep: 0.75, npshrBep: 3 };

  it('follows the shutoff parabola and the efficiency parabola', () => {
    expect(pumpHead(curve, 0)).toBe(30);
    expect(pumpHead(curve, curve.qMax)).toBe(0);
    expect(pumpHead(curve, curve.qMax / 2)).toBeCloseTo(30 * 0.75, 10);
    expect(pumpEfficiency(curve, curve.qBep)).toBeCloseTo(0.75, 10);
    expect(pumpEfficiency(curve, 0)).toBe(0);
    expect(pumpEfficiency(curve, 2 * curve.qBep)).toBe(0);
    expect(npshRequired(curve, curve.qBep)).toBeCloseTo(3, 10);
    expect(npshRequired(curve, 0)).toBe(0);
  });

  it('laminar system head matches Hagen-Poiseuille plus minor losses and static head', () => {
    const rho = 1000;
    const mu = 0.001;
    const D = 0.02;
    const area = (Math.PI * D * D) / 4;
    const L = 10;
    const Q = 2e-5;
    const v = Q / area;
    const K = 1.5;
    const model: LossModel = {
      area,
      diameter: D,
      length: L,
      rho,
      mu,
      relativeRoughness: 0,
      correlation: 'colebrook',
      kMinor: K,
      dz: 4,
      pIn: 200_000,
      pDelivery: 240_000
    };
    const hF = (32 * mu * L * v) / (rho * G * D * D);
    const hM = (K * v * v) / (2 * G);
    const hS = 4 + 40_000 / (rho * G) + hF + hM;
    expect(v * D * rho / mu).toBeLessThan(2300);
    expect(lineHead(model, Q).hSystem).toBeCloseTo(hS, 4);
  });

  it('finds the intersection, a dead head, and runout', () => {
    const area = (Math.PI * 0.05 * 0.05) / 4;
    const model: LossModel = {
      area,
      diameter: 0.05,
      length: 80,
      rho: 998,
      mu: 0.001,
      relativeRoughness: 0.001,
      correlation: 'colebrook',
      kMinor: 4,
      dz: 8,
      pIn: 200_000,
      pDelivery: 250_000
    };
    const op = solveOperatingPoint(curve, model);
    expect(op.status).toBe('ok');
    expect(Math.abs(pumpHead(curve, op.Q) - lineHead(model, op.Q).hSystem)).toBeLessThan(1e-3);

    expect(solveOperatingPoint({ ...curve, hShutoff: 2 }, model).status).toBe('dead_head');

    const downhill: LossModel = { ...model, dz: -40, pDelivery: model.pIn, kMinor: 0.1, length: 5 };
    expect(solveOperatingPoint(curve, downhill).status).toBe('runout');
  });
});

describe('Pipe unit with fittings and a pump', () => {
  it('adds no fitting or pump loss until those controls are used', () => {
    const s = summary(run({}));
    expect(s.dP_fittings_Pa).toBe(0);
    expect(s.dP_pump_Pa).toBe(0);
    expect(s.pumpStatus).toBe('off');
    expect(run({}).extraData!.pumpDiagram).toBeUndefined();
  });

  it('sharp entrance drop is exactly K ρ v² / 2', () => {
    const r = run({ entrance: 'sharp', heat_transfer_mode: 'adiabatic' });
    const s = summary(r);
    expect(s.K_fittings).toBeCloseTo(0.5, 10);
    expect(relErr(s.dP_fittings_Pa, 0.5 * 0.5 * r.extraData!.rho * 1.5 ** 2)).toBeLessThan(1e-6);
  });

  it('two standard elbows add K = 1.6 at the inlet density', () => {
    const r = run({ n_elbow_90: 2, heat_transfer_mode: 'adiabatic' });
    const s = summary(r);
    expect(s.K_fittings).toBeCloseTo(1.6, 10);
    expect(relErr(s.dP_fittings_Pa, 1.6 * 0.5 * r.extraData!.rho * 1.5 ** 2)).toBeLessThan(1e-3);
  });

  it('pump pressure rise matches ρ g H(Q) and the grade line rises by H minus head loss', () => {
    const r = run({
      pump_enabled: true,
      drive_mode: 'imposed',
      velocity: 1.5,
      elevation_m: 0,
      heat_transfer_mode: 'adiabatic',
      valve_opening_pct: 100,
      h_shutoff_m: 36,
      q_max_m3h: 40,
      pump_position_pct: 0,
      length_m: 30,
      diameter_mm: 50
    });
    const s = summary(r);
    const H = 36 * (1 - (s.Q_m3_s / (40 / 3600)) ** 2);
    expect(relErr(s.pumpHead_m, H)).toBeLessThan(1e-9);
    expect(relErr(s.dP_pump_Pa, r.extraData!.rho * G * H)).toBeLessThan(1e-6);
    const hgl = r.properties.hydraulic_grade;
    const rise = hgl[hgl.length - 1] - hgl[0];
    expect(Math.abs(rise - (H - s.headLoss_m))).toBeLessThan(0.05);
    expect(r.diagram.title).toContain('friction factor');
    expect(r.extraData!.pumpDiagram.title).toContain('Pump');
  });

  it('NPSHa at an inlet pump fed by a flowing pipe is (P1 − Pv) / (ρ g) + v² / 2g', () => {
    const r = run({
      pump_enabled: true,
      pump_position_pct: 0,
      elevation_m: 0,
      entrance: 'none',
      p_inlet_kpa: 200,
      heat_transfer_mode: 'adiabatic'
    });
    const water = PropertyService.getLiquidState(PropertyService.getCompound('Water')!, 25 + 273.15);
    const expected = (200_000 - water.pvap) / (water.rho * G) + 1.5 ** 2 / (2 * G);
    expect(relErr(summary(r).npsha_m, expected)).toBeLessThan(1e-6);
  });

  it('NPSHa at an inlet pump fed from a vessel through a rounded mouth is (P1 − Pv) / (ρ g) − K v² / 2g', () => {
    const r = run({
      pump_enabled: true,
      pump_position_pct: 0,
      elevation_m: 0,
      entrance: 'rounded',
      p_inlet_kpa: 200,
      heat_transfer_mode: 'adiabatic'
    });
    const water = PropertyService.getLiquidState(PropertyService.getCompound('Water')!, 25 + 273.15);
    const expected = (200_000 - water.pvap) / (water.rho * G) - (0.05 * 1.5 ** 2) / (2 * G);
    expect(relErr(summary(r).npsha_m, expected)).toBeLessThan(1e-6);
  });

  it('operating point brings the outlet to the delivery pressure', () => {
    const r = run({
      pump_enabled: true,
      drive_mode: 'operating_point',
      fluid: 'Water',
      temp_c: 25,
      heat_transfer_mode: 'adiabatic',
      diameter_mm: 50,
      length_m: 80,
      elevation_m: 10,
      p_inlet_kpa: 200,
      p_delivery_kpa: 300,
      valve_type: 'gate_valve',
      valve_opening_pct: 100,
      entrance: 'sharp',
      exit: 'none',
      n_elbow_90: 4,
      pump_position_pct: 10,
      h_shutoff_m: 45,
      q_max_m3h: 40,
      q_bep_m3h: 20,
      eta_bep: 0.75,
      npshr_m: 2
    });
    const s = summary(r);
    expect(s.pumpStatus).toBe('ok');
    expect(Math.abs(r.properties.pressure[r.properties.pressure.length - 1] - 300)).toBeLessThan(1.5);
    expect(s.Q_m3_s).toBeGreaterThan(0);
  });

  it('flags cavitation when the suction lift eats the NPSH margin, without flashing the line', () => {
    const r = run({
      pump_enabled: true,
      drive_mode: 'imposed',
      velocity: 1.2,
      diameter_mm: 50,
      length_m: 80,
      elevation_m: 12,
      pump_position_pct: 50,
      temp_c: 70,
      p_inlet_kpa: 120,
      heat_transfer_mode: 'adiabatic',
      entrance: 'sharp',
      n_elbow_90: 4,
      npshr_m: 4,
      q_bep_m3h: 8,
      q_max_m3h: 25,
      h_shutoff_m: 40,
      valve_opening_pct: 100
    });
    expect(r.warnings.some((w) => w.level === 'alert' && w.message.includes('NPSH'))).toBe(true);
    expect(r.warnings.some((w) => w.message.includes('flash'))).toBe(false);
  });

  it('dead-heads a pump that cannot meet the static head and keeps the column liquid', () => {
    const r = run({
      pump_enabled: true,
      drive_mode: 'operating_point',
      diameter_mm: 50,
      length_m: 40,
      elevation_m: 25,
      temp_c: 25,
      p_inlet_kpa: 400,
      p_delivery_kpa: 550,
      h_shutoff_m: 12,
      q_max_m3h: 20,
      heat_transfer_mode: 'adiabatic'
    });
    const s = summary(r);
    expect(s.pumpStatus).toBe('dead_head');
    expect(s.Q_m3_s).toBe(0);
    expect(r.properties.velocity.every((v) => v === 0)).toBe(true);
    expect(r.properties.pressure.every(Number.isFinite)).toBe(true);
    expect(Math.min(...r.properties.pressure)).toBeGreaterThan(100);
    expect(r.warnings.some((w) => w.level === 'alert' && w.message.includes('static head'))).toBe(true);
  });
});
