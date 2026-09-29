import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'c:\Users\aaronvalverde\Desktop\Cerebro\visualcheme')

import fitz
from scripts.extract_knowledge_assets import extract_equation, extract_figure, extract_table

doc = fitz.open('Chemical Engineering Design, Principles, Second Edition.pdf')

EXTRACTION_PLAN = {
    'che-utilities-pinch': {
        'ch': 3,
        'eqs': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        'figs': ['1', '2', '3', '4', '5', '8', '12', '14', '15', '17', '18', '20', '21', '26', '28'],
        'tabs': ['1', '2', '3', '4']
    },
    'che-process-simulation': {
        'ch': 4,
        'eqs': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
        'figs': ['1', '2', '4', '5', '6', '7', '23'],
        'tabs': ['1', '2']
    },
    'che-instrumentation-control': {
        'ch': 5,
        'eqs': [],
        'figs': ['1', '2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
        'tabs': ['1', '2']
    },
    'che-equipment-specification': {
        'ch': 13,
        'eqs': [],
        'figs': [],
        'tabs': ['1', '2']
    },
    'che-reactors-mixers': {
        'ch': 15,
        'eqs': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34'],
        'figs': ['1', '7', '12', '13', '14', '15', '16', '17', '20', '25', '28'],
        'tabs': ['1', '5', '7']
    },
    'che-fluid-separators': {
        'ch': 16,
        'eqs': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
        'figs': ['11', '12', '13', '14', '15', '16'],
        'tabs': ['1', '2']
    },
    'che-distillation-columns': {
        'ch': 17,
        'eqs': ['1', '2', '3', '4', '5a', '5b', '6a', '6b', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18a', '19', '20', '21', '22', '36', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57'],
        'figs': ['1', '2', '5', '6', '7', '18', '23', '24', '25', '26', '33', '34', '37', '40', '43', '46', '47', '54'],
        'tabs': ['1', '2', '3']
    },
    'che-solids-handling': {
        'ch': 18,
        'eqs': ['1', '2', '3', '4', '5', '14', '15', '16', '17', '23', '24', '27', '28', '29', '30'],
        'figs': ['31', '32', '33', '34', '35', '49', '54', '56', '57', '60', '62', '65'],
        'tabs': ['1', '6', '10']
    },
    'che-heat-exchangers': {
        'ch': 19,
        'eqs': ['1', '2', '3a', '3b', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16a', '16b', '17', '18', '19', '20', '27', '28', '29', '30', '41', '42', '46', '47', '48', '56', '57', '58'],
        'figs': ['3', '4', '5', '6', '8', '14', '18', '19', '20', '21', '22', '23', '24', '26', '29', '30', '31', '46', '47', '48', '56', '58', '65', '68', '70'],
        'tabs': ['1', '2', '3', '4']
    },
    'che-fluid-transport-piping': {
        'ch': 20,
        'eqs': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '20', '21', '22', '23', '24', '25', '31', '32', '33'],
        'figs': ['1', '3', '5', '6', '11', '12', '13', '15', '16', '17', '20', '21'],
        'tabs': ['1', '2', '4', '5']
    }
}

for skill_name, cfg in EXTRACTION_PLAN.items():
    ch = cfg['ch']
    out_dir = os.path.join('.agents/skills', skill_name, 'images')
    os.makedirs(out_dir, exist_ok=True)
    print(f'\n=================== Extracting {skill_name} (Ch {ch}) ===================')
    
    # Equations
    for eq_id in cfg['eqs']:
        target = os.path.join(out_dir, f'eq_{ch}_{eq_id}.png')
        ok = extract_equation(doc, ch, eq_id, target, dpi=220)
        status = 'OK' if ok else 'FAIL'
        if not ok:
            print(f'  [WARN] Failed to extract Eq ({ch}.{eq_id})')
        else:
            print(f'  Eq ({ch}.{eq_id}) -> {target}')
            
    # Figures
    for fig_id in cfg['figs']:
        target = os.path.join(out_dir, f'fig_{ch}_{fig_id}.png')
        ok = extract_figure(doc, ch, fig_id, target, dpi=180)
        if not ok:
            print(f'  [WARN] Failed to extract Fig {ch}.{fig_id}')
        else:
            print(f'  Fig {ch}.{fig_id} -> {target}')
            
    # Tables
    for tab_id in cfg['tabs']:
        target = os.path.join(out_dir, f'tab_{ch}_{tab_id}.png')
        ok = extract_table(doc, ch, tab_id, target, dpi=180)
        if not ok:
            print(f'  [WARN] Failed to extract Tab {ch}.{tab_id}')
        else:
            print(f'  Tab {ch}.{tab_id} -> {target}')

print('\nExtraction plan execution complete!')
