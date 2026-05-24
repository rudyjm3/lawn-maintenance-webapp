"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, Users, CheckCircle2, Clock, Pencil, X, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

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
  const [jobStats, setJobStats]   = useState({ completed: 0, total: 0, totalMin: 0 })
  const [loading, setLoading]     = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Edit state
  const [editing, setEditing]     = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName]   = useState("")
  const [phone, setPhone]         = useState("")
  const [isPending, startTransition] = useTransition()

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
        .select("id, first_name, last_name, role, phone, business_id, crew_members(crew_id, is_lead, crew:crews(id, name, is_active))")
        .eq("auth_user_id", user.id)
        .single()
      if (userRowError || !userRow) {
        setError(userRowError?.message ?? "Could not load your profile.")
        setLoading(false)
        return
      }

      setUserData(userRow)
      setFirstName(userRow.first_name ?? "")
      setLastName(userRow.last_name ?? "")
      setPhone(userRow.phone ?? "")

      const crewList = (userRow?.crew_members ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((cm: any) => ({ ...cm.crew, is_lead: cm.is_lead }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c?.is_active)
      setCrews(crewList)

      // Load job stats for this crew member
      const crewIds: string[] = (userRow?.crew_members ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cm: any) => cm.crew_id,
      )
      if (crewIds.length > 0) {
        const { data: timeLogs } = await db
          .from("time_logs")
          .select("duration_min, job_id")
          .eq("user_id", userRow.id)
        const { data: completedJobs } = await db
          .from("time_logs")
          .select("job_id")
          .eq("user_id", userRow.id)
          .not("end_time", "is", null)
        const totalMin = (timeLogs ?? []).reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: number, t: any) => s + (t.duration_min ?? 0), 0,
        )
        setJobStats({
          completed: (completedJobs ?? []).length,
          total: (timeLogs ?? []).length,
          totalMin,
        })
      }

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

  function handleEdit() {
    setFirstName(userData?.first_name ?? "")
    setLastName(userData?.last_name ?? "")
    setPhone(userData?.phone ?? "")
    setEditing(true)
  }

  function handleSave() {
    if (!firstName.trim()) { toast.error("First name is required."); return }
    startTransition(async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { error } = await db
        .from("users")
        .update({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null })
        .eq("id", userData.id)
      if (error) { toast.error(error.message); return }
      setUserData((prev: Record<string, unknown>) => ({
        ...prev,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      }))
      setEditing(false)
      toast.success("Profile updated.")
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const displayFirst = userData?.first_name ?? ""
  const displayLast  = userData?.last_name ?? ""
  const initials = `${displayFirst[0] ?? ""}${displayLast[0] ?? ""}`.toUpperCase()

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

  const totalHours = Math.round(jobStats.totalMin / 60 * 10) / 10

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
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">
              {displayFirst} {displayLast}
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {ROLE_LABELS[userData.role] ?? userData.role}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not signed in</p>
        )}
      </div>

      {/* Job stats */}
      {jobStats.total > 0 && (
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">Your Stats</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border px-3 py-3 text-center">
              <div className="flex justify-center mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-lg font-semibold text-foreground">{jobStats.completed}</p>
              <p className="text-xs text-muted-foreground">Jobs done</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-3 text-center">
              <div className="flex justify-center mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-lg font-semibold text-foreground">{totalHours}h</p>
              <p className="text-xs text-muted-foreground">Total time</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-3 text-center">
              <div className="flex justify-center mb-1">
                <Clock className="h-4 w-4 text-violet-500" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                {jobStats.completed > 0 ? Math.round(jobStats.totalMin / jobStats.completed) : 0}m
              </p>
              <p className="text-xs text-muted-foreground">Avg/job</p>
            </div>
          </div>
        </div>
      )}

      {/* Personal info */}
      {userData && (
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Personal Info</h2>
            {!editing && (
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-first" className="text-xs">First name</Label>
                  <Input
                    id="prof-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-last" className="text-xs">Last name</Label>
                  <Input
                    id="prof-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-phone" className="text-xs">Phone</Label>
                <Input
                  id="prof-phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 gap-1" onClick={handleSave} disabled={isPending}>
                  <Save className="h-3.5 w-3.5" />
                  {isPending ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground text-right">
                  {displayFirst} {displayLast}
                </dd>
              </div>
              {userData.phone && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium text-foreground">{userData.phone}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium text-foreground capitalize">
                  {ROLE_LABELS[userData.role] ?? userData.role}
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}

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
