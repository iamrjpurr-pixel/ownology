/**
 * weather router — environmental (ambient) risk telemetry for the cellar.
 *
 * This is Tier 3 of the Risk Management framework:
 *   Tier 1 — Quantitative (from lab readings)   → cellarBriefEngine.ts
 *   Tier 2 — Qualitative  (winemaker observation) → qualFlags.ts
 *   Tier 3 — Environmental (ambient conditions)  → THIS FILE  (Feb 2026)
 *
 * v1 slice (validation-only):
 *   - Thin proxy to Open-Meteo (no API key, 10k free calls/day)
 *   - Hardcoded default location (Ownology Cellars, Hunter Valley)
 *   - Threshold-based alert derivation from current + hourly forecast
 *   - 5 alert types spec'd: humidity high (>75%), humidity low (<55%),
 *     temp high (>18°C), temp low (<10°C), dew-point-approach (< 2°C
 *     margin from indoor cellar temp — hint at condensation risk)
 *
 * Deferred (Slice 2+, once concept validates):
 *   - Per-winery GPS + threshold config (DB storage)
 *   - SOP deep-links (needs "Increase Ventilation SOP" written first)
 *   - Vintage Log flag when a wine is affected by an environmental event
 *   - Historical trend storage + charting
 *   - Push/SMS notifications
 *
 * Cost profile: Open-Meteo is fully free and unauthenticated. No cost
 * per call, no key rotation, no per-winery quota to manage. If we ever
 * outgrow it, migrate to BOM (AU) or OpenWeatherMap for provider-verified
 * pressure/DP data.
 */
import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";

// ── Default location — Ownology Cellars, Pokolbin, Hunter Valley, NSW ──
const DEFAULT_LAT = -32.7770;
const DEFAULT_LNG = 151.3013;
const DEFAULT_LABEL = "Ownology Cellars · Pokolbin, Hunter Valley";

// ── Default thresholds — informed by the /risk-management doctrine ──────
// Sources for the numeric cutoffs:
//   - AWRI Technical Review 227 (2017) — cellar humidity 70-75% ideal for
//     cork-sealed bottled wine; >80% = mould/label risk; <55% = cork drying.
//   - AWRI Bulletin (2019) — bottled-wine storage <18°C keeps oxidation
//     kinetics slow; >20°C accelerates browning + shortens shelf life.
//   - Tartrate stability: <10°C ambient risks THT precipitation in bottle.
const DEFAULT_THRESHOLDS = {
  humidity_high_pct: 75,
  humidity_low_pct: 55,
  temp_high_c: 18,
  temp_low_c: 10,
  // How close the ambient dew point can approach cellar temp before we
  // warn about condensation risk on cool cellar surfaces (tank walls,
  // barrel heads, bottled-wine glass).
  dewpoint_approach_margin_c: 2,
  // Assumed indoor cellar temp when the winery hasn't configured one.
  // Overridden by user config in Slice 2.
  assumed_cellar_temp_c: 14,
} as const;

// ── Types ──────────────────────────────────────────────────────────────
interface CurrentConditions {
  temperature_c: number;
  humidity_pct: number;
  dew_point_c: number;
  pressure_hpa: number;
  cloud_cover_pct: number;
  wind_speed_kmh: number;
  weather_code: number;
  condition_label: string;
  is_day: boolean;
  observed_at_iso: string;
}

interface HourlyForecastPoint {
  time_iso: string;
  temperature_c: number;
  humidity_pct: number;
  dew_point_c: number;
  precipitation_mm: number;
}

interface DailyForecastPoint {
  date_iso: string;
  temp_min_c: number;
  temp_max_c: number;
  humidity_min_pct: number;
  humidity_max_pct: number;
  precipitation_mm: number;
  weather_code: number;
}

type AlertSeverity = "info" | "warning" | "critical";
type AlertKind =
  | "humidity_high"
  | "humidity_low"
  | "temp_high"
  | "temp_low"
  | "dewpoint_approach";

interface EnvironmentalAlert {
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** One-line "why this matters" — pulled from AWRI/OIV framing. */
  why: string;
  /** One-line recommended action. */
  action: string;
  /** Numerical reading that triggered the alert (for auditability). */
  triggered_value: number;
  triggered_at_iso: string;
}

// ── WMO weather-code → plain-English label (Open-Meteo standard set) ────
function labelForWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing rain";
  if (code >= 71 && code <= 75) return "Snow";
  if (code >= 77 && code <= 77) return "Snow grains";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
}

// ── Alert derivation ────────────────────────────────────────────────────
function deriveAlerts(
  current: CurrentConditions,
  hourly: HourlyForecastPoint[],
  thresholds: typeof DEFAULT_THRESHOLDS,
): EnvironmentalAlert[] {
  const alerts: EnvironmentalAlert[] = [];
  const now = current.observed_at_iso;

  // 1. Humidity high — condensation + label + mould risk
  if (current.humidity_pct > thresholds.humidity_high_pct) {
    const critical = current.humidity_pct > thresholds.humidity_high_pct + 10;
    alerts.push({
      kind: "humidity_high",
      severity: critical ? "critical" : "warning",
      title: critical
        ? `Critical humidity · ${current.humidity_pct.toFixed(0)}%`
        : `Humidity high · ${current.humidity_pct.toFixed(0)}%`,
      detail: `Ambient RH is ${current.humidity_pct.toFixed(0)}% (threshold ${thresholds.humidity_high_pct}%). Forecast trend included below.`,
      why:
        "Above ~80% RH, mould can develop on labels/corks and condensation forms on cool tank walls. AWRI TR227 recommends 70-75% as the ideal cellar band.",
      action:
        "Increase ventilation (open cellar door in cool hours) or run a dehumidifier. Wipe down cool surfaces if condensation is already visible.",
      triggered_value: current.humidity_pct,
      triggered_at_iso: now,
    });
  }

  // 2. Humidity low — cork drying + evaporation risk
  if (current.humidity_pct < thresholds.humidity_low_pct) {
    alerts.push({
      kind: "humidity_low",
      severity: current.humidity_pct < 45 ? "critical" : "warning",
      title: `Humidity low · ${current.humidity_pct.toFixed(0)}%`,
      detail: `Ambient RH is ${current.humidity_pct.toFixed(0)}% (threshold ${thresholds.humidity_low_pct}%).`,
      why:
        "Below 55% RH corks can dry and shrink, letting oxygen ingress accelerate. Also elevates evaporation ('angel's share') from barrels.",
      action:
        "Introduce moisture (damp floor, humidifier) or seal the space. Bottled wine on side reduces cork exposure to dry air.",
      triggered_value: current.humidity_pct,
      triggered_at_iso: now,
    });
  }

  // 3. Temperature high — oxidation kinetics
  if (current.temperature_c > thresholds.temp_high_c) {
    const critical = current.temperature_c > thresholds.temp_high_c + 4;
    alerts.push({
      kind: "temp_high",
      severity: critical ? "critical" : "warning",
      title: critical
        ? `Critical temp · ${current.temperature_c.toFixed(1)}°C`
        : `Temp high · ${current.temperature_c.toFixed(1)}°C`,
      detail: `Ambient is ${current.temperature_c.toFixed(1)}°C (threshold ${thresholds.temp_high_c}°C).`,
      why:
        "Bottled/cellared wine oxidation roughly doubles every 8°C. Sustained >20°C ambient shortens shelf life and dulls fresh-fruit aromatics.",
      action:
        "Close cellar during hot hours, insulate exposed walls, or move sensitive lots to the coolest zone. Consider running cellar A/C during heat waves.",
      triggered_value: current.temperature_c,
      triggered_at_iso: now,
    });
  }

  // 4. Temperature low — tartrate precipitation
  if (current.temperature_c < thresholds.temp_low_c) {
    alerts.push({
      kind: "temp_low",
      severity: current.temperature_c < 4 ? "critical" : "warning",
      title: `Temp low · ${current.temperature_c.toFixed(1)}°C`,
      detail: `Ambient is ${current.temperature_c.toFixed(1)}°C (threshold ${thresholds.temp_low_c}°C).`,
      why:
        "Sub-10°C ambient can precipitate potassium bitartrate ('wine diamonds') in bottled wines — visually alarming to end-consumers even though harmless.",
      action:
        "Cold-stabilise pre-bottling if this exposure is chronic. Otherwise buffer the cellar with insulation or gentle heat overnight.",
      triggered_value: current.temperature_c,
      triggered_at_iso: now,
    });
  }

  // 5. Dew-point approach — condensation on cool cellar surfaces.
  // Warn when the ambient dew point is within N°C of the assumed
  // cellar temp. At Δ ≤ 0 the surface is wet.
  const dpMargin = thresholds.assumed_cellar_temp_c - current.dew_point_c;
  if (dpMargin < thresholds.dewpoint_approach_margin_c) {
    const critical = dpMargin <= 0;
    alerts.push({
      kind: "dewpoint_approach",
      severity: critical ? "critical" : "warning",
      title: critical
        ? `Condensation forming · DP ${current.dew_point_c.toFixed(1)}°C ≥ cellar ${thresholds.assumed_cellar_temp_c}°C`
        : `Dew point close · DP ${current.dew_point_c.toFixed(1)}°C vs cellar ${thresholds.assumed_cellar_temp_c}°C`,
      detail: `Margin to cellar temp: ${dpMargin.toFixed(1)}°C (warning if <${thresholds.dewpoint_approach_margin_c}°C, critical when 0 or below).`,
      why:
        "When ambient dew point meets a cool surface (tank wall, barrel head, glass), water condenses — feeds mould, damages labels, and creates biofilm risk.",
      action:
        "Close cellar to hot humid outside air. Wipe cool surfaces dry. Consider a small dehumidifier during the humid window.",
      triggered_value: current.dew_point_c,
      triggered_at_iso: now,
    });
  }

  // 6. Forecast-side pre-warnings — look 48h ahead for a spike we don't
  //    yet see now. Keep it lightweight: only flag the earliest breach.
  const now_ts = Date.now();
  const horizon_ts = now_ts + 48 * 3600 * 1000;
  const nextBreach = hourly.find(
    (h) =>
      new Date(h.time_iso).getTime() > now_ts &&
      new Date(h.time_iso).getTime() < horizon_ts &&
      (h.humidity_pct > thresholds.humidity_high_pct + 5 ||
        h.temperature_c > thresholds.temp_high_c + 3),
  );
  if (nextBreach && alerts.length === 0) {
    alerts.push({
      kind:
        nextBreach.humidity_pct > thresholds.humidity_high_pct + 5
          ? "humidity_high"
          : "temp_high",
      severity: "info",
      title: "Incoming — condition spike in the next 48h",
      detail: `Forecast at ${new Date(nextBreach.time_iso).toLocaleString("en-AU", { hour: "2-digit", weekday: "short" })}: ${nextBreach.temperature_c.toFixed(1)}°C · ${nextBreach.humidity_pct.toFixed(0)}% RH · DP ${nextBreach.dew_point_c.toFixed(1)}°C.`,
      why: "Early notice gives you time to close the cellar, seal barrels, or move sensitive lots before the spike hits.",
      action: "Prep the cellar now — ventilation strategy, insulation, dehumidifier standby.",
      triggered_value:
        nextBreach.humidity_pct > thresholds.humidity_high_pct + 5
          ? nextBreach.humidity_pct
          : nextBreach.temperature_c,
      triggered_at_iso: nextBreach.time_iso,
    });
  }

  return alerts;
}

// ── Open-Meteo fetch helper ─────────────────────────────────────────────
async function fetchOpenMeteo(lat: number, lng: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,dew_point_2m,pressure_msl,cloud_cover,wind_speed_10m,weather_code,is_day",
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation",
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,relative_humidity_2m_min,precipitation_sum,weather_code",
  );
  url.searchParams.set("timezone", "Australia/Sydney");
  url.searchParams.set("forecast_days", "7");
  // Explicit hourly window — Open-Meteo returns 168h by default already
  // but making it explicit protects against future default changes.
  url.searchParams.set("forecast_hours", "48");

  const res = await fetch(url.toString(), {
    // Short timeout — this endpoint runs on Dashboard load; a slow call
    // shouldn't block the whole page.
    signal: AbortSignal.timeout(6000),
    headers: { accept: "application/json", "user-agent": "Ownology/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo returned ${res.status}`);
  }
  const raw = (await res.json()) as {
    current: {
      time: string;
      temperature_2m: number;
      relative_humidity_2m: number;
      dew_point_2m: number;
      pressure_msl: number;
      cloud_cover: number;
      wind_speed_10m: number;
      weather_code: number;
      is_day: number;
    };
    hourly: {
      time: string[];
      temperature_2m: number[];
      relative_humidity_2m: number[];
      dew_point_2m: number[];
      precipitation: number[];
    };
    daily: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      relative_humidity_2m_max: number[];
      relative_humidity_2m_min: number[];
      precipitation_sum: number[];
      weather_code: number[];
    };
  };

  const current: CurrentConditions = {
    temperature_c: raw.current.temperature_2m,
    humidity_pct: raw.current.relative_humidity_2m,
    dew_point_c: raw.current.dew_point_2m,
    pressure_hpa: raw.current.pressure_msl,
    cloud_cover_pct: raw.current.cloud_cover,
    wind_speed_kmh: raw.current.wind_speed_10m,
    weather_code: raw.current.weather_code,
    condition_label: labelForWeatherCode(raw.current.weather_code),
    is_day: raw.current.is_day === 1,
    observed_at_iso: raw.current.time,
  };
  const hourly: HourlyForecastPoint[] = raw.hourly.time.map((t, i) => ({
    time_iso: t,
    temperature_c: raw.hourly.temperature_2m[i],
    humidity_pct: raw.hourly.relative_humidity_2m[i],
    dew_point_c: raw.hourly.dew_point_2m[i],
    precipitation_mm: raw.hourly.precipitation[i],
  }));
  const daily: DailyForecastPoint[] = raw.daily.time.map((d, i) => ({
    date_iso: d,
    temp_min_c: raw.daily.temperature_2m_min[i],
    temp_max_c: raw.daily.temperature_2m_max[i],
    humidity_min_pct: raw.daily.relative_humidity_2m_min[i],
    humidity_max_pct: raw.daily.relative_humidity_2m_max[i],
    precipitation_mm: raw.daily.precipitation_sum[i],
    weather_code: raw.daily.weather_code[i],
  }));

  return { current, hourly, daily };
}

// ── Router ──────────────────────────────────────────────────────────────
export const weatherRouter = router({
  /**
   * Get current + 7-day forecast + derived environmental alerts for a
   * given location. In v1 the caller may omit lat/lng and the default
   * Ownology Cellars (Hunter Valley) location is used. Public procedure
   * — no auth needed; anyone browsing /dashboard on the sandbox sees the
   * same widget content.
   */
  currentAndForecast: publicProcedure
    .input(
      z
        .object({
          lat: z.number().min(-90).max(90).optional(),
          lng: z.number().min(-180).max(180).optional(),
          locationLabel: z.string().max(120).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const lat = input?.lat ?? DEFAULT_LAT;
      const lng = input?.lng ?? DEFAULT_LNG;
      const label = input?.locationLabel ?? DEFAULT_LABEL;

      const { current, hourly, daily } = await fetchOpenMeteo(lat, lng);
      const alerts = deriveAlerts(current, hourly, DEFAULT_THRESHOLDS);

      return {
        location: {
          label,
          lat,
          lng,
          timezone: "Australia/Sydney",
        },
        thresholds: DEFAULT_THRESHOLDS,
        current,
        hourly: hourly.slice(0, 48),
        daily,
        alerts,
        source: {
          provider: "Open-Meteo",
          license: "CC-BY-4.0",
          url: "https://open-meteo.com/",
        },
      };
    }),
});
