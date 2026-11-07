/**
 * Minor-loss fittings ("accidentes"): elbows, tees, entrance and exit.
 * K is the Darcy coefficient in ΔP = K ρ v² / 2.
 * Elbow, tee, sharp-entrance and sudden-exit values follow Towler & Sinnott
 * Table 20.4 (and the matching table in friction.ts). Rounded and re-entrant
 * entrances are the standard Crane / Cengel coefficients.
 */

export type FittingGlyph = 'elbow' | 'tee' | 'inlet' | 'outlet';

export interface CatalogFitting {
  id: string;
  param: string;
  K: number;
  label: string;
  short: string;
  glyph: 'elbow' | 'tee';
}

export const LINE_FITTINGS: CatalogFitting[] = [
  { id: 'elbow_90_standard', param: 'n_elbow_90', K: 0.8, label: '90° standard elbow', short: '90°', glyph: 'elbow' },
  { id: 'elbow_90_long', param: 'n_elbow_90_long', K: 0.45, label: '90° long-radius elbow', short: 'LR', glyph: 'elbow' },
  { id: 'elbow_45', param: 'n_elbow_45', K: 0.35, label: '45° elbow', short: '45°', glyph: 'elbow' },
  { id: 'elbow_90_square', param: 'n_elbow_square', K: 1.5, label: 'Square elbow', short: 'Sq', glyph: 'elbow' },
  { id: 'tee_branch', param: 'n_tee_branch', K: 1.8, label: 'Tee into branch', short: 'Tee', glyph: 'tee' },
  { id: 'tee_run', param: 'n_tee_run', K: 1.2, label: 'Tee from branch', short: 'Run', glyph: 'tee' }
];

export interface PortOption {
  value: string;
  label: string;
  name: string;
  K: number;
  short: string;
}

export const ENTRANCE_OPTIONS: PortOption[] = [
  { value: 'none', label: 'None', name: 'None', K: 0, short: '' },
  { value: 'rounded', label: 'Rounded mouth (K = 0.05)', name: 'Rounded entrance', K: 0.05, short: 'In' },
  { value: 'sharp', label: 'Sharp-edged (K = 0.5)', name: 'Sharp entrance', K: 0.5, short: 'In' },
  { value: 'reentrant', label: 'Re-entrant / Borda (K = 0.8)', name: 'Re-entrant entrance', K: 0.8, short: 'In' }
];

export const EXIT_OPTIONS: PortOption[] = [
  { value: 'none', label: 'None (pipe continues)', name: 'None', K: 0, short: '' },
  { value: 'sudden', label: 'Sudden exit into a tank (K = 1)', name: 'Sudden exit', K: 1, short: 'Out' }
];

export interface FittingStation {
  id: string;
  /** Catalog id ('elbow_90_standard', ...), or 'entrance' / 'exit'. */
  kind: string;
  label: string;
  short: string;
  glyph: FittingGlyph;
  K: number;
  xNorm: number;
}

export interface FittingLayout {
  stations: FittingStation[];
  /** Entrance + distributed fittings + exit. Excludes the in-line valve. */
  kTotal: number;
  /** Losses at or upstream of the pump station. Excludes the valve. */
  kSuction: number;
  entranceK: number;
  exitK: number;
}

function port(options: PortOption[], value: string): PortOption {
  return options.find((o) => o.value === value) ?? options[0];
}

const LINE_START = 0.04;
const LINE_END = 0.96;
/** Clear length kept on each side of the valve and the pump, as a fraction of L. */
export const STATION_CLEARANCE = 0.04;

/**
 * Spread n fittings evenly over the free length of the line, skipping a clear
 * zone around the valve and the pump, so no two stations share a position.
 */
function spreadPositions(n: number, blocked: number[]): number[] {
  const zones = blocked
    .map((b) => [b - STATION_CLEARANCE, b + STATION_CLEARANCE] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const free: [number, number][] = [];
  let cursor = LINE_START;
  for (const [lo, hi] of zones) {
    if (lo > cursor) free.push([cursor, Math.min(lo, LINE_END)]);
    cursor = Math.max(cursor, hi);
  }
  if (cursor < LINE_END) free.push([cursor, LINE_END]);
  const total = free.reduce((sum, [lo, hi]) => sum + Math.max(0, hi - lo), 0);

  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = ((i + 0.5) / n) * total;
    let x = LINE_END;
    for (const [lo, hi] of free) {
      const len = hi - lo;
      if (s <= len) {
        x = lo + s;
        break;
      }
      s -= len;
    }
    out.push(x);
  }
  return out;
}

export function layoutFittings(opts: {
  entrance: string;
  exit: string;
  counts: Record<string, number>;
  valveX: number;
  /** Null when the pump is not installed, so nothing is tagged as suction. */
  pumpX: number | null;
}): FittingLayout {
  const entrance = port(ENTRANCE_OPTIONS, opts.entrance);
  const exit = port(EXIT_OPTIONS, opts.exit);
  const stations: FittingStation[] = [];

  if (entrance.K > 0) {
    stations.push({
      id: 'entrance',
      kind: 'entrance',
      label: entrance.name,
      short: entrance.short,
      glyph: 'inlet',
      K: entrance.K,
      xNorm: 0
    });
  }

  const pieces: CatalogFitting[] = [];
  for (const fit of LINE_FITTINGS) {
    const n = Math.max(0, Math.min(12, Math.round(Number(opts.counts[fit.param] ?? 0))));
    for (let i = 0; i < n; i++) pieces.push(fit);
  }

  const blocked = [opts.valveX];
  if (opts.pumpX !== null) blocked.push(opts.pumpX);
  const positions = spreadPositions(pieces.length, blocked);
  for (let i = 0; i < pieces.length; i++) {
    const fit = pieces[i];
    stations.push({
      id: `${fit.id}_${i}`,
      kind: fit.id,
      label: fit.label,
      short: fit.short,
      glyph: fit.glyph,
      K: fit.K,
      xNorm: positions[i]
    });
  }

  if (exit.K > 0) {
    stations.push({
      id: 'exit',
      kind: 'exit',
      label: exit.name,
      short: exit.short,
      glyph: 'outlet',
      K: exit.K,
      xNorm: 1
    });
  }

  const kTotal = stations.reduce((sum, s) => sum + s.K, 0);
  const pumpX = opts.pumpX ?? -1;
  const kSuction = stations.filter((s) => s.xNorm <= pumpX + 1e-9).reduce((sum, s) => sum + s.K, 0);

  return { stations, kTotal, kSuction, entranceK: entrance.K, exitK: exit.K };
}

export function fittingCaption(stations: FittingStation[]): string {
  const counts = new Map<string, number>();
  for (const s of stations) counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
  return [...counts.entries()].map(([label, n]) => `${n}× ${label}`).join(', ');
}
