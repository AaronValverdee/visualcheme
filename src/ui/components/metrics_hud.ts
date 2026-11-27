import { MetricCard } from '../../core/types/unit';
import { conceptHref } from '../../core/theory/concepts';

export class MetricsHUD {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
  }

  public render(metrics: MetricCard[]): void {
    this.container.innerHTML = '';
    for (const m of metrics) {
      const card = document.createElement('div');
      card.className = `kpi-card ${m.status || 'normal'}`;
      const conceptId = `kpi:${m.id}`;
      card.innerHTML = `
        <a class="kpi-label theory-link" href="${conceptHref(conceptId)}" data-theory-concept="${conceptId}">${m.label}</a>
        <div class="kpi-value">${m.value}</div>
        ${m.subtext ? `<div class="kpi-subtext">${m.subtext}</div>` : ''}
      `;
      this.container.appendChild(card);
    }
  }
}
