/**
 * Centreline geometry for the pipe drawing. Every elbow and tee is a real change
 * of direction: elbows are filleted at their bend radius (r = 1 D standard,
 * 1.5 D long radius), square elbows and tees are mitred. Distance along the pipe
 * (x / L) maps piecewise-linearly onto arc length on screen, with each fitting
 * pinned at the middle of its bend.
 */

export interface RouteStationInput {
  xNorm: number;
  kind: string;
  K: number;
  short: string;
  label: string;
}

export interface TurnSpec {
  /** Change of direction, rad. */
  angle: number;
  /** Centreline bend radius in pipe diameters; 0 for a mitred corner. */
  radius: number;
  /** Tees carry a blind third leg, straight ahead of the inflow or behind the outflow. */
  tee?: 'ahead' | 'behind';
}

export const TURN_SPECS: Record<string, TurnSpec> = {
  elbow_90_standard: { angle: Math.PI / 2, radius: 1.0 },
  elbow_90_long: { angle: Math.PI / 2, radius: 1.5 },
  elbow_45: { angle: Math.PI / 4, radius: 1.0 },
  elbow_90_square: { angle: Math.PI / 2, radius: 0 },
  tee_branch: { angle: Math.PI / 2, radius: 0, tee: 'ahead' },
  tee_run: { angle: Math.PI / 2, radius: 0, tee: 'behind' }
};

export interface Vec {
  x: number;
  y: number;
}

/** A centreline sample in screen coordinates (y down). */
export interface RoutePoint {
  x: number;
  y: number;
  /** Unit tangent along the flow. */
  tx: number;
  ty: number;
  /** Half-width direction: the unit left normal, or the longer mitre vector at a sharp corner. */
  ox: number;
  oy: number;
  /** Arc length from the inlet, px. */
  s: number;
  /** Signed curvature, 1/px; positive when bending toward +o. */
  curv: number;
}

export interface RouteTurn extends RouteStationInput {
  spec: TurnSpec;
  /** Signed turn, rad; positive toward +o (a left turn as seen along the flow). */
  turn: number;
  radiusPx: number;
  vertex: Vec;
  dirIn: Vec;
  dirOut: Vec;
  /** Arc length at the middle of the bend, and where the bend starts and ends. */
  s: number;
  sStart: number;
  sEnd: number;
}

export interface PipeRoute {
  points: RoutePoint[];
  length: number;
  /** Drawn pipe bore, px. */
  dPx: number;
  turns: RouteTurn[];
  start: Vec;
  end: Vec;
  startDir: Vec;
  endDir: Vec;
  xToS(xNorm: number): number;
  sToX(s: number): number;
  at(s: number): RoutePoint;
}

export interface RouteBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RouteOptions {
  /** Preferred bore in px before the bends force it smaller. */
  dTarget: number;
  /** Straight-through items (valve, pump) that need clear pipe, with their half length in bores. */
  keepouts: { xNorm: number; halfD: number }[];
  /** Clear straight length wanted after the inlet and before the outlet, in bores. */
  startHalfD: number;
  endHalfD: number;
  /** Room reserved before the inlet and beyond the outlet (vessels, flanges), px. */
  startPad: number;
  endPad: number;
}

const SAMPLE_PX = 3;
const VERTICAL_SQUASH = [1, 0.8, 0.6, 0.45, 0.35];

const norm = (v: Vec): Vec => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};
const leftOf = (t: Vec): Vec => ({ x: t.y, y: -t.x });
const rotate = (v: Vec, a: number): Vec => ({
  x: v.x * Math.cos(a) - v.y * Math.sin(a),
  y: v.x * Math.sin(a) + v.y * Math.cos(a)
});

/** Piecewise-linear interpolation on ascending knots. */
function interp(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  const n = xs.length - 1;
  if (x >= xs[n]) return ys[n];
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const span = xs[hi] - xs[lo];
  const t = span > 0 ? (x - xs[lo]) / span : 0;
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

export function buildRoute(stations: RouteStationInput[], box: RouteBox, opts: RouteOptions): PipeRoute {
  const turnsIn = stations
    .filter((s) => TURN_SPECS[s.kind] && s.xNorm > 0 && s.xNorm < 1)
    .sort((a, b) => a.xNorm - b.xNorm);

  // Headings in math coordinates (y up). A turn always steers back toward the
  // east, so the line keeps advancing left to right and never crosses itself;
  // from an eastward run it rises or falls toward the inlet level.
  const xs = [0, ...turnsIn.map((t) => t.xNorm), 1];
  const headings = [0];
  const signedTurns: number[] = [];
  let theta = 0;
  let y = 0;
  for (let j = 0; j < turnsIn.length; j++) {
    y += (xs[j + 1] - xs[j]) * Math.sin(theta);
    const a = TURN_SPECS[turnsIn[j].kind].angle;
    const next = Math.abs(theta) < 1e-9 ? (y > 1e-9 ? -a : a) : theta - Math.sign(theta) * a;
    signedTurns.push(next - theta);
    theta = next;
    headings.push(theta);
  }

  const endHeading = headings[headings.length - 1];
  const endDirScreen = { x: Math.cos(endHeading), y: -Math.sin(endHeading) };
  const area: RouteBox = { ...box };
  area.left += opts.startPad;
  area.width -= opts.startPad;
  // The outlet is always the rightmost point, so whatever hangs off it needs room on the right.
  area.width -= endDirScreen.x > 0.95 ? opts.endPad : 0.8 * opts.endPad;
  if (endDirScreen.y < -0.3) {
    area.top += opts.endPad * -endDirScreen.y;
    area.height -= opts.endPad * -endDirScreen.y;
  } else if (endDirScreen.y > 0.3) {
    area.height -= opts.endPad * endDirScreen.y;
  }
  area.width = Math.max(40, area.width);
  area.height = Math.max(20, area.height);

  // Rising and falling runs may be drawn shorter than to scale, so a line with
  // few bends still spreads across a wide canvas.
  const squashFor = (h: number, k: number) => (Math.abs(Math.sin(h)) > 1e-6 ? k : 1);
  const vertsFor = (k: number) => {
    const pts: Vec[] = [{ x: 0, y: 0 }];
    for (let i = 0; i < headings.length; i++) {
      const len = (xs[i + 1] - xs[i]) * squashFor(headings[i], k);
      const p = pts[pts.length - 1];
      pts.push({ x: p.x + len * Math.cos(headings[i]), y: p.y + len * Math.sin(headings[i]) });
    }
    return pts;
  };
  const extent = (pts: Vec[]) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    return { x0, x1, y0, y1 };
  };
  const scaleFor = (k: number) => {
    const e = extent(vertsFor(k));
    const sx = area.width / Math.max(1e-9, e.x1 - e.x0);
    const sy = e.y1 - e.y0 > 1e-9 ? area.height / (e.y1 - e.y0) : Infinity;
    return Math.min(sx, sy);
  };
  const scales = VERTICAL_SQUASH.map(scaleFor);
  const best = Math.max(...scales);
  const pick = scales.findIndex((sc) => sc >= 0.9 * best);
  const k = VERTICAL_SQUASH[pick];
  const scale = scales[pick];

  const unitVerts = vertsFor(k);
  const e = extent(unitVerts);
  const offX = area.left + (area.width - (e.x1 - e.x0) * scale) / 2;
  const offY = area.top + (area.height - (e.y1 - e.y0) * scale) / 2;
  const verts: Vec[] = unitVerts.map((p) => ({ x: offX + (p.x - e.x0) * scale, y: offY + (e.y1 - p.y) * scale }));

  // Bore: as large as wanted, but every bend, the valve and the pump must fit
  // on the straight lengths between their neighbours.
  const visualAt = (x: number): number => {
    let acc = 0;
    for (let i = 0; i < headings.length; i++) {
      const f = squashFor(headings[i], k) * scale;
      if (x <= xs[i + 1]) return acc + (x - xs[i]) * f;
      acc += (xs[i + 1] - xs[i]) * f;
    }
    return acc;
  };
  const needs: { x: number; c: number }[] = [
    { x: 0, c: opts.startHalfD },
    ...turnsIn.map((t) => {
      const spec = TURN_SPECS[t.kind];
      return { x: t.xNorm, c: spec.radius * Math.tan(spec.angle / 2) + (spec.radius === 0 ? 0.75 : 0.2) };
    }),
    ...opts.keepouts.map((kp) => ({ x: kp.xNorm, c: kp.halfD })),
    { x: 1, c: opts.endHalfD }
  ].sort((a, b) => a.x - b.x);
  let dPx = opts.dTarget;
  for (let i = 1; i < needs.length; i++) {
    const c = needs[i - 1].c + needs[i].c;
    if (c > 0) dPx = Math.min(dPx, (0.92 * (visualAt(needs[i].x) - visualAt(needs[i - 1].x))) / c);
  }
  dPx = Math.max(3, dPx);

  // Sample the centreline: straights, filleted arcs, and mitred corners.
  const points: RoutePoint[] = [];
  const push = (p: Vec, t: Vec, o: Vec, curv: number) => {
    const last = points[points.length - 1];
    const s = last ? last.s + Math.hypot(p.x - last.x, p.y - last.y) : 0;
    points.push({ x: p.x, y: p.y, tx: t.x, ty: t.y, ox: o.x, oy: o.y, s, curv });
  };
  const straightTo = (to: Vec, t: Vec) => {
    const from = points[points.length - 1];
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / SAMPLE_PX));
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      push({ x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u }, t, leftOf(t), 0);
    }
  };

  const startDir = norm({ x: verts[1].x - verts[0].x, y: verts[1].y - verts[0].y });
  push(verts[0], startDir, leftOf(startDir), 0);

  const turns: RouteTurn[] = [];
  for (let j = 1; j < verts.length - 1; j++) {
    const station = turnsIn[j - 1];
    const spec = TURN_SPECS[station.kind];
    const phi = signedTurns[j - 1];
    const V = verts[j];
    const dirIn = norm({ x: V.x - verts[j - 1].x, y: V.y - verts[j - 1].y });
    const dirOut = norm({ x: verts[j + 1].x - V.x, y: verts[j + 1].y - V.y });
    const r = spec.radius * dPx;
    const tCut = r * Math.tan(Math.abs(phi) / 2);
    const A = { x: V.x - dirIn.x * tCut, y: V.y - dirIn.y * tCut };
    straightTo(A, dirIn);
    const sStart = points[points.length - 1].s;
    let sMid = sStart;

    if (r > 0) {
      const oIn = leftOf(dirIn);
      const C = { x: A.x + oIn.x * r * Math.sign(phi), y: A.y + oIn.y * r * Math.sign(phi) };
      const rel = { x: A.x - C.x, y: A.y - C.y };
      let steps = Math.max(6, Math.ceil((r * Math.abs(phi)) / SAMPLE_PX));
      if (steps % 2) steps++;
      for (let i = 1; i <= steps; i++) {
        const ang = -phi * (i / steps);
        const q = rotate(rel, ang);
        const t = rotate(dirIn, ang);
        push({ x: C.x + q.x, y: C.y + q.y }, t, leftOf(t), i < steps ? Math.sign(phi) / r : 0);
        if (i === steps / 2) sMid = points[points.length - 1].s;
      }
    } else {
      const oIn = leftOf(dirIn);
      const oOut = leftOf(dirOut);
      const d = 1 + oIn.x * oOut.x + oIn.y * oOut.y;
      push(V, norm({ x: dirIn.x + dirOut.x, y: dirIn.y + dirOut.y }), { x: (oIn.x + oOut.x) / d, y: (oIn.y + oOut.y) / d }, 0);
      sMid = points[points.length - 1].s;
    }

    turns.push({
      ...station,
      spec,
      turn: phi,
      radiusPx: r,
      vertex: V,
      dirIn,
      dirOut,
      s: sMid,
      sStart,
      sEnd: points[points.length - 1].s
    });
  }
  const endDir = norm({
    x: verts[verts.length - 1].x - verts[verts.length - 2].x,
    y: verts[verts.length - 1].y - verts[verts.length - 2].y
  });
  straightTo(verts[verts.length - 1], endDir);
  const length = points[points.length - 1].s;

  const knotX = [0, ...turns.map((t) => t.xNorm), 1];
  const knotS = [0, ...turns.map((t) => t.s), length];
  const sList = points.map((p) => p.s);

  const at = (s: number): RoutePoint => {
    if (s <= 0) return points[0];
    if (s >= length) return points[points.length - 1];
    let lo = 0;
    let hi = points.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (sList[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = points[lo];
    const b = points[hi];
    const u = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    const t = norm({ x: a.tx + (b.tx - a.tx) * u, y: a.ty + (b.ty - a.ty) * u });
    return {
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u,
      tx: t.x,
      ty: t.y,
      ox: a.ox + (b.ox - a.ox) * u,
      oy: a.oy + (b.oy - a.oy) * u,
      s,
      curv: u < 0.5 ? a.curv : b.curv
    };
  };

  return {
    points,
    length,
    dPx,
    turns,
    start: verts[0],
    end: verts[verts.length - 1],
    startDir,
    endDir,
    xToS: (x) => interp(knotX, knotS, x),
    sToX: (s) => interp(knotS, knotX, s),
    at
  };
}
