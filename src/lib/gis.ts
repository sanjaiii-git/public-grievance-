// =====================================================
// GIS UTILITIES — Reverse Geocoding, Distance, Validation
// =====================================================

// Reverse geocode: lat/lng → readable address (using free Nominatim API)
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  address: string
  ward: string
  zone: string
  city: string
  state: string
  raw: any
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'PublicGrievanceSystem/1.0' }
    })
    const data = await response.json()

    const addr = data.address || {}
    return {
      address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      ward: addr.suburb || addr.neighbourhood || addr.quarter || '',
      zone: addr.city_district || addr.borough || '',
      city: addr.city || addr.town || addr.village || addr.county || '',
      state: addr.state || '',
      raw: data
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    return {
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      ward: '', zone: '', city: '', state: '',
      raw: null
    }
  }
}

// Haversine distance (km) between two coordinates
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Validate coordinates
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  )
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

// Get current GPS position
export function getCurrentPosition(): Promise<{
  latitude: number
  longitude: number
  accuracy: number
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

// Default map center (India)
export const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]
export const DEFAULT_ZOOM = 5
export const CITY_ZOOM = 12
export const STREET_ZOOM = 16

// Priority marker colors
export function getMarkerColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return '#ef4444'
    case 'high': return '#f97316'
    case 'medium': return '#eab308'
    case 'low': return '#22c55e'
    default: return '#6b7280'
  }
}

// Status marker colors
export function getStatusMarkerColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'registered': return '#eab308'
    case 'assigned': return '#a855f7'
    case 'in progress': return '#3b82f6'
    case 'resolved': return '#22c55e'
    case 'closed': return '#6b7280'
    case 'escalated': return '#ef4444'
    default: return '#6b7280'
  }
}

// SLA marker color
export function getSLAMarkerColor(slaDeadline: string): string {
  const now = new Date()
  const deadline = new Date(slaDeadline)
  const diff = deadline.getTime() - now.getTime()
  const hours = diff / (1000 * 60 * 60)

  if (hours <= 0) return '#ef4444'      // Breached — red
  if (hours <= 6) return '#f97316'      // Warning — orange
  return '#22c55e'                       // On track — green
}

// Create custom SVG marker icon HTML
export function createMarkerSVG(color: string, size: number = 24): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" stroke="white" stroke-width="1">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3" fill="white"/>
  </svg>`
}

// Simple hotspot detection (client-side helper)
export function detectClientHotspots(
  complaints: Array<{ latitude: number; longitude: number; department: string }>,
  radiusKm: number = 0.5,
  minCount: number = 3
): Array<{
  center: [number, number]
  count: number
  departments: Record<string, number>
  radius: number
}> {
  const hotspots: Array<{
    center: [number, number]
    count: number
    departments: Record<string, number>
    radius: number
  }> = []

  const processed = new Set<number>()

  for (let i = 0; i < complaints.length; i++) {
    if (processed.has(i)) continue

    const cluster: number[] = [i]
    const depts: Record<string, number> = {}
    depts[complaints[i].department] = 1

    for (let j = i + 1; j < complaints.length; j++) {
      if (processed.has(j)) continue
      const dist = haversineDistance(
        complaints[i].latitude, complaints[i].longitude,
        complaints[j].latitude, complaints[j].longitude
      )
      if (dist <= radiusKm) {
        cluster.push(j)
        depts[complaints[j].department] = (depts[complaints[j].department] || 0) + 1
      }
    }

    if (cluster.length >= minCount) {
      cluster.forEach(idx => processed.add(idx))
      const avgLat = cluster.reduce((s, idx) => s + complaints[idx].latitude, 0) / cluster.length
      const avgLng = cluster.reduce((s, idx) => s + complaints[idx].longitude, 0) / cluster.length
      hotspots.push({
        center: [avgLat, avgLng],
        count: cluster.length,
        departments: depts,
        radius: radiusKm * 1000
      })
    }
  }

  return hotspots.sort((a, b) => b.count - a.count)
}

// Generate heatmap data points from complaints
export function generateHeatmapData(
  complaints: Array<{ latitude: number; longitude: number; priority_score?: number }>
): Array<[number, number, number]> {
  return complaints
    .filter(c => c.latitude && c.longitude)
    .map(c => [
      c.latitude,
      c.longitude,
      (c.priority_score || 50) / 100 // intensity 0-1
    ])
}

// Department layer colors
export const DEPARTMENT_COLORS: Record<string, string> = {
  Electricity: '#f59e0b',
  Water: '#3b82f6',
  Road: '#6b7280',
  Sanitation: '#22c55e',
  Police: '#dc2626',
  Health: '#ec4899',
  Municipality: '#8b5cf6',
  Others: '#78716c',
}

// Get department icon emoji
export function getDepartmentEmoji(department: string): string {
  const map: Record<string, string> = {
    Electricity: '⚡',
    Water: '💧',
    Road: '🛣️',
    Sanitation: '🧹',
    Police: '🚔',
    Health: '🏥',
    Municipality: '🏛️',
    Others: '📋',
  }
  return map[department] || '📋'
}
