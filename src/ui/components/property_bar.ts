import { PropertyKey, PropertyMetadata } from '../../core/types/properties';

export class PropertyBar {
  private container: HTMLElement;
  private currentProperty: PropertyKey;
  private onSelectCallback: (propKey: PropertyKey) => void;

  constructor(
    containerId: string,
    initialProperty: PropertyKey,
    onSelect: (propKey: PropertyKey) => void
  ) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
    this.currentProperty = initialProperty;
    this.onSelectCallback = onSelect;
  }

  public render(availableProperties: PropertyMetadata[]): void {
    this.container.innerHTML = `
      <div class="property-bar-label">
        <span>Active Heatmap Gradient</span>
      </div>
      <div class="property-pill-group" id="property-pill-group"></div>
    `;

    const pillGroup = this.container.querySelector('#property-pill-group')!;
    for (const prop of availableProperties) {
      const btn = document.createElement('button');
      btn.className = `property-pill ${prop.key === this.currentProperty ? 'active' : ''}`;
      btn.dataset.key = prop.key;
      btn.innerHTML = `
        <span class="property-pill-symbol">${prop.symbol}</span>
        <span>${prop.label}</span>
      `;
      btn.title = prop.description;

      btn.addEventListener('click', () => {
        if (this.currentProperty === prop.key) return;
        this.currentProperty = prop.key;
        this.updateActivePill();
        this.onSelectCallback(prop.key);
      });

      pillGroup.appendChild(btn);
    }
  }

  public setProperty(propKey: PropertyKey): void {
    this.currentProperty = propKey;
    this.updateActivePill();
  }

  public getProperty(): PropertyKey {
    return this.currentProperty;
  }

  private updateActivePill(): void {
    const pillGroup = this.container.querySelector('#property-pill-group');
    if (!pillGroup) return;
    const buttons = pillGroup.querySelectorAll<HTMLElement>('.property-pill');
    buttons.forEach((b) => {
      b.classList.toggle('active', b.dataset.key === this.currentProperty);
    });
  }
}
