# vision/processor.py
import os, uuid, math
import numpy as np
from PIL import Image, ImageOps
try:
    import pillow_heif; pillow_heif.register_heif_opener()
except Exception:
    pass
import cv2

def _to_bgr(path):
    img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    arr = np.array(img)[:, :, ::-1].copy()  # RGB->BGR
    return arr

def _resize_short_side(img, target=1600, max_side=2400):
    h, w = img.shape[:2]
    s = target / min(h, w)
    if s * max(h, w) > max_side:
        s = max_side / max(h, w)
    if s <= 1.0:  # büyütme yoksa orijinal kalsın
        return img, 1.0
    out = cv2.resize(img, (int(w*s), int(h*s)), interpolation=cv2.INTER_AREA)
    return out, s

def _auto_canny(gray):
    v = np.median(gray)
    lo = int(max(0, 0.66*v))
    hi = int(min(255, 1.33*v))
    return cv2.Canny(gray, lo, hi)

def _order_pts(pts):
    pts = np.array(pts, dtype=np.float32)
    s = pts.sum(axis=1); diff = np.diff(pts, axis=1).ravel()
    tl = pts[np.argmin(s)]; br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]; bl = pts[np.argmax(diff)]
    return np.array([tl, tr, br, bl], dtype=np.float32)

def _four_point_warp(img, pts):
    pts = _order_pts(pts)
    (tl, tr, br, bl) = pts
    wA = np.linalg.norm(br - bl)
    wB = np.linalg.norm(tr - tl)
    hA = np.linalg.norm(tr - br)
    hB = np.linalg.norm(tl - bl)
    w = int(max(wA, wB)); h = int(max(hA, hB))
    w = max(w, 200); h = max(h, 200)
    dst = np.array([[0,0],[w-1,0],[w-1,h-1],[0,h-1]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(pts, dst)
    warped = cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_CUBIC)
    return warped

def _deskew_by_minarearect(bin_img, src_bgr):
    # En büyük konturun açısı
    cnts, _ = cv2.findContours(bin_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts: return src_bgr, 0.0
    cnt = max(cnts, key=cv2.contourArea)
    rect = cv2.minAreaRect(cnt)
    angle = rect[2]
    # OpenCV: [-90,0) aralığı. -90..-45 arası +90 eklemek gerekir.
    if angle < -45: angle = angle + 90
    M = cv2.getRotationMatrix2D((src_bgr.shape[1]/2, src_bgr.shape[0]/2), angle, 1.0)
    rotated = cv2.warpAffine(src_bgr, M, (src_bgr.shape[1], src_bgr.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated, float(angle)

def _quality_metrics(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    exposure = float(gray.mean()/255.0)
    return {"blur": blur, "exposure": exposure}

def _largest_quad_page(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5,5), 0)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    edges = _auto_canny(gray)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (5,5))
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, k, iterations=1)

    cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    H, W = gray.shape[:2]
    best = None
    for c in sorted(cnts, key=cv2.contourArea, reverse=True)[:10]:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02*peri, True)
        area = cv2.contourArea(approx)
        if len(approx)==4 and area > 0.25*H*W:
            best = approx.reshape(4,2)
            break
    return best  # 4x2 veya None

def _find_question_block(doc_bgr):
    H, W = doc_bgr.shape[:2]
    gray = cv2.cvtColor(doc_bgr, cv2.COLOR_BGR2GRAY)
    # Binarize
    thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)[1]
    # Metin bloklarını yatayda birleştir
    kx = max(3, W//40); ky = max(3, W//200)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (kx, ky))
    m = cv2.morphologyEx(thr, cv2.MORPH_CLOSE, k, iterations=1)

    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts: return None
    cand = None; cand_score = -1
    for c in cnts:
        x,y,w,h = cv2.boundingRect(c)
        area = w*h
        if area < 0.01*W*H: continue
        aspect = w/max(1,h)
        if aspect < 0.5 or aspect > 4.5:  # çok dar/çok uzun blokları ele
            continue
        fill = float(m[y:y+h, x:x+w].mean()/255.0)  # 0..1
        if 0.1 <= fill <= 0.85:
            score = area * (1.0 - abs(fill-0.4))  # kaba sezgi
            if score > cand_score:
                cand_score = score
                cand = (x,y,w,h)
    if not cand:
        # Fallback: en büyük alan
        c = max(cnts, key=cv2.contourArea)
        cand = cv2.boundingRect(c)
    # %10 padding
    x,y,w,h = cand
    pad = int(0.1*max(w,h))
    x = max(0, x-pad); y = max(0, y-pad)
    w = min(W-x, w+2*pad); h = min(H-y, h+2*pad)
    return (x,y,w,h)

def detect_question(input_path, crop_dir, square=False):
    os.makedirs(crop_dir, exist_ok=True)
    try:
        img = _to_bgr(input_path)
    except Exception as e:
        return {"ok": False, "reason": f"load_error:{e}", "crop_path": None}

    # Normalize boyut
    img, _ = _resize_short_side(img, target=1600, max_side=2400)

    # 1) Sayfa 4-gen varsa warp, yoksa deskew
    quad = _largest_quad_page(img)
    tilt_deg = 0.0
    if quad is not None:
        doc = _four_point_warp(img, quad)
    else:
        # Binarize + deskew
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        b = cv2.GaussianBlur(g, (5,5), 0)
        thr = cv2.threshold(b, 0, 255, cv2.THRESH_BINARY+cv2.THRESH_OTSU)[1]
        doc, tilt_deg = _deskew_by_minarearect(thr, img)

    # 2) Soru bloğu
    box = _find_question_block(doc)
    if not box:
        q = _quality_metrics(doc)
        q["tilt_deg"] = float(tilt_deg)
        return {"ok": False, "reason": "no_block", "quality": q, "crop_path": None}

    x,y,w,h = box
    crop = doc[y:y+h, x:x+w].copy()

    # İstenirse kare pad
    if square:
        H, W = crop.shape[:2]
        side = max(H, W)
        canvas = np.full((side, side, 3), 255, dtype=np.uint8)
        off_y = (side - H)//2; off_x = (side - W)//2
        canvas[off_y:off_y+H, off_x:off_x+W] = crop
        crop = canvas

    # 3) Kalite
    q = _quality_metrics(crop); q["tilt_deg"] = float(tilt_deg)

    # 4) Kaydet
    out = os.path.join(crop_dir, f"{uuid.uuid4().hex}.jpg")
    cv2.imwrite(out, crop, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

    poly = [[float(x),float(y)],[float(x+w),float(y)],
            [float(x+w),float(y+h)],[float(x),float(y+h)]]

    return {
        "ok": True,
        "bbox": [int(x),int(y),int(w),int(h)],
        "poly": poly,
        "quality": q,
        "reason": None,
        "crop_path": out,
    }
