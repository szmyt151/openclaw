import { html } from "lit";
import type { DevicePairingList } from "../controllers/devices.ts";
import { formatRelativeTimestamp } from "../format.ts";

type Props = {
  loading: boolean;
  error: string | null;
  devicesList: DevicePairingList | null;
  expanded: boolean;
  searchQuery: string;
  autoRefresh: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onSearchChange: (query: string) => void;
  onAutoRefreshToggle: () => void;
};

export function renderPairingCenter({
  loading,
  error,
  devicesList,
  expanded,
  searchQuery,
  autoRefresh,
  onToggle,
  onRefresh,
  onApprove,
  onReject,
  onSearchChange,
  onAutoRefreshToggle,
}: Props) {
  const allPending = devicesList?.pending ?? [];
  const allPaired = devicesList?.paired ?? [];

  // Apply search filter
  const searchLower = searchQuery.toLowerCase();
  const pending = searchQuery.trim()
    ? allPending.filter(
        (d) =>
          d.deviceId.toLowerCase().includes(searchLower) ||
          (d.displayName?.toLowerCase() ?? "").includes(searchLower) ||
          (d.role?.toLowerCase() ?? "").includes(searchLower),
      )
    : allPending;
  const paired = searchQuery.trim()
    ? allPaired.filter(
        (d) =>
          d.deviceId.toLowerCase().includes(searchLower) ||
          (d.displayName?.toLowerCase() ?? "").includes(searchLower) ||
          (d.roles?.some((r) => r.toLowerCase().includes(searchLower)) ?? false),
      )
    : allPaired;

  return html`
    <section class="card" style="margin-top: 18px;">
      <div class="row" style="justify-content: space-between; cursor: pointer;" @click=${onToggle}>
        <div>
          <div class="card-title">Pairing Center</div>
          <div class="card-sub">
            Device pairing requests (${pending.length} pending, ${paired.length} paired).
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${
            expanded
              ? html`
                <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
                  <input type="checkbox" .checked=${autoRefresh} @change=${(e: Event) => {
                    e.stopPropagation();
                    onAutoRefreshToggle();
                  }} />
                  Auto-refresh (10s)
                </label>
                <button
                  class="btn"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  ?disabled=${loading}
                >
                  ${loading ? "Refreshing…" : "Refresh"}
                </button>
              `
              : ""
          }
          <button
            class="btn"
            @click=${(e: Event) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            ${expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      ${
        expanded
          ? html`
        <!-- Search bar -->
        <div style="margin: 16px 0;">
          <input
            type="text"
            placeholder="Search by device ID, name, or role..."
            .value=${searchQuery}
            @input=${(e: Event) => onSearchChange((e.target as HTMLInputElement).value)}
            style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-color); color: var(--text-color);"
          />
        </div>
      `
          : ""
      }

      ${
        expanded && error
          ? html`
            <div class="callout danger" style="margin-top: 12px;">${error}</div>
          `
          : ""
      }

      ${
        expanded && loading && !devicesList
          ? html`
              <div style="margin-top: 16px; text-align: center; opacity: 0.7; padding: 24px">
                Loading devices...
              </div>
            `
          : ""
      }

      ${
        expanded && pending.length > 0
          ? html`
            <div style="margin-top: 16px;">
              <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                Pending Requests (${pending.length})
              </h4>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Device ID</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Display Name</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Role</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Remote IP</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Requested</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pending.map((device, index) => {
                      return html`
                        <tr
                          style="border-bottom: 1px solid var(--border-color); ${
                            index % 2 === 0 ? "background: var(--bg-secondary);" : ""
                          }"
                        >
                          <td style="padding: 8px; font-family: monospace; font-size: 11px;">
                            ${device.deviceId}
                          </td>
                          <td style="padding: 8px;">${device.displayName ?? "-"}</td>
                          <td style="padding: 8px;">
                            <span
                              class="mono"
                              style="font-size: 11px; padding: 3px 8px; border-radius: 999px; background: #0066cc15; color: #0066cc; border: 1px solid #0066cc40;"
                            >
                              ${device.role ?? "unknown"}
                            </span>
                          </td>
                          <td style="padding: 8px; font-family: monospace; font-size: 11px;">
                            ${device.remoteIp ?? "-"}
                          </td>
                          <td style="padding: 8px; opacity: 0.8; font-size: 11px;">
                            ${device.ts ? formatRelativeTimestamp(device.ts) : "-"}
                          </td>
                          <td style="padding: 8px;">
                            <div style="display: flex; gap: 6px;">
                              <button
                                class="btn btn-sm"
                                style="padding: 4px 10px; font-size: 12px; background: #0a7f3f; color: white; border: none; cursor: pointer; border-radius: 6px;"
                                @click=${() => onApprove(device.requestId)}
                              >
                                Approve
                              </button>
                              <button
                                class="btn btn-sm"
                                style="padding: 4px 10px; font-size: 12px; background: #8a1c1c; color: white; border: none; cursor: pointer; border-radius: 6px;"
                                @click=${() => onReject(device.requestId)}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          `
          : ""
      }

      ${
        expanded && pending.length === 0
          ? html`
              <div style="margin-top: 16px; text-align: center; opacity: 0.7; padding: 24px">
                No pending pairing requests.
              </div>
            `
          : ""
      }

      ${
        expanded && paired.length > 0
          ? html`
            <div style="margin-top: 16px;">
              <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                Paired Devices (${paired.length})
              </h4>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Device ID</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Display Name</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Roles</th>
                      <th style="text-align: left; padding: 8px; font-weight: 600;">Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${paired.map((device, index) => {
                      return html`
                        <tr
                          style="border-bottom: 1px solid var(--border-color); ${
                            index % 2 === 0 ? "background: var(--bg-secondary);" : ""
                          }"
                        >
                          <td style="padding: 8px; font-family: monospace; font-size: 11px;">
                            ${device.deviceId}
                          </td>
                          <td style="padding: 8px;">${device.displayName ?? "-"}</td>
                          <td style="padding: 8px; font-size: 11px;">
                            ${
                              device.roles && device.roles.length > 0
                                ? device.roles.join(", ")
                                : "-"
                            }
                          </td>
                          <td style="padding: 8px; opacity: 0.8; font-size: 11px;">
                            ${device.approvedAtMs ? formatRelativeTimestamp(device.approvedAtMs) : "-"}
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          `
          : ""
      }
    </section>
  `;
}
