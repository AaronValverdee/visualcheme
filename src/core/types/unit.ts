import { PropertyKey, PropertyMetadata } from './properties';

export type ParameterType = 'number' | 'select' | 'boolean';

export interface ParameterOption {
  value: string;
  label: string;
  description?: string;
}

export interface ParameterDefinition {
  id: string;
  label: string;
  type: ParameterType;
  unit?: string;
  defaultVal: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: ParameterOption[];
  description?: string;
  category?: 'Geometry' | 'Inlet Conditions' | 'Fluid / Substance' | 'Operations & Valves' | 'Model Options';
}

/**
 * Model-validity diagnostics. 'alert' means an assumption of the model is
 * violated (e.g. the liquid would flash) and results past that point are not physical.
 */
export interface SimulationWarning {
  level: 'info' | 'warning' | 'alert';
  message: string;
}

export interface MetricCard {
  id: string;
  label: string;
  value: string;
  subtext?: string;
  status?: 'normal' | 'warning' | 'alert';
}

export interface DiagramPoint {
  x: number;
  y: number;
  label?: string;
}

export interface DiagramCurve {
  id: string;
  label: string;
  points: DiagramPoint[];
  color?: string;
  dashed?: boolean;
  width?: number;
}

export interface DiagramData {
  title: string;
  xLabel: string;
  yLabel: string;
  xScale: 'linear' | 'log';
  yScale: 'linear' | 'log';
  curves: DiagramCurve[];
  operatingPoint?: DiagramPoint;
  xDomain?: [number, number];
  yDomain?: [number, number];
}

export interface UnitSimulationResult {
  unitId: string;
  timestamp: number;
  spatialGrid: number[]; // x coordinates in meters [0, L]
  properties: Record<PropertyKey, number[]>;
  metrics: MetricCard[];
  diagram: DiagramData;
  warnings: SimulationWarning[];
  extraData?: Record<string, any>;
}

export interface UnitOperation {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  getParameters(): ParameterDefinition[];
  getAvailableProperties(): PropertyMetadata[];
  calculate(params: Record<string, any>): UnitSimulationResult;
}
