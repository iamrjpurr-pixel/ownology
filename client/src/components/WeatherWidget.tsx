/**
 * WeatherWidget — Tier 3 (Environmental) risk surface on /dashboard.
 *
 * Renders live ambient conditions + 7-day forecast + threshold-based
 * alerts. Piggy-backs on the same visual idiom as the Cellar Alerts
 * banner so the operator's eye already knows what "amber left border =
 * warning" and "red left border = critical" mean.
 *
 * All data comes from tRPC weather.currentAndForecast (backend proxies
 * Open-Meteo — no auth, no key). Refresh cadence matches Dashboard's
 * other queries (5 min interval + refetchOnFocus).
 */
import { useMemo } from "react";
import { trpc } from "../lib/trpc";
import { Cloud, CloudRain, Sun, CloudSun, CloudFog, CloudLightning, AlertCircle, Droplets, Thermometer, Gauge, Wind } from "lucide-react";

type AlertSeverity = "info" | "warning" | "critical";
interface WeatherAlert {
  kind: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  why: string;
  action: string;
  triggered_value: number;
  triggered_at_iso: string;
}

// ── Weather-code → icon mapping ────────────────────────────────────────
function iconForWeatherCode(code: number, isDay: boolean) {
  if (code === 0) return isDay ? Sun : Sun;
  if (code >= 1 && code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 86) return CloudRain;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

// ── Colour palette for alert severity ──────────────────────────────────
function alertColour(sev: AlertSeverity): string {
  if (sev === "critical") return "oklch(0.62 0.20 25)";  // red
  if (sev === "warning") return "oklch(0.70 0.16 65)";   // amber
  return "oklch(0.68 0.08 240)";                          // blue-grey (info)
}

export function WeatherWidget() {
  const { data, isLoading, error } = trpc.weather.currentAndForecast.useQuery(
    undefined,
    {
      // Match dashboard's other queries — 5 min + focus refetch.
      refetchInterval: 300_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  );

  // Build hourly humidity + temp trend for the next 24h (compact strip
  // — keeps the widget dense but readable at a glance).
  const trend = useMemo(() => {
    if (!data?.hourly) return null;
    const next24 = data.hourly.slice(0, 24);
    if (next24.length === 0) return null;
    const humidities = next24.map((h) => h.humidity_pct);
    const temps = next24.map((h) => h.temperature_c);
    return {
      hours: next24,
      hMin: Math.min(...humidities),
      hMax: Math.max(...humidities),
      tMin: Math.min(...temps),
      tMax: Math.max(...temps),
    };
  }, [data]);

  // 48h forecast summary — passed into contextualAdvice so the LLM can
  // reference the shape of the forecast without a second Open-Meteo call.
  const forecastSummary = useMemo(() => {
    if (!data?.hourly) return undefined;
    const next48 = data.hourly.slice(0, 48);
    if (next48.length === 0) return undefined;
    const temps = next48.map((h) => h.temperature_c);
    const hums = next48.map((h) => h.humidity_pct);
    return {
      temp_min_c: Math.min(...temps),
      temp_max_c: Math.max(...temps),
      humidity_min_pct: Math.min(...hums),
      humidity_max_pct: Math.max(...hums),
    };
  }, [data]);

  if (isLoading) {
    return (
      <section
        data-testid="weather-widget-loading"
        style={{
          background: "var(--ow-bg-raised)",
          border: "1px solid var(--ow-border)",
          borderRadius: 6,
          padding: "1.25rem",
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ow-text-lo)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
        }}
      >
        Fetching cellar-environment data…
      </section>
    );
  }

  if (error || !data) {
    return (
      <section
        data-testid="weather-widget-error"
        style={{
          background: "var(--ow-bg-raised)",
          border: "1px solid var(--ow-border)",
          borderRadius: 6,
          padding: "1.25rem",
          color: "var(--ow-text-mid)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
        }}
      >
        Weather data unavailable right now.{" "}
        <span style={{ color: "var(--ow-text-lo)", fontSize: "0.75rem" }}>
          {error?.message ?? "No response"}
        </span>
      </section>
    );
  }

  const { location, current, alerts, thresholds } = data;
  const daily = data.daily;
  const Icon = iconForWeatherCode(current.weather_code, current.is_day);

  return (
    <section
      data-testid="weather-widget"
      style={{
        background: "var(--ow-bg-raised)",
        border: "1px solid var(--ow-border)",
        borderRadius: 6,
        padding: "1.25rem 1.35rem",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--ow-border)",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              fontWeight: 700,
              margin: 0,
              marginBottom: "0.25rem",
            }}
          >
            Cellar Environment · Tier 3 Risk
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.15rem",
              color: "var(--ow-text-hi)",
              margin: 0,
            }}
          >
            {location.label}
          </h2>
          <p style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)", margin: 0, marginTop: "0.2rem", fontFamily: "'JetBrains Mono', monospace" }}>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · {location.timezone}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Icon className="w-7 h-7" style={{ color: "var(--ow-amber)" }} />
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ow-text-hi)", margin: 0, fontFamily: "'Fraunces', serif" }}>
              {current.temperature_c.toFixed(1)}°C
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--ow-text-mid)", margin: 0 }}>
              {current.condition_label}
            </p>
          </div>
        </div>
      </header>

      {/* ── Reading grid ── */}
      <div
        data-testid="weather-current-readings"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.15rem",
        }}
      >
        <Reading
          icon={Droplets}
          label="Humidity"
          value={`${current.humidity_pct.toFixed(0)}%`}
          triggered={current.humidity_pct > thresholds.humidity_high_pct || current.humidity_pct < thresholds.humidity_low_pct}
          hint={`${thresholds.humidity_low_pct}-${thresholds.humidity_high_pct}% ideal`}
          testId="weather-humidity"
        />
        <Reading
          icon={Thermometer}
          label="Dew point"
          value={`${current.dew_point_c.toFixed(1)}°C`}
          triggered={thresholds.assumed_cellar_temp_c - current.dew_point_c < thresholds.dewpoint_approach_margin_c}
          hint={`cellar ≈${thresholds.assumed_cellar_temp_c}°C`}
          testId="weather-dewpoint"
        />
        <Reading
          icon={Gauge}
          label="Pressure"
          value={`${current.pressure_hpa.toFixed(0)} hPa`}
          hint={current.pressure_hpa > 1020 ? "high" : current.pressure_hpa < 1005 ? "low" : "normal"}
          testId="weather-pressure"
        />
        <Reading
          icon={Cloud}
          label="Cloud"
          value={`${current.cloud_cover_pct.toFixed(0)}%`}
          testId="weather-cloud"
        />
        <Reading
          icon={Wind}
          label="Wind"
          value={`${current.wind_speed_kmh.toFixed(0)} km/h`}
          testId="weather-wind"
        />
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div data-testid="weather-alerts" style={{ marginBottom: "1.15rem" }}>
          <p
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-text-lo)",
              fontWeight: 700,
              margin: 0,
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <AlertCircle className="w-3.5 h-3.5" style={{ color: "var(--ow-amber)" }} />
            Environmental alerts · {alerts.length}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(alerts as WeatherAlert[]).map((a, i) => (
              <AlertCard
                key={`${a.kind}-${i}`}
                alert={a}
                currentReading={{
                  temperature_c: current.temperature_c,
                  humidity_pct: current.humidity_pct,
                  dew_point_c: current.dew_point_c,
                }}
                forecastSummary={forecastSummary}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 7-day forecast strip ── */}
      <div data-testid="weather-forecast-7d">
        <p
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ow-text-lo)",
            fontWeight: 700,
            margin: 0,
            marginBottom: "0.55rem",
          }}
        >
          7-day forecast · humidity + temp
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0.4rem",
          }}
        >
          {daily.map((d, i) => {
            const humidityBreach = d.humidity_max_pct > thresholds.humidity_high_pct;
            const tempBreach = d.temp_max_c > thresholds.temp_high_c || d.temp_min_c < thresholds.temp_low_c;
            const anyBreach = humidityBreach || tempBreach;
            const DayIcon = iconForWeatherCode(d.weather_code, true);
            const dayLabel = new Date(d.date_iso).toLocaleDateString("en-AU", { weekday: "short" });
            return (
              <div
                key={d.date_iso}
                data-testid={`weather-day-${i}`}
                style={{
                  background: anyBreach ? "color-mix(in oklch, oklch(0.70 0.16 65) 10%, transparent)" : "color-mix(in oklch, var(--ow-border) 25%, transparent)",
                  border: `1px solid ${anyBreach ? "color-mix(in oklch, oklch(0.70 0.16 65) 40%, transparent)" : "var(--ow-border)"}`,
                  borderRadius: 4,
                  padding: "0.5rem 0.3rem",
                  textAlign: "center",
                  fontSize: "0.7rem",
                }}
              >
                <p style={{ margin: 0, color: "var(--ow-text-lo)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.6rem" }}>
                  {i === 0 ? "TODAY" : dayLabel}
                </p>
                <DayIcon className="w-4 h-4" style={{ margin: "0.35rem auto", color: "var(--ow-text-mid)" }} />
                <p style={{ margin: 0, color: "var(--ow-text-hi)", fontWeight: 700, fontSize: "0.78rem" }}>
                  {d.temp_max_c.toFixed(0)}° / {d.temp_min_c.toFixed(0)}°
                </p>
                <p style={{ margin: "0.15rem 0 0", color: humidityBreach ? "oklch(0.70 0.16 65)" : "var(--ow-text-mid)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem" }}>
                  {d.humidity_min_pct.toFixed(0)}–{d.humidity_max_pct.toFixed(0)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 24h humidity sparkline ── */}
      {trend && (
        <div data-testid="weather-24h-trend" style={{ marginTop: "1rem" }}>
          <p
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-text-lo)",
              fontWeight: 700,
              margin: 0,
              marginBottom: "0.4rem",
            }}
          >
            Next 24h · humidity range {trend.hMin.toFixed(0)}%–{trend.hMax.toFixed(0)}%
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
            {trend.hours.map((h, i) => {
              const rel = trend.hMax === trend.hMin ? 0.5 : (h.humidity_pct - trend.hMin) / (trend.hMax - trend.hMin);
              const height = 6 + rel * 26;
              const breach = h.humidity_pct > thresholds.humidity_high_pct;
              return (
                <div
                  key={i}
                  title={`${new Date(h.time_iso).toLocaleTimeString("en-AU", { hour: "2-digit" })}: ${h.humidity_pct}% RH, ${h.temperature_c}°C`}
                  style={{
                    flex: 1,
                    height,
                    background: breach ? "oklch(0.70 0.16 65)" : "color-mix(in oklch, var(--ow-amber) 40%, transparent)",
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <p
        style={{
          margin: "1rem 0 0",
          fontSize: "0.65rem",
          color: "var(--ow-text-lo)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Source: {data.source.provider} · updated {new Date(current.observed_at_iso).toLocaleString("en-AU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
      </p>
    </section>
  );
}

// ── Sub-component: single reading tile ─────────────────────────────────
interface ReadingProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  triggered?: boolean;
  hint?: string;
  testId: string;
}

function Reading({ icon: I, label, value, triggered, hint, testId }: ReadingProps) {
  const color = triggered ? "oklch(0.70 0.16 65)" : "var(--ow-text-hi)";
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.55rem",
        background: triggered ? "color-mix(in oklch, oklch(0.70 0.16 65) 8%, transparent)" : "transparent",
        border: triggered ? "1px solid color-mix(in oklch, oklch(0.70 0.16 65) 30%, transparent)" : "1px solid var(--ow-border)",
        borderRadius: 4,
        padding: "0.5rem 0.65rem",
      }}
    >
      <I className="w-4 h-4" style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: 0, fontSize: "0.62rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
          {label}
        </p>
        <p style={{ margin: "0.1rem 0 0", fontSize: "0.95rem", color, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
          {value}
        </p>
        {hint && (
          <p style={{ margin: "0.05rem 0 0", fontSize: "0.62rem", color: "var(--ow-text-lo)" }}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}


// ── Sub-component: per-alert card with "Ask AI" LLM lookup ─────────────
interface AlertCardProps {
  alert: WeatherAlert;
  currentReading: {
    temperature_c: number;
    humidity_pct: number;
    dew_point_c: number;
  };
  forecastSummary?: {
    temp_min_c: number;
    temp_max_c: number;
    humidity_min_pct: number;
    humidity_max_pct: number;
  };
}

// Alert kinds that the backend contextualAdvice endpoint accepts.
const AI_ELIGIBLE_KINDS = new Set([
  "humidity_high",
  "humidity_low",
  "temp_high",
  "temp_low",
  "dewpoint_approach",
]);

function AlertCard({ alert: a, currentReading, forecastSummary }: AlertCardProps) {
  const c = alertColour(a.severity);
  const canAskAi = AI_ELIGIBLE_KINDS.has(a.kind);

  const mutation = trpc.weather.contextualAdvice.useMutation();

  const askAi = () => {
    if (!canAskAi) return;
    mutation.mutate({
      alertKind: a.kind as
        | "humidity_high"
        | "humidity_low"
        | "temp_high"
        | "temp_low"
        | "dewpoint_approach",
      currentReading,
      forecastSummary,
    });
  };

  const result = mutation.data;
  const gated = result && "gated" in result && result.gated;
  const advice = result && !gated && "advice" in result ? result.advice : null;
  const error = result && !gated && "error" in result ? result.error : mutation.error?.message;

  return (
    <article
      data-testid={`weather-alert-${a.kind}`}
      style={{
        borderLeft: `3px solid ${c}`,
        background: `color-mix(in oklch, ${c} 10%, transparent)`,
        padding: "0.7rem 0.85rem",
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontWeight: 700, color: "var(--ow-text-hi)", fontSize: "0.88rem" }}>
          {a.title}
        </p>
        <span
          style={{
            fontSize: "0.58rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: c,
            fontWeight: 700,
          }}
        >
          {a.severity}
        </span>
      </div>
      <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>
        <strong style={{ color: "var(--ow-text-hi)" }}>Why:</strong> {a.why}
      </p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: c, fontWeight: 600, lineHeight: 1.5 }}>
        → {a.action}
      </p>

      {/* ── Ask AI button (Founding Member gated) ── */}
      {canAskAi && !advice && !gated && (
        <button
          type="button"
          data-testid={`weather-alert-ask-ai-${a.kind}`}
          onClick={askAi}
          disabled={mutation.isPending}
          style={{
            marginTop: "0.55rem",
            background: mutation.isPending
              ? "transparent"
              : "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
            color: "var(--ow-amber)",
            border: `1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)`,
            padding: "0.35rem 0.75rem",
            borderRadius: 3,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            cursor: mutation.isPending ? "wait" : "pointer",
            fontFamily: "'Lato', sans-serif",
          }}
        >
          {mutation.isPending ? "Asking Ownology…" : "▶ Ask Ownology · advice for my cellar"}
        </button>
      )}

      {/* ── Gated (free-tier) teaser ── */}
      {gated && result && "message" in result && (
        <div
          data-testid={`weather-alert-gated-${a.kind}`}
          style={{
            marginTop: "0.55rem",
            background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
            border: "1px dashed color-mix(in oklch, var(--ow-amber) 40%, transparent)",
            padding: "0.55rem 0.7rem",
            borderRadius: 4,
            fontSize: "0.75rem",
            lineHeight: 1.5,
            color: "var(--ow-text-mid)",
          }}
        >
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--ow-amber)" }}>🔒 Founding Member benefit</strong> — {result.message}
          </p>
          <a
            href="/pricing"
            style={{
              display: "inline-block",
              marginTop: "0.4rem",
              color: "var(--ow-amber)",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            See plans →
          </a>
        </div>
      )}

      {/* ── LLM advice rendered ── */}
      {advice && (
        <div
          data-testid={`weather-alert-ai-advice-${a.kind}`}
          style={{
            marginTop: "0.65rem",
            background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)",
            border: `1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)`,
            padding: "0.65rem 0.8rem",
            borderRadius: 4,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.62rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              fontWeight: 700,
            }}
          >
            Ownology advisor · your cellar
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--ow-text-hi)", lineHeight: 1.55 }}>
            {advice}
          </p>
          {result && "cached" in result && result.cached && (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.62rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
              Cached · same advice for the whole calendar day.
            </p>
          )}
        </div>
      )}

      {error && !gated && (
        <p
          data-testid={`weather-alert-ai-error-${a.kind}`}
          style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "oklch(0.65 0.18 25)" }}
        >
          Advice unavailable: {error}
        </p>
      )}
    </article>
  );
}
