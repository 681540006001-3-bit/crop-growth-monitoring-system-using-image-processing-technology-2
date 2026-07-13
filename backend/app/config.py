import os

# Configuration variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./farming.db")
PORT = int(os.getenv("PORT", 8000))
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
