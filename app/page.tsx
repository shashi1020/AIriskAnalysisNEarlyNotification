"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Shield, AlertTriangle, MapPin, Flag, TrendingUp, Activity, Zap } from "lucide-react"
import { toast, Toaster, Toast } from "react-hot-toast"
import { collection, query, orderBy, onSnapshot, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"

const LEVEL_ORDER = ["critical", "warning", "watch", "info"] as const
type Level = (typeof LEVEL_ORDER)[number]

const LEVEL_THRESHOLDS = { critical: 0.85, warning: 0.7, watch: 0.5, info: 0.0 } as const
const levelToLabel = (l: Level) => l.toUpperCase()
const getLevelFromScore = (score = 0): Level => {
  if (score >= LEVEL_THRESHOLDS.critical) return "critical"
  if (score >= LEVEL_THRESHOLDS.warning) return "warning"
  if (score >= LEVEL_THRESHOLDS.watch) return "watch"
  return "info"
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical": return { bg: "bg-rose-500", text: "text-white", light: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-600" }
    case "warning": return { bg: "bg-amber-500", text: "text-white", light: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-600" }
    case "watch": return { bg: "bg-emerald-500", text: "text-white", light: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-600" }
    case "info": default: return { bg: "bg-blue-500", text: "text-white", light: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-600" }
  }
}

function Sparkline({ values = [], width = 80, height = 24 }: { values?: number[]; width?: number; height?: number }) {
  if (!values || values.length === 0) return <svg width={width} height={height} aria-hidden />
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = width / Math.max(1, values.length - 1)
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / span) * height}`).join(" ")
  const last = values[values.length - 1]
  const stroke = last > values.reduce((a, b) => a + b, 0) / values.length ? "#f43f5e" : "#0ea5e9"
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sparkline">
      <polyline fill="none" stroke={stroke} strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Realtime alert type
interface RealtimeAlert {
  id: string
  camera_id?: number
  confidence?: number
  image_url: string
  summary: string
  timestamp: string
  weapon_type?: string
  bbox?: number[]
}

export default function Home() {
  const [alerts, setAlerts] = useState<any[]>([
    { id: 1, primary_type: "Fraud Alert", location: { name: "Delhi" }, final_score: 0.92, status: "active", created_at: new Date(), evidence: [{ source: "Financial Monitoring" }], recommended_action: "Immediate investigation required" },
    { id: 2, primary_type: "Crime Report", location: { name: "Mumbai" }, final_score: 0.78, status: "acknowledged", created_at: new Date(Date.now() - 3600000), evidence: [{ source: "Police Database" }], recommended_action: "Coordinate with local authorities" },
    { id: 3, primary_type: "Weather Advisory", location: { name: "Chennai" }, final_score: 0.65, status: "active", created_at: new Date(Date.now() - 7200000), evidence: [{ source: "Met Department" }], recommended_action: "Public warning issued" },
  ])

  const [metrics, setMetrics] = useState<any>({
    alerts_count: 42,
    alerts_by_severity: { info: 18, watch: 12, warning: 8, critical: 4 },
    additional: { sparkline: [0.3, 0.4, 0.35, 0.65, 0.72, 0.81, 0.88, 0.85, 0.92] }
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [regions] = useState([
    { id: "1", name: "All Regions" },
    { id: "2", name: "North India" },
    { id: "3", name: "South India" },
    { id: "4", name: "East India" },
  ])
  const [selectedRegion, setSelectedRegion] = useState("1")
  const [timeframe, setTimeframe] = useState("24h")

  const totalAlerts = metrics?.alerts_count ?? 0
  const levelEntries = useMemo(() => {
    const by = metrics?.alerts_by_severity ?? { info: 0, watch: 0, warning: 0, critical: 0 }
    return LEVEL_ORDER.map((lvl) => ({ level: lvl as Level, count: (by as any)[lvl] || 0 }))
  }, [metrics])

  // --- Real-time Firestore Alerts Hook ---
  useEffect(() => {
    const alertsRef = new Set<string>()
    const alertsCollection = collection(db, "alerts")
    const q = query(alertsCollection, orderBy("timestamp", "desc"))
    const unsubscribe = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const docData = change.doc.data() as DocumentData
          const id = change.doc.id
          if (!alertsRef.has(id)) {
            alertsRef.add(id)

            const timestamp =
              typeof docData.timestamp === "string"
                ? docData.timestamp
                : docData.timestamp?.toDate?.().toISOString() || new Date().toISOString()

            const alert: RealtimeAlert = {
              id,
              camera_id: docData.camera_id,
              confidence: docData.confidence,
              image_url: docData.image_url,
              summary: docData.summary,
              timestamp,
              weapon_type: docData.weapon_type,
              bbox: docData.bbox
            }

            // Update dashboard list
            setAlerts(prev => [{ ...alert, primary_type: alert.summary, final_score: alert.confidence ?? 0, location: { name: "Unknown" }, status: "active", created_at: new Date(alert.timestamp), evidence: [{ source: "Realtime" }], recommended_action: "Investigate immediately" }, ...prev])

            // Show toast popup
            toast.custom((t: Toast) => (
              <div className="bg-red-600 text-white p-3 rounded-lg shadow-md flex items-center gap-3">
                <img src={alert.image_url} alt="alert" className="w-12 h-12 object-cover rounded"/>
                <div>
                  <p className="font-semibold">{alert.summary}</p>
                  <p className="text-xs">{alert.weapon_type?.toUpperCase() || "ALERT"} detected</p>
                  <p className="text-xs text-gray-200">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ), { duration: 5000 })
          }
        }
      })
    })
    return () => unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500/30 border-t-indigo-400 mx-auto" />
        <p className="mt-6 text-indigo-300 font-medium">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <Toaster position="top-right" reverseOrder={false} />
      {/* ... rest of your existing dashboard code ... */}
      {/* Header, Summary Cards, Severity Grid, Recent Alerts remain unchanged */}
      <header className="border-b border-indigo-500/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Gov Alert Platform
              </h1>
              <p className="text-sm text-indigo-300/70 mt-1">NGO Crisis & Intelligence Hub</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-300/60">
            <Activity className="h-4 w-4" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-6 mt-4 flex gap-2 flex-wrap">
          {[{ label: "Dashboard", href: "/dashboard" }, { label: "Crime", href: "/dashboard/crimes" }, { label: "Fraud", href: "/dashboard/fraud" }, { label: "Weather", href: "/dashboard/weather" }].map(btn => (
            <Link key={btn.href} href={btn.href} className="px-3 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-sm hover:bg-indigo-600/40 hover:border-indigo-500/70 transition">
              {btn.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 via-slate-900/50 to-blue-500/10 border border-indigo-500/30 p-6 hover:border-indigo-500/60 transition shadow-xl hover:shadow-2xl">
            <div className="absolute -right-8 -top-8 h-24 w-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:blur-3xl transition" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-indigo-300/70 text-sm font-medium">Total Alerts</h3>
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-indigo-300 to-blue-300 bg-clip-text mb-2">
                {totalAlerts}
              </div>
              <p className="text-indigo-300/60 text-sm">In selected timeframe</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/10 via-slate-900/50 to-blue-500/10 border border-cyan-500/30 p-6 hover:border-cyan-500/60 transition shadow-xl hover:shadow-2xl">
            <div className="absolute -right-8 -top-8 h-24 w-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:blur-3xl transition" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-cyan-300/70 text-sm font-medium">Trend Analysis</h3>
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>
              <Sparkline values={(metrics as any)?.additional?.sparkline || []} width={280} height={50} />
              <p className="text-cyan-300/60 text-sm mt-3">Last 9 data points</p>
            </div>
          </div>
        </div>

        {/* Severity Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {levelEntries.map(({ level, count }) => {
            const color = getSeverityColor(level)
            const pct = totalAlerts > 0 ? Math.round((count / totalAlerts) * 100) : 0
            return (
              <div
                key={level}
                className={`group relative overflow-hidden rounded-xl border transition shadow-lg hover:shadow-xl ${color.light} ${color.border} hover:border-opacity-100 p-6`}
              >
                <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition ${color.bg}`} />
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${color.bg} ${color.text} shadow-lg`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{levelToLabel(level)}</h3>
                      <p className="text-xs text-gray-600">≥ {Math.round(LEVEL_THRESHOLDS[level]*100)}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold text-gray-900">{count}</div>
                      <div className="text-xs font-medium text-gray-600">{pct}%</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 ${color.bg} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <Sparkline values={(metrics as any)?.additional?.sparkline || []} width={140} height={32} />

                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition">
                      Focus
                    </button>
                    <button className={`flex-1 px-3 py-2 rounded-lg ${color.bg} ${color.text} text-xs font-medium hover:opacity-90 transition`}>
                      Explore
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Alerts */}
        <div className="rounded-xl border border-indigo-500/30 bg-slate-900/50 backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="border-b border-indigo-500/30 p-6">
            <h2 className="text-xl font-bold text-transparent bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text">
              Active Alerts
            </h2>
            <p className="text-indigo-300/60 text-sm mt-1">Real-time monitoring across all domains</p>
          </div>
          
          <div className="divide-y divide-indigo-500/20">
            {alerts.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Flag className="h-14 w-14 text-indigo-500/30 mx-auto mb-4" />
                <p className="text-indigo-300/60 font-medium">No active alerts</p>
              </div>
            ) : (
              alerts.map(alert => {
                const level = getLevelFromScore(alert.final_score ?? 0)
                const color = getSeverityColor(level)
                return (
                  <div key={alert.id} className="p-6 hover:bg-indigo-500/5 transition group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color.badge} text-white`}>
                            {levelToLabel(level)}
                          </span>
                          <h3 className="font-bold text-slate-100 truncate group-hover:text-indigo-300 transition">
                            {alert.primary_type}
                          </h3>
                          <span className="text-xs text-slate-400 ml-auto hidden sm:block">
                            Score: <span className="text-indigo-300 font-semibold">{(alert.final_score*100).toFixed(0)}%</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3 text-sm text-indigo-300/70">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">{alert.location?.name || "Unknown Location"}</span>
                        </div>

                        <p className="text-slate-400 text-sm mb-3">{alert.recommended_action}</p>

                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Status: <span className="text-slate-300 font-medium">{alert.status}</span></span>
                          <span>Created: <span className="text-slate-300">{new Date(alert.created_at).toLocaleString()}</span></span>
                          <span>Source: <span className="text-slate-300">{alert.evidence?.[0]?.source || "System"}</span></span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex flex-col gap-2">
                        <button className="px-4 py-2 rounded-lg bg-indigo-600/40 border border-indigo-500/60 text-indigo-300 text-sm hover:bg-indigo-600/60 transition font-medium">
                          View
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm hover:bg-slate-800 transition font-medium">
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
