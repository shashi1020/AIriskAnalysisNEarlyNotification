import httpx
import asyncio
import random
from datetime import datetime
import os

API_URL = os.getenv("API_URL", "http://localhost:8000")

async def send_weather_event():
    event = {
        "source": "weather",
        "payload": {
            "rain_1h": random.uniform(0, 50),
            "rain_3h": random.uniform(0, 100),
            "rain_6h": random.uniform(0, 150),
            "forecast_rain_3h": random.uniform(0, 60),
            "temp_max_24h": random.uniform(15, 35),
            "zscore_recent": random.uniform(0, 4)
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{API_URL}/api/ingest", json=event, timeout=10.0)
            print(f"Weather event sent: {response.status_code}")
        except Exception as e:
            print(f"Error sending weather event: {e}")

async def send_crime_event():
    event = {
        "source": "crime",
        "payload": {
            "incidents_last_1h": random.randint(0, 10),
            "incidents_last_3h": random.randint(0, 30),
            "incidents_last_24h": random.randint(0, 100),
            "hour_of_day": datetime.now().hour,
            "weekday": datetime.now().weekday(),
            "kde_density": random.uniform(0, 1),
            "neighbor_incidents": random.randint(0, 20)
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{API_URL}/api/ingest", json=event, timeout=10.0)
            print(f"Crime event sent: {response.status_code}")
        except Exception as e:
            print(f"Error sending crime event: {e}")

async def send_fraud_event():
    event = {
        "source": "fraud",
        "payload": {
            "txn_amount": random.uniform(10, 5000),
            "account_age_days": random.randint(1, 1000),
            "txn_count_1h": random.randint(0, 10),
            "unique_devices_24h": random.randint(1, 5),
            "avg_txn_amount_7d": random.uniform(50, 500),
            "is_new_device_flag": random.choice([True, False])
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{API_URL}/api/ingest", json=event, timeout=10.0)
            print(f"Fraud event sent: {response.status_code}")
        except Exception as e:
            print(f"Error sending fraud event: {e}")

async def main():
    print("Mock ingest service started...")
    print(f"Sending events to {API_URL}")

    while True:
        event_type = random.choice(["weather", "crime", "fraud"])

        if event_type == "weather":
            await send_weather_event()
        elif event_type == "crime":
            await send_crime_event()
        else:
            await send_fraud_event()

        await asyncio.sleep(random.uniform(30, 60))

if __name__ == "__main__":
    asyncio.run(main())
