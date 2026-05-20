import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { BatchInvoiceForm } from "@/components/invoices/batch-invoice-form"
import { type Client } from "@/types"

export const metadata = { title: "Batch Invoicing" }

export default async function BatchInvoicePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from("clients")
    .select("id, name, email, phone, billing_address, status, source, notes, created_at")
    .eq("status", "active")
    .order("name")

  const clients = (data ?? []) as Client[]

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link
          href="/invoices"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Invoices
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Batch Invoicing</h1>
        <p className="text-sm text-muted-foreground">
          Generate invoices for multiple clients at once using shared line items.
        </p>
      </div>
      {clients.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No active clients found.{" "}
          <Link href="/clients" className="underline underline-offset-2 hover:text-foreground">
            Add a client
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <BatchInvoiceForm clients={clients} />
      )}
    </div>
  )
}
