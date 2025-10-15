"use client"

import { useEffect, useState } from "react"
import Map, { Marker } from "react-map-gl"
import { fetchAlertsByRegion } from "@/lib/alerts"
import { Alert } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export default function CrimesDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const regionId = "region-uuid-1234" // Replace with your region ID

  useEffect(() => {
    const loadAlerts = async () => {
      const data = await fetchAlertsByRegion(regionId)
      setAlerts(data)
      setLoading(false)
    }
    loadAlerts()
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white"
      case "warning": return "bg-orange-500 text-white"
      case "watch": return "bg-yellow-300 text-black"
      case "info": return "bg-blue-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  if (loading) return <p className="p-4 text-center">Loading...</p>

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* Sidebar with alerts */}
      <div className="lg:w-1/3 space-y-4 overflow-y-auto max-h-[80vh]">
        {alerts.map(alert => (
          <Card key={alert.id} className="border-l-4" style={{ borderColor: getSeverityColor(alert.severity).split(" ")[0] }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{alert.primary_type}</span>
                <Badge className={getSeverityColor(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{alert.recommended_action || "No action recommended"}</p>
              <p className="text-xs text-slate-500 mt-1">Created: {new Date(alert.created_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map */}
      <div className="lg:w-2/3 h-[80vh] rounded-lg overflow-hidden shadow-md">
        <Map
          initialViewState={{ longitude: 72.87, latitude: 19.07, zoom: 12 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          {alerts.map(alert => (
            <Marker
              key={alert.id}
              longitude={alert.location?.centroid[1] || 72.87}
              latitude={alert.location?.centroid[0] || 19.07}
              anchor="bottom"
            >
              <div className={`w-4 h-4 rounded-full ${getSeverityColor(alert.severity)}`}></div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  )
}
