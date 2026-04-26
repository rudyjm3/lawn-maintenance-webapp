"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"

export type PropertyActionState =
  | { success: true; message: string; geocoded: boolean }
  | { success: false; message: string }

type Coordinates = { lat: number; lng: number }
type GeocodeFailureReason = "not_configured" | "request_failed" | "not_found"
type GeocodeResult =
  | { coordinates: Coordinates; failureReason: null }
  | { coordinates: null; failureReason: GeocodeFailureReason }

function parseGeocodeLocation(json: unknown): Coordinates | null {
  if (!json || typeof json !== "object") return null

  const data = json as {
    latitude?: number | string
    longitude?: number | string
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number; latitude?: number; longitude?: number } } }>
    result?: { geometry?: { location?: { lat?: number; lng?: number; latitude?: number; longitude?: number } } }
  }
  const directLat = typeof data.latitude === "string" ? Number(data.latitude) : data.latitude
  const directLng = typeof data.longitude === "string" ? Number(data.longitude) : data.longitude
  if (typeof directLat === "number" && typeof directLng === "number" && !Number.isNaN(directLat) && !Number.isNaN(directLng)) {
    return { lat: directLat, lng: directLng }
  }

  const location = data.results?.[0]?.geometry?.location ?? data.result?.geometry?.location
  if (!location) return null

  const lat = location.lat ?? location.latitude
  const lng = location.lng ?? location.longitude
  if (typeof lat !== "number" || typeof lng !== "number") return null

  return { lat, lng }
}

async function geocodeWithRapidApi(address: string): Promise<GeocodeResult> {
  const key = process.env.RAPIDAPI_KEY
  const host = process.env.RAPIDAPI_GOOGLE_GEOCODING_HOST
  const path = process.env.RAPIDAPI_GOOGLE_GEOCODING_PATH ?? "/geocode"

  if (!key || !host) return { coordinates: null, failureReason: "not_configured" }

  try {
    const url = new URL(`https://${host}${path}`)
    url.searchParams.set("address", address)

    const res = await fetch(url, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    if (!res.ok) return { coordinates: null, failureReason: "request_failed" }

    const coordinates = parseGeocodeLocation(await res.json())
    return coordinates
      ? { coordinates, failureReason: null }
      : { coordinates: null, failureReason: "not_found" }
  } catch {
    return { coordinates: null, failureReason: "request_failed" }
  }
}

async function geocodeWithGoogleApi(address: string): Promise<GeocodeResult> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key || key.startsWith("your-")) return { coordinates: null, failureReason: "not_configured" }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
    url.searchParams.set("address", address)
    url.searchParams.set("key", key)

    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return { coordinates: null, failureReason: "request_failed" }

    const json = await res.json()
    if (json.status !== "OK") return { coordinates: null, failureReason: "not_found" }

    const coordinates = parseGeocodeLocation(json)
    return coordinates
      ? { coordinates, failureReason: null }
      : { coordinates: null, failureReason: "not_found" }
  } catch {
    return { coordinates: null, failureReason: "request_failed" }
  }
}

async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const rapidApiResult = await geocodeWithRapidApi(address)
  if (rapidApiResult.coordinates) return rapidApiResult

  const googleApiResult = await geocodeWithGoogleApi(address)
  if (googleApiResult.coordinates) return googleApiResult

  return rapidApiResult.failureReason === "not_configured" ? googleApiResult : rapidApiResult
}

function getGeocodeFailureMessage(reason: GeocodeFailureReason): string {
  if (reason === "not_configured") return "Geocoding is not configured in the running server."
  if (reason === "request_failed") return "Geocoding request failed."
  return "Geocoding did not return coordinates for that address."
}

const PropertySchema = z.object({
  id: z.string().optional(),
  client_id: z.string().min(1, "Client is required"),
  address: z.string().min(1, "Address is required"),
  lawn_size: z.string().optional(),
  gate_code: z.string().optional(),
  access_notes: z.string().optional(),
  pet_notes: z.string().optional(),
  is_commercial: z.boolean().default(false),
})

export type PropertyFormValues = z.infer<typeof PropertySchema>

export async function saveProperty(values: PropertyFormValues): Promise<PropertyActionState> {
  const parsed = PropertySchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  const { id, ...fields } = parsed.data
  const address = fields.address.trim()
  const existingProperty = id
    ? await supabase
        .from("properties")
        .select("address, lat, lng")
        .eq("id", id)
        .eq("business_id", businessId)
        .single()
    : null
  const existingAddress = existingProperty?.data?.address
  const addressChanged = !id || existingAddress !== address
  const geo = addressChanged ? await geocodeAddress(address) : null
  const coordinates = geo?.coordinates ?? null
  const geocodeFailureReason = geo?.failureReason ?? "not_found"

  const row = {
    client_id: fields.client_id,
    address,
    lawn_size: fields.lawn_size?.trim() || null,
    gate_code: fields.gate_code?.trim() || null,
    access_notes: fields.access_notes?.trim() || null,
    pet_notes: fields.pet_notes?.trim() || null,
    is_commercial: fields.is_commercial,
  }
  const coordinateFields = coordinates
    ? { lat: coordinates.lat, lng: coordinates.lng }
    : id
      ? {}
      : { lat: null, lng: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (id) {
    const { error } = await db
      .from("properties")
      .update({ ...row, ...coordinateFields })
      .eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath("/properties")
    revalidatePath(`/clients/${fields.client_id}`)
    const message = coordinates
      ? "Property updated and coordinates refreshed."
      : addressChanged
        ? `Property updated. ${getGeocodeFailureMessage(geocodeFailureReason)} Existing coordinates were preserved.`
        : "Property updated."
    return { success: true, message, geocoded: !!coordinates }
  }

  const insertRow = { ...row, ...coordinateFields, business_id: businessId }
  const { error } = await db.from("properties").insert(insertRow)
  if (error) return { success: false, message: error.message }
  revalidatePath("/properties")
  revalidatePath(`/clients/${fields.client_id}`)
  return {
    success: true,
    message: coordinates
      ? "Property added and geocoded."
      : `Property added. ${getGeocodeFailureMessage(geocodeFailureReason)}`,
    geocoded: !!coordinates,
  }
}
