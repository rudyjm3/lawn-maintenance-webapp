import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { GeocodePropertiesCard } from "@/components/settings/geocode-properties-card"
import { BusinessLocationCard } from "@/components/settings/business-location-card"
import { CollapsiblePricingSection } from "@/components/settings/collapsible-pricing-section"
import { getPricingSettings, getBusinessLocation } from "@/app/actions/settings"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId } = await getAuthenticatedBusinessId(supabase)

  const [totalPropsResult, ungeocodedResult, pricingSettings, businessLocation] = await Promise.all([
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
    getBusinessLocation(),
  ])

  const geocodingConfigured =
    !!process.env.RAPIDAPI_KEY && !!process.env.RAPIDAPI_GOOGLE_GEOCODING_HOST

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and integrations.</p>
      </div>

      <CollapsiblePricingSection settings={pricingSettings} />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Map & Geocoding</h2>
        <BusinessLocationCard current={businessLocation} />
        <GeocodePropertiesCard
          total={totalPropsResult.count ?? 0}
          ungeocoded={ungeocodedResult.count ?? 0}
          configured={geocodingConfigured}
        />
      </div>
    </div>
  )
}
