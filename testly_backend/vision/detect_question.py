import cv2 as cv
from .refined_question_pipeline import page_crop_user, refine_question_from_pagecrop

def process_question(bgr):
    """
    Tek fotoğraf için:
    1. Sayfayı kırp
    2. Soru kutusunu bul ve perspektif düzelt
    3. Siyah yazı, beyaz zemin olarak döndür
    """
    page_crop, _ = page_crop_user(bgr, debug=False)
    out = refine_question_from_pagecrop(page_crop, invert_to_black_text=True, debug=False)
    return out["final_bw"]
