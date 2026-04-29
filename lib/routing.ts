// OpenRouteService Matrix API — driving-car profile.
// Sends all stop coordinates, gets back an N×N duration matrix (seconds).
// Sequential drive time: durations[i][i+1] for each consecutive pair.

const ORS_MATRIX_URL = "https://api.openrouteservice.org/v2/matrix/driving-car"

interface Coord {
  lat: number
  lng: number
}

export interface DriveTimeResult {
  // travelMinutes[i] = drive minutes from stop i-1 to stop i (first stop is always 0)
  travelMinutes: number[]
  totalDriveMinutes: number
}

export async function getSequentialDriveTimes(
  stops: Coord[],
): Promise<DriveTimeResult | null> {
  if (stops.length < 2) {
    return { travelMinutes: stops.map(() => 0), totalDriveMinutes: 0 }
  }

  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) {
    console.warn("ORS_API_KEY not set — drive times will not be calculated.")
    return null
  }

  // ORS uses [longitude, latitude] order
  const locations = stops.map((s) => [s.lng, s.lat])

  try {
    const res = await fetch(ORS_MATRIX_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations,
        metrics: ["duration"],
        resolve_locations: false,
      }),
      cache: "no-store",
    })

    const rawText = await res.text()
    if (!res.ok) {
      console.error("ORS Matrix API error:", res.status, rawText)
      return null
    }

    let durations: number[][] | undefined
    try {
      const parsed = JSON.parse(rawText)
      durations = parsed.durations
    } catch {
      console.error("ORS Matrix API parse error:", rawText)
      return null
    }

    if (!durations || durations.length === 0) {
      console.error("ORS Matrix API: no durations in response")
      return null
    }

    // First stop has no prior leg — travel time is 0
    const travelMinutes: number[] = [0]
    let totalDriveMinutes = 0

    for (let i = 0; i < stops.length - 1; i++) {
      const seconds = durations[i]?.[i + 1] ?? 0
      const minutes = Math.round(seconds / 60)
      travelMinutes.push(minutes)
      totalDriveMinutes += minutes
    }

    return { travelMinutes, totalDriveMinutes }
  } catch (err) {
    console.error("ORS Matrix API exception:", err)
    return null
  }
}
