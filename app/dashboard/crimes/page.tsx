"use client"

import { useEffect, useState, useRef } from "react"
import { CrimeDetection, CrimeClass, AlertPriority } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Eye, Clock, MapPin, Camera, AlertTriangle, CheckCircle, Users, Video } from "lucide-react"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

// Dummy data for demonstration
const dummyCrimeDetections: CrimeDetection[] = [
  {
    entity_id: "crime-001",
    timestamp: "2024-01-15T14:30:25.000Z",
    source: {
      camera_id: "CAM-001",
      frame_number: 1247,
      processing_node: "edge-node-3"
    },
    prediction: {
      predicted_class: "theft",
      confidence: 0.94,
      threat_score: 87,
      reason: "Person removing items from unattended bag",
      explanation: {
        key_features: ["suspicious_behavior", "property_removal", "unattended_items"],
        confidence_breakdown: { theft: 0.94, suspicious_activity: 0.06 }
      }
    },
    location: {
      latitude: 19.0760,
      longitude: 72.8777,
      address: "Marine Drive, Mumbai",
      region: "Mumbai"
    },
    detection: {
      bounding_box: { x_min: 120, y_min: 80, x_max: 200, y_max: 180, unit: "pixels" },
      evidence: {
        image_path: "/evidence/theft_001.jpg",
        video_clip_path: "/evidence/theft_001.mp4",
        thumbnail_path: "/evidence/theft_001_thumb.jpg"
      },
      inference_time_ms: 45.2
    },
    decision: {
      auto_alert: true,
      alert_channels: ["dashboard", "sms"],
      notified_entities: ["police_station_12", "security_team"],
      priority: "high",
      requires_human_review: true
    },
    metadata: {
      model_name: "crime-detection-v3",
      model_version: "3.2.1",
      confidence_thresholds: { auto_alert: 0.85, high_priority: 0.9, human_review: 0.6 }
    }
  },
  {
    entity_id: "crime-002",
    timestamp: "2024-01-15T15:45:12.000Z",
    source: {
      camera_id: "CAM-015",
      frame_number: 2891,
      processing_node: "edge-node-7"
    },
    prediction: {
      predicted_class: "assault",
      confidence: 0.89,
      threat_score: 92,
      reason: "Physical altercation between two individuals",
      explanation: {
        key_features: ["physical_contact", "aggressive_posture", "multiple_people"],
        confidence_breakdown: { assault: 0.89, robbery: 0.08, suspicious_activity: 0.03 }
      }
    },
    location: {
      latitude: 19.0176,
      longitude: 72.8562,
      address: "Bandra Kurla Complex, Mumbai",
      region: "Mumbai"
    },
    detection: {
      bounding_box: { x_min: 150, y_min: 100, x_max: 280, y_max: 220, unit: "pixels" },
      evidence: {
        image_path: "/evidence/assault_002.jpg",
        video_clip_path: "/evidence/assault_002.mp4",
        thumbnail_path: "/evidence/assault_002_thumb.jpg"
      },
      inference_time_ms: 52.8
    },
    decision: {
      auto_alert: true,
      alert_channels: ["dashboard", "sms", "email"],
      notified_entities: ["police_station_12", "emergency_response"],
      priority: "critical",
      requires_human_review: true
    },
    metadata: {
      model_name: "crime-detection-v3",
      model_version: "3.2.1",
      confidence_thresholds: { auto_alert: 0.85, high_priority: 0.9, human_review: 0.6 }
    }
  },
  {
    entity_id: "crime-003",
    timestamp: "2024-01-15T16:20:35.000Z",
    source: {
      camera_id: "CAM-008",
      frame_number: 3456,
      processing_node: "edge-node-2"
    },
    prediction: {
      predicted_class: "suspicious_activity",
      confidence: 0.72,
      threat_score: 65,
      reason: "Person loitering near vehicle for extended period",
      explanation: {
        key_features: ["loitering", "vehicle_proximity", "extended_duration"],
        confidence_breakdown: { suspicious_activity: 0.72, theft: 0.18, burglary: 0.10 }
      }
    },
    location: {
      latitude: 19.0330,
      longitude: 72.8570,
      address: "Andheri West, Mumbai",
      region: "Mumbai"
    },
    detection: {
      bounding_box: { x_min: 80, y_min: 120, x_max: 140, y_max: 200, unit: "pixels" },
      evidence: {
        image_path: "/evidence/suspicious_003.jpg",
        thumbnail_path: "/evidence/suspicious_003_thumb.jpg"
      },
      inference_time_ms: 38.5
    },
    decision: {
      auto_alert: false,
      alert_channels: ["dashboard"],
      notified_entities: [],
      priority: "medium",
      requires_human_review: true
    },
    metadata: {
      model_name: "crime-detection-v3",
      model_version: "3.2.1",
      confidence_thresholds: { auto_alert: 0.85, high_priority: 0.9, human_review: 0.6 }
    }
  }
]

function CrimesDashboard() {
  const [crimeDetections, setCrimeDetections] = useState<CrimeDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDetection, setSelectedDetection] = useState<CrimeDetection | null>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)

  useEffect(() => {
    // Simulate loading with dummy data
    const loadDetections = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      setCrimeDetections(dummyCrimeDetections)
      setLoading(false)
    }
    loadDetections()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default

        if (!mapContainer.current || map.current) {
          console.log('Map container not ready or map already exists')
          return
        }

        const accessToken = MAPBOX_TOKEN || 'pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2tjZGJmcDE2MGFhMDJ5cGJqZGRlZGx1OSJ9.xyz'
        
        console.log('Initializing map with token:', accessToken ? 'Present' : 'Missing')
        console.log('Map container:', mapContainer.current)

        mapboxgl.accessToken = accessToken

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [72.87, 19.07],
          zoom: 12
        })

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

        map.current.on('load', () => {
          console.log('Map loaded successfully')
          updateMarkers()
        })

        map.current.on('error', (e) => {
          console.error('Map error:', e)
        })
      } catch (error) {
        console.error('Error initializing map:', error)
      }
    }

    // Add a small delay to ensure the container is rendered
    setTimeout(initMap, 100)

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (map.current && map.current.loaded()) {
      updateMarkers()
    }
  }, [crimeDetections, selectedDetection])

  const updateMarkers = async () => {
    if (!map.current) return

    const mapboxgl = (await import('mapbox-gl')).default

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker')
    existingMarkers.forEach(marker => marker.remove())

    crimeDetections.forEach(detection => {
      const el = document.createElement('div')
      el.className = 'map-marker'
      el.style.width = '24px'
      el.style.height = '24px'
      el.style.borderRadius = '50%'
      el.style.cursor = 'pointer'
      el.style.border = '2px solid white'
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
      el.style.backgroundColor = getCrimeClassColor(detection.prediction.predicted_class).replace('bg-', '')

      if (selectedDetection?.entity_id === detection.entity_id) {
        el.style.boxShadow = '0 0 0 4px #3b82f6'
      }

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: 600; margin-bottom: 4px; color: #1e293b;">
            ${detection.prediction.predicted_class.replace('_', ' ').toUpperCase()}
          </h3>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            <strong>Priority:</strong> ${detection.decision.priority.toUpperCase()}
          </p>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            <strong>Confidence:</strong> ${(detection.prediction.confidence * 100).toFixed(1)}%
          </p>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            <strong>Threat Score:</strong> ${detection.prediction.threat_score}/100
          </p>
          <p style="font-size: 12px; color: #475569;">
            ${detection.prediction.reason}
          </p>
        </div>
      `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([detection.location.longitude, detection.location.latitude])
        .setPopup(popup)
        .addTo(map.current)

      el.addEventListener('click', () => {
        setSelectedDetection(detection)
      })
    })
  }

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case "critical": return "bg-red-600 text-white"
      case "high": return "bg-orange-500 text-white"
      case "medium": return "bg-yellow-500 text-black"
      case "low": return "bg-blue-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  const getCrimeClassColor = (crimeClass: CrimeClass) => {
    switch (crimeClass) {
      case "theft": return "bg-purple-500"
      case "assault": return "bg-red-500"
      case "vandalism": return "bg-orange-500"
      case "robbery": return "bg-red-600"
      case "burglary": return "bg-indigo-500"
      case "fraud": return "bg-yellow-500"
      case "drug_dealing": return "bg-green-500"
      case "suspicious_activity": return "bg-gray-500"
      default: return "bg-gray-400"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading crime detections...</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* Sidebar with crime detections */}
      <div className="lg:w-1/3 space-y-4 overflow-y-auto max-h-[80vh]">
        {crimeDetections.map(detection => (
          <Card 
            key={detection.entity_id} 
            className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${
              selectedDetection?.entity_id === detection.entity_id ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{ borderColor: getCrimeClassColor(detection.prediction.predicted_class).replace('bg-', '') }}
            onClick={() => setSelectedDetection(detection)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">
                  {detection.prediction.predicted_class.replace('_', ' ')}
              </CardTitle>
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(detection.decision.priority)}>
                    {detection.decision.priority.toUpperCase()}
                  </Badge>
                  {detection.decision.requires_human_review && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <Eye className="w-3 h-3 mr-1" />
                      Review
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-sm">
                {detection.prediction.reason}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{detection.location.address}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Camera className="w-4 h-4" />
                <span>{detection.source.camera_id}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Confidence:</span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${detection.prediction.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {(detection.prediction.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">{detection.prediction.threat_score}/100</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatTimestamp(detection.timestamp)}</span>
              </div>

              {detection.decision.auto_alert && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Auto-alert sent</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content area */}
      <div className="lg:w-2/3 space-y-6">
      {/* Map */}
        <div className="relative h-[50vh] rounded-lg overflow-hidden shadow-md bg-gray-100 border-2 border-dashed border-gray-300">
          <div 
            ref={mapContainer} 
            className="w-full h-full min-h-[300px] bg-blue-50" 
            style={{ minHeight: '300px' }}
          />
          {!map.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading map...</p>
                <p className="text-xs text-gray-500 mt-1">If map doesn't load, check Mapbox token</p>
                <p className="text-xs text-gray-500 mt-1">Container size: {mapContainer.current?.offsetWidth}x{mapContainer.current?.offsetHeight}</p>
              </div>
            </div>
          )}
        </div>

        {/* Selected detection details */}
        {selectedDetection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="capitalize">{selectedDetection.prediction.predicted_class.replace('_', ' ')}</span>
                <Badge className={getPriorityColor(selectedDetection.decision.priority)}>
                  {selectedDetection.decision.priority.toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>{selectedDetection.prediction.reason}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Detection Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Detection Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Camera:</span>
                      <span className="font-mono">{selectedDetection.source.camera_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frame:</span>
                      <span>{selectedDetection.source.frame_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Node:</span>
                      <span className="font-mono">{selectedDetection.source.processing_node}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inference Time:</span>
                      <span>{selectedDetection.detection.inference_time_ms}ms</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Prediction Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span>{(selectedDetection.prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Threat Score:</span>
                      <span>{selectedDetection.prediction.threat_score}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span className="font-mono">{selectedDetection.metadata.model_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span>{selectedDetection.metadata.model_version}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Location */}
              <div>
                <h4 className="font-semibold mb-2">Location</h4>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedDetection.location.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Coordinates:</span>
                    <span className="font-mono">
                      {selectedDetection.location.latitude.toFixed(4)}, {selectedDetection.location.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Decision & Actions */}
              <div>
                <h4 className="font-semibold mb-2">Decision & Actions</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Auto Alert:</span>
                        <span className={selectedDetection.decision.auto_alert ? 'text-green-600' : 'text-gray-500'}>
                          {selectedDetection.decision.auto_alert ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Human Review:</span>
                        <span className={selectedDetection.decision.requires_human_review ? 'text-orange-600' : 'text-green-600'}>
                          {selectedDetection.decision.requires_human_review ? 'Required' : 'Not Required'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div>
                        <span className="block mb-1">Alert Channels:</span>
                        <div className="flex gap-1 flex-wrap">
                          {selectedDetection.decision.alert_channels.map(channel => (
                            <Badge key={channel} variant="outline" className="text-xs">
                              {channel.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              {selectedDetection.detection.evidence && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Evidence</h4>
                    <div className="flex gap-2">
                      {selectedDetection.detection.evidence.image_path && (
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Image
                        </Button>
                      )}
                      {selectedDetection.detection.evidence.video_clip_path && (
                        <Button variant="outline" size="sm">
                          <Video className="w-4 h-4 mr-2" />
                          View Video
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notified Entities */}
              {selectedDetection.decision.notified_entities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Notified Entities</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedDetection.decision.notified_entities.map(entity => (
                        <Badge key={entity} variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {entity.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default CrimesDashboard