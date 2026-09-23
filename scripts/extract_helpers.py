import pymupdf
import re
import os

CHAPTER_PAGES = {
    3: (114, 169),
    4: (172, 242),
    5: (262, 275),
    13: (566, 570),
    15: (640, 758),
    16: (762, 814),
    17: (816, 941),
    18: (946, 1054),
    19: (1056, 1210),
    20: (1216, 1272)
}

def get_page_range(ch):
    if ch in CHAPTER_PAGES:
        s, e = CHAPTER_PAGES[ch]
        return range(s - 1, min(len(pymupdf.open('Chemical Engineering Design, Principles, Second Edition.pdf')), e))
    return range(1437)

def crop_equation(doc, ch, num, out_path, dpi=200):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pat = re.compile(rf'\({ch}\.{num}\)')
    page_indices = get_page_range(ch)
    
    for p_idx in page_indices:
        page = doc[p_idx]
        blocks = page.get_text('blocks')
        for b in blocks:
            if pat.search(b[4]):
                eq_rect = pymupdf.Rect(b[:4])
                y_center = (eq_rect.y0 + eq_rect.y1) / 2
                strip_rect = pymupdf.Rect(40, y_center - 28, page.rect.width - 40, y_center + 28)
                for b2 in blocks:
                    r2 = pymupdf.Rect(b2[:4])
                    if abs((r2.y0 + r2.y1)/2 - y_center) < 26:
                        strip_rect |= r2
                for d in page.get_drawings():
                    r_d = pymupdf.Rect(d['rect'])
                    if abs((r_d.y0 + r_d.y1)/2 - y_center) < 24:
                        strip_rect |= r_d
                strip_rect.x0 = max(25, strip_rect.x0 - 10)
                strip_rect.x1 = min(page.rect.width - 25, strip_rect.x1 + 10)
                strip_rect.y0 = max(20, strip_rect.y0 - 6)
                strip_rect.y1 = min(page.rect.height - 20, strip_rect.y1 + 6)
                
                pix = page.get_pixmap(clip=strip_rect, dpi=dpi)
                pix.save(out_path)
                return True
    return False

def crop_table(doc, ch, num, out_path, dpi=180):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pat = re.compile(rf'\bTABLE\s+{ch}\.{num}\b', re.IGNORECASE)
    page_indices = get_page_range(ch)
    
    for p_idx in page_indices:
        page = doc[p_idx]
        blocks = page.get_text('blocks')
        for b in blocks:
            if pat.search(b[4]):
                cap_rect = pymupdf.Rect(b[:4])
                drawings = [d['rect'] for d in page.get_drawings()]
                table_drawings = [d for d in drawings if d.y0 >= cap_rect.y0 - 5 and d.y1 <= cap_rect.y1 + 550]
                table_rect = pymupdf.Rect(cap_rect)
                if table_drawings:
                    for d in table_drawings:
                        table_rect |= d
                else:
                    table_rect = pymupdf.Rect(36, cap_rect.y0 - 5, page.rect.width - 36, min(page.rect.height - 36, cap_rect.y1 + 350))
                table_rect.x0 = max(20, table_rect.x0 - 10)
                table_rect.x1 = min(page.rect.width - 20, table_rect.x1 + 10)
                table_rect.y0 = max(20, table_rect.y0 - 8)
                table_rect.y1 = min(page.rect.height - 20, table_rect.y1 + 10)
                pix = page.get_pixmap(clip=table_rect, dpi=dpi)
                pix.save(out_path)
                return True
    return False

def crop_figure(doc, ch_num, fig_num, target_path, dpi=150, padding=12):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    pattern = re.compile(rf'\bFIGURE\s+{ch_num}\.{fig_num}\b', re.IGNORECASE)
    page_indices = get_page_range(ch_num)
    
    found_page = None
    cap_rect = None
    
    for p_idx in page_indices:
        page = doc[p_idx]
        blocks = page.get_text('blocks')
        for b in blocks:
            lines = b[4].strip().split('\n')
            for line in lines:
                if pattern.search(line):
                    found_page = page
                    cap_rect = pymupdf.Rect(b[:4])
                    break
            if cap_rect:
                break
        if cap_rect:
            break
            
    if not found_page or not cap_rect:
        return False
        
    page = found_page
    drawings = page.get_drawings()
    
    above_drawings = [d['rect'] for d in drawings if d['rect'].y1 <= cap_rect.y1 + 5 and d['rect'].y0 >= cap_rect.y0 - 500]
    below_drawings = [d['rect'] for d in drawings if d['rect'].y0 >= cap_rect.y0 - 5 and d['rect'].y1 <= cap_rect.y1 + 500]
    
    images = page.get_images()
    img_rects = []
    for img in images:
        for r in page.get_image_rects(img[0]):
            img_rects.append(r)
            
    above_imgs = [r for r in img_rects if r.y1 <= cap_rect.y1 + 5 and r.y0 >= cap_rect.y0 - 450]
    below_imgs = [r for r in img_rects if r.y0 >= cap_rect.y0 - 5 and r.y1 <= cap_rect.y1 + 450]
    
    fig_rect = pymupdf.Rect(cap_rect)
    
    content_above = len(above_drawings) + len(above_imgs)
    content_below = len(below_drawings) + len(below_imgs)
    
    if content_above >= content_below and content_above > 0:
        for r in above_drawings + above_imgs:
            fig_rect |= r
    elif content_below > 0:
        for r in below_drawings + below_imgs:
            fig_rect |= r
    else:
        fig_rect = pymupdf.Rect(
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
    pix.save(target_path)
    return True
