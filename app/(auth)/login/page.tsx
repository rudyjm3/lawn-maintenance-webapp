"use client"

import { Suspense, useActionState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { login, type ActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function UrlError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  if (!error) return null
  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  )
}

function LoginForm() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(login, null)

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Welcome back — sign in to your account.
      </p>

      <Suspense>
        <UrlError />
      </Suspense>

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
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
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Start free trial
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
