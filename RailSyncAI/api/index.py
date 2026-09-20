# RAIL-BLOCK AI: Vercel Serverless Entry Point
# Vercel's Python runtime finds this file at api/index.py and exposes the `app` variable.

import sys
import os

# Add the project root (parent of /api/) to Python path so main.py imports work
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Set VERCEL env var if not already set (for database.py to detect)
os.environ.setdefault("VERCEL", "1")

# Import the FastAPI app
from main import app
