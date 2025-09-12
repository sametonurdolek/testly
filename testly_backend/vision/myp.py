import cv2
import numpy as np
import os
import os

OUTPUT_DIR = "debug_outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Dosya güvenliği (OWASP prensipleri)
def validate_file(file_path):
    allowed_ext = [".jpg", ".jpeg", ".png"]
    if not any(file_path.lower().endswith(ext) for ext in allowed_ext):
        raise ValueError("Desteklenmeyen dosya türü")
    if os.path.getsize(file_path) > 5 * 1024 * 1024:  # 5 MB limit
        raise ValueError("Dosya çok büyük")
    return True


# 2. Görüntüyü okuma
def load_image(file_path):
    img = cv2.imread(file_path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Görsel okunamadı")
    cv2.imwrite("debug_0_original.png", img)
    return img


# 3. Gri tonlama
def to_gray(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cv2.imwrite("debug_1_gray.png", gray)
    return gray


# 4. Gürültü azaltma
def denoise(img):
    den = cv2.GaussianBlur(img,(5,5),0)
    cv2.imwrite("debug_2_denoise.png", den)
    return den


# 5. Eşikleme (adaptive threshold)
def threshold(img):
    ret3,th = cv2.threshold(img,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)
    cv2.imwrite("debug_3_threshold.png", th)
    return th


def morphology(img):
    """
    Yazıları ve görselleri birbirine yapıştırır.
    Yakın elemanlar birleşip dikdörtgen haline gelir.
    """
    # Küçük boşlukları kapatmak için close


    # Yakın yazıları/görselleri birbirine yapıştırmak için dilate
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))

    # 1. Kenarları genişlet
    dilated = cv2.dilate(img, kernel, iterations=1)

    # 2. Küçük boşlukları kapat
    closed = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel)

    cv2.imwrite("debug_dilated.png", dilated)
    cv2.imwrite("debug_closed.png", closed)


    return closed

def detect_edges(img):
    """
    Morfoloji sonrası birleşmiş alanların dış hatlarını çıkarır.
    Artık yazılar birleşik dikdörtgenler gibi görünür.
    """
    # Threshold çıktısı binary olduğu için direkt Canny
    edges = cv2.Canny(img, 50, 150)

    # Kenarları biraz kalınlaştır, dikdörtgen algısını güçlendir
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    cv2.imwrite("debug_5_edges.png", edges)
    return edges




# 8. Kontur bulma ve kırpma
def find_question_contours(edges, orig_img):
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    debug = orig_img.copy()

    for i, c in enumerate(contours):
        x, y, w, h = cv2.boundingRect(c)
        if w > 50 and h > 50:  # küçük parçaları at
            crop = orig_img[y:y+h, x:x+w]
            boxes.append(crop)
            cv2.imwrite(f"debug_crop_{i}.png", crop)
            cv2.rectangle(debug, (x, y), (x+w, y+h), (0, 255, 0), 2)

    cv2.imwrite("debug_6_boxes.png", debug)
    return boxes


if __name__ == "__main__":
    path = "girdi.jpg"
    validate_file(path)
    img = load_image(path)
    gray = to_gray(img)
    denoised = denoise(gray)
    threshed = threshold(denoised)

    # önce detect_edges
    edges = detect_edges(threshed)

    # sonra morphology
    morph = morphology(edges)

    # en son kontur
    boxes = find_question_contours(morph, img)

    print(f"{len(boxes)} kutu bulundu. Çıktılar {OUTPUT_DIR}/ klasörüne kaydedildi.")
