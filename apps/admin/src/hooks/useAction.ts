import { useCallback, useState } from 'react'
import { errorMessage } from '../lib/api'
import { bumpData } from '../store/refreshStore'
import { toast } from '../store/feedbackStore'

/** Ejecuta una escritura (Edge Function), avisa el resultado con un toast y refresca los datos. */
export function useAction() {
  const [pending, setPending] = useState<string | null>(null)

  const run = useCallback(async (key: string, fn: () => Promise<unknown>, success?: string): Promise<boolean> => {
    setPending(key)
    try {
      await fn()
      bumpData()
      if (success) toast.success(success)
      return true
    } catch (err) {
      toast.error(errorMessage(err))
      return false
    } finally {
      setPending(null)
    }
  }, [])

  return { run, pending }
}
