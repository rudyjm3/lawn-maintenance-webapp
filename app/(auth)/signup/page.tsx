"use client"

import { useActionState } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { signup, type ActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    signup,
    null,
  )

  // Email confirmation required — Supabase sent a link, user isn't logged in yet
  if (state?.success && state.message) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{state.message}</p>
        <Link href="/login" className="text-sm font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  const fields = state && !state.success ? state.fields : undefined

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Start your free trial</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        14 days free — no credit card required.
      </p>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            name="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Green Acres Lawn Care"
            defaultValue={fields?.businessName}
            required
          />
          {state && !state.success && state.errors?.businessName && (
            <p className="text-xs text-destructive">{state.errors.businessName[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            defaultValue={fields?.email}
            required
          />
          {state && !state.success && state.errors?.email && (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

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

        {state && !state.success && !state.errors && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
