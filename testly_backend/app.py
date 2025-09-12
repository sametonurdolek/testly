# app.py
from testly_backend import create_app

app = create_app()

if __name__ == "__main__":
    # Flask dev server
    app.run(host="0.0.0.0", port=5000, debug=app.config.get("DEBUG", False))
