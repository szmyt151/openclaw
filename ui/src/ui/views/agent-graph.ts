import { html } from "lit";
import type { AgentsListResult } from "../types.ts";

type Props = {
  loading: boolean;
  error: string | null;
  agentsList: AgentsListResult | null;
  onRefresh: () => void;
};

function labelFor(agent: { id: string; name?: string; identity?: { name?: string } }) {
  return agent.name?.trim() || agent.identity?.name?.trim() || agent.id;
}

export function renderAgentGraph({ loading, error, agentsList, onRefresh }: Props) {
  const agents = agentsList?.agents ?? [];
  const edges = agents.flatMap((agent) => {
    const allowed = agent.subagents?.allowAgents ?? [];
    return allowed.map((child) => ({ from: agent.id, to: child }));
  });

  return html`
    <section class="panel">
      <div class="panel-header">
        <h3>Agent Graph</h3>
        <button class="btn" @click=${onRefresh} ?disabled=${loading}>${loading ? "Refreshing…" : "Refresh"}</button>
      </div>
      ${error ? html`<div class="error">${error}</div>` : ""}

      <div class="panel-body">
        <p class="muted">Nodes = agenci. Krawędzie = kto może odpalać którego subagenta.</p>
        <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
          ${agents.map((agent) => {
            const children = agent.subagents?.allowAgents ?? [];
            return html`
              <div class="card" style="border:1px solid var(--border-color);border-radius:10px;padding:12px;">
                <div style="font-weight:600;">${labelFor(agent)}</div>
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
          <h4 style="margin:0 0 8px 0;">Krawędzie</h4>
          ${edges.length
            ? html`<ul style="margin:0 0 0 16px;">${edges.map((e) => html`<li class="mono">${e.from} → ${e.to}</li>`)}</ul>`
            : html`<div style="opacity:.7;">Brak relacji subagentów.</div>`}
        </div>
      </div>
    </section>
  `;
}
