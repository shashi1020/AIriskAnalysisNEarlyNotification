export type UserRole = 'admin' | 'ngo' | 'responder' | 'viewer'

export type AlertSeverity = 'info' | 'watch' | 'warning' | 'critical'

export type AlertStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed'

export interface ComponentScores {
  weather: number
  crime: number
  fraud: number
}

export interface Evidence {
  type: string
  source: string
  timestamp: string
  data: any
}

export interface Alert {
  id: string
  primary_type: string
  component_scores: ComponentScores
  final_score: number
  severity: AlertSeverity
  location_id: string | null
  evidence: Evidence[]
  recommended_action: string | null
  status: AlertStatus
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  name: string
  geom: any
  centroid: {
    type: string
    coordinates: [number, number]
  }
  meta: any
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  last_active: string
}

export interface Metrics {
  alerts_count: number
  alerts_by_severity: Record<AlertSeverity, number>
  false_positive_rate: number | null
  average_lead_time: number | null
  system_uptime: number
}
