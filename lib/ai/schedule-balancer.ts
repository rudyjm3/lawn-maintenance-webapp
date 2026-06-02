import Anthropic from "@anthropic-ai/sdk"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ScheduleSuggestion } from "@/types"

const CAPACITY_MIN = 480

let _client: Anthropic | null = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export async function getScheduleSuggestions(
  weekStart: string,
  businessId: string,
): Promise<ScheduleSuggestion[]> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Compute 7-day window
  const start = weekStart
  const endDate = new Date(weekStart + "T00:00:00Z")
  endDate.setUTCDate(endDate.getUTCDate() + 6)
  const end = endDate.toISOString().slice(0, 10)

  const [jobsResult, crewsResult] = await Promise.all([
    db
      .from("jobs")
      .select("id, title, service_date, estimated_duration_min, route_stops(route:routes(crew:crews(id, name)))")
      .eq("business_id", businessId)
      .in("status", ["scheduled", "unscheduled"])
      .not("estimated_duration_min", "is", null)
      .gte("service_date", start)
      .lte("service_date", end),
    db.from("crews").select("id, name").eq("business_id", businessId).eq("is_active", true),
  ])

  if (jobsResult.error || crewsResult.error) return []

  type JobR = { id: string; title: string | null; service_date: string | null; estimated_duration_min: number; route_stops: { route: { crew: { id: string; name: string } | null } | null }[] }
  const jobs = (jobsResult.data ?? []) as JobR[]
  const crews = (crewsResult.data ?? []) as { id: string; name: string }[]

  if (jobs.length === 0) return []

  // Compute per-day per-crew load
  const loadMap: Record<string, Record<string, number>> = {} // date → crewName → minutes
  const dayDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() + i)
    dayDates.push(d.toISOString().slice(0, 10))
  }

  for (const date of dayDates) loadMap[date] = {}

  const jobInfos: { id: string; title: string; date: string | null; estMin: number; crewName: string }[] = jobs.map((j) => {
    const stop = j.route_stops?.[0]
    const crew = Array.isArray(stop?.route) ? (stop.route as unknown[])[0] : stop?.route
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const crewObj = Array.isArray((crew as any)?.crew) ? ((crew as any).crew as unknown[])[0] : (crew as any)?.crew
    const crewName = (crewObj as { name?: string } | null)?.name ?? "Unassigned"
    return { id: j.id, title: j.title ?? "Service", date: j.service_date, estMin: j.estimated_duration_min, crewName }
  })

  for (const j of jobInfos) {
    if (!j.date || !loadMap[j.date]) continue
    loadMap[j.date][j.crewName] = (loadMap[j.date][j.crewName] ?? 0) + j.estMin
  }

  // Build context for Claude
  const context = {
    capacityMinPerCrewPerDay: CAPACITY_MIN,
    crews: crews.map((c) => c.name),
    days: dayDates.map((date) => ({
      date,
      loads: loadMap[date],
      jobs: jobInfos.filter((j) => j.date === date).map((j) => ({
        id: j.id,
        title: j.title,
        estimatedMin: j.estMin,
        crew: j.crewName,
      })),
    })),
  }

  const prompt = `You are a lawn care scheduling assistant. Analyze the following crew schedule and suggest how to rebalance it to avoid overloading crews (capacity is ${CAPACITY_MIN} minutes per crew per day).

Schedule data:
${JSON.stringify(context, null, 2)}

Return ONLY a valid JSON array of rebalancing suggestions. No explanation text, no markdown code blocks — just the raw JSON array.
Schema: [{"jobId":"...","jobTitle":"...","currentDate":"YYYY-MM-DD","suggestedDate":"YYYY-MM-DD","currentCrewName":"...","reason":"..."}]
Only suggest moves that meaningfully reduce overloading. Return an empty array [] if no improvements are needed.`

  try {
    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]"
    const parsed = JSON.parse(text) as ScheduleSuggestion[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
