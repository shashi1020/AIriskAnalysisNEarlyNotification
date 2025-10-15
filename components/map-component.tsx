"use client"

import { useEffect, useRef } from 'react'
import { Alert } from '@/lib/types'

interface MapComponentProps {
  alerts: Alert[]
}

export default function MapComponent({ alerts }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default

        if (!mapContainer.current || map.current) return

        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2tjZGJmcDE2MGFhMDJ5cGJqZGRlZGx1OSJ9.xyz'

        mapboxgl.accessToken = accessToken

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-98.5795, 39.8283],
          zoom: 4
        })

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

        map.current.on('load', () => {
          updateMarkers()
        })
      } catch (error) {
        console.error('Error initializing map:', error)
      }
    }

    initMap()

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
  }, [alerts])

  const updateMarkers = async () => {
    if (!map.current) return

    const mapboxgl = (await import('mapbox-gl')).default

    const existingMarkers = document.querySelectorAll('.mapboxgl-marker')
    existingMarkers.forEach(marker => marker.remove())

    const positions: [number, number][] = [
      [-122.4194, 37.7749],
      [-118.2437, 34.0522],
      [-87.6298, 41.8781],
      [-95.3698, 29.7604],
      [-104.9903, 39.7392],
      [-75.1652, 39.9526],
      [-84.3880, 33.7490],
      [-80.1918, 25.7617]
    ]

    alerts.slice(0, 20).forEach((alert, index) => {
      const position = positions[index % positions.length]

      const el = document.createElement('div')
      el.className = 'map-marker'
      el.style.width = '24px'
      el.style.height = '24px'
      el.style.borderRadius = '50%'
      el.style.cursor = 'pointer'
      el.style.border = '2px solid white'
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      switch (alert.severity) {
        case 'critical':
          el.style.backgroundColor = '#ef4444'
          break
        case 'warning':
          el.style.backgroundColor = '#f97316'
          break
        case 'watch':
          el.style.backgroundColor = '#eab308'
          break
        case 'info':
          el.style.backgroundColor = '#3b82f6'
          break
        default:
          el.style.backgroundColor = '#6b7280'
      }

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: 600; margin-bottom: 4px; color: #1e293b;">${alert.primary_type}</h3>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            <strong>Severity:</strong> ${alert.severity.toUpperCase()}
          </p>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            <strong>Score:</strong> ${(alert.final_score * 100).toFixed(1)}%
          </p>
          <p style="font-size: 12px; color: #475569;">
            ${alert.recommended_action || 'No action specified'}
          </p>
        </div>
      `)

      new mapboxgl.Marker(el)
        .setLngLat(position)
        .setPopup(popup)
        .addTo(map.current)
    })
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {alerts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm">
          <p className="text-slate-600">No alerts to display on map</p>
        </div>
      )}
    </div>
  )
}
