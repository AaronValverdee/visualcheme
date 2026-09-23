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
      color: '#38bdf8',
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
        color: ed === 0 ? '#a855f7' : '#64748b',
        points: reTurb.map((Re) => ({ x: Re, y: FrictionSolver.solveColebrook(Re, ed) }))
      });
    }

    this.cachedCurves = curves;
    return curves;
  }

  /**
   * f(Re) across all regimes for one relative roughness, using exactly the
   * friction model the unit computes with (including its transition bridge).
   */
  public static getCurveForRoughness(eD: number, correlation: FrictionCorrelation): DiagramCurve {
    const points: { x: number; y: number }[] = [];
    for (let exp = Math.log10(500); exp <= 8.0 + 1e-9; exp += 0.04) {
      const Re = Math.pow(10, exp);
      points.push({ x: Re, y: FrictionSolver.calculateFrictionFactor(Re, eD, correlation).f });
    }
    return {
      id: 'current',
      label: `Current pipe ε/D = ${eD.toExponential(2)}`,
      color: '#f59e0b',
      width: 2.2,
      points
    };
  }
}
