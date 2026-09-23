import {
  UnitOperation,
  ParameterDefinition,
  UnitSimulationResult,
  MetricCard,
  DiagramData,
  SimulationWarning
} from '../../types/unit';
import { PROPERTY_REGISTRY, PropertyMetadata } from '../../types/properties';
import { PropertyService, LiquidState } from '../../database/property_service';
import {
  FrictionSolver,
  FrictionCorrelation,
  FrictionResult,
  ValveType,
  RE_LAMINAR_MAX,
  RE_TURBULENT_MIN
} from '../../thermo/friction';
import { MoodyDataGenerator } from './moody_data';

const G = 9.80665;
const N_NODES = 201;
const VALVE_POSITION = 0.6;
const PUMP_EFFICIENCY = 0.75;
/** Overall heat-transfer coefficient to ambient, referenced to the inner wall area (W/m2.K). */
const U_BY_MODE: Record<string, number> = { uninsulated: 15.0, insulated: 0.5, adiabatic: 0.0 };

const CORRELATION_LABEL: Record<FrictionCorrelation, string> = {
  colebrook: 'Colebrook-White',
  swamee_jain: 'Swamee-Jain',
  churchill: 'Churchill'
};

interface LocalState {
  props: LiquidState;
  v: number;
  Re: number;
  friction: FrictionResult;
  /** Frictional pressure gradient magnitude (Pa/m), >= 0. */
  dPdxFriction: number;
  dPdx: number;
  dTdx: number;
  dHLdx: number;
}

export class PipeUnit implements UnitOperation {
  public id = 'pipe_flow';
  public name = 'Conduit & Pipe Flow';
  public subtitle = 'Hydrodynamics, Darcy Friction, Velocity Boundary Layer & Thermal Balances';
  public category = 'Fluid Transport';
  public description =
    'Models steady incompressible liquid flow through a straight conduit with an in-line valve. Integrates the momentum and energy balances along the pipe with local fluid properties, giving pressure, temperature, head loss and exergy destruction profiles.';

  public getParameters(): ParameterDefinition[] {
    return [
      {
        id: 'fluid',
        label: 'Working Fluid',
        type: 'select',
        category: 'Fluid / Substance',
        defaultVal: 'Water',
        options: [
          { value: 'Water', label: 'Water (H2O)' },
          { value: 'Ethanol', label: 'Ethanol (C2H5OH)' },
          { value: 'Benzene', label: 'Benzene (C6H6)' },
          { value: 'Acetone', label: 'Acetone (C3H6O)' },
          { value: 'Toluene', label: 'Toluene (C7H8)' },
          { value: 'Ethylene glycol', label: 'Ethylene Glycol (C2H6O2)' }
        ],
        description: 'Pure liquid loaded from the DIPPR 801 / ChemSep database'
      },
      {
        id: 'velocity',
        label: 'Inlet Mean Velocity',
        type: 'number',
        category: 'Inlet Conditions',
        unit: 'm/s',
        defaultVal: 1.5,
        min: 0.05,
        max: 8.0,
        step: 0.01,
        description: 'Mean cross-sectional velocity at the inlet; fixes the mass flow rate'
      },
      {
        id: 'diameter_mm',
        label: 'Internal Diameter',
        type: 'number',
        category: 'Geometry',
        unit: 'mm',
        defaultVal: 50,
        min: 10,
        max: 300,
        step: 5,
        description: 'Internal pipe bore diameter D'
      },
      {
        id: 'length_m',
        label: 'Pipe Length',
        type: 'number',
        category: 'Geometry',
        unit: 'm',
        defaultVal: 20,
        min: 2,
        max: 200,
        step: 1,
        description: 'Total length of the conduit'
      },
      {
        id: 'elevation_m',
        label: 'Elevation Rise (Outlet − Inlet)',
        type: 'number',
        category: 'Geometry',
        unit: 'm',
        defaultVal: 0,
        min: -30,
        max: 30,
        step: 1,
        description: 'Positive for uphill flow. Changes pressure (hydrostatic head) but not head loss'
      },
      {
        id: 'material',
        label: 'Pipe Material',
        type: 'select',
        category: 'Geometry',
        defaultVal: 'commercial_steel',
        options: [
          { value: 'drawn_tubing', label: 'Drawn Tubing / Copper / PVC (ε = 0.0015 mm)' },
          { value: 'stainless_steel', label: 'Stainless Steel (ε = 0.015 mm)' },
          { value: 'commercial_steel', label: 'Commercial Steel (ε = 0.046 mm)' },
          { value: 'galvanized_iron', label: 'Galvanized Iron (ε = 0.15 mm)' },
          { value: 'cast_iron', label: 'Cast Iron (ε = 0.26 mm)' },
          { value: 'concrete', label: 'Concrete (ε = 1.2 mm)' }
        ],
        description: 'Surface roughness determines the turbulent friction factor'
      },
      {
        id: 'heat_transfer_mode',
        label: 'Conduit Insulation',
        type: 'select',
        category: 'Geometry',
        defaultVal: 'uninsulated',
        options: [
          { value: 'uninsulated', label: 'Bare Conduit (U = 15 W/m²·K)' },
          { value: 'insulated', label: 'Thermal Insulation (U = 0.5 W/m²·K)' },
          { value: 'adiabatic', label: 'Adiabatic / Perfectly Insulated (U = 0)' }
        ],
        description: 'Ambient heat exchange; U is referenced to the inner wall area'
      },
      {
        id: 'temp_c',
        label: 'Inlet Fluid Temperature',
        type: 'number',
        category: 'Inlet Conditions',
        unit: '°C',
        defaultVal: 25,
        min: 2,
        max: 95,
        step: 1,
        description: 'Inlet fluid temperature (affects density, viscosity, heat capacity and vapor pressure)'
      },
      {
        id: 'ambient_temp_c',
        label: 'Ambient Temperature',
        type: 'number',
        category: 'Inlet Conditions',
        unit: '°C',
        defaultVal: 20,
        min: -10,
        max: 50,
        step: 1,
        description: 'Surrounding air temperature; also the dead-state temperature T₀ for exergy'
      },
      {
        id: 'p_inlet_kpa',
        label: 'Inlet Pressure (absolute)',
        type: 'number',
        category: 'Inlet Conditions',
        unit: 'kPa',
        defaultVal: 350,
        min: 100,
        max: 1000,
        step: 10,
        description: 'Absolute static pressure at the conduit inlet'
      },
      {
        id: 'valve_opening_pct',
        label: 'In-Line Valve Opening',
        type: 'number',
        category: 'Operations & Valves',
        unit: '%',
        defaultVal: 100,
        min: 5,
        max: 100,
        step: 5,
        description: 'Fractional opening of the in-line valve located at 60% of pipe length'
      },
      {
        id: 'valve_type',
        label: 'Valve Type',
        type: 'select',
        category: 'Operations & Valves',
        defaultVal: 'gate_valve',
        options: [
          { value: 'gate_valve', label: 'Gate Valve (K = 0.15 open)' },
          { value: 'globe_valve', label: 'Globe Valve, Plug Disk (K = 9 open)' },
          { value: 'ball_valve', label: 'Ball / Plug Cock (K = 0.05 open)' }
        ],
        description: 'Valve geometry resistance characteristic (Towler Table 20.4)'
      },
      {
        id: 'friction_model',
        label: 'Friction Factor Correlation',
        type: 'select',
        category: 'Model Options',
        defaultVal: 'colebrook',
        options: [
          { value: 'colebrook', label: 'Colebrook-White (implicit, reference)' },
          { value: 'swamee_jain', label: 'Swamee-Jain (explicit)' },
          { value: 'churchill', label: 'Churchill 1977 (all regimes)' }
        ],
        description: 'Turbulent friction correlation; laminar flow always uses f = 64/Re except with Churchill'
      }
    ];
  }

  public getAvailableProperties(): PropertyMetadata[] {
    return [
      PROPERTY_REGISTRY.pressure,
      PROPERTY_REGISTRY.temperature,
      PROPERTY_REGISTRY.head_loss,
      PROPERTY_REGISTRY.exergy_loss,
      PROPERTY_REGISTRY.viscosity,
      PROPERTY_REGISTRY.reynolds
    ];
  }

  public calculate(params: Record<string, any>): UnitSimulationResult {
    const fluidName = String(params.fluid || 'Water');
    const compound = PropertyService.getCompound(fluidName) ?? PropertyService.getCompound('Water')!;
    const vIn = Number(params.velocity ?? 1.5);
    const D = Number(params.diameter_mm ?? 50) / 1000.0;
    const L = Number(params.length_m ?? 20);
    const dzRequested = Number(params.elevation_m ?? 0);
    const dz = Math.max(-L, Math.min(L, dzRequested));
    const material = String(params.material || 'commercial_steel');
    const correlation = String(params.friction_model || 'colebrook') as FrictionCorrelation;
    const T_in_C = Number(params.temp_c ?? 25);
    const T_in = T_in_C + 273.15;
    const T_amb_C = Number(params.ambient_temp_c ?? 20);
    const T_amb = T_amb_C + 273.15;
    const T0 = T_amb;
    const P_in = Number(params.p_inlet_kpa ?? 350) * 1000.0;
    const valvePct = Number(params.valve_opening_pct ?? 100);
    const valveType = String(params.valve_type || 'gate_valve') as ValveType;
    const heatMode = String(params.heat_transfer_mode || 'uninsulated');
    const U = U_BY_MODE[heatMode] ?? U_BY_MODE.uninsulated;

    const area = (Math.PI * D * D) / 4.0;
    const eD = FrictionSolver.getPipeRoughness(material) / D;
    const sinTheta = dz / L;

    const inlet = PropertyService.getLiquidState(compound, T_in);
    const mDot = inlet.rho * vIn * area;
    const Q_in = mDot / inlet.rho;

    // Steady 1D balances for a liquid (h = h(T,P), dh = cp dT + (1 - beta T) dP / rho):
    //   momentum: dP/dx = -f rho v^2 / (2D) - rho g sin(theta)
    //   energy:   cp dT/dx = q'/m + f v^2 / (2D) + (beta T / rho) dP/dx
    // Kinetic-energy changes from thermal expansion are O(1e-4) and neglected.
    const local = (T: number): LocalState => {
      const props = PropertyService.getLiquidState(compound, T);
      const v = mDot / (props.rho * area);
      const Re = (mDot * D) / (area * props.mu);
      const friction = FrictionSolver.calculateFrictionFactor(Re, eD, correlation);
      const dPdxFriction = (friction.f * props.rho * v * v) / (2.0 * D);
      const dPdx = -dPdxFriction - props.rho * G * sinTheta;
      const qIn = -U * Math.PI * D * (T - T_amb);
      const dTdx = (qIn / mDot + dPdxFriction / props.rho + ((props.beta * T) / props.rho) * dPdx) / props.cp;
      return { props, v, Re, friction, dPdxFriction, dPdx, dTdx, dHLdx: dPdxFriction / (props.rho * G) };
    };

    // State vector y = [P (Pa), T (K), cumulative head loss (m), cumulative friction dP (Pa)]
    const deriv = (y: number[]): number[] => {
      const s = local(y[1]);
      return [s.dPdx, s.dTdx, s.dHLdx, s.dPdxFriction];
    };

    const dx = L / (N_NODES - 1);
    const valveIdx = Math.round(VALVE_POSITION * (N_NODES - 1));
    const valveOpen = Math.max(0.05, Math.min(1.0, valvePct / 100.0));
    const K_valve = FrictionSolver.getValveK(valveType, valveOpen);

    const spatialGrid: number[] = [];
    const pArr: number[] = [];
    const tArr: number[] = [];
    const vArr: number[] = [];
    const reArr: number[] = [];
    const fArr: number[] = [];
    const exArr: number[] = [];
    const headArr: number[] = [];
    const rhoArr: number[] = [];
    const muArr: number[] = [];
    const pvapArr: number[] = [];

    const inletState = local(T_in);
    let y = [P_in, T_in, 0, 0];
    let dP_valve = 0;
    let ex_valve = 0;
    let lastState = inletState;

    for (let i = 0; i < N_NODES; i++) {
      const s = i === 0 ? inletState : local(y[1]);
      lastState = s;
      spatialGrid.push(i * dx);
      pArr.push(y[0] / 1000.0);
      tArr.push(y[1] - 273.15);
      vArr.push(s.v);
      reArr.push(s.Re);
      fArr.push(s.friction.f);
      headArr.push(y[2]);
      rhoArr.push(s.props.rho);
      muArr.push(s.props.mu * 1000.0);
      pvapArr.push(s.props.pvap / 1000.0);
      // Exergy destruction T0 * S_gen; for a liquid S_gen' = (Q dP_friction/dx) / T.
      exArr.push((T0 / y[1]) * (mDot / s.props.rho) * s.dPdxFriction);

      if (i === N_NODES - 1) break;

      if (i === valveIdx) {
        // Isenthalpic throttling: dT = (1 - beta T) dP / (rho cp)
        dP_valve = K_valve * 0.5 * s.props.rho * s.v * s.v;
        ex_valve = (T0 / y[1]) * (mDot / s.props.rho) * dP_valve;
        const dT_valve = ((1 - s.props.beta * y[1]) * dP_valve) / (s.props.rho * s.props.cp);
        y = [y[0] - dP_valve, y[1] + dT_valve, y[2] + dP_valve / (s.props.rho * G), y[3]];
      }

      const k1 = deriv(y);
      const k2 = deriv(y.map((yi, j) => yi + 0.5 * dx * k1[j]));
      const k3 = deriv(y.map((yi, j) => yi + 0.5 * dx * k2[j]));
      const k4 = deriv(y.map((yi, j) => yi + dx * k3[j]));
      y = y.map((yi, j) => yi + (dx / 6.0) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    }
    let exContinuous = 0;
    for (let i = 1; i < N_NODES; i++) exContinuous += 0.5 * (exArr[i - 1] + exArr[i]) * dx;
    // Valve dissipation is a point loss; show it spread over the grid cell downstream of the valve.
    exArr[valveIdx + 1] += ex_valve / dx;

    const outlet = lastState;
    const P_out = y[0];
    const T_out = y[1];
    const headLossTotal = y[2];
    const dP_friction = y[3];
    const dP_total = P_in - P_out;
    const dP_static = dP_total - dP_friction - dP_valve;
    const dT_fluid = T_out - T_in;

    const exergyDestroyed = exContinuous + ex_valve;
    const dissipation = mDot * G * headLossTotal;
    const pumpPower = (Q_in * dP_total) / PUMP_EFFICIENCY;

    const Re = inletState.Re;
    const f = inletState.friction.f;
    const regime = inletState.friction.regime;

    const entranceLength = regime === 'laminar' ? 0.05 * Re * D : 4.4 * Math.pow(Re, 1 / 6) * D;

    const warnings = this.checkValidity({
      compoundName: compound.name,
      tf: compound.tf,
      T_in,
      P_in,
      inlet,
      outlet: outlet.props,
      spatialGrid,
      pArr,
      tArr,
      pvapArr,
      valveIdx,
      dP_valve,
      regime,
      Re,
      entranceLength,
      L,
      dzRequested,
      dz
    });
    const invalid = warnings.some((w) => w.level === 'alert');

    // Metrics cards
    let thermalSubtext: string;
    if (U === 0) {
      thermalSubtext = `Adiabatic: ${dT_fluid >= 0 ? '+' : ''}${(dT_fluid * 1000).toFixed(1)} mK from dissipation`;
    } else if (Math.abs(dT_fluid) < 0.002) {
      thermalSubtext = `Near equilibrium with T_amb (${T_amb_C} °C)`;
    } else if (dT_fluid > 0) {
      thermalSubtext = `Net heating (+${dT_fluid.toFixed(3)} °C, ambient ${T_amb_C} °C)`;
    } else {
      thermalSubtext = `Net cooling (${dT_fluid.toFixed(3)} °C, ambient ${T_amb_C} °C)`;
    }

    const kPa = (pa: number) => {
      const s = (pa / 1000.0).toFixed(1);
      return s === '-0.0' ? '0.0' : s;
    };
    const fmtPower = (w: number) => (Math.abs(w) >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${w.toFixed(1)} W`);
    const valveLabel = valveType.replace('_valve', '');

    const metrics: MetricCard[] = [
      {
        id: 'reynolds',
        label: 'Flow Regime',
        value: regime.toUpperCase(),
        subtext: `Re = ${Re.toLocaleString('en-US', { maximumFractionDigits: 0 })}, f = ${f.toFixed(4)} (${CORRELATION_LABEL[correlation]})`,
        status: regime === 'transition' ? 'warning' : 'normal'
      },
      {
        id: 'total_dp',
        label: 'Total Pressure Drop',
        value: `${kPa(dP_total)} kPa`,
        subtext: `Friction ${kPa(dP_friction)} + Valve ${kPa(dP_valve)} + Elevation ${kPa(dP_static)} kPa`,
        status: invalid ? 'alert' : 'normal'
      },
      {
        id: 'valve',
        label: 'Valve Loss',
        value: `K = ${K_valve < 100 ? K_valve.toFixed(2) : K_valve.toFixed(0)}`,
        subtext: `${valvePct}% open ${valveLabel}: ΔP = ${kPa(dP_valve)} kPa`,
        status: 'normal'
      },
      {
        id: 'thermal_trend',
        label: 'Discharge Temperature',
        value: `${(T_out - 273.15).toFixed(2)} °C`,
        subtext: thermalSubtext,
        status: 'normal'
      },
      {
        id: 'head_loss',
        label: 'Head Loss',
        value: `${headLossTotal.toFixed(2)} m`,
        subtext: `Flow: ${(Q_in * 3600).toFixed(2)} m³/h (${mDot.toFixed(3)} kg/s)`,
        status: 'normal'
      },
      {
        id: 'exergy_loss',
        label: 'Exergy Destroyed',
        value: fmtPower(exergyDestroyed),
        subtext:
          dP_total > 0
            ? `Dissipation ${fmtPower(dissipation)}; pump ${fmtPower(pumpPower)} (η = ${PUMP_EFFICIENCY * 100}%)`
            : `Dissipation ${fmtPower(dissipation)}; net pressure gain (downhill)`,
        status: 'normal'
      }
    ];

    // Moody diagram with a highlighted curve for the current roughness and correlation
    const currentCurve = MoodyDataGenerator.getCurveForRoughness(eD, correlation);
    const diagram: DiagramData = {
      title: 'Moody Friction Factor Diagram',
      xLabel: 'Reynolds Number (Re)',
      yLabel: 'Darcy Friction Factor (f)',
      xScale: 'log',
      yScale: 'log',
      curves: [...MoodyDataGenerator.getMoodyCurves(), currentCurve],
      operatingPoint: {
        x: Re,
        y: f,
        label: `Re=${Math.round(Re)}, f=${f.toFixed(4)}`
      },
      xDomain: [500, 1e8],
      yDomain: [0.006, 0.12]
    };

    const radial = this.radialProfile(Re, f);

    return {
      unitId: this.id,
      timestamp: Date.now(),
      spatialGrid,
      properties: {
        pressure: pArr,
        velocity: vArr,
        temperature: tArr,
        reynolds: reArr,
        friction_factor: fArr,
        exergy_loss: exArr,
        head_loss: headArr,
        density: rhoArr,
        viscosity: muArr
      },
      metrics,
      diagram,
      warnings,
      extraData: {
        valveIdx,
        valveXNorm: VALVE_POSITION,
        valvePct,
        valveType,
        K_valve,
        D,
        L,
        v_mean: vIn,
        rho: inlet.rho,
        mu_cP: inlet.mu * 1000.0,
        Re,
        f_darcy: f,
        regime,
        entranceLength,
        powerLawN: radial.n,
        radialProfile: radial.points,
        summary: {
          mDot_kg_s: mDot,
          Q_m3_s: Q_in,
          dP_total_Pa: dP_total,
          dP_friction_Pa: dP_friction,
          dP_valve_Pa: dP_valve,
          dP_elevation_Pa: dP_static,
          headLoss_m: headLossTotal,
          T_out_C: T_out - 273.15,
          exergyDestroyed_W: exergyDestroyed,
          dissipation_W: dissipation
        }
      }
    };
  }

  /**
   * Radial velocity profile u(r)/v_mean.
   * Laminar: Hagen-Poiseuille parabola. Turbulent: power law (1 - r/R)^(1/n) with
   * n ≈ 1/sqrt(f), so that the profile flattens as Re rises. Transition: the two
   * are blended linearly in Re to represent intermittency.
   */
  private radialProfile(Re: number, f: number): { n: number; points: { rNorm: number; uRatio: number }[] } {
    const n = Math.max(4, Math.min(12, 1.0 / Math.sqrt(f)));
    const meanOverMax = (2 * n * n) / ((n + 1) * (2 * n + 1));
    const gamma = Math.max(0, Math.min(1, (Re - RE_LAMINAR_MAX) / (RE_TURBULENT_MIN - RE_LAMINAR_MAX)));
    const points: { rNorm: number; uRatio: number }[] = [];
    const steps = 20;
    for (let j = -steps; j <= steps; j++) {
      const r = j / steps;
      const lam = 2.0 * (1.0 - r * r);
      const turb = Math.pow(Math.max(0, 1.0 - Math.abs(r)), 1.0 / n) / meanOverMax;
      points.push({ rNorm: r, uRatio: (1 - gamma) * lam + gamma * turb });
    }
    return { n, points };
  }

  private checkValidity(c: {
    compoundName: string;
    tf: number;
    T_in: number;
    P_in: number;
    inlet: LiquidState;
    outlet: LiquidState;
    spatialGrid: number[];
    pArr: number[];
    tArr: number[];
    pvapArr: number[];
    valveIdx: number;
    dP_valve: number;
    regime: string;
    Re: number;
    entranceLength: number;
    L: number;
    dzRequested: number;
    dz: number;
  }): SimulationWarning[] {
    const warnings: SimulationWarning[] = [];
    const tfC = c.tf - 273.15;

    if (c.T_in < c.tf) {
      warnings.push({
        level: 'alert',
        message: `Inlet temperature is below the freezing point of ${c.compoundName} (${tfC.toFixed(1)} °C): the fluid would be solid.`
      });
    } else {
      const iFreeze = c.tArr.findIndex((t) => t < tfC);
      if (iFreeze >= 0) {
        warnings.push({
          level: 'alert',
          message: `${c.compoundName} cools below its freezing point (${tfC.toFixed(1)} °C) at x = ${c.spatialGrid[iFreeze].toFixed(1)} m.`
        });
      }
    }

    if (c.P_in <= c.inlet.pvap) {
      warnings.push({
        level: 'alert',
        message: `Inlet pressure (${(c.P_in / 1000).toFixed(0)} kPa) is below the vapor pressure of ${c.compoundName} at ${(c.T_in - 273.15).toFixed(0)} °C (${(c.inlet.pvap / 1000).toFixed(1)} kPa): it would boil, not flow as a liquid.`
      });
    } else {
      const iFlash = c.pArr.findIndex((p, i) => p <= c.pvapArr[i]);
      if (iFlash >= 0) {
        const where = iFlash === c.valveIdx + 1 ? 'right after the valve' : `at x = ${c.spatialGrid[iFlash].toFixed(1)} m`;
        warnings.push({
          level: 'alert',
          message: `Pressure falls to the vapor pressure (${c.pvapArr[iFlash].toFixed(1)} kPa) ${where}: the liquid would flash. The single-phase model is not valid beyond this point; a real line could not sustain this flow rate.`
        });
      } else if (c.dP_valve > 0) {
        // Heuristic: the vena-contracta pressure inside a valve lies below the outlet
        // pressure by roughly the recovered fraction of the valve drop (liquid recovery factor F_L ~ 0.7).
        const margin = (c.pArr[c.valveIdx + 1] - c.pvapArr[c.valveIdx + 1]) * 1000;
        if (margin < c.dP_valve) {
          warnings.push({
            level: 'warning',
            message: `Valve cavitation likely: outlet margin above vapor pressure (${(margin / 1000).toFixed(1)} kPa) is smaller than the valve drop (${(c.dP_valve / 1000).toFixed(1)} kPa), and the vena-contracta pressure is lower still.`
          });
        }
      }
    }

    if (c.regime === 'transition') {
      warnings.push({
        level: 'warning',
        message: `Transitional flow (${RE_LAMINAR_MAX} ≤ Re < ${RE_TURBULENT_MIN}): the flow is intermittent and the friction factor is uncertain. Designs avoid this range.`
      });
    }

    if (c.regime === 'laminar') {
      const frac = c.entranceLength / c.L;
      if (frac > 0.05) {
        warnings.push({
          level: frac > 0.25 ? 'warning' : 'info',
          message: `Laminar entrance length L_e ≈ 0.05·Re·D = ${c.entranceLength.toFixed(2)} m (${Math.min(100, frac * 100).toFixed(0)}% of the pipe). In this developing region the true pressure drop exceeds the fully developed 64/Re prediction used here.`
        });
      }
    }

    if (c.dz !== c.dzRequested) {
      warnings.push({
        level: 'info',
        message: `Elevation rise limited to ±L (${c.dz.toFixed(0)} m): a ${c.L.toFixed(0)} m pipe cannot rise ${c.dzRequested.toFixed(0)} m.`
      });
    }

    const propertyNotes = new Set([...c.inlet.warnings, ...c.outlet.warnings]);
    for (const note of propertyNotes) warnings.push({ level: 'warning', message: note });

    return warnings;
  }
}
