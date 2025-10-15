from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import ModelInfo, ModelDeployRequest, MLPredictionRequest, MLPredictionResponse
from app.database import get_supabase
from app.services.ml_service import ml_service
from datetime import datetime

router = APIRouter()

@router.get("/models", response_model=List[ModelInfo])
async def list_models():
    try:
        supabase = get_supabase()

        result = supabase.table("models").select("*").order("deployed_at", desc=True).execute()

        models = [
            ModelInfo(
                id=model["id"],
                name=model["name"],
                version=model["version"],
                path=model["path"],
                metadata=model.get("metadata", {}),
                deployed_at=model["deployed_at"]
            )
            for model in result.data
        ]

        return models

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/deploy")
async def deploy_model(model: ModelDeployRequest):
    try:
        supabase = get_supabase()

        model_data = {
            "name": model.name,
            "version": model.version,
            "path": model.path,
            "metadata": model.metadata,
            "deployed_at": datetime.utcnow().isoformat()
        }

        result = supabase.table("models").insert(model_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to deploy model")

        return {
            "status": "deployed",
            "model_id": result.data[0]["id"],
            "name": model.name,
            "version": model.version
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/predict", response_model=MLPredictionResponse)
async def predict(request: MLPredictionRequest):
    try:
        result = await ml_service.predict(request.model_name, request.features)

        return MLPredictionResponse(
            score=result["score"],
            confidence=result["confidence"],
            top_features=result["top_features"],
            meta=result.get("meta", {})
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
