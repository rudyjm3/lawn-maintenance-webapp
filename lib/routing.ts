// Google Maps Route Matrix API via RapidAPI (computeRouteMatrix v2).
// Origins = stops[0..N-2], Destinations = stops[1..N-1].
// Diagonal elements (originIndex === destinationIndex) give sequential pairs.

const ROUTES_HOST = "google-map-routes.p.rapidapi.com"
const ROUTES_PATH = "/distanceMatrix/v2:computeRouteMatrix"

interface Coord {
  lat: number
  lng: number
}

interface RouteMatrixElement {
  originIndex: number
  destinationIndex: number
  duration?: string        // e.g. "300s"
  distanceMeters?: number
  status?: { code?: number; message?: string }
}

export interface DriveTimeResult {
  // travelMinutes[i] = drive minutes from stop i-1 to stop i (first stop is always 0)
  travelMinutes: number[]
  totalDriveMinutes: number
}

function parseDurationSeconds(raw: string | undefined): number {
  if (!raw) return 0
  return parseInt(raw.replace("s", ""), 10) || 0
}

function makeWaypoint(coord: Coord) {
  return {
    waypoint: {
      location: {
        latLng: { latitude: coord.lat, longitude: coord.lng },
      },
    },
    routeModifiers: { avoid_ferries: true },
  }
}

export async function getSequentialDriveTimes(
  stops: Coord[],
): Promise<DriveTimeResult | null> {
  if (stops.length < 2) {
    return { travelMinutes: stops.map(() => 0), totalDriveMinutes: 0 }
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    console.warn("RAPIDAPI_KEY not set — drive times will not be calculated.")
    return null
  }

  // N stops → N-1 origins, N-1 destinations (sequential pairs)
  const origins = stops.slice(0, -1).map(makeWaypoint)
  const destinations = stops.slice(1).map((s) => ({
    waypoint: {
      location: {
        latLng: { latitude: s.lat, longitude: s.lng },
      },
    },
  }))

  try {
    const res = await fetch(`https://${ROUTES_HOST}${ROUTES_PATH}`, {
      method: "POST",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": ROUTES_HOST,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status",
      },
      body: JSON.stringify({
        origins,
        destinations,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
      cache: "no-store",
    })

    const rawText = await res.text()
    if (!res.ok) {
      console.error("Routes API error:", res.status, rawText)
      return null
    }

    let elements: RouteMatrixElement[]
    try {
      const parsed = JSON.parse(rawText)
      // API may return a top-level array or an object with elements nested inside
      elements = Array.isArray(parsed) ? parsed : (parsed.elements ?? parsed.rows ?? [])
      console.log("Routes API elements:", JSON.stringify(elements))
    } catch {
      console.error("Routes API parse error:", rawText)
      return null
    }

    // First stop has no prior stop — travel time is 0
    const travelMinutes: number[] = [0]
    let totalDriveMinutes = 0

    for (let i = 0; i < stops.length - 1; i++) {
      // Diagonal: origins[i] → destinations[i] = stops[i] → stops[i+1]
      const el = elements.find(
        (e) => e.originIndex === i && e.destinationIndex === i,
      )
      const minutes = Math.round(parseDurationSeconds(el?.duration) / 60)
      travelMinutes.push(minutes)
      totalDriveMinutes += minutes
    }

    return { travelMinutes, totalDriveMinutes }
  } catch (err) {
    console.error("Routes API exception:", err)
    return null
  }
}
