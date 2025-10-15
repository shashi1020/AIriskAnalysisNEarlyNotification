import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'ngo' | 'responder' | 'viewer'
          created_at: string
          last_active: string
        }
      }
      alerts: {
        Row: {
          id: string
          primary_type: string
          component_scores: any
          final_score: number
          severity: 'info' | 'watch' | 'warning' | 'critical'
          location_id: string | null
          evidence: any[]
          recommended_action: string | null
          status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed'
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
      }
      locations: {
        Row: {
          id: string
          name: string
          geom: any
          centroid: any
          meta: any
        }
      }
    }
  }
}
