"use server"

import { createClient } from "@/lib/supabase/server"

export async function requestPortalMagicLink(
  email: string,
): Promise<{ success: boolean; message: string }> {
  if (!email || !email.includes("@")) return { success: false, message: "Valid email required." }

  const supabase = await createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.greenroute.app"

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/portal/auth/confirm`,
    },
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: "Check your email for a sign-in link." }
}

export async function portalSignOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
