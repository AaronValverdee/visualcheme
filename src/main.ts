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
      regimeOverlay.textContent = result.extraData?.regime
        ? String(result.extraData.regime).toUpperCase()
        : 'STEADY STATE';
    }

    // 4. Update Canvas
    if (this.pipeRenderer) {
      this.pipeRenderer.update(result, this.activeProperty);
    }

    // 5. Update Synchronized Charts
    this.spatialChart.render(result, this.activeProperty);
    this.diagramChart.render(result.diagram);
  }
}

// Initialize Application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  new VisualchemeApp();
});
