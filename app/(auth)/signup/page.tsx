"use client"

import { useActionState } from "react"
import Link from "next/link"
import { signup, type ActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    signup,
    null,
  )

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
