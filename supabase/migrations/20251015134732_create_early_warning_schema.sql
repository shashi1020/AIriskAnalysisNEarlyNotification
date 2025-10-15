/*
  # Early Warning Platform Database Schema

  ## Overview
  Privacy-first early-warning platform for weather, crime, and fraud detection with spatial capabilities.

  ## New Tables

  1. **users** - User accounts with role-based access
     - `id` (uuid, primary key)
     - `email` (text, unique, not null)
     - `name` (text)
     - `role` (enum: admin, ngo, responder, viewer)
     - `hashed_password` (text, nullable for OAuth)
     - `created_at` (timestamptz)
     - `last_active` (timestamptz)

  2. **locations** - Geographic areas with PostGIS geometry
     - `id` (uuid, primary key)
     - `name` (text)
     - `geom` (geometry polygon)
     - `centroid` (geometry point)
     - `meta` (jsonb) - additional metadata

  3. **events** - Raw ingested events from various sources
     - `id` (uuid, primary key)
     - `source` (text) - event source identifier
     - `payload` (jsonb) - raw event data
     - `ingested_at` (timestamptz)
     - `location_id` (uuid, foreign key)
     - `raw` (jsonb) - original unprocessed data

  4. **models** - ML model registry
     - `id` (uuid, primary key)
     - `name` (text)
     - `version` (text)
     - `path` (text) - storage path
     - `metadata` (jsonb)
     - `deployed_at` (timestamptz)

  5. **analyses** - ML model analysis results
     - `id` (uuid, primary key)
     - `type` (text) - analysis type (weather, crime, fraud)
     - `input_features` (jsonb)
     - `model_id` (uuid, foreign key)
     - `score` (float)
     - `confidence` (float)
     - `created_at` (timestamptz)
     - `metadata` (jsonb)

  6. **alerts** - Fused alerts from multiple signals
     - `id` (uuid, primary key)
     - `primary_type` (text)
     - `component_scores` (jsonb) - scores from each domain
     - `final_score` (float)
     - `severity` (enum: info, watch, warning, critical)
     - `location_id` (uuid, foreign key)
     - `evidence` (jsonb) - supporting evidence
     - `recommended_action` (text)
     - `status` (enum: open, acknowledged, in_progress, resolved, dismissed)
     - `assigned_to` (uuid, foreign key to users)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  7. **audit_logs** - Complete audit trail
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key)
     - `action` (text)
     - `details` (jsonb)
     - `timestamp` (timestamptz)

  8. **feedback** - User feedback for model retraining
     - `id` (uuid, primary key)
     - `alert_id` (uuid, foreign key)
     - `user_id` (uuid, foreign key)
     - `outcome` (enum: true_positive, false_positive, partial)
     - `notes` (text)
     - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies enforce role-based access
  - Audit logging for all sensitive operations

  ## Indexes
  - Spatial indexes on geometry columns
  - Time-based indexes for efficient queries
  - Score indexes for alert filtering
*/

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'ngo', 'responder', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'watch', 'warning', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_outcome AS ENUM ('true_positive', 'false_positive', 'partial');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  hashed_password text,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Locations table with PostGIS
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  geom geometry(Polygon, 4326),
  centroid geometry(Point, 4326),
  meta jsonb DEFAULT '{}'::jsonb
);

-- Models table
CREATE TABLE IF NOT EXISTS models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  deployed_at timestamptz DEFAULT now(),
  UNIQUE(name, version)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  payload jsonb NOT NULL,
  ingested_at timestamptz DEFAULT now(),
  location_id uuid REFERENCES locations(id),
  raw jsonb
);

-- Analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  input_features jsonb NOT NULL,
  model_id uuid REFERENCES models(id),
  score float NOT NULL,
  confidence float NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_type text NOT NULL,
  component_scores jsonb NOT NULL,
  final_score float NOT NULL,
  severity alert_severity NOT NULL,
  location_id uuid REFERENCES locations(id),
  evidence jsonb DEFAULT '[]'::jsonb,
  recommended_action text,
  status alert_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  outcome feedback_outcome NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_locations_centroid ON locations USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_events_ingested_at ON events (ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_location ON events (location_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_type ON analyses (type);
CREATE INDEX IF NOT EXISTS idx_alerts_final_score ON alerts (final_score DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts (location_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_alert ON feedback (alert_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for locations (read for authenticated)
CREATE POLICY "Authenticated users can view locations"
  ON locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage locations"
  ON locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for models
CREATE POLICY "Authenticated users can view models"
  ON models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage models"
  ON models FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for events
CREATE POLICY "Authenticated users can view events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for analyses
CREATE POLICY "Authenticated users can view analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for alerts
CREATE POLICY "Authenticated users can view alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Responders can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'ngo', 'responder')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'ngo', 'responder')
    )
  );

CREATE POLICY "System can insert alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for feedback
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can submit feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for alerts updated_at
DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, details)
  VALUES (
    auth.uid(),
    TG_OP || ' on ' || TG_TABLE_NAME,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id::text, OLD.id::text)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for sensitive operations
DROP TRIGGER IF EXISTS audit_alerts_changes ON alerts;
CREATE TRIGGER audit_alerts_changes
  AFTER INSERT OR UPDATE OR DELETE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_users_changes ON users;
CREATE TRIGGER audit_users_changes
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();