'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Search, X } from 'lucide-react'
import { reverseGeocode, getCurrentPosition, isValidCoordinate, DEFAULT_CENTER, STREET_ZOOM } from '@/lib/gis'

interface MapPickerProps {
  latitude?: number
  longitude?: number
  onLocationSelect: (data: {
    latitude: number
    longitude: number
    accuracy?: number
    address: string
    ward: string
    zone: string
    city: string
  }) => void
  height?: string
}

export default function MapPicker({ latitude, longitude, onLocationSelect, height = '400px' }: MapPickerProps) {
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [L, setL] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [mapReady, setMapReady] = useState(false)

  // Dynamically import Leaflet (client-side only)
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default)
    })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!L || !mapContainerRef.current || mapRef.current) return

    const center: [number, number] = latitude && longitude
      ? [latitude, longitude]
      : DEFAULT_CENTER

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: latitude ? STREET_ZOOM : 5,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Custom marker icon
    const icon = L.divIcon({
      html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
      </div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })

    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude], { icon, draggable: true }).addTo(map)
      markerRef.current.on('dragend', async (e: any) => {
        const pos = e.target.getLatLng()
        await handleLocationUpdate(pos.lat, pos.lng)
      })
    }

    // Click to place marker
    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
        markerRef.current.on('dragend', async (ev: any) => {
          const pos = ev.target.getLatLng()
          await handleLocationUpdate(pos.lat, pos.lng)
        })
      }
      await handleLocationUpdate(lat, lng)
    })

    mapRef.current = map
    setMapReady(true)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [L])

  const handleLocationUpdate = async (lat: number, lng: number) => {
    if (!isValidCoordinate(lat, lng)) return
    setIsLoading(true)
    try {
      const geo = await reverseGeocode(lat, lng)
      setAddress(geo.address)
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        address: geo.address,
        ward: geo.ward,
        zone: geo.zone,
        city: geo.city,
      })
    } catch {
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        ward: '', zone: '', city: '',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGPSCapture = async () => {
    setIsLoading(true)
    try {
      const pos = await getCurrentPosition()
      if (mapRef.current && L) {
        mapRef.current.setView([pos.latitude, pos.longitude], STREET_ZOOM)
        const icon = L.divIcon({
          html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
          </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })
        if (markerRef.current) {
          markerRef.current.setLatLng([pos.latitude, pos.longitude])
        } else {
          markerRef.current = L.marker([pos.latitude, pos.longitude], { icon, draggable: true }).addTo(mapRef.current)
          markerRef.current.on('dragend', async (e: any) => {
            const p = e.target.getLatLng()
            await handleLocationUpdate(p.lat, p.lng)
          })
        }
      }
      await handleLocationUpdate(pos.latitude, pos.longitude)
    } catch (err: any) {
      alert('Unable to capture GPS: ' + (err.message || 'Please enable location services'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PublicGrievanceSystem/1.0' }
      })
      const data = await res.json()
      if (data.length > 0) {
        const { lat, lon } = data[0]
        const numLat = parseFloat(lat)
        const numLng = parseFloat(lon)
        if (mapRef.current) {
          mapRef.current.setView([numLat, numLng], STREET_ZOOM)
        }
        if (L && mapRef.current) {
          const icon = L.divIcon({
            html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
              <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
            </div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })
          if (markerRef.current) {
            markerRef.current.setLatLng([numLat, numLng])
          } else {
            markerRef.current = L.marker([numLat, numLng], { icon, draggable: true }).addTo(mapRef.current)
          }
        }
        await handleLocationUpdate(numLat, numLng)
      }
    } catch {
      // Ignore search errors
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGPSCapture}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Navigation className="w-4 h-4" />
          {isLoading ? 'Detecting...' : 'Auto GPS'}
        </button>
        <div className="flex-1 flex gap-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder="Search location..."
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
        <div ref={mapContainerRef} style={{ height, width: '100%' }} />
        {!mapReady && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-bounce" />
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="absolute top-3 right-3 bg-white shadow-lg rounded-lg px-3 py-2 text-xs text-gray-600 flex items-center gap-2 z-[1000]">
            <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Getting address...
          </div>
        )}
      </div>

      {/* Address Display */}
      {address && (
        <div className="flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-emerald-800 font-medium">Detected Location</p>
            <p className="text-xs text-emerald-600 mt-0.5">{address}</p>
          </div>
          <button
            type="button"
            onClick={() => { setAddress(''); if (markerRef.current) { markerRef.current.remove(); markerRef.current = null } }}
            className="text-emerald-400 hover:text-emerald-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400">Click on map to select location, or drag the pin to adjust</p>
    </div>
  )
}
