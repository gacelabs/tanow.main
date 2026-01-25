"""
TaNow Online - Minimal Health Check Server
This is a static site - backend only provides health checks for deployment.
All app functionality is in the frontend using HTML5, CSS3, jQuery.
"""
from fastapi import FastAPI

app = FastAPI(title="TaNow Online", version="1.0.0", docs_url=None, redoc_url=None)

@app.get("/api/health")
async def health():
    return {"status": "healthy", "app": "TaNow Online", "type": "static-site"}
