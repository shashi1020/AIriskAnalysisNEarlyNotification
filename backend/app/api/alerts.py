from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.schemas import Alert, AlertAcknowledge, AlertAssign, AlertSeverity, AlertStatus
from app.database import get_supabase
from app.services.alert_manager import AlertManager
from datetime import datetime

router = APIRouter()
alert_manager = AlertManager()

@router.get("/alerts", response_model=List[Alert])
async def list_alerts(
    domain: Optional[str] = None,
    severity: Optional[List[AlertSeverity]] = Query(None),
    status: Optional[List[AlertStatus]] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = 0
):
    try:
        supabase = get_supabase()

        query = supabase.table("alerts").select("*")

        if severity:
            severity_values = [s.value for s in severity]
            query = query.in_("severity", severity_values)

        if status:
            status_values = [s.value for s in status]
            query = query.in_("status", status_values)

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

        result = query.execute()

        alerts = []
        for alert_data in result.data:
            alert = Alert(
                id=alert_data["id"],
                primary_type=alert_data["primary_type"],
                component_scores=alert_data["component_scores"],
                final_score=alert_data["final_score"],
                severity=alert_data["severity"],
                location_id=alert_data.get("location_id"),
                evidence=alert_data.get("evidence", []),
                recommended_action=alert_data.get("recommended_action"),
                status=alert_data["status"],
                assigned_to=alert_data.get("assigned_to"),
                created_at=alert_data["created_at"],
                updated_at=alert_data["updated_at"]
            )
            alerts.append(alert)

        return alerts

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/{alert_id}", response_model=Alert)
async def get_alert(alert_id: str):
    try:
        supabase = get_supabase()

        result = supabase.table("alerts").select("*").eq("id", alert_id).maybeSingle().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Alert not found")

        alert_data = result.data

        alert = Alert(
            id=alert_data["id"],
            primary_type=alert_data["primary_type"],
            component_scores=alert_data["component_scores"],
            final_score=alert_data["final_score"],
            severity=alert_data["severity"],
            location_id=alert_data.get("location_id"),
            evidence=alert_data.get("evidence", []),
            recommended_action=alert_data.get("recommended_action"),
            status=alert_data["status"],
            assigned_to=alert_data.get("assigned_to"),
            created_at=alert_data["created_at"],
            updated_at=alert_data["updated_at"]
        )

        return alert

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/ack")
async def acknowledge_alert(alert_id: str, ack: AlertAcknowledge):
    try:
        result = await alert_manager.acknowledge_alert(
            alert_id,
            ack.user_id,
            ack.notes
        )

        if not result:
            raise HTTPException(status_code=404, detail="Alert not found")

        return {"status": "acknowledged", "alert_id": alert_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/assign")
async def assign_alert(alert_id: str, assign: AlertAssign):
    try:
        result = await alert_manager.assign_alert(
            alert_id,
            assign.user_id,
            assign.assigned_to
        )

        if not result:
            raise HTTPException(status_code=404, detail="Alert not found")

        return {"status": "assigned", "alert_id": alert_id, "assigned_to": assign.assigned_to}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
