import { DiagramData, DiagramPoint } from '../../core/types/unit';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function niceStep(span: number, count: number): number {
  if (!(span > 0) || !Number.isFinite(span)) return 1;
  const raw = span / Math.max(1, count);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const nice = n <= 1.5 ? 1 : n <= 3 ? 2 : n <= 7 ? 5 : 10;
  return nice * pow;
}

function formatTick(v: number): string {
  if (!Number.isFinite(v) || Math.abs(v) < 1e-9) return '0';
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return (Math.round(v * 10) / 10).toString();
  if (a >= 1) return (Math.round(v * 100) / 100).toString();
  return v.toFixed(2);
}

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
    const isLogX = data.xScale === 'log';
    const isLogY = data.yScale === 'log';
    const padL = isLogY ? 48 : 54;
    const padR = 16;
    const padT = 25;
    const padB = isLogX ? 30 : 36;

    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    let minX = data.xDomain ? data.xDomain[0] : 500;
    let maxX = data.xDomain ? data.xDomain[1] : 1e8;
    let minY = data.yDomain ? data.yDomain[0] : 0.008;
    let maxY = data.yDomain ? data.yDomain[1] : 0.1;
    if (!(maxX > minX)) maxX = minX + 1;
    if (!(maxY > minY)) maxY = minY + 1;

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

    let curvesSvg = '';
    for (const c of data.curves) {
      if (c.points.length < 2) continue;
      let d = `M ${mapX(c.points[0].x)} ${mapY(c.points[0].y)}`;
      for (let i = 1; i < c.points.length; i++) {
        d += ` L ${mapX(c.points[i].x)} ${mapY(c.points[i].y)}`;
      }
      const dash = c.dashed ? ' stroke-dasharray="4 3"' : '';
      curvesSvg += `<path d="${d}" fill="none" stroke="${c.color || '#8a8474'}" stroke-width="${c.width ?? 1.15}" opacity="0.92"${dash}/>`;
    }

    let gridSvg = '';
    if (isLogX) {
      const decades = [1e3, 1e4, 1e5, 1e6, 1e7];
      for (const dec of decades) {
        const gx = mapX(dec);
        gridSvg += `
          <line x1="${gx}" y1="${padT}" x2="${gx}" y2="${padT + chartH}" stroke="rgba(232,226,208,0.08)"/>
          <text x="${gx}" y="${padT + chartH + 16}" fill="#8a8474" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="middle">10^${Math.log10(dec)}</text>
        `;
      }
    } else {
      const step = niceStep(maxX - minX, 4);
      let guard = 0;
      for (let x = Math.ceil(minX / step) * step; x <= maxX + step * 1e-6 && guard < 8; x += step, guard++) {
        const gx = mapX(x);
        gridSvg += `
          <line x1="${gx}" y1="${padT}" x2="${gx}" y2="${padT + chartH}" stroke="rgba(232,226,208,0.08)"/>
          <text x="${gx}" y="${padT + chartH + 16}" fill="#8a8474" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="middle">${formatTick(x)}</text>
        `;
      }
    }

    if (isLogY) {
      const yTicks = [0.01, 0.02, 0.04, 0.08];
      for (const yt of yTicks) {
        const gy = mapY(yt);
        gridSvg += `
          <line x1="${padL}" y1="${gy}" x2="${padL + chartW}" y2="${gy}" stroke="rgba(232,226,208,0.08)"/>
          <text x="${padL - 8}" y="${gy + 4}" fill="#8a8474" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="end">${yt}</text>
        `;
      }
    } else {
      const step = niceStep(maxY - minY, 4);
      let guard = 0;
      for (let y = Math.ceil(minY / step) * step; y <= maxY + step * 1e-6 && guard < 8; y += step, guard++) {
        const gy = mapY(y);
        gridSvg += `
          <line x1="${padL}" y1="${gy}" x2="${padL + chartW}" y2="${gy}" stroke="rgba(232,226,208,0.08)"/>
          <text x="${padL - 8}" y="${gy + 4}" fill="#8a8474" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="end">${formatTick(y)}</text>
        `;
      }
    }

    const pointBadge = (point: DiagramPoint, color: string, glow: boolean) => {
      const opX = mapX(point.x);
      const opY = mapY(point.y);
      const label = point.label || '';
      const labelW = Math.max(84, Math.min(190, label.length * 6.4 + 16));
      const badgeX = Math.min(w - labelW - 6, Math.max(padL, opX - labelW / 2));
      const badgeY = Math.max(padT + 2, opY - 22);
      const ring = glow
        ? `<circle cx="${opX}" cy="${opY}" r="7" fill="none" stroke="${color}" stroke-width="1" opacity="0.7"/>`
        : '';
      const labelSvg = label
        ? `<g transform="translate(${badgeX}, ${badgeY})">
            <rect x="0" y="0" width="${labelW}" height="18" rx="1" fill="#141a16" stroke="${color}" stroke-width="1"/>
            <text x="${labelW / 2}" y="12" fill="#e8e2d0" font-size="10" font-family="IBM Plex Mono, monospace" text-anchor="middle">${esc(label)}</text>
          </g>`
        : '';
      return `${ring}<circle cx="${opX}" cy="${opY}" r="3.2" fill="${color}"/>${labelSvg}`;
    };

    let opSvg = '';
    if (data.operatingPoint) opSvg += pointBadge(data.operatingPoint, data.operatingPoint.color || '#e8e2d0', true);
    for (const marker of data.markers ?? []) opSvg += pointBadge(marker, marker.color || '#e0b070', false);

    let legendSvg = '';
    if (data.showLegend) {
      const items = data.curves.filter((c) => c.label);
      const legendW = 108;
      const legendH = items.length * 15 + 10;
      const lx = padL + chartW - legendW - 6;
      const ly = padT + 6;
      legendSvg = `<rect x="${lx}" y="${ly}" width="${legendW}" height="${legendH}" rx="1" fill="#141a16" stroke="rgba(232,226,208,0.22)"/>`;
      items.forEach((c, i) => {
        const y = ly + 14 + i * 15;
        const dash = c.dashed ? ' stroke-dasharray="3 2"' : '';
        legendSvg += `<line x1="${lx + 8}" y1="${y - 4}" x2="${lx + 22}" y2="${y - 4}" stroke="${c.color || '#b7b09c'}" stroke-width="1.4"${dash}/>`;
        legendSvg += `<text x="${lx + 26}" y="${y}" fill="#b7b09c" font-size="11" font-family="IBM Plex Sans, sans-serif">${esc(c.label)}</text>`;
      });
    }

    const yTitle = !isLogY
      ? `<text transform="translate(14 ${padT + chartH / 2}) rotate(-90)" fill="#8a8474" font-size="11" font-family="IBM Plex Sans, sans-serif" text-anchor="middle">${esc(data.yLabel)}</text>`
      : '';

    this.container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}">
        <rect x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" fill="none" stroke="rgba(232,226,208,0.22)"/>
        ${gridSvg}
        ${curvesSvg}
        ${legendSvg}
        ${opSvg}
        ${yTitle}
        <text x="${padL}" y="${padT - 8}" fill="#e8e2d0" font-size="15" font-family="Source Serif 4, Palatino, serif" font-style="italic">${esc(data.title)}</text>
        <text x="${padL + chartW}" y="${padT + chartH + (isLogX ? 28 : 30)}" fill="#8a8474" font-size="11" font-family="IBM Plex Sans, sans-serif" text-anchor="end">${esc(data.xLabel)}</text>
      </svg>
    `;
  }
}
