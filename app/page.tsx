"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Alert, Metrics } from "@/lib/types"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, TrendingUp, Activity } from "lucide-react"

export default function Home() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: alertsData, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)
      if (error) throw error
      setAlerts(alertsData || [])

      const { data: allAlerts } = await supabase.from("alerts").select("severity")
      const alertsBySeverity = { info: 0, watch: 0, warning: 0, critical: 0 }
      allAlerts?.forEach((a: any) => alertsBySeverity[a.severity as keyof typeof alertsBySeverity]++)
      setMetrics({ alerts_count: allAlerts?.length || 0, alerts_by_severity: alertsBySeverity, false_positive_rate: null, average_lead_time: null, system_uptime: 99.9 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white"
      case "warning": return "bg-orange-500 text-white"
      case "watch": return "bg-yellow-300 text-black"
      case "info": return "bg-blue-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Early Warning Platform</h1>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            <Link href="/dashboard"><Button variant="outline">Dashboard</Button></Link>
            <Link href="/dashboard/crimes"><Button variant="outline">Crime Dashboard</Button></Link>
            <Link href="/dashboard/fraud"><Button variant="outline">Fraud Dashboard</Button></Link>
            <Link href="/dashboard/weather"><Button variant="outline">Weather Dashboard</Button></Link>
            <Link href="/alerts"><Button>View All Alerts</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {metrics && (
            <>
              <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                <CardHeader className="flex justify-between items-center pb-2">
                  <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.alerts_count}</div>
                  <p className="text-xs text-slate-500 mt-1">Active monitoring</p>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow border-l-4 border-red-500">
                <CardHeader className="flex justify-between items-center pb-2">
                  <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{metrics.alerts_by_severity.critical}</div>
                  <p className="text-xs text-slate-500 mt-1">Requires immediate action</p>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow border-l-4 border-green-500">
                <CardHeader className="flex justify-between items-center pb-2">
                  <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                  <Activity className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{metrics.system_uptime}%</div>
                  <p className="text-xs text-slate-500 mt-1">All systems operational</p>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                <CardHeader className="flex justify-between items-center pb-2">
                  <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {metrics.false_positive_rate !== null ? `${((1 - metrics.false_positive_rate) * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Model performance</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Alerts */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest warnings and notifications from the system</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No alerts at this time</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {alerts.map((alert) => (
                  <Link key={alert.id} href={`/alerts/${alert.id}`} className="flex border-l-4 hover:bg-slate-50 transition-colors rounded-lg p-4 items-start justify-between" style={{ borderColor: getSeverityColor(alert.severity).split(" ")[0] }}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <Badge className={getSeverityColor(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
                        <h3 className="font-semibold text-slate-900">{alert.primary_type}</h3>
                        <span className="text-sm text-slate-500">Score: {(alert.final_score * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-sm text-slate-600">{alert.recommended_action || 'No specific action recommended'}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                        <span>Status: <span className="font-medium">{alert.status}</span></span>
                        <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
