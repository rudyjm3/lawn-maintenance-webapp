import { describe, expect, it } from "vitest"
import { evaluateAutopayEligibility } from "../../lib/billing/autopay"

describe("evaluateAutopayEligibility", () => {
  const today = "2026-06-15"

  it("rejects disabled autopay", () => {
    const result = evaluateAutopayEligibility({
      invoice: { due_date: today, total: 100, payments: [] },
      billing: { autopay_enabled: false },
      today,
    })
    expect(result).toEqual({ eligible: false, reason: "Autopay disabled" })
  })

  it("rejects invoices already attempted today", () => {
    const result = evaluateAutopayEligibility({
      invoice: { due_date: today, total: 100, autopay_attempted_at: `${today}T10:00:00Z`, payments: [] },
      billing: { autopay_enabled: true, stripe_customer_id: "cus_1", stripe_default_payment_method_id: "pm_1" },
      today,
    })
    expect(result).toEqual({ eligible: false, reason: "Already attempted today" })
  })

  it("returns outstanding amount when eligible", () => {
    const result = evaluateAutopayEligibility({
      invoice: { due_date: today, total: 120, payments: [{ amount: 20 }] },
      billing: { autopay_enabled: true, stripe_customer_id: "cus_1", stripe_default_payment_method_id: "pm_1" },
      today,
    })
    expect(result).toEqual({ eligible: true, outstanding: 100 })
  })
})
