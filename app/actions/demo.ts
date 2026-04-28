"use server"

import { revalidatePath } from "next/cache"
import { addUtcDaysToIso, todayUtc } from "@/lib/dates"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

export type DemoActionState =
  | { success: true; message: string }
  | { success: false; message: string }

type PropertyRow = { id: string; client_id: string }
type CrewRow = { id: string; name: string }

export async function generateDemoJobsAndRoutes(): Promise<DemoActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const today = todayUtc()
  const lookaheadEnd = addUtcDaysToIso(today, 14)

  const { data: properties, error: propertiesError } = await db
    .from("properties")
    .select("id, client_id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .limit(12)

  if (propertiesError) return { success: false, message: propertiesError.message }
  const propertyRows = (properties ?? []) as PropertyRow[]
  if (propertyRows.length === 0) {
    return {
      success: false,
      message: "No properties found. Seed clients/properties first.",
    }
  }

  let crewId: string | null = null
  const { data: existingCrew, error: crewError } = await db
    .from("crews")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (crewError) return { success: false, message: crewError.message }
  if (existingCrew) {
    crewId = (existingCrew as CrewRow).id
  } else {
    const { data: insertedCrew, error: createCrewError } = await db
      .from("crews")
      .insert({ business_id: businessId, name: "Demo Crew", is_active: true })
      .select("id")
      .single()
    if (createCrewError) return { success: false, message: createCrewError.message }
    crewId = insertedCrew.id
  }

  const { data: existingJobs, error: existingJobsError } = await db
    .from("jobs")
    .select("id")
    .eq("business_id", businessId)
    .gte("service_date", today)
    .lte("service_date", lookaheadEnd)
    .in("status", ["scheduled", "in_progress"])

  if (existingJobsError) return { success: false, message: existingJobsError.message }

  if ((existingJobs?.length ?? 0) >= 10) {
    return {
      success: true,
      message: "Upcoming jobs already exist. Skipped demo generation.",
    }
  }

  const { data: serviceTypes, error: serviceTypeError } = await db
    .from("service_types")
    .select("id, default_duration_min, default_price")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (serviceTypeError) return { success: false, message: serviceTypeError.message }

  let propertyServiceId: string | null = null
  if (serviceTypes) {
    const { data: propertyService, error: propertyServiceError } = await db
      .from("property_services")
      .select("id")
      .eq("business_id", businessId)
      .eq("service_type_id", serviceTypes.id)
      .limit(1)
      .maybeSingle()
    if (propertyServiceError) return { success: false, message: propertyServiceError.message }
    propertyServiceId = propertyService?.id ?? null
  }

  const demoJobs = Array.from({ length: Math.min(12, propertyRows.length * 2) }).map((_, idx) => {
    const property = propertyRows[idx % propertyRows.length]
    const dayOffset = idx % 6
    const serviceDate = addUtcDaysToIso(today, dayOffset)
    return {
      business_id: businessId,
      client_id: property.client_id,
      property_id: property.id,
      property_service_id: propertyServiceId,
      service_date: serviceDate,
      status: "scheduled" as const,
      estimated_duration_min: serviceTypes?.default_duration_min ?? 45,
      actual_duration_min: null,
      price: serviceTypes?.default_price ?? 65,
      photo_required: false,
    }
  })

  const { data: insertedJobs, error: insertJobsError } = await db
    .from("jobs")
    .insert(demoJobs)
    .select("id, service_date, estimated_duration_min")

  if (insertJobsError) return { success: false, message: insertJobsError.message }

  const { data: route, error: routeError } = await db
    .from("routes")
    .upsert(
      {
        business_id: businessId,
        crew_id: crewId,
        route_date: today,
        total_job_min: 0,
        total_drive_min: 0,
        is_locked: false,
        optimization_status: "manual",
      },
      { onConflict: "business_id,crew_id,route_date" },
    )
    .select("id")
    .single()

  if (routeError) return { success: false, message: routeError.message }

  const todayJobIds = ((insertedJobs ?? []) as Array<{ id: string; service_date: string; estimated_duration_min: number }>)
    .filter((job) => job.service_date === today)
    .slice(0, 8)

  if (todayJobIds.length > 0) {
    const { error: clearStopsError } = await db
      .from("route_stops")
      .delete()
      .eq("business_id", businessId)
      .eq("route_id", route.id)
    if (clearStopsError) return { success: false, message: clearStopsError.message }

    const stops = todayJobIds.map((job, idx) => ({
      business_id: businessId,
      route_id: route.id,
      job_id: job.id,
      stop_order: idx + 1,
      travel_time_min: idx === 0 ? 0 : 12,
      status: "pending" as const,
    }))
    const { error: stopsError } = await db.from("route_stops").insert(stops)
    if (stopsError) return { success: false, message: stopsError.message }

    const totalJobMin = todayJobIds.reduce((sum, job) => sum + (job.estimated_duration_min ?? 0), 0)
    const totalDriveMin = Math.max(0, (todayJobIds.length - 1) * 12)
    const { error: routeUpdateError } = await db
      .from("routes")
      .update({ total_job_min: totalJobMin, total_drive_min: totalDriveMin })
      .eq("id", route.id)
    if (routeUpdateError) return { success: false, message: routeUpdateError.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/jobs")
  revalidatePath("/schedule")
  revalidatePath("/schedules")
  revalidatePath("/routes")
  revalidatePath("/crew/today")
  revalidatePath("/crew/route")

  return {
    success: true,
    message: `Generated ${insertedJobs?.length ?? 0} demo jobs and refreshed route data.`,
  }
}
