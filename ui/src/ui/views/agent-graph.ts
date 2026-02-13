import { html } from "lit";
import type { AgentsListResult } from "../types.ts";

type Props = {
  loading: boolean;
  error: string | null;
  agentsList: AgentsListResult | null;
  onRefresh: () => void;
  search: string;
  filter: "all" | "hostel" | "locked";
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: "all" | "hostel" | "locked") => void;
};

function labelFor(agent: { id: string; name?: string; identity?: { name?: string } }) {
  return agent.name?.trim() || agent.identity?.name?.trim() || agent.id;
}

function securityLabel(agent: Record<string, unknown>) {
  const sandbox = (agent.sandbox ?? {}) as { mode?: string; workspaceAccess?: string };
  const tools = (agent.tools ?? {}) as { deny?: string[] };
  const denyCount = Array.isArray(tools.deny) ? tools.deny.length : 0;
  const locked = sandbox.mode === "all" && sandbox.workspaceAccess === "none";
  if (locked) {
    return { text: `LOCKED · deny ${denyCount}`, color: "#0a7f3f", bg: "#e9f9ef" };
  }
  if (sandbox.mode === "all") {
    return { text: `SANDBOX · deny ${denyCount}`, color: "#9a5d00", bg: "#fff4e5" };
  }
  return { text: `OPEN · deny ${denyCount}`, color: "#8a1c1c", bg: "#ffeaea" };
}

export function renderAgentGraph({ loading, error, agentsList, onRefresh, search, filter, onSearchChange, onFilterChange }: Props) {
  const allAgents = agentsList?.agents ?? [];

  // Apply filters
  let agents = allAgents;

  // Filter by search
  if (search.trim()) {
    const searchLower = search.toLowerCase();
    agents = agents.filter((a) =>
      a.id.toLowerCase().includes(searchLower) ||
      (a.name?.toLowerCase() ?? "").includes(searchLower) ||
      (a.identity?.name?.toLowerCase() ?? "").includes(searchLower)
    );
  }

  // Filter by type
  if (filter === "hostel") {
    agents = agents.filter((a) =>
      a.id === "hostel-ops-manager" ||
      a.id.startsWith("hostel-") ||
      a.id === "email-clerk" ||
      a.id === "building-dispatch" ||
      a.id === "tenant-support" ||
      a.id === "staff-coordinator" ||
      a.id === "reporting-analyst"
    );
  } else if (filter === "locked") {
    agents = agents.filter((a) => {
      const sandbox = (a.sandbox ?? {}) as { mode?: string; workspaceAccess?: string };
      return sandbox.mode === "all" && sandbox.workspaceAccess === "none";
    });
  }

  const edges = agents.flatMap((agent) => {
    const allowed = agent.subagents?.allowAgents ?? [];
    return allowed.map((child) => ({ from: agent.id, to: child }));
  });
  const hostelAgents = allAgents.filter((a) => a.id === "hostel-ops-manager" || a.id.startsWith("hostel-") || a.id === "email-clerk" || a.id === "building-dispatch" || a.id === "tenant-support" || a.id === "staff-coordinator" || a.id === "reporting-analyst");

  return html`
    <section class="panel">
      <div class="panel-header">
        <h3>Agent Graph</h3>
        <button class="btn" @click=${onRefresh} ?disabled=${loading}>${loading ? "Refreshing…" : "Refresh"}</button>
      </div>
      ${error ? html`<div class="error">${error}</div>` : ""}

      <div class="panel-body">
        <p class="muted">Nodes = agenci. Krawędzie = kto może odpalać którego subagenta.</p>

        <!-- Search bar -->
        <div style="margin:12px 0;">
          <input
            type="text"
            placeholder="Search agents by ID or name..."
            .value=${search}
            @input=${(e: Event) => onSearchChange((e.target as HTMLInputElement).value)}
            style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-color);color:var(--text-color);"
          />
        </div>

        <!-- Filter chips -->
        <div style="display:flex;gap:8px;margin:12px 0;">
          <button
            class="chip ${filter === "all" ? "chip-primary" : ""}"
            @click=${() => onFilterChange("all")}
            style="cursor:pointer;border:1px solid var(--border-color);padding:6px 12px;border-radius:999px;background:${filter === "all" ? "var(--accent-color)" : "transparent"};color:${filter === "all" ? "white" : "var(--text-color)"};"
          >
            All (${allAgents.length})
          </button>
          <button
            class="chip ${filter === "hostel" ? "chip-primary" : ""}"
            @click=${() => onFilterChange("hostel")}
            style="cursor:pointer;border:1px solid var(--border-color);padding:6px 12px;border-radius:999px;background:${filter === "hostel" ? "var(--accent-color)" : "transparent"};color:${filter === "hostel" ? "white" : "var(--text-color)"};"
          >
            Hostel scope (${hostelAgents.length})
          </button>
          <button
            class="chip ${filter === "locked" ? "chip-primary" : ""}"
            @click=${() => onFilterChange("locked")}
            style="cursor:pointer;border:1px solid var(--border-color);padding:6px 12px;border-radius:999px;background:${filter === "locked" ? "var(--accent-color)" : "transparent"};color:${filter === "locked" ? "white" : "var(--text-color)"};"
          >
            Locked only
          </button>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px 0;">
          <span class="mono" style="font-size:12px;padding:4px 8px;border:1px solid var(--border-color);border-radius:8px;">showing: ${agents.length}</span>
          <span class="mono" style="font-size:12px;padding:4px 8px;border:1px solid var(--border-color);border-radius:8px;">edges: ${edges.length}</span>
        </div>
        <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
          ${agents.map((agent) => {
            const children = agent.subagents?.allowAgents ?? [];
            const sec = securityLabel(agent as unknown as Record<string, unknown>);
            return html`
              <div class="card" style="border:1px solid var(--border-color);border-radius:10px;padding:12px;">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                  <div style="font-weight:600;">${labelFor(agent)}</div>
                  <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:${sec.bg};color:${sec.color};font-weight:600;">
                    ${sec.text}
                  </span>
                </div>
                <div class="mono" style="font-size:12px;opacity:.8;">${agent.id}</div>
                <div style="margin-top:8px;font-size:12px;opacity:.85;">Subagenci:</div>
                ${children.length
                  ? html`<ul style="margin:6px 0 0 16px;">${children.map((c) => html`<li class="mono">${c}</li>`)}</ul>`
                  : html`<div style="opacity:.65;font-size:12px;">brak</div>`}
              </div>
            `;
          })}
        </div>

        <div style="margin-top:14px;">
          <h4 style="margin:0 0 8px 0;">Hostel scope</h4>
          ${hostelAgents.length
            ? html`<ul style="margin:0 0 0 16px;">${hostelAgents.map((a) => html`<li class="mono">${a.id}</li>`)}</ul>`
            : html`<div style="opacity:.7;">Brak agentów hostelowych.</div>`}
        </div>

        <div style="margin-top:14px;">
          <h4 style="margin:0 0 8px 0;">Krawędzie</h4>
          ${edges.length
            ? html`<ul style="margin:0 0 0 16px;">${edges.map((e) => html`<li class="mono">${e.from} → ${e.to}</li>`)}</ul>`
            : html`<div style="opacity:.7;">Brak relacji subagentów.</div>`}
        </div>
      </div>
    </section>
  `;
}
