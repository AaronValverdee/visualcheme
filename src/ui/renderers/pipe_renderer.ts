import { UnitSimulationResult } from '../../core/types/unit';
import { PropertyKey, PROPERTY_REGISTRY, displayRange } from '../../core/types/properties';
import { buildRoute, PipeRoute, RoutePoint, RouteTurn, Vec } from './pipe_route';

const MARGIN = { left: 26, right: 26, top: 64, bottom: 58 };
const TANK_DEPTH = 46;
const PORT_PAD = 20;

const WALL = 'rgba(232, 226, 208, 0.72)';
const GOLD = '#e4d7a1';
const MUTED = '#8a8474';
const INK = '#e8e2d0';
const PANEL = '#141a16';
const SERIF = '"Source Serif 4", Palatino, serif';
const MONO = 'IBM Plex Mono, monospace';

interface Particle {
  /** Position along the pipe, x / L. */
  x: number;
  /** Radial position, −1 (right wall) to +1 (left wall) looking downstream. */
  r: number;
  size: number;
  alpha: number;
  px: number | null;
  py: number | null;
}

interface Bubble {
  s: number;
  r: number;
  age: number;
  life: number;
  size: number;
  /** Cavitation bubbles collapse; flashing vapor grows. */
  grow: boolean;
}

interface StationData {
  xNorm: number;
  kind: string;
  K: number;
  label: string;
  short: string;
  glyph: string;
}

interface Disturbance {
  s: number;
  amp: number;
}

interface Scene {
  route: PipeRoute;
  valveS: number;
  valveHalf: number;
  valveOpen: number;
  valveSqueeze: 'side' | 'centre';
  pumpS: number | null;
  flashS: number | null;
  disturbances: Disturbance[];
  /** Base radial eddy diffusivity, (radius units)² per displayed second. */
  baseMixing: number;
  /** Displayed seconds for liquid at the inlet mean velocity to cross the pipe. */
  transitShown: number;
  transitReal: number;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Text placed beside an anchor, aligned so it grows away from it along dir. */
function placeText(ctx: CanvasRenderingContext2D, text: string, anchor: Vec, dir: Vec, gap: number): void {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const d = { x: dir.x / l, y: dir.y / l };
  ctx.textAlign = d.x > 0.45 ? 'left' : d.x < -0.45 ? 'right' : 'center';
  ctx.textBaseline = d.y > 0.45 ? 'top' : d.y < -0.45 ? 'bottom' : 'middle';
  ctx.fillText(text, anchor.x + d.x * gap, anchor.y + d.y * gap);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

const gauss = () => {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export class PipeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement;
  private layerCtx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private bubbles: Bubble[] = [];
  private activeProperty: PropertyKey = 'pressure';
  private currentResult: UnitSimulationResult | null = null;
  private scene: Scene | null = null;
  private dirty = true;
  private cssW = 0;
  private cssH = 0;
  private mouse: Vec | null = null;
  private hoverS: number | null = null;
  private impellerAngle = 0;
  private lastTime: number | null = null;
  private animFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvasId: string) {
    const el = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!el) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = el;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;
    this.layer = document.createElement('canvas');
    const layerContext = this.layer.getContext('2d');
    if (!layerContext) throw new Error('Failed to get 2D canvas context');
    this.layerCtx = layerContext;

    this.setupListeners();
    this.startAnimation();
  }

  private setupListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.updateHover();
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse = null;
      this.hoverS = null;
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener('resize', () => this.resize());
    }
    this.resize();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === this.cssW && rect.height === this.cssH && this.canvas.width > 0) return;
    this.cssW = rect.width;
    this.cssH = rect.height;
    for (const [c, cx] of [[this.canvas, this.ctx], [this.layer, this.layerCtx]] as const) {
      c.width = Math.max(1, Math.round(rect.width * dpr));
      c.height = Math.max(1, Math.round(rect.height * dpr));
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.dirty = true;
  }

  public update(result: UnitSimulationResult, activeProp: PropertyKey): void {
    this.currentResult = result;
    this.activeProperty = activeProp;
    this.dirty = true;
  }

  private startAnimation(): void {
    const loop = (now: number) => {
      const dt = this.lastTime === null ? 0 : Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.render(dt);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
  }

  // ---------------------------------------------------------------- data access

  private get extra(): Record<string, any> {
    return this.currentResult?.extraData ?? {};
  }

  private get stations(): StationData[] {
    return (this.extra.stations ?? []) as StationData[];
  }

  private series(): number[] {
    return this.currentResult?.properties[this.activeProperty] ?? [];
  }

  /** Linear interpolation of a nodal series at x / L. */
  private sampleAt(values: number[], xNorm: number): number {
    if (values.length === 0) return 0;
    const pos = Math.max(0, Math.min(1, xNorm)) * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(pos));
    if (i < 0) return values[0];
    const t = pos - i;
    return values[i] * (1 - t) + values[i + 1] * t;
  }

  /** u(r)/v_mean from the model's radial profile. */
  private velocityRatioAt(r: number): number {
    const profile: { rNorm: number; uRatio: number }[] = this.extra.radialProfile || [];
    if (profile.length < 2) return 1.0;
    const pos = ((Math.max(-1, Math.min(1, r)) + 1) / 2) * (profile.length - 1);
    const i = Math.max(0, Math.min(profile.length - 2, Math.floor(pos)));
    const t = pos - i;
    return profile[i].uRatio * (1 - t) + profile[i + 1].uRatio * t;
  }

  // ---------------------------------------------------------------- scene

  private buildScene(): Scene | null {
    const result = this.currentResult;
    if (!result || this.cssW < 50 || this.cssH < 50) return null;
    const ex = this.extra;
    const D_mm = (ex.D ?? 0.05) * 1000;
    const dTarget = Math.max(12, Math.min(40, 14 + (24 * Math.log(D_mm / 10)) / Math.log(30)));
    const valveType = String(ex.valveType ?? 'gate_valve');
    const valveHalfD = valveType === 'globe_valve' ? 1.15 : valveType === 'ball_valve' ? 1.0 : 0.9;
    const pump = ex.pumpMark as { xNorm: number } | null;
    const fromVessel = (ex.entranceType ?? 'none') !== 'none';
    const intoTank = (ex.exitType ?? 'none') !== 'none';

    const keepouts = [{ xNorm: ex.valveXNorm ?? 0.6, halfD: valveHalfD + 0.3 }];
    if (pump) keepouts.push({ xNorm: pump.xNorm, halfD: 1.6 });

    const route = buildRoute(
      this.stations,
      {
        left: MARGIN.left,
        top: MARGIN.top,
        width: this.cssW - MARGIN.left - MARGIN.right,
        height: this.cssH - MARGIN.top - MARGIN.bottom
      },
      {
        dTarget,
        keepouts,
        startHalfD: fromVessel ? 1.9 : 0.6,
        endHalfD: intoTank ? 1.0 : 0.6,
        startPad: fromVessel ? TANK_DEPTH : PORT_PAD,
        endPad: intoTank ? TANK_DEPTH : PORT_PAD
      }
    );

    const D = route.dPx;
    const valvePct = Number(ex.valvePct ?? 100);
    const valveOpen =
      valveType === 'globe_valve'
        ? Math.max(0.12, 0.55 * Math.sqrt(valvePct / 100))
        : Math.max(0.06, valvePct / 100);
    const valveS = route.xToS(ex.valveXNorm ?? 0.6);
    const pumpS = pump ? route.xToS(pump.xNorm) : null;

    const Re = Number(ex.Re ?? 0);
    const regime = String(ex.regime ?? 'turbulent');
    const laminarScale = regime === 'laminar' ? 0.35 : 1;
    const disturbances: Disturbance[] = [];
    for (const s of this.stations) {
      if (s.glyph === 'outlet') continue;
      const turn = route.turns.find((t) => Math.abs(t.xNorm - s.xNorm) < 1e-9 && t.kind === s.kind);
      const at = s.glyph === 'inlet' ? 0 : turn ? turn.sEnd : route.xToS(s.xNorm);
      disturbances.push({ s: at, amp: laminarScale * s.K });
    }
    disturbances.push({ s: valveS + valveHalfD * D, amp: laminarScale * Math.min(40, Number(ex.K_valve ?? 0)) });
    if (pumpS !== null) disturbances.push({ s: pumpS + 1.3 * D, amp: 1.2 });

    // Turbulence intensity I ≈ 0.16 Re^(−1/8) sets the background radial mixing.
    let baseMixing = 0;
    if (regime === 'turbulent') baseMixing = 0.05 * ((0.16 * Math.pow(Math.max(Re, 4000), -1 / 8)) / 0.045);
    else if (regime === 'transition') baseMixing = 0.02;

    const vMean = Number(ex.v_mean ?? 0);
    const L = Number(ex.L ?? 20);
    const transitReal = vMean > 1e-6 ? L / vMean : Infinity;
    const transitShown = Number.isFinite(transitReal)
      ? Math.max(3, Math.min(16, 2.6 * Math.pow(transitReal, 0.42)))
      : Infinity;

    const flashX = ex.flashXNorm as number | null;
    return {
      route,
      valveS,
      valveHalf: valveHalfD * D,
      valveOpen,
      valveSqueeze: valveType === 'gate_valve' ? 'side' : 'centre',
      pumpS,
      flashS: flashX !== null && flashX !== undefined ? route.xToS(flashX) : null,
      disturbances,
      baseMixing,
      transitShown,
      transitReal
    };
  }

  private syncParticles(route: PipeRoute): void {
    const want = Math.round(Math.max(70, Math.min(300, route.length / 6)));
    const sizeScale = Math.max(0.6, Math.min(1.2, route.dPx / 28));
    while (this.particles.length < want) {
      this.particles.push({
        x: Math.random(),
        r: (Math.random() * 2 - 1) * 0.88,
        size: (1.1 + Math.random() * 1.5) * sizeScale,
        alpha: 0.35 + Math.random() * 0.5,
        px: null,
        py: null
      });
    }
    this.particles.length = want;
    for (const p of this.particles) {
      p.size = Math.max(0.8, Math.min(p.size, 3.2 * sizeScale));
      p.px = null;
      p.py = null;
    }
  }

  // ---------------------------------------------------------------- frame

  private render(dt: number): void {
    const ctx = this.ctx;
    const w = this.cssW;
    const h = this.cssH;
    ctx.clearRect(0, 0, w, h);

    if (!this.currentResult) {
      ctx.fillStyle = MUTED;
      ctx.font = `italic 17px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText('Initializing Simulation Engine...', w / 2, h / 2);
      return;
    }

    if (this.dirty) {
      this.scene = this.buildScene();
      if (this.scene) {
        this.syncParticles(this.scene.route);
        this.drawStatic(this.scene);
        this.updateHover();
      }
      this.dirty = false;
    }
    const scene = this.scene;
    if (!scene) return;

    ctx.drawImage(this.layer, 0, 0, w, h);
    this.stepParticles(scene, dt);
    this.drawParticles(scene);
    this.stepBubbles(scene, dt);
    this.drawBubbles(scene);
    if (scene.pumpS !== null) this.drawPump(scene, dt);
    this.drawProbe(scene);
  }

  // ---------------------------------------------------------------- particles

  /** 0 away from the valve, 1 in the throat; the jet re-expands over a few bores downstream. */
  private valveWindow(scene: Scene, s: number): number {
    const D = scene.route.dPx;
    const d = s - scene.valveS;
    const half = scene.valveHalf * 0.6;
    if (d < 0) return 1 - smoothstep(half, half + 0.9 * D, -d);
    return 1 - smoothstep(half, half + 2.8 * D, d);
  }

  private displayedRadius(scene: Scene, p: Particle, s: number): number {
    const w = this.valveWindow(scene, s);
    if (w <= 0) return p.r;
    const squeezed = scene.valveSqueeze === 'side' ? -0.9 + (p.r + 0.9) * scene.valveOpen : p.r * scene.valveOpen;
    return p.r + (squeezed - p.r) * w;
  }

  private stepParticles(scene: Scene, dt: number): void {
    if (dt <= 0 || !Number.isFinite(scene.transitShown)) return;
    const route = scene.route;
    const velocity = this.currentResult?.properties.velocity ?? [];
    const vIn = Number(this.extra.v_mean ?? 0);
    if (vIn <= 1e-9) return;
    const decay = 4 * route.dPx;

    for (const p of this.particles) {
      const s = route.xToS(p.x);
      const w = this.valveWindow(scene, s);
      const throat = 1 / (1 - w * (1 - scene.valveOpen));
      const u = this.velocityRatioAt(p.r);
      const vRatio = this.sampleAt(velocity, p.x) / vIn;
      const dx = (vRatio * u * throat * dt) / scene.transitShown;
      p.x += dx;
      if (p.x >= 1) {
        p.x -= 1;
        p.r = (Math.random() * 2 - 1) * 0.88;
        p.px = null;
        continue;
      }

      // Eddy diffusion across the bore: background turbulence plus the wake
      // shed by each fitting, decaying over a few bores downstream.
      let mixing = scene.baseMixing;
      for (const d of scene.disturbances) {
        const gap = s - d.s;
        if (gap >= -route.dPx * 0.5 && gap < 6 * decay) mixing += 0.22 * Math.sqrt(d.amp) * Math.exp(-Math.max(0, gap) / decay);
      }
      if (mixing > 0) p.r += Math.sqrt(2 * mixing * dt) * gauss();

      // Dean secondary flow in a bend: the fast core is flung to the outer wall,
      // the slow wall layer creeps back along the inner side.
      const pt = route.at(s);
      if (pt.curv !== 0) {
        const turned = Math.abs(pt.curv) * (route.xToS(p.x) - s);
        p.r -= Math.sign(pt.curv) * 0.5 * turned * (u - 0.9);
      }

      if (p.r > 0.9) p.r = 1.8 - p.r;
      if (p.r < -0.9) p.r = -1.8 - p.r;
      p.r = Math.max(-0.9, Math.min(0.9, p.r));
    }
  }

  private drawParticles(scene: Scene): void {
    const ctx = this.ctx;
    const route = scene.route;
    const half = route.dPx / 2 - 1.5;
    ctx.lineCap = 'round';
    for (const p of this.particles) {
      const s = route.xToS(p.x);
      const pt = route.at(s);
      const r = this.displayedRadius(scene, p, s);
      const x = pt.x + pt.ox * r * half;
      const y = pt.y + pt.oy * r * half;
      ctx.globalAlpha = p.alpha;
      if (p.px !== null && p.py !== null && Math.hypot(x - p.px, y - p.py) < route.dPx) {
        ctx.strokeStyle = 'rgba(240, 236, 222, 0.85)';
        ctx.lineWidth = p.size * 1.3;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(240, 236, 222, 0.85)';
        ctx.beginPath();
        ctx.arc(x, y, p.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      p.px = x;
      p.py = y;
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- bubbles

  private stepBubbles(scene: Scene, dt: number): void {
    if (dt <= 0) return;
    const route = scene.route;
    const D = route.dPx;
    const status = (this.extra.pumpMark as { status: string } | null)?.status;
    const speed = Number.isFinite(scene.transitShown) ? route.length / scene.transitShown : 0;

    if (status === 'cavitation' && scene.pumpS !== null && Math.random() < dt * 40) {
      this.bubbles.push({ s: scene.pumpS - 0.6 * D, r: gauss() * 0.3, age: 0, life: 0.35 + Math.random() * 0.3, size: 1.5 + Math.random() * 2.5, grow: false });
    }
    if (scene.flashS !== null && speed > 0) {
      const span = route.length - scene.flashS;
      if (Math.random() < dt * Math.min(60, span / 6)) {
        this.bubbles.push({ s: scene.flashS + Math.random() * 2 * D, r: (Math.random() * 2 - 1) * 0.8, age: 0, life: span / speed, size: 0.8, grow: true });
      }
    }

    for (const b of this.bubbles) {
      b.age += dt;
      b.s += speed * dt * (b.grow ? 1 : 0.6);
      b.r = Math.max(-0.85, Math.min(0.85, b.r + gauss() * 0.04));
    }
    const flashS = scene.flashS;
    this.bubbles = this.bubbles.filter(
      (b) =>
        b.age < b.life &&
        b.s < route.length &&
        (b.grow ? flashS !== null && b.s >= flashS - 2 * D : status === 'cavitation')
    );
    if (this.bubbles.length > 260) this.bubbles.splice(0, this.bubbles.length - 260);
  }

  private drawBubbles(scene: Scene): void {
    if (this.bubbles.length === 0) return;
    const ctx = this.ctx;
    const route = scene.route;
    const half = route.dPx / 2 - 2;
    ctx.lineWidth = 1;
    for (const b of this.bubbles) {
      const pt = route.at(b.s);
      const life = b.age / b.life;
      const size = b.grow
        ? Math.min(half * 0.6, b.size + life * route.dPx * 0.25)
        : b.size * Math.sin(Math.PI * Math.min(1, life * 1.2));
      if (size <= 0.2) continue;
      ctx.strokeStyle = b.grow ? 'rgba(200, 225, 240, 0.8)' : 'rgba(255, 220, 210, 0.9)';
      ctx.beginPath();
      ctx.arc(pt.x + pt.ox * b.r * half, pt.y + pt.oy * b.r * half, size, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- pump

  private drawPump(scene: Scene, dt: number): void {
    const pump = this.extra.pumpMark as { status: string; label: string } | null;
    if (!pump || scene.pumpS === null) return;
    const ctx = this.ctx;
    const D = scene.route.dPx;
    const pt = scene.route.at(scene.pumpS);
    const color =
      pump.status === 'cavitation' ? '#e09a90' : pump.status === 'tight' ? '#e0b070' : pump.status === 'dead' ? MUTED : '#c5d5b8';
    const R = 0.95 * D + 6;

    // A centrifugal pump turns at fixed speed; the flow is whatever the system lets through.
    this.impellerAngle = (this.impellerAngle + dt * 7) % (Math.PI * 2);

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(Math.atan2(pt.ty, pt.tx));
    ctx.fillStyle = PANEL;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(this.impellerAngle);
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22);
      ctx.quadraticCurveTo(
        Math.cos(a + 0.35) * R * 0.55,
        Math.sin(a + 0.35) * R * 0.55,
        Math.cos(a + 0.75) * R * 0.78,
        Math.sin(a + 0.75) * R * 0.78
      );
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.font = `italic 13px ${SERIF}`;
    ctx.fillStyle = color;
    placeText(ctx, pump.label, pt, { x: pt.ox, y: pt.oy }, R + 6);
  }

  // ---------------------------------------------------------------- probe

  private updateHover(): void {
    const scene = this.scene;
    if (!scene || !this.mouse) {
      this.hoverS = null;
      return;
    }
    let best = Infinity;
    let bestS: number | null = null;
    for (const p of scene.route.points) {
      const d = Math.hypot(p.x - this.mouse.x, p.y - this.mouse.y);
      if (d < best) {
        best = d;
        bestS = p.s;
      }
    }
    this.hoverS = best <= scene.route.dPx / 2 + 12 ? bestS : null;
  }

  private annotationAt(scene: Scene, s: number): string | null {
    const D = scene.route.dPx;
    const ex = this.extra;
    for (const t of scene.route.turns) {
      if (s >= t.sStart - 4 && s <= t.sEnd + 4) return t.label;
    }
    if (Math.abs(s - scene.valveS) < scene.valveHalf) {
      const kind = String(ex.valveType ?? 'gate_valve').replace('_valve', '');
      const K = Number(ex.K_valve ?? 0);
      return `${kind} valve ${ex.valvePct}% open (K = ${K < 100 ? K.toFixed(2) : K.toFixed(0)})`;
    }
    if (scene.pumpS !== null && Math.abs(s - scene.pumpS) < D + 6) return (ex.pumpMark as { label: string }).label;
    const entrance = this.stations.find((st) => st.glyph === 'inlet');
    if (entrance && s < 1.5 * D) return entrance.label;
    const exit = this.stations.find((st) => st.glyph === 'outlet');
    if (exit && s > scene.route.length - 1.5 * D) return exit.label;
    return null;
  }

  private drawProbe(scene: Scene): void {
    if (this.hoverS === null) return;
    const ctx = this.ctx;
    const route = scene.route;
    const pt = route.at(this.hoverS);
    const xNorm = route.sToX(this.hoverS);
    const meta = PROPERTY_REGISTRY[this.activeProperty];
    const val = this.sampleAt(this.series(), xNorm);
    const ext = route.dPx / 2 + 10;

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pt.x + pt.ox * ext, pt.y + pt.oy * ext);
    ctx.lineTo(pt.x - pt.ox * ext, pt.y - pt.oy * ext);
    ctx.stroke();
    ctx.setLineDash([]);

    const L = Number(this.extra.L ?? 20);
    const note = this.annotationAt(scene, this.hoverS);
    const tipText = `x = ${(xNorm * L).toFixed(2)} m | ${meta.label}: ${meta.format(val)}${note ? ` | ${note}` : ''}`;
    ctx.font = `12px ${MONO}`;
    const textW = ctx.measureText(tipText).width;
    const tipX = Math.max(10, Math.min(this.cssW - textW - 18, pt.x - textW / 2));
    let tipY = pt.y - route.dPx / 2 - 22;
    if (tipY < 28) tipY = pt.y + route.dPx / 2 + 30;

    ctx.fillStyle = PANEL;
    ctx.strokeStyle = 'rgba(232, 226, 208, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tipX - 8, tipY - 16, textW + 16, 24, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(tipText, tipX, tipY);
  }

  // ---------------------------------------------------------------- static layer

  private drawStatic(scene: Scene): void {
    const ctx = this.layerCtx;
    const w = this.cssW;
    const h = this.cssH;
    ctx.clearRect(0, 0, w, h);

    const values = this.series();
    const meta = PROPERTY_REGISTRY[this.activeProperty];
    const [minVal, maxVal] = displayRange(values, meta);
    const colorAt = (xNorm: number) => this.getColor((this.sampleAt(values, xNorm) - minVal) / (maxVal - minVal || 1));

    const route = scene.route;
    const D = route.dPx;
    const pts = route.points;
    const half = D / 2;
    const edge = (p: RoutePoint, side: number): Vec => ({ x: p.x + p.ox * half * side, y: p.y + p.oy * half * side });

    this.drawPorts(ctx, scene, colorAt);

    for (const t of route.turns) {
      if (t.spec.tee) this.drawTeeLeg(ctx, t, D, colorAt(t.xNorm));
    }

    // Heatmap body, one quad per centreline sample so the bends stay seamless.
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const c = colorAt(route.sToX(0.5 * (a.s + b.s)));
      const la = edge(a, 1), lb = edge(b, 1), rb = edge(b, -1), ra = edge(a, -1);
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(la.x, la.y);
      ctx.lineTo(lb.x, lb.y);
      ctx.lineTo(rb.x, rb.y);
      ctx.lineTo(ra.x, ra.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Walls.
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.strokeStyle = WALL;
    ctx.lineWidth = 1.5;
    for (const side of [1, -1]) {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const e = edge(p, side);
        if (i === 0) ctx.moveTo(e.x, e.y);
        else ctx.lineTo(e.x, e.y);
      });
      ctx.stroke();
    }

    // Fittings: gold walls through each bend, with a joint ring at each end.
    for (const t of route.turns) this.drawFitting(ctx, scene, t, edge);

    // Centreline.
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(232, 226, 208, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawValve(ctx, scene);
    this.drawTurnLabels(ctx, scene);
    this.drawProfile(ctx, scene);
    this.drawLegend(ctx, scene, values, minVal, maxVal);
  }

  private drawFitting(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    t: RouteTurn,
    edge: (p: RoutePoint, side: number) => Vec
  ): void {
    const route = scene.route;
    const D = route.dPx;
    const ring = (s: number) => {
      const p = route.at(s);
      const a = { x: p.x + p.ox * (D / 2 + 2.5), y: p.y + p.oy * (D / 2 + 2.5) };
      const b = { x: p.x - p.ox * (D / 2 + 2.5), y: p.y - p.oy * (D / 2 + 2.5) };
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    const pad = t.radiusPx > 0 ? 0 : 0.55 * D;
    const s0 = Math.max(0, t.sStart - pad);
    const s1 = Math.min(route.length, t.sEnd + pad);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.2;
    for (const side of [1, -1]) {
      ctx.beginPath();
      let first = true;
      const pushPoint = (p: RoutePoint) => {
        const e = edge(p, side);
        if (first) ctx.moveTo(e.x, e.y);
        else ctx.lineTo(e.x, e.y);
        first = false;
      };
      pushPoint(route.at(s0));
      for (const p of route.points) if (p.s > s0 && p.s < s1) pushPoint(p);
      pushPoint(route.at(s1));
      ctx.stroke();
    }

    ctx.lineWidth = 1.6;
    ring(s0);
    ring(s1);
    if (t.radiusPx === 0) {
      // Weld seam of a mitred corner, from the inner to the outer corner.
      const p = route.at(t.s);
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x + p.ox * D / 2, p.y + p.oy * D / 2);
      ctx.lineTo(p.x - p.ox * D / 2, p.y - p.oy * D / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawTeeLeg(ctx: CanvasRenderingContext2D, t: RouteTurn, D: number, color: string): void {
    const dir = t.spec.tee === 'ahead' ? t.dirIn : { x: -t.dirOut.x, y: -t.dirOut.y };
    const n = { x: dir.y, y: -dir.x };
    const len = 1.05 * D;
    const V = t.vertex;
    const tip = { x: V.x + dir.x * len, y: V.y + dir.y * len };
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(V.x + n.x * D / 2, V.y + n.y * D / 2);
    ctx.lineTo(tip.x + n.x * D / 2, tip.y + n.y * D / 2);
    ctx.lineTo(tip.x - n.x * D / 2, tip.y - n.y * D / 2);
    ctx.lineTo(V.x - n.x * D / 2, V.y - n.y * D / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(V.x + n.x * D / 2 + dir.x * D / 2, V.y + n.y * D / 2 + dir.y * D / 2);
    ctx.lineTo(tip.x + n.x * D / 2, tip.y + n.y * D / 2);
    ctx.moveTo(V.x - n.x * D / 2 + dir.x * D / 2, V.y - n.y * D / 2 + dir.y * D / 2);
    ctx.lineTo(tip.x - n.x * D / 2, tip.y - n.y * D / 2);
    ctx.stroke();
    // Blind flange on the dead leg.
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tip.x + n.x * (D / 2 + 3), tip.y + n.y * (D / 2 + 3));
    ctx.lineTo(tip.x - n.x * (D / 2 + 3), tip.y - n.y * (D / 2 + 3));
    ctx.stroke();
  }

  private drawTurnLabels(ctx: CanvasRenderingContext2D, scene: Scene): void {
    const route = scene.route;
    const D = route.dPx;
    const placed: Vec[] = [];
    ctx.font = `12px ${SERIF}`;
    ctx.fillStyle = GOLD;
    for (const t of route.turns) {
      const p = route.at(t.s);
      const oLen = Math.hypot(p.ox, p.oy);
      // Elbows are labelled on the outside of the bend, tees inside the corner, clear of the blind leg.
      const side = t.spec.tee ? Math.sign(t.turn) : -Math.sign(t.turn);
      const dir = { x: (p.ox / oLen) * side, y: (p.oy / oLen) * side };
      const gap = oLen * (D / 2) + 4;
      const pos = { x: p.x + dir.x * (gap + 8), y: p.y + dir.y * (gap + 8) };
      if (placed.some((q) => Math.hypot(q.x - pos.x, q.y - pos.y) < 24)) continue;
      if (pos.y < 14 || pos.y > this.cssH - 36) continue;
      placed.push(pos);
      placeText(ctx, t.short, p, dir, gap);
    }
  }

  private drawValve(ctx: CanvasRenderingContext2D, scene: Scene): void {
    const ex = this.extra;
    const route = scene.route;
    const D = route.dPx;
    const pt = route.at(scene.valveS);
    const type = String(ex.valveType ?? 'gate_valve');
    const pct = Number(ex.valvePct ?? 100);
    const open = Math.max(0, Math.min(1, pct / 100));
    const stemTop = -D / 2 - Math.max(18, 0.9 * D);

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(Math.atan2(pt.ty, pt.tx));
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(232, 226, 208, 0.6)';

    // End flanges.
    const fx = scene.valveHalf;
    for (const x of [-fx, fx]) {
      ctx.beginPath();
      ctx.moveTo(x, -D / 2 - 4);
      ctx.lineTo(x, D / 2 + 4);
      ctx.stroke();
    }

    if (type === 'gate_valve') {
      ctx.fillStyle = 'rgba(20, 26, 22, 0.85)';
      ctx.beginPath();
      ctx.rect(-0.45 * D, stemTop, 0.9 * D, -D / 2 - stemTop);
      ctx.fill();
      ctx.stroke();
      const blade = (1 - open) * D;
      if (blade > 0.5) {
        ctx.fillStyle = GOLD;
        ctx.strokeStyle = '#e0b070';
        ctx.fillRect(-3, -D / 2, 6, blade);
        ctx.strokeRect(-3, -D / 2, 6, blade);
      }
    } else if (type === 'globe_valve') {
      ctx.fillStyle = 'rgba(20, 26, 22, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, fx * 0.95, D * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Seat partition and plug: flow turns up through the seat.
      ctx.strokeStyle = 'rgba(228, 215, 161, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-fx * 0.6, D / 2);
      ctx.bezierCurveTo(-0.2 * D, D / 2, -0.2 * D, 0, 0, 0);
      ctx.bezierCurveTo(0.2 * D, 0, 0.2 * D, -D / 2, fx * 0.6, -D / 2);
      ctx.stroke();
      const lift = 0.35 * D * open;
      ctx.fillStyle = GOLD;
      ctx.fillRect(-0.22 * D, -lift - 3, 0.44 * D, 3);
      ctx.strokeStyle = 'rgba(232, 226, 208, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, -lift - 3);
      ctx.lineTo(0, stemTop);
      ctx.stroke();
    } else {
      const R = 0.62 * D;
      ctx.fillStyle = 'rgba(20, 26, 22, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const ang = (1 - open) * (Math.PI / 2);
      ctx.save();
      ctx.rotate(ang);
      ctx.strokeStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(-R, -D * 0.3);
      ctx.lineTo(R, -D * 0.3);
      ctx.moveTo(-R, D * 0.3);
      ctx.lineTo(R, D * 0.3);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(232, 226, 208, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.lineTo(0, stemTop + 6);
      ctx.stroke();
      ctx.save();
      ctx.translate(0, stemTop + 6);
      ctx.rotate(-ang);
      ctx.strokeStyle = '#e09a90';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(D * 0.9, 0);
      ctx.stroke();
      ctx.restore();
    }

    if (type !== 'ball_valve') {
      ctx.strokeStyle = 'rgba(232, 226, 208, 0.6)';
      ctx.fillStyle = '#e09a90';
      ctx.beginPath();
      ctx.ellipse(0, stemTop - 3, Math.max(10, 0.55 * D), 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.font = `12px ${SERIF}`;
    ctx.fillStyle = INK;
    placeText(ctx, `${type.replace('_valve', '')} ${pct}%`, pt, { x: -pt.ox, y: -pt.oy }, D / 2 + 6);
  }

  /** Suction vessel and receiving tank, or open flanges when the pipe simply continues. */
  private drawPorts(ctx: CanvasRenderingContext2D, scene: Scene, colorAt: (x: number) => string): void {
    const ex = this.extra;
    const route = scene.route;
    const D = route.dPx;
    const entrance = String(ex.entranceType ?? 'none');
    const exit = String(ex.exitType ?? 'none');

    const frame = (origin: Vec, dir: Vec, body: () => void) => {
      ctx.save();
      ctx.translate(origin.x, origin.y);
      ctx.rotate(Math.atan2(dir.y, dir.x));
      body();
      ctx.restore();
    };
    const span = Math.min(Math.max(3.2 * D, 64), 150);
    const depth = TANK_DEPTH - 4;

    /** Upright vessel on the side of the port that `out` points to, with a level liquid surface. */
    const vessel = (port: Vec, out: Vec, liquid: string) => {
      const sideways = Math.abs(out.x) >= Math.abs(out.y);
      let half = span / 2;
      half = sideways
        ? Math.min(half, port.y - 6, this.cssH - 40 - port.y)
        : Math.min(half, port.x - 6, this.cssW - 6 - port.x);
      half = Math.max(half, D / 2 + 6);
      const far = sideways ? port.x + Math.sign(out.x) * depth : port.y + Math.sign(out.y) * depth;
      const x0 = sideways ? Math.min(port.x, far) : port.x - half;
      const x1 = sideways ? Math.max(port.x, far) : port.x + half;
      const y0 = sideways ? port.y - half : Math.min(port.y, far);
      const y1 = sideways ? port.y + half : Math.max(port.y, far);

      ctx.globalAlpha = 0.32;
      ctx.fillStyle = liquid;
      ctx.fillRect(x0, y0 + 8, x1 - x0, y1 - y0 - 8);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = 'rgba(232, 226, 208, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (sideways) {
        const farX = far;
        ctx.moveTo(port.x, port.y - D / 2);
        ctx.lineTo(port.x, y0);
        ctx.lineTo(farX, y0);
        ctx.lineTo(farX, y1);
        ctx.lineTo(port.x, y1);
        ctx.lineTo(port.x, port.y + D / 2);
      } else {
        ctx.moveTo(port.x - D / 2, port.y);
        ctx.lineTo(x0, port.y);
        ctx.lineTo(x0, far);
        ctx.lineTo(x1, far);
        ctx.lineTo(x1, port.y);
        ctx.lineTo(port.x + D / 2, port.y);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(200, 225, 240, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 + 3, y0 + 8);
      ctx.lineTo(x1 - 3, y0 + 8);
      ctx.stroke();
    };

    if (entrance !== 'none') vessel(route.start, { x: -route.startDir.x, y: -route.startDir.y }, colorAt(0));
    if (exit !== 'none') vessel(route.end, route.endDir, colorAt(1));
    const flange = (arrowIn: boolean) => {
      ctx.strokeStyle = 'rgba(232, 226, 208, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-3, -D / 2 - 6, 6, D + 12);
      ctx.strokeStyle = MUTED;
      ctx.beginPath();
      const x0 = arrowIn ? -PORT_PAD + 2 : 6;
      const x1 = arrowIn ? -6 : PORT_PAD - 2;
      ctx.moveTo(x0, 0);
      ctx.lineTo(x1, 0);
      ctx.lineTo(x1 - 5, -4);
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1 - 5, 4);
      ctx.stroke();
    };

    frame(route.start, route.startDir, () => {
      if (entrance === 'none') {
        flange(true);
        return;
      }
      ctx.strokeStyle = WALL;
      ctx.lineWidth = 1.5;
      if (entrance === 'rounded') {
        for (const sgn of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(0.6 * D, (sgn * D) / 2);
          ctx.quadraticCurveTo(0, (sgn * D) / 2, 0, sgn * (D / 2 + 0.55 * D));
          ctx.stroke();
        }
      } else if (entrance === 'reentrant') {
        ctx.fillStyle = colorAt(0);
        ctx.fillRect(-0.9 * D, -D / 2, 0.9 * D, D);
        ctx.beginPath();
        ctx.moveTo(-0.9 * D, -D / 2);
        ctx.lineTo(0, -D / 2);
        ctx.moveTo(-0.9 * D, D / 2);
        ctx.lineTo(0, D / 2);
        ctx.stroke();
      }
      if (entrance === 'sharp' || entrance === 'reentrant') {
        // Vena contracta: the stream separates at the lip and reattaches downstream.
        const neck = entrance === 'sharp' ? 0.2 : 0.27;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(232, 226, 208, 0.45)';
        ctx.lineWidth = 1;
        for (const sgn of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(0, (sgn * D) / 2);
          ctx.quadraticCurveTo(0.55 * D, sgn * (D / 2 - 2 * neck * D), 1.7 * D, (sgn * D) / 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    });

    frame(route.end, route.endDir, () => {
      if (exit === 'none') {
        flange(false);
        return;
      }
      // The free jet spreads and its velocity head is dissipated in the tank.
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(232, 226, 208, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -D / 2);
      ctx.lineTo(TANK_DEPTH * 0.8, -D / 2 - 0.25 * TANK_DEPTH);
      ctx.moveTo(0, D / 2);
      ctx.lineTo(TANK_DEPTH * 0.8, D / 2 + 0.25 * TANK_DEPTH);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  /** Radial velocity profile u(r) drawn on the first straight. */
  private drawProfile(ctx: CanvasRenderingContext2D, scene: Scene): void {
    const profile: { rNorm: number; uRatio: number }[] = this.extra.radialProfile || [];
    if (profile.length < 2 || this.extra.noFlow) return;
    const route = scene.route;
    const D = route.dPx;
    const firstTurn = route.turns[0]?.sStart ?? route.length;
    const limits = [firstTurn, scene.valveS - scene.valveHalf];
    if (scene.pumpS !== null) limits.push(scene.pumpS - D);
    const room = Math.min(...limits);
    const startClear = (this.extra.entranceType ?? 'none') !== 'none' ? 1.9 * D : 0.4 * D;
    const amp = Math.min(0.6 * D, 18);
    if (room - startClear < amp + 6) return;
    const s = startClear + 4;
    const pt = route.at(s);
    const half = D / 2 - 2;
    ctx.strokeStyle = 'rgba(228, 215, 161, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    profile.forEach((q, k) => {
      const along = (q.uRatio / 2) * amp;
      const x = pt.x + pt.ox * q.rNorm * half + pt.tx * along;
      const y = pt.y + pt.oy * q.rNorm * half + pt.ty * along;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  private drawLegend(ctx: CanvasRenderingContext2D, scene: Scene, values: number[], minVal: number, maxVal: number): void {
    const meta = PROPERTY_REGISTRY[this.activeProperty];
    const w = this.cssW;
    const y = this.cssH - 22;

    ctx.fillStyle = MUTED;
    ctx.font = `italic 15px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${meta.label} (${meta.unit})`, MARGIN.left, y + 5);

    const lo = Math.min(...values);
    const hi = Math.max(...values);
    ctx.font = `12px ${MONO}`;
    const loText = meta.format(lo);
    const hiText = meta.format(hi);
    const barW = Math.min(180, w * 0.22);
    const hiW = ctx.measureText(hiText).width;
    const barX1 = w - MARGIN.right - hiW - 8;
    const barX0 = barX1 - barW;
    const grad = ctx.createLinearGradient(barX0, 0, barX1, 0);
    const span = maxVal - minVal || 1;
    const t0 = (lo - minVal) / span;
    const t1 = (hi - minVal) / span;
    for (let k = 0; k <= 8; k++) grad.addColorStop(k / 8, this.getColor(t0 + ((t1 - t0) * k) / 8));
    ctx.fillStyle = grad;
    ctx.fillRect(barX0, y - 4, barW, 8);
    ctx.strokeStyle = 'rgba(232, 226, 208, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX0, y - 4, barW, 8);
    ctx.fillStyle = '#b7b09c';
    ctx.textAlign = 'right';
    ctx.fillText(loText, barX0 - 8, y + 4);
    ctx.textAlign = 'left';
    ctx.fillText(hiText, barX1 + 8, y + 4);

    // Playback rate and elevation, top right.
    const notes: string[] = [];
    if (Number.isFinite(scene.transitReal)) {
      const rate = scene.transitReal / scene.transitShown;
      const rateText = rate >= 1 ? `×${rate.toFixed(rate < 10 ? 1 : 0)}` : `×${rate.toFixed(2)}`;
      notes.push(`transit ${scene.transitReal.toFixed(1)} s, played ${rateText}`);
    } else {
      notes.push('no flow');
    }
    const dz = Number(this.extra.elevation ?? 0);
    if (Math.abs(dz) > 1e-9) notes.push(`outlet ${dz > 0 ? '+' : ''}${dz.toFixed(0)} m above inlet (not drawn)`);
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    notes.forEach((n, i) => ctx.fillText(n, w - 12, 20 + i * 15));
    ctx.textAlign = 'left';
  }

  /**
   * Smooth HSL Colormap Generator (Coolwarm, Plasma, Inferno)
   */
  private getColor(t: number): string {
    const clamped = Math.max(0, Math.min(1, t));
    const scheme = PROPERTY_REGISTRY[this.activeProperty]?.colorScheme || 'coolwarm';

    if (scheme === 'coolwarm') {
      const hue = 205 - clamped * 175;
      return `hsl(${hue}, 28%, ${52 + clamped * 12}%)`;
    } else if (scheme === 'plasma') {
      const hue = 265 - clamped * 210;
      return `hsl(${hue}, 26%, ${50 + clamped * 14}%)`;
    } else if (scheme === 'inferno') {
      const hue = 250 - clamped * 205;
      return `hsl(${hue}, 30%, ${38 + clamped * 24}%)`;
    } else {
      const hue = 185 - clamped * 140;
      return `hsl(${hue}, 24%, ${48 + clamped * 16}%)`;
    }
  }
}
