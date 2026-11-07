import {
  UnitOperation,
  ParameterDefinition,
  UnitSimulationResult,
  MetricCard,
  DiagramData,
  DiagramPoint,
  SimulationWarning
} from '../../types/unit';
import { PROPERTY_REGISTRY, PropertyMetadata } from '../../types/properties';
import { PropertyService, LiquidState } from '../../database/property_service';
import {
  FrictionSolver,
  FrictionCorrelation,
  FrictionResult,
  ValveType,
  FlowRegime,
  RE_LAMINAR_MAX,
  RE_TURBULENT_MIN
} from '../../thermo/friction';
import {
  ENTRANCE_OPTIONS,
  EXIT_OPTIONS,
  LINE_FITTINGS,
  fittingCaption,
  layoutFittings
} from '../../thermo/fittings';
import {
  G,
  PumpCurve,
  LossModel,
  DutyPoint,
  pumpHead,
  pumpEfficiency,
  npshRequired,
  npshAvailable,
  lineHead,
  suctionLoss,
  solveOperatingPoint,
  samplePumpChart
} from '../../thermo/pump';
import { MoodyDataGenerator } from './moody_data';

const N_NODES = 201;
const VALVE_POSITION = 0.6;
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

/** Isenthalpic minor loss: ΔP = K ρ v² / 2, added to the irreversible head. */
function irreversibleDrop(y: number[], s: LocalState, K: number): { y: number[]; dP: number } {
  const dP = K * 0.5 * s.props.rho * s.v * s.v;
  const dT = ((1 - s.props.beta * y[1]) * dP) / (s.props.rho * s.props.cp);
  return {
    y: [y[0] - dP, y[1] + dT, y[2] + dP / (s.props.rho * G), y[3]],
    dP
  };
}

/**
 * Reversible acceleration from a still vessel into the pipe: P falls by ρv²/2
 * at constant stagnation enthalpy, so cp ΔT = −β T v²/2. No head is lost.
 */
function vesselAcceleration(y: number[], s: LocalState): { y: number[]; dP: number } {
  const dP = 0.5 * s.props.rho * s.v * s.v;
  const dT = -(s.props.beta * y[1] * dP) / (s.props.rho * s.props.cp);
  return { y: [y[0] - dP, y[1] + dT, y[2], y[3]], dP };
}

/**
 * Pump jump. Shaft work raises enthalpy by gH/η; the pressure rise is ρgH.
 * The gap is dissipation. Temperature: cp ΔT = gH (1/η − 1) + β T gH.
 */
function pumpJump(y: number[], s: LocalState, head: number, eta: number): { y: number[]; dP: number } {
  const dP = s.props.rho * G * head;
  const etaUse = Math.max(0.08, eta);
  const dT = (G * head * (1 / etaUse - 1 + s.props.beta * y[1])) / s.props.cp;
  return { y: [y[0] + dP, y[1] + dT, y[2], y[3]], dP };
}

export class PipeUnit implements UnitOperation {
  public id = 'pipe_flow';
  public name = 'Pipe Flow';
  public subtitle = 'Friction, fittings, hydraulic grade line, and centrifugal pumps';
  public category = 'Fluid Transport';
  public description =
    'Steady liquid flow in a circular pipe with fittings (accidentes), an in-line valve, and an optional centrifugal pump. Marches pressure, temperature, head loss, and the hydraulic grade line, and places the duty point on the pump and system curves.';

  public getParameters(): ParameterDefinition[] {
    const fittingCounts: ParameterDefinition[] = LINE_FITTINGS.map((fit) => ({
      id: fit.param,
      label: `${fit.label} (K = ${fit.K} each)`,
      type: 'number' as const,
      category: 'Fittings (accidentes)' as const,
      defaultVal: 0,
      min: 0,
      max: 12,
      step: 1,
      description: `Number of ${fit.label.toLowerCase()} fittings spaced along the pipe. Each contributes K = ${fit.K}.`
    }));

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
        description: 'Mean inlet velocity when flow is imposed. Ignored in operating-point mode, where the pump and the system set the flow.'
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
        description: 'Total length of the conduit, suction plus discharge'
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
        description: 'Positive for uphill flow. Changes pressure and the system static head, not the frictional head loss.'
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
        description: 'Surrounding air temperature for heat loss through the pipe wall'
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
        description: 'Absolute pressure at the pipe inlet. This is the suction-vessel pressure P1 in the NPSH balance.'
      },
      {
        id: 'entrance',
        label: 'Entrance',
        type: 'select',
        category: 'Fittings (accidentes)',
        defaultVal: 'none',
        options: ENTRANCE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        description: 'Loss where the pipe leaves a vessel. Sharp and re-entrant mouths separate at the lip.'
      },
      {
        id: 'exit',
        label: 'Exit',
        type: 'select',
        category: 'Fittings (accidentes)',
        defaultVal: 'none',
        options: EXIT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        description: 'A sudden exit into a large tank dissipates the entire velocity head, K = 1.'
      },
      ...fittingCounts,
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
        id: 'pump_enabled',
        label: 'Install centrifugal pump',
        type: 'boolean',
        category: 'Centrifugal Pump',
        defaultVal: false,
        description: 'Places a pump on the line. Head, efficiency, power, and NPSH are read from the curve at the flowing rate.'
      },
      {
        id: 'drive_mode',
        label: 'How flow is set',
        type: 'select',
        category: 'Centrifugal Pump',
        defaultVal: 'imposed',
        options: [
          { value: 'imposed', label: 'Imposed velocity (slider)' },
          { value: 'operating_point', label: 'Operating point (pump meets system)' }
        ],
        description: 'Operating point is the flow where the pump curve crosses the system curve for the delivery pressure below.'
      },
      {
        id: 'pump_position_pct',
        label: 'Pump station',
        type: 'number',
        category: 'Centrifugal Pump',
        unit: '% of L',
        defaultVal: 15,
        min: 0,
        max: 80,
        step: 1,
        description: 'Distance from the inlet to the pump. Everything upstream is the suction line in the NPSH balance.'
      },
      {
        id: 'h_shutoff_m',
        label: 'Shutoff head',
        type: 'number',
        category: 'Centrifugal Pump',
        unit: 'm',
        defaultVal: 30,
        min: 5,
        max: 120,
        step: 1,
        description: 'Head at zero flow. The curve falls as H = H_shutoff (1 − (Q/Q_max)²).'
      },
      {
        id: 'q_max_m3h',
        label: 'Runout flow',
        type: 'number',
        category: 'Centrifugal Pump',
        unit: 'm³/h',
        defaultVal: 25,
        min: 5,
        max: 120,
        step: 1,
        description: 'Flow at which the pump head falls to zero.'
      },
      {
        id: 'q_bep_m3h',
        label: 'Best-efficiency flow',
        type: 'number',
        category: 'Centrifugal Pump',
        unit: 'm³/h',
        defaultVal: 14,
        min: 2,
        max: 100,
        step: 1,
        description: 'Capacity at the peak of the efficiency parabola.'
      },
      {
        id: 'eta_bep',
        label: 'Peak efficiency',
        type: 'number',
        category: 'Centrifugal Pump',
        unit: '—',
        defaultVal: 0.75,
        min: 0.4,
        max: 0.88,
        step: 0.01,
        description: 'Efficiency at the best-efficiency flow. It falls to zero at shutoff and at twice that flow.'
      },
      {
        id: 'npshr_m',
        label: 'NPSHr at best efficiency',
        type: 'number',
        category: 'Centrifugal Pump',
        unit: 'm',
        defaultVal: 2.5,
        min: 0.5,
        max: 12,
        step: 0.1,
        description: 'Manufacturer NPSH required at Q_bep. The curve used here scales it with (Q/Q_bep)².'
      },
      {
        id: 'p_delivery_kpa',
        label: 'Delivery pressure (absolute)',
        type: 'number',
        category: 'Centrifugal Pump',
        unit: 'kPa',
        defaultVal: 350,
        min: 50,
        max: 1200,
        step: 10,
        description: 'Pressure the discharge must reach. With elevation, this is the static head of the system curve. Operating-point mode marches the outlet to this pressure.'
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
      PROPERTY_REGISTRY.hydraulic_grade,
      PROPERTY_REGISTRY.energy_grade,
      PROPERTY_REGISTRY.temperature,
      PROPERTY_REGISTRY.head_loss,
      PROPERTY_REGISTRY.viscosity,
      PROPERTY_REGISTRY.reynolds
    ];
  }

  public calculate(params: Record<string, any>): UnitSimulationResult {
    const fluidName = String(params.fluid || 'Water');
    const compound = PropertyService.getCompound(fluidName) ?? PropertyService.getCompound('Water')!;
    const vRequested = Number(params.velocity ?? 1.5);
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
    const P_in = Number(params.p_inlet_kpa ?? 350) * 1000.0;
    const pDelivery = Number(params.p_delivery_kpa ?? 350) * 1000.0;
    const valvePct = Number(params.valve_opening_pct ?? 100);
    const valveType = String(params.valve_type || 'gate_valve') as ValveType;
    const heatMode = String(params.heat_transfer_mode || 'uninsulated');
    const U = U_BY_MODE[heatMode] ?? U_BY_MODE.uninsulated;
    const pumpOn = params.pump_enabled === true || params.pump_enabled === 'true';
    const drive = String(params.drive_mode || 'imposed');

    const area = (Math.PI * D * D) / 4.0;
    const eD = FrictionSolver.getPipeRoughness(material) / D;
    const sinTheta = dz / L;
    const inlet = PropertyService.getLiquidState(compound, T_in);

    const valveOpen = Math.max(0.05, Math.min(1.0, valvePct / 100.0));
    const K_valve = FrictionSolver.getValveK(valveType, valveOpen);
    const valveIdx = Math.round(VALVE_POSITION * (N_NODES - 1));

    const pumpPct = Math.max(0, Math.min(80, Number(params.pump_position_pct ?? 15)));
    const pumpIdx = Math.max(0, Math.min(N_NODES - 2, Math.round((pumpPct / 100) * (N_NODES - 1))));
    const pumpX = pumpIdx / (N_NODES - 1);

    const counts: Record<string, number> = {};
    for (const fit of LINE_FITTINGS) counts[fit.param] = Number(params[fit.param] ?? 0);
    const entranceType = String(params.entrance || 'none');
    const exitType = String(params.exit || 'none');
    const layout = layoutFittings({
      entrance: entranceType,
      exit: exitType,
      counts,
      valveX: VALVE_POSITION,
      pumpX: pumpOn ? pumpX : null
    });
    // With an entrance the line draws from a still vessel; with a sudden exit it
    // discharges into one. Otherwise the end is a flowing pipe carrying v²/2g.
    const fromVessel = layout.entranceK > 0;
    const intoTank = layout.exitK > 0;

    const stationIdx = (station: { glyph: string; xNorm: number }): number =>
      station.glyph === 'inlet' ? 0 : Math.max(1, Math.min(N_NODES - 2, Math.round(station.xNorm * (N_NODES - 1))));
    const kSuction = layout.stations
      .filter((s) => s.glyph !== 'outlet' && stationIdx(s) <= pumpIdx)
      .reduce((sum, s) => sum + s.K, 0);

    const qMax = Math.max(1e-4, Number(params.q_max_m3h ?? 25) / 3600);
    let qBep = Math.max(1e-4, Number(params.q_bep_m3h ?? 14) / 3600);
    qBep = Math.min(qBep, 0.95 * qMax);
    const curve: PumpCurve = {
      hShutoff: Math.max(1, Number(params.h_shutoff_m ?? 30)),
      qMax,
      qBep,
      etaBep: Math.min(0.92, Math.max(0.2, Number(params.eta_bep ?? 0.75))),
      npshrBep: Math.max(0.2, Number(params.npshr_m ?? 2.5))
    };

    const kValveSuction = valveIdx <= pumpIdx ? K_valve : 0;
    const lineModel: LossModel = {
      area,
      diameter: D,
      length: L,
      rho: inlet.rho,
      mu: inlet.mu,
      relativeRoughness: eD,
      correlation,
      kMinor: layout.kTotal + K_valve,
      dz,
      pIn: P_in,
      pDelivery,
      aIn: fromVessel ? 0 : 1,
      aOut: intoTank ? 0 : 1
    };
    const suctionModel: LossModel = {
      ...lineModel,
      length: pumpX * L,
      kMinor: kSuction + kValveSuction,
      dz: 0,
      pDelivery: P_in
    };
    const z1 = -pumpX * dz;
    const duty: DutyPoint = pumpOn ? solveOperatingPoint(curve, lineModel) : { Q: 0, H: 0, status: 'ok' };

    let vIn = vRequested;
    if (pumpOn && drive === 'operating_point') {
      vIn = duty.status === 'dead_head' ? 0 : duty.Q / area;
    }
    vIn = Math.max(0, vIn);
    const noFlow = vIn < 1e-8;
    const Q_actual = vIn * area;
    const H_pump = pumpOn ? pumpHead(curve, Q_actual) : 0;
    const eta = pumpOn ? pumpEfficiency(curve, Q_actual) : 0;
    const npsha = pumpOn ? npshAvailable(P_in, inlet.pvap, inlet.rho, z1, suctionLoss(suctionModel, Q_actual)) : 0;
    const npshr = pumpOn ? npshRequired(curve, Q_actual) : 0;
    const margin = npsha - npshr;
    const hSystemAtQ = pumpOn ? lineHead(lineModel, Q_actual).hSystem : 0;

    const mDot = inlet.rho * vIn * area;
    const Q_in = vIn * area;

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

    const deriv = (yIn: number[]): number[] => {
      const s = local(yIn[1]);
      return [s.dPdx, s.dTdx, s.dHLdx, s.dPdxFriction];
    };

    const dx = L / (N_NODES - 1);
    const lossKAt = new Map<number, number>();
    for (const station of layout.stations) {
      if (station.glyph === 'outlet') continue;
      const idx = stationIdx(station);
      lossKAt.set(idx, (lossKAt.get(idx) ?? 0) + station.K);
    }

    const spatialGrid: number[] = [];
    const pArr: number[] = [];
    const tArr: number[] = [];
    const vArr: number[] = [];
    const reArr: number[] = [];
    const fArr: number[] = [];
    const headArr: number[] = [];
    const rhoArr: number[] = [];
    const muArr: number[] = [];
    const pvapArr: number[] = [];

    let y = [P_in, T_in, 0, 0];
    let dP_valve = 0;
    let dP_fittings = 0;
    let dP_accel = 0;
    let dP_exit = 0;
    let dP_pump = 0;
    let Re = 0;
    let f = 0;
    let regime: FlowRegime = 'laminar';

    if (noFlow) {
      for (let i = 0; i < N_NODES; i++) {
        const z = (i / (N_NODES - 1)) * dz;
        const P = P_in - inlet.rho * G * z;
        spatialGrid.push((i / (N_NODES - 1)) * L);
        pArr.push(P / 1000.0);
        tArr.push(T_in_C);
        vArr.push(0);
        reArr.push(0);
        fArr.push(0);
        headArr.push(0);
        rhoArr.push(inlet.rho);
        muArr.push(inlet.mu * 1000.0);
        pvapArr.push(inlet.pvap / 1000.0);
      }
      y = [P_in - inlet.rho * G * dz, T_in, 0, 0];
    } else {
      const inletState = local(T_in);
      Re = inletState.Re;
      f = inletState.friction.f;
      regime = inletState.friction.regime;

      for (let i = 0; i < N_NODES; i++) {
        const s = i === 0 ? inletState : local(y[1]);
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

        if (i === N_NODES - 1) break;

        if (i === 0 && fromVessel) {
          const accel = vesselAcceleration(y, s);
          dP_accel = accel.dP;
          y = accel.y;
        }

        const kHere = lossKAt.get(i) ?? 0;
        if (kHere > 0) {
          const drop = irreversibleDrop(y, s, kHere);
          dP_fittings += drop.dP;
          y = drop.y;
        }

        if (i === valveIdx) {
          dP_valve = K_valve * 0.5 * s.props.rho * s.v * s.v;
          const dT_valve = ((1 - s.props.beta * y[1]) * dP_valve) / (s.props.rho * s.props.cp);
          y = [y[0] - dP_valve, y[1] + dT_valve, y[2] + dP_valve / (s.props.rho * G), y[3]];
        }

        if (pumpOn && i === pumpIdx) {
          const jump = pumpJump(y, s, H_pump, eta);
          dP_pump += jump.dP;
          y = jump.y;
        }

        const k1 = deriv(y);
        const k2 = deriv(y.map((yi, j) => yi + 0.5 * dx * k1[j]));
        const k3 = deriv(y.map((yi, j) => yi + 0.5 * dx * k2[j]));
        const k4 = deriv(y.map((yi, j) => yi + dx * k3[j]));
        y = y.map((yi, j) => yi + (dx / 6.0) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      }

      if (intoTank) {
        // The jet leaves at the tank pressure and its velocity head is dissipated
        // inside the tank: static pressure is unchanged, head is lost, and the
        // stagnation enthalpy heats the liquid by K v²/(2 cp).
        const sExit = local(y[1]);
        const vHead = (layout.exitK * sExit.v * sExit.v) / 2;
        dP_exit = sExit.props.rho * vHead;
        y = [y[0], y[1] + vHead / sExit.props.cp, y[2] + vHead / G, y[3]];
        const last = N_NODES - 1;
        tArr[last] = y[1] - 273.15;
        headArr[last] = y[2];
      }
    }

    const hglArr: number[] = [];
    const eglArr: number[] = [];
    for (let i = 0; i < N_NODES; i++) {
      const z = (spatialGrid[i] / L) * dz;
      const hgl = z + (pArr[i] * 1000.0) / (rhoArr[i] * G);
      hglArr.push(hgl);
      // The first node is the still suction vessel and the last the still receiving tank, when present.
      const still = (i === 0 && fromVessel) || (i === N_NODES - 1 && intoTank);
      eglArr.push(still ? hgl : hgl + (vArr[i] * vArr[i]) / (2 * G));
    }

    const P_out = y[0];
    const T_out = y[1];
    const headLossTotal = y[2];
    const dP_friction = y[3];
    const dP_total = P_in - P_out;
    const dP_static = dP_total - dP_friction - dP_valve - dP_fittings - dP_accel + dP_pump;
    const dT_fluid = T_out - T_in;
    const outlet = PropertyService.getLiquidState(compound, T_out);
    const dissipation = mDot * G * headLossTotal;
    const hydraulicPower = inlet.rho * G * Q_actual * H_pump;
    const brakePower = eta >= 0.08 ? hydraulicPower / eta : Number.NaN;

    const entranceLength = noFlow ? 0 : regime === 'laminar' ? 0.05 * Re * D : 4.4 * Math.pow(Re, 1 / 6) * D;
    const warnings = this.checkValidity({
      compoundName: compound.name,
      tf: compound.tf,
      T_in,
      P_in,
      inlet,
      outlet,
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
    if (pumpOn) warnings.push(...this.pumpWarnings({
      noFlow,
      drive,
      vIn,
      Q_actual,
      duty,
      curve,
      hStatic: lineHead(lineModel, 0).hStatic,
      eta,
      npsha,
      npshr,
      margin
    }));
    const invalid = warnings.some((w) => w.level === 'alert');

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

    let dpSubtext: string;
    if (dP_fittings < 1 && dP_pump < 1 && dP_accel < 1) {
      dpSubtext = `Friction ${kPa(dP_friction)} + Valve ${kPa(dP_valve)} + Elevation ${kPa(dP_static)} kPa`;
    } else {
      const parts = [`friction ${kPa(dP_friction)}`, `valve ${kPa(dP_valve)}`];
      if (dP_fittings >= 1) parts.push(`fittings ${kPa(dP_fittings)}`);
      if (dP_accel >= 1) parts.push(`velocity head ${kPa(dP_accel)}`);
      if (dP_pump >= 1) parts.push(`pump rise ${kPa(dP_pump)}`);
      parts.push(`elevation ${kPa(dP_static)}`);
      dpSubtext = `${parts.join(', ')} kPa`;
    }

    const metrics: MetricCard[] = [
      {
        id: 'reynolds',
        label: 'Flow Regime',
        value: noFlow ? 'NO FLOW' : regime.toUpperCase(),
        subtext: noFlow
          ? 'Shutoff head is below the static head'
          : `Re = ${Re.toLocaleString('en-US', { maximumFractionDigits: 0 })}, f = ${f.toFixed(4)} (${CORRELATION_LABEL[correlation]})`,
        status: regime === 'transition' ? 'warning' : 'normal'
      },
      {
        id: 'total_dp',
        label: 'Total Pressure Drop',
        value: `${kPa(dP_total)} kPa`,
        subtext: dpSubtext,
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
      }
    ];

    if (layout.kTotal > 0) {
      const le = f > 1e-4 ? (layout.kTotal * D) / f : Number.NaN;
      const caption = fittingCaption(layout.stations);
      metrics.splice(3, 0, {
        id: 'fittings',
        label: 'Fittings (accidentes)',
        value: `ΣK = ${layout.kTotal.toFixed(2)}`,
        subtext: Number.isFinite(le) ? `${caption}; Le ≈ ${le.toFixed(1)} m` : caption,
        status: 'normal'
      });
    }

    if (pumpOn) {
      metrics.push(
        {
          id: 'pump',
          label: 'Pump Head',
          value: noFlow ? '0 m' : `${H_pump.toFixed(2)} m`,
          subtext: noFlow
            ? `Shutoff ${curve.hShutoff.toFixed(1)} m is below the static head ${(lineHead(lineModel, 0).hStatic).toFixed(1)} m`
            : Number.isFinite(brakePower)
              ? `η = ${(eta * 100).toFixed(0)}% at ${(Q_actual * 3600).toFixed(2)} m³/h; brake ${fmtPower(brakePower)}`
              : `η = ${(eta * 100).toFixed(0)}% at ${(Q_actual * 3600).toFixed(2)} m³/h`,
          status: noFlow || duty.status === 'runout' ? 'warning' : 'normal'
        },
        {
          id: 'npsh',
          label: 'NPSHa',
          value: `${npsha.toFixed(2)} m`,
          subtext: `NPSHr ${npshr.toFixed(2)} m, margin ${margin.toFixed(2)} m · aim for ≥ 0.5 m (≥ 1.5 m near boiling)`,
          status: !noFlow && margin < 0 ? 'alert' : !noFlow && margin < 0.5 ? 'warning' : 'normal'
        }
      );
    }

    const currentCurves = MoodyDataGenerator.getCurveForRoughness(eD, correlation);
    const diagram: DiagramData = {
      title: 'Moody chart: friction factor vs Re',
      xLabel: 'Reynolds Number (Re)',
      yLabel: 'Darcy Friction Factor (f)',
      xScale: 'log',
      yScale: 'log',
      curves: [...MoodyDataGenerator.getMoodyCurves(), ...currentCurves],
      operatingPoint: Re > 0 ? { x: Re, y: f, label: `Re=${Math.round(Re)}, f=${f.toFixed(4)}` } : undefined,
      xDomain: [500, 1e8],
      yDomain: [0.006, 0.12]
    };

    const radial = Re > 1 ? this.radialProfile(Re, f) : this.radialProfile(1000, 64 / 1000);
    const iFlash = noFlow ? -1 : pArr.findIndex((p, i) => p <= pvapArr[i]);
    let pumpVis: 'ok' | 'tight' | 'cavitation' | 'dead' = 'ok';
    if (pumpOn) {
      if (noFlow) pumpVis = 'dead';
      else if (margin < 0) pumpVis = 'cavitation';
      else if (margin < 0.5 || eta < 0.08) pumpVis = 'tight';
    }

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
        head_loss: headArr,
        hydraulic_grade: hglArr,
        energy_grade: eglArr,
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
        noFlow,
        entranceLength,
        powerLawN: radial.n,
        radialProfile: radial.points,
        entranceType: fromVessel ? entranceType : 'none',
        exitType: intoTank ? exitType : 'none',
        elevation: dz,
        flashXNorm: iFlash >= 0 ? iFlash / (N_NODES - 1) : null,
        stations: layout.stations.map((s) => ({
          xNorm: s.xNorm,
          kind: s.kind,
          K: s.K,
          label: `${s.label} (K = ${s.K})`,
          short: s.short,
          glyph: s.glyph
        })),
        pumpMark: pumpOn
          ? { xNorm: pumpX, status: pumpVis, label: noFlow ? 'Pump dead-headed' : `Pump H = ${H_pump.toFixed(1)} m` }
          : null,
        pumpDiagram: pumpOn ? this.pumpDiagram(curve, lineModel, suctionModel, z1, inlet.pvap, Q_actual, H_pump, hSystemAtQ, duty, drive) : undefined,
        summary: {
          mDot_kg_s: mDot,
          Q_m3_s: Q_in,
          dP_total_Pa: dP_total,
          dP_friction_Pa: dP_friction,
          dP_valve_Pa: dP_valve,
          dP_fittings_Pa: dP_fittings,
          dP_accel_Pa: dP_accel,
          exitLoss_Pa: dP_exit,
          dP_pump_Pa: dP_pump,
          dP_elevation_Pa: dP_static,
          headLoss_m: headLossTotal,
          T_out_C: T_out - 273.15,
          dissipation_W: dissipation,
          K_fittings: layout.kTotal,
          pumpHead_m: pumpOn ? H_pump : 0,
          pumpEta: eta,
          npsha_m: npsha,
          npshr_m: npshr,
          pumpStatus: pumpOn ? (noFlow ? 'dead_head' : duty.status) : 'off',
          Q_balance_m3_s: pumpOn ? duty.Q : 0
        }
      }
    };
  }

  private pumpWarnings(w: {
    noFlow: boolean;
    drive: string;
    vIn: number;
    Q_actual: number;
    duty: DutyPoint;
    curve: PumpCurve;
    hStatic: number;
    eta: number;
    npsha: number;
    npshr: number;
    margin: number;
  }): SimulationWarning[] {
    const notes: SimulationWarning[] = [];
    const qh = (q: number) => (q * 3600).toFixed(1);

    if (w.noFlow) {
      notes.push({
        level: 'alert',
        message: `Shutoff head is ${w.curve.hShutoff.toFixed(1)} m and the static head is ${w.hStatic.toFixed(1)} m. The pump cannot deliver flow against this elevation and delivery pressure.`
      });
      return notes;
    }

    if (w.duty.status === 'dead_head') {
      notes.push({
        level: 'warning',
        message: `Shutoff head is ${w.curve.hShutoff.toFixed(1)} m and the static head is ${w.hStatic.toFixed(1)} m, so the curves do not meet. The velocity slider is forcing this flow through the line.`
      });
    }

    if (w.duty.status === 'runout') {
      notes.push({
        level: 'warning',
        message: `At the end of the pump curve (${qh(w.curve.qMax)} m³/h) the pump head is still above the system head. A real pump would run out beyond this curve.`
      });
    }

    if (w.margin < 0) {
      notes.push({
        level: 'alert',
        message: `NPSHa is ${w.npsha.toFixed(2)} m and NPSHr is ${w.npshr.toFixed(2)} m. The pressure at the impeller eye falls to the vapor pressure and the pump cavitates.`
      });
    } else if (w.margin < 0.5) {
      notes.push({
        level: 'warning',
        message: `NPSH margin is ${w.margin.toFixed(2)} m. Keep at least 0.5 m for a stable liquid, and 1.5 m when the liquid is near its boiling point.`
      });
    }

    if (w.vIn > 3) {
      notes.push({
        level: 'warning',
        message: `Velocity ${w.vIn.toFixed(2)} m/s is above the liquid discharge band of 1.5–3 m/s and the suction band of 0.5–1.5 m/s (Towler Table 20.1).`
      });
    } else if (w.vIn > 1.5) {
      notes.push({
        level: 'warning',
        message: `Velocity ${w.vIn.toFixed(2)} m/s sits in the discharge band (1.5–3 m/s) and above the suction band (0.5–1.5 m/s). On one pipe diameter the higher suction velocity spends NPSH.`
      });
    } else if (w.vIn < 0.5) {
      notes.push({
        level: 'info',
        message: `Velocity ${w.vIn.toFixed(2)} m/s is below the 0.5–1.5 m/s suction band (Towler Table 20.1).`
      });
    }

    if (w.eta < 0.05) {
      notes.push({
        level: 'warning',
        message: `This flow is past the efficiency curve, which falls to zero near twice the best-efficiency flow (${qh(w.curve.qBep)} m³/h). Brake power is not reported.`
      });
    } else if (w.eta < 0.55 * w.curve.etaBep) {
      notes.push({
        level: 'info',
        message: `Efficiency is ${(w.eta * 100).toFixed(0)}%, below the peak of ${(w.curve.etaBep * 100).toFixed(0)}% at ${qh(w.curve.qBep)} m³/h.`
      });
    }

    if (w.drive === 'operating_point') {
      notes.push({
        level: 'info',
        message: `Flow is the pump–system intersection (${qh(w.Q_actual)} m³/h). The inlet-velocity slider is not used in this drive mode.`
      });
    } else if (w.duty.status === 'ok' && w.duty.Q > 0 && Math.abs(w.Q_actual - w.duty.Q) / w.duty.Q > 0.15) {
      notes.push({
        level: 'info',
        message: `Imposed flow is ${qh(w.Q_actual)} m³/h. This pump and system balance at ${qh(w.duty.Q)} m³/h, so the outlet will not land on the delivery pressure set in the pump panel.`
      });
    }

    return notes;
  }

  private pumpDiagram(
    curve: PumpCurve,
    line: LossModel,
    suction: LossModel,
    z1: number,
    pVapor: number,
    Q: number,
    head: number,
    systemAtQ: number,
    duty: DutyPoint,
    drive: string
  ): DiagramData {
    const samples = samplePumpChart(curve, line, suction, z1, pVapor, 40);
    let yLo = 0;
    let yHi = 1;
    for (const s of samples) {
      for (const y of [s.head, s.system, s.npsha, s.npshr]) {
        if (y < yLo) yLo = y;
        if (y > yHi) yHi = y;
      }
    }
    const pad = 0.08 * (yHi - yLo || 1);
    if (yLo < 0) yLo -= pad;
    yHi += pad;

    const qh = Q * 3600;
    const onIntersection = Math.abs(head - systemAtQ) < 0.25;
    const markers: DiagramPoint[] = [];
    if (!onIntersection) {
      markers.push({ x: qh, y: systemAtQ, label: `System ${systemAtQ.toFixed(1)} m`, color: '#e0b070' });
    }
    if (drive !== 'operating_point' && duty.status === 'ok' && duty.Q > 0) {
      const gap = Math.abs(Q - duty.Q) / duty.Q;
      if (gap > 0.03) {
        markers.push({
          x: duty.Q * 3600,
          y: duty.H,
          label: `Balance ${(duty.Q * 3600).toFixed(1)} m³/h`,
          color: '#c9bdd0'
        });
      }
    }

    return {
      title: 'Pump and system head versus capacity',
      xLabel: 'Capacity Q (m³/h)',
      yLabel: 'Head (m)',
      xScale: 'linear',
      yScale: 'linear',
      showLegend: true,
      xDomain: [0, curve.qMax * 3600],
      yDomain: [yLo, yHi],
      curves: [
        { id: 'pump', label: 'Pump head', color: '#e4d7a1', width: 1.7, points: samples.map((s) => ({ x: s.qM3h, y: s.head })) },
        { id: 'system', label: 'System', color: '#e0b070', width: 1.7, points: samples.map((s) => ({ x: s.qM3h, y: s.system })) },
        { id: 'npsha', label: 'NPSHa', color: '#c5d5b8', width: 1.15, dashed: true, points: samples.map((s) => ({ x: s.qM3h, y: s.npsha })) },
        { id: 'npshr', label: 'NPSHr', color: '#e09a90', width: 1.15, dashed: true, points: samples.map((s) => ({ x: s.qM3h, y: s.npshr })) }
      ],
      operatingPoint: {
        x: qh,
        y: head,
        label: onIntersection ? `Q ${qh.toFixed(1)} m³/h · H ${head.toFixed(1)} m` : `Pump H ${head.toFixed(1)} m`
      },
      markers
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
