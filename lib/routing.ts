// OpenRouteService Matrix API — returns sequential drive times between ordered stops.
// ORS uses [lng, lat] coordinate order (GeoJSON convention).

interface Coord {
  lat: number
  lng: number
}

export interface DriveTimeResult {
  // travel_time_min[i] = drive minutes from stop i-1 to stop i (first stop is always 0)
  travelMinutes: number[]
  totalDriveMinutes: number
}

export async function getSequentialDriveTimes(
  stops: Coord[],
): Promise<DriveTimeResult | null> {
  if (stops.length < 2) {
    return {
      travelMinutes: stops.map(() => 0),
      totalDriveMinutes: 0,
    }
  }

  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) {
    console.warn("ORS_API_KEY not set — drive times will not be calculated.")
    return null
  }

  const locations = stops.map((s) => [s.lng, s.lat])

  try {
    const res = await fetch(
      "https://api.openrouteservice.org/v2/matrix/driving-car",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locations, metrics: ["duration"] }),
        cache: "no-store",
      },
    )

    if (!res.ok) {
      console.error("ORS matrix request failed:", res.status, await res.text())
      return null
    }

    const json = (await res.json()) as { durations: number[][] }
    const matrix = json.durations

    // Sequential pairs: stop[0]→[1], [1]→[2], etc.
    // First stop has no prior stop so travel_time = 0.
    const travelMinutes: number[] = [0]
    let totalDriveMinutes = 0

    for (let i = 1; i < stops.length; i++) {
      const seconds = matrix[i - 1]?.[i] ?? 0
      const minutes = Math.round(seconds / 60)
      travelMinutes.push(minutes)
      totalDriveMinutes += minutes
    }

    return { travelMinutes, totalDriveMinutes }
  } catch (err) {
    console.error("ORS matrix error:", err)
    return null
  }
}
