import xml.etree.ElementTree as ET
import json
import os

def refine_compounds():
    xml_path = 'src/core/database/raw/chemsep1.xml'
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    compounds = {}
    
    for c in root.findall('.//compound'):
        cid_elem = c.find('CompoundID')
        if cid_elem is None or not cid_elem.attrib.get('value'):
            continue
            
        name = cid_elem.attrib.get('value').strip()
        
        def get_val(tag, default=0.0):
            elem = c.find(tag)
            if elem is not None and elem.attrib.get('value'):
                try:
                    return float(elem.attrib.get('value'))
                except:
                    return elem.attrib.get('value')
            return default
            
        def get_model(tag):
            elem = c.find(tag)
            if elem is not None:
                raw_coeffs = []
                for ch in list(elem):
                    v = ch.attrib.get('value')
                    if v is not None:
                        try:
                            raw_coeffs.append(float(v))
                        except:
                            raw_coeffs.append(0.0)
                if len(raw_coeffs) >= 2:
                    eq_id = int(raw_coeffs[0])
                    # usually last 2 are Tmin and Tmax if len >= 6
                    coeffs = raw_coeffs[1:]
                    return {
                        'eq': eq_id,
                        'units': elem.attrib.get('units', ''),
                        'coeffs': coeffs
                    }
            return None
            
        formula_elem = c.find('StructureFormula')
        formula = formula_elem.attrib.get('value') if formula_elem is not None else ''
        
        cas_elem = c.find('CAS')
        cas = cas_elem.attrib.get('value') if cas_elem is not None else ''

        compound = {
            'name': name,
            'formula': formula,
            'cas': cas,
            'mw': get_val('MolecularWeight'),
            'tc': get_val('CriticalTemperature'),
            'pc': get_val('CriticalPressure'),
            'vc': get_val('CriticalVolume'),
            'zc': get_val('CriticalCompressibility'),
            'omega': get_val('AcentricFactor'),
            'tb': get_val('NormalBoilingPointTemperature'),
            'tf': get_val('NormalMeltingPointTemperature'),
            'hf': get_val('HeatOfFormation'),
            'parachor': get_val('Parachor'),
            'pv_model': get_model('VaporPressure'),
            'antoine_model': get_model('AntoineVaporPressure'),
            'rho_l_model': get_model('LiquidDensity'),
            'mu_l_model': get_model('LiquidViscosity'),
            'mu_v_model': get_model('VaporViscosity'),
            'k_l_model': get_model('LiquidThermalConductivity'),
            'k_v_model': get_model('VaporThermalConductivity'),
            'hvap_model': get_model('HeatOfVaporization'),
            'cp_ig_model': get_model('IdealGasHeatCapacityCp'),
            'cp_l_model': get_model('LiquidHeatCapacityCp')
        }
        compounds[name] = compound
        
    out_file = 'src/core/database/compounds.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(compounds, f, indent=2)
    print(f"Refined {len(compounds)} compounds to {out_file}")

if __name__ == '__main__':
    refine_compounds()
