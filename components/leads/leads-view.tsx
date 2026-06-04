"use client"

import { useState, useEffect } from "react"
import { LayoutList, Columns3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LeadsTable } from "@/components/leads/leads-table"
import { LeadsKanban } from "@/components/leads/leads-kanban"
import { type Lead } from "@/types"

const STORAGE_KEY = "leads-view-mode"

export function LeadsView({ leads }: { leads: Lead[] }) {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "table" || stored === "kanban") {
      setViewMode(stored)
    }
  }, [])

  function switchView(mode: "table" | "kanban") {
    setViewMode(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant={viewMode === "table" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => switchView("table")}
          aria-label="Table view"
          title="Table view"
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "kanban" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => switchView("kanban")}
          aria-label="Kanban view"
          title="Kanban view"
        >
          <Columns3 className="h-4 w-4" />
        </Button>
      </div>

      {viewMode === "table" ? (
        <LeadsTable leads={leads} />
      ) : (
        <LeadsKanban leads={leads} />
      )}
    </>
  )
}
