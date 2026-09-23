import { ParameterDefinition } from '../../core/types/unit';

export class ControlsPanel {
  private container: HTMLElement;
  private currentParams: Record<string, any> = {};
  private onChangeCallback: (params: Record<string, any>) => void;

  constructor(containerId: string, onChange: (params: Record<string, any>) => void) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
    this.onChangeCallback = onChange;
  }

  public render(paramDefs: ParameterDefinition[], initialValues?: Record<string, any>): void {
    this.container.innerHTML = '';
    this.currentParams = {};

    // Group parameters by category
    const categories: Record<string, ParameterDefinition[]> = {};
    for (const p of paramDefs) {
      const cat = p.category || 'General';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
      this.currentParams[p.id] = initialValues && initialValues[p.id] !== undefined ? initialValues[p.id] : p.defaultVal;
    }

    for (const [catName, params] of Object.entries(categories)) {
      const catHeader = document.createElement('div');
      catHeader.className = 'control-category-header';
      catHeader.textContent = catName;
      this.container.appendChild(catHeader);

      for (const p of params) {
        const group = document.createElement('div');
        group.className = 'control-group';

        const labelRow = document.createElement('div');
        labelRow.className = 'control-label-row';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = p.label;
        labelRow.appendChild(labelSpan);

        if (p.type === 'number') {
          const badge = document.createElement('span');
          badge.className = 'control-value-badge';
          badge.id = `badge-${p.id}`;
          badge.textContent = `${this.currentParams[p.id]} ${p.unit || ''}`.trim();
          labelRow.appendChild(badge);
          group.appendChild(labelRow);

          const slider = document.createElement('input');
          slider.type = 'range';
          slider.min = String(p.min ?? 0);
          slider.max = String(p.max ?? 100);
          slider.step = String(p.step ?? 1);
          slider.value = String(this.currentParams[p.id]);

          slider.addEventListener('input', (e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            this.currentParams[p.id] = val;
            badge.textContent = `${val} ${p.unit || ''}`.trim();
            this.onChangeCallback(this.currentParams);
          });

          group.appendChild(slider);
        } else if (p.type === 'select') {
          group.appendChild(labelRow);
          const select = document.createElement('select');
          select.className = 'control-select';

          for (const opt of p.options || []) {
            const optEl = document.createElement('option');
            optEl.value = opt.value;
            optEl.textContent = opt.label;
            if (opt.value === String(this.currentParams[p.id])) {
              optEl.selected = true;
            }
            select.appendChild(optEl);
          }

          select.addEventListener('change', (e) => {
            const val = (e.target as HTMLSelectElement).value;
            this.currentParams[p.id] = val;
            this.onChangeCallback(this.currentParams);
          });

          group.appendChild(select);
        }

        this.container.appendChild(group);
      }
    }
  }

  public getParams(): Record<string, any> {
    return { ...this.currentParams };
  }

  public setParams(newParams: Record<string, any>): void {
    this.currentParams = { ...this.currentParams, ...newParams };
    // Update inputs
    for (const [key, val] of Object.entries(newParams)) {
      const badge = document.getElementById(`badge-${key}`);
      if (badge) {
        const text = badge.textContent || '';
        const unit = text.split(' ').slice(1).join(' ');
        badge.textContent = `${val} ${unit}`.trim();
      }
    }
  }
}
