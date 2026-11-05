import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRoute, type LatLon } from '../lib/route'

// Íconos propios (divIcon) para no depender de las imágenes por defecto de Leaflet.
const pin = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};border:3px solid #0C1420;box-shadow:0 0 0 2px ${color}55;color:#fff;font:700 12px Manrope,sans-serif">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
const INCIDENT_ICON = pin('#E63946', '!')
const HOSPITAL_ICON = pin('#4DAE91', 'H')

/** Encuadra incidente y hospital. Recibe números sueltos para que el efecto no se repita en cada render. */
function FitBounds({ aLat, aLon, bLat, bLon }: { aLat: number; aLon: number; bLat: number; bLon: number }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(L.latLngBounds([[aLat, aLon], [bLat, bLon]]), { padding: [36, 36], maxZoom: 16 })
  }, [map, aLat, aLon, bLat, bLon])
  return null
}

interface Props {
  incident: LatLon
  hospital: LatLon
  hospitalName?: string
  className?: string
  /** Mapa estático (mini mapa en cards): sin zoom ni arrastre. */
  compact?: boolean
}

export default function IncidentMap({ incident, hospital, hospitalName = 'Hospital', className = 'h-72', compact = false }: Props) {
  const route = useRoute(hospital, incident)
  return (
    <div className={`relative overflow-hidden rounded-lg bg-line ${className}`}>
      <MapContainer
        center={incident}
        zoom={14}
        className="h-full w-full"
        zoomControl={!compact}
        dragging={!compact}
        scrollWheelZoom={false}
        doubleClickZoom={!compact}
        touchZoom={!compact}
        keyboard={!compact}
        attributionControl={!compact}
      >
        {/* Mosaicos estándar de OSM (sin token). Solo para demo/desarrollo. */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Polyline positions={route.coords} pathOptions={{ color: '#6FA8DC', weight: 4, opacity: 0.9, dashArray: route.source === 'directa' ? '6 8' : undefined }} />
        <Marker position={hospital} icon={HOSPITAL_ICON}>{!compact && <Tooltip direction="top" offset={[0, -14]}>{hospitalName}</Tooltip>}</Marker>
        <Marker position={incident} icon={INCIDENT_ICON}>{!compact && <Tooltip direction="top" offset={[0, -14]}>Incidente</Tooltip>}</Marker>
        <FitBounds aLat={incident[0]} aLon={incident[1]} bLat={hospital[0]} bLon={hospital[1]} />
      </MapContainer>
      {!compact && (
        <div className="pointer-events-none absolute right-3 top-3 z-[400] rounded-md bg-surface/90 px-2 py-1 text-[11px] text-muted shadow-sm ring-1 ring-line">
          {route.source === 'osrm' ? 'Ruta sugerida por calles' : 'Línea directa (ruta no disponible)'}
        </div>
      )}
    </div>
  )
}
