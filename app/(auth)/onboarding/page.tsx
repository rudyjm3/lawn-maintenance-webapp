import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingWizard } from "@/components/onboarding/wizard"

export const metadata = {
  title: "Get Started",
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")
  if (user.user_metadata?.onboarding_complete) redirect("/dashboard")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 bg-muted/40">
      <OnboardingWizard />
    </div>
  )
}
