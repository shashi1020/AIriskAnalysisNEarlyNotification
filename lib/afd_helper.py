# lib/afd_helper.py
import os
import uuid
from datetime import datetime
import logging
from typing import Dict, Any, Optional

import boto3
from botocore.exceptions import NoCredentialsError, ClientError

# Optional Firestore (we'll only initialize it if credentials env var is set)
USE_FIRESTORE = bool(os.getenv("USE_FIRESTORE", "1") == "1")  # set to "0" to disable
GOOGLE_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("afd_helper")

# AWS / AFD config
REGION = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
DETECTOR_ID = os.getenv("AFD_DETECTOR_ID", "my_detector")
EVENT_TYPE = os.getenv("AFD_EVENT_TYPE", "transaction")
FRAUD_THRESHOLD = float(os.getenv("AFD_FRAUD_THRESHOLD", "0.85"))

# Initialize AFD (boto3 will use env vars / ~/.aws/credentials / IAM role)
try:
    afd_client = boto3.client("frauddetector", region_name=REGION)
except Exception as e:
    logger.exception("Failed to create AFD client: %s", e)
    afd_client = None

# Firestore init (optional)
db = None
if USE_FIRESTORE:
    if not GOOGLE_CREDENTIALS:
        logger.warning("USE_FIRESTORE enabled but GOOGLE_APPLICATION_CREDENTIALS not set. Firestore disabled.")
        USE_FIRESTORE = False
    else:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred)
            db = firestore.client()
            logger.info("Initialized Firestore client")
        except Exception as e:
            logger.exception("Failed to initialize Firestore: %s. Disabling Firestore writes.", e)
            USE_FIRESTORE = False
            db = None


def _safe_send_event(event_id: str, entity_id: str, event_variables: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Internal helper to call AFD SendEvent; returns response or None on error."""
    if afd_client is None:
        logger.error("AFD client is not initialized.")
        return None

    # Amazon Fraud Detector expects eventVariables values as strings
    ev_strings = {k: ("" if v is None else str(v)) for k, v in event_variables.items()}

    try:
        resp = afd_client.send_event(
            eventId=event_id,
            eventTypeName=EVENT_TYPE,
            eventTimestamp=datetime.utcnow().isoformat(),
            entities=[{"entityType": "customer", "entityId": entity_id}],
            eventVariables=ev_strings,
        )
        logger.debug("send_event response: %s", resp)
        return resp
    except NoCredentialsError:
        logger.exception("AWS credentials not found when calling send_event.")
        raise
    except ClientError as e:
        logger.exception("ClientError calling send_event: %s", e)
        raise
    except Exception as e:
        logger.exception("Unexpected error sending event to AFD: %s", e)
        raise


def _safe_get_prediction(event_id: str) -> Optional[Dict[str, Any]]:
    """GetEventPrediction from AFD for the sent event."""
    if afd_client is None:
        logger.error("AFD client is not initialized.")
        return None

    try:
        resp = afd_client.get_event_prediction(
            detectorId=DETECTOR_ID,
            eventId=event_id,
            eventTypeName=EVENT_TYPE
        )
        logger.debug("get_event_prediction response: %s", resp)
        return resp
    except NoCredentialsError:
        logger.exception("AWS credentials not found when calling get_event_prediction.")
        raise
    except ClientError as e:
        logger.exception("ClientError calling get_event_prediction: %s", e)
        raise
    except Exception as e:
        logger.exception("Unexpected error getting prediction: %s", e)
        raise


def send_event_and_check_fraud(event_variables: Dict[str, Any], entity_id: str = "user_123") -> Dict[str, Any]:
    """
    Send an event to Amazon Fraud Detector, get prediction, optionally push to Firestore if fraud.
    Returns a dictionary with keys: event_id, fraud_probability, prediction, error (if any).
    """
    event_id = str(uuid.uuid4())
    logger.info("Sending event %s for entity %s", event_id, entity_id)

    try:
        _safe_send_event(event_id, entity_id, event_variables)
    except NoCredentialsError:
        return {"error": "AWS credentials not found"}
    except Exception as e:
        return {"error": f"send_event_failed: {str(e)}"}

    # retrieve prediction
    try:
        resp = _safe_get_prediction(event_id)
        if not resp:
            return {"error": "empty_prediction_response"}

        # Safely locate prediction and score
        predictions = resp.get("predictions") or []
        if len(predictions) == 0:
            logger.warning("No predictions returned in response")
            return {"event_id": event_id, "fraud_probability": 0.0, "prediction": None}

        # Amazon's response shape can vary; find top score
        prediction = predictions[0]
        scores = prediction.get("scores") or []
        fraud_prob = 0.0
        if scores:
            # scores list contains dicts with 'score' or 'value' depending on SDK version; handle both.
            # Common: scores[0]['value'] is string like '0.92'
            s0 = scores[0]
            if "value" in s0:
                fraud_prob = float(s0["value"])
            elif "score" in s0:
                fraud_prob = float(s0["score"])
            elif "scoreValue" in s0:
                fraud_prob = float(s0["scoreValue"])
            else:
                # try first number-like field
                for v in s0.values():
                    try:
                        fraud_prob = float(v)
                        break
                    except Exception:
                        continue
        else:
            logger.debug("No scores array in prediction: %s", prediction)

    except NoCredentialsError:
        return {"error": "AWS credentials not found when fetching prediction"}
    except Exception as e:
        return {"error": f"get_prediction_failed: {str(e)}"}

    result = {"event_id": event_id, "fraud_probability": fraud_prob, "prediction": prediction}

    # if fraud probability high, push alert to Firestore (if enabled)
    if fraud_prob >= FRAUD_THRESHOLD:
        logger.warning("High fraud probability %.2f >= threshold %.2f — generating alert", fraud_prob, FRAUD_THRESHOLD)
        alert = {
            "event_id": event_id,
            "type": "fraud",
            "confidence": fraud_prob,
            "timestamp": datetime.utcnow().isoformat(),
            "summary": f"High risk transaction ({int(fraud_prob*100)}%)",
            "raw": {"event_variables": event_variables, "prediction": prediction}
        }
        if USE_FIRESTORE and db:
            try:
                db.collection("alerts").add(alert)
                logger.info("Alert written to Firestore for event %s", event_id)
                result["firestore"] = "written"
            except Exception as e:
                logger.exception("Failed to write alert to Firestore: %s", e)
                result["firestore_error"] = str(e)
        else:
            logger.info("Firestore disabled — skipping write (alert would be: %s)", alert)

    return result
