import { NextRequest, NextResponse } from "next/server"
import { addUtcDaysToIso, todayUtc } from "@/lib/dates"
import { generateJobsForBusinessLookahead } from "@/lib/jobs"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })
  }

  const authorization = request.headers.get("authorization")
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const supabase = createAdminClient()
  const startDate = todayUtc()
  const endDate = addUtcDaysToIso(startDate, 28)

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, business_name")
    .order("created_at", { ascending: true })

  if (businessesError) {
    return NextResponse.json({ error: businessesError.message }, { status: 500 })
  }

  const results: Array<{
    businessId: string
    businessName: string
    createdCount: number
    skippedCount: number
    error?: string
  }> = []

  for (const business of businesses ?? []) {
    try {
      const result = await generateJobsForBusinessLookahead(supabase, business.id, {
        startDate,
        endDate,
      })
      results.push({
        businessId: business.id,
        businessName: business.business_name,
        createdCount: result.createdCount,
        skippedCount: result.skippedCount,
      })
    } catch (error) {
      results.push({
        businessId: business.id,
        businessName: business.business_name,
        createdCount: 0,
        skippedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const failedCount = results.filter((result) => !!result.error).length

  return NextResponse.json({
    startDate,
    endDate,
    totalCreated: results.reduce((sum, result) => sum + result.createdCount, 0),
    failedCount,
    results,
  })
}
