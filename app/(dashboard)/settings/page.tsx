import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { GeocodePropertiesCard } from "@/components/settings/geocode-properties-card"
import { PricingFormulaCard } from "@/components/settings/pricing-formula-card"
import { getPricingSettings } from "@/app/actions/settings"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId } = await getAuthenticatedBusinessId(supabase)

  const [totalPropsResult, ungeocodedResult, pricingSettings] = await Promise.all([
    db
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId ?? ""),
    db
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId ?? "")
      .is("lat", null),
    getPricingSettings(),
  ])

  const geocodingConfigured =
    !!process.env.RAPIDAPI_KEY && !!process.env.RAPIDAPI_GOOGLE_GEOCODING_HOST

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and integrations.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Price Calculator</h2>
        <PricingFormulaCard settings={pricingSettings} />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Map & Geocoding</h2>
        <GeocodePropertiesCard
          total={totalPropsResult.count ?? 0}
          ungeocoded={ungeocodedResult.count ?? 0}
          configured={geocodingConfigured}
        />
      </div>
    </div>
  )
}
