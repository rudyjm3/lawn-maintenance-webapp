import { redirect } from "next/navigation"
import Link from "next/link"
import { Star, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getPortalClientId } from "@/lib/portal/auth"

export const metadata = { title: "My Reviews" }

export default async function PortalReviewsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const clientId = await getPortalClientId(supabase)
  if (!clientId) redirect("/portal/login")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.greenroute.app"
  const past30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [submittedResult, pendingResult] = await Promise.all([
    db
      .from("jobs")
      .select("id, title, service_date, review_rating, review_text, review_submitted_at, property_service:property_services(service_type:service_types(name))")
      .eq("client_id", clientId)
      .not("review_submitted_at", "is", null)
      .order("review_submitted_at", { ascending: false }),
    db
      .from("jobs")
      .select("id, title, service_date, review_token, property_service:property_services(service_type:service_types(name))")
      .eq("client_id", clientId)
      .eq("status", "completed")
      .is("review_submitted_at", null)
      .not("review_token", "is", null)
      .gte("service_date", past30)
      .order("service_date", { ascending: false }),
  ])

  type ReviewedJob = { id: string; title: string | null; service_date: string | null; review_rating: number | null; review_text: string | null; review_submitted_at: string | null }
  type PendingJob = { id: string; title: string | null; service_date: string | null; review_token: string | null }

  const submitted = (submittedResult.data ?? []) as ReviewedJob[]
  const pending = (pendingResult.data ?? []) as PendingJob[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">Your service ratings and feedback</p>
      </div>

      {/* Pending reviews */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Awaiting your review</h2>
          <div className="space-y-2">
            {pending.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{j.title ?? "Service"}</p>
                  {j.service_date && <p className="text-xs text-muted-foreground">{j.service_date}</p>}
                </div>
                {j.review_token && (
                  <Link
                    href={`${appUrl}/review/${j.review_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Rate <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted reviews */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Submitted reviews ({submitted.length})</h2>
        {submitted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {submitted.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{r.title ?? "Service"}</p>
                  <p className="text-xs text-muted-foreground">{r.service_date ?? ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= (r.review_rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                {r.review_text && <p className="text-sm text-foreground">{r.review_text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
