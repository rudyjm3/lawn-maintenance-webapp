"use client"

import { useState, useTransition } from "react"
import { Send, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { sendCampaign } from "@/app/actions/campaigns"
import { toast } from "sonner"
import type { Campaign } from "@/types"

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  const [isPending, startTransition] = useTransition()
  const [sendingId, setSendingId] = useState<string | null>(null)

  function handleSend(id: string) {
    setSendingId(id)
    startTransition(async () => {
      const result = await sendCampaign(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
      setSendingId(null)
    })
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
        <Send className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">No campaigns yet</p>
        <p className="text-xs text-muted-foreground">Create your first campaign to send seasonal messages to clients.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Recipients</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Sent</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-t border-border hover:bg-muted/20">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{c.subject}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{c.body.slice(0, 60)}…</p>
              </td>
              <td className="px-4 py-3">
                {c.status === "sent" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">Sent</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Draft</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                {c.recipient_count > 0 ? (
                  <span className="flex items-center justify-end gap-1"><Users className="h-3 w-3" />{c.recipient_count}</span>
                ) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                {c.sent_at ? (
                  <span className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{new Date(c.sent_at).toLocaleDateString()}</span>
                ) : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {c.status === "draft" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    disabled={isPending && sendingId === c.id}
                    onClick={() => handleSend(c.id)}
                  >
                    <Send className="h-3 w-3" />
                    {isPending && sendingId === c.id ? "Sending…" : "Send"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Done</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
