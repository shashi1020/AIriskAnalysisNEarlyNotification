from fastapi import APIRouter, HTTPException
from app.models.schemas import FeedbackSubmission
from app.database import get_supabase
from datetime import datetime

router = APIRouter()

@router.post("/feedback")
async def submit_feedback(feedback: FeedbackSubmission):
    try:
        supabase = get_supabase()

        feedback_data = {
            "alert_id": feedback.alert_id,
            "user_id": feedback.user_id,
            "outcome": feedback.outcome.value,
            "notes": feedback.notes,
            "created_at": datetime.utcnow().isoformat()
        }

        result = supabase.table("feedback").insert(feedback_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to submit feedback")

        return {
            "status": "submitted",
            "feedback_id": result.data[0]["id"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
