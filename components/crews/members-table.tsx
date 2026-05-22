"use client"

import { useState } from "react"
import { Pencil, CircleCheck, CircleOff, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MemberSheet, type MemberWithCrews } from "@/components/crews/member-sheet"

const ROLE_LABELS: Record<string, string> = {
  owner:       "Owner",
  manager:     "Manager",
  crew_lead:   "Crew Lead",
  crew_member: "Crew Member",
}

interface MembersTableProps {
  members: MemberWithCrews[]
}

export function MembersTable({ members }: MembersTableProps) {
  const [sheetOpen, setSheetOpen]         = useState(false)
  const [editingMember, setEditingMember] = useState<MemberWithCrews | undefined>(undefined)

  function openEdit(member: MemberWithCrews) {
    setEditingMember(member)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No team members yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Invite team members using the button above.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Crew</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => (
                <tr
                  key={member.id}
                  className={`group border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </p>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </td>

                  {/* Crew assignments */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {member.crews.length === 0 ? (
                      <span className="text-xs text-muted-foreground/60">Not assigned to crew</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {member.crews.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: c.color ?? "#6b7280" }}
                          >
                            {c.name}
                            {c.is_lead && (
                              <span className="opacity-80">· Lead</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {member.is_active ? (
                      <Badge variant="outline" className="gap-1 text-xs text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-900 dark:bg-green-950">
                        <CircleCheck className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CircleOff className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </td>

                  {/* Edit */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(member)}
                      className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                      aria-label="Edit member"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <MemberSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingMember(undefined) }}
        member={editingMember}
      />
    </>
  )
}
