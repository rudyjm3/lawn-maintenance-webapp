"use client"

import { useState, useTransition } from "react"
import { Sparkles, ArrowRight, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { getBalancingSuggestions } from "@/app/actions/ai"
import { updateJobSchedule } from "@/app/actions/jobs"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { startTransition as reactStartTransition } from "react"
import type { ScheduleSuggestion } from "@/types"

export function BalancingSuggestionsDialog({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState("")
  const [isLoading, startLoading] = useTransition()
  const [isAccepting, startAccepting] = useTransition()
  const router = useRouter()

  function handleOpen() {
    setOpen(true)
    setSuggestions([])
    setDismissed(new Set())
    setAccepted(new Set())
    setSummary("")
    startLoading(async () => {
      const result = await getBalancingSuggestions(weekStart)
      if (result.success) {
        setSuggestions(result.suggestions)
        setSummary(result.message)
      } else {
        setSummary(result.message)
        toast.error(result.message)
      }
    })
  }

  function handleAccept(s: ScheduleSuggestion) {
    startAccepting(async () => {
      const result = await updateJobSchedule(s.jobId, s.suggestedDate)
      if (result.success) {
        setAccepted((prev) => new Set([...prev, s.jobId]))
        toast.success(`Moved ${s.jobTitle} to ${s.suggestedDate}`)
        reactStartTransition(() => router.refresh())
      } else {
        toast.error(result.message)
      }
    })
  }

  const visible = suggestions.filter((s) => !dismissed.has(s.jobId) && !accepted.has(s.jobId))

  return (
    <>
      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleOpen}>
        <Sparkles className="h-3.5 w-3.5" />
        Balance Week
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              AI Schedule Suggestions
            </DialogTitle>
            <DialogDescription>
              AI-powered recommendations to balance crew workload this week.
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analyzing schedule…</p>
            </div>
          )}

          {!isLoading && summary && suggestions.length === 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center dark:bg-emerald-900/20 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{summary}</p>
            </div>
          )}

          {!isLoading && visible.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <p className="text-xs text-muted-foreground">{summary}</p>
              {visible.map((s) => (
                <div key={s.jobId} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.jobTitle}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{s.currentDate}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-foreground">{s.suggestedDate}</span>
                        {s.currentCrewName !== "Unassigned" && (
                          <span className="ml-1">({s.currentCrewName})</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                        disabled={isAccepting}
                        onClick={() => handleAccept(s)}
                        title="Accept"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setDismissed((prev) => new Set([...prev, s.jobId]))}
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && visible.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isAccepting}
              onClick={() => {
                for (const s of visible) handleAccept(s)
              }}
            >
              Accept All ({visible.length})
            </Button>
          )}

          {(accepted.size > 0 || dismissed.size > 0) && visible.length === 0 && !isLoading && suggestions.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">All suggestions handled.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
