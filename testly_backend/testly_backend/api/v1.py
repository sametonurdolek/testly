# testly_backend/api/v1.py
import os, uuid
from pathlib import Path
from flask import Blueprint, current_app, request, jsonify, url_for
from werkzeug.utils import secure_filename
from ..services.processing import process_file

api_v1 = Blueprint("api_v1", __name__)

@api_v1.get("/health")
def health():
    return {"ok": True}

def _allowed(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in current_app.config["ALLOWED_EXTS"]

@api_v1.post("/process-image")
def process_image():
    """
    multipart/form-data:
      - image: dosya
      - show: '0'|'1' (opsiyonel, debug görsellerini üretmez)
    """
    if "image" not in request.files:
        return jsonify({"error": "image is required"}), 400
    f = request.files["image"]
    if not f.filename:
        return jsonify({"error": "empty filename"}), 400
    if not _allowed(f.filename):
        return jsonify({"error": "unsupported extension"}), 415

    up_dir: Path = current_app.config["UPLOAD_DIR"]
    out_dir: Path = current_app.config["OUTPUT_DIR"]

    uid = uuid.uuid4().hex
    ext = os.path.splitext(f.filename)[1].lower()
    safe_name = secure_filename(f"{uid}{ext}")
    up_path = up_dir / safe_name
    f.save(str(up_path))

    ok, result_path, meta = process_file(str(up_path), str(out_dir), show=False)
    if not ok:
        return jsonify({"error": "processing_failed", "detail": meta}), 500

    # Tam URL döndür
    original_url = url_for("uploads_file", filename=up_path.name, _external=True)
    processed_url = url_for("outputs_file", filename=Path(result_path).name, _external=True)

    return jsonify({
        "original_url": original_url,
        "processed_url": processed_url,
        "meta": meta
    })
