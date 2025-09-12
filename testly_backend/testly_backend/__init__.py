# testly_backend/__init__.py
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from .api.v1 import api_v1

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    # API
    app.register_blueprint(api_v1, url_prefix="/api/v1")

    # Statik servis: işlenmiş ve yüklenen dosyalar
    @app.get("/uploads/<path:filename>")
    def uploads_file(filename):
        return send_from_directory(app.config["UPLOAD_DIR"], filename, as_attachment=False)

    @app.get("/outputs/<path:filename>")
    def outputs_file(filename):
        return send_from_directory(app.config["OUTPUT_DIR"], filename, as_attachment=False)

    return app
