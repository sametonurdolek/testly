# testly_backend/services/processing.py
from pathlib import Path
from typing import Tuple, Dict, Any
import os

import cv2 as cv
import numpy as np

# Senin hattın:
from .refined_question_pipeline import (
    imread_u, imwrite_u,
    page_crop_user, refine_question_from_pagecrop
)

def process_file(input_path: str, output_dir: str, show: bool = False) -> Tuple[bool, str, Dict[str, Any]]:
    """
    input_path -> page crop -> refine -> outputs/<stem>_final.png
    """
    try:
        output_dir_p = Path(output_dir)
        output_dir_p.mkdir(parents=True, exist_ok=True)

        bgr = imread_u(input_path, cv.IMREAD_COLOR)
        if bgr is None:
            return False, "", {"error": "read_fail"}

        pc, pc_stages = page_crop_user(bgr, debug=show)
        out = refine_question_from_pagecrop(pc, invert_to_black_text=True, debug=show)

        if out.get("final_bw") is None:
            return False, "", {"error": "no_candidate"}

        stem = Path(input_path).stem
        base = f"{stem}_final"
        out_path = output_dir_p / f"{base}.png"
        i = 1
        while out_path.exists():
            out_path = output_dir_p / f"{base}_{i}.png"
            i += 1

        ok = imwrite_u(str(out_path), out["final_bw"])
        if not ok:
            return False, "", {"error": "write_fail"}

        meta = {
            "best_box": np.array(out.get("best_box")).tolist() if out.get("best_box") is not None else None,
            "width": int(out["final_bw"].shape[1]),
            "height": int(out["final_bw"].shape[0]),
        }
        return True, str(out_path), meta

    except Exception as e:
        return False, "", {"exception": str(e)}
