import { UnitSimulationResult } from '../../core/types/unit';
import { PropertyKey, PROPERTY_REGISTRY, displayRange } from '../../core/types/properties';

const PAD_X = 60;

interface Particle {
  x: number; // 0 to 1 normalized along length
  rNorm: number; // -0.9 to 0.9 radial position
  size: number;
  alpha: number;
}

export class PipeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private activeProperty: PropertyKey = 'pressure';
  private currentResult: UnitSimulationResult | null = null;
  private hoverXNorm: number | null = null;
  private animFrameId: number | null = null;

  constructor(canvasId: string) {
    const el = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!el) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = el;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;

    this.initParticles(80);
    this.setupListeners();
    this.startAnimation();
  }

  private initParticles(count: number): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random(),
        rNorm: (Math.random() * 2 - 1) * 0.88,
        size: 1.5 + Math.random() * 2.0,
        alpha: 0.3 + Math.random() * 0.5
      });
    }
  }

  private setupListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const pipeW = rect.width - 2 * PAD_X;
      if (clientX >= PAD_X && clientX <= rect.width - PAD_X) {
        this.hoverXNorm = (clientX - PAD_X) / pipeW;
      } else {
        this.hoverXNorm = null;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverXNorm = null;
    });

    window.addEventListener('resize', () => {
      this.resize();
    });
    this.resize();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** u(r)/v_mean from the model's radial profile, linearly interpolated. */
  private velocityRatioAt(rNorm: number): number {
    const profile: { rNorm: number; uRatio: number }[] = this.currentResult?.extraData?.radialProfile || [];
    if (profile.length < 2) return 1.0;
    const pos = ((rNorm + 1) / 2) * (profile.length - 1);
    const i = Math.max(0, Math.min(profile.length - 2, Math.floor(pos)));
    const t = pos - i;
    return profile[i].uRatio * (1 - t) + profile[i + 1].uRatio * t;
  }

  public update(result: UnitSimulationResult, activeProp: PropertyKey): void {
    this.currentResult = result;
    this.activeProperty = activeProp;
  }

  private startAnimation(): void {
    const loop = () => {
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    if (!this.currentResult) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Initializing Simulation Engine...', w / 2, h / 2);
      return;
    }

    const padX = PAD_X;
    const pipeW = w - 2 * padX;
    const pipeH = Math.min(180, Math.max(70, (this.currentResult.extraData?.D || 0.05) * 1200));
    const pipeY = (h - pipeH) / 2;

    const propData = this.currentResult.properties[this.activeProperty] || [];
    const [minVal, maxVal] = displayRange(propData, PROPERTY_REGISTRY[this.activeProperty]);
    const valRange = maxVal - minVal;

    // 1. Draw Pipe Heatmap Interior (Spatial gradient slices)
    const slices = propData.length;
    const sliceW = pipeW / (slices - 1);

    for (let i = 0; i < slices - 1; i++) {
      const x1 = padX + i * sliceW;
      const x2 = x1 + sliceW + 1; // +1 to prevent micro seams
      const val1 = propData[i];
      const val2 = propData[i + 1];
      const norm1 = (val1 - minVal) / valRange;
      const norm2 = (val2 - minVal) / valRange;

      const grad = ctx.createLinearGradient(x1, 0, x2, 0);
      grad.addColorStop(0, this.getColor(norm1));
      grad.addColorStop(1, this.getColor(norm2));

      ctx.fillStyle = grad;
      ctx.fillRect(x1, pipeY, sliceW + 1, pipeH);
    }

    // 2. Draw Pipe Walls & Flanges
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.lineCap = 'butt';

    // Top and bottom metallic pipe walls
    ctx.beginPath();
    ctx.moveTo(padX, pipeY);
    ctx.lineTo(padX + pipeW, pipeY);
    ctx.moveTo(padX, pipeY + pipeH);
    ctx.lineTo(padX + pipeW, pipeY + pipeH);
    ctx.stroke();

    // Flanges on inlet and outlet
    ctx.fillStyle = '#334155';
    ctx.fillRect(padX - 8, pipeY - 14, 8, pipeH + 28);
    ctx.fillRect(padX + pipeW, pipeY - 14, 8, pipeH + 28);

    // 3. Draw In-Line Valve
    const valveXNorm = this.currentResult.extraData?.valveXNorm ?? 0.6;
    const valveX = padX + pipeW * valveXNorm;
    const valvePct = this.currentResult.extraData?.valvePct ?? 100;
    const gateStemH = (pipeH * 0.9 * (100 - valvePct)) / 100.0;

    // Valve bonnet & body
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(valveX - 14, pipeY - 35, 28, 35);
    ctx.fill();
    ctx.stroke();

    // Handwheel
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(valveX, pipeY - 38, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gate blade throttling into the flow
    if (gateStemH > 2) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(valveX - 4, pipeY, 8, gateStemH);
      ctx.strokeStyle = '#b45309';
      ctx.strokeRect(valveX - 4, pipeY, 8, gateStemH);
    }

    // 4. Update and Render Flow Particles with Local Radial Velocity
    const vMean = this.currentResult.extraData?.v_mean ?? 1.5;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const p of this.particles) {
      const uRatio = this.velocityRatioAt(p.rNorm);

      // Valve throttling acceleration effect (visual only)
      const nearValve = Math.abs(p.x - valveXNorm) < 0.05;
      const speedMult = nearValve ? 1.0 + (100 - valvePct) / 60 : 1.0;
      const dxNorm = ((vMean * uRatio * speedMult * 0.016) / (this.currentResult.extraData?.L || 20)) * 2.5;

      p.x += dxNorm;
      if (p.x > 1.0) {
        p.x = 0.0;
        p.rNorm = (Math.random() * 2 - 1) * 0.88;
      }

      const px = padX + p.x * pipeW;
      const py = pipeY + (pipeH / 2) + p.rNorm * (pipeH / 2 - 4);

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 5. Velocity Boundary Layer Profile Overlay (at inlet x = padX + 25)
    const profX = padX + 28;
    const radialProfile = this.currentResult.extraData?.radialProfile || [];
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < radialProfile.length; k++) {
      const item = radialProfile[k];
      const ry = pipeY + (pipeH / 2) + item.rNorm * (pipeH / 2 - 4);
      const rx = profX + item.uRatio * 20;
      if (k === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.stroke();

    // Centerline dashed axis
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(padX, pipeY + pipeH / 2);
    ctx.lineTo(padX + pipeW, pipeY + pipeH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Interactive Hover Probe
    if (this.hoverXNorm !== null) {
      const probeX = padX + this.hoverXNorm * pipeW;
      const probeIdx = Math.round(this.hoverXNorm * (slices - 1));
      const val = propData[probeIdx] ?? 0;
      const meta = PROPERTY_REGISTRY[this.activeProperty];
      const distM = (this.hoverXNorm * (this.currentResult.extraData?.L || 20)).toFixed(2);

      // Probe vertical dashed line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(probeX, pipeY - 20);
      ctx.lineTo(probeX, pipeY + pipeH + 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Probe tooltip card
      const tipText = `x = ${distM} m | ${meta.label}: ${meta.format(val)}`;
      ctx.font = '12px var(--font-mono), monospace';
      const textW = ctx.measureText(tipText).width;
      const tipX = Math.max(10, Math.min(w - textW - 20, probeX - textW / 2));
      const tipY = pipeY - 28;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tipX - 8, tipY - 16, textW + 16, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(tipText, tipX, tipY);
    }

    // 7. Mini Legend & Property Title
    const meta = PROPERTY_REGISTRY[this.activeProperty];
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Gradient: ${meta.label} (${meta.unit})`, padX, pipeY + pipeH + 28);

    ctx.textAlign = 'right';
    ctx.fillText(
      `Min: ${meta.format(Math.min(...propData))}  →  Max: ${meta.format(Math.max(...propData))}`,
      padX + pipeW,
      pipeY + pipeH + 28
    );
  }

  /**
   * Smooth HSL Colormap Generator (Coolwarm, Plasma, Inferno)
   */
  private getColor(t: number): string {
    const clamped = Math.max(0, Math.min(1, t));
    const scheme = PROPERTY_REGISTRY[this.activeProperty]?.colorScheme || 'coolwarm';

    if (scheme === 'coolwarm') {
      // 0 (Cold Blue 220) to 1 (Hot Red 0)
      const hue = 220 - clamped * 220;
      return `hsl(${hue}, 85%, ${40 + clamped * 15}%)`;
    } else if (scheme === 'plasma') {
      // Purple (280) -> Pink -> Orange -> Yellow (55)
      const hue = 280 - clamped * 225;
      return `hsl(${hue}, 90%, ${45 + clamped * 15}%)`;
    } else if (scheme === 'inferno') {
      // Dark purple -> Red -> Gold
      const hue = 270 - clamped * 220;
      const lightness = 25 + clamped * 45;
      return `hsl(${hue}, 95%, ${lightness}%)`;
    } else {
      // Viridis: Deep purple -> Teal -> Emerald -> Yellow
      const hue = 260 - clamped * 200;
      return `hsl(${hue}, 80%, ${35 + clamped * 25}%)`;
    }
  }
}
