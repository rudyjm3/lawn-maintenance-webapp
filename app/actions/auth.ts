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
  | { success: false; message: string; errors?: Record<string, string[]> }

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function login(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signup(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    businessName: formData.get("businessName"),
  }

  const parsed = SignupSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { business_name: parsed.data.businessName },
    },
  })

  if (error) {
    return { success: false, message: error.message }
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
