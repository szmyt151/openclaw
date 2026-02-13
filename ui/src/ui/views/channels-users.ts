import { html } from "lit";
import type { HostelUser } from "../types.ts";

type Props = {
  loading: boolean;
  error: string | null;
  users: HostelUser[] | null;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
};

function getRoleBadge(role: "administrator" | "pracownik" | "mieszkaniec") {
  if (role === "administrator") {
    return { text: "Administrator", color: "#0a7f3f", bg: "#e9f9ef" };
  }
  if (role === "pracownik") {
    return { text: "Pracownik", color: "#9a5d00", bg: "#fff4e5" };
  }
  return { text: "Mieszkaniec", color: "#666", bg: "#f5f5f5" };
}

export function renderChannelsUsers({ loading, error, users, expanded, onToggle, onRefresh }: Props) {
  const userCount = users?.length ?? 0;

  return html`
    <section class="card" style="margin-top: 18px;">
      <div class="row" style="justify-content: space-between; cursor: pointer;" @click=${onToggle}>
        <div>
          <div class="card-title">Hostel Role Users</div>
          <div class="card-sub">User roles from USERS.md (${userCount} users).</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${expanded ? html`
            <button class="btn" @click=${(e: Event) => { e.stopPropagation(); onRefresh(); }} ?disabled=${loading}>
              ${loading ? "Refreshing…" : "Refresh"}
            </button>
          ` : ""}
          <button class="btn" @click=${(e: Event) => { e.stopPropagation(); onToggle(); }}>
            ${expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      ${expanded && error ? html`
        <div class="callout danger" style="margin-top: 12px;">
          ${error}
        </div>
      ` : ""}

      ${expanded && loading && !users ? html`
        <div style="margin-top: 16px; text-align: center; opacity: 0.7; padding: 24px;">
          Loading users...
        </div>
      ` : ""}

      ${expanded && users && users.length > 0 ? html`
        <div style="margin-top: 16px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color);">
                <th style="text-align: left; padding: 8px; font-weight: 600;">User ID</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Role</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Permissions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map((user, index) => {
                const badge = getRoleBadge(user.role);
                return html`
                  <tr style="border-bottom: 1px solid var(--border-color); ${index % 2 === 0 ? 'background: var(--bg-secondary);' : ''}">
                    <td style="padding: 8px; font-family: monospace; font-size: 12px;">${user.userId}</td>
                    <td style="padding: 8px;">
                      <span style="font-size: 11px; padding: 4px 10px; border-radius: 999px; background: ${badge.bg}; color: ${badge.color}; font-weight: 600;">
                        ${badge.text}
                      </span>
                    </td>
                    <td style="padding: 8px; font-size: 11px; opacity: 0.85;">
                      ${user.permissions.length > 0
                        ? html`<span class="mono">${user.permissions.join(", ")}</span>`
                        : html`<span style="opacity: 0.5;">—</span>`
                      }
                    </td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>
      ` : ""}

      ${expanded && users && users.length === 0 ? html`
        <div style="margin-top: 16px; text-align: center; opacity: 0.7; padding: 24px;">
          No users found in USERS.md.
        </div>
      ` : ""}
    </section>
  `;
}
