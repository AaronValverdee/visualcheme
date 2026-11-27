import { UnitSimulationResult } from '../../core/types/unit';
import { PropertyKey } from '../../core/types/properties';
import { conceptHref } from '../../core/theory/concepts';

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

    const noFlow = Boolean(extra.noFlow);
    const regimeClass = noFlow ? 'regime-none' : `regime-${regime}`;
    const profileText = noFlow ? 'stagnant' : regime === 'laminar' ? 'parabolic' : `1/${(n ?? 7).toFixed(1)} power law`;

    this.container.innerHTML = `
      <div class="fluid-state-header">
        <span class="fluid-state-title">Bulk and transport properties</span>
        <span class="fluid-state-sub">(inlet → outlet when they differ)</span>
      </div>
      <div class="fluid-state-items">
        <a class="fluid-state-badge theory-badge-link" href="${conceptHref('hud:velocity')}" data-theory-concept="hud:velocity">
          <span class="badge-label">Velocity</span>
          <span class="badge-symbol">v</span>
          <span class="badge-val">${this.inletOutlet(result, 'velocity', (v) => `${v.toFixed(2)} m/s`)}</span>
        </a>
        <a class="fluid-state-badge theory-badge-link" href="${conceptHref('hud:reynolds')}" data-theory-concept="hud:reynolds">
          <span class="badge-label">Reynolds</span>
          <span class="badge-symbol">Re</span>
          <span class="badge-val">${this.inletOutlet(result, 'reynolds', (v) => Math.round(v).toLocaleString('en-US'))}</span>
          <span class="regime-tag ${regimeClass}">
            ${noFlow ? 'NO FLOW' : regime.toUpperCase()}
          </span>
        </a>
        <a class="fluid-state-badge theory-badge-link" href="${conceptHref('hud:friction_factor')}" data-theory-concept="hud:friction_factor">
          <span class="badge-label">Friction</span>
          <span class="badge-symbol">f</span>
          <span class="badge-val">${this.inletOutlet(result, 'friction_factor', (v) => v.toFixed(4))}</span>
        </a>
        <a class="fluid-state-badge theory-badge-link" href="${conceptHref('hud:density')}" data-theory-concept="hud:density">
          <span class="badge-label">Density</span>
          <span class="badge-symbol">ρ</span>
          <span class="badge-val">${this.inletOutlet(result, 'density', (v) => `${v.toFixed(1)} kg/m³`)}</span>
        </a>
        <a class="fluid-state-badge theory-badge-link" href="${conceptHref('hud:viscosity')}" data-theory-concept="hud:viscosity">
          <span class="badge-label">Viscosity</span>
          <span class="badge-symbol">μ</span>
          <span class="badge-val">${this.inletOutlet(result, 'viscosity', (v) => `${v.toFixed(3)} cP`)}</span>
        </a>
        <a class="fluid-state-badge theory-badge-link" href="${conceptHref('hud:entrance_length')}" data-theory-concept="hud:entrance_length">
          <span class="badge-label">Entrance</span>
          <span class="badge-symbol">L_e</span>
          <span class="badge-val">${noFlow ? '—' : Le !== undefined ? `${Le.toFixed(2)} m, ${profileText}` : '—'}</span>
        </a>
      </div>
    `;
  }
}
