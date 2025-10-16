// lib/alerts.ts
import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export const fetchAlertsByRegion = async (regionId: string) => {
  const { data: region } = await supabase
    .from('locations')
    .select('id, name, geom')
    .eq('id', regionId)
    .single()

  if (!region) return []

  const { data: alerts } = await supabase.rpc('alerts_within_region', {
    region_geom: region.geom
  })

  return alerts || []
}

// NEW: createAlert function
export const createAlert = async (payload: any) => {
  const alertId = payload.id || `alert_${uuidv4()}`

  const row = {
    id: alertId,
    primary_type: payload.type || 'fraud',
    component_scores: payload.component_scores || {},
    final_score: payload.final_score || payload.risk_score || 0,
    severity: payload.severity || 'warning',
    location_id: payload.location_id || null,
    evidence: payload.evidence || [],
    recommended_action: payload.recommended_action || null,
    status: payload.status || 'open',
    assigned_to: payload.assigned_to || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('alerts').insert([row])

  if (error) {
    console.error('Failed to insert alert:', error)
    throw error
  }

  return data
}
