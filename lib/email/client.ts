import { Resend } from "resend"

let _instance: Resend | undefined

function getInstance(): Resend {
  if (!_instance) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set")
    _instance = new Resend(key)
  }
  return _instance
}

// Lazy proxy — throws only when first accessed at runtime, not at module evaluation.
export const resend: Resend = new Proxy({} as Resend, {
  get(_, prop: string | symbol) {
    return Reflect.get(getInstance(), prop as string)
  },
})
