# Quick Start Guide

Get the Early Warning Platform running in 5 minutes!

## Option 1: Local Development (Recommended for Testing)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Seed Sample Data

```bash
cd data
python3 seed_sample_data.py
```

This will create:
- 4 sample locations (SF, LA, Chicago, Houston)
- 20 sample alerts with various severities

### Step 3: Run the Frontend

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

You should see:
- Homepage with KPI cards showing metrics
- Recent alerts list
- Navigation to Dashboard and Alerts pages

### Step 4: Explore the Dashboard

Navigate to:
- **Dashboard** (http://localhost:3000/dashboard) - Interactive map with filters
- **Alerts** (http://localhost:3000/alerts) - Full list of all alerts
- **Alert Details** - Click any alert to see evidence and component scores

## Option 2: Full Stack with Docker Compose

### Step 1: Set up Environment Variables

Create `backend/.env`:

```bash
SUPABASE_URL=https://wbegzxspadqmgiloswlh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REDIS_URL=redis://redis:6379
```

### Step 2: Start All Services

```bash
docker-compose up
```

This starts:
- Frontend (Next.js) on port 3000
- Backend (FastAPI) on port 8000
- Redis on port 6379
- Mock ingest service (generates test events)

### Step 3: Access the Services

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

## Testing the ML Pipeline

### Send Test Events via API

```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "weather",
    "payload": {
      "rain_1h": 35,
      "rain_3h": 75,
      "rain_6h": 120,
      "forecast_rain_3h": 50,
      "temp_max_24h": 25,
      "zscore_recent": 3.2
    }
  }'
```

This will:
1. Ingest the event
2. Run ML prediction (weather model)
3. Calculate risk score
4. Create an alert if thresholds are met

### View the Alerts

Go to http://localhost:3000 to see the newly created alert.

## Features to Explore

### 1. Real-time Updates

The dashboard automatically updates when new alerts are created (via Supabase Realtime).

### 2. Filtering

On the dashboard:
- Filter by severity (critical, warning, watch, info)
- Filter by status (open, acknowledged, in_progress, resolved)

### 3. Alert Details

Click any alert to see:
- Component scores breakdown (weather, crime, fraud)
- Evidence from ML models
- Recommended actions
- Full timeline

### 4. Map Visualization

The dashboard map shows:
- Alert markers colored by severity
- Click markers for quick info
- Cluster visualization for dense areas

## API Endpoints

### Ingest Events

```bash
POST /api/ingest
{
  "source": "crime",
  "payload": {
    "incidents_last_1h": 5,
    "incidents_last_3h": 12,
    "incidents_last_24h": 45,
    "hour_of_day": 22,
    "weekday": 5,
    "kde_density": 0.8,
    "neighbor_incidents": 8
  }
}
```

### List Alerts

```bash
GET /api/alerts?severity=critical&status=open&limit=10
```

### Get Alert Details

```bash
GET /api/alerts/{alert_id}
```

### Acknowledge Alert

```bash
POST /api/alerts/{alert_id}/ack
{
  "user_id": "user-uuid",
  "notes": "Investigated and responding"
}
```

### Submit Feedback

```bash
POST /api/feedback
{
  "alert_id": "alert-uuid",
  "user_id": "user-uuid",
  "outcome": "true_positive",
  "notes": "Confirmed flood event"
}
```

## Model Retraining

Once you have feedback data:

```bash
cd ml
python3 retrain.py
```

Or use the Jupyter notebook:

```bash
jupyter notebook notebooks/retrain_models.ipynb
```

## Troubleshooting

### Build Errors

```bash
npm run build
```

Should complete without errors. If you see TypeScript errors, check the console output.

### Database Connection

Verify Supabase connection:

```bash
curl https://wbegzxspadqmgiloswlh.supabase.co/rest/v1/
```

### Redis Connection

Test Redis (if using Docker Compose):

```bash
docker-compose exec redis redis-cli ping
```

Should return `PONG`.

## Next Steps

1. **Add Authentication**: Implement Supabase Auth for user management
2. **Configure Notifications**: Set up Twilio for SMS or FCM for push
3. **Customize Alert Rules**: Edit `config/alert_rules.yaml`
4. **Deploy to Production**: Use Vercel for frontend, Railway/Render for backend
5. **Add More Models**: Create new ML models in `ml/models/`

## Production Checklist

Before deploying to production:

- [ ] Set up proper environment variables
- [ ] Enable SSL/TLS
- [ ] Configure rate limiting
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Implement proper authentication
- [ ] Add audit logging
- [ ] Set up automated backups
- [ ] Configure CI/CD pipelines
- [ ] Load test the system
- [ ] Set up alerting for system failures

## Support

For issues or questions:
1. Check the main README.md
2. Review API documentation at http://localhost:8000/docs
3. Check database schema in the migration file
4. Review alert fusion logic in `backend/app/services/alert_manager.py`

Happy monitoring! 🚨
