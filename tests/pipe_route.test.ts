import { describe, it, expect } from 'vitest';
import { buildRoute, TURN_SPECS } from '../src/ui/renderers/pipe_route';
import { layoutFittings } from '../src/core/thermo/fittings';

const box = { left: 20, top: 60, width: 780, height: 300 };
const opts = { dTarget: 30, keepouts: [{ xNorm: 0.6, halfD: 1.2 }], startHalfD: 1.9, endHalfD: 1, startPad: 46, endPad: 46 };

function stationsFor(counts: Record<string, number>) {
  return layoutFittings({ entrance: 'sharp', exit: 'sudden', counts, valveX: 0.6, pumpX: 0.2 }).stations;
}

describe('Pipe route geometry', () => {
  it('a straight line with no fittings spans the box at the target bore', () => {
    const r = buildRoute([], box, opts);
    expect(r.turns).toHaveLength(0);
    expect(r.dPx).toBe(30);
    expect(r.start.y).toBeCloseTo(r.end.y, 9);
    expect(r.xToS(0.5)).toBeCloseTo(r.length / 2, 6);
  });

  it('every elbow and tee turns the line, at its catalog angle', () => {
    const st = stationsFor({ n_elbow_90: 2, n_elbow_45: 2, n_elbow_90_long: 1, n_elbow_square: 1, n_tee_branch: 1 });
    const r = buildRoute(st, box, opts);
    expect(r.turns).toHaveLength(7);
    for (const t of r.turns) {
      const turned = Math.acos(Math.max(-1, Math.min(1, t.dirIn.x * t.dirOut.x + t.dirIn.y * t.dirOut.y)));
      expect(turned).toBeCloseTo(TURN_SPECS[t.kind].angle, 6);
      expect(t.radiusPx).toBeCloseTo(TURN_SPECS[t.kind].radius * r.dPx, 9);
    }
  });

  it('pins each fitting at the middle of its bend and maps x/L monotonically', () => {
    const st = stationsFor({ n_elbow_90: 6, n_tee_run: 2 });
    const r = buildRoute(st, box, opts);
    for (const t of r.turns) expect(r.sToX(t.s)).toBeCloseTo(t.xNorm, 9);
    let prev = -1;
    for (let i = 0; i <= 200; i++) {
      const s = r.xToS(i / 200);
      expect(s).toBeGreaterThan(prev);
      prev = s;
    }
  });

  it('stays inside the box and never runs backwards, even with 72 fittings', () => {
    const all = Object.fromEntries(
      ['n_elbow_90', 'n_elbow_90_long', 'n_elbow_45', 'n_elbow_square', 'n_tee_branch', 'n_tee_run'].map((k) => [k, 12])
    );
    const r = buildRoute(stationsFor(all), box, opts);
    expect(r.turns).toHaveLength(72);
    expect(r.dPx).toBeGreaterThanOrEqual(3);
    let lastX = -Infinity;
    for (const p of r.points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(box.left - 1e-6);
      expect(p.x).toBeLessThanOrEqual(box.left + box.width + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(box.top - 1e-6);
      expect(p.y).toBeLessThanOrEqual(box.top + box.height + 1e-6);
      expect(p.x).toBeGreaterThanOrEqual(lastX - 1e-6);
      lastX = p.x;
    }
  });
});
