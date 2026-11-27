"""Build the Visualcheme engine briefing as a Word deck and a PDF."""

from __future__ import annotations

import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Emu, Inches, Pt, RGBColor, Twips

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pres_lib import build_all, line_head, png_inches, valve_k  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "presentations"
DOCX = OUT / "Visualcheme_Mathematical_Engine.docx"
PDF = OUT / "Visualcheme_Mathematical_Engine.pdf"

W = 12.32  # usable width, inches


def rgb(hex_color: str) -> RGBColor:
    h = hex_color.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def set_run(run, name, size, color, bold=False, italic=False):
    run.font.name = name
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.color.rgb = rgb(color)
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rFonts.set(qn(attr), name)


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tcPr.append(shd)


def cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    mar = OxmlElement("w:tcMar")
    for name, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{name}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        mar.append(node)
    tcPr.append(mar)


def set_cell_border(cell, **sides):
    """sides: left=('single','12','8C4A2F')"""
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        if edge in sides:
            val, sz, color = sides[edge]
            el.set(qn("w:val"), val)
            el.set(qn("w:sz"), sz)
            el.set(qn("w:space"), "0")
            el.set(qn("w:color"), color)
        else:
            el.set(qn("w:val"), "nil")
        borders.append(el)
    tcPr.append(borders)


def set_width(cell, inches):
    tcPr = cell._tc.get_or_add_tcPr()
    tcW = OxmlElement("w:tcW")
    tcW.set(qn("w:w"), str(int(inches * 1440)))
    tcW.set(qn("w:type"), "dxa")
    tcPr.append(tcW)


def cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    node = OxmlElement("w:cantSplit")
    trPr.append(node)


def make_table(parent, widths, rows=1):
    table = parent.add_table(rows=rows, cols=len(widths))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.allow_autofit = False
    tbl = table._tbl
    tblPr = tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)
    total = str(int(sum(widths) * 1440))
    tblW = tblPr.find(qn("w:tblW"))
    if tblW is None:
        tblW = OxmlElement("w:tblW")
        tblPr.append(tblW)
    tblW.set(qn("w:w"), total)
    tblW.set(qn("w:type"), "dxa")
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        borders.append(el)
    tblPr.append(borders)
    grid = tbl.find(qn("w:tblGrid"))
    if grid is not None:
        for child, w in zip(list(grid), widths):
            child.set(qn("w:w"), str(int(w * 1440)))
    for row in table.rows:
        cant_split(row)
        for cell, w in zip(row.cells, widths):
            set_width(cell, w)
            cell_margins(cell)
    return table


def fresh_p(parent):
    is_cell = parent.__class__.__name__ == "_Cell"
    if is_cell and len(parent.paragraphs) == 1 and parent.paragraphs[0].text == "" and not parent.paragraphs[0].runs:
        return parent.paragraphs[0]
    return parent.add_paragraph()


def add_text(parent, text, size=12, color="1C2420", bold=False, italic=False, font="Calibri", after=4, before=0, align="left", space=1.06):
    p = fresh_p(parent)
    p.alignment = {"left": WD_ALIGN_PARAGRAPH.LEFT, "center": WD_ALIGN_PARAGRAPH.CENTER, "right": WD_ALIGN_PARAGRAPH.RIGHT}[align]
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = space
    run = p.add_run(text)
    set_run(run, font, size, color, bold, italic)
    return p


def add_runs(parent, runs, size=12, after=4, before=0, space=1.06, align="left"):
    """runs: list of (text, bold, italic, color) or plain strings."""
    p = fresh_p(parent)
    p.alignment = {"left": WD_ALIGN_PARAGRAPH.LEFT, "center": WD_ALIGN_PARAGRAPH.CENTER}[align]
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = space
    for item in runs:
        if isinstance(item, str):
            text, bold, italic, color, font = item, False, False, "1C2420", "Calibri"
        else:
            text = item[0]
            bold = item[1] if len(item) > 1 else False
            italic = item[2] if len(item) > 2 else False
            color = item[3] if len(item) > 3 else "1C2420"
            font = item[4] if len(item) > 4 else "Calibri"
        run = p.add_run(text)
        set_run(run, font, size, color, bold, italic)
    return p


def bullet(parent, text, size=12, after=2):
    p = fresh_p(parent)
    p.paragraph_format.left_indent = Inches(0.18)
    p.paragraph_format.first_line_indent = Inches(-0.16)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = 1.05
    r = p.add_run("–  ")
    set_run(r, "Calibri", size, "8C4A2F", bold=True)
    r2 = p.add_run(text)
    set_run(r2, "Calibri", size, "1C2420")
    return p


def picture(parent, path, width):
    p = fresh_p(parent)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.0
    p.add_run().add_picture(str(path), width=Inches(width))
    return p


def picture_native(parent, path, max_width):
    w_in, _ = png_inches(path)
    picture(parent, path, min(max_width, w_in))


def configure(section):
    section.page_width = Inches(13.333)
    section.page_height = Inches(7.5)
    section.left_margin = Inches(0.50)
    section.right_margin = Inches(0.50)
    section.top_margin = Inches(0.32)
    section.bottom_margin = Inches(0.28)
    section.header_distance = Inches(0.15)
    section.footer_distance = Inches(0.12)


def new_slide(doc, first=False):
    if first:
        section = doc.sections[0]
    else:
        section = doc.add_section(WD_SECTION.NEW_PAGE)
    configure(section)
    return section


def header(doc, kicker, title, lead=None):
    add_text(doc, kicker, size=11, color="8C4A2F", bold=True, after=1, before=0, space=1.0)
    add_text(doc, title, size=24, color="17352A", font="Georgia", after=2, before=0, space=1.0)
    if lead:
        add_text(doc, lead, size=12.5, color="3E4742", italic=True, font="Georgia", after=6, before=1, space=1.05)


def code_block(parent, lines, width=W):
    table = make_table(parent, [width])
    cell = table.cell(0, 0)
    shade(cell, "F4EFE6")
    set_cell_border(cell, left=("single", "16", "8C4A2F"))
    cell_margins(cell, 50, 50, 120, 80)
    for i, line in enumerate(lines):
        p = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.02
        run = p.add_run(line)
        set_run(run, "Consolas", 10.5, "1C2420")
    return table


def eq_block(parent, path, width):
    table = make_table(parent, [width])
    cell = table.cell(0, 0)
    shade(cell, "F4EFE6")
    set_cell_border(cell, left=("single", "16", "1E4A38"))
    cell_margins(cell, 20, 20, 80, 40)
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    w_in, _ = png_inches(path)
    p.add_run().add_picture(str(path), width=Inches(min(width - 0.35, w_in)))
    return table


def chips(parent, pairs, width=W):
    table = make_table(parent, [width / len(pairs)] * len(pairs))
    for cell, (value, label) in zip(table.rows[0].cells, pairs):
        shade(cell, "F4EFE6")
        cell_margins(cell, 50, 46, 90, 70)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        run = p.add_run(value)
        set_run(run, "Georgia", 16, "17352A", bold=True)
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(0)
        run2 = p2.add_run(label)
        set_run(run2, "Calibri", 9, "5E675F")
    return table


def fill_cell(cell, paragraphs, size=12, after=3):
    """paragraphs are strings."""
    for i, text in enumerate(paragraphs):
        add_text(cell, text, size=size, after=after, before=0)


# ---------------------------------------------------------------- slides


def slide_cover(doc, figs):
    new_slide(doc, first=True)
    if doc.paragraphs:
        first = doc.paragraphs[0]
        if first.text == "" and not first.runs:
            first._element.getparent().remove(first._element)
    table = make_table(doc, [7.15, 5.17])
    left, right = table.rows[0].cells
    shade(left, "17352A")
    shade(right, "FBF9F4")
    cell_margins(left, 160, 120, 180, 160)
    cell_margins(right, 80, 60, 80, 70)
    left.vertical_alignment = 1  # center
    right.vertical_alignment = 1
    add_text(left, "VISUALCHEME", size=12, color="E4D7A1", bold=True, after=6, space=1.0)
    add_text(left, "The mathematical and", size=28, color="F6F1E7", font="Georgia", after=0, space=0.95)
    add_text(left, "computational engine", size=28, color="F6F1E7", font="Georgia", after=8, space=0.95)
    add_text(
        left,
        "How a steady liquid line is integrated in the browser, and how the picture is a reading of that integral.",
        size=13,
        color="E4D7A1",
        italic=True,
        font="Georgia",
        after=8,
    )
    add_text(
        left,
        "This briefing follows one calculation. A slider changes a parameter. PipeUnit.calculate evaluates a pure liquid, writes four derivatives from the enthalpy and momentum balances, and carries them along 201 stations with a Runge–Kutta step. Fittings, the valve, and the pump enter as jumps. The canvas, the profile, and the Moody chart read the object that comes back, and the picture is drawn from the profiles that object already holds.",
        size=12,
        color="F3EDE2",
        after=8,
        space=1.08,
    )
    add_text(left, "dP/dx  =  − f ρ v² / (2D)  −  ρ g sinθ", size=12, color="E4D7A1", font="Consolas", after=8)
    add_text(left, "201 stations    ·    4 numbers in the integrator    ·    1 call to calculate per edit", size=10, color="C9C2B2", after=0)
    picture(right, figs["cover"], 4.72)


def slide_question(doc):
    new_slide(doc)
    header(
        doc,
        "01   ·   THE QUESTION",
        "One function answers the whole line",
        "PipeUnit.calculate(params) is the entire physics step. Everything on the screen is a field of the object it returns.",
    )
    add_text(
        doc,
        "The inputs are the panel: fluid, inlet velocity or pump duty, diameter, length, elevation, roughness, insulation, the two temperatures, the two pressures, the fittings, the valve, and which friction equation to use. The output is one UnitSimulationResult. The interface that makes a later unit possible is UnitOperation: parameters in, this object out. The registry currently holds a single implementation, pipe_flow.",
        size=12.5,
        after=6,
    )
    rows = [
        ("spatialGrid", "The stations x, from 0 to L. Two hundred and one of them, so the step is L/200."),
        ("properties", "Ten profiles: pressure, velocity, temperature, Reynolds number, friction factor, head loss, hydraulic grade, energy grade, density, viscosity."),
        ("metrics", "The cards. Regime, the split of the pressure drop, valve K, fittings, discharge temperature, head, and, with a pump, head and NPSH."),
        ("diagram", "The Moody chart, with this pipe’s roughness curve and its operating point, drawn by the same friction function the march uses."),
        ("warnings", "Where an assumption of the liquid model has failed: freezing, flashing, cavitation, transitional flow, a correlation used outside its range."),
        ("extraData", "The radial velocity profile, the fitting stations, the flash location, and the pump chart when a pump is installed."),
    ]
    table = make_table(doc, [2.15, 10.17], rows=len(rows))
    for i, (name, desc) in enumerate(rows):
        a, b = table.rows[i].cells
        if i % 2 == 0:
            shade(a, "F4EFE6")
            shade(b, "F4EFE6")
        cell_margins(a, 36, 36, 80, 60)
        cell_margins(b, 36, 36, 70, 70)
        p = a.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        set_run(p.add_run(name), "Consolas", 11, "1E4A38", bold=True)
        p2 = b.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        set_run(p2.add_run(desc), "Calibri", 11.5, "1C2420")
    add_text(
        doc,
        "The rest of the briefing opens this object. Each slide follows one part of the call: which program answers which question, which four numbers move from station to station, and which equation those numbers come from. The same result is what the tests assert against, so a change in the march shows up as a change in the picture and as a change in the suite together.",
        size=12.5,
        before=8,
        after=2,
    )


def slide_architecture(doc, figs):
    new_slide(doc)
    header(
        doc,
        "02   ·   ARCHITECTURE",
        "Four kinds of program, one object between them",
        "The browser runs a single page. The modules below are the programs: each owns one kind of statement, and they meet in memory.",
    )
    picture(doc, figs["architecture"], W)
    add_text(
        doc,
        "The path from a slider to the next frame stays in the browser’s memory. PropertyService reads compounds.json, 431 pure species with ChemSep / DIPPR coefficients, and answers getLiquidState(compound, T). The pipe asks for density, viscosity, heat capacity, vapor pressure, and expansivity. Conductivity is evaluated with that state. The wall exchange uses the chosen overall coefficient U. Mixture data sit in the same service, 352 NRTL pairs and a Peng–Robinson kij matrix, ready for a later unit. The pipe march calls getLiquidState.",
        size=12.5,
        after=4,
    )
    add_text(
        doc,
        "friction.ts, fittings.ts, and pump.ts are pure functions. They return a friction factor, a loss coefficient, a station, a head, an efficiency, an NPSH. PipeUnit is the only place that integrates. main.ts calls calculate once and hands the result to every panel.",
        size=12.5,
        after=2,
    )


def slide_flow(doc, figs):
    new_slide(doc)
    header(
        doc,
        "03   ·   CONTROL FLOW",
        "A slider resolves the physics once",
        "VisualchemeApp holds the unit, the parameter record, the painted property, and the latest result.",
    )
    picture(doc, figs["flow"], W)
    add_text(
        doc,
        "Parameter path. The controls panel calls back with the new record. runSimulation passes it to currentUnit.calculate. Metrics, the fluid bar, and the warnings render from the result. pipeRenderer.update stores the result and marks the picture dirty. The spatial chart and the Moody chart redraw. If extraData.pumpDiagram is present, the pump chart is shown. Otherwise its panel is hidden.",
        size=12.5,
        after=3,
    )
    add_text(
        doc,
        "Property path. Choosing temperature, head loss, or either grade line calls onPropertySelected. The stored result goes to the renderer and the spatial chart. Friction, pump head, and the profiles stay as they were. Color is a change of reading, and the march stays put.",
        size=12.5,
        after=3,
    )
    add_text(
        doc,
        "Frame path. The renderer’s own loop is requestAnimationFrame. Each frame advances tracers with the stored velocity profile and the stored radial shape, and grows or collapses bubbles from flags the march already computed. The particles are a display of the solution. The development notes size the march itself at well under a millisecond, inside the 16.7 ms budget of a 60 frame-per-second display, which is why a slider can update the picture on the next frame.",
        size=12.5,
        after=2,
    )


def slide_state(doc, figs, n):
    new_slide(doc)
    header(
        doc,
        "04   ·   THE UNKNOWN",
        "What is carried from station to station",
        "The integrator’s unknown is four numbers. Around them, every stage rebuilds the flow from the current temperature.",
    )
    picture(doc, figs["state"], W)
    code_block(
        doc,
        [
            "mDot = rho(T_inlet) * v_inlet * A          fixed for the whole line",
            "v    = mDot / (rho(T) * A)                 velocity follows density",
            "Re   = mDot * D / (A * mu(T))              inertia over viscosity",
            "f    = frictionFactor(Re, epsilon/D)       Darcy, from the selected equation",
        ],
    )
    add_text(
        doc,
        f"On the default line the inlet state is water at 25 °C: ρ = {n['rho']:.1f} kg/m³, μ = {n['mu']*1000:.3f} cP, so Re = {n['Re']:,.0f}. Mass flow is fixed at {n['m_dot']:.3f} kg/s for the whole line. Head loss h_L counts irreversible losses only: wall friction, fittings, and the valve. Elevation stays out of it, and so does the pump head. The fourth component is the running integral of the frictional pressure drop, which is how the pressure-drop card can say how much of ΔP was friction.",
        size=12.5,
        after=3,
    )
    add_text(
        doc,
        "The valve is fixed at 60% of L. On a 20 m pipe that is station 120, at 12.0 m. The plotted profiles are the 201 nodes. The curves on the chart are straight lines between them.",
        size=12.5,
        after=2,
    )


def slide_properties(doc, figs, n):
    new_slide(doc)
    header(doc, "05   ·   PROPERTIES", "Temperature in, a liquid state out", "getLiquidState is the only property call inside the march. The curves are the coefficients in compounds.json, evaluated by correlations.ts.")
    cells = make_table(doc, [5.85, 6.47]).rows[0].cells
    cell_margins(cells[0], 20, 20, 40, 80)
    cell_margins(cells[1], 0, 0, 40, 0)
    add_text(cells[0], "The evaluator switches on the equation number. The pipe uses four of them.", size=12, after=3)
    forms = [
        ("101", "Y = exp(A + B/T + C ln T + D T^E)", "Vapor pressure and liquid viscosity. Water uses 101 for both."),
        ("105", "Rackett: A / B^(1+(1−T/C)^D)", "Liquid density for many organics, then times the molar mass."),
        ("106", "A (1−T/Tc)^(B+C Tr+…)", "Water’s liquid density, and heats of vaporization. Needs Tc."),
        ("16", "A + exp(B/T + C + D T + E T²)", "Liquid cp and thermal conductivity. An exponential, not a polynomial."),
    ]
    for eq, form, use in forms:
        add_runs(cells[0], [(eq + "   ", True, False, "8C4A2F", "Consolas"), (form, False, False, "1C2420", "Consolas")], size=10, after=0, space=1.0)
        add_text(cells[0], use, size=11, color="3E4742", after=3, space=1.02)
    add_text(
        cells[0],
        f"At 25 °C the water correlations give ρ = {n['rho']:.1f} kg/m³, μ = {n['mu']*1000:.3f} cP, cp = {n['cp']:.0f} J/kg·K, Psat = {n['pv']/1000:.2f} kPa. Expansivity is a central difference of the density curve, half a kelvin either side: β = {n['beta']:.2e} K⁻¹. The dashed line on the viscosity plot is ethylene glycol, {n['glycol_mu']*1000:.1f} cP at 20 °C.",
        size=11.5,
        after=3,
    )
    add_text(
        cells[0],
        f"Equation 16 has to be the exponential. Read as an ordinary polynomial in T, the same five heat-capacity coefficients cross zero at {n['cp_zero_c']:.1f} °C and are {n['cp_wrong_7']:.0f} J/kg·K at 7 °C, while equation 16 is still {n['cp_right_7']:.0f}. At 25 °C the polynomial reading gives {n['cp_wrong_25']:.0f} J/kg·K against {n['cp']:.0f} from the exponential. A negative heat capacity reverses dT/dx, which is why one function evaluates every equation number.",
        size=11.5,
        after=2,
    )
    picture(cells[1], figs["properties"], 6.25)


def slide_balances(doc, figs, eqs):
    new_slide(doc)
    header(
        doc,
        "06   ·   THE BALANCES",
        "Two ordinary differential equations",
        "The march is the steady momentum balance and the steady enthalpy balance of a pure liquid, written per metre and integrated in x.",
    )
    cells = make_table(doc, [6.55, 5.77]).rows[0].cells
    cell_margins(cells[0], 20, 10, 40, 70)
    cell_margins(cells[1], 0, 0, 40, 0)
    blocks = [
        ("Momentum", eqs["mom"], "Wall friction, and the component of weight along the pipe. sinθ is the rise over the run, clipped so the pipe cannot rise by more than its own length."),
        ("Enthalpy of the liquid", eqs["dh"], "β = −(1/ρ)(∂ρ/∂T) at constant pressure. The second term is why a pressure drop changes the temperature even in an adiabatic line."),
        ("Steady-flow energy", eqs["sf"], "Along the pipe there is no shaft work. The kinetic-energy change that comes from thermal expansion is left out; the code treats it as negligible."),
        ("What is integrated", eqs["temp"], "Substitute the pressure gradient. The reversible exchange between pressure and elevation cancels. This is dTdx in the source."),
    ]
    for title, path, sentence in blocks:
        add_text(cells[0], title, size=11, color="8C4A2F", bold=True, after=1, space=1.0)
        eq_block(cells[0], path, 6.2)
        add_text(cells[0], sentence, size=11, after=4, space=1.02)
    picture(cells[1], figs["cv"], 5.45)
    add_text(cells[1], "Heat into the fluid, per metre, and the irreversible head:", size=11, italic=True, after=2)
    eq_block(cells[1], eqs["heat"], 5.4)
    add_text(cells[1], "U is 15, 0.5, or 0 W/m²·K on the inner area: bare, insulated, adiabatic. Head loss keeps only the friction piece, so a climb changes pressure and leaves h_L alone.", size=11, after=2)


def slide_code(doc, n):
    new_slide(doc)
    header(
        doc,
        "07   ·   IN THE SOURCE",
        "local() is the right-hand side",
        "Every Runge–Kutta stage calls local(T). Four assignments are the two balances. Names from pipe_unit.ts.",
    )
    code_block(
        doc,
        [
            "dPdxFriction = f * rho * v * v / (2 * D)",
            "dPdx         = -dPdxFriction - rho * g * sinTheta",
            "qIn          = -U * π * D * (T - T_amb)",
            "dTdx         = (qIn/mDot + dPdxFriction/rho + (beta*T/rho)*dPdx) / cp",
            "dHLdx        = dPdxFriction / (rho * g)",
            "y            = [P, T, h_L, ΔP_friction]      deriv = [dPdx, dTdx, dHLdx, dPdxFriction]",
        ],
    )
    add_text(doc, "Default inlet, the first stage. Flat commercial-steel pipe, Colebrook, bare, air at 20 °C.", size=12, italic=True, font="Georgia", color="3E4742", before=6, after=3)
    chips(
        doc,
        [
            (f"{n['Re']:,.0f}", "Reynolds number"),
            (f"{n['f']:.5f}", "Darcy f, Colebrook"),
            (f"{n['dPdx']/1000:.2f} kPa/m", "Pressure gradient"),
            (f"{n['dTdx']*1000:.2f} mK/m", "Temperature gradient"),
        ],
    )
    room = n["q_per_m"] / n["m_dot"] / n["cp"] * n["L"] * 1000
    wall = n["dPdx_f"] / n["rho"] / n["cp"] * n["L"] * 1000
    add_text(
        doc,
        f"Over the 20 m the march finishes at {n['dP']/1000:.2f} kPa of pressure drop and {n['dT']*1000:.1f} mK of temperature change. The outlet is {n['P_out']/1000:.1f} kPa and {n['T_out']-273.15:.3f} °C. Held at the inlet slope, the five degrees of difference with the room account for about {room:.0f} mK and viscous heating puts back about {wall:.1f} mK. A fluid element is in the pipe for {n['L']/n['v']:.0f} seconds, so a modest U has little time to act. The same terms, on ethylene glycol or downstream of a nearly closed valve, change roles: dissipation and the pressure effect on enthalpy become the temperature change you see.",
        size=12.5,
        before=6,
        after=2,
    )
    add_text(
        doc,
        f"Of the {n['dP']/1000:.2f} kPa, wall friction is {n['dP_friction']/1000:.2f} kPa and the fully open gate is {n['dP_valve']/1000:.2f} kPa. Head loss is {n['hL']:.2f} m. On a flat line with no pump, that head times ρg recovers the pressure drop.",
        size=12.5,
        after=2,
    )


def slide_rk4(doc, figs):
    new_slide(doc)
    header(
        doc,
        "08   ·   THE STEP",
        "Record, jump, then one Runge–Kutta step",
        "Temperature changes the properties, and the properties change the slope, so the slope is sampled four times across dx.",
    )
    picture(doc, figs["rk4"], W)
    add_text(
        doc,
        "From a state y the code evaluates the slope at the start, twice at the trial midpoint, and once at the trial end, then advances by the classical weights 1, 2, 2, 1. On the default 20 m pipe, dx is 10 cm. A single Euler step would freeze f, ρ, and cp at the upstream node for that whole centimetre. The four samples let the slope follow the temperature.",
        size=12.5,
        after=3,
    )
    add_text(
        doc,
        "A point loss is a discontinuity, so it stays outside the derivative. It is applied at the node after the node has been recorded and before the step toward the next node. Smearing a valve into dP/dx would spread the drop over dx and make its location depend on the grid. The order is fixed: record; reversible acceleration if the line leaves a still vessel; fitting K values that landed on this index; the valve, if this index is 60% of L; the pump, if this index is the pump station; then one RK4 step.",
        size=12.5,
        after=3,
    )
    add_text(
        doc,
        "The receiving tank is applied after the loop, to the last node only. A sudden exit leaves the static pressure as it is, adds the velocity head to h_L, and adds v²/(2 cp) to the temperature. The jet has mixed into the tank. The chart therefore shows the upstream state on a station and the downstream state on the next station, and the tank correction on the final point.",
        size=12.5,
        after=2,
    )


def slide_friction(doc, figs, eqs, n):
    new_slide(doc)
    header(
        doc,
        "09   ·   FRICTION",
        "One function, three equations",
        "calculateFrictionFactor(Re, ε/D, correlation) always returns a Darcy factor: the f in ΔP = f (L/D) (ρ v² / 2).",
    )
    cells = make_table(doc, [5.85, 6.47]).rows[0].cells
    cell_margins(cells[0], 10, 10, 40, 70)
    cell_margins(cells[1], 0, 0, 20, 0)
    add_text(cells[0], "Laminar, Re < 2300, for Colebrook or Swamee–Jain: f = 64/Re, the Hagen–Poiseuille result.", size=12, after=3)
    add_text(
        cells[0],
        f"The laminar preset is ethylene glycol at 0.25 m/s in a 25 mm tube. μ = {n['glycol_mu']*1000:.1f} cP, Re = {n['Re_g']:.0f}, so f = 64/Re = {n['f_g']:.3f}. The branch is actually taken.",
        size=12,
        after=3,
    )
    add_text(cells[0], "Turbulent, Re ≥ 4000. Colebrook–White is implicit. Newton solves it for x = 1/√f, starting from Swamee–Jain.", size=12, after=2)
    eq_block(cells[0], eqs["cole"], 5.5)
    add_text(
        cells[0],
        f"On the default pipe, ε/D = {n['eD']:.2e}. Swamee–Jain starts at f = {n['f_sj']:.5f}. Newton reaches the tolerance in {n['newton_iters']} iterations and finishes at f = {n['f']:.5f}. Churchill’s single formula, which covers laminar flow through turbulent flow without a switch, gives {n['f_ch']:.5f} at this same point.",
        size=12,
        after=3,
    )
    add_text(
        cells[0],
        "Between 2300 and 4000 the flow is intermittent, and f on that interval is an interpolation. Colebrook and Swamee–Jain draw a straight line on the log–log chart from 64/2300 to the turbulent value at 4000. That bridge is dashed on the figure. Churchill’s own blend stays solid. The unit raises a warning in the band. The pale curves are Colebrook at standard roughnesses, sampled through the same solver, so the chart and the pipe share one value of f.",
        size=12,
        after=2,
    )
    picture(cells[1], figs["moody"], 6.25)


def slide_losses(doc, eqs, n):
    new_slide(doc)
    header(
        doc,
        "10   ·   POINT LOSSES",
        "A K is an isenthalpic step",
        "Fittings and the valve share one jump. Enthalpy is unchanged. Mechanical energy that disappears returns as internal energy.",
    )
    eq_block(doc, eqs["drop"], 8.5)
    add_text(doc, "Δh_L = ΔP / (ρ g). Head loss stays the irreversible part; elevation is carried by the pressure gradient. The catalog is Towler & Sinnott Table 20.4, except the ball valve and the rounded and re-entrant mouths.", size=12, after=4)
    left_rows = [
        ("90° standard elbow", "0.80"),
        ("90° long-radius elbow", "0.45"),
        ("90° square elbow", "1.50"),
        ("45° elbow", "0.35"),
        ("Tee, into the branch", "1.80"),
        ("Tee, from the branch", "1.20"),
        ("Entrance, rounded / sharp / re-entrant", "0.05 / 0.50 / 0.80"),
        ("Sudden exit into a tank", "1.00"),
    ]
    right_rows = [
        ("Gate, full / ¾ / ½ / ¼", "0.15 / 1 / 4 / 16"),
        ("Globe plug, full / ½ / ¼", "9 / 36 / 112"),
        ("Ball, fully open", "0.05"),
        ("Ball, 28% of the turn", "486"),
    ]
    cells = make_table(doc, [7.15, 5.17]).rows[0].cells
    for cell in cells:
        cell_margins(cell, 20, 20, 40, 40)
    add_text(cells[0], "Fittings, each", size=11, color="8C4A2F", bold=True, after=2)
    ft = make_table(cells[0], [4.5, 2.3], rows=len(left_rows))
    for i, (name, k) in enumerate(left_rows):
        a, b = ft.rows[i].cells
        if i % 2 == 0:
            shade(a, "F4EFE6")
            shade(b, "F4EFE6")
        cell_margins(a, 20, 20, 60, 40)
        cell_margins(b, 20, 20, 40, 40)
        set_run(a.paragraphs[0].add_run(name), "Calibri", 10.5, "1C2420")
        set_run(b.paragraphs[0].add_run(k), "Consolas", 10.5, "1E4A38")
    add_text(cells[1], "Valves, by opening", size=11, color="8C4A2F", bold=True, after=2)
    vt = make_table(cells[1], [3.15, 1.7], rows=len(right_rows))
    for i, (name, k) in enumerate(right_rows):
        a, b = vt.rows[i].cells
        if i % 2 == 0:
            shade(a, "F4EFE6")
            shade(b, "F4EFE6")
        cell_margins(a, 20, 20, 60, 40)
        cell_margins(b, 20, 20, 40, 40)
        set_run(a.paragraphs[0].add_run(name), "Calibri", 10.5, "1C2420")
        set_run(b.paragraphs[0].add_run(k), "Consolas", 10.5, "1E4A38")
    add_text(cells[1], "Between tabulated openings, K is a power law in the opening fraction: a straight line on log–log paper. Below the lowest tabulated opening the same power is extended.", size=11, after=2)
    k_globe = valve_k("globe_valve", 0.25)
    dP_globe = k_globe * 0.5 * n["rho"] * n["v"] ** 2
    add_text(
        doc,
        f"On the default inlet, a fully open gate removes {n['dP_valve']/1000:.2f} kPa. The same inlet through a globe valve at quarter open, K = {k_globe:.0f}, removes {dP_globe/1000:.0f} kPa in that one station. Placement is geometric. layoutFittings spreads the requested elbows and tees across the free length, in catalog order, leaving a gap around the valve and the pump so two jumps never share a node. ΣK is reported, and so is an equivalent length (ΣK) D / f, as a reading. The march uses K directly.",
        size=12,
        before=4,
        after=3,
    )
    add_text(
        doc,
        "A line that leaves a still vessel does two things at node 0, after that node has been stored as the vessel. First a reversible acceleration: pressure falls by one velocity head ρv²/2, head loss is left unchanged, and cp ΔT = −β T v²/2. Then the entrance K, which is extra and irreversible. A sharp mouth is K = 0.5, so the static pressure falls by 1.5 velocity heads and the energy grade falls only by the half that was lost. Node 0 keeps the vessel pressure. A sudden exit does the matching thing at the far end: static pressure stays, h_L gains v²/(2g), and the temperature gains v²/(2 cp). In the tank the two grade lines meet, because the velocity head is omitted there.",
        size=12,
        after=2,
    )


def slide_pump(doc, figs, eqs, n):
    new_slide(doc)
    header(
        doc,
        "11   ·   THE PUMP",
        "A parabola of head, a bisection, a jump",
        "pump.ts owns the curves. PipeUnit owns the discontinuity on the line.",
    )
    picture(doc, figs["pump"], W)
    hs = line_head(n["model_duty"], 0.0)["h_static"]
    cells = make_table(doc, [6.16, 6.16]).rows[0].cells
    for c in cells:
        cell_margins(c, 20, 10, 40, 60)
    add_text(cells[0], "The curves", size=12, color="8C4A2F", bold=True, after=2)
    eq_block(cells[0], eqs["pump"], 5.8)
    add_text(
        cells[0],
        "Efficiency is a parabola through the origin and through twice the best-efficiency flow, with its peak at η_bep. NPSH required grows with (Q/Q_bep)² and is pinned to the manufacturer’s value at that flow. The system head uses inlet density and viscosity once:",
        size=11.5,
        after=2,
    )
    add_text(
        cells[0],
        "H_sys = Δz + (P_delivery − P_in)/(ρg) + f (L/D) v²/(2g) + ΣK v²/(2g) + (a_out − a_in) v²/(2g)",
        size=10.5,
        font="Consolas",
        after=2,
    )
    add_text(
        cells[0],
        f"a is 0 at a still vessel and 1 at an end that is still a pipe. Both ends of this preset are vessels, and the exit K of 1 already carries the velocity head, so it is not added again. The static head is {hs:.1f} m. Shutoff is 55 m, so a duty exists. Seventy bisections put it at {n['duty']['Q']*3600:.2f} m³/h and {n['duty']['H']:.1f} m, efficiency {n['eta_duty']*100:.0f}%.",
        size=11.5,
        after=2,
    )
    add_text(cells[1], "NPSH and the jump", size=12, color="8C4A2F", bold=True, after=2)
    eq_block(cells[1], eqs["npsh"], 5.8)
    add_text(
        cells[1],
        f"z1 = −(pump station) × (elevation rise). A pump partway up a rising line sits above the suction surface. On the duty preset, NPSHa is {n['npsha_d']:.1f} m and NPSHr is {n['npshr_d']:.1f} m. The hot-suction preset, water at 70 °C from 120 kPa with the pump halfway up a 12 m rise, comes out the other way: NPSHa {n['npsha_h']:.2f} m against NPSHr {n['npshr_h']:.2f} m. The margin is negative, and the casing is drawn as cavitating.",
        size=11.5,
        after=3,
    )
    add_text(
        cells[1],
        "When there is flow, the station applies ΔP = ρ g H and cp ΔT = g H (1/η − 1) + β T g H. The first temperature term is the part of the shaft work that heats the liquid. The second is reversible compression. h_L is unchanged through the pump: the grade line jumps by H, and the dissipation is carried by the temperature. The efficiency in that division is held at 0.08 or above. Brake power is ρ g Q H / η.",
        size=11.5,
        after=2,
    )


def slide_grades(doc, figs, n):
    new_slide(doc)
    header(
        doc,
        "12   ·   GRADE LINES",
        "Elevation, pressure, and velocity head",
        "After the nodes exist, both grades are arithmetic on the finished profiles.",
    )
    add_text(
        doc,
        "Hydraulic grade  HGL = z + P/(ρ g).    Energy grade  EGL = HGL + v²/(2g), except in a still vessel or a receiving tank, where the velocity head is omitted and the two grades meet.",
        size=12.5,
        after=3,
    )
    picture(doc, figs["grades"], W)
    g = n["grades"]
    iv = g["valve_idx"]
    step = (g["P"][iv] - g["P"][iv + 1]) / 1000
    add_text(
        doc,
        f"The figure is a full march: water, adiabatic, 1.5 m/s imposed in a 50 mm, 40 m commercial-steel line that rises 8 m. It leaves a vessel through a sharp mouth and enters a tank. A globe valve at half open, K = {n['K_globe_half']:.0f}, sits at 24 m. The pump is at 8 m and the parabola gives it {n['H_grade']:.1f} m of head at this flow, efficiency {n['eta_grade']*100:.0f}%. Outlet pressure is {g['y_out'][0]/1000:.1f} kPa. The step down at the valve, including the short run of friction and climb inside that one dx, is {step:.1f} kPa. At 1.5 m/s the velocity head is only {n['v_head']:.2f} m, so on the scale of a 20 m pump jump the energy grade lies on the hydraulic grade. They separate by that velocity head inside the pipe, and they meet in the tank.",
        size=12,
        after=2,
    )


def slide_picture(doc, figs, n):
    new_slide(doc)
    header(
        doc,
        "13   ·   THE PICTURE",
        "The canvas reads the profile",
        "radialProfile writes 41 samples of u(r) / v_mean. Every tracer interpolates that table.",
    )
    cells = make_table(doc, [6.05, 6.27]).rows[0].cells
    cell_margins(cells[0], 10, 10, 40, 70)
    cell_margins(cells[1], 0, 0, 20, 0)
    n_pow = n["profile"]["n"]
    u_cl = n["profile"]["centerline"]
    transit_real = n["L"] / n["v"]
    transit_shown = max(3.0, min(16.0, 2.6 * transit_real**0.42))
    add_text(
        cells[0],
        f"Laminar flow is the Hagen–Poiseuille parabola, u/v_mean = 2 [1 − (r/R)²], so the centreline is twice the mean. Turbulent flow is a power law with n = 1/√f, limited to the range 4 to 12. For this pipe n = {n_pow:.2f} and the centreline is {u_cl:.2f} times the mean. The mean-to-maximum ratio is 2n²/[(n+1)(2n+1)]. In the transition band the two shapes are blended linearly in Reynolds number. The dashed curve is that blend at Re = 3150.",
        size=12,
        after=3,
    )
    add_text(
        cells[0],
        "A tracer’s speed along the pipe, in display time, is (v_local / v_inlet) × (u(r) / v_mean) × (a throat factor). v_local comes from the solved profile, so a warmer, lighter liquid moves slightly faster and keeps the mass flow. The real transit of the default line is "
        f"{transit_real:.0f} s. The picture crosses in about {transit_shown:.0f} s, because the clock is scaled into a 3 to 16 second window. The speed ratios stay the ones from the solution.",
        size=12,
        after=3,
    )
    add_text(
        cells[0],
        "The throat factor is a drawing of the opening, and it is a different function from the loss coefficient. A gate squeezes from the side by the opening fraction. A globe or a ball squeezes toward the centre, and the globe’s drawn opening is 0.55 times the square root of the fraction. The pressure jump uses the tabulated K. The route turns a standard elbow at a centreline radius of one diameter and a long-radius elbow at 1.5 diameters; square elbows and tees are mitred. K remains a point at the station. Wakes, the turbulent cross-stream step scaled from 0.16 Re^(−1/8), and the outward drift of fast fluid in a bend are display motions. P and T stay the values the march wrote.",
        size=12,
        after=3,
    )
    add_text(
        cells[0],
        "Color is the selected profile, sampled along x. Each property has a minimum span, 0.1 °C for temperature and 1 kPa for pressure, so a change of a few hundredths of a degree stays a narrow band of color. Bubbles use the same rule: a station with P ≤ Psat grows vapor from there, and a negative NPSH margin collapses bubbles on the impeller.",
        size=12,
        after=2,
    )
    picture(cells[1], figs["profiles"], 6.05)


def slide_validity(doc, n):
    new_slide(doc)
    header(
        doc,
        "14   ·   VALIDITY",
        "The march finishes, then it says where it stopped",
        "checkValidity reads the finished profiles and leaves them as the march wrote them. An alert names the station where the drawing has left the single-phase liquid.",
    )
    cells = make_table(doc, [6.16, 6.16]).rows[0].cells
    shade(cells[0], "F8EFEA")
    shade(cells[1], "F4EFE6")
    cell_margins(cells[0], 80, 70, 110, 100)
    cell_margins(cells[1], 80, 70, 110, 100)
    add_text(cells[0], "ALERTS  ·  AN ASSUMPTION HAS FAILED", size=11, color="8E3B32", bold=True, after=4)
    for text in [
        "Inlet temperature below the freezing point, or a later station that has cooled through it.",
        "Inlet pressure at or below the vapor pressure, so the feed would boil rather than flow as a liquid.",
        "Any station where P(x) ≤ Psat(T(x)). The liquid would flash. Past that station a real line could not carry this flow as a single phase.",
        "NPSHa below NPSHr. The pump margin is negative.",
    ]:
        bullet(cells[0], text, size=11.5, after=3)
    add_text(cells[1], "WARNINGS  ·  THE MODEL IS STRAINED", size=11, color="8C4A2F", bold=True, after=4)
    for text in [
        "Valve cavitation: the recovered pressure still clears Psat, but by less than the valve drop, so the vena contracta is the likely cavitating point.",
        "Reynolds number inside 2300 to 4000. The friction factor there is an interpolation.",
        "Laminar entrance length 0.05 Re D larger than 5% of L. In the developing region the true drop exceeds the fully developed 64/Re value used here.",
        "A correlation evaluated outside the temperature range stored with its coefficients.",
        "NPSH margin under half a metre, a duty out at runout, or a shutoff head below the static head.",
        "An elevation request larger than the pipe, clipped to ±L.",
    ]:
        bullet(cells[1], text, size=11.5, after=3)
    ac = n["acetone"]
    i = n["i_flash"]
    add_text(
        doc,
        f"The flashing preset is acetone at 50 °C, 200 kPa, a globe valve at 40% open. The interpolated K is {n['K_acetone']:.1f}. Station {i} is at {ac['x'][i]:.1f} m, the first point after the valve: pressure there is {ac['P'][i]/1000:.1f} kPa and the vapor pressure is {ac['pvap'][i]/1000:.1f} kPa. The station upstream of the valve is still at {ac['P'][i-1]/1000:.1f} kPa. The march writes every station. The canvas grows vapor from that one. On the hot suction line the NPSH margin is {n['npsha_h']-n['npshr_h']:.1f} m, and the impeller is drawn with collapsing bubbles. Both flags were computed in calculate.",
        size=12.5,
        before=6,
        after=2,
    )


def slide_ownership(doc):
    new_slide(doc)
    header(
        doc,
        "15   ·   OWNERSHIP",
        "Each module owns one physical statement",
        "During a frame the information moves one way. Parameters go in. Local questions get local answers. PipeUnit is the only writer of profiles.",
    )
    rows = [
        ("correlations.ts", "The algebraic form of each equation number, and the fitted temperature range stored after the coefficients.", "A value at T, and whether T is inside the range."),
        ("property_service.ts", "Pure-species data to an SI liquid state. Expansivity by differentiating the density correlation.", "ρ, μ, cp, k, Psat, β, and any range warning."),
        ("friction.ts", "Darcy f(Re, ε/D), the roughness table, and valve K by log–log interpolation of the opening.", "f, the regime, and K."),
        ("fittings.ts", "How many fittings were asked for, and where along x they stand, clear of the valve and the pump.", "Stations, ΣK, and the suction K."),
        ("pump.ts", "H(Q), η(Q), NPSH required and available, system head, and the duty by bisection.", "Q, H, η, the two NPSH values, and a status."),
        ("pipe_unit.ts", "The march, the jumps, the grade lines, the metrics, the radial profile, and the validity checks.", "The whole result object."),
        ("moody_data.ts", "Background curves and this pipe’s curve, sampled from FrictionSolver.", "The Moody DiagramData."),
        ("main.ts", "One calculate per parameter edit. A property change reuses the stored result.", "The latest result, given to every panel."),
        ("Renderer, route, charts", "Color, particles, bend geometry, bubbles, and the plotted curves. Centreline radius 1 D or 1.5 D.", "The picture. Physics stays in the result."),
    ]
    table = make_table(doc, [2.35, 5.85, 4.12], rows=1 + len(rows))
    headers = ("Program", "Statement it owns", "What it hands on")
    for cell, text in zip(table.rows[0].cells, headers):
        shade(cell, "17352A")
        cell_margins(cell, 40, 40, 70, 60)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        set_run(p.add_run(text), "Calibri", 10.5, "F6F1E7", bold=True)
    for i, (a, b, c) in enumerate(rows):
        for cell, text, mono in zip(table.rows[i + 1].cells, (a, b, c), (True, False, False)):
            if i % 2 == 0:
                shade(cell, "F4EFE6")
            cell_margins(cell, 28, 28, 70, 50)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.space_before = Pt(0)
            set_run(p.add_run(text), "Consolas" if mono else "Calibri", 10, "1C2420", bold=mono)
    add_text(
        doc,
        "The tests call the same calculate. They hold the pipe against Towler & Sinnott Example 20.1, against the Hagen–Poiseuille limit, and against conservation of mass and energy, and they hold the friction factor against Colebrook and the laminar limit. The suite fails when a profile leaves those balances. A later unit would be another class with the same UnitOperation methods, its balances written down before the code, properties taken from PropertyService, and a renderer that consumes the result.",
        size=12,
        before=6,
        after=3,
    )
    add_text(
        doc,
        "Sources of the relations, as the code cites them: Towler & Sinnott, Chemical Engineering Design, 2nd ed., Chapter 20, for Darcy–Weisbach, the fitting and valve table, the pump and NPSH balances. Colebrook–White, Swamee–Jain (1976), and Churchill (1977) for the friction factor. ChemSep / DIPPR equation numbers as stored in compounds.json.",
        size=10.5,
        color="5E675F",
        after=0,
    )


def build():
    n, figs, eqs = build_all()
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(12)
    style.font.color.rgb = rgb("1C2420")
    style.paragraph_format.space_after = Pt(0)
    style.paragraph_format.space_before = Pt(0)
    style.paragraph_format.line_spacing = 1.05
    doc.core_properties.title = "Visualcheme — The mathematical and computational engine"
    doc.core_properties.subject = "How the pipe-flow engine integrates the balances, and how the picture reads the result"
    doc.core_properties.category = "Technical briefing"

    slide_cover(doc, figs)
    slide_question(doc)
    slide_architecture(doc, figs)
    slide_flow(doc, figs)
    slide_state(doc, figs, n)
    slide_properties(doc, figs, n)
    slide_balances(doc, figs, eqs)
    slide_code(doc, n)
    slide_rk4(doc, figs)
    slide_friction(doc, figs, eqs, n)
    slide_losses(doc, eqs, n)
    slide_pump(doc, figs, eqs, n)
    slide_grades(doc, figs, n)
    slide_picture(doc, figs, n)
    slide_validity(doc, n)
    slide_ownership(doc)

    OUT.mkdir(parents=True, exist_ok=True)
    doc.save(DOCX)
    print(f"Wrote {DOCX}")
    return n


def export_pdf():
    import win32com.client

    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    document = None
    try:
        document = word.Documents.Open(str(DOCX.resolve()))
        document.SaveAs(str(PDF.resolve()), FileFormat=17)
    finally:
        if document is not None:
            document.Close(False)
        word.Quit()
    print(f"Wrote {PDF}")


if __name__ == "__main__":
    build()
    export_pdf()
