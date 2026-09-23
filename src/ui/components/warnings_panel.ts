import { SimulationWarning } from '../../core/types/unit';

const LEVEL_ORDER: Record<SimulationWarning['level'], number> = { alert: 0, warning: 1, info: 2 };
const LEVEL_LABEL: Record<SimulationWarning['level'], string> = {
  alert: 'Model invalid',
  warning: 'Caution',
  info: 'Note'
};

export class WarningsPanel {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
  }

  public render(warnings: SimulationWarning[]): void {
    this.container.innerHTML = '';
    this.container.hidden = warnings.length === 0;

    const sorted = [...warnings].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    for (const w of sorted) {
      const row = document.createElement('div');
      row.className = `warning-row ${w.level}`;
      const tag = document.createElement('span');
      tag.className = 'warning-tag';
      tag.textContent = LEVEL_LABEL[w.level];
      const msg = document.createElement('span');
      msg.textContent = w.message;
      row.append(tag, msg);
      this.container.appendChild(row);
    }
  }
}
