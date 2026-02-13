import type { IncidentEntry } from "../types.ts";

type State = {
  client: { request: (method: string, params: unknown) => Promise<unknown> } | null;
  connected: boolean;
  incidentsLoading: boolean;
  incidentsError: string | null;
  incidentsEntries: IncidentEntry[];
  incidentsTimeFilter: "1h" | "6h" | "24h";
};

export function parseIncidentsFromLogs(
  logLines: Array<{ ts: number; level: string; message: string; [key: string]: unknown }>
): IncidentEntry[] {
  const incidents: IncidentEntry[] = [];

  for (const log of logLines) {
    const message = log.message?.toLowerCase() ?? "";
    let incident: IncidentEntry | null = null;

    // Disconnect patterns
    if (
      message.includes("disconnect") ||
      message.includes("connection closed") ||
      message.includes("connection lost")
    ) {
      incident = {
        ts: log.ts,
        severity: log.level === "error" || log.level === "fatal" ? "error" : "warn",
        type: "disconnect",
        message: log.message ?? "Disconnected",
      };
    }
    // Connect patterns
    else if (message.includes("connect") && !message.includes("disconnect")) {
      incident = {
        ts: log.ts,
        severity: "info",
        type: "connect",
        message: log.message ?? "Connected",
      };
    }
    // Restart patterns
    else if (message.includes("restart") || message.includes("restarting")) {
      incident = {
        ts: log.ts,
        severity: "warn",
        type: "restart",
        message: log.message ?? "Restarted",
      };
    }
    // Login fail patterns
    else if (
      message.includes("login failed") ||
      message.includes("authentication failed") ||
      message.includes("auth failed")
    ) {
      incident = {
        ts: log.ts,
        severity: "error",
        type: "login-fail",
        message: log.message ?? "Login failed",
      };
    }
    // Generic error patterns
    else if (log.level === "error" || log.level === "fatal") {
      incident = {
        ts: log.ts,
        severity: "error",
        type: "error",
        message: log.message ?? "Error",
      };
    }

    // Try to extract channel from log metadata
    if (incident && log.channel && typeof log.channel === "string") {
      incident.channel = log.channel;
    }

    if (incident) {
      incidents.push(incident);
    }
  }

  return incidents.toSorted((a, b) => b.ts - a.ts);
}

export async function loadIncidents(state: State) {
  if (!state.client || !state.connected || state.incidentsLoading) {
    return;
  }

  state.incidentsLoading = true;
  state.incidentsError = null;

  try {
    const now = Date.now();
    const timeFilterMs: Record<"1h" | "6h" | "24h", number> = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    };
    const cutoffMs = now - timeFilterMs[state.incidentsTimeFilter];

    const res = (await state.client.request("logs.tail", {
      limit: 1000,
      maxBytes: 500_000,
    })) as { lines?: Array<{ ts: number; level: string; message: string; [key: string]: unknown }> };

    const lines = res?.lines ?? [];
    const recentLines = lines.filter((line) => line.ts >= cutoffMs);
    state.incidentsEntries = parseIncidentsFromLogs(recentLines);
  } catch (err) {
    state.incidentsError = String(err);
    state.incidentsEntries = [];
  } finally {
    state.incidentsLoading = false;
  }
}
