"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

const SignupSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(/[A-Za-z]/, { message: "Must contain at least one letter." })
    .regex(/[0-9]/, { message: "Must contain at least one number." }),
  businessName: z
    .string()
    .min(2, { message: "Business name must be at least 2 characters." })
    .trim(),
})

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionState =
  | { success: true; message?: string }
  | { success: false; message: string; errors?: Record<string, string[]>; fields?: Record<string, string> }

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function login(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      fields: { email: raw.email },
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { success: false, message: error.message, fields: { email: raw.email } }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signup(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    businessName: formData.get("businessName") as string,
  }

  // Safe fields to echo back (never echo password)
  const safeFields = { email: raw.email, businessName: raw.businessName }

  const parsed = SignupSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      fields: safeFields,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { business_name: parsed.data.businessName },
    },
  })

  if (error) {
    return { success: false, message: error.message, fields: safeFields }
  }

  // No session means Supabase requires email confirmation before login.
  // Don't redirect to onboarding — the user isn't authenticated yet.
  if (!data.session) {
    return {
      success: true,
      message: `We sent a confirmation link to ${parsed.data.email}. Click it to activate your account, then sign in.`,
    }
  }

  revalidatePath("/", "layout")
  redirect("/onboarding")
}

export async function forgotPassword(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const raw = { email: formData.get("email") }
  const parsed = ForgotPasswordSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?type=recovery`,
  })

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, message: "Check your email for a password reset link." }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
