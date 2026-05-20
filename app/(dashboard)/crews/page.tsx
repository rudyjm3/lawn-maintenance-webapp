import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { CrewsTable } from "@/components/crews/crews-table"
import { InviteMemberDialog } from "@/components/crews/invite-member-dialog"
import type { Crew, User } from "@/types"

export const metadata = { title: "Crews & Team" }

export default async function CrewsPage() {
  const supabase = await createClient()
  const { businessId } = await getAuthenticatedBusinessId(supabase)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [crewsResult, usersResult] = await Promise.all([
    db
      .from("crews")
      .select(`
        *,
        crew_members(
          is_lead,
          user:users(id, first_name, last_name, role, is_active)
        )
      `)
      .eq("business_id", businessId)
      .order("name"),
    db
      .from("users")
      .select("id, first_name, last_name, role, is_active")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("first_name"),
  ])

  // Flatten crew_members → members array on each crew
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crews = ((crewsResult.data ?? []) as any[]).map((crew) => ({
    ...crew,
    members: (crew.crew_members ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((cm: any) => cm.user)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((cm: any) => ({ ...cm.user, is_lead: cm.is_lead })),
  })) as (Crew & { members: (User & { is_lead: boolean })[] })[]

  const allUsers = (usersResult.data ?? []) as User[]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Crews & Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage your field crews and assign team members.
          </p>
        </div>
        <InviteMemberDialog />
      </div>

      <CrewsTable crews={crews} allUsers={allUsers} />
    </div>
  )
}
