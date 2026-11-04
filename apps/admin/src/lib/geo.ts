const R_KM = 6371

/** Distancia en km entre dos coordenadas (haversine). Equivale a st_distance sobre geography. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R_KM * Math.asin(Math.sqrt(a))
}

export interface Point {
  lat: number
  lon: number
}

/**
 * Lee una columna geography(point) tal como la devuelve PostgREST:
 * EWKB en hexadecimal (p. ej. "0101000020E6100000…") o GeoJSON {type:'Point', coordinates:[lon,lat]}.
 */
export function parsePoint(value: unknown): Point | null {
  if (!value) return null
  if (typeof value === 'object') {
    const coords = (value as { coordinates?: unknown }).coordinates
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return { lat: coords[1], lon: coords[0] }
    }
    return null
  }
  if (typeof value !== 'string' || !/^[0-9a-f]+$/i.test(value) || value.length < 42) return null
  const bytes = new Uint8Array(value.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16)
  const view = new DataView(bytes.buffer)
  const little = view.getUint8(0) === 1
  const type = view.getUint32(1, little)
  if ((type & 0xff) !== 1) return null // solo Point
  const hasSrid = (type & 0x20000000) !== 0
  const offset = 5 + (hasSrid ? 4 : 0)
  const lon = view.getFloat64(offset, little)
  const lat = view.getFloat64(offset + 8, little)
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
}
