"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { getSequentialDriveTimes } from "@/lib/routing"
import { z } from "zod"

export type RouteActionState =
  | { success: true; message: string }
  | { success: false; message: string }

// ─── Lock / Unlock ────────────────────────────────────────────────────────────

export async function setRouteLocked(
  routeId: string,
  locked: boolean,
): Promise<RouteActionState> {
  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("routes")
    .update({ is_locked: locked })
    .eq("id", routeId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }
  revalidatePath("/routes")
  revalidatePath(`/routes/${routeId}`)
  revalidatePath("/dashboard")
  return { success: true, message: locked ? "Route locked." : "Route unlocked." }
}

// ─── Reorder stops ────────────────────────────────────────────────────────────

export async function reorderStops(
  routeId: string,
  orderedStopIds: string[],
): Promise<RouteActionState> {
  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Verify route belongs to this business and is not locked
  const { data: route, error: routeError } = await db
    .from("routes")
    .select("is_locked")
    .eq("id", routeId)
    .eq("business_id", businessId)
    .single()

  if (routeError || !route) return { success: false, message: "Route not found." }
  if (route.is_locked) return { success: false, message: "Cannot reorder a locked route." }

  const updates = orderedStopIds.map((stopId, index) =>
    db
      .from("route_stops")
      .update({ stop_order: index + 1 })
      .eq("id", stopId)
      .eq("route_id", routeId)
      .eq("business_id", businessId),
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { success: false, message: failed.error.message }

  await recalculateDriveTimes(routeId)
  revalidatePath(`/routes/${routeId}`)
  revalidatePath("/dashboard")
  return { success: true, message: "Stop order updated." }
}

// ─── Remove stop ──────────────────────────────────────────────────────────────

export async function removeStop(
  routeId: string,
  stopId: string,
): Promise<RouteActionState> {
  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: route } = await db
    .from("routes")
    .select("is_locked")
    .eq("id", routeId)
    .eq("business_id", businessId)
    .single()

  if (route?.is_locked) return { success: false, message: "Cannot edit a locked route." }

  const { error } = await db
    .from("route_stops")
    .delete()
    .eq("id", stopId)
    .eq("route_id", routeId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }
  await recalculateDriveTimes(routeId)
  revalidatePath(`/routes/${routeId}`)
  revalidatePath("/dashboard")
  return { success: true, message: "Stop removed." }
}

// ─── Add job to route ─────────────────────────────────────────────────────────

const AddStopSchema = z.object({
  routeId: z.string().uuid(),
  jobId: z.string().uuid(),
})

export async function addJobToRoute(
  routeId: string,
  jobId: string,
): Promise<RouteActionState> {
  const parsed = AddStopSchema.safeParse({ routeId, jobId })
  if (!parsed.success) return { success: false, message: "Invalid input." }

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: route, error: routeError } = await db
    .from("routes")
    .select("is_locked")
    .eq("id", routeId)
    .eq("business_id", businessId)
    .single()

  if (routeError || !route) return { success: false, message: "Route not found." }
  if (route.is_locked) return { success: false, message: "Cannot edit a locked route." }

  // Get current max stop_order
  const { data: stops } = await db
    .from("route_stops")
    .select("stop_order")
    .eq("route_id", routeId)
    .order("stop_order", { ascending: false })
    .limit(1)

  const nextOrder = ((stops?.[0]?.stop_order ?? 0) as number) + 1

  const { error } = await db.from("route_stops").insert({
    business_id: businessId,
    route_id: routeId,
    job_id: jobId,
    stop_order: nextOrder,
    status: "pending",
    travel_time_min: 0,
  })

  if (error) return { success: false, message: error.message }
  await recalculateDriveTimes(routeId)
  revalidatePath(`/routes/${routeId}`)
  revalidatePath("/dashboard")
  return { success: true, message: "Job added to route." }
}

// ─── Create route ─────────────────────────────────────────────────────────────

const CreateRouteSchema = z.object({
  crew_id: z.string().uuid(),
  route_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function createRoute(values: {
  crew_id: string
  route_date: string
}): Promise<RouteActionState & { routeId?: string }> {
  const parsed = CreateRouteSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error." }
  }

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from("routes")
    .insert({
      business_id: businessId,
      crew_id: parsed.data.crew_id,
      route_date: parsed.data.route_date,
      is_locked: false,
      optimization_status: "pending",
      total_job_min: 0,
      total_drive_min: 0,
    })
    .select("id")
    .single()

  if (error) return { success: false, message: error.message }

  revalidatePath("/routes")
  revalidatePath("/dashboard")
  return { success: true, message: "Route created.", routeId: data.id }
}

// ─── Update crew ─────────────────────────────────────────────────────────────

export async function updateRouteCrew(
  routeId: string,
  crewId: string,
): Promise<RouteActionState> {
  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: route } = await db
    .from("routes")
    .select("is_locked")
    .eq("id", routeId)
    .eq("business_id", businessId)
    .single()

  if (route?.is_locked) return { success: false, message: "Cannot edit a locked route." }

  const { error } = await db
    .from("routes")
    .update({ crew_id: crewId })
    .eq("id", routeId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }
  revalidatePath("/routes")
  revalidatePath(`/routes/${routeId}`)
  revalidatePath("/dashboard")
  return { success: true, message: "Crew updated." }
}

// ─── Recalculate drive times ──────────────────────────────────────────────────

export async function recalculateDriveTimes(
  routeId: string,
): Promise<RouteActionState> {
  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch stops ordered by stop_order, with job duration and property coordinates
  const { data: stops, error: stopsError } = await db
    .from("route_stops")
    .select(`
      id,
      stop_order,
      job:jobs(
        estimated_duration_min,
        property:properties(lat, lng)
      )
    `)
    .eq("route_id", routeId)
    .eq("business_id", businessId)
    .order("stop_order", { ascending: true })

  if (stopsError || !stops) return { success: false, message: stopsError?.message ?? "Stops not found." }

  type StopRow = {
    id: string
    stop_order: number
    job: { estimated_duration_min: number; property: { lat: number | null; lng: number | null } | null } | null
  }
  const typedStops = stops as StopRow[]

  // Total job minutes from all stops regardless of geocoding
  const totalJobMin = typedStops.reduce(
    (sum, s) => sum + (s.job?.estimated_duration_min ?? 0),
    0,
  )

  // Only stops with coordinates can contribute to drive time
  const geocodedStops = typedStops.filter(
    (s) => s.job?.property?.lat != null && s.job?.property?.lng != null,
  )

  if (geocodedStops.length < 2) {
    // Can't calculate — zero out drive times and update job total only
    await db
      .from("routes")
      .update({ total_job_min: totalJobMin, total_drive_min: 0 })
      .eq("id", routeId)
      .eq("business_id", businessId)

    revalidatePath(`/routes/${routeId}`)
    revalidatePath("/routes")
    revalidatePath("/dashboard")

    const reason =
      geocodedStops.length === 0
        ? "No stops have coordinates — geocode properties in Settings first."
        : "Need at least 2 geocoded stops to calculate drive time."
    return { success: false, message: reason }
  }

  const coords = geocodedStops.map((s) => ({
    lat: s.job!.property!.lat as number,
    lng: s.job!.property!.lng as number,
  }))

  const result = await getSequentialDriveTimes(coords)
  if (!result) {
    return { success: false, message: "Drive time calculation failed — check ORS_API_KEY and server logs." }
  }

  // Write travel_time_min back to each geocoded stop
  const updates = geocodedStops.map((stop, i) =>
    db
      .from("route_stops")
      .update({ travel_time_min: result.travelMinutes[i] })
      .eq("id", stop.id)
      .eq("business_id", businessId),
  )
  await Promise.all(updates)

  // Update route totals
  await db
    .from("routes")
    .update({
      total_job_min: totalJobMin,
      total_drive_min: result.totalDriveMinutes,
    })
    .eq("id", routeId)
    .eq("business_id", businessId)

  revalidatePath(`/routes/${routeId}`)
  revalidatePath("/routes")
  revalidatePath("/dashboard")

  const ungeocodedCount = typedStops.length - geocodedStops.length
  const note = ungeocodedCount > 0 ? ` (${ungeocodedCount} stop${ungeocodedCount > 1 ? "s" : ""} skipped — no coordinates)` : ""
  return {
    success: true,
    message: `Drive times updated${note}.`,
  }
}
