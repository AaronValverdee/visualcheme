import { UnitSimulationResult } from '../../core/types/unit';
import { PropertyKey, PROPERTY_REGISTRY, displayRange } from '../../core/types/properties';

export class SpatialChart {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
  }

  public render(result: UnitSimulationResult, activeProp: PropertyKey): void {
    const meta = PROPERTY_REGISTRY[activeProp];
    const xData = result.spatialGrid;
    const yData = result.properties[activeProp] || [];

    if (xData.length < 2 || yData.length < 2) {
      this.container.innerHTML = '<div style="color:#64748b;font-size:12px;">No profile data available</div>';
      return;
    }

    const minX = xData[0];
    const maxX = xData[xData.length - 1];
    const [minY, maxY] = displayRange(yData, meta);
    const ySpan = maxY - minY;
    const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(ySpan / 4))));
    const tick = (v: number) => v.toFixed(decimals);

    const w = this.container.clientWidth || 340;
    const h = this.container.clientHeight || 200;
    const padL = 50;
    const padR = 20;
    const padT = 25;
    const padB = 30;

    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const mapX = (x: number) => padL + ((x - minX) / (maxX - minX)) * chartW;
    const mapY = (y: number) => padT + chartH - ((y - minY) / ySpan) * chartH;

    // Build SVG path
    let pathD = `M ${mapX(xData[0])} ${mapY(yData[0])}`;
    let areaD = `M ${mapX(xData[0])} ${padT + chartH} L ${mapX(xData[0])} ${mapY(yData[0])}`;

    for (let i = 1; i < xData.length; i++) {
      const px = mapX(xData[i]);
      const py = mapY(yData[i]);
      pathD += ` L ${px} ${py}`;
      areaD += ` L ${px} ${py}`;
    }
    areaD += ` L ${mapX(maxX)} ${padT + chartH} Z`;

    this.container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}">
        <defs>
          <linearGradient id="spatial-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Gridlines -->
        <line x1="${padL}" y1="${padT}" x2="${padL + chartW}" y2="${padT}" stroke="rgba(255,255,255,0.06)"/>
        <line x1="${padL}" y1="${padT + chartH / 2}" x2="${padL + chartW}" y2="${padT + chartH / 2}" stroke="rgba(255,255,255,0.06)"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="rgba(255,255,255,0.15)"/>

        <!-- Y Axis Ticks -->
        <text x="${padL - 8}" y="${padT + 4}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="end">${tick(maxY)}</text>
        <text x="${padL - 8}" y="${padT + chartH / 2 + 4}" fill="#64748b" font-size="10" font-family="monospace" text-anchor="end">${tick((minY + maxY) / 2)}</text>
        <text x="${padL - 8}" y="${padT + chartH + 4}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="end">${tick(minY)}</text>

        <!-- X Axis Ticks -->
        <text x="${padL}" y="${padT + chartH + 16}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="start">0 m</text>
        <text x="${padL + chartW}" y="${padT + chartH + 16}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="end">${maxX.toFixed(1)} m</text>

        <!-- Shaded Area -->
        <path d="${areaD}" fill="url(#spatial-grad)"/>

        <!-- Line Profile -->
        <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Chart Title -->
        <text x="${padL}" y="${padT - 10}" fill="#f8fafc" font-size="11" font-weight="600" font-family="sans-serif">
          1D Spatial Profile: ${meta.label} [${meta.unit}] vs. x (m)
        </text>
      </svg>
    `;
  }
}
