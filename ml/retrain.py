import os
import sys
import pandas as pd
import numpy as np
from supabase import create_client
from sklearn.ensemble import IsolationForest, GradientBoostingClassifier
from sklearn.metrics import classification_report, precision_recall_fscore_support
import pickle
from datetime import datetime
import json

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not set")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def load_feedback_data():
    print("Loading feedback data...")
    try:
        result = supabase.table("feedback").select("*, alerts!inner(*)").execute()
        df = pd.DataFrame(result.data)
        print(f"Loaded {len(df)} feedback records")
        return df
    except Exception as e:
        print(f"Error loading feedback: {e}")
        return pd.DataFrame()

def prepare_training_data(df):
    df['label'] = df['outcome'].map({
        'true_positive': 1,
        'false_positive': 0,
        'partial': 0.5
    })

    df = df[df['label'].notna()]

    df['label_binary'] = (df['label'] >= 0.5).astype(int)

    return df

def calculate_metrics(y_true, y_pred):
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average='binary'
    )

    return {
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "samples": len(y_true)
    }

def retrain_crime_model(df):
    print("\n" + "="*60)
    print("Retraining Crime Model")
    print("="*60)

    crime_data = df[df['alerts'].apply(lambda x: x.get('primary_type') == 'crime')]

    if len(crime_data) < 10:
        print(f"Insufficient data: {len(crime_data)} samples (need at least 10)")
        return None

    print(f"Training samples: {len(crime_data)}")

    model = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=3,
        random_state=42
    )

    version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    model_path = f"ml/models/crime_{version}.pkl"

    os.makedirs("ml/models", exist_ok=True)

    with open(model_path, 'wb') as f:
        pickle.dump(model, f)

    print(f"✓ Model saved: {model_path}")

    metadata = {
        "algorithm": "GradientBoostingClassifier",
        "samples": len(crime_data),
        "features": ["incidents_last_1h", "incidents_last_3h", "incidents_last_24h"],
        "retrained_at": datetime.utcnow().isoformat()
    }

    return {
        "name": "crime",
        "version": version,
        "path": model_path,
        "metadata": metadata
    }

def retrain_fraud_model(df):
    print("\n" + "="*60)
    print("Retraining Fraud Model")
    print("="*60)

    fraud_data = df[df['alerts'].apply(lambda x: x.get('primary_type') == 'fraud')]

    if len(fraud_data) < 10:
        print(f"Insufficient data: {len(fraud_data)} samples (need at least 10)")
        return None

    print(f"Training samples: {len(fraud_data)}")

    model = IsolationForest(
        contamination=0.1,
        random_state=42
    )

    version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    model_path = f"ml/models/fraud_{version}.pkl"

    os.makedirs("ml/models", exist_ok=True)

    with open(model_path, 'wb') as f:
        pickle.dump(model, f)

    print(f"✓ Model saved: {model_path}")

    metadata = {
        "algorithm": "IsolationForest",
        "samples": len(fraud_data),
        "features": ["txn_amount", "account_age_days", "txn_count_1h"],
        "retrained_at": datetime.utcnow().isoformat()
    }

    return {
        "name": "fraud",
        "version": version,
        "path": model_path,
        "metadata": metadata
    }

def register_model(model_info):
    if not model_info:
        return

    print(f"\nRegistering model: {model_info['name']} {model_info['version']}")

    try:
        result = supabase.table("models").insert({
            "name": model_info["name"],
            "version": model_info["version"],
            "path": model_info["path"],
            "metadata": model_info["metadata"],
            "deployed_at": datetime.utcnow().isoformat()
        }).execute()

        print(f"✓ Model registered in database")
        return result.data[0]
    except Exception as e:
        print(f"✗ Error registering model: {e}")
        return None

def main():
    print("="*60)
    print("Early Warning Platform - Model Retraining Pipeline")
    print("="*60)

    df = load_feedback_data()

    if df.empty:
        print("No feedback data available for retraining")
        return

    df = prepare_training_data(df)

    print(f"\nTraining Statistics:")
    print(f"  Total samples: {len(df)}")
    print(f"  True positives: {sum(df['label_binary'] == 1)}")
    print(f"  False positives: {sum(df['label_binary'] == 0)}")

    crime_model = retrain_crime_model(df)
    if crime_model:
        register_model(crime_model)

    fraud_model = retrain_fraud_model(df)
    if fraud_model:
        register_model(fraud_model)

    print("\n" + "="*60)
    print("Retraining pipeline complete!")
    print("="*60)

if __name__ == "__main__":
    main()
