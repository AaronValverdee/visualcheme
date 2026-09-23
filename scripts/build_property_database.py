import xml.etree.ElementTree as ET
import json
import os
import re

def parse_chemsep():
    xml_path = 'src/core/database/raw/chemsep1.xml'
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    compounds = {}
    
    for c in root.findall('.//compound'):
        cid_elem = c.find('CompoundID')
        if cid_elem is None or not cid_elem.attrib.get('value'):
            continue
            
        name = cid_elem.attrib.get('value').strip()
        
        # Helper to extract scalar value
        def get_val(tag, default=None):
            elem = c.find(tag)
            if elem is not None and elem.attrib.get('value'):
                try:
                    return float(elem.attrib.get('value'))
                except:
                    return elem.attrib.get('value')
            return default
            
        # Helper to extract equation coefficients
        def get_coeffs(tag):
            elem = c.find(tag)
            if elem is not None:
                coeffs = []
                for ch in list(elem):
                    v = ch.attrib.get('value')
                    if v is not None:
                        try:
                            coeffs.append(float(v))
                        except:
                            coeffs.append(v)
                if coeffs:
                    return {
                        'eq': elem.attrib.get('eq', ''),
                        'units': elem.attrib.get('units', ''),
                        'coeffs': coeffs
                    }
            return None
            
        formula_elem = c.find('StructureFormula')
        formula = formula_elem.attrib.get('value') if formula_elem is not None else ''
        
        cas_elem = c.find('CAS')
        cas = cas_elem.attrib.get('value') if cas_elem is not None else ''

        compound_data = {
            'name': name,
            'formula': formula,
            'cas': cas,
            'mw': get_val('MolecularWeight', 0.0),
            'tc': get_val('CriticalTemperature', 0.0),
            'pc': get_val('CriticalPressure', 0.0),
            'vc': get_val('CriticalVolume', 0.0),
            'zc': get_val('CriticalCompressibility', 0.0),
            'omega': get_val('AcentricFactor', 0.0),
            'tb': get_val('NormalBoilingPointTemperature', 0.0),
            'tf': get_val('NormalMeltingPointTemperature', 0.0),
            'hf': get_val('HeatOfFormation', 0.0),
            'antoine': get_coeffs('AntoineVaporPressure'),
            'pv_dippr': get_coeffs('VaporPressure'),
            'rho_l_dippr': get_coeffs('LiquidDensity'),
            'mu_l_dippr': get_coeffs('LiquidViscosity'),
            'hvap_dippr': get_coeffs('HeatOfVaporization'),
            'cp_ig': get_coeffs('IdealGasHeatCapacityCp'),
            'cp_l': get_coeffs('LiquidHeatCapacityCp'),
            'wilson_volume': get_val('WilsonVolume', 0.0),
            'chao_seader_volume': get_val('ChaoSeaderLiquidVolume', 0.0)
        }
        
        compounds[name] = compound_data
        
    out_json = 'src/core/database/compounds.json'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(compounds, f, indent=2)
    print(f"Successfully exported {len(compounds)} compounds to {out_json}")
    return compounds

def parse_nrtl():
    dat_path = 'src/core/database/raw/nrtl.dat'
    pairs = []
    with open(dat_path, 'r', encoding='latin1') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('===') or ';' not in line:
                continue
            parts = line.split(';')
            if len(parts) >= 6:
                try:
                    id1 = int(parts[0])
                    id2 = int(parts[1])
                    a12 = float(parts[2])
                    a21 = float(parts[3])
                    alpha = float(parts[4])
                    comment = parts[5].strip()
                    pairs.append({
                        'id1': id1,
                        'id2': id2,
                        'a12_cal_mol': a12,
                        'a21_cal_mol': a21,
                        'alpha': alpha,
                        'system': comment
                    })
                except:
                    pass
    out_json = 'src/core/database/binary_nrtl.json'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(pairs, f, indent=2)
    print(f"Successfully exported {len(pairs)} NRTL binary parameter pairs to {out_json}")

def parse_pr_kij():
    dat_path = 'src/core/database/raw/kij_pr.dat'
    with open(dat_path, 'r', encoding='latin1') as f:
        lines = [l.strip() for l in f if l.strip()]
        
    header = lines[0].split(';')[1:]
    matrix = {}
    for line in lines[1:]:
        parts = line.split(';')
        comp_name = parts[0]
        matrix[comp_name] = {}
        for idx, val in enumerate(parts[1:]):
            if idx < len(header):
                other_comp = header[idx]
                val = val.strip()
                if val and val != '-':
                    try:
                        matrix[comp_name][other_comp] = float(val)
                    except:
                        pass
    out_json = 'src/core/database/binary_pr.json'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(matrix, f, indent=2)
    print(f"Successfully exported Peng-Robinson kij matrix ({len(matrix)} species) to {out_json}")

if __name__ == '__main__':
    parse_chemsep()
    parse_nrtl()
    parse_pr_kij()
