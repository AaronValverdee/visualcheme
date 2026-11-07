import { DiagramCurve } from '../../types/unit';
import { FrictionSolver, FrictionCorrelation, RE_LAMINAR_MAX, RE_TURBULENT_MIN } from '../../thermo/friction';

export class MoodyDataGenerator {
  private static cachedCurves: DiagramCurve[] | null = null;

  /** Background chart: laminar line plus Colebrook curves for standard relative roughnesses. */
  public static getMoodyCurves(): DiagramCurve[] {
    if (this.cachedCurves) return this.cachedCurves;

    const curves: DiagramCurve[] = [];

    const laminarPoints: { x: number; y: number }[] = [];
    for (let exp = Math.log10(500); exp <= Math.log10(RE_LAMINAR_MAX) + 1e-9; exp += 0.05) {
      const Re = Math.pow(10, exp);
      laminarPoints.push({ x: Re, y: 64.0 / Re });
    }
    curves.push({
      id: 'laminar',
      label: 'Laminar (64/Re)',
      color: '#b7c4be',
      points: laminarPoints
    });

    const eDRatios = [
      { ed: 0.05, label: '0.05' },
      { ed: 0.03, label: '0.03' },
      { ed: 0.015, label: '0.015' },
      { ed: 0.008, label: '0.008' },
      { ed: 0.004, label: '0.004' },
      { ed: 0.001, label: '0.001' },
      { ed: 0.0002, label: '0.0002' },
      { ed: 0.00005, label: '0.00005' },
      { ed: 0, label: 'Smooth Pipe' }
    ];

    const reTurb: number[] = [];
    for (let exp = Math.log10(RE_TURBULENT_MIN); exp <= 8.0 + 1e-9; exp += 0.1) {
      reTurb.push(Math.pow(10, exp));
    }

    for (const { ed, label } of eDRatios) {
      curves.push({
        id: `rough_${ed}`,
        label: `ε/D = ${label}`,
        color: ed === 0 ? '#c9bdd0' : '#8a8474',
        points: reTurb.map((Re) => ({ x: Re, y: FrictionSolver.solveColebrook(Re, ed) }))
      });
    }

    this.cachedCurves = curves;
    return curves;
  }

  /**
   * f(Re) across all regimes for one relative roughness, using exactly the
   * friction model the unit computes with. Colebrook and Swamee-Jain bridge the
   * transition zone by interpolation, which is drawn dashed because f is not
   * determinate there; Churchill is one published equation and stays solid.
   */
  public static getCurveForRoughness(eD: number, correlation: FrictionCorrelation): DiagramCurve[] {
    const sample = (lo: number, hi: number, step: number) => {
      const points: { x: number; y: number }[] = [];
      const a = Math.log10(lo);
      const b = Math.log10(hi);
      const n = Math.max(2, Math.ceil((b - a) / step));
      for (let i = 0; i <= n; i++) {
        const Re = Math.pow(10, a + ((b - a) * i) / n);
        points.push({ x: Re, y: FrictionSolver.calculateFrictionFactor(Re, eD, correlation).f });
      }
      return points;
    };
    const base = { label: `Current pipe ε/D = ${eD.toExponential(2)}`, color: '#e4d7a1', width: 2.2 };

    if (correlation === 'churchill') {
      return [{ ...base, id: 'current', points: sample(500, 1e8, 0.04) }];
    }
    return [
      { ...base, id: 'current_laminar', points: sample(500, RE_LAMINAR_MAX, 0.04) },
      { ...base, id: 'current_bridge', dashed: true, points: sample(RE_LAMINAR_MAX, RE_TURBULENT_MIN, 0.02) },
      { ...base, id: 'current_turbulent', points: sample(RE_TURBULENT_MIN, 1e8, 0.04) }
    ];
  }
}
