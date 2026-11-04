// Aviso de alertas nuevas: sonido (Web Audio, sin archivos) + notificación del sistema si la pestaña no está visible.
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import type { Offer } from '../types'

const KEY = 'medalert.alertSound'

function readPref(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

let audioCtx: AudioContext | null = null

/** Dos pitidos cortos y agudos; P1 suena tres veces. */
function beep(times: number) {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.28
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(i % 2 ? 660 : 880, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.24)
    }
  } catch {
    /* audio no disponible */
  }
}

interface SoundState {
  enabled: boolean
  setEnabled: (v: boolean) => void
}

export const useAlertSound = create<SoundState>((set) => ({
  enabled: readPref(),
  setEnabled: (v) => {
    try {
      localStorage.setItem(KEY, v ? 'on' : 'off')
    } catch {
      /* sin storage: la preferencia dura la sesión */
    }
    if (v) {
      beep(1) // gesto del usuario: desbloquea el audio en el navegador
      if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    }
    set({ enabled: v })
  },
}))

/** Compara las ofertas con las ya vistas y avisa solo por las nuevas (no en la primera carga). */
export function useAlertNotifier(offers: Offer[] | undefined) {
  const seen = useRef<Set<string> | null>(null)
  const enabled = useAlertSound((s) => s.enabled)

  useEffect(() => {
    if (!offers) return
    const ids = offers.map((o) => o.incident_id)
    if (seen.current === null) {
      seen.current = new Set(ids)
      return
    }
    const nuevas = offers.filter((o) => !seen.current!.has(o.incident_id))
    seen.current = new Set(ids)
    if (!nuevas.length || !enabled) return

    const critica = nuevas.some((o) => o.incident.prioridad === 'P1')
    beep(critica ? 3 : 2)
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      const o = nuevas[0]
      const n = new Notification(critica ? 'Alerta P1 · MedAlert' : 'Nueva alerta · MedAlert', {
        body: `${o.incident.referencia || o.incident.tipo_accidente || 'Incidente'} · a ${o.distance_km.toFixed(1)} km${nuevas.length > 1 ? ` (+${nuevas.length - 1} más)` : ''}`,
        tag: 'medalert-offer',
      })
      n.onclick = () => {
        window.focus()
        window.location.assign(`/alerts/${o.incident_id}`)
      }
    }
  }, [offers, enabled])
}
