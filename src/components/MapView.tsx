'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { getMarkerColor, getStatusMarkerColor, createMarkerSVG, DEFAULT_CENTER } from '@/lib/gis'

interface Complaint {
  id: string
  complaint_id: string
  title: string
  department: string
  status: string
  priority_label: string
  latitude: number
  longitude: number
  location_address?: string
  sla_deadline?: string
  sla_violated?: boolean
  created_at?: string
}

interface MapViewProps {
  complaints: Complaint[]
  center?: [number, number]
  zoom?: number
  height?: string
  colorBy?: 'priority' | 'status' | 'department'
  onMarkerClick?: (complaint: Complaint) => void
  showHeatmap?: boolean
  singleMarker?: { lat: number; lng: number; label?: string }
}

export default function MapView({
  complaints,
  center,
  zoom = 12,
  height = '500px',
  colorBy = 'priority',
  onMarkerClick,
  showHeatmap = false,
  singleMarker,
}: MapViewProps) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const [L, setL] = useState<any>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default)
    })
  }, [])

  useEffect(() => {
    if (!L || !mapContainerRef.current || mapRef.current) return

    // Calculate center from data if not provided
    let mapCenter: [number, number] = center || DEFAULT_CENTER
    if (!center && complaints.length > 0) {
      const avgLat = complaints.reduce((s, c) => s + c.latitude, 0) / complaints.length
      const avgLng = complaints.reduce((s, c) => s + c.longitude, 0) / complaints.length
      mapCenter = [avgLat, avgLng]
    }
    if (!center && singleMarker) {
      mapCenter = [singleMarker.lat, singleMarker.lng]
    }

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: singleMarker ? 16 : zoom,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    setMapReady(true)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [L])

  // Update markers when complaints change
  useEffect(() => {
    if (!mapReady || !mapRef.current || !L) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Single marker mode
    if (singleMarker) {
      const icon = L.divIcon({
        html: `<div style="background:#16a34a;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <div style="width:8px;height:8px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
        </div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })
      const marker = L.marker([singleMarker.lat, singleMarker.lng], { icon }).addTo(mapRef.current)
      if (singleMarker.label) {
        marker.bindPopup(`<div class="text-sm font-medium">${singleMarker.label}</div>`)
      }
      markersRef.current.push(marker)
      mapRef.current.setView([singleMarker.lat, singleMarker.lng], 16)
      return
    }

    // Multiple complaints
    if (complaints.length === 0) return

    const bounds: [number, number][] = []

    complaints.forEach((c) => {
      if (!c.latitude || !c.longitude) return

      let color = '#6b7280'
      if (colorBy === 'priority') color = getMarkerColor(c.priority_label)
      else if (colorBy === 'status') color = getStatusMarkerColor(c.status)

      const icon = L.divIcon({
        html: `<div style="background:${color};width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <div style="width:6px;height:6px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
        </div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      })

      const marker = L.marker([c.latitude, c.longitude], { icon }).addTo(mapRef.current)

      const slaInfo = c.sla_violated
        ? '<span style="color:#ef4444;font-weight:600;">⚠ SLA Breached</span>'
        : ''

      marker.bindPopup(`
        <div style="min-width:200px;font-family:system-ui;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${c.title}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="background:${color}22;color:${color};padding:1px 8px;border-radius:12px;font-size:11px;font-weight:600;">${c.priority_label}</span>
            <span style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:1px 8px;border-radius:12px;">${c.status}</span>
          </div>
          <div style="font-size:11px;color:#6b7280;">
            <div>📁 ${c.department}</div>
            <div>🆔 ${c.complaint_id}</div>
            ${c.location_address ? `<div>📍 ${c.location_address.substring(0, 60)}...</div>` : ''}
            ${slaInfo}
          </div>
        </div>
      `)

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(c))
      }

      markersRef.current.push(marker)
      bounds.push([c.latitude, c.longitude])
    })

    // Fit bounds to show all markers
    if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] })
    } else if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], 14)
    }
  }, [complaints, colorBy, mapReady, singleMarker])

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      {!mapReady && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-bounce" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      )}
      {/* Legend */}
      {complaints.length > 0 && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-3 z-[1000]">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {colorBy === 'priority' ? 'Priority' : colorBy === 'status' ? 'Status' : 'Legend'}
          </p>
          {colorBy === 'priority' && (
            <div className="space-y-1">
              {[
                { label: 'Critical', color: '#ef4444' },
                { label: 'High', color: '#f97316' },
                { label: 'Medium', color: '#eab308' },
                { label: 'Low', color: '#22c55e' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }}></div>
                  <span className="text-xs text-gray-600">{l.label}</span>
                </div>
              ))}
            </div>
          )}
          {colorBy === 'status' && (
            <div className="space-y-1">
              {[
                { label: 'Registered', color: '#eab308' },
                { label: 'Assigned', color: '#a855f7' },
                { label: 'In Progress', color: '#3b82f6' },
                { label: 'Resolved', color: '#22c55e' },
                { label: 'Escalated', color: '#ef4444' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }}></div>
                  <span className="text-xs text-gray-600">{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
