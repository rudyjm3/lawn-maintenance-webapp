import { OnboardingWizard } from "@/components/onboarding/wizard"

export const metadata = {
  title: "Get Started",
}

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 bg-muted/40">
      <OnboardingWizard />
    </div>
  )
}
