import os, re, sys
import fitz
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

CHAPTER_PAGES = {
    3: (114, 169),
    4: (172, 242),
    5: (262, 275),
    13: (566, 571),
    15: (640, 758),
    16: (762, 814),
    17: (816, 941),
    18: (946, 1054),
    19: (1056, 1210),
    20: (1216, 1272)
}

def get_page_range(ch):
    s, e = CHAPTER_PAGES[ch]
    return range(s - 1, e)

def extract_equation(doc, ch, eq_id, out_path, dpi=200):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pat = re.compile(rf'\({ch}\.{eq_id}\)')
    for p_idx in get_page_range(ch):
        page = doc[p_idx]
        blocks = page.get_text('blocks')
        drawings = page.get_drawings()
        
        for b in blocks:
            if pat.search(b[4]):
                b_rect = fitz.Rect(b[:4])
                y_center = (b_rect.y0 + b_rect.y1) / 2
                
                formula_rects = []
                for b2 in blocks:
                    r2 = fitz.Rect(b2[:4])
                    if abs((r2.y0 + r2.y1) / 2 - y_center) < 35:
                        txt2 = b2[4].strip()
                        # Exclude large body paragraphs
                        is_para = (r2.x0 < 75 and r2.width > 350 and (' ' in txt2) and any(w in txt2.lower() for w in ['where ', 'the ', 'from ', 'and, ', 'which ', 'substituting ']))
                        if not is_para:
                            formula_rects.append(r2)
                for d in drawings:
                    r_d = fitz.Rect(d['rect'])
                    if abs((r_d.y0 + r_d.y1) / 2 - y_center) < 30:
                        formula_rects.append(r_d)
                
                if not formula_rects:
                    formula_rects = [b_rect]
                    
                x0 = min(r.x0 for r in formula_rects) - 12
                y0 = min(r.y0 for r in formula_rects) - 8
                x1 = max(r.x1 for r in formula_rects) + 12
                y1 = max(r.y1 for r in formula_rects) + 8
                
                # Make sure label is included
                x1 = max(x1, b_rect.x1 + 10)
                
                clip_rect = fitz.Rect(max(30, x0), max(20, y0), min(page.rect.width - 30, x1), min(page.rect.height - 20, y1))
                pix = page.get_pixmap(clip=clip_rect, dpi=dpi)
                pix.save(out_path)
                return True
    return False

def extract_figure(doc, ch, fig_id, out_path, dpi=180, padding=12):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pat = re.compile(rf'\bFIGURE\s+{ch}\.{fig_id}\b', re.IGNORECASE)
    
    for p_idx in get_page_range(ch):
        page = doc[p_idx]
        blocks = page.get_text('blocks')
        for b in blocks:
            lines = b[4].strip().split('\n')
            if any(pat.search(l) for l in lines):
                cap_rect = fitz.Rect(b[:4])
                
                drawings = page.get_drawings()
                above_drawings = [d['rect'] for d in drawings if d['rect'].y1 <= cap_rect.y1 + 5 and d['rect'].y0 >= cap_rect.y0 - 520]
                below_drawings = [d['rect'] for d in drawings if d['rect'].y0 >= cap_rect.y0 - 5 and d['rect'].y1 <= cap_rect.y1 + 520]
                
                images = page.get_images()
                img_rects = []
                for img in images:
                    for r in page.get_image_rects(img[0]):
                        img_rects.append(r)
                        
                above_imgs = [r for r in img_rects if r.y1 <= cap_rect.y1 + 5 and r.y0 >= cap_rect.y0 - 520]
                below_imgs = [r for r in img_rects if r.y0 >= cap_rect.y0 - 5 and r.y1 <= cap_rect.y1 + 520]
                
                fig_rect = fitz.Rect(cap_rect)
                content_above = len(above_drawings) + len(above_imgs)
                content_below = len(below_drawings) + len(below_imgs)
                
                if content_above >= content_below and content_above > 0:
                    for r in above_drawings + above_imgs:
                        fig_rect |= r
                elif content_below > 0:
                    for r in below_drawings + below_imgs:
                        fig_rect |= r
                else:
                    fig_rect = fitz.Rect(
                        max(36, cap_rect.x0 - 40),
                        max(36, cap_rect.y0 - 240),
                        min(page.rect.width - 36, cap_rect.x1 + 300),
                        cap_rect.y1 + 10
                    )
                    
                fig_rect.x0 = max(20, fig_rect.x0 - padding)
                fig_rect.x1 = min(page.rect.width - 20, fig_rect.x1 + padding)
                fig_rect.y0 = max(20, fig_rect.y0 - padding)
                fig_rect.y1 = min(page.rect.height - 20, fig_rect.y1 + padding)
                
                pix = page.get_pixmap(clip=fig_rect, dpi=dpi)
                pix.save(out_path)
                return True
    return False

def extract_table(doc, ch, tab_id, out_path, dpi=180):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pat = re.compile(rf'\bTABLE\s+{ch}\.{tab_id}\b', re.IGNORECASE)
    
    for p_idx in get_page_range(ch):
        page = doc[p_idx]
        blocks = page.get_text('blocks')
        for b in blocks:
            if pat.search(b[4]):
                cap_rect = fitz.Rect(b[:4])
                drawings = [d['rect'] for d in page.get_drawings()]
                table_drawings = [d for d in drawings if d.y0 >= cap_rect.y0 - 5 and d.y1 <= cap_rect.y1 + 580]
                table_rect = fitz.Rect(cap_rect)
                if table_drawings:
                    for d in table_drawings:
                        table_rect |= d
                else:
                    table_rect = fitz.Rect(36, cap_rect.y0 - 5, page.rect.width - 36, min(page.rect.height - 36, cap_rect.y1 + 400))
                
                table_rect.x0 = max(20, table_rect.x0 - 10)
                table_rect.x1 = min(page.rect.width - 20, table_rect.x1 + 10)
                table_rect.y0 = max(20, table_rect.y0 - 8)
                table_rect.y1 = min(page.rect.height - 20, table_rect.y1 + 10)
                
                pix = page.get_pixmap(clip=table_rect, dpi=dpi)
                pix.save(out_path)
                return True
    return False
