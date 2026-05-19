import { createClient } from "@/lib/supabase/server"
import { PaymentsTable } from "@/components/payments/payments-table"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { CreditCard, DollarSign, CalendarCheck2, TrendingUp } from "lucide-react"
import type { Payment } from "@/types"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payments" }

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function monthRange() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  return { start, end }
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { start, end } = monthRange()

  const [paymentsResult, mtdResult] = await Promise.all([
    db
      .from("payments")
      .select("*, invoice:invoices(id, invoice_number, total, client:clients(id, name))")
      .order("payment_date", { ascending: false }),
    db
      .from("payments")
      .select("amount")
      .gte("payment_date", start)
      .lte("payment_date", end),
  ])

  const payments = (paymentsResult.data ?? []) as Payment[]
  const mtdPayments = (mtdResult.data ?? []) as { amount: number }[]

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const mtdCollected = mtdPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const avgPayment = payments.length > 0 ? totalCollected / payments.length : 0

  const now = new Date()
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">
          {payments.length} payment{payments.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total Collected"
          value={fmt$(totalCollected)}
          sub="All time"
          icon={DollarSign}
        />
        <KpiCard
          title="This Month"
          value={fmt$(mtdCollected)}
          sub={monthLabel}
          icon={CalendarCheck2}
        />
        <KpiCard
          title="Payments"
          value={payments.length}
          sub="Total recorded"
          icon={CreditCard}
        />
        <KpiCard
          title="Avg Payment"
          value={fmt$(avgPayment)}
          sub="Per payment"
          icon={TrendingUp}
        />
      </div>

      <PaymentsTable payments={payments} />
    </div>
  )
}
