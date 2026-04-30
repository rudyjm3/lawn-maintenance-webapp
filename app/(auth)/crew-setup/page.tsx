"use client"

import { useActionState } from "react"
import { setInitialPassword, type ActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CrewSetupPage() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    setInitialPassword,
    null,
  )

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Welcome to GreenRoute</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Set a password to finish creating your account.
      </p>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="8+ characters with a number"
            required
          />
          {state && !state.success && state.errors?.password && (
            <p className="text-xs text-destructive">{state.errors.password[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            required
          />
        </div>

        {state && !state.success && !state.errors && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Setting up account…" : "Set password & get started"}
        </Button>
      </form>
    </>
  )
}
