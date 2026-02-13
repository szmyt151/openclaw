import { html } from "lit";
import type { IncidentEntry } from "../types.ts";
import { formatRelativeTimestamp, formatMs } from "../format.ts";

type Props = {
  loading: boolean;
  error: string | null;
  entries: IncidentEntry[];
  timeFilter: "1h" | "6h" | "24h";
  onRefresh: () => void;
  onTimeFilterChange: (filter: "1h" | "6h" | "24h") => void;
};

function getSeverityBadge(severity: "info" | "warn" | "error") {
  if (severity === "error") {
    return { color: "#8a1c1c", bg: "#ffeaea", icon: "⚠" };
  }
  if (severity === "warn") {
    return { color: "#9a5d00", bg: "#fff4e5", icon: "⚠" };
  }
  return { color: "#0a7f3f", bg: "#e9f9ef", icon: "ℹ" };
}

function getTypeIcon(type: "disconnect" | "connect" | "error" | "restart" | "login-fail") {
  switch (type) {
    case "disconnect":
      return "⊗";
    case "connect":
      return "✓";
    case "restart":
      return "⟳";
    case "login-fail":
      return "🔒";
    case "error":
      return "✖";
    default:
      return "•";
  }
}

export function renderIncidents({ loading, error, entries, timeFilter, onRefresh, onTimeFilterChange }: Props) {
  return html`
    <section class="panel">
      <div class="panel-header">
        <h3>Incident Timeline</h3>
        <button class="btn" @click=${onRefresh} ?disabled=${loading}>
          ${loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      ${error ? html`<div class="callout danger" style="margin: 16px;">${error}</div>` : ""}

      <div class="panel-body">
        <p class="muted">System incidents parsed from gateway logs.</p>

        <!-- Time filter chips -->
        <div style="display: flex; gap: 8px; margin: 16px 0;">
          <button
            class="chip ${timeFilter === "1h" ? "chip-primary" : ""}"
            @click=${() => onTimeFilterChange("1h")}
            style="cursor: pointer; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 999px; background: ${timeFilter === "1h" ? "var(--accent-color)" : "transparent"}; color: ${timeFilter === "1h" ? "white" : "var(--text-color)"};"
          >
            Last hour
          </button>
          <button
            class="chip ${timeFilter === "6h" ? "chip-primary" : ""}"
            @click=${() => onTimeFilterChange("6h")}
            style="cursor: pointer; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 999px; background: ${timeFilter === "6h" ? "var(--accent-color)" : "transparent"}; color: ${timeFilter === "6h" ? "white" : "var(--text-color)"};"
          >
            Last 6 hours
          </button>
          <button
            class="chip ${timeFilter === "24h" ? "chip-primary" : ""}"
            @click=${() => onTimeFilterChange("24h")}
            style="cursor: pointer; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 999px; background: ${timeFilter === "24h" ? "var(--accent-color)" : "transparent"}; color: ${timeFilter === "24h" ? "white" : "var(--text-color)"};"
          >
            Last 24 hours
          </button>
        </div>

        <div style="margin: 12px 0; opacity: 0.8; font-size: 13px;">
          Showing ${entries.length} incidents
        </div>

        ${entries.length > 0 ? html`
          <div style="margin-top: 16px;">
            ${entries.map((entry) => {
              const badge = getSeverityBadge(entry.severity);
              const typeIcon = getTypeIcon(entry.type);
              return html`
                <div style="border-left: 3px solid ${badge.color}; padding: 12px; margin-bottom: 12px; background: var(--bg-secondary); border-radius: 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 16px;">${typeIcon}</span>
                        <span style="font-weight: 600; text-transform: capitalize;">${entry.type.replace("-", " ")}</span>
                        ${entry.channel ? html`
                          <span class="mono" style="font-size: 11px; padding: 2px 6px; background: var(--bg-color); border-radius: 4px; opacity: 0.8;">
                            ${entry.channel}
                          </span>
                        ` : ""}
                        <span style="font-size: 10px; padding: 3px 8px; border-radius: 999px; background: ${badge.bg}; color: ${badge.color}; font-weight: 600;">
                          ${entry.severity}
                        </span>
                      </div>
                      <div style="font-size: 13px; opacity: 0.9; margin-bottom: 4px;">
                        ${entry.message}
                      </div>
                      <div style="font-size: 11px; opacity: 0.6;">
                        ${formatRelativeTimestamp(entry.ts)} • ${formatMs(entry.ts)}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            })}
          </div>
        ` : html`
          <div style="text-align: center; opacity: 0.7; padding: 48px 24px;">
            No incidents found in the selected time range.
          </div>
        `}
      </div>
    </section>
  `;
}
