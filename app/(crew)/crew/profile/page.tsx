"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ROLE_LABELS: Record<string, string> = {
  owner:       "Owner",
  manager:     "Manager",
  crew_lead:   "Crew Lead",
  crew_member: "Crew Member",
}

export default function ProfilePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userData, setUserData]   = useState<any | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [crews, setCrews]         = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: userRow, error: userRowError } = await db
        .from("users")
        .select("id, first_name, last_name, role, business_id, crew_members(crew_id, is_lead, crew:crews(id, name, is_active))")
        .eq("auth_user_id", user.id)
        .single()
      if (userRowError || !userRow) {
        setError(userRowError?.message ?? "Could not load your profile.")
        setLoading(false)
        return
      }

      setUserData(userRow)
      const crewList = (userRow?.crew_members ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((cm: any) => ({ ...cm.crew, is_lead: cm.is_lead }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c?.is_active)
      setCrews(crewList)
      setLoading(false)
    }

    load()
  }, [reloadKey])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const initials = userData
    ? `${userData.first_name?.[0] ?? ""}${userData.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <User className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium">{error}</p>
        <Button variant="outline" onClick={() => setReloadKey((v) => v + 1)}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="border-b border-border bg-background px-4 py-6">
        <h1 className="text-lg font-semibold text-foreground">Profile</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 px-4 py-8 border-b border-border">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
          {initials || <User className="h-10 w-10" />}
        </div>
        {userData ? (
          <>
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">
                {userData.first_name} {userData.last_name}
              </p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {ROLE_LABELS[userData.role] ?? userData.role}
              </Badge>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Not signed in</p>
        )}
      </div>

      {/* Crew assignments */}
      {crews.length > 0 && (
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Assigned Crews</h2>
          </div>
          <div className="flex flex-col gap-2">
            {crews.map((crew) => (
              <div
                key={crew.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-3"
              >
                <span className="text-sm font-medium text-foreground">{crew.name}</span>
                {crew.is_lead && (
                  <Badge variant="default" className="text-xs">Lead</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {userData && crews.length === 0 && (
        <div className="px-4 py-4 border-b border-border">
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center">
            <p className="text-sm font-medium text-foreground">No active crew assignments.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask a manager to assign you to a crew so route and history views populate.
            </p>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="px-4 py-6">
        <Button
          variant="destructive"
          className="h-12 w-full"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {loggingOut ? "Signing out…" : "Sign Out"}
        </Button>
      </div>
    </div>
  )
}
