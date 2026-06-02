import { createClient } from "@/lib/supabase/server"
import { getRecipientCount } from "@/app/actions/campaigns"
import { CampaignsTable } from "@/components/campaigns/campaigns-table"
import { CampaignComposerSheet } from "@/components/campaigns/campaign-composer-sheet"
import type { Campaign } from "@/types"

export const metadata = { title: "Campaigns" }

export default async function CampaignsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [campaignsResult, recipientCount] = await Promise.all([
    db.from("campaigns").select("*").order("created_at", { ascending: false }),
    getRecipientCount(),
  ])

  const campaigns = (campaignsResult.data ?? []) as Campaign[]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Send seasonal messages and promotions to your clients.</p>
        </div>
        <CampaignComposerSheet recipientCount={recipientCount} />
      </div>

      <CampaignsTable campaigns={campaigns} />
    </div>
  )
}
