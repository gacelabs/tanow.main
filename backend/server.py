from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TaNow Online API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Health check endpoint for deployment verification"""
    return {"status": "healthy", "service": "TaNow Online API"}

@app.get("/api/info")
async def get_info():
    """Get application information"""
    return {
        "name": "TaNow Online",
        "tagline": "Stream the World, One Channel at a Time",
        "description": "IPTV Channel Directory",
        "version": "1.0.0"
    }
