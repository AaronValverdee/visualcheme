export type PropertyKey =
  | 'pressure'
  | 'velocity'
  | 'temperature'
  | 'reynolds'
  | 'friction_factor'
  | 'exergy_loss'
  | 'head_loss'
  | 'density'
  | 'viscosity';

export interface PropertyMetadata {
  key: PropertyKey;
  label: string;
  symbol: string;
  unit: string;
  description: string;
  colorScheme: 'plasma' | 'viridis' | 'inferno' | 'coolwarm' | 'spectral';
  format: (val: number) => string;
  defaultRange: [number, number];
  /**
   * Smallest value span mapped onto the full colormap / chart axis, so that
   * physically negligible variations are not stretched into full-scale gradients.
   */
  minSpan: number;
}

export const PROPERTY_REGISTRY: Record<PropertyKey, PropertyMetadata> = {
  pressure: {
    key: 'pressure',
    label: 'Pressure',
    symbol: 'P',
    unit: 'kPa',
    description: 'Absolute static fluid pressure along the conduit',
    colorScheme: 'coolwarm',
    format: (val) => `${val.toFixed(1)} kPa`,
    defaultRange: [100, 500],
    minSpan: 1.0
  },
  velocity: {
    key: 'velocity',
    label: 'Mean Velocity',
    symbol: 'v',
    unit: 'm/s',
    description: 'Bulk cross-sectional fluid velocity',
    colorScheme: 'viridis',
    format: (val) => `${val.toFixed(3)} m/s`,
    defaultRange: [0.1, 5.0],
    minSpan: 0.01
  },
  temperature: {
    key: 'temperature',
    label: 'Temperature',
    symbol: 'T',
    unit: '°C',
    description: 'Fluid bulk (mixing-cup) temperature',
    colorScheme: 'plasma',
    format: (val) => `${val.toFixed(3)} °C`,
    defaultRange: [10, 90],
    minSpan: 0.1
  },
  reynolds: {
    key: 'reynolds',
    label: 'Reynolds Number',
    symbol: 'Re',
    unit: '—',
    description: 'Ratio of inertial forces to viscous forces (ρ·v·D / μ)',
    colorScheme: 'inferno',
    format: (val) => val.toLocaleString('en-US', { maximumFractionDigits: 0 }),
    defaultRange: [500, 100000],
    minSpan: 10
  },
  friction_factor: {
    key: 'friction_factor',
    label: 'Darcy Friction Factor',
    symbol: 'f',
    unit: '—',
    description: 'Darcy-Weisbach dimensionless friction factor',
    colorScheme: 'plasma',
    format: (val) => val.toFixed(4),
    defaultRange: [0.01, 0.08],
    minSpan: 1e-4
  },
  exergy_loss: {
    key: 'exergy_loss',
    label: 'Exergy Destruction',
    symbol: 'dĖx/dx',
    unit: 'W/m',
    description: 'Local Second-Law exergy destruction T₀·Ṡgen from viscous dissipation (valve spike spread over one grid cell)',
    colorScheme: 'inferno',
    format: (val) => `${val.toFixed(2)} W/m`,
    defaultRange: [0.01, 100.0],
    minSpan: 0.1
  },
  head_loss: {
    key: 'head_loss',
    label: 'Head Loss',
    symbol: 'h_L',
    unit: 'm',
    description: 'Cumulative irreversible (friction + minor) head loss in meters of fluid; excludes elevation',
    colorScheme: 'viridis',
    format: (val) => `${val.toFixed(3)} m`,
    defaultRange: [0.01, 20.0],
    minSpan: 0.1
  },
  density: {
    key: 'density',
    label: 'Fluid Density',
    symbol: 'ρ',
    unit: 'kg/m³',
    description: 'Mass density of fluid at local temperature',
    colorScheme: 'viridis',
    format: (val) => `${val.toFixed(2)} kg/m³`,
    defaultRange: [700, 1200],
    minSpan: 0.1
  },
  viscosity: {
    key: 'viscosity',
    label: 'Dynamic Viscosity',
    symbol: 'μ',
    unit: 'cP',
    description: 'Dynamic shear viscosity at local temperature',
    colorScheme: 'coolwarm',
    format: (val) => `${val.toFixed(3)} cP`,
    defaultRange: [0.1, 10.0],
    minSpan: 0.005
  }
};

/**
 * Display range for a data series: its [min, max], widened symmetrically to
 * at least the property's minSpan.
 */
export function displayRange(values: number[], meta: PropertyMetadata): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo)) return [0, 1];
  if (hi - lo < meta.minSpan) {
    const mid = 0.5 * (lo + hi);
    lo = mid - meta.minSpan / 2;
    hi = mid + meta.minSpan / 2;
  }
  return [lo, hi];
}
