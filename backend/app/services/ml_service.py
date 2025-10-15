import pickle
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
from datetime import datetime

class MLService:
    def __init__(self, models_dir: str = "./ml/models"):
        self.models_dir = Path(models_dir)
        self.loaded_models = {}

    def load_model(self, model_name: str, version: str = "latest"):
        cache_key = f"{model_name}:{version}"

        if cache_key in self.loaded_models:
            return self.loaded_models[cache_key]

        model_path = self.models_dir / f"{model_name}_{version}.pkl"

        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")

        with open(model_path, 'rb') as f:
            model = pickle.load(f)

        self.loaded_models[cache_key] = model
        return model

    async def predict(
        self,
        model_name: str,
        features: Dict[str, Any]
    ) -> Dict[str, Any]:
        if model_name == "weather":
            return await self._predict_weather(features)
        elif model_name == "crime":
            return await self._predict_crime(features)
        elif model_name == "fraud":
            return await self._predict_fraud(features)
        else:
            raise ValueError(f"Unknown model: {model_name}")

    async def _predict_weather(self, features: Dict[str, Any]) -> Dict[str, Any]:
        rain_1h = features.get("rain_1h", 0)
        rain_3h = features.get("rain_3h", 0)
        rain_6h = features.get("rain_6h", 0)
        forecast_rain_3h = features.get("forecast_rain_3h", 0)
        temp_max_24h = features.get("temp_max_24h", 20)
        zscore_recent = features.get("zscore_recent", 0)

        score = 0.0
        contributions = []

        if rain_1h > 25:
            score += 0.4
            contributions.append({"name": "rain_1h", "contribution": 0.4})
        elif rain_1h > 15:
            score += 0.25
            contributions.append({"name": "rain_1h", "contribution": 0.25})

        if rain_3h > 50:
            score += 0.3
            contributions.append({"name": "rain_3h", "contribution": 0.3})
        elif rain_3h > 30:
            score += 0.15
            contributions.append({"name": "rain_3h", "contribution": 0.15})

        if forecast_rain_3h > 40:
            score += 0.2
            contributions.append({"name": "forecast_rain_3h", "contribution": 0.2})

        if zscore_recent > 2.5:
            score += 0.15
            contributions.append({"name": "zscore_recent", "contribution": 0.15})

        score = min(score, 1.0)

        confidence = 0.7 if rain_1h > 0 else 0.5

        contributions.sort(key=lambda x: x["contribution"], reverse=True)
        top_features = contributions[:5]

        return {
            "score": score,
            "confidence": confidence,
            "top_features": top_features,
            "meta": {
                "model_type": "rule_based",
                "timestamp": datetime.utcnow().isoformat()
            }
        }

    async def _predict_crime(self, features: Dict[str, Any]) -> Dict[str, Any]:
        incidents_last_1h = features.get("incidents_last_1h", 0)
        incidents_last_3h = features.get("incidents_last_3h", 0)
        incidents_last_24h = features.get("incidents_last_24h", 0)
        hour_of_day = features.get("hour_of_day", 12)
        weekday = features.get("weekday", 3)
        kde_density = features.get("kde_density", 0)
        neighbor_incidents = features.get("neighbor_incidents", 0)

        feature_vector = np.array([
            incidents_last_1h,
            incidents_last_3h,
            incidents_last_24h,
            hour_of_day,
            weekday,
            kde_density,
            neighbor_incidents
        ])

        weights = np.array([0.35, 0.25, 0.15, 0.05, 0.05, 0.10, 0.05])

        normalized_features = feature_vector / (np.array([10, 30, 100, 24, 7, 1, 20]) + 1e-6)
        normalized_features = np.clip(normalized_features, 0, 1)

        score = float(np.dot(normalized_features, weights))
        score = min(score, 1.0)

        confidence = 0.8 if incidents_last_1h > 0 else 0.6

        contributions = [
            {"name": "incidents_last_1h", "contribution": float(normalized_features[0] * weights[0])},
            {"name": "incidents_last_3h", "contribution": float(normalized_features[1] * weights[1])},
            {"name": "kde_density", "contribution": float(normalized_features[5] * weights[5])},
            {"name": "incidents_last_24h", "contribution": float(normalized_features[2] * weights[2])},
            {"name": "neighbor_incidents", "contribution": float(normalized_features[6] * weights[6])},
        ]

        contributions.sort(key=lambda x: x["contribution"], reverse=True)
        top_features = contributions[:5]

        return {
            "score": score,
            "confidence": confidence,
            "top_features": top_features,
            "meta": {
                "model_type": "weighted_ensemble",
                "timestamp": datetime.utcnow().isoformat()
            }
        }

    async def _predict_fraud(self, features: Dict[str, Any]) -> Dict[str, Any]:
        txn_amount = features.get("txn_amount", 0)
        account_age_days = features.get("account_age_days", 365)
        txn_count_1h = features.get("txn_count_1h", 0)
        unique_devices_24h = features.get("unique_devices_24h", 1)
        avg_txn_amount_7d = features.get("avg_txn_amount_7d", 100)
        is_new_device_flag = features.get("is_new_device_flag", False)

        score = 0.0
        contributions = []

        if txn_amount > avg_txn_amount_7d * 3:
            contrib = 0.3
            score += contrib
            contributions.append({"name": "txn_amount_anomaly", "contribution": contrib})

        if account_age_days < 30:
            contrib = 0.25
            score += contrib
            contributions.append({"name": "new_account", "contribution": contrib})

        if txn_count_1h > 5:
            contrib = 0.2
            score += contrib
            contributions.append({"name": "high_frequency", "contribution": contrib})

        if unique_devices_24h > 3:
            contrib = 0.15
            score += contrib
            contributions.append({"name": "multiple_devices", "contribution": contrib})

        if is_new_device_flag:
            contrib = 0.1
            score += contrib
            contributions.append({"name": "new_device", "contribution": contrib})

        score = min(score, 1.0)

        confidence = 0.75 if len(contributions) >= 2 else 0.55

        contributions.sort(key=lambda x: x["contribution"], reverse=True)
        top_features = contributions[:5]

        return {
            "score": score,
            "confidence": confidence,
            "top_features": top_features,
            "meta": {
                "model_type": "isolation_forest_rules",
                "timestamp": datetime.utcnow().isoformat()
            }
        }

ml_service = MLService()
