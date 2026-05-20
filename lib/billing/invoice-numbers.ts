// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNextInvoiceNumber(db: any, businessId: string): Promise<string> {
  const { data } = await db
    .from("invoices")
    .select("invoice_number")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (!data?.length) return "INV-0001"

  const last = (data[0].invoice_number as string) ?? ""
  const match = last.match(/(\d+)$/)
  const next = match ? parseInt(match[1], 10) + 1 : 1
  return `INV-${String(next).padStart(4, "0")}`
}
