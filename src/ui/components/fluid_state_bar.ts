import { UnitSimulationResult } from '../../core/types/unit';
import { PropertyKey } from '../../core/types/properties';

export class FluidStateBar {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
  }

  /** Inlet value, plus the outlet value when it differs by more than 0.5 %. */
  private inletOutlet(result: UnitSimulationResult, key: PropertyKey, fmt: (v: number) => string): string {
    const arr = result.properties[key] || [];
    if (arr.length === 0) return '—';
    const a = arr[0];
    const b = arr[arr.length - 1];
    if (Math.abs(b - a) <= 0.005 * Math.abs(a)) return fmt(a);
    return `${fmt(a)} → ${fmt(b)}`;
  }

  public render(result: UnitSimulationResult): void {
    const extra = result.extraData || {};
    const regime: string = extra.regime ?? 'turbulent';
    const Le: number | undefined = extra.entranceLength;
    const n: number | undefined = extra.powerLawN;

    const regimeColor =
      regime === 'turbulent'
        ? 'var(--accent-sky)'
        : regime === 'transition'
        ? 'var(--accent-amber)'
        : 'var(--accent-emerald)';

    const profileText = regime === 'laminar' ? 'parabolic' : `1/${(n ?? 7).toFixed(1)} power law`;

    this.container.innerHTML = `
      <div class="fluid-state-header">
        <span class="fluid-state-title">Bulk & Transport Properties</span>
        <span class="fluid-state-sub">(inlet → outlet when they differ)</span>
      </div>
      <div class="fluid-state-items">
        <div class="fluid-state-badge" title="Mean velocity v = ṁ/(ρA); changes only through thermal expansion">
          <span class="badge-label">Velocity</span>
          <span class="badge-symbol">v</span>
          <span class="badge-val">${this.inletOutlet(result, 'velocity', (v) => `${v.toFixed(2)} m/s`)}</span>
        </div>
        <div class="fluid-state-badge" title="Reynolds number Re = ρvD/μ = 4ṁ/(πDμ); follows viscosity along the pipe">
          <span class="badge-label">Reynolds</span>
          <span class="badge-symbol">Re</span>
          <span class="badge-val">${this.inletOutlet(result, 'reynolds', (v) => Math.round(v).toLocaleString('en-US'))}</span>
          <span class="regime-tag" style="background:${regimeColor}22;color:${regimeColor};border:1px solid ${regimeColor}55;">
            ${regime.toUpperCase()}
          </span>
        </div>
        <div class="fluid-state-badge" title="Darcy-Weisbach friction factor">
          <span class="badge-label">Friction</span>
          <span class="badge-symbol">f</span>
          <span class="badge-val">${this.inletOutlet(result, 'friction_factor', (v) => v.toFixed(4))}</span>
        </div>
        <div class="fluid-state-badge" title="Liquid density from the DIPPR 105/106 correlation">
          <span class="badge-label">Density</span>
          <span class="badge-symbol">ρ</span>
          <span class="badge-val">${this.inletOutlet(result, 'density', (v) => `${v.toFixed(1)} kg/m³`)}</span>
        </div>
        <div class="fluid-state-badge" title="Dynamic viscosity from the DIPPR 101 correlation">
          <span class="badge-label">Viscosity</span>
          <span class="badge-symbol">μ</span>
          <span class="badge-val">${this.inletOutlet(result, 'viscosity', (v) => `${v.toFixed(3)} cP`)}</span>
        </div>
        <div class="fluid-state-badge" title="Hydrodynamic entrance length: 0.05·Re·D (laminar), 4.4·Re^(1/6)·D (turbulent). Velocity profile shape shown on the canvas.">
          <span class="badge-label">Entrance</span>
          <span class="badge-symbol">L_e</span>
          <span class="badge-val">${Le !== undefined ? `${Le.toFixed(2)} m, ${profileText}` : '—'}</span>
        </div>
      </div>
    `;
  }
}
