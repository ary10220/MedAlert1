import { useCallback, useEffect, useRef, useState } from 'react'
import { useRefreshStore } from '../store/refreshStore'
import { errorMessage } from '../lib/api'

export interface QueryState<T> {
  data: T | undefined
  error: string | null
  loading: boolean
  refetch: () => void
}

interface Options {
  enabled?: boolean
  /** Volver a pedir con cada tick global (Realtime / refresco periódico). Por defecto true. */
  live?: boolean
}

/**
 * Consulta asíncrona mínima: vuelve a pedir cuando cambian `deps` (y el tick global si live).
 * Mantiene los datos anteriores mientras recarga para que la pantalla no parpadee.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[], { enabled = true, live = true }: Options = {}): QueryState<T> {
  const globalTick = useRefreshStore((s) => s.tick)
  const tick = live ? globalTick : 0
  const [local, setLocal] = useState(0)
  const [state, setState] = useState<{ data: T | undefined; error: string | null; loading: boolean }>({ data: undefined, error: null, loading: enabled })
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const depsKey = JSON.stringify(deps)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetcherRef
      .current()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((err) => !cancelled && setState((s) => ({ data: s.data, error: errorMessage(err), loading: false })))
    return () => {
      cancelled = true
    }
  }, [depsKey, tick, local, enabled])

  const refetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    setLocal((n) => n + 1)
  }, [])
  return { ...state, refetch }
}
