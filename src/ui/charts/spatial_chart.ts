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
      this.container.innerHTML = '<div style="color:#8a8474;font-size:14px;">No profile data available</div>';
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

    // Where the fittings, valve and pump sit, so steps in the profile can be traced to the drawing.
    const ex = result.extraData ?? {};
    const atX = (xNorm: number) => mapX(minX + xNorm * (maxX - minX));
    const base = padT + chartH;
    let marks = '';
    for (const s of (ex.stations ?? []) as { xNorm: number; glyph: string }[]) {
      if (s.glyph === 'inlet' || s.glyph === 'outlet') continue;
      const x = atX(s.xNorm);
      marks += `<line x1="${x}" y1="${base}" x2="${x}" y2="${base - 6}" stroke="rgba(228,215,161,0.55)" stroke-width="1"/>`;
    }
    const tagged: [number | undefined, string][] = [[ex.valveXNorm, 'valve'], [ex.pumpMark?.xNorm, 'pump']];
    for (const [xNorm, tag] of tagged) {
      if (xNorm === undefined) continue;
      const x = atX(xNorm);
      marks += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${base}" stroke="rgba(232,226,208,0.18)" stroke-dasharray="3 3"/>`;
      marks += `<text x="${x + 3}" y="${padT + 11}" fill="#8a8474" font-size="11" font-family="IBM Plex Mono, monospace">${tag}</text>`;
    }

    this.container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}">
        <defs>
          <linearGradient id="spatial-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e4d7a1" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#e4d7a1" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <line x1="${padL}" y1="${padT}" x2="${padL + chartW}" y2="${padT}" stroke="rgba(232,226,208,0.08)"/>
        <line x1="${padL}" y1="${padT + chartH / 2}" x2="${padL + chartW}" y2="${padT + chartH / 2}" stroke="rgba(232,226,208,0.08)"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="rgba(232,226,208,0.28)"/>

        <text x="${padL - 8}" y="${padT + 4}" fill="#b7b09c" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="end">${tick(maxY)}</text>
        <text x="${padL - 8}" y="${padT + chartH / 2 + 4}" fill="#8a8474" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="end">${tick((minY + maxY) / 2)}</text>
        <text x="${padL - 8}" y="${padT + chartH + 4}" fill="#b7b09c" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="end">${tick(minY)}</text>

        <text x="${padL}" y="${padT + chartH + 18}" fill="#b7b09c" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="start">0 m</text>
        <text x="${padL + chartW}" y="${padT + chartH + 18}" fill="#b7b09c" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="end">${maxX.toFixed(1)} m</text>

        <!-- Shaded Area -->
        <path d="${areaD}" fill="url(#spatial-grad)"/>
        ${marks}

        <!-- Line Profile -->
        <path d="${pathD}" fill="none" stroke="#e4d7a1" stroke-width="1.6" stroke-linecap="round"/>

        <text x="${padL}" y="${padT - 10}" fill="#e8e2d0" font-size="15" font-family="Source Serif 4, Palatino, serif" font-style="italic">
          ${meta.label} (${meta.unit}) along the pipe
        </text>
      </svg>
    `;
  }
}
