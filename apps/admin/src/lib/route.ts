import { useEffect, useState } from 'react'

export type LatLon = [number, number]
export interface RouteResult {
  coords: LatLon[]
  /** 'osrm' = ruta por calles; 'directa' = línea recta de respaldo. */
  source: 'osrm' | 'directa'
}

const cache = new Map<string, RouteResult>()

/**
 * Ruta sugerida por calles usando el servidor demo público de OSRM (sin token).
 * Es solo para la demo: en producción usar Mapbox Directions con el token del proyecto.
 * Si falla o tarda más de 4 s, se queda con la línea recta.
 */
export function useRoute(from: LatLon, to: LatLon): RouteResult {
  const [fromLat, fromLon] = from
  const [toLat, toLon] = to
  const key = `${fromLat},${fromLon};${toLat},${toLon}`
  // Guarda el último resultado junto a su key; si la key cambió, se ignora hasta que llegue el nuevo.
  const [fetched, setFetched] = useState<{ key: string; result: RouteResult } | null>(null)

  useEffect(() => {
    if (cache.has(key)) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { routes?: { geometry: { coordinates: [number, number][] } }[] }) => {
        const line = data.routes?.[0]?.geometry.coordinates
        if (!line?.length) return
        const result: RouteResult = { coords: line.map(([lon, lat]) => [lat, lon]), source: 'osrm' }
        cache.set(key, result)
        setFetched({ key, result })
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [key, fromLat, fromLon, toLat, toLon])

  return cache.get(key) ?? (fetched?.key === key ? fetched.result : { coords: [from, to], source: 'directa' })
}
