import Stripe from "stripe"

let _instance: Stripe | undefined

function getInstance(): Stripe {
  if (!_instance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
    _instance = new Stripe(key, { apiVersion: "2026-04-22.dahlia" })
  }
  return _instance
}

// Lazy proxy — throws only when first accessed at runtime, not at module evaluation.
// This prevents build-time failures when STRIPE_SECRET_KEY is absent from the build env.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    return Reflect.get(getInstance(), prop as string)
  },
})
