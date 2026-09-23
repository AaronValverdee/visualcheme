import { DiagramData } from '../../core/types/unit';

export class DiagramChart {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
  }

  public render(data: DiagramData): void {
    const w = this.container.clientWidth || 340;
    const h = this.container.clientHeight || 200;
    const padL = 45;
    const padR = 25;
    const padT = 25;
    const padB = 30;

    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const isLogX = data.xScale === 'log';
    const isLogY = data.yScale === 'log';

    const minX = data.xDomain ? data.xDomain[0] : 500;
    const maxX = data.xDomain ? data.xDomain[1] : 1e8;
    const minY = data.yDomain ? data.yDomain[0] : 0.008;
    const maxY = data.yDomain ? data.yDomain[1] : 0.1;

    const mapX = (x: number) => {
      if (isLogX) {
        const val = Math.max(minX, Math.min(maxX, x));
        const logMin = Math.log10(minX);
        const logMax = Math.log10(maxX);
        return padL + ((Math.log10(val) - logMin) / (logMax - logMin)) * chartW;
      }
      return padL + ((x - minX) / (maxX - minX)) * chartW;
    };

    const mapY = (y: number) => {
      if (isLogY) {
        const val = Math.max(minY, Math.min(maxY, y));
        const logMin = Math.log10(minY);
        const logMax = Math.log10(maxY);
        return padT + chartH - ((Math.log10(val) - logMin) / (logMax - logMin)) * chartH;
      }
      return padT + chartH - ((y - minY) / (maxY - minY)) * chartH;
    };

    // Render Curves
    let curvesSvg = '';
    for (const c of data.curves) {
      if (c.points.length < 2) continue;
      let d = `M ${mapX(c.points[0].x)} ${mapY(c.points[0].y)}`;
      for (let i = 1; i < c.points.length; i++) {
        d += ` L ${mapX(c.points[i].x)} ${mapY(c.points[i].y)}`;
      }
      const dash = c.dashed ? ' stroke-dasharray="4 3"' : '';
      curvesSvg += `<path d="${d}" fill="none" stroke="${c.color || '#64748b'}" stroke-width="${c.width ?? 1.2}" opacity="0.85"${dash}/>`;
    }

    // Gridlines & Ticks for Log Scale
    let gridSvg = '';
    if (isLogX) {
      const decades = [1e3, 1e4, 1e5, 1e6, 1e7];
      for (const dec of decades) {
        const gx = mapX(dec);
        gridSvg += `
          <line x1="${gx}" y1="${padT}" x2="${gx}" y2="${padT + chartH}" stroke="rgba(255,255,255,0.06)"/>
          <text x="${gx}" y="${padT + chartH + 14}" fill="#64748b" font-size="9" font-family="monospace" text-anchor="middle">10^${Math.log10(dec)}</text>
        `;
      }
    }

    if (isLogY) {
      const yTicks = [0.01, 0.02, 0.04, 0.08];
      for (const yt of yTicks) {
        const gy = mapY(yt);
        gridSvg += `
          <line x1="${padL}" y1="${gy}" x2="${padL + chartW}" y2="${gy}" stroke="rgba(255,255,255,0.06)"/>
          <text x="${padL - 6}" y="${gy + 3}" fill="#64748b" font-size="9" font-family="monospace" text-anchor="end">${yt}</text>
        `;
      }
    }

    // Operating Point Marker
    let opSvg = '';
    if (data.operatingPoint) {
      const opX = mapX(data.operatingPoint.x);
      const opY = mapY(data.operatingPoint.y);

      opSvg = `
        <!-- Outer Glow Ring -->
        <circle cx="${opX}" cy="${opY}" r="7" fill="none" stroke="#f43f5e" stroke-width="1.5" opacity="0.8">
          <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite"/>
        </circle>
        <!-- Center Dot -->
        <circle cx="${opX}" cy="${opY}" r="4" fill="#f43f5e"/>
        <!-- Label Badge -->
        <g transform="translate(${Math.min(w - 110, Math.max(padL, opX - 50))}, ${Math.max(padT + 12, opY - 14)})">
          <rect x="0" y="0" width="105" height="18" rx="3" fill="rgba(15,23,42,0.9)" stroke="#f43f5e" stroke-width="1"/>
          <text x="52" y="12" fill="#f8fafc" font-size="9" font-family="monospace" font-weight="600" text-anchor="middle">
            ${data.operatingPoint.label || 'Operating Point'}
          </text>
        </g>
      `;
    }

    this.container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}">
        <!-- Border Box -->
        <rect x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" fill="none" stroke="rgba(255,255,255,0.15)"/>

        <!-- Grid Lines -->
        ${gridSvg}

        <!-- Curves -->
        ${curvesSvg}

        <!-- Operating Point -->
        ${opSvg}

        <!-- Title & Axis Labels -->
        <text x="${padL}" y="${padT - 8}" fill="#f8fafc" font-size="11" font-weight="600" font-family="sans-serif">
          ${data.title}
        </text>
        <text x="${padL + chartW}" y="${padT + chartH + 26}" fill="#94a3b8" font-size="9" font-family="sans-serif" text-anchor="end">
          ${data.xLabel}
        </text>
      </svg>
    `;
  }
}
