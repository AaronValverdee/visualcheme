import { UnitOperation } from '../types/unit';
import { PipeUnit } from './pipe/pipe_unit';

export class UnitRegistry {
  private static units: Map<string, UnitOperation> = new Map();

  static {
    // Register active foundation units
    const pipe = new PipeUnit();
    this.units.set(pipe.id, pipe);
  }

  public static getAllUnits(): UnitOperation[] {
    return Array.from(this.units.values());
  }

  public static getUnit(id: string): UnitOperation | undefined {
    return this.units.get(id);
  }

  public static registerUnit(unit: UnitOperation): void {
    this.units.set(unit.id, unit);
  }
}
