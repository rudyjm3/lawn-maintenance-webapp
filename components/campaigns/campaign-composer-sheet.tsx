"use client"

import { useState, useTransition } from "react"
import { Plus, Send, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { createCampaign, getRecipientCount } from "@/app/actions/campaigns"
import { toast } from "sonner"

export function CampaignComposerSheet({ recipientCount }: { recipientCount: number }) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message body are required.")
      return
    }
    startTransition(async () => {
      const result = await createCampaign(subject.trim(), body.trim())
      if (result.success) {
        toast.success(result.message)
        setSubject("")
        setBody("")
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg space-y-5 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Campaign</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Sends to</span>
          <span className="font-semibold text-foreground">{recipientCount} active client{recipientCount !== 1 ? "s" : ""}</span>
          <span className="text-xs text-muted-foreground">(with email, opted in)</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-foreground">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Spring cleanup special — book now!"
              maxLength={200}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-foreground">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={3000}
              placeholder="Write your message here. Plain text only — keep it short and personal."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">{body.length}/3000</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1.5"
            onClick={handleSave}
            disabled={isPending || !subject.trim() || !body.trim()}
          >
            <Send className="h-4 w-4" />
            {isPending ? "Saving…" : "Save Draft"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
