// lib/alerts.ts
import { supabase } from './supabase'

export const fetchAlertsByRegion = async (regionId: string) => {
  const { data: region } = await supabase
    .from('locations')
    .select('id, name, geom')
    .eq('id', regionId)
    .single()

  if (!region) return []

  // Fetch alerts whose locations are within the region polygon
  const { data: alerts } = await supabase.rpc('alerts_within_region', {
    region_geom: region.geom
  })

  return alerts || []
}
