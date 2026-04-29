// Open-Meteo forecast — free, no API key required.
// Fetches 14 days of daily weather and maps WMO codes to lawn-care severity.

export type WeatherSeverity = "clear" | "watch" | "rain" | "severe"

export interface DayWeather {
  date: string          // YYYY-MM-DD
  severity: WeatherSeverity
  label: string         // human-readable condition
  icon: string          // emoji
  precipMm: number
  tempMaxC: number
}

// WMO weather interpretation codes → severity
function codeToSeverity(code: number): WeatherSeverity {
  if ([0, 1, 2, 3].includes(code)) return "clear"
  if ([45, 48, 51, 53].includes(code)) return "watch"
  if ([55, 61, 63, 71, 73, 77, 80, 81, 85].includes(code)) return "rain"
  return "severe" // 65, 75, 82, 86, 95, 96, 99
}

function codeToLabel(code: number): string {
  if (code === 0) return "Clear"
  if (code <= 3) return "Partly cloudy"
  if (code <= 48) return "Foggy"
  if (code <= 55) return "Drizzle"
  if (code <= 65) return "Rain"
  if (code <= 67) return "Freezing rain"
  if (code <= 75) return "Snow"
  if (code === 77) return "Snow grains"
  if (code <= 82) return "Rain showers"
  if (code <= 86) return "Snow showers"
  if (code === 95) return "Thunderstorm"
  return "Severe storm"
}

function codeToIcon(code: number): string {
  if (code === 0) return "☀️"
  if (code <= 3) return "⛅"
  if (code <= 48) return "🌫️"
  if (code <= 55) return "🌦️"
  if (code <= 67) return "🌧️"
  if (code <= 77) return "❄️"
  if (code <= 82) return "🌧️"
  if (code <= 86) return "🌨️"
  return "⛈️"
}

export async function fetchWeekForecast(
  lat: number,
  lng: number,
): Promise<DayWeather[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lng))
  url.searchParams.set("daily", "weathercode,precipitation_sum,temperature_2m_max")
  url.searchParams.set("timezone", "auto")
  url.searchParams.set("forecast_days", "14")

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // cache for 1 hour
  })

  if (!res.ok) {
    console.error("Open-Meteo error:", res.status, await res.text())
    return []
  }

  const json = await res.json()
  const times: string[] = json.daily?.time ?? []
  const codes: number[] = json.daily?.weathercode ?? []
  const precip: number[] = json.daily?.precipitation_sum ?? []
  const temps: number[] = json.daily?.temperature_2m_max ?? []

  return times.map((date, i) => {
    const code = codes[i] ?? 0
    return {
      date,
      severity: codeToSeverity(code),
      label: codeToLabel(code),
      icon: codeToIcon(code),
      precipMm: precip[i] ?? 0,
      tempMaxC: temps[i] ?? 0,
    }
  })
}
