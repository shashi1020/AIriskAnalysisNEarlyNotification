import yaml
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import math
from app.database import get_supabase
from app.models.schemas import AlertSeverity, AlertStatus

class AlertManager:
    def __init__(self, config_path: str = "./config/alert_rules.yaml"):
        self.config = self._load_config(config_path)
        self.supabase = get_supabase()
        self.dedupe_cache = {}

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        default_config = {
            "domain_weights": {
                "weather": 0.4,
                "crime": 0.35,
                "fraud": 0.25
            },
            "severity_thresholds": {
                "critical": 0.85,
                "warning": 0.65,
                "watch": 0.45,
                "info": 0.0
            },
            "required_corroboration": 2,
            "auto_escalation_enabled": True,
            "auto_escalation_confidence": 0.85,
            "dedupe_radius_meters": 1000,
            "dedupe_window_minutes": 30,
            "rate_limit_per_org": 100
        }

        try:
            config_file = Path(config_path)
            if config_file.exists():
                with open(config_file, 'r') as f:
                    loaded_config = yaml.safe_load(f)
                    default_config.update(loaded_config)
        except Exception as e:
            print(f"Warning: Could not load config from {config_path}, using defaults: {e}")

        return default_config

    def fuse_signals(
        self,
        component_scores: Dict[str, float],
        confidences: Dict[str, float],
        evidence: List[Dict[str, Any]],
        location_id: Optional[str] = None
    ) -> Dict[str, Any]:
        weights = self.config["domain_weights"]

        weighted_score = sum(
            component_scores.get(domain, 0) * weights.get(domain, 0)
            for domain in weights.keys()
        )

        avg_confidence = sum(confidences.values()) / len(confidences) if confidences else 0.0

        severity = self._calculate_severity(weighted_score, avg_confidence, component_scores)

        active_signals = sum(1 for score in component_scores.values() if score > 0.3)
        requires_approval = self._requires_human_approval(
            severity,
            avg_confidence,
            active_signals
        )

        primary_type = self._determine_primary_type(component_scores)
        recommended_action = self._generate_recommendation(
            primary_type,
            severity,
            component_scores
        )

        if self._check_duplicate(location_id, primary_type, weighted_score):
            return None

        alert_data = {
            "primary_type": primary_type,
            "component_scores": component_scores,
            "final_score": weighted_score,
            "severity": severity,
            "location_id": location_id,
            "evidence": evidence,
            "recommended_action": recommended_action,
            "status": "open" if not requires_approval else "open",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        return alert_data

    def _calculate_severity(
        self,
        score: float,
        confidence: float,
        component_scores: Dict[str, float]
    ) -> str:
        thresholds = self.config["severity_thresholds"]

        adjusted_score = score * confidence

        if adjusted_score >= thresholds["critical"]:
            return AlertSeverity.CRITICAL.value
        elif adjusted_score >= thresholds["warning"]:
            return AlertSeverity.WARNING.value
        elif adjusted_score >= thresholds["watch"]:
            return AlertSeverity.WATCH.value
        else:
            return AlertSeverity.INFO.value

    def _requires_human_approval(
        self,
        severity: str,
        confidence: float,
        active_signals: int
    ) -> bool:
        if severity == AlertSeverity.CRITICAL.value:
            if not self.config["auto_escalation_enabled"]:
                return True

            if active_signals < self.config["required_corroboration"]:
                return True

            if confidence < self.config["auto_escalation_confidence"]:
                return True

        return False

    def _determine_primary_type(self, component_scores: Dict[str, float]) -> str:
        if not component_scores:
            return "unknown"

        primary = max(component_scores.items(), key=lambda x: x[1])
        return primary[0]

    def _generate_recommendation(
        self,
        primary_type: str,
        severity: str,
        component_scores: Dict[str, float]
    ) -> str:
        recommendations = {
            "weather": {
                "critical": "Immediate evacuation recommended. Flash flood conditions imminent.",
                "warning": "Monitor conditions closely. Prepare for possible evacuation.",
                "watch": "Stay alert. Heavy rainfall expected.",
                "info": "Weather conditions deteriorating. Stay informed."
            },
            "crime": {
                "critical": "High crime activity detected. Increase patrols immediately.",
                "warning": "Elevated crime risk. Deploy additional resources.",
                "watch": "Crime pattern emerging. Monitor the area.",
                "info": "Routine crime activity detected."
            },
            "fraud": {
                "critical": "Sophisticated fraud attack detected. Freeze accounts and investigate.",
                "warning": "Fraud pattern detected. Review transactions immediately.",
                "watch": "Potential fraud indicators present. Monitor closely.",
                "info": "Minor fraud risk detected."
            }
        }

        return recommendations.get(primary_type, {}).get(severity, "Monitor situation.")

    def _check_duplicate(
        self,
        location_id: Optional[str],
        primary_type: str,
        score: float
    ) -> bool:
        if not location_id:
            return False

        cache_key = f"{location_id}:{primary_type}"
        current_time = datetime.utcnow()

        if cache_key in self.dedupe_cache:
            last_alert_time, last_score = self.dedupe_cache[cache_key]
            time_diff = (current_time - last_alert_time).total_seconds() / 60

            if time_diff < self.config["dedupe_window_minutes"]:
                if abs(score - last_score) < 0.15:
                    return True

        self.dedupe_cache[cache_key] = (current_time, score)

        return False

    async def create_alert(self, alert_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            result = self.supabase.table("alerts").insert(alert_data).execute()

            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error creating alert: {e}")
            return None

    async def acknowledge_alert(self, alert_id: str, user_id: str, notes: Optional[str] = None):
        update_data = {
            "status": AlertStatus.ACKNOWLEDGED.value,
            "updated_at": datetime.utcnow().isoformat()
        }

        result = self.supabase.table("alerts").update(update_data).eq("id", alert_id).execute()

        self.supabase.table("audit_logs").insert({
            "user_id": user_id,
            "action": "ACKNOWLEDGE_ALERT",
            "details": {
                "alert_id": alert_id,
                "notes": notes
            }
        }).execute()

        return result.data[0] if result.data else None

    async def assign_alert(self, alert_id: str, user_id: str, assigned_to: str):
        update_data = {
            "assigned_to": assigned_to,
            "status": AlertStatus.IN_PROGRESS.value,
            "updated_at": datetime.utcnow().isoformat()
        }

        result = self.supabase.table("alerts").update(update_data).eq("id", alert_id).execute()

        self.supabase.table("audit_logs").insert({
            "user_id": user_id,
            "action": "ASSIGN_ALERT",
            "details": {
                "alert_id": alert_id,
                "assigned_to": assigned_to
            }
        }).execute()

        return result.data[0] if result.data else None
