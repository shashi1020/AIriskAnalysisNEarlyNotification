# Early Warning Platform

A privacy-first early-warning system that ingests weather, crime, and fraud data, uses lightweight ML models to detect risks, fuses signals into alerts, notifies responders, and presents an elegant Next.js dashboard with map visualization and incident workflow management.

## Architecture

- **Frontend**: Next.js 13 (App Router) + TypeScript + Tailwind CSS + Mapbox GL
- **Backend**: FastAPI + Python for APIs & ML serving
- **Database**: Supabase (Postgres + PostGIS) for spatial queries
- **Cache**: Redis for rolling windows & state management
- **ML**: Scikit-learn / XGBoost for prototype models
- **Notifications**: Firebase Cloud Messaging (FCM) + Twilio (SMS)

## Features

- Real-time alert ingestion and processing
- Multi-signal fusion (weather, crime, fraud)
- ML-powered risk scoring with explainability
- Interactive map dashboard with Mapbox
- Role-based access control
- Audit logging for all actions
- Notification system (push, SMS, webhook)
- Human-in-the-loop for critical alerts
- Feedback collection for model retraining

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (optional)

### Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://wbegzxspadqmgiloswlh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mapbox (optional - uses demo token if not set)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# OpenWeather API (optional)
OPENWEATHER_API_KEY=your_openweather_key

# Twilio (optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1234567890
```

Create `backend/.env`:

```bash
SUPABASE_URL=https://wbegzxspadqmgiloswlh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

REDIS_URL=redis://localhost:6379
```

### Running with Docker Compose

```bash
docker-compose up
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Redis: localhost:6379

### Running Locally (without Docker)

#### Frontend

```bash
npm install
npm run dev
```

Frontend runs at http://localhost:3000

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000

#### Redis

```bash
docker run -p 6379:6379 redis:7-alpine
```

## Database Schema

The database includes the following tables:

- **users**: User accounts with role-based access (admin, ngo, responder, viewer)
- **locations**: Geographic areas with PostGIS geometry support
- **events**: Raw ingested events from various sources
- **models**: ML model registry with versioning
- **analyses**: ML model analysis results
- **alerts**: Fused alerts from multiple signals
- **feedback**: User feedback for model retraining
- **audit_logs**: Complete audit trail

All tables have Row Level Security (RLS) enabled with restrictive policies.

## API Endpoints

### Ingest

- `POST /api/ingest` - Ingest raw event data

### Alerts

- `GET /api/alerts` - List alerts with filters
- `GET /api/alerts/{id}` - Get alert details
- `POST /api/alerts/{id}/ack` - Acknowledge alert
- `POST /api/alerts/{id}/assign` - Assign alert to user

### Models

- `GET /api/models` - List deployed models
- `POST /api/models/deploy` - Deploy new model (admin)
- `POST /api/models/predict` - Run ML prediction

### Feedback

- `POST /api/feedback` - Submit feedback for retraining

### Metrics

- `GET /api/metrics` - Get system metrics

### Health

- `GET /api/health` - System health check

## ML Models

### Weather Model

Rule-based model analyzing:
- Recent rainfall (1h, 3h, 6h)
- Forecast predictions
- Z-score anomalies

### Crime Model

Weighted ensemble analyzing:
- Recent incident counts
- Time-of-day patterns
- Spatial density (KDE)
- Neighbor activity

### Fraud Model

Isolation Forest analyzing:
- Transaction amount anomalies
- Account age
- Transaction frequency
- Device fingerprinting

## Alert Fusion

The Alert Manager combines multiple signals using:
- Configurable domain weights (weather: 0.4, crime: 0.35, fraud: 0.25)
- Severity thresholds (critical: 0.85, warning: 0.65, watch: 0.45)
- Deduplication by spatial radius and time window
- Human-in-the-loop for critical alerts
- Auto-escalation with confidence thresholds

Configuration: `config/alert_rules.yaml`

## Dashboard

The Next.js dashboard provides:

- Real-time alert monitoring with live updates
- Interactive Mapbox map with alert markers
- Severity-based color coding
- Advanced filtering (severity, status, time range)
- Alert detail view with evidence and ML explanations
- KPI cards showing system metrics
- Responsive design for mobile and desktop

## Notifications

Supports multiple channels:

- **FCM**: Push notifications to mobile apps
- **Twilio**: SMS/voice alerts
- **Webhook**: CAP-compliant messages for NG-911 integration

Configured per organization preferences.

## Security

- Row Level Security (RLS) on all database tables
- Role-based access control (admin, ngo, responder, viewer)
- Audit logging for all sensitive operations
- PII minimization in data collection
- Human-in-the-loop for critical actions

## Retraining Pipeline

Located in `ml/retrain.py`:

1. Reads labeled outcomes from feedback table
2. Retrains models with new data
3. Version bumps and artifact storage
4. Automatic deployment (with approval)
5. Drift detection and monitoring

## 2-Minute Demo Script

1. Start services: `docker-compose up`
2. Open dashboard: http://localhost:3000
3. View real-time alerts on the map
4. Check KPI metrics in dashboard cards
5. Click on alert markers to see details
6. Filter alerts by severity and status
7. View API docs: http://localhost:8000/docs
8. Mock ingest service automatically generates test events

## Testing

```bash
npm run build
npm run typecheck
```

## Project Structure

```
├── app/                    # Next.js app router
│   ├── page.tsx           # Homepage
│   ├── dashboard/         # Dashboard page
│   └── layout.tsx         # Root layout
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── models/       # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── requirements.txt
│   └── Dockerfile
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── map-component.tsx # Mapbox integration
├── lib/                   # Utilities
│   ├── supabase.ts       # Supabase client
│   └── types.ts          # TypeScript types
├── ml/                    # ML models and notebooks
│   ├── models/           # Trained models
│   └── notebooks/        # Jupyter notebooks
├── config/                # Configuration files
│   └── alert_rules.yaml  # Alert fusion rules
└── docker-compose.yml     # Docker orchestration
```

## Production Deployment

For production deployment:

1. Use environment-specific configuration
2. Enable SSL/TLS for all services
3. Set up proper secret management
4. Configure monitoring and logging
5. Implement rate limiting
6. Set up backup and disaster recovery
7. Use Kubernetes manifests (optional)

## Contributing

This is a prototype system. For production use:
- Add comprehensive test coverage
- Implement proper authentication
- Add rate limiting and DDoS protection
- Set up monitoring and alerting
- Implement proper model versioning
- Add CI/CD pipelines

## License

MIT
