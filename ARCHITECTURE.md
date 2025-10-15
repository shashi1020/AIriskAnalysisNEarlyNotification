# Early Warning Platform - Technical Architecture

## Overview

The Early Warning Platform is a full-stack application designed to detect, analyze, and respond to multi-domain risks (weather, crime, fraud) through ML-powered signal fusion and real-time alerting.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  Next.js 13 + TypeScript + Tailwind CSS + Mapbox GL            │
│  - Dashboard with real-time updates                             │
│  - Interactive map visualization                                │
│  - Alert management interface                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP/WebSocket
┌──────────────────────▼──────────────────────────────────────────┐
│                      Backend API Layer                          │
│  FastAPI + Python + Uvicorn                                     │
│  - REST API endpoints                                           │
│  - ML model serving                                             │
│  - Alert fusion engine                                          │
│  - Notification service                                         │
└──────┬───────────────┬──────────────────┬───────────────────────┘
       │               │                  │
       │ ML Models     │ Cache           │ Notifications
       │               │                 │
┌──────▼──────┐ ┌──────▼─────┐  ┌────────▼────────┐
│  ML Engine  │ │   Redis    │  │  FCM / Twilio   │
│  - Weather  │ │  - State   │  │  - Push alerts  │
│  - Crime    │ │  - Windows │  │  - SMS          │
│  - Fraud    │ │  - Dedupe  │  │  - Webhooks     │
└─────────────┘ └────────────┘  └─────────────────┘
       │
       │ Features
┌──────▼──────────────────────────────────────────────────────────┐
│              Database Layer (Supabase)                          │
│  Postgres + PostGIS + Row Level Security                        │
│  - Users, Locations, Events, Alerts                             │
│  - Models, Analyses, Feedback, Audit Logs                       │
│  - Real-time subscriptions                                      │
│  - Spatial queries with PostGIS                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Event Ingestion

```
External Source → POST /api/ingest → Event Storage → ML Pipeline
```

1. Event arrives from weather API, crime feed, or transaction system
2. Raw event stored in `events` table
3. Event payload extracted and transformed into feature vector
4. Routed to appropriate ML model based on source type

### 2. ML Analysis

```
Feature Vector → Model Prediction → Analysis Result → Evidence
```

Each domain model:
- **Weather Model**: Rule-based + time-series analysis
  - Input: rain_1h, rain_3h, forecast, zscore
  - Output: Risk score (0-1) + confidence + feature importance

- **Crime Model**: Ensemble + spatial density
  - Input: incident counts, time, location density
  - Output: Risk score + confidence + spatial features

- **Fraud Model**: Isolation Forest + behavioral analysis
  - Input: transaction patterns, device fingerprints
  - Output: Anomaly score + confidence + rule triggers

### 3. Alert Fusion

```
Component Scores → Weighted Fusion → Severity Calculation → Alert Creation
```

Alert Manager process:
1. Receives component scores from all active models
2. Applies domain weights: `weather: 0.4, crime: 0.35, fraud: 0.25`
3. Calculates final score: `final_score = Σ(score_i × weight_i)`
4. Determines severity based on thresholds:
   - Critical: ≥ 0.85
   - Warning: ≥ 0.65
   - Watch: ≥ 0.45
   - Info: < 0.45
5. Checks business rules:
   - Deduplication (spatial + temporal)
   - Corroboration requirements
   - Human-in-the-loop triggers
6. Creates alert with full evidence chain

### 4. Notification Dispatch

```
Alert → Notification Service → Multiple Channels → Recipients
```

Notification flow:
1. Alert severity determines channels
2. Recipient list fetched based on org/role
3. Messages formatted per channel (FCM/SMS/Webhook)
4. CAP-compliant messages for NG-911 integration
5. Delivery status tracked

## Database Schema

### Core Tables

#### users
```sql
id              uuid PRIMARY KEY
email           text UNIQUE NOT NULL
name            text NOT NULL
role            enum (admin, ngo, responder, viewer)
hashed_password text
created_at      timestamptz
last_active     timestamptz
```

#### locations
```sql
id       uuid PRIMARY KEY
name     text NOT NULL
geom     geometry(Polygon, 4326)    -- PostGIS polygon
centroid geometry(Point, 4326)      -- PostGIS point
meta     jsonb                       -- Additional metadata
```

#### events
```sql
id           uuid PRIMARY KEY
source       text NOT NULL              -- "weather", "crime", "fraud"
payload      jsonb NOT NULL             -- Raw event data
ingested_at  timestamptz DEFAULT now()
location_id  uuid REFERENCES locations
raw          jsonb                      -- Original unprocessed data
```

#### models
```sql
id          uuid PRIMARY KEY
name        text NOT NULL               -- Model identifier
version     text NOT NULL               -- Version string
path        text NOT NULL               -- Storage path
metadata    jsonb                       -- Model info, metrics
deployed_at timestamptz DEFAULT now()
```

#### analyses
```sql
id             uuid PRIMARY KEY
type           text NOT NULL             -- Analysis domain
input_features jsonb NOT NULL           -- Feature vector used
model_id       uuid REFERENCES models
score          float NOT NULL            -- Risk score (0-1)
confidence     float NOT NULL            -- Confidence (0-1)
created_at     timestamptz DEFAULT now()
metadata       jsonb                     -- Additional info
```

#### alerts
```sql
id                 uuid PRIMARY KEY
primary_type       text NOT NULL           -- Dominant signal type
component_scores   jsonb NOT NULL          -- {weather: 0.8, crime: 0.3}
final_score        float NOT NULL          -- Fused score (0-1)
severity           enum (info, watch, warning, critical)
location_id        uuid REFERENCES locations
evidence           jsonb                   -- Array of evidence items
recommended_action text
status             enum (open, acknowledged, in_progress, resolved, dismissed)
assigned_to        uuid REFERENCES users
created_at         timestamptz DEFAULT now()
updated_at         timestamptz DEFAULT now()
```

#### feedback
```sql
id         uuid PRIMARY KEY
alert_id   uuid REFERENCES alerts NOT NULL
user_id    uuid REFERENCES users NOT NULL
outcome    enum (true_positive, false_positive, partial)
notes      text
created_at timestamptz DEFAULT now()
```

#### audit_logs
```sql
id        uuid PRIMARY KEY
user_id   uuid REFERENCES users
action    text NOT NULL              -- Action description
details   jsonb                       -- Action metadata
timestamp timestamptz DEFAULT now()
```

### Indexes

Spatial indexes on `locations.geom` and `locations.centroid` for efficient spatial queries.

Time-based indexes on `events.ingested_at`, `alerts.created_at` for temporal filtering.

Score indexes on `alerts.final_score` for threshold queries.

## Security

### Row Level Security (RLS)

All tables have RLS enabled with restrictive policies:

- **users**: Users can view own profile, admins can view all
- **locations**: Authenticated users can read, admins can manage
- **events**: Authenticated users can read, system can insert
- **alerts**: Authenticated users can read, responders can update
- **feedback**: Users can view own, submit new feedback
- **audit_logs**: Admins only

### Authentication

- Supabase Auth for user management
- JWT tokens for API authentication
- Role-based access control (RBAC)
- Service role key for backend operations

### Data Protection

- PII minimization in event payloads
- Encryption in transit (TLS)
- Encryption at rest (Supabase)
- Audit logging for sensitive operations

## ML Pipeline

### Model Interface

All models implement a standard interface:

```python
async def predict(features: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "score": float,           # Risk score 0-1
        "confidence": float,      # Confidence 0-1
        "top_features": [         # Feature importance
            {"name": str, "contribution": float}
        ],
        "meta": dict              # Model-specific metadata
    }
```

### Feature Engineering

#### Weather Features
```python
{
    "rain_1h": float,          # mm in last hour
    "rain_3h": float,          # mm in last 3 hours
    "rain_6h": float,          # mm in last 6 hours
    "forecast_rain_3h": float, # Predicted mm next 3h
    "temp_max_24h": float,     # Max temp last 24h
    "zscore_recent": float     # Anomaly score
}
```

#### Crime Features
```python
{
    "incidents_last_1h": int,    # Count last hour
    "incidents_last_3h": int,    # Count last 3 hours
    "incidents_last_24h": int,   # Count last day
    "hour_of_day": int,          # 0-23
    "weekday": int,              # 0-6
    "kde_density": float,        # Kernel density estimate
    "neighbor_incidents": int    # Nearby area count
}
```

#### Fraud Features
```python
{
    "txn_amount": float,           # Transaction value
    "account_age_days": int,       # Days since creation
    "txn_count_1h": int,          # Transactions last hour
    "unique_devices_24h": int,    # Device count last day
    "avg_txn_amount_7d": float,   # 7-day average
    "is_new_device_flag": bool    # First time device
}
```

### Model Training & Deployment

1. **Training**: Use Jupyter notebooks in `ml/notebooks/`
2. **Serialization**: Save as pickle/ONNX in `ml/models/`
3. **Registration**: Insert metadata into `models` table
4. **Deployment**: Model loader loads on startup or API call
5. **Versioning**: Timestamp-based versions (v20241015_143022)
6. **Rollback**: Keep previous versions, switch via metadata

### Retraining Pipeline

```python
# ml/retrain.py workflow:
1. Load feedback data from database
2. Prepare training dataset (label mapping)
3. Train new model version
4. Calculate performance metrics
5. Save model artifact
6. Register in database
7. Optional: Auto-deploy if metrics improve
```

Triggered by:
- Scheduled cron job (weekly)
- Minimum feedback threshold (100+ samples)
- Manual trigger by admin
- Drift detection alert

## Alert Fusion Logic

### Configuration (config/alert_rules.yaml)

```yaml
domain_weights:
  weather: 0.4    # Weather has highest weight
  crime: 0.35     # Crime is secondary
  fraud: 0.25     # Fraud is tertiary

severity_thresholds:
  critical: 0.85  # Immediate action required
  warning: 0.65   # Elevated risk
  watch: 0.45     # Monitoring needed
  info: 0.0       # Informational

required_corroboration: 2  # Signals needed for auto-escalation

auto_escalation_enabled: true
auto_escalation_confidence: 0.85

dedupe_radius_meters: 1000      # Spatial deduplication
dedupe_window_minutes: 30       # Temporal deduplication

rate_limit_per_org: 100         # Max alerts/hour
```

### Fusion Algorithm

```python
def fuse_signals(component_scores, confidences, evidence):
    # 1. Weighted aggregation
    final_score = sum(
        component_scores[domain] * weights[domain]
        for domain in weights
    )

    # 2. Confidence adjustment
    avg_confidence = mean(confidences.values())
    adjusted_score = final_score * avg_confidence

    # 3. Severity calculation
    severity = calculate_severity(adjusted_score)

    # 4. Business rules
    active_signals = count_active_signals(component_scores)

    # 5. Human-in-the-loop check
    if severity == "critical":
        if active_signals < required_corroboration:
            requires_approval = True
        if avg_confidence < auto_escalation_confidence:
            requires_approval = True

    # 6. Deduplication
    if is_duplicate(location, type, score):
        return None  # Skip duplicate

    # 7. Create alert
    return create_alert(...)
```

## API Architecture

### REST Endpoints

Base URL: `http://localhost:8000/api`

#### Ingest
- `POST /ingest` - Ingest raw event

#### Alerts
- `GET /alerts` - List alerts (with filters)
- `GET /alerts/{id}` - Get alert details
- `POST /alerts/{id}/ack` - Acknowledge alert
- `POST /alerts/{id}/assign` - Assign to user

#### Models
- `GET /models` - List deployed models
- `POST /models/deploy` - Deploy new model
- `POST /models/predict` - Run prediction

#### Feedback
- `POST /feedback` - Submit feedback

#### Metrics
- `GET /metrics` - System metrics

#### Health
- `GET /health` - Health check

### OpenAPI Documentation

Interactive docs at: `http://localhost:8000/docs`

Includes:
- Request/response schemas
- Authentication requirements
- Example payloads
- Error codes

## Frontend Architecture

### Next.js App Router Structure

```
app/
├── page.tsx              # Homepage with KPIs
├── dashboard/
│   └── page.tsx          # Map + filters
├── alerts/
│   ├── page.tsx          # Alert list
│   └── [id]/
│       └── page.tsx      # Alert detail
└── layout.tsx            # Root layout
```

### Component Hierarchy

```
Layout
├── Header (navigation)
├── Main Content
│   ├── Dashboard
│   │   ├── MapComponent (Mapbox)
│   │   ├── FilterPanel
│   │   └── AlertList
│   ├── AlertsPage
│   │   └── AlertCard (repeated)
│   └── AlertDetailPage
│       ├── OverviewCard
│       ├── ComponentScoresChart
│       └── EvidenceList
└── Footer
```

### State Management

- **Server State**: React Query (via Supabase client)
- **UI State**: React useState + useEffect
- **Real-time**: Supabase Realtime subscriptions

### Real-time Updates

```typescript
// Subscribe to alert changes
const subscription = supabase
  .channel('alerts_changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'alerts' },
    (payload) => {
      // Reload alerts
      loadAlerts()
    }
  )
  .subscribe()
```

## Deployment

### Development
```bash
npm run dev              # Frontend on :3000
uvicorn app.main:app    # Backend on :8000
```

### Production Options

#### Frontend (Vercel)
```bash
npm run build
npm run start
```

#### Backend (Railway/Render)
```bash
docker build -t early-warning-api .
docker run -p 8000:8000 early-warning-api
```

#### Docker Compose (All Services)
```bash
docker-compose up -d
```

## Monitoring & Observability

### Metrics to Track

- Alert volume (by severity, domain, time)
- Model performance (precision, recall, F1)
- False positive rate
- Response time (alert creation to acknowledgment)
- API latency (p50, p95, p99)
- System uptime

### Logging

- Structured logs (JSON format)
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Context: user_id, alert_id, trace_id
- Destinations: stdout, file, external service

### Alerting

- System health checks every 60s
- Alert on: API errors, DB connection loss, high latency
- Notification channels: Email, Slack, PagerDuty

## Performance Optimization

### Frontend
- Code splitting (dynamic imports)
- Image optimization (Next.js Image)
- CSS optimization (Tailwind purge)
- Bundle size monitoring

### Backend
- Response caching (Redis)
- Database connection pooling
- Async operations (FastAPI)
- ML model caching

### Database
- Index optimization
- Query performance monitoring
- Connection pooling
- Read replicas for analytics

## Testing Strategy

### Unit Tests
- Model prediction functions
- Alert fusion logic
- Feature extraction

### Integration Tests
- API endpoints
- Database operations
- External service mocks

### E2E Tests
- User workflows
- Alert lifecycle
- Map interactions

## Future Enhancements

1. **Advanced ML**: Deep learning for time-series forecasting
2. **Streaming**: Apache Kafka for high-throughput ingestion
3. **Mobile App**: React Native with offline support
4. **Advanced Analytics**: Custom dashboards, reports
5. **Multi-tenancy**: Organization isolation
6. **Internationalization**: Multi-language support
7. **Advanced Workflows**: Automated response actions
8. **Integration Hub**: Third-party service connectors

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
