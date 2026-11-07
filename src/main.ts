import './index.css';
import { UnitRegistry } from './core/units/registry';
import { UnitOperation, UnitSimulationResult } from './core/types/unit';
import { PropertyKey } from './core/types/properties';
import { PropertyBar } from './ui/components/property_bar';
import { MetricsHUD } from './ui/components/metrics_hud';
import { FluidStateBar } from './ui/components/fluid_state_bar';
import { WarningsPanel } from './ui/components/warnings_panel';
import { ControlsPanel } from './ui/components/controls_panel';
import { PipeRenderer } from './ui/renderers/pipe_renderer';
import { SpatialChart } from './ui/charts/spatial_chart';
import { DiagramChart } from './ui/charts/diagram_chart';
import { DiagramData } from './core/types/unit';

class VisualchemeApp {
  private currentUnit: UnitOperation;
  private currentParams: Record<string, any> = {};
  private activeProperty: PropertyKey = 'pressure';
  private latestResult: UnitSimulationResult | null = null;

  private propertyBar: PropertyBar;
  private metricsHUD: MetricsHUD;
  private fluidStateBar: FluidStateBar;
  private warningsPanel: WarningsPanel;
  private controlsPanel: ControlsPanel;
  private pipeRenderer: PipeRenderer | null = null;
  private spatialChart: SpatialChart;
  private diagramChart: DiagramChart;
  private pumpChart: DiagramChart;

  constructor() {
    // 1. Initial unit: Pipe Flow
    const pipe = UnitRegistry.getUnit('pipe_flow');
    if (!pipe) throw new Error('Default unit pipe_flow not found in registry');
    this.currentUnit = pipe;

    // 2. Instantiate Components
    this.propertyBar = new PropertyBar('property-bar', this.activeProperty, (prop) => {
      this.onPropertySelected(prop);
    });

    this.metricsHUD = new MetricsHUD('metrics-strip');
    this.fluidStateBar = new FluidStateBar('fluid-state-bar');
    this.warningsPanel = new WarningsPanel('warnings-strip');

    this.controlsPanel = new ControlsPanel('controls-container', (params) => {
      this.currentParams = params;
      this.runSimulation();
    });

    this.spatialChart = new SpatialChart('spatial-chart-wrapper');
    this.diagramChart = new DiagramChart('diagram-chart-wrapper');
    this.pumpChart = new DiagramChart('pump-chart-wrapper');

    // 3. Setup Navigation & Presets
    this.setupNavigation();
    this.setupPresets();

    // 4. Mount Active Unit
    this.switchUnit(this.currentUnit.id);
  }

  private setupNavigation(): void {
    const tabs = document.querySelectorAll('.unit-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const unitId = target.dataset.unit;
        if (!unitId || unitId === this.currentUnit.id) return;

        tabs.forEach((t) => t.classList.remove('active'));
        target.classList.add('active');

        this.switchUnit(unitId);
      });
    });

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.switchUnit(this.currentUnit.id);
      });
    }
  }

  private setupPresets(): void {
    const presetSelect = document.getElementById('preset-select') as HTMLSelectElement | null;
    if (!presetSelect) return;

    const presets: Record<string, { unit: string; params: Record<string, any> }> = {
      pipe_default: {
        unit: 'pipe_flow',
        params: { fluid: 'Water', velocity: 1.5, diameter_mm: 50, length_m: 20, material: 'commercial_steel', temp_c: 25, p_inlet_kpa: 350 }
      },
      pipe_laminar: {
        unit: 'pipe_flow',
        params: { fluid: 'Ethylene glycol', velocity: 0.25, diameter_mm: 25, length_m: 10, material: 'drawn_tubing', temp_c: 20, p_inlet_kpa: 200 }
      },
      pipe_throttled: {
        unit: 'pipe_flow',
        params: { fluid: 'Water', velocity: 2.0, diameter_mm: 50, length_m: 20, valve_opening_pct: 15, valve_type: 'globe_valve', p_inlet_kpa: 500 }
      },
      pipe_cast_iron: {
        unit: 'pipe_flow',
        params: { fluid: 'Water', velocity: 3.0, diameter_mm: 100, length_m: 50, material: 'cast_iron' }
      },
      // Towler & Sinnott Example 20.1: 3500 kg/h water, mu = 0.99 cP (about 21 °C), gate valve half open
      pipe_towler_20_1: {
        unit: 'pipe_flow',
        params: {
          fluid: 'Water', velocity: 1.98, diameter_mm: 25, length_m: 120, material: 'commercial_steel',
          temp_c: 21, p_inlet_kpa: 400, valve_type: 'gate_valve', valve_opening_pct: 50
        }
      },
      pipe_uphill: {
        unit: 'pipe_flow',
        params: { fluid: 'Water', velocity: 1.5, diameter_mm: 50, length_m: 100, elevation_m: 25, p_inlet_kpa: 500 }
      },
      pipe_flashing: {
        unit: 'pipe_flow',
        params: {
          fluid: 'Acetone', velocity: 3.0, diameter_mm: 50, length_m: 20, temp_c: 50, p_inlet_kpa: 200,
          valve_type: 'globe_valve', valve_opening_pct: 40
        }
      },
      pipe_fittings: {
        unit: 'pipe_flow',
        params: {
          fluid: 'Water', velocity: 2.2, diameter_mm: 80, length_m: 60, material: 'commercial_steel',
          temp_c: 20, p_inlet_kpa: 400, valve_opening_pct: 100, heat_transfer_mode: 'adiabatic',
          entrance: 'sharp', exit: 'sudden', n_elbow_90: 6, n_elbow_90_long: 2,
          n_elbow_square: 1, n_tee_branch: 2
        }
      },
      pipe_pump_duty: {
        unit: 'pipe_flow',
        params: {
          fluid: 'Water', pump_enabled: true, drive_mode: 'operating_point',
          diameter_mm: 50, length_m: 120, elevation_m: 18, material: 'commercial_steel',
          temp_c: 25, p_inlet_kpa: 180, p_delivery_kpa: 320, heat_transfer_mode: 'adiabatic',
          valve_type: 'gate_valve', valve_opening_pct: 100, entrance: 'sharp', exit: 'sudden',
          n_elbow_90: 8, n_elbow_45: 2, n_tee_branch: 1, pump_position_pct: 12,
          h_shutoff_m: 55, q_max_m3h: 30, q_bep_m3h: 16, eta_bep: 0.72, npshr_m: 2.5
        }
      },
      pipe_npsh: {
        unit: 'pipe_flow',
        params: {
          fluid: 'Water', pump_enabled: true, drive_mode: 'imposed', velocity: 1.2,
          diameter_mm: 50, length_m: 80, elevation_m: 12, pump_position_pct: 50,
          temp_c: 70, p_inlet_kpa: 120, heat_transfer_mode: 'adiabatic',
          entrance: 'sharp', n_elbow_90: 4, npshr_m: 4, q_bep_m3h: 8, q_max_m3h: 25,
          h_shutoff_m: 40, valve_opening_pct: 100
        }
      },
      pipe_dead_head: {
        unit: 'pipe_flow',
        params: {
          fluid: 'Water', pump_enabled: true, drive_mode: 'operating_point',
          diameter_mm: 50, length_m: 40, elevation_m: 25, temp_c: 25,
          p_inlet_kpa: 400, p_delivery_kpa: 550, h_shutoff_m: 12, q_max_m3h: 20,
          heat_transfer_mode: 'adiabatic'
        }
      }
    };

    presetSelect.addEventListener('change', (e) => {
      const preset = presets[(e.target as HTMLSelectElement).value];
      if (preset) this.ensureUnit(preset.unit, preset.params);
      presetSelect.value = '';
    });
  }

  private ensureUnit(unitId: string, params: Record<string, any>): void {
    if (this.currentUnit.id !== unitId) {
      const tabs = document.querySelectorAll('.unit-tab');
      tabs.forEach((t) => {
        if ((t as HTMLElement).dataset.unit === unitId) t.classList.add('active');
        else t.classList.remove('active');
      });
      this.switchUnit(unitId, params);
    } else {
      this.controlsPanel.render(this.currentUnit.getParameters(), params);
      this.currentParams = params;
      this.runSimulation();
    }
  }

  public switchUnit(unitId: string, customParams?: Record<string, any>): void {
    const unit = UnitRegistry.getUnit(unitId);
    if (!unit) return;
    this.currentUnit = unit;

    // Reset default active property
    this.activeProperty = 'pressure';
    this.propertyBar.setProperty(this.activeProperty);
    this.propertyBar.render(this.currentUnit.getAvailableProperties());

    // Update canvas renderer
    if (!this.pipeRenderer) {
      this.pipeRenderer = new PipeRenderer('simulation-canvas');
    }

    // Render Controls
    const paramDefs = this.currentUnit.getParameters();
    this.controlsPanel.render(paramDefs, customParams);
    this.currentParams = this.controlsPanel.getParams();

    // Run first calculation
    this.runSimulation();
  }

  private onPropertySelected(propKey: PropertyKey): void {
    this.activeProperty = propKey;
    if (this.latestResult) {
      // Update canvas without recalculating physics
      if (this.pipeRenderer) {
        this.pipeRenderer.update(this.latestResult, this.activeProperty);
      }
      // Update 1D spatial chart
      this.spatialChart.render(this.latestResult, this.activeProperty);
    }
  }

  private runSimulation(): void {
    // 1. Calculate physics in sub-millisecond time
    const result = this.currentUnit.calculate(this.currentParams);
    this.latestResult = result;

    // 2. Update Metrics HUD & Uniform Fluid Properties Bar
    this.metricsHUD.render(result.metrics);
    this.fluidStateBar.render(result);
    this.warningsPanel.render(result.warnings);

    // 3. Update Overlay Badges
    const titleOverlay = document.getElementById('overlay-unit-title');
    if (titleOverlay) titleOverlay.textContent = this.currentUnit.name;

    const regimeOverlay = document.getElementById('overlay-regime');
    if (regimeOverlay) {
      regimeOverlay.textContent = result.extraData?.noFlow
        ? 'no flow'
        : result.extraData?.regime
          ? String(result.extraData.regime)
          : 'steady';
    }

    // 4. Update Canvas
    if (this.pipeRenderer) {
      this.pipeRenderer.update(result, this.activeProperty);
    }

    // 5. Update Synchronized Charts
    this.spatialChart.render(result, this.activeProperty);
    this.diagramChart.render(result.diagram);

    const pumpDiagram = result.extraData?.pumpDiagram as DiagramData | undefined;
    const pumpWrap = document.getElementById('pump-chart-wrapper');
    if (pumpWrap) {
      if (pumpDiagram) {
        pumpWrap.hidden = false;
        this.pumpChart.render(pumpDiagram);
      } else {
        pumpWrap.hidden = true;
      }
    }
  }
}

// Initialize Application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  new VisualchemeApp();
});
