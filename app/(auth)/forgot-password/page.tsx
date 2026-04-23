"use client"

import { useActionState } from "react"
import Link from "next/link"
import { forgotPassword, type ActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    forgotPassword,
    null,
  )

  if (state?.success) {
    return (
      <>
        <h1 className="mb-1 text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-medium text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Forgot password?</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
          {state && !state.success && state.errors?.email && (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        {state && !state.success && !state.errors && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </Link>
    </>
  )
}
