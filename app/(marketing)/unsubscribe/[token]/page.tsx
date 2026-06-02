import { Leaf, CheckCircle2 } from "lucide-react"
import { handleUnsubscribe } from "@/app/actions/unsubscribe"

export const metadata = { title: "Unsubscribe" }

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let result: { success: boolean; message: string } = { success: false, message: "Invalid link." }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const [clientId, businessId] = decoded.split(":")
    if (clientId && businessId) {
      result = await handleUnsubscribe(clientId, businessId)
    }
  } catch {
    result = { success: false, message: "Invalid unsubscribe link." }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto max-w-lg flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-foreground">GreenRoute</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-sm text-center">
          {result.success ? (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
              <h1 className="text-xl font-semibold text-foreground mb-2">You&apos;ve been unsubscribed</h1>
              <p className="text-sm text-muted-foreground">
                You will no longer receive marketing emails. You&apos;ll still get important service notifications like appointment reminders and invoices.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground mb-2">Link not valid</h1>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
