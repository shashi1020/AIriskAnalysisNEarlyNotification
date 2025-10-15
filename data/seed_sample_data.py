import os
import sys
from supabase import create_client
from datetime import datetime, timedelta
import random

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wbegzxspadqmgiloswlh.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_locations():
    print("Seeding sample locations...")

    locations = [
        {
            "name": "San Francisco Bay Area",
            "centroid": {"type": "Point", "coordinates": [-122.4194, 37.7749]},
            "meta": {"population": 7753000, "area_sqkm": 18088}
        },
        {
            "name": "Los Angeles Metropolitan",
            "centroid": {"type": "Point", "coordinates": [-118.2437, 34.0522]},
            "meta": {"population": 13200000, "area_sqkm": 12562}
        },
        {
            "name": "Chicago Metro",
            "centroid": {"type": "Point", "coordinates": [-87.6298, 41.8781]},
            "meta": {"population": 9458000, "area_sqkm": 28163}
        },
        {
            "name": "Houston Area",
            "centroid": {"type": "Point", "coordinates": [-95.3698, 29.7604]},
            "meta": {"population": 7122000, "area_sqkm": 26061}
        }
    ]

    for loc in locations:
        try:
            result = supabase.table("locations").insert(loc).execute()
            print(f"✓ Created location: {loc['name']}")
        except Exception as e:
            print(f"✗ Error creating location {loc['name']}: {e}")

    return supabase.table("locations").select("id").execute().data

def seed_sample_alerts(location_ids):
    print("\nSeeding sample alerts...")

    severities = ["info", "watch", "warning", "critical"]
    types = ["weather", "crime", "fraud"]
    statuses = ["open", "acknowledged", "in_progress"]

    for i in range(20):
        severity = random.choice(severities)
        primary_type = random.choice(types)

        component_scores = {
            "weather": random.uniform(0, 1) if primary_type == "weather" else random.uniform(0, 0.3),
            "crime": random.uniform(0, 1) if primary_type == "crime" else random.uniform(0, 0.3),
            "fraud": random.uniform(0, 1) if primary_type == "fraud" else random.uniform(0, 0.3)
        }

        final_score = max(component_scores.values())

        alert = {
            "primary_type": primary_type,
            "component_scores": component_scores,
            "final_score": final_score,
            "severity": severity,
            "location_id": random.choice(location_ids)["id"] if location_ids else None,
            "evidence": [
                {
                    "type": f"{primary_type}_analysis",
                    "source": "mock_system",
                    "timestamp": (datetime.utcnow() - timedelta(hours=random.randint(0, 48))).isoformat(),
                    "data": {"simulated": True}
                }
            ],
            "recommended_action": f"Sample action for {severity} {primary_type} alert",
            "status": random.choice(statuses),
            "created_at": (datetime.utcnow() - timedelta(hours=random.randint(0, 72))).isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        try:
            result = supabase.table("alerts").insert(alert).execute()
            print(f"✓ Created {severity} {primary_type} alert")
        except Exception as e:
            print(f"✗ Error creating alert: {e}")

def main():
    print("=" * 60)
    print("Early Warning Platform - Sample Data Seeder")
    print("=" * 60)

    location_ids = seed_locations()
    seed_sample_alerts(location_ids)

    print("\n" + "=" * 60)
    print("Sample data seeding complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
