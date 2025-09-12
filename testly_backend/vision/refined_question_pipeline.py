# refined_question_pipeline.py
# Python 3.9+  |  pip install opencv-python numpy matplotlib

import os, glob, math
from pathlib import Path
import cv2 as cv
import numpy as np
import matplotlib.pyplot as plt

# ---------- IO helpers (Unicode-safe) ----------
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

def is_image(p: str) -> bool:
    return os.path.splitext(p)[1].lower() in IMG_EXTS

def imread_u(path: str, flags=cv.IMREAD_COLOR):
    data = np.fromfile(path, dtype=np.uint8)
    return cv.imdecode(data, flags)

def imwrite_u(path: str, img) -> bool:
    ext = os.path.splitext(path)[1] or ".png"
    ok, buf = cv.imencode(ext, img)
    if ok: buf.tofile(path)
    return ok

# ---------- small utils ----------
def _odd(x: int) -> int:
    return int(x) | 1

def auto_block_size(h, w, frac=0.022, minv=21, maxv=151):
    k = _odd(int(round(min(h, w) * frac)))
    return max(minv, min(k, maxv))

def order_quad(pts):
    pts = np.array(pts, dtype=np.float32).reshape(4, 2)
    s = pts.sum(1); d = np.diff(pts, axis=1).ravel()
    tl = pts[np.argmin(s)]; br = pts[np.argmax(s)]
    tr = pts[np.argmin(d)]; bl = pts[np.argmax(d)]
    return np.array([tl, tr, bl, br], dtype=np.float32)  # tl, tr, bl, br

def perspective_warp(bgr, box):
    box = order_quad(box)
    w = int(round(np.linalg.norm(box[1] - box[0])))
    h = int(round(np.linalg.norm(box[2] - box[0])))
    w = max(w, 10); h = max(h, 10)
    dst = np.array([[0,0],[w-1,0],[0,h-1],[w-1,h-1]], dtype=np.float32)
    M = cv.getPerspectiveTransform(box, dst)
    return cv.warpPerspective(bgr, M, (w, h), flags=cv.INTER_CUBIC, borderValue=(255,255,255))

def projection_lobes(mask_roi, axis=1, thr_frac=0.12):
    sums = (mask_roi > 0).sum(axis=axis)
    thr = max(3, int(round(thr_frac * (mask_roi.shape[0 if axis==1 else 1]))))
    runs = 0; in_run = False
    for v in sums:
        if v >= thr:
            if not in_run: runs += 1; in_run = True
        else:
            in_run = False
    return runs

def gaussian_score(x, mu, tol):
    if tol <= 0: return 0.0
    z = (x - mu) / (tol + 1e-6)
    return float(np.exp(-0.5 * z * z))

def clamp01(x): return max(0.0, min(1.0, float(x)))

# ---------- YOUR PAGE CROP (integrated) ----------
def page_crop_user(bgr, debug=True):
    """
    Gray+CLAHE -> adaptive thr -> invert -> %80 merkez maskesi ->
    küçük bileşen temizliği -> dilate(H->V) -> close ->
    en büyük dış kontur boundingRect ile kırp.
    """
    H, W = bgr.shape[:2]
    k = max(3, round(W / 400))
    images = [] if debug else None

    g = cv.cvtColor(bgr, cv.COLOR_BGR2GRAY)
    g = cv.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(g)
    if debug: images.append(("Gray+CLAHE (PC)", g))

    thr = cv.adaptiveThreshold(g, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv.THRESH_BINARY, 2 * k + 1, 10)
    binv = cv.bitwise_not(thr)

    mask = np.zeros_like(binv, dtype=np.uint8)
    scale = np.sqrt(0.8)
    new_W = int(W * scale); new_H = int(H * scale)
    x1 = (W - new_W) // 2; y1 = (H - new_H) // 2
    x2 = x1 + new_W;       y2 = y1 + new_H
    cv.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
    binv = cv.bitwise_and(binv, mask)
    if debug: images.append(("Thr Invert + 80% Center Mask (PC)", binv))

    num, labels, stats, _ = cv.connectedComponentsWithStats(binv, 8)
    clean = np.zeros_like(binv)
    for i in range(1, num):
        if stats[i, cv.CC_STAT_AREA] >= 0.00005 * W * H:
            clean[labels == i] = 255
    if debug: images.append(("Noise Clean (PC)", clean))

    ker_h = cv.getStructuringElement(cv.MORPH_RECT, (10 * k, 3))
    merged = cv.dilate(clean, ker_h, iterations=1)
    ker_v = cv.getStructuringElement(cv.MORPH_RECT, (3, 35 * k))
    merged = cv.dilate(merged, ker_v, iterations=1)
    if debug: images.append(("Dilate HV (PC)", merged))

    ker_c = cv.getStructuringElement(cv.MORPH_RECT, (5 * k, 5 * k))
    merged = cv.morphologyEx(merged, cv.MORPH_CLOSE, ker_c, iterations=2)
    if debug: images.append(("Closing (PC)", merged))

    cnts, _ = cv.findContours(merged, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if not cnts:
        if debug: images.append(("Page Crop (fallback orig)", bgr))
        return bgr, (images or [])
    page_contour = max(cnts, key=cv.contourArea)
    x_p, y_p, w_p, h_p = cv.boundingRect(page_contour)
    page_crop = bgr[y_p:y_p + h_p, x_p:x_p + w_p]
    if debug: images.append(("Page Crop", page_crop))
    return page_crop, (images or [])

# ---------- core refine on a *page-cropped* image ----------
def refine_question_from_pagecrop(page_crop_bgr, invert_to_black_text=True, debug=True):
    stages = []
    bgr = page_crop_bgr.copy()
    H, W = bgr.shape[:2]
    k = max(3, round(W / 400))

    g = cv.cvtColor(bgr, cv.COLOR_BGR2GRAY)
    g = cv.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(g)
    if debug: stages.append(("Gray+CLAHE", g))

    blk = auto_block_size(H, W)
    thr = cv.adaptiveThreshold(g, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv.THRESH_BINARY, blk, 10)
    binv = 255 - thr
    if debug: stages.append(("Adaptive thr -> text white", binv))

    num, lbl, stats, _ = cv.connectedComponentsWithStats(binv, 8)
    clean = np.zeros_like(binv)
    area_min = 0.00005 * W * H
    for i in range(1, num):
        if stats[i, cv.CC_STAT_AREA] >= area_min:
            clean[lbl == i] = 255
    if debug: stages.append(("Small component removal", clean))

    ker_h = cv.getStructuringElement(cv.MORPH_RECT, (10*k, 3))
    ker_v = cv.getStructuringElement(cv.MORPH_RECT, (3, 35*k))
    ker_c = cv.getStructuringElement(cv.MORPH_RECT, (5*k, 5*k))
    merged = cv.dilate(clean, ker_h, 1)
    merged = cv.dilate(merged, ker_v, 1)
    merged = cv.morphologyEx(merged, cv.MORPH_CLOSE, ker_c, iterations=2)
    if debug: stages.append(("HV dilate + close", merged))

    cnts, _ = cv.findContours(merged, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return {"best_box": None, "warped_bgr": None, "final_bw": None, "stages": stages}

    best = None
    best_score = -1.0
    overlay = bgr.copy()

    for c in cnts:
        area = cv.contourArea(c)
        if area < 0.01 * W * H: continue

        x,y,w,h = cv.boundingRect(c)
        if w*h == 0: continue

        extent = area / (w*h + 1e-6)
        hull = cv.convexHull(c)
        solidity = area / (cv.contourArea(hull) + 1e-6)
        rect = cv.minAreaRect(c)
        box = cv.boxPoints(rect).astype(np.float32)
        rect_area = max(rect[1][0]*rect[1][1], 1.0)
        rectangularity = area / rect_area
        ar = w / float(h) if h>0 else 0.0

        cx, cy = x + w/2.0, y + h/2.0
        dist = math.hypot(cx - W/2.0, cy - H/2.0)
        center_score = clamp01(1.0 - dist / (math.hypot(W/2.0, H/2.0) + 1e-6))

        roi = clean[max(0,y):min(H,y+h), max(0,x):min(W,x+w)]
        if roi.size == 0: continue
        v_lobes = projection_lobes(roi, axis=1, thr_frac=0.12)
        h_lobes = projection_lobes(roi, axis=0, thr_frac=0.12)

        if max(v_lobes, h_lobes) >= 3:
            target_rect_mu, target_rect_tol = 0.70, 0.20
            target_extent_mu, target_extent_tol = 0.65, 0.20
            ar_pref_mu, ar_pref_tol = 1.0, 0.8
            w_rect, w_ext, w_sol, w_ctr, w_ar = 0.30, 0.25, 0.20, 0.10, 0.15
        elif max(v_lobes, h_lobes) == 2:
            target_rect_mu, target_rect_tol = 0.80, 0.15
            target_extent_mu, target_extent_tol = 0.72, 0.18
            ar_pref_mu, ar_pref_tol = 1.0, 0.6
            w_rect, w_ext, w_sol, w_ctr, w_ar = 0.35, 0.25, 0.20, 0.10, 0.10
        else:
            target_rect_mu, target_rect_tol = 0.92, 0.10
            target_extent_mu, target_extent_tol = 0.85, 0.12
            ar_pref_mu, ar_pref_tol = 1.0, 0.5
            w_rect, w_ext, w_sol, w_ctr, w_ar = 0.45, 0.20, 0.20, 0.10, 0.05

        rectangularity_score = gaussian_score(rectangularity, target_rect_mu, target_rect_tol)
        extent_score        = gaussian_score(extent,        target_extent_mu, target_extent_tol)
        solidity_score      = clamp01(solidity)
        ar_score            = gaussian_score(ar, ar_pref_mu, ar_pref_tol)

        score = (
            w_rect * rectangularity_score +
            w_ext  * extent_score +
            w_sol  * solidity_score +
            w_ctr  * center_score +
            w_ar   * ar_score
        )

        fill = area / (W*H + 1e-6)
        if fill < 0.10: score -= (0.10 - fill) * 1.5
        if fill > 0.95: score -= (fill - 0.95) * 3.0

        if score > best_score:
            best_score = score
            best = (box, score)

        cv.polylines(overlay, [box.astype(np.int32)], True, (0,255,0), 2)
        cv.putText(overlay, f"{score:.2f}", (x, max(0,y-5)),
                   cv.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,255), 1, cv.LINE_AA)

    if debug: stages.append(("Candidates overlay", overlay))

    if best is None:
        return {"best_box": None, "warped_bgr": None, "final_bw": None, "stages": stages}

    best_box, _ = best

    warped = perspective_warp(bgr, best_box)
    if debug: stages.append(("Warped (perspective rectified)", warped))

    wg = cv.cvtColor(warped, cv.COLOR_BGR2GRAY)
    blk_w = auto_block_size(*wg.shape)
    bw = cv.adaptiveThreshold(wg, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                              cv.THRESH_BINARY_INV, blk_w, 8)
    if invert_to_black_text:
        bw = 255 - bw
    if debug: stages.append(("Final BW", bw))

    return {"best_box": best_box, "warped_bgr": warped, "final_bw": bw, "stages": stages}

def _show_stages(stages):
    n = len(stages); cols = 3; rows = (n + cols - 1) // cols
    plt.figure(figsize=(16, 5*rows))
    for i, (title, im) in enumerate(stages, 1):
        plt.subplot(rows, cols, i)
        if im.ndim == 2: plt.imshow(im, cmap="gray")
        else:            plt.imshow(cv.cvtColor(im, cv.COLOR_BGR2RGB))
        plt.title(title); plt.axis("off")
    plt.tight_layout(); plt.show()

# ---------- batch runner (save only finals to sonsoru) ----------
SCRIPT_DIR = Path(__file__).resolve().parent

def run_folder_with_pagecrop(input_dir="sorular",
                             save_dir=None,
                             show=False):
    # Varsayılan: <script_dizini>/sonsoru  (çift "vision" oluşmaz)
    save_dir = Path(save_dir) if save_dir else (SCRIPT_DIR / "sonsoru")
    save_dir.mkdir(parents=True, exist_ok=True)
    print(f"[save_dir] {save_dir.resolve()}")

    # Alt klasörleri de tara
    paths = sorted([
        p for p in glob.glob(str(Path(input_dir) / "**" / "*"), recursive=True)
        if is_image(p)
    ])
    print(f"[info] files: {len(paths)}")
    if not paths:
        print(f"[warn] no images under {Path(input_dir).resolve()}")
        return

    for idx, p in enumerate(paths, 1):
        print(f"[{idx}/{len(paths)}] {p}")
        bgr = imread_u(p, cv.IMREAD_COLOR)
        if bgr is None:
            print(f"[err] read fail: {p}")
            continue

        pc, pc_stages = page_crop_user(bgr, debug=show)
        out = refine_question_from_pagecrop(pc, invert_to_black_text=True, debug=show)
        if out["final_bw"] is None:
            print(f"[warn] no candidate after refine: {p}")
            if show and pc_stages: _show_stages(pc_stages)
            continue

        stem = Path(p).stem
        base = f"{stem}_final"
        out_path = save_dir / f"{base}.png"
        i = 1
        while out_path.exists():
            out_path = save_dir / f"{base}_{i}.png"
            i += 1

        ok = imwrite_u(str(out_path), out["final_bw"])
        print(f"[{'ok' if ok else 'err'}] write -> {out_path}")
        if show:
            _show_stages(pc_stages + out["stages"])

if __name__ == "__main__":
    run_folder_with_pagecrop("sorularım1", None, show=False)
