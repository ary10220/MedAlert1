import { useEffect, useState } from 'react'

/** Hora actual que se refresca cada `intervalMs` (por defecto, 1 minuto). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
