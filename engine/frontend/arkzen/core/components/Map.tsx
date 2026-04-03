'use client'

// ============================================================
// ARKZEN ENGINE — MAP
// arkzen/core/components/Map.tsx
//
// Leaflet wrapper for interactive maps.
// install: npm install leaflet react-leaflet @types/leaflet
//
// Usage:
//   <Map center={[14.5995, 120.9842]} zoom={13} markers={[...]} />
// ============================================================

import React, { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface MapMarker {
  lat:      number
  lng:      number
  title?:   string
  popup?:   string
  color?:   string   // hex color for marker
}

interface MapProps {
  center:        [number, number]   // [lat, lng]
  zoom?:         number
  markers?:      MapMarker[]
  height?:       string             // CSS height e.g. '400px'
  className?:    string
  onMarkerClick?: (marker: MapMarker) => void
  onMapClick?:   (lat: number, lng: number) => void
  tileLayer?:    'osm' | 'satellite' | 'terrain'
}

// ─────────────────────────────────────────────
// TILE LAYER URLS
// ─────────────────────────────────────────────

const TILE_LAYERS = {
  osm:       'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain:   'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
}

const TILE_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// ─────────────────────────────────────────────
// COMPONENT
// Leaflet is loaded dynamically to avoid SSR issues
// ─────────────────────────────────────────────

export const Map: React.FC<MapProps> = ({
  center,
  zoom        = 13,
  markers     = [],
  height      = '400px',
  className   = '',
  onMarkerClick,
  onMapClick,
  tileLayer   = 'osm',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<unknown>(null)
  const markersRef   = useRef<unknown[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Dynamic import to avoid SSR crash
    import('leaflet').then(L => {
      // Fix default marker icons (Leaflet quirk with bundlers)
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!).setView(center, zoom)
      mapRef.current = map

      L.tileLayer(TILE_LAYERS[tileLayer], { attribution: TILE_ATTRIBUTION }).addTo(map)

      // Map click
      if (onMapClick) {
        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          onMapClick(e.latlng.lat, e.latlng.lng)
        })
      }

      // Add markers
      addMarkers(L, map, markers, markersRef, onMarkerClick)
    })

    return () => {
      if (mapRef.current) {
        // @ts-ignore
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers when they change
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(L => {
      // Clear existing markers
      markersRef.current.forEach((m: unknown) => {
        // @ts-ignore
        m.remove()
      })
      markersRef.current = []
      addMarkers(L, mapRef.current, markers, markersRef, onMarkerClick)
    })
  }, [markers])

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={containerRef}
        style={{ height }}
        className={`rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 z-0 ${className}`}
      />
    </>
  )
}

// ─────────────────────────────────────────────
// HELPER — add markers to map
// ─────────────────────────────────────────────

function addMarkers(
  L: unknown,
  map: unknown,
  markers: MapMarker[],
  markersRef: React.MutableRefObject<unknown[]>,
  onMarkerClick?: (m: MapMarker) => void
) {
  for (const marker of markers) {
    // @ts-ignore
    const m = L.marker([marker.lat, marker.lng])
    if (marker.popup) m.bindPopup(marker.popup)
    if (marker.title) m.bindTooltip(marker.title)
    if (onMarkerClick) m.on('click', () => onMarkerClick(marker))
    // @ts-ignore
    m.addTo(map)
    markersRef.current.push(m)
  }
}