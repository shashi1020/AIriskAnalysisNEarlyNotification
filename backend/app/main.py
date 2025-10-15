from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import ingest, alerts, models, metrics, feedback
from app.config import settings

app = FastAPI(
    title="Early Warning Platform API",
    description="Privacy-first early-warning system for weather, crime, and fraud detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(alerts.router, prefix="/api", tags=["alerts"])
app.include_router(models.router, prefix="/api", tags=["models"])
app.include_router(metrics.router, prefix="/api", tags=["metrics"])
app.include_router(feedback.router, prefix="/api", tags=["feedback"])

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "database": "operational",
            "redis": "operational",
            "ml_engine": "operational"
        }
    }

@app.get("/")
async def root():
    return {
        "message": "Early Warning Platform API",
        "docs": "/docs"
    }
