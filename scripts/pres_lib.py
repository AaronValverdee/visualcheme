"""Physics, numbers, and figures for the Visualcheme engine briefing.

The march below follows pipe_unit.ts: the same state vector, the same
jumps, and the same RK4 step. Figures are computed from that march and
from the DIPPR / ChemSep coefficients in compounds.json, not drawn by hand.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyBboxPatch, Rectangle, FancyArrowPatch, Circle
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / "docs" / "presentations" / "figures"
COMPOUNDS = json.loads((ROOT / "src" / "core" / "database" / "compounds.json").read_text(encoding="utf-8"))

G = 9.80665
N_NODES = 201
RE_LAM = 2300.0
RE_TURB = 4000.0
PAPER = "#FBF9F4"
INK = "#1C2420"
MUTED = "#5E675F"
COPPER = "#8C4A2F"
GREEN = "#1E4A38"
GREEN_DARK = "#17352A"
CREAM = "#F4EFE6"
GOLD = "#A6843D"
RULE = "#E4DCCF"
ALERT = "#8E3B32"
BLUE = "#3D5A73"
SAND = "#C4A15A"

CMAP_P = LinearSegmentedColormap.from_list("vc_p", ["#8C4A2F", "#E7D7A8", "#1E4A38"])

plt.rcParams.update(
    {
        "font.family": "Calibri",
        "mathtext.fontset": "cm",
        "text.color": INK,
        "axes.labelcolor": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
    }
)


def png_inches(path: Path) -> tuple[float, float]:
    with Image.open(path) as im:
        dpi = im.info.get("dpi", (200, 200))[0] or 200
        return im.width / dpi, im.height / dpi


# ---------------------------------------------------------------- correlations


COEFF_COUNT = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 10: 3, 16: 5, 100: 5, 101: 5, 102: 4, 105: 4, 106: 5}


def evaluate(model: dict | None, T: float, Tc: float | None = None) -> float:
    if not model or "coeffs" not in model:
        return float("nan")
    n = COEFF_COUNT.get(model["eq"])
    c = model["coeffs"]
    if n is None or len(c) < n:
        return float("nan")
    A, B, C, D, E = (list(c[:5]) + [0, 0, 0, 0, 0])[:5]
    eq = model["eq"]
    if eq in (1, 2, 3, 4, 5, 100):
        return A + B * T + C * T**2 + D * T**3 + E * T**4
    if eq == 10:
        return math.exp(A - B / (C + T))
    if eq == 16:
        return A + math.exp(B / T + C + D * T + E * T**2)
    if eq == 101:
        return math.exp(A + B / T + C * math.log(T) + D * T**E)
    if eq == 102:
        return (A * T**B) / (1 + C / T + D / T**2)
    if eq == 105:
        tau = 1 - T / C
        return A / B ** (1 + tau**D) if tau > 0 else float("nan")
    if eq == 106:
        if not Tc:
            return float("nan")
        Tr = T / Tc
        if Tr >= 1:
            return float("nan")
        return A * (1 - Tr) ** (B + C * Tr + D * Tr**2 + E * Tr**3)
    return float("nan")


def density(compound: dict, T: float) -> float:
    rho_m = evaluate(compound.get("rho_l_model"), T, compound.get("tc"))
    if math.isfinite(rho_m) and rho_m > 0:
        return rho_m * compound["mw"]
    return 850.0


def liquid_state(name: str, T: float) -> dict:
    c = COMPOUNDS[name]
    rho = density(c, T)
    mu = evaluate(c.get("mu_l_model"), T, c.get("tc"))
    if not (math.isfinite(mu) and mu > 0):
        mu = 0.001
    cp_j = evaluate(c.get("cp_l_model"), T, c.get("tc"))
    cp = cp_j / c["mw"] if math.isfinite(cp_j) and cp_j > 0 else 2100.0
    pv = evaluate(c.get("pv_model"), T, c.get("tc"))
    if not math.isfinite(pv):
        pv = 101325.0
    dT = 0.5
    beta = -(density(c, T + dT) - density(c, T - dT)) / (2 * dT * rho)
    return {"rho": rho, "mu": mu, "cp": cp, "pvap": pv, "beta": beta, "T": T}


def wrong_polynomial(compound: dict, T: float) -> float:
    """The historical misreading of ChemSep eq 16 as a power series."""
    c = compound["cp_l_model"]["coeffs"]
    A, B, C, D, E = c[:5]
    return A + B * T + C * T**2 + D * T**3 + E * T**4


# ---------------------------------------------------------------- friction and pump


def swamee_jain(Re: float, eD: float) -> float:
    return 0.25 / math.log10(eD / 3.7 + 5.74 / Re**0.9) ** 2


def solve_colebrook(Re: float, eD: float) -> tuple[float, int]:
    a = eD / 3.7
    b = 2.51 / Re
    x = 1.0 / math.sqrt(swamee_jain(Re, eD))
    iters = 0
    for i in range(20):
        iters = i + 1
        inner = a + b * x
        g = x + 2.0 * math.log10(inner)
        dg = 1.0 + (2.0 * b) / (math.log(10) * inner)
        step = g / dg
        x -= step
        if abs(step) < 1e-12 * x:
            break
    return 1.0 / (x * x), iters


def churchill(Re: float, eD: float) -> float:
    A = (2.457 * math.log(1.0 / ((7.0 / Re) ** 0.9 + 0.27 * eD))) ** 16
    B = (37530.0 / Re) ** 16
    return 8.0 * ((8.0 / Re) ** 12 + 1.0 / (A + B) ** 1.5) ** (1.0 / 12.0)


def friction_factor(Re: float, eD: float, correlation: str = "colebrook") -> tuple[float, str]:
    eD = max(0.0, eD)
    if Re <= 0:
        return float("nan"), "laminar"
    if correlation == "churchill":
        regime = "laminar" if Re < RE_LAM else "transition" if Re < RE_TURB else "turbulent"
        return churchill(Re, eD), regime
    if Re < RE_LAM:
        return 64.0 / Re, "laminar"
    turbulent = swamee_jain if correlation == "swamee_jain" else lambda r, e: solve_colebrook(r, e)[0]
    if Re >= RE_TURB:
        return turbulent(Re, eD), "turbulent"
    f_lam = 64.0 / RE_LAM
    f_turb = turbulent(RE_TURB, eD)
    s = math.log(Re / RE_LAM) / math.log(RE_TURB / RE_LAM)
    f = math.exp(math.log(f_lam) + s * (math.log(f_turb) - math.log(f_lam)))
    return f, "transition"


VALVE_K = {
    "gate_valve": [(0.25, 16.0), (0.5, 4.0), (0.75, 1.0), (1.0, 0.15)],
    "globe_valve": [(0.25, 112.0), (0.5, 36.0), (1.0, 9.0)],
    "ball_valve": [
        (0.278, 486.0),
        (0.333, 206.0),
        (0.444, 52.6),
        (0.556, 17.3),
        (0.667, 5.47),
        (0.778, 1.56),
        (0.889, 0.29),
        (1.0, 0.05),
    ],
}


def valve_k(kind: str, opening: float) -> float:
    data = VALVE_K[kind]
    h = min(1.0, max(1e-3, opening))
    i = next((k for k, (hi, _) in enumerate(data) if hi >= h), 1)
    if i <= 0:
        i = 1
    h0, k0 = data[i - 1]
    h1, k1 = data[i]
    slope = math.log(k1 / k0) / math.log(h1 / h0)
    return k0 * (h / h0) ** slope


def pump_head(H0: float, Qmax: float, Q: float) -> float:
    if Qmax <= 0:
        return 0.0
    if Q <= 0:
        return H0
    r = Q / Qmax
    if r >= 1:
        return 0.0
    return H0 * (1 - r * r)


def pump_efficiency(eta_bep: float, Qbep: float, Q: float) -> float:
    if Qbep <= 0 or Q <= 0:
        return 0.0
    q = Q / Qbep
    if q >= 2:
        return 0.0
    return max(0.0, eta_bep * (2 * q - q * q))


def npshr(npshr_bep: float, Qbep: float, Q: float) -> float:
    if Qbep <= 0:
        return npshr_bep
    q = max(0.0, Q / Qbep)
    return npshr_bep * q * q


def line_head(model: dict, Q: float) -> dict:
    h_static = model["dz"] + (model["p_delivery"] - model["p_in"]) / (model["rho"] * G)
    if Q <= 1e-12 or model["area"] <= 0 or model["mu"] <= 0:
        return {"h_static": h_static, "h_system": h_static, "h_friction": 0.0, "h_minor": 0.0, "h_kinetic": 0.0, "v_head": 0.0, "f": 0.0, "Re": 0.0}
    v = Q / model["area"]
    v_head = v * v / (2 * G)
    Re = model["rho"] * v * model["diameter"] / model["mu"]
    f, _ = friction_factor(Re, model["eD"], model["correlation"])
    h_friction = f * (model["length"] / model["diameter"]) * v_head
    h_minor = model["k_minor"] * v_head
    h_kinetic = (model.get("a_out", 0.0) - model.get("a_in", 0.0)) * v_head
    return {
        "h_static": h_static,
        "h_friction": h_friction,
        "h_minor": h_minor,
        "h_kinetic": h_kinetic,
        "v_head": v_head,
        "h_system": h_static + h_friction + h_minor + h_kinetic,
        "f": f,
        "Re": Re,
    }


def suction_loss(model: dict, Q: float) -> float:
    h = line_head(model, Q)
    return h["h_friction"] + h["h_minor"] - model.get("a_in", 0.0) * h["v_head"]


def solve_duty(H0: float, Qmax: float, model: dict) -> dict:
    h_static = line_head(model, 0.0)["h_static"]
    if Qmax <= 0 or h_static >= H0:
        return {"Q": 0.0, "H": max(0.0, H0), "status": "dead_head"}
    def gap(Q: float) -> float:
        return pump_head(H0, Qmax, Q) - line_head(model, Q)["h_system"]
    if gap(Qmax) > 1e-6:
        return {"Q": Qmax, "H": pump_head(H0, Qmax, Qmax), "status": "runout"}
    lo, hi = 0.0, Qmax
    for _ in range(70):
        mid = 0.5 * (lo + hi)
        if gap(mid) > 0:
            lo = mid
        else:
            hi = mid
    Q = 0.5 * (lo + hi)
    return {"Q": Q, "H": pump_head(H0, Qmax, Q), "status": "ok"}


LINE_FITTINGS = [
    ("n_elbow_90", 0.8),
    ("n_elbow_90_long", 0.45),
    ("n_elbow_45", 0.35),
    ("n_elbow_square", 1.5),
    ("n_tee_branch", 1.8),
    ("n_tee_run", 1.2),
]
ENTRANCE_K = {"none": 0.0, "rounded": 0.05, "sharp": 0.5, "reentrant": 0.8}
EXIT_K = {"none": 0.0, "sudden": 1.0}


def layout_fittings(counts: dict, entrance: str, exit_: str, valve_x: float, pump_x: float | None) -> dict:
    """Port of fittings.ts layoutFittings, including the clearance around valve and pump."""
    stations = []
    eK = ENTRANCE_K[entrance]
    xK = EXIT_K[exit_]
    if eK > 0:
        stations.append({"glyph": "inlet", "K": eK, "xNorm": 0.0})
    pieces = []
    for param, K in LINE_FITTINGS:
        n = max(0, min(12, int(round(counts.get(param, 0)))))
        pieces.extend([K] * n)
    blocked = [valve_x]
    if pump_x is not None:
        blocked.append(pump_x)
    zones = sorted((b - 0.04, b + 0.04) for b in blocked)
    free = []
    cursor = 0.04
    for lo, hi in zones:
        if lo > cursor:
            free.append((cursor, min(lo, 0.96)))
        cursor = max(cursor, hi)
    if cursor < 0.96:
        free.append((cursor, 0.96))
    total = sum(max(0.0, hi - lo) for lo, hi in free)
    for i, K in enumerate(pieces):
        s = ((i + 0.5) / len(pieces)) * total if pieces else 0.0
        x = 0.96
        for lo, hi in free:
            length = hi - lo
            if s <= length:
                x = lo + s
                break
            s -= length
        stations.append({"glyph": "elbow", "K": K, "xNorm": x})
    if xK > 0:
        stations.append({"glyph": "outlet", "K": xK, "xNorm": 1.0})
    return {"stations": stations, "k_total": sum(s["K"] for s in stations), "entrance_K": eK, "exit_K": xK}


def radial_profile(Re: float, f: float) -> dict:
    n = max(4.0, min(12.0, 1.0 / math.sqrt(f)))
    mean_over_max = (2 * n * n) / ((n + 1) * (2 * n + 1))
    gamma = max(0.0, min(1.0, (Re - RE_LAM) / (RE_TURB - RE_LAM)))
    rs, us = [], []
    for j in range(-20, 21):
        r = j / 20
        lam = 2.0 * (1.0 - r * r)
        turb = (max(0.0, 1.0 - abs(r)) ** (1.0 / n)) / mean_over_max
        rs.append(r)
        us.append((1 - gamma) * lam + gamma * turb)
    return {"n": n, "gamma": gamma, "r": rs, "u": us, "centerline": us[20]}


# ---------------------------------------------------------------- the march


def march(spec: dict) -> dict:
    """Steady liquid line, matching the order of operations in PipeUnit.calculate."""
    name = spec["fluid"]
    L = spec["L"]
    D = spec["D"]
    dz = max(-L, min(L, spec["dz"]))
    dx = L / (N_NODES - 1)
    sin_theta = dz / L
    area = math.pi * D * D / 4
    T_in = spec["T_c"] + 273.15
    T_amb = spec["T_amb_c"] + 273.15
    P_in = spec["P_kpa"] * 1000
    U = spec["U"]
    eD = spec["eps"] / D
    correlation = spec.get("correlation", "colebrook")
    v_in = spec["v"]
    inlet = liquid_state(name, T_in)
    m_dot = inlet["rho"] * v_in * area
    valve_idx = int(round(0.6 * (N_NODES - 1)))
    pump_idx = spec.get("pump_idx")
    K_valve = spec.get("K_valve", 0.0)
    loss_at = spec.get("loss_at", {})
    from_vessel = spec.get("from_vessel", False)
    into_tank = spec.get("into_tank", False)
    exit_K = spec.get("exit_K", 1.0)
    H_pump = spec.get("H_pump", 0.0)
    eta = spec.get("eta", 0.75)

    def local(T: float) -> dict:
        props = liquid_state(name, T)
        v = m_dot / (props["rho"] * area)
        Re = (m_dot * D) / (area * props["mu"])
        f, regime = friction_factor(Re, eD, correlation)
        dPdx_f = (f * props["rho"] * v * v) / (2.0 * D)
        dPdx = -dPdx_f - props["rho"] * G * sin_theta
        q = -U * math.pi * D * (T - T_amb)
        dTdx = (q / m_dot + dPdx_f / props["rho"] + (props["beta"] * T / props["rho"]) * dPdx) / props["cp"]
        return {
            "props": props,
            "v": v,
            "Re": Re,
            "f": f,
            "regime": regime,
            "dPdx_f": dPdx_f,
            "dPdx": dPdx,
            "dTdx": dTdx,
            "dHLdx": dPdx_f / (props["rho"] * G),
            "q": q,
        }

    def deriv(y):
        s = local(y[1])
        return [s["dPdx"], s["dTdx"], s["dHLdx"], s["dPdx_f"]]

    def rk4(y):
        k1 = deriv(y)
        k2 = deriv([y[j] + 0.5 * dx * k1[j] for j in range(4)])
        k3 = deriv([y[j] + 0.5 * dx * k2[j] for j in range(4)])
        k4 = deriv([y[j] + dx * k3[j] for j in range(4)])
        return [y[j] + (dx / 6.0) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) for j in range(4)], k1

    y = [P_in, T_in, 0.0, 0.0]
    inlet_state = local(T_in)
    first_k1 = None
    cols = {k: [] for k in ("x", "P", "T", "v", "Re", "f", "hL", "rho", "z", "pvap", "HGL", "EGL")}

    for i in range(N_NODES):
        s = inlet_state if i == 0 else local(y[1])
        xi = i * dx
        zi = (xi / L) * dz
        cols["x"].append(xi)
        cols["P"].append(y[0])
        cols["T"].append(y[1])
        cols["v"].append(s["v"])
        cols["Re"].append(s["Re"])
        cols["f"].append(s["f"])
        cols["hL"].append(y[2])
        cols["rho"].append(s["props"]["rho"])
        cols["z"].append(zi)
        cols["pvap"].append(s["props"]["pvap"])
        if i == N_NODES - 1:
            break
        if i == 0 and from_vessel:
            dP = 0.5 * s["props"]["rho"] * s["v"] ** 2
            dT = -(s["props"]["beta"] * y[1] * dP) / (s["props"]["rho"] * s["props"]["cp"])
            y = [y[0] - dP, y[1] + dT, y[2], y[3]]
        K = loss_at.get(i, 0.0)
        if K:
            dP = K * 0.5 * s["props"]["rho"] * s["v"] ** 2
            dT = ((1 - s["props"]["beta"] * y[1]) * dP) / (s["props"]["rho"] * s["props"]["cp"])
            y = [y[0] - dP, y[1] + dT, y[2] + dP / (s["props"]["rho"] * G), y[3]]
        if i == valve_idx and K_valve:
            dP = K_valve * 0.5 * s["props"]["rho"] * s["v"] ** 2
            dT = ((1 - s["props"]["beta"] * y[1]) * dP) / (s["props"]["rho"] * s["props"]["cp"])
            y = [y[0] - dP, y[1] + dT, y[2] + dP / (s["props"]["rho"] * G), y[3]]
        if pump_idx is not None and i == pump_idx:
            dP = s["props"]["rho"] * G * H_pump
            eta_use = max(0.08, eta)
            dT = (G * H_pump * (1 / eta_use - 1 + s["props"]["beta"] * y[1])) / s["props"]["cp"]
            y = [y[0] + dP, y[1] + dT, y[2], y[3]]
        y, k1 = rk4(y)
        if first_k1 is None:
            first_k1 = k1

    if into_tank:
        s = local(y[1])
        v_head = exit_K * s["v"] ** 2 / 2
        y = [y[0], y[1] + v_head / s["props"]["cp"], y[2] + v_head / G, y[3]]
        cols["T"][-1] = y[1]
        cols["hL"][-1] = y[2]

    for i in range(N_NODES):
        hgl = cols["z"][i] + cols["P"][i] / (cols["rho"][i] * G)
        still = (i == 0 and from_vessel) or (i == N_NODES - 1 and into_tank)
        egl = hgl if still else hgl + cols["v"][i] ** 2 / (2 * G)
        cols["HGL"].append(hgl)
        cols["EGL"].append(egl)

    cols["inlet"] = inlet_state
    cols["y_out"] = y
    cols["first_k1"] = first_k1
    cols["dx"] = dx
    cols["valve_idx"] = valve_idx
    cols["valve_x"] = valve_idx * dx
    cols["pump_x"] = None if pump_idx is None else pump_idx * dx
    cols["m_dot"] = m_dot
    cols["area"] = area
    return cols


# ---------------------------------------------------------------- scenarios


def build_notes() -> dict:
    water = liquid_state("Water", 25 + 273.15)
    rho, mu, cp, pv, beta = water["rho"], water["mu"], water["cp"], water["pvap"], water["beta"]
    D, v, L = 0.05, 1.5, 20.0
    area = math.pi * D * D / 4
    Re = rho * v * D / mu
    eD = 4.6e-5 / D
    f, iters = solve_colebrook(Re, eD)
    f_sj = swamee_jain(Re, eD)
    f_ch = churchill(Re, eD)

    default = march(
        {
            "fluid": "Water",
            "L": L,
            "D": D,
            "dz": 0.0,
            "v": v,
            "T_c": 25,
            "T_amb_c": 20,
            "P_kpa": 350,
            "U": 15.0,
            "eps": 4.6e-5,
            "K_valve": valve_k("gate_valve", 1.0),
        }
    )
    s0 = default["inlet"]
    dPdx = s0["dPdx"]
    dTdx = s0["dTdx"]
    P_out = default["y_out"][0]
    T_out = default["y_out"][1]
    hL = default["y_out"][2]
    dP_f = default["y_out"][3]
    # Valve drop reconstructed at the valve station from the stored upstream state.
    iv = default["valve_idx"]
    dP_valve = valve_k("gate_valve", 1.0) * 0.5 * default["rho"][iv] * default["v"][iv] ** 2

    glycol_name = "Ethylene glycol"
    g = liquid_state(glycol_name, 20 + 273.15)
    Re_g = g["rho"] * 0.25 * 0.025 / g["mu"]
    f_g = 64.0 / Re_g

    # Acetone flashing preset.
    K_ac = valve_k("globe_valve", 0.40)
    acetone = march(
        {
            "fluid": "Acetone",
            "L": 20.0,
            "D": 0.05,
            "dz": 0.0,
            "v": 3.0,
            "T_c": 50,
            "T_amb_c": 20,
            "P_kpa": 200,
            "U": 15.0,
            "eps": 4.6e-5,
            "K_valve": K_ac,
        }
    )
    i_flash = next((i for i, (p, pvap) in enumerate(zip(acetone["P"], acetone["pvap"])) if p <= pvap), None)

    # Grade-line case: imposed flow, sharp entrance, sudden exit, globe half open, pump.
    area_g = math.pi * 0.05**2 / 4
    Q_g = 1.5 * area_g
    H0, Qmax = 28.0, 20.0 / 3600
    H_g = pump_head(H0, Qmax, Q_g)
    eta_g = pump_efficiency(0.75, 12.0 / 3600, Q_g)
    grades = march(
        {
            "fluid": "Water",
            "L": 40.0,
            "D": 0.05,
            "dz": 8.0,
            "v": 1.5,
            "T_c": 25,
            "T_amb_c": 20,
            "P_kpa": 250,
            "U": 0.0,
            "eps": 4.6e-5,
            "K_valve": valve_k("globe_valve", 0.5),
            "from_vessel": True,
            "into_tank": True,
            "exit_K": 1.0,
            "loss_at": {0: 0.5},
            "pump_idx": int(round(0.20 * (N_NODES - 1))),
            "H_pump": H_g,
            "eta": eta_g,
        }
    )

    # Duty preset from main.ts (pipe_pump_duty), inlet properties, algebraic system curve.
    inlet_d = liquid_state("Water", 25 + 273.15)
    D_d, L_d, dz_d = 0.05, 120.0, 18.0
    area_d = math.pi * D_d**2 / 4
    pump_idx_d = int(round(0.12 * (N_NODES - 1)))
    pump_x_d = pump_idx_d / (N_NODES - 1)
    layout = layout_fittings(
        {"n_elbow_90": 8, "n_elbow_45": 2, "n_tee_branch": 1},
        "sharp",
        "sudden",
        0.6,
        pump_x_d,
    )
    K_valve_d = valve_k("gate_valve", 1.0)
    model = {
        "area": area_d,
        "diameter": D_d,
        "length": L_d,
        "rho": inlet_d["rho"],
        "mu": inlet_d["mu"],
        "eD": 4.6e-5 / D_d,
        "correlation": "colebrook",
        "k_minor": layout["k_total"] + K_valve_d,
        "dz": dz_d,
        "p_in": 180e3,
        "p_delivery": 320e3,
        "a_in": 0.0,
        "a_out": 0.0,
    }
    duty = solve_duty(55.0, 30.0 / 3600, model)
    Q_bep = min(16.0 / 3600, 0.95 * 30.0 / 3600)
    eta_d = pump_efficiency(0.72, Q_bep, duty["Q"])
    # Suction K: stations at or upstream of the pump index, excluding the outlet.
    def station_idx(st):
        if st["glyph"] == "inlet":
            return 0
        return max(1, min(N_NODES - 2, int(round(st["xNorm"] * (N_NODES - 1)))))

    k_suction = sum(st["K"] for st in layout["stations"] if st["glyph"] != "outlet" and station_idx(st) <= pump_idx_d)
    suction = dict(model)
    suction.update({"length": pump_x_d * L_d, "k_minor": k_suction, "dz": 0.0, "p_delivery": 180e3})
    z1 = -pump_x_d * dz_d
    npsha_d = (180e3 - inlet_d["pvap"]) / (inlet_d["rho"] * G) + z1 - suction_loss(suction, duty["Q"])
    npshr_d = npshr(2.5, Q_bep, duty["Q"])

    # Hot suction preset (pipe_npsh): imposed 1.2 m/s, water at 70 °C, pump mid-line.
    hot = liquid_state("Water", 70 + 273.15)
    D_h, L_h, dz_h, v_h = 0.05, 80.0, 12.0, 1.2
    area_h = math.pi * D_h**2 / 4
    Q_h = v_h * area_h
    pump_idx_h = int(round(0.50 * (N_NODES - 1)))
    pump_x_h = pump_idx_h / (N_NODES - 1)
    layout_h = layout_fittings({"n_elbow_90": 4}, "sharp", "none", 0.6, pump_x_h)
    model_h = {
        "area": area_h,
        "diameter": D_h,
        "length": pump_x_h * L_h,
        "rho": hot["rho"],
        "mu": hot["mu"],
        "eD": 4.6e-5 / D_h,
        "correlation": "colebrook",
        "k_minor": sum(st["K"] for st in layout_h["stations"] if st["glyph"] != "outlet" and station_idx(st) <= pump_idx_h),
        "dz": 0.0,
        "p_in": 120e3,
        "p_delivery": 120e3,
        "a_in": 0.0,
        "a_out": 0.0,
    }
    z1_h = -pump_x_h * dz_h
    Qbep_h = min(8.0 / 3600, 0.95 * 25.0 / 3600)
    npsha_h = (120e3 - hot["pvap"]) / (hot["rho"] * G) + z1_h - suction_loss(model_h, Q_h)
    npshr_h = npshr(4.0, Qbep_h, Q_h)

    # Polynomial misreading of water's eq 16. The zero is found by cooling from 15 °C.
    mw = COMPOUNDS["Water"]["mw"]
    prev_t, prev_v = None, None
    cp_zero_c = None
    for tC in [i * 0.05 for i in range(300, -80, -1)]:
        val = wrong_polynomial(COMPOUNDS["Water"], tC + 273.15) / mw
        if prev_v is not None and prev_v >= 0 and val < 0:
            frac = prev_v / (prev_v - val)
            cp_zero_c = prev_t + frac * (tC - prev_t)
            break
        prev_t, prev_v = tC, val
    cp_wrong_25 = wrong_polynomial(COMPOUNDS["Water"], 25 + 273.15) / mw
    cp_wrong_7 = wrong_polynomial(COMPOUNDS["Water"], 7 + 273.15) / mw
    cp_right_7 = liquid_state("Water", 7 + 273.15)["cp"]

    profile = radial_profile(Re, f)
    f_bridge, _ = friction_factor(3150, eD, "colebrook")
    profile_bridge = radial_profile(3150, f_bridge)
    profile_lam = radial_profile(1000, 64.0 / 1000)

    v_head = v * v / (2 * G)
    q_per_m = s0["q"]
    m_dot = default["m_dot"]

    return {
        "water": water,
        "rho": rho,
        "mu": mu,
        "cp": cp,
        "pv": pv,
        "beta": beta,
        "Re": Re,
        "f": f,
        "f_sj": f_sj,
        "f_ch": f_ch,
        "newton_iters": iters,
        "eD": eD,
        "D": D,
        "v": v,
        "L": L,
        "area": area,
        "m_dot": m_dot,
        "dPdx": dPdx,
        "dTdx": dTdx,
        "dPdx_f": s0["dPdx_f"],
        "q_per_m": q_per_m,
        "P_out": P_out,
        "T_out": T_out,
        "dT": T_out - (25 + 273.15),
        "dP": 350e3 - P_out,
        "hL": hL,
        "dP_friction": dP_f,
        "dP_valve": dP_valve,
        "dx": default["dx"],
        "first_k1": default["first_k1"],
        "default": default,
        "glycol_mu": g["mu"],
        "glycol_rho": g["rho"],
        "Re_g": Re_g,
        "f_g": f_g,
        "K_acetone": K_ac,
        "acetone": acetone,
        "i_flash": i_flash,
        "grades": grades,
        "H_grade": H_g,
        "eta_grade": eta_g,
        "K_globe_half": valve_k("globe_valve", 0.5),
        "v_head": v_head,
        "duty": duty,
        "eta_duty": eta_d,
        "npsha_d": npsha_d,
        "npshr_d": npshr_d,
        "k_total_duty": layout["k_total"],
        "k_suction": k_suction,
        "z1": z1,
        "model_duty": model,
        "H0_duty": 55.0,
        "Qmax_duty": 30.0 / 3600,
        "Qbep_duty": Q_bep,
        "npshr_bep_duty": 2.5,
        "inlet_duty": inlet_d,
        "npsha_h": npsha_h,
        "npshr_h": npshr_h,
        "hot_pv": hot["pvap"],
        "z1_h": z1_h,
        "cp_zero_c": cp_zero_c,
        "cp_wrong_25": cp_wrong_25,
        "cp_wrong_7": cp_wrong_7,
        "cp_right_7": cp_right_7,
        "profile": profile,
        "profile_bridge": profile_bridge,
        "profile_lam": profile_lam,
        "f_bridge": f_bridge,
    }


# ---------------------------------------------------------------- figure helpers


def canvas(w: float, h: float):
    fig = plt.figure(figsize=(w, h), dpi=180)
    fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_facecolor(PAPER)
    return fig, ax


def rbox(ax, x, y, w, h, fc, ec=None, lw=1.0, r=0.08, z=2):
    ax.add_patch(
        FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle=f"round,pad=0,rounding_size={r}",
            facecolor=fc,
            edgecolor=ec if ec is not None else fc,
            linewidth=lw,
            zorder=z,
        )
    )


def arrow(ax, x1, y1, x2, y2, color=INK, lw=1.15, ms=9):
    ax.add_patch(
        FancyArrowPatch(
            (x1, y1),
            (x2, y2),
            arrowstyle="-|>",
            mutation_scale=ms,
            lw=lw,
            color=color,
            zorder=3,
            shrinkA=0,
            shrinkB=0,
        )
    )


def save(fig, name: str) -> Path:
    FIG.mkdir(parents=True, exist_ok=True)
    path = FIG / name
    fig.savefig(path, dpi=180, facecolor=fig.get_facecolor())
    plt.close(fig)
    return path


def style_ax(ax, grid=True):
    ax.set_facecolor(PAPER)
    ax.figure.patch.set_facecolor(PAPER)
    for spine in ax.spines.values():
        spine.set_color(RULE)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(labelsize=8, colors=MUTED, length=3)
    if grid:
        ax.grid(True, color="#E7E0D4", lw=0.6, zorder=0)
    ax.set_axisbelow(True)


def render_eq(tex: str, name: str, fontsize=15, color=INK, face=CREAM) -> Path:
    fig = plt.figure(figsize=(7.2, 0.48), dpi=200)
    fig.patch.set_facecolor(face)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor(face)
    ax.axis("off")
    ax.text(0.012, 0.52, tex, fontsize=fontsize, color=color, va="center", ha="left", transform=ax.transAxes)
    FIG.mkdir(parents=True, exist_ok=True)
    path = FIG / name
    fig.savefig(path, dpi=200, facecolor=face, bbox_inches="tight", pad_inches=0.04)
    plt.close(fig)
    return path


# ---------------------------------------------------------------- figures


def fig_cover(n: dict) -> Path:
    w, h = 4.85, 6.15
    fig, ax = canvas(w, h)
    ax.text(0.15, h - 0.28, "DEFAULT LINE, AS THE PROGRAM MARCHES IT", fontsize=8, color=GOLD, fontweight="bold")
    ax.text(0.15, h - 0.52, "Water  ·  25 °C  ·  1.5 m/s  ·  50 mm  ·  20 m", fontsize=9, color=MUTED)

    P = n["default"]["P"]
    x0, y0, pw, ph = 0.28, 4.55, 4.30, 0.72
    vmin, vmax = min(P), max(P)
    for i, p in enumerate(P):
        t = 0 if vmax == vmin else (p - vmin) / (vmax - vmin)
        ax.add_patch(Rectangle((x0 + pw * i / len(P), y0), pw / len(P) + 0.01, ph, facecolor=CMAP_P(t), lw=0, zorder=2))
    rbox(ax, x0, y0, pw, ph, fc="none", ec=GREEN_DARK, lw=1.1, r=0.06, z=4)
    ax.plot([x0 + 0.18, x0 + pw - 0.18], [y0 + ph / 2, y0 + ph / 2], color="white", lw=0.6, alpha=0.7, zorder=3)
    ax.text(x0, y0 + ph + 0.14, f"{n['default']['P'][0]/1000:.1f} kPa", fontsize=8, color=GREEN)
    ax.text(x0 + pw, y0 + ph + 0.14, f"{n['P_out']/1000:.1f} kPa", fontsize=8, color=COPPER, ha="right")
    ax.annotate(
        "",
        xy=(x0 + pw - 0.05, y0 - 0.16),
        xytext=(x0 + 0.05, y0 - 0.16),
        arrowprops=dict(arrowstyle="<->", color=MUTED, lw=0.8),
    )
    ax.text(x0 + pw / 2, y0 - 0.34, "201 stations   ·   dx = 0.10 m   ·   colored by pressure", fontsize=8, color=MUTED, ha="center")

    cards = [
        (f"{n['Re']:,.0f}", "Reynolds number"),
        (f"{n['f']:.5f}", "Darcy friction factor"),
        (f"{n['dP']/1000:.2f} kPa", "Pressure drop, inlet to outlet"),
        (f"{n['dT']*1000:.1f} mK", "Temperature change"),
    ]
    for i, (val, lab) in enumerate(cards):
        col, row = i % 2, i // 2
        x, y = 0.18 + col * 2.35, 2.35 - row * 1.15
        rbox(ax, x, y, 2.20, 1.00, CREAM, ec=RULE, lw=0.8, r=0.08)
        ax.text(x + 0.14, y + 0.62, val, fontsize=16, color=GREEN_DARK, fontweight="bold", fontfamily="Georgia")
        ax.text(x + 0.14, y + 0.22, lab, fontsize=8, color=MUTED)

    ax.text(0.18, 0.58, "Commercial steel, Colebrook–White, bare pipe, air at 20 °C.", fontsize=8, color=MUTED)
    ax.text(0.18, 0.32, "Fully open gate valve at 60% of the length. Flat. No pump.", fontsize=8, color=MUTED)
    return save(fig, "cover.png")


def fig_architecture() -> Path:
    w, h = 12.25, 3.85
    fig, ax = canvas(w, h)
    ax.text(0.12, h - 0.26, "WHAT EACH PROGRAM OWNS, AND WHAT IT PASSES ON", fontsize=8.5, color=GOLD, fontweight="bold")

    def box(x, y, bw, bh, title, sub, fc=CREAM):
        rbox(ax, x, y, bw, bh, fc, ec=RULE, lw=0.9, r=0.08)
        ax.text(x + bw / 2, y + bh * 0.64, title, ha="center", va="center", fontsize=10, color=INK, fontweight="bold")
        ax.text(x + bw / 2, y + bh * 0.30, sub, ha="center", va="center", fontsize=8, color=INK)

    def link(x1, x2, y, color=COPPER):
        arrow(ax, x1, y, x2, y, color=color, lw=1.1, ms=8)

    y1, bh = 2.15, 1.05
    specs = [
        (0.12, 2.20, "compounds.json", "431 species"),
        (2.50, 2.25, "correlations.ts", "formula by equation number"),
        (4.93, 2.20, "PropertyService", "ρ, μ, cp, Psat, β"),
        (7.31, 2.40, "friction · fittings · pump", "f, K, H(Q), NPSH"),
        (9.89, 2.22, "PipeUnit", "integrates the line"),
    ]
    for x, bw, title, sub in specs:
        box(x, y1, bw, bh, title, sub)
    for i in range(len(specs) - 1):
        x, bw = specs[i][0], specs[i][1]
        link(x + bw + 0.03, specs[i + 1][0] - 0.03, y1 + bh / 2)

    ax.text(0.15, 1.78, "PipeUnit returns one result object. The row below reads that object.", fontsize=8.5, color=MUTED)

    y2 = 0.32
    readers = [
        (0.12, 2.55, "UnitSimulationResult", "profiles, metrics, warnings"),
        (2.90, 2.15, "main.ts", "one calculate per edit"),
        (5.28, 2.30, "Renderer and route", "color, particles, bends"),
        (7.81, 2.15, "Charts", "profile, Moody, pump"),
        (10.19, 1.92, "Warnings panel", "where the model stops"),
    ]
    for x, bw, title, sub in readers:
        box(x, y2, bw, bh, title, sub, fc="#E7F0EA")
    for i in range(len(readers) - 1):
        x, bw = readers[i][0], readers[i][1]
        link(x + bw + 0.03, readers[i + 1][0] - 0.03, y2 + bh / 2, GREEN)
    return save(fig, "architecture.png")


def fig_control_flow() -> Path:
    w, h = 12.25, 2.85
    fig, ax = canvas(w, h)
    lanes = [
        (1.85, "#F4EFE6", "PARAMETER", "A slider, a fluid, a valve opening"),
        (1.00, "#E7F0EA", "PROPERTY", "Which profile is painted"),
        (0.15, "#F8F1E4", "FRAME", "The animation clock"),
    ]
    for y, fc, tag, _ in lanes:
        rbox(ax, 0.12, y, 12.02, 0.75, fc, ec="none", r=0.06)
        ax.text(0.28, y + 0.52, tag, fontsize=7.5, color=COPPER, fontweight="bold")

    def chip(x, y, text, fc="white", wch=1.7):
        rbox(ax, x, y, wch, 0.42, fc, ec=RULE, lw=0.8, r=0.06, z=3)
        ax.text(x + wch / 2, y + 0.21, text, ha="center", va="center", fontsize=8, color=INK)

    y = 2.02
    xs = [1.55, 3.55, 5.85, 8.35, 10.55]
    labels = ["Controls panel", "runSimulation", "calculate(params)", "result stored", "panels redraw"]
    widths = [1.75, 1.7, 2.05, 1.7, 1.55]
    for x, lab, wc in zip(xs, labels, widths):
        chip(x, y, lab, "white", wc)
    for x, wc, x2 in zip(xs, widths, xs[1:]):
        arrow(ax, x + wc + 0.03, y + 0.21, x2 - 0.03, y + 0.21, COPPER, 1.0, 8)

    y = 1.17
    chip(1.55, y, "Property bar", "white", 1.75)
    chip(3.70, y, "onPropertySelected", "white", 2.15)
    chip(6.30, y, "same stored result", "#E7F0EA", 2.15)
    chip(8.85, y, "renderer + profile chart", "white", 2.55)
    arrow(ax, 3.33, y + 0.21, 3.67, y + 0.21, GREEN, 1.0, 8)
    arrow(ax, 5.88, y + 0.21, 6.27, y + 0.21, GREEN, 1.0, 8)
    arrow(ax, 8.48, y + 0.21, 8.82, y + 0.21, GREEN, 1.0, 8)

    y = 0.32
    chip(1.55, y, "requestAnimationFrame", "white", 2.35)
    chip(4.30, y, "u(r) and v(x) from the result", "white", 2.85)
    chip(7.55, y, "tracers, bubbles, impeller", "white", 2.55)
    arrow(ax, 3.93, y + 0.21, 4.27, y + 0.21, GOLD, 1.0, 8)
    arrow(ax, 7.18, y + 0.21, 7.52, y + 0.21, GOLD, 1.0, 8)
    return save(fig, "control_flow.png")


def fig_state(n: dict) -> Path:
    w, h = 12.25, 2.55
    fig, ax = canvas(w, h)
    ax.text(0.15, h - 0.26, "THE VECTOR THAT RK4 CARRIES", fontsize=8, color=GOLD, fontweight="bold")
    rows = [
        (r"$P$", "Pa", "static pressure", GREEN),
        (r"$T$", "K", "bulk temperature", COPPER),
        (r"$h_L$", "m", "irreversible head so far", BLUE),
        (r"$\Delta P_f$", "Pa", "running integral of wall friction", GOLD),
    ]
    for i, (sym, unit, desc, col) in enumerate(rows):
        y = 1.85 - i * 0.42
        rbox(ax, 0.2, y, 5.15, 0.36, CREAM, ec=RULE, lw=0.7, r=0.05)
        ax.add_patch(Rectangle((0.2, y), 0.08, 0.36, facecolor=col, lw=0, zorder=3))
        ax.text(0.55, y + 0.18, sym, fontsize=12, color=col, va="center")
        ax.text(1.70, y + 0.18, unit, fontsize=9, color=MUTED, va="center")
        ax.text(2.40, y + 0.18, desc, fontsize=9, color=INK, va="center")

    # mini pipe of nodes
    x0, y0, pw = 5.7, 1.35, 6.2
    ax.plot([x0, x0 + pw], [y0, y0], color=GREEN, lw=2.0, solid_capstyle="round")
    for i in range(21):
        ax.plot(x0 + pw * i / 20, y0, "o", ms=3.2, color=GREEN_DARK if i % 5 == 0 else SAND, zorder=3)
    ax.annotate("", xy=(x0 + pw * 0.22, y0 - 0.28), xytext=(x0 + pw * 0.17, y0 - 0.28), arrowprops=dict(arrowstyle="<->", color=COPPER, lw=0.8))
    ax.text(x0 + pw * 0.195, y0 - 0.48, "dx = L / 200", fontsize=8, color=COPPER, ha="center")
    ax.text(x0, y0 + 0.28, "x = 0", fontsize=8, color=MUTED)
    ax.text(x0 + pw, y0 + 0.28, "x = L", fontsize=8, color=MUTED, ha="right")
    ax.text(x0, 0.35, "At every stage the code rebuilds the flow from T and the fixed mass flow", fontsize=8.5, color=INK)
    ax.text(x0, 0.08, "v = m / (ρ A)      Re = m D / (A μ)      f = f(Re, ε/D)", fontsize=9, color=GREEN_DARK, fontfamily="Consolas")
    return save(fig, "state.png")


def fig_properties(n: dict) -> Path:
    temps_c = [t * 0.5 for t in range(10, 181)]  # 5 to 90
    series = {k: [] for k in ("rho", "mu", "cp", "pvap")}
    glycol_mu = []
    for tC in temps_c:
        st = liquid_state("Water", tC + 273.15)
        for k in series:
            series[k].append(st[k])
        glycol_mu.append(liquid_state("Ethylene glycol", tC + 273.15)["mu"] * 1000)
    fig, axes = plt.subplots(2, 2, figsize=(6.35, 4.85), dpi=180)
    fig.patch.set_facecolor(PAPER)
    specs = [
        (axes[0, 0], [r / 1 for r in series["rho"]], "Density  ρ", "kg/m³", False),
        (axes[0, 1], [m * 1000 for m in series["mu"]], "Viscosity  μ", "cP", True),
        (axes[1, 0], series["cp"], "Heat capacity  cp", "J/kg·K", False),
        (axes[1, 1], [p / 1000 for p in series["pvap"]], "Vapor pressure  Psat", "kPa", True),
    ]
    for ax, ys, title, ylab, log in specs:
        style_ax(ax)
        ax.plot(temps_c, ys, color=GREEN, lw=1.8)
        ax.axvline(25, color=SAND, lw=0.8, ls="--")
        ax.set_title(title, fontsize=10, color=INK, loc="left", pad=4, fontweight="bold")
        ax.set_xlabel("Temperature (°C)", fontsize=8)
        ax.set_ylabel(ylab, fontsize=8)
        if log:
            ax.set_yscale("log")
        ax.set_xlim(5, 90)
    axes[0, 1].plot(temps_c, glycol_mu, color=COPPER, lw=1.3, ls="--")
    axes[0, 1].text(48, glycol_mu[80], "ethylene glycol", fontsize=7, color=COPPER)
    axes[0, 1].text(48, series["mu"][80] * 1000 * 1.8, "water", fontsize=7, color=GREEN)
    fig.tight_layout(pad=0.6)
    return save(fig, "properties.png")


def fig_cv() -> Path:
    w, h = 5.55, 4.55
    fig, ax = canvas(w, h)
    ax.text(0.15, h - 0.28, "ONE SLICE OF THE PIPE", fontsize=8, color=GOLD, fontweight="bold")
    # pipe
    rbox(ax, 0.7, 1.85, 4.15, 1.15, "#E7F0EA", ec=GREEN, lw=1.3, r=0.04)
    ax.plot([0.85, 4.7], [2.42, 2.42], color=GREEN, lw=1.0, alpha=0.7)
    # flow arrows
    arrow(ax, 0.15, 2.42, 0.62, 2.42, GREEN, 1.3, 11)
    arrow(ax, 4.92, 2.42, 5.40, 2.42, GREEN, 1.3, 11)
    ax.text(0.12, 2.85, "in", fontsize=8, color=GREEN, fontweight="bold")
    ax.text(0.12, 2.05, "ṁ, P, T", fontsize=8, color=MUTED)
    ax.text(4.95, 2.85, "out", fontsize=8, color=GREEN, fontweight="bold")
    ax.text(4.85, 2.05, "ṁ, P+dP, T+dT", fontsize=7.5, color=MUTED)
    # heat
    arrow(ax, 2.75, 3.55, 2.75, 3.08, COPPER, 1.2, 11)
    ax.text(2.90, 3.35, "q′  to or from the room", fontsize=8, color=COPPER)
    # gravity
    arrow(ax, 4.35, 2.15, 4.35, 1.55, BLUE, 1.1, 10)
    ax.text(3.55, 1.42, "g sinθ", fontsize=8, color=BLUE)
    # wall shear
    ax.text(0.85, 3.08, "wall shear  ~  f", fontsize=8, color=GREEN_DARK)
    # dx brace
    ax.annotate("", xy=(4.7, 1.15), xytext=(0.7, 1.15), arrowprops=dict(arrowstyle="<->", color=INK, lw=0.8))
    ax.text(2.7, 0.85, "dx", fontsize=11, color=INK, ha="center", fontfamily="Georgia")
    ax.text(0.2, 0.35, "Mass in equals mass out. The area is constant.\nVelocity changes only because density changes with T.", fontsize=8, color=MUTED)
    return save(fig, "control_volume.png")


def fig_rk4() -> Path:
    w, h = 12.25, 2.35
    fig, ax = canvas(w, h)
    ax.text(0.15, h - 0.22, "AT A STATION: RECORD, THEN THE JUMPS, THEN ONE RK4 STEP", fontsize=8.5, color=GOLD, fontweight="bold")
    steps = ["1  record", "2  vessel", "3  fittings", "4  valve", "5  pump", "6  step"]
    for i, lab in enumerate(steps):
        x = 0.18 + i * 2.02
        fc = GREEN if i == 5 else CREAM
        tc = "white" if i == 5 else INK
        rbox(ax, x, 1.48, 1.78, 0.46, fc, ec=GREEN if i == 5 else RULE, lw=0.8, r=0.06)
        ax.text(x + 0.89, 1.71, lab, ha="center", va="center", fontsize=9, color=tc, fontweight="bold")
        if i < 5:
            arrow(ax, x + 1.82, 1.71, x + 2.00, 1.71, COPPER, 0.9, 7)
    y = 0.78
    ax.plot([0.55, 6.2], [y, y], color=GREEN, lw=1.8)
    ax.plot([0.55, 3.375, 6.2], [y, y, y], "o", ms=6.5, color=GREEN_DARK, zorder=3)
    ax.text(0.55, 1.12, "k1", fontsize=8, color=COPPER, ha="center")
    ax.text(3.37, 1.12, "k2 and k3", fontsize=8, color=COPPER, ha="center")
    ax.text(6.2, 1.12, "k4, the trial end", fontsize=8, color=COPPER, ha="center")
    ax.annotate("", xy=(2.3, 0.48), xytext=(0.7, 0.48), arrowprops=dict(arrowstyle="<->", color=MUTED, lw=0.7))
    ax.text(1.5, 0.26, "dx", fontsize=8, color=MUTED, ha="center")
    ax.text(0.55, 0.08, "node i, after the jumps", fontsize=8, color=INK, ha="center")
    ax.text(6.2, 0.08, "node i+1", fontsize=8, color=INK, ha="center")
    ax.text(9.3, 0.85, "y  ←  y + (dx / 6) (k1 + 2 k2 + 2 k3 + k4)", fontsize=10, color=GREEN_DARK, ha="center", fontfamily="Consolas")
    ax.text(9.3, 0.42, "The value drawn at node i is the state\nbefore the jumps. The step shows up\non the way to node i+1.", fontsize=8.5, color=MUTED, ha="center", va="center")
    return save(fig, "rk4.png")


def fig_moody(n: dict) -> Path:
    fig, ax = plt.subplots(figsize=(6.45, 4.7), dpi=180)
    fig.patch.set_facecolor(PAPER)
    style_ax(ax, grid=False)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.axvspan(RE_LAM, RE_TURB, color="#F4E6D4", zorder=0)
    res = [10 ** (2.7 + 5.3 * i / 80) for i in range(81)]
    ax.plot([r for r in res if r <= RE_LAM], [64 / r for r in res if r <= RE_LAM], color="#8A938C", lw=1.0, label="64/Re")
    for eD, lw in ((0.05, 0.6), (0.01, 0.6), (0.001, 0.6), (0.0001, 0.6), (0.0, 0.8)):
        ys = [solve_colebrook(r, eD)[0] for r in res if r >= RE_TURB]
        xs = [r for r in res if r >= RE_TURB]
        ax.plot(xs, ys, color="#C8BFB2", lw=lw)
    # current pipe across regimes
    def sample(lo, hi, npts=40):
        xs = [10 ** (math.log10(lo) + (math.log10(hi) - math.log10(lo)) * i / npts) for i in range(npts + 1)]
        ys = [friction_factor(x, n["eD"], "colebrook")[0] for x in xs]
        return xs, ys
    for lo, hi, ls in ((500, RE_LAM, "-"), (RE_LAM, RE_TURB, "--"), (RE_TURB, 1e8, "-")):
        xs, ys = sample(lo, hi)
        ax.plot(xs, ys, color=COPPER, lw=1.8, ls=ls)
    ax.plot(n["Re"], n["f"], "o", ms=7, color=GREEN, zorder=5)
    ax.annotate(
        f"this pipe\nRe = {n['Re']:,.0f}\nf = {n['f']:.4f}",
        xy=(n["Re"], n["f"]),
        xytext=(n["Re"] * 0.08, n["f"] * 2.4),
        fontsize=8,
        color=GREEN_DARK,
        arrowprops=dict(arrowstyle="->", color=GREEN, lw=0.8),
    )
    ax.text(3000, 0.09, "transition\nbridge", fontsize=7, color=COPPER, ha="center")
    ax.set_xlim(500, 1e8)
    ax.set_ylim(0.008, 0.1)
    ax.set_xlabel("Reynolds number", fontsize=9)
    ax.set_ylabel("Darcy friction factor  f", fontsize=9)
    ax.set_title("Moody chart from the same solver the march uses", fontsize=10, color=INK, loc="left", pad=6)
    fig.tight_layout(pad=0.45)
    return save(fig, "moody.png")


def fig_pump(n: dict) -> Path:
    fig, ax = plt.subplots(figsize=(12.2, 2.42), dpi=180)
    fig.patch.set_facecolor(PAPER)
    style_ax(ax)
    model = n["model_duty"]
    H0, Qmax = n["H0_duty"], n["Qmax_duty"]
    inlet = n["inlet_duty"]
    Qbep = n["Qbep_duty"]
    # suction model rebuilt the same way as in build_notes
    qs, head, system, na, nr = [], [], [], [], []
    for i in range(41):
        Q = Qmax * i / 40
        qs.append(Q * 3600)
        head.append(pump_head(H0, Qmax, Q))
        system.append(line_head(model, Q)["h_system"])
        # NPSH uses the duty suction model approximated via z1 and a proportional loss.
        # Recompute properly: caller stored npsha only at the duty. Sample with a
        # suction model carried on n if present.
    suction = n["suction_model"]
    z1 = n["z1"]
    for i in range(41):
        Q = Qmax * i / 40
        na.append((model["p_in"] - inlet["pvap"]) / (inlet["rho"] * G) + z1 - suction_loss(suction, Q))
        nr.append(npshr(n["npshr_bep_duty"], Qbep, Q))
    ax.plot(qs, head, color=GOLD, lw=2.0, label="Pump head  H(Q)")
    ax.plot(qs, system, color=COPPER, lw=2.0, label="System head")
    ax.plot(qs, na, color=GREEN, lw=1.2, ls="--", label="NPSHa")
    ax.plot(qs, nr, color=ALERT, lw=1.2, ls="--", label="NPSHr")
    Qd = n["duty"]["Q"] * 3600
    Hd = n["duty"]["H"]
    ax.plot(Qd, Hd, "o", ms=8, color=GREEN_DARK, zorder=5)
    ax.annotate(
        f"duty  {Qd:.1f} m³/h,  {Hd:.1f} m",
        xy=(Qd, Hd),
        xytext=(Qd + 2.2, Hd + 6),
        fontsize=8,
        color=GREEN_DARK,
        arrowprops=dict(arrowstyle="->", color=GREEN_DARK, lw=0.8),
    )
    ax.set_xlim(0, 30)
    ax.set_xlabel("Capacity  Q  (m³/h)", fontsize=9)
    ax.set_ylabel("Head  (m)", fontsize=9)
    ax.legend(frameon=False, fontsize=8, loc="upper left")
    ax.set_title("Duty preset: 120 m commercial-steel line, 18 m rise, vessels at both ends", fontsize=10, color=INK, loc="left")
    fig.tight_layout(pad=0.45)
    return save(fig, "pump.png")


def fig_grades(n: dict) -> Path:
    g = n["grades"]
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12.2, 3.85), dpi=180, sharex=True, gridspec_kw={"height_ratios": [1.35, 1]})
    fig.patch.set_facecolor(PAPER)
    for ax in (ax1, ax2):
        style_ax(ax)
    x = g["x"]
    ax1.plot(x, g["z"], color=MUTED, lw=1.0, ls="--", label="elevation  z")
    ax1.plot(x, g["HGL"], color=BLUE, lw=1.8, label="hydraulic grade")
    ax1.plot(x, g["EGL"], color=COPPER, lw=1.5, label="energy grade")
    ax2.plot(x, [p / 1000 for p in g["P"]], color=GREEN, lw=1.8)
    top = max(g["HGL"]) + 7
    ax1.set_ylim(min(0, min(g["z"]) - 2), top)
    for xpos in (g["pump_x"], g["valve_x"]):
        ax1.axvline(xpos, color="#E4DCCF", lw=0.8, zorder=0)
        ax2.axvline(xpos, color="#E4DCCF", lw=0.8, zorder=0)
    ax1.text(g["pump_x"], top - 1.6, "pump", fontsize=8, color=GOLD, ha="center")
    ax1.text(g["valve_x"], top - 1.6, "valve", fontsize=8, color=COPPER, ha="center")
    ax1.set_ylabel("Grade  (m)", fontsize=8)
    ax2.set_ylabel("Pressure  (kPa)", fontsize=8)
    ax2.set_xlabel("Distance along the pipe  (m)", fontsize=9)
    ax1.legend(frameon=False, fontsize=8, loc="lower right", ncol=3)
    ax1.set_title("Grade lines and pressure for one marched line  ·  water, adiabatic, imposed 1.5 m/s", fontsize=10, color=INK, loc="left")
    fig.tight_layout(pad=0.45)
    return save(fig, "grades.png")


def fig_profiles(n: dict) -> Path:
    fig, ax = plt.subplots(figsize=(6.15, 4.55), dpi=180)
    fig.patch.set_facecolor(PAPER)
    style_ax(ax)
    ax.plot(n["profile_lam"]["u"], n["profile_lam"]["r"], color="#8A938C", lw=1.3, ls="--", label="Laminar  ·  Hagen–Poiseuille")
    ax.plot(n["profile_bridge"]["u"], n["profile_bridge"]["r"], color=SAND, lw=1.3, ls=":", label="Transition blend at Re = 3150")
    ax.plot(n["profile"]["u"], n["profile"]["r"], color=COPPER, lw=2.0, label="This pipe  ·  turbulent power law")
    ax.axvline(1.0, color=RULE, lw=0.7)
    ax.set_xlabel("u / mean velocity", fontsize=9)
    ax.set_ylabel("r / R    wall ← → wall", fontsize=9)
    ax.set_ylim(-1.05, 1.05)
    ax.legend(frameon=False, fontsize=8, loc="center left")
    ax.set_title("Radial profile the tracers read", fontsize=10, color=INK, loc="left")
    fig.tight_layout(pad=0.5)
    return save(fig, "profiles.png")


def build_equations() -> dict:
    face = CREAM
    eqs = {
        "dh": r"$\mathrm{d}h = c_p\,\mathrm{d}T + (1 - \beta T)\,\mathrm{d}P\,/\,\rho$",
        "sf": r"$\mathrm{d}h + g\,\mathrm{d}z = \delta q$",
        "mom": r"$\mathrm{d}P/\mathrm{d}x = -\,f\rho v^{2}/(2D) - \rho g\sin\theta$",
        "temp": r"$c_p\,\mathrm{d}T/\mathrm{d}x = q'/\dot{m} + fv^{2}/(2D) + (\beta T/\rho)\,\mathrm{d}P/\mathrm{d}x$",
        "heat": r"$q' = -\,U\pi D\,(T - T_{\mathrm{amb}})$",
        "head": r"$\mathrm{d}h_L/\mathrm{d}x = (f v^{2}/(2D))/g$",
        "cole": r"$1/\sqrt{f} = -2\log_{10}\left((\varepsilon/D)/3.7 + 2.51/(Re\sqrt{f})\right)$",
        "drop": r"$\Delta P = K\rho v^{2}/2,\quad \Delta T = (1-\beta T)\,\Delta P/(\rho c_p)$",
        "pump": r"$H = H_0\left(1-(Q/Q_{\max})^{2}\right)$",
        "npsh": r"$\mathrm{NPSHa} = (P_1 - P_{\mathrm{sat}})/(\rho g) + z_1 - h_{fs}$",
    }
    out = {}
    for key, tex in eqs.items():
        out[key] = render_eq(tex, f"eq_{key}.png", fontsize=14, face=face)
    return out


def build_all():
    n = build_notes()
    # Attach the suction model used for the duty chart. Rebuilt here so fig_pump
    # and the notes share one object: stored during build_notes via a second pass.
    n["suction_model"] = _duty_suction(n)
    figs = {
        "cover": fig_cover(n),
        "architecture": fig_architecture(),
        "flow": fig_control_flow(),
        "state": fig_state(n),
        "properties": fig_properties(n),
        "cv": fig_cv(),
        "rk4": fig_rk4(),
        "moody": fig_moody(n),
        "pump": fig_pump(n),
        "grades": fig_grades(n),
        "profiles": fig_profiles(n),
    }
    eqs = build_equations()
    return n, figs, eqs


def _duty_suction(n: dict) -> dict:
    """Suction line model for the duty preset, same rules as pipe_unit.ts."""
    inlet = n["inlet_duty"]
    D, L, dz = 0.05, 120.0, 18.0
    pump_idx = int(round(0.12 * (N_NODES - 1)))
    pump_x = pump_idx / (N_NODES - 1)
    layout = layout_fittings({"n_elbow_90": 8, "n_elbow_45": 2, "n_tee_branch": 1}, "sharp", "sudden", 0.6, pump_x)

    def station_idx(st):
        if st["glyph"] == "inlet":
            return 0
        return max(1, min(N_NODES - 2, int(round(st["xNorm"] * (N_NODES - 1)))))

    k_suction = sum(st["K"] for st in layout["stations"] if st["glyph"] != "outlet" and station_idx(st) <= pump_idx)
    return {
        "area": math.pi * D**2 / 4,
        "diameter": D,
        "length": pump_x * L,
        "rho": inlet["rho"],
        "mu": inlet["mu"],
        "eD": 4.6e-5 / D,
        "correlation": "colebrook",
        "k_minor": k_suction,
        "dz": 0.0,
        "p_in": 180e3,
        "p_delivery": 180e3,
        "a_in": 0.0,
        "a_out": 0.0,
    }


if __name__ == "__main__":
    notes, figs, eqs = build_all()
    print(f"rho {notes['rho']:.2f}  mu {notes['mu']*1000:.3f} cP  cp {notes['cp']:.1f}  Psat {notes['pv']/1000:.3f} kPa  beta {notes['beta']:.3e}")
    print(f"Re {notes['Re']:.0f}  f {notes['f']:.5f}  iters {notes['newton_iters']}  sj {notes['f_sj']:.5f}  ch {notes['f_ch']:.5f}")
    print(f"dPdx {notes['dPdx']:.2f} Pa/m  dTdx {notes['dTdx']:.6e} K/m  dP {notes['dP']/1000:.3f} kPa  dT {notes['dT']*1000:.2f} mK")
    print(f"valve {notes['dP_valve']:.1f} Pa  friction integral {notes['dP_friction']/1000:.3f} kPa  hL {notes['hL']:.3f} m")
    print(f"glycol Re {notes['Re_g']:.0f} f {notes['f_g']:.4f} mu {notes['glycol_mu']*1000:.2f} cP")
    print(f"acetone K {notes['K_acetone']:.2f} flash {notes['i_flash']}")
    print(f"duty Q {notes['duty']['Q']*3600:.2f} m3/h H {notes['duty']['H']:.2f} status {notes['duty']['status']} eta {notes['eta_duty']:.3f}")
    print(f"NPSHa {notes['npsha_d']:.2f} NPSHr {notes['npshr_d']:.2f}  hot NPSHa {notes['npsha_h']:.2f} NPSHr {notes['npshr_h']:.2f}")
    print(f"cp polynomial zero at {notes['cp_zero_c']:.2f} C  wrong@25 {notes['cp_wrong_25']:.0f}  wrong@7 {notes['cp_wrong_7']:.0f}  right@7 {notes['cp_right_7']:.1f}")
    print(f"grade H {notes['H_grade']:.2f} m  eta {notes['eta_grade']:.3f} Pout {notes['grades']['y_out'][0]/1000:.2f} kPa")
    print("figures", len(figs), "eqs", len(eqs))
