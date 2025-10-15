from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    NGO = "ngo"
    RESPONDER = "responder"
    VIEWER = "viewer"

class AlertSeverity(str, Enum):
    INFO = "info"
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"

class AlertStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class FeedbackOutcome(str, Enum):
    TRUE_POSITIVE = "true_positive"
    FALSE_POSITIVE = "false_positive"
    PARTIAL = "partial"

class IngestEventRequest(BaseModel):
    source: str
    payload: Dict[str, Any]
    location_id: Optional[str] = None

class IngestEventResponse(BaseModel):
    event_id: str
    status: str

class AlertFilters(BaseModel):
    domain: Optional[str] = None
    severity: Optional[List[AlertSeverity]] = None
    status: Optional[List[AlertStatus]] = None
    bbox: Optional[List[float]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(default=50, le=500)
    offset: int = 0

class ComponentScore(BaseModel):
    weather: float = 0.0
    crime: float = 0.0
    fraud: float = 0.0

class Evidence(BaseModel):
    type: str
    source: str
    timestamp: datetime
    data: Dict[str, Any]

class Alert(BaseModel):
    id: str
    primary_type: str
    component_scores: ComponentScore
    final_score: float
    severity: AlertSeverity
    location_id: Optional[str]
    evidence: List[Evidence]
    recommended_action: Optional[str]
    status: AlertStatus
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: datetime

class AlertAcknowledge(BaseModel):
    user_id: str
    notes: Optional[str] = None

class AlertAssign(BaseModel):
    user_id: str
    assigned_to: str

class FeedbackSubmission(BaseModel):
    alert_id: str
    user_id: str
    outcome: FeedbackOutcome
    notes: Optional[str] = None

class ModelInfo(BaseModel):
    id: str
    name: str
    version: str
    path: str
    metadata: Dict[str, Any]
    deployed_at: datetime

class ModelDeployRequest(BaseModel):
    name: str
    version: str
    path: str
    metadata: Dict[str, Any] = {}

class MLPredictionRequest(BaseModel):
    model_name: str
    features: Dict[str, Any]

class FeatureContribution(BaseModel):
    name: str
    contribution: float

class MLPredictionResponse(BaseModel):
    score: float
    confidence: float
    top_features: List[FeatureContribution]
    meta: Dict[str, Any] = {}

class WeatherFeatures(BaseModel):
    rain_1h: float
    rain_3h: float
    rain_6h: float
    forecast_rain_3h: float
    temp_max_24h: float
    zscore_recent: float

class CrimeFeatures(BaseModel):
    incidents_last_1h: int
    incidents_last_3h: int
    incidents_last_24h: int
    hour_of_day: int
    weekday: int
    kde_density: float
    neighbor_incidents: int

class FraudFeatures(BaseModel):
    txn_amount: float
    account_age_days: int
    txn_count_1h: int
    unique_devices_24h: int
    avg_txn_amount_7d: float
    is_new_device_flag: bool

class MetricsResponse(BaseModel):
    alerts_count: int
    alerts_by_severity: Dict[str, int]
    false_positive_rate: Optional[float]
    average_lead_time: Optional[float]
    system_uptime: float
