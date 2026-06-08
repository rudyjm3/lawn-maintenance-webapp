"use client"

import { useState, useTransition } from "react"
import { Plus, Send, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet"
import { createCampaign } from "@/app/actions/campaigns"
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
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-2">
          <SheetTitle>New Campaign</SheetTitle>
          <SheetDescription>
            Compose an email campaign to send to your active clients.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Sends to</span>
            <span className="font-semibold text-foreground">
              {recipientCount} active client{recipientCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">(with email, opted in)</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Spring cleanup special — book now!"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={3000}
              placeholder="Write your message here. Plain text only — keep it short and personal."
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{body.length}/3000</p>
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </SheetClose>
          <Button
            onClick={handleSave}
            disabled={isPending || !subject.trim() || !body.trim()}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Saving…" : "Save Draft"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
