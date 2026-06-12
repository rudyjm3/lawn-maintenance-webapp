"use client"

import { useState, useTransition } from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { sendClientEmail } from "@/app/actions/send-client-email"

interface SendEmailDialogProps {
  clientId: string
  clientName: string
  clientEmail: string
}

export function SendEmailDialog({ clientId, clientName, clientEmail }: SendEmailDialogProps) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setSubject("")
    setBody("")
    setOpen(true)
  }

  function handleSubmit() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required.")
      return
    }

    startTransition(async () => {
      const result = await sendClientEmail({
        clientId,
        subject: subject.trim(),
        body: body.trim(),
      })

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Mail className="mr-1.5 h-3.5 w-3.5" />
        Email
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Email to {clientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">To</Label>
              <Input id="email-to" value={clientEmail} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="e.g. Your upcoming service"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                placeholder="Write your message here…"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Sending…" : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
