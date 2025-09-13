# config.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
OUTPUT_DIR = STORAGE_DIR / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URI = "postgresql://postgres:asdqwe123_SAMET@localhost:5432/testly"

class Config:
    DEBUG = os.getenv("DEBUG", "0") == "1"
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 50 * 1024 * 1024))  # 50MB
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    UPLOAD_DIR = UPLOAD_DIR
    OUTPUT_DIR = OUTPUT_DIR
    ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

