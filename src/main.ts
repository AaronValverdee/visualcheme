import 'katex/dist/katex.min.css';
import './index.css';
import { UnitRegistry } from './core/units/registry';
import { UnitOperation, UnitSimulationResult, DiagramData } from './core/types/unit';
import { PropertyKey } from './core/types/properties';
import { PropertyBar } from './ui/components/property_bar';
import { MetricsHUD } from './ui/components/metrics_hud';
import { FluidStateBar } from './ui/components/fluid_state_bar';
import { WarningsPanel } from './ui/components/warnings_panel';
import { ControlsPanel } from './ui/components/controls_panel';
import { TheoryPopover } from './ui/components/theory_popover';
import { PipeRenderer } from './ui/renderers/pipe_renderer';
import { SpatialChart } from './ui/charts/spatial_chart';
import { DiagramChart } from './ui/charts/diagram_chart';
import { AppRoute, AppRouter } from './ui/router';
import { TheoryView } from './ui/views/theory_view';

const PRESETS: Record<string, { unit: string; params: Record<string, any> }> = {
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

class VisualchemeApp {
  private currentUnit: UnitOperation;
  private currentParams: Record<string, any> = {};
  private activeProperty: PropertyKey = 'pressure';
  private latestResult: UnitSimulationResult | null = null;
  private activeView: 'simulator' | 'theory' = 'simulator';

  private propertyBar: PropertyBar;
  private metricsHUD: MetricsHUD;
  private fluidStateBar: FluidStateBar;
  private warningsPanel: WarningsPanel;
  private controlsPanel: ControlsPanel;
  private pipeRenderer: PipeRenderer | null = null;
  private spatialChart: SpatialChart;
  private diagramChart: DiagramChart;
  private pumpChart: DiagramChart;

  private router: AppRouter;
  private theoryView: TheoryView;
  private theoryPopover: TheoryPopover;

  constructor() {
    // 1. Initial unit: Pipe Flow
    const pipe = UnitRegistry.getUnit('pipe_flow');
    if (!pipe) throw new Error('Default unit pipe_flow not found in registry');
    this.currentUnit = pipe;

    // 2. Instantiate Simulator Components
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
    this.diagramChart = new DiagramChart('diagram-chart-wrapper', {
      conceptId: 'chart:moody-diagram',
      label: 'Moody §'
    });
    this.pumpChart = new DiagramChart('pump-chart-wrapper', {
      conceptId: 'chart:pump-system-npsh',
      label: 'Pump §'
    });

    // 3. Instantiate Routing, Theory Reader & Wikipedia-Style Hover Popover
    this.router = new AppRouter((route) => this.handleRoute(route));

    this.theoryView = new TheoryView('theory-view', {
      onReturnToSimulator: () => this.router.navigateToSimulator(this.currentUnit.id),
      onNavigateTheory: (slug, anchor) => this.router.navigateToTheory(slug, anchor),
      onLoadPreset: (presetId) => this.loadPresetAndShowSimulator(presetId),
      getActiveUnitName: () => this.currentUnit.name
    });

    this.theoryPopover = new TheoryPopover({
      onNavigateTheory: (slug, anchor) => this.router.navigateToTheory(slug, anchor),
      onLoadPreset: (presetId) => this.loadPresetAndShowSimulator(presetId)
    });

    // 4. Setup Navigation & Presets
    this.setupNavigation();
    this.setupPresets();

    // 5. Mount Active Unit (keeps simulator hydrated even if landing directly on #/theory/...)
    this.switchUnit(this.currentUnit.id);

    // 6. Synchronize Initial URL Route
    this.router.start();
  }

  private setupNavigation(): void {
    const unitTabs = document.querySelectorAll<HTMLElement>('.unit-tab[data-unit]');
    unitTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const unitId = tab.dataset.unit;
        if (!unitId) return;
        this.router.navigateToSimulator(unitId);
      });
    });

    const theoryTab = document.getElementById('tab-theory');
    theoryTab?.addEventListener('click', () => {
      this.router.navigateToTheory('README');
    });

    const btnReturnSim = document.getElementById('btn-return-simulator');
    btnReturnSim?.addEventListener('click', () => {
      this.router.navigateToSimulator(this.currentUnit.id);
    });

    const btnReset = document.getElementById('btn-reset');
    btnReset?.addEventListener('click', () => {
      this.switchUnit(this.currentUnit.id);
    });
  }

  private setupPresets(): void {
    const presetSelect = document.getElementById('preset-select') as HTMLSelectElement | null;
    if (!presetSelect) return;

    presetSelect.addEventListener('change', (e) => {
      const presetId = (e.target as HTMLSelectElement).value;
      if (presetId && PRESETS[presetId]) {
        const preset = PRESETS[presetId];
        this.ensureUnit(preset.unit, preset.params);
      }
      presetSelect.value = '';
    });
  }

  private loadPresetAndShowSimulator(presetId: string): void {
    const preset = PRESETS[presetId];
    if (!preset) return;
    this.router.navigateToSimulator(preset.unit);
    this.ensureUnit(preset.unit, preset.params);
  }

  private handleRoute(route: AppRoute): void {
    this.theoryPopover.hide();

    const simView = document.getElementById('simulator-view');
    const theoryViewEl = document.getElementById('theory-view');
    const simActions = document.getElementById('simulator-header-actions');
    const theoryActions = document.getElementById('theory-header-actions');

    if (route.kind === 'theory') {
      this.activeView = 'theory';
      if (simView) simView.hidden = true;
      if (theoryViewEl) theoryViewEl.hidden = false;
      if (simActions) simActions.hidden = true;
      if (theoryActions) theoryActions.hidden = false;

      this.pipeRenderer?.setPaused(true);
      this.updateNavTabs('theory');
      this.theoryView.show(route.slug, route.anchor);
      return;
    }

    // Simulator view
    const wasTheory = this.activeView === 'theory';
    this.activeView = 'simulator';
    if (simView) simView.hidden = false;
    if (theoryViewEl) theoryViewEl.hidden = true;
    if (simActions) simActions.hidden = false;
    if (theoryActions) theoryActions.hidden = true;

    if (route.unitId && route.unitId !== this.currentUnit.id && UnitRegistry.getUnit(route.unitId)) {
      this.switchUnit(route.unitId);
    }

    this.updateNavTabs(this.currentUnit.id);
    this.pipeRenderer?.setPaused(false);

    if (wasTheory && this.latestResult) {
      // Re-measure charts & canvas after unhiding the simulator container
      requestAnimationFrame(() => {
        this.pipeRenderer?.resize();
        if (this.latestResult) {
          this.renderCharts(this.latestResult);
        }
      });
    }
  }

  private updateNavTabs(activeKey: string): void {
    const tabs = document.querySelectorAll<HTMLElement>('.unit-tab');
    tabs.forEach((t) => {
      const isActive = t.dataset.view === activeKey || t.dataset.unit === activeKey;
      t.classList.toggle('active', isActive);
    });
  }

  private ensureUnit(unitId: string, params: Record<string, any>): void {
    if (this.currentUnit.id !== unitId) {
      this.switchUnit(unitId, params);
      this.updateNavTabs(unitId);
    } else {
      this.controlsPanel.render(this.currentUnit.getParameters(), params);
      this.currentParams = this.controlsPanel.getParams();
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
      if (this.pipeRenderer) {
        this.pipeRenderer.update(this.latestResult, this.activeProperty);
      }
      this.spatialChart.render(this.latestResult, this.activeProperty);
    }
  }

  private renderCharts(result: UnitSimulationResult): void {
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
    this.renderCharts(result);
  }
}

// Initialize Application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  new VisualchemeApp();
});
