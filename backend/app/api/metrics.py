from fastapi import APIRouter, HTTPException
from app.models.schemas import MetricsResponse
from app.database import get_supabase
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    try:
        supabase = get_supabase()

        alerts_result = supabase.table("alerts").select("severity, status", count="exact").execute()
        alerts_count = len(alerts_result.data)

        alerts_by_severity = {
            "info": 0,
            "watch": 0,
            "warning": 0,
            "critical": 0
        }

        for alert in alerts_result.data:
            severity = alert.get("severity", "info")
            alerts_by_severity[severity] = alerts_by_severity.get(severity, 0) + 1

        feedback_result = supabase.table("feedback").select("outcome", count="exact").execute()

        false_positive_rate = None
        if len(feedback_result.data) > 0:
            false_positives = sum(
                1 for f in feedback_result.data
                if f.get("outcome") == "false_positive"
            )
            false_positive_rate = false_positives / len(feedback_result.data)

        average_lead_time = None

        return MetricsResponse(
            alerts_count=alerts_count,
            alerts_by_severity=alerts_by_severity,
            false_positive_rate=false_positive_rate,
            average_lead_time=average_lead_time,
            system_uptime=99.9
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
