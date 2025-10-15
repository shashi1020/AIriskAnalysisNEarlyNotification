from fastapi import APIRouter, HTTPException
from app.models.schemas import IngestEventRequest, IngestEventResponse
from app.database import get_supabase
from app.services.ml_service import ml_service
from app.services.alert_manager import AlertManager
from datetime import datetime

router = APIRouter()
alert_manager = AlertManager()

@router.post("/ingest", response_model=IngestEventResponse)
async def ingest_event(event: IngestEventRequest):
    try:
        supabase = get_supabase()

        event_data = {
            "source": event.source,
            "payload": event.payload,
            "location_id": event.location_id,
            "raw": event.payload,
            "ingested_at": datetime.utcnow().isoformat()
        }

        result = supabase.table("events").insert(event_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to insert event")

        event_id = result.data[0]["id"]

        await process_event_async(result.data[0])

        return IngestEventResponse(
            event_id=event_id,
            status="ingested"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_event_async(event_data: dict):
    try:
        source = event_data["source"]
        payload = event_data["payload"]
        location_id = event_data.get("location_id")

        component_scores = {}
        confidences = {}
        evidence = []

        if source == "weather" or "weather" in payload:
            weather_features = extract_weather_features(payload)
            weather_result = await ml_service.predict("weather", weather_features)

            component_scores["weather"] = weather_result["score"]
            confidences["weather"] = weather_result["confidence"]

            evidence.append({
                "type": "weather_analysis",
                "source": source,
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "features": weather_features,
                    "prediction": weather_result
                }
            })

        if source == "crime" or "crime" in payload:
            crime_features = extract_crime_features(payload)
            crime_result = await ml_service.predict("crime", crime_features)

            component_scores["crime"] = crime_result["score"]
            confidences["crime"] = crime_result["confidence"]

            evidence.append({
                "type": "crime_analysis",
                "source": source,
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "features": crime_features,
                    "prediction": crime_result
                }
            })

        if source == "fraud" or "transaction" in payload:
            fraud_features = extract_fraud_features(payload)
            fraud_result = await ml_service.predict("fraud", fraud_features)

            component_scores["fraud"] = fraud_result["score"]
            confidences["fraud"] = fraud_result["confidence"]

            evidence.append({
                "type": "fraud_analysis",
                "source": source,
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "features": fraud_features,
                    "prediction": fraud_result
                }
            })

        if component_scores:
            alert_data = alert_manager.fuse_signals(
                component_scores,
                confidences,
                evidence,
                location_id
            )

            if alert_data:
                await alert_manager.create_alert(alert_data)

    except Exception as e:
        print(f"Error processing event: {e}")

def extract_weather_features(payload: dict) -> dict:
    return {
        "rain_1h": payload.get("rain_1h", 0),
        "rain_3h": payload.get("rain_3h", 0),
        "rain_6h": payload.get("rain_6h", 0),
        "forecast_rain_3h": payload.get("forecast_rain_3h", 0),
        "temp_max_24h": payload.get("temp_max_24h", 20),
        "zscore_recent": payload.get("zscore_recent", 0)
    }

def extract_crime_features(payload: dict) -> dict:
    return {
        "incidents_last_1h": payload.get("incidents_last_1h", 0),
        "incidents_last_3h": payload.get("incidents_last_3h", 0),
        "incidents_last_24h": payload.get("incidents_last_24h", 0),
        "hour_of_day": payload.get("hour_of_day", datetime.utcnow().hour),
        "weekday": payload.get("weekday", datetime.utcnow().weekday()),
        "kde_density": payload.get("kde_density", 0),
        "neighbor_incidents": payload.get("neighbor_incidents", 0)
    }

def extract_fraud_features(payload: dict) -> dict:
    return {
        "txn_amount": payload.get("txn_amount", 0),
        "account_age_days": payload.get("account_age_days", 365),
        "txn_count_1h": payload.get("txn_count_1h", 0),
        "unique_devices_24h": payload.get("unique_devices_24h", 1),
        "avg_txn_amount_7d": payload.get("avg_txn_amount_7d", 100),
        "is_new_device_flag": payload.get("is_new_device_flag", False)
    }
