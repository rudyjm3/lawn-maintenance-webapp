export type AutopayCandidate = {
  due_date: string | null
  total: number
  autopay_attempted_at?: string | null
  payments?: Array<{ amount: number }>
}

export type BillingProfile = {
  autopay_enabled?: boolean
  stripe_customer_id?: string | null
  stripe_default_payment_method_id?: string | null
} | null

export function evaluateAutopayEligibility(input: {
  invoice: AutopayCandidate
  billing: BillingProfile
  today: string
}) {
  const { invoice, billing, today } = input

  if (!billing?.autopay_enabled) return { eligible: false as const, reason: "Autopay disabled" }
  if (!billing.stripe_customer_id || !billing.stripe_default_payment_method_id) {
    return { eligible: false as const, reason: "Missing saved payment method" }
  }
  if (!invoice.due_date || invoice.due_date > today) {
    return { eligible: false as const, reason: "Not due yet" }
  }
  if (typeof invoice.autopay_attempted_at === "string" && invoice.autopay_attempted_at.startsWith(today)) {
    return { eligible: false as const, reason: "Already attempted today" }
  }

  const paid = (invoice.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const outstanding = Math.max(0, Number(invoice.total) - paid)
  if (outstanding <= 0) return { eligible: false as const, reason: "Already fully paid" }

  return { eligible: true as const, outstanding }
}
