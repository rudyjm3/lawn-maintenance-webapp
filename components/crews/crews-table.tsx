"use client"

import { useState } from "react"
import { Plus, Pencil, Users, CircleCheck, CircleOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CrewSheet } from "@/components/crews/crew-sheet"
import type { Crew, User } from "@/types"

interface CrewWithMembers extends Crew {
  members?: (User & { is_lead?: boolean })[]
}

interface CrewsTableProps {
  crews: CrewWithMembers[]
  allUsers: User[]
}

export function CrewsTable({ crews, allUsers }: CrewsTableProps) {
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [editingCrew, setEditingCrew] = useState<CrewWithMembers | undefined>(undefined)

  function openNew() {
    setEditingCrew(undefined)
    setSheetOpen(true)
  }

  function openEdit(crew: CrewWithMembers) {
    setEditingCrew(crew)
    setSheetOpen(true)
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {crews.length} crew{crews.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Crew
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {crews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No crews yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Create a crew and assign team members to get started.
              </p>
            </div>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Crew
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Crew</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Members</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {crews.map((crew, i) => {
                const lead    = crew.members?.find((m) => m.is_lead)
                const members = crew.members ?? []
                return (
                  <tr
                    key={crew.id}
                    className={`group border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                  >
                    {/* Crew name + description */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: crew.color ?? "#6b7280" }}
                        />
                        <p className="font-medium text-foreground">{crew.name}</p>
                      </div>
                      {crew.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {crew.description}
                        </p>
                      )}
                    </td>

                    {/* Members */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {members.length === 0 ? (
                        <span className="text-muted-foreground/50">No members</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                          </div>
                          {lead && (
                            <p className="text-xs text-muted-foreground">
                              Lead: {lead.first_name} {lead.last_name}
                            </p>
                          )}
                          {!lead && members.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {members
                                .slice(0, 2)
                                .map((m) => `${m.first_name} ${m.last_name}`)
                                .join(", ")}
                              {members.length > 2 ? ` +${members.length - 2} more` : ""}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {crew.is_active ? (
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
                        onClick={() => openEdit(crew)}
                        className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                        aria-label="Edit crew"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <CrewSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingCrew(undefined) }}
        crew={editingCrew}
        allUsers={allUsers}
      />
    </>
  )
}
