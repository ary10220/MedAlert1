// Feedback global: avisos breves (toasts) y diálogos de confirmación que devuelven una promesa.
import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  tone: ToastTone
  text: string
}

export interface ConfirmRequest {
  title: string
  body?: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  resolve: (ok: boolean) => void
}

interface FeedbackState {
  toasts: Toast[]
  confirm: ConfirmRequest | null
  push: (tone: ToastTone, text: string) => void
  dismiss: (id: number) => void
  ask: (req: Omit<ConfirmRequest, 'resolve'>) => Promise<boolean>
  answer: (ok: boolean) => void
}

let seq = 1

export const useFeedback = create<FeedbackState>((set, get) => ({
  toasts: [],
  confirm: null,
  push: (tone, text) => {
    const id = seq++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, text }] }))
    setTimeout(() => get().dismiss(id), tone === 'error' ? 7000 : 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  ask: (req) =>
    new Promise<boolean>((resolve) => {
      get().confirm?.resolve(false)
      set({ confirm: { ...req, resolve } })
    }),
  answer: (ok) => {
    get().confirm?.resolve(ok)
    set({ confirm: null })
  },
}))

/** Atajos para usar fuera de componentes. */
export const toast = {
  success: (text: string) => useFeedback.getState().push('success', text),
  error: (text: string) => useFeedback.getState().push('error', text),
  info: (text: string) => useFeedback.getState().push('info', text),
}
export const confirmDialog = (req: Omit<ConfirmRequest, 'resolve'>) => useFeedback.getState().ask(req)
