"use client"

import { useState, useTransition } from "react"
import { Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { requestPortalMagicLink } from "@/app/actions/portal"

export default function PortalLoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const result = await requestPortalMagicLink(email)
      if (result.success) setSent(true)
      else setError(result.message)
    })
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-600" />
            <span className="text-lg font-semibold">Client Portal</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-8 shadow-sm space-y-5">
          {sent ? (
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <strong>{email}</strong>. Click the link to access your portal.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
                <p className="text-sm text-muted-foreground">Enter your email to receive a sign-in link.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-foreground">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isPending || !email}>
                  {isPending ? "Sending…" : "Send sign-in link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
