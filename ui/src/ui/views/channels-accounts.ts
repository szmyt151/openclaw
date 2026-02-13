import { html } from "lit";
import type { ChannelsStatusSnapshot } from "../types.ts";
import { formatRelativeTimestamp } from "../format.ts";

type Props = {
  snapshot: ChannelsStatusSnapshot | null;
  expanded: boolean;
  onToggle: () => void;
};

function getStateBadge(account: {
  enabled?: boolean | null;
  configured?: boolean | null;
  linked?: boolean | null;
  running?: boolean | null;
  connected?: boolean | null;
}) {
  if (!account.enabled) {
    return { text: "DISABLED", class: "chip", color: "#999" };
  }
  if (!account.configured) {
    return { text: "NOT CONFIGURED", class: "chip chip-warn", color: "#9a5d00" };
  }
  if (!account.linked) {
    return { text: "NOT LINKED", class: "chip chip-warn", color: "#9a5d00" };
  }
  if (account.connected) {
    return { text: "CONNECTED", class: "chip chip-ok", color: "#0a7f3f" };
  }
  if (account.running) {
    return { text: "RUNNING", class: "chip", color: "#0066cc" };
  }
  return { text: "STOPPED", class: "chip chip-danger", color: "#8a1c1c" };
}

export function renderChannelsAccounts({ snapshot, expanded, onToggle }: Props) {
  const channelAccounts = snapshot?.channelAccounts ?? {};
  const channelLabels = snapshot?.channelLabels ?? {};

  // Flatten all accounts across all channels
  const allAccounts: Array<{
    channel: string;
    channelLabel: string;
    accountId: string;
    name?: string | null;
    enabled?: boolean | null;
    configured?: boolean | null;
    linked?: boolean | null;
    running?: boolean | null;
    connected?: boolean | null;
    lastInboundAt?: number | null;
    lastOutboundAt?: number | null;
  }> = [];

  for (const [channelId, accounts] of Object.entries(channelAccounts)) {
    const channelLabel = channelLabels[channelId] ?? channelId;
    for (const account of accounts) {
      allAccounts.push({
        channel: channelId,
        channelLabel,
        ...account,
      });
    }
  }

  // Sort by channel, then by account ID
  allAccounts.sort((a, b) => {
    if (a.channel !== b.channel) {
      return a.channel.localeCompare(b.channel);
    }
    return a.accountId.localeCompare(b.accountId);
  });

  return html`
    <section class="card" style="margin-top: 18px;">
      <div class="row" style="justify-content: space-between; cursor: pointer;" @click=${onToggle}>
        <div>
          <div class="card-title">Accounts Status</div>
          <div class="card-sub">Per-account health table across all channels (${allAccounts.length} accounts).</div>
        </div>
        <button class="btn" @click=${(e: Event) => { e.stopPropagation(); onToggle(); }}>
          ${expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      ${expanded && allAccounts.length > 0 ? html`
        <div style="margin-top: 16px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color);">
                <th style="text-align: left; padding: 8px; font-weight: 600;">Channel</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Account ID</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Name</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Enabled</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">State</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Last Inbound</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Last Outbound</th>
              </tr>
            </thead>
            <tbody>
              ${allAccounts.map((account, index) => {
                const badge = getStateBadge(account);
                return html`
                  <tr style="border-bottom: 1px solid var(--border-color); ${index % 2 === 0 ? 'background: var(--bg-secondary);' : ''}">
                    <td style="padding: 8px;">${account.channelLabel}</td>
                    <td style="padding: 8px; font-family: monospace; font-size: 11px;">${account.accountId}</td>
                    <td style="padding: 8px;">${account.name ?? "-"}</td>
                    <td style="padding: 8px;">
                      ${account.enabled ? html`<span style="color: #0a7f3f;">✓</span>` : html`<span style="color: #8a1c1c;">✗</span>`}
                    </td>
                    <td style="padding: 8px;">
                      <span style="font-size: 10px; padding: 3px 8px; border-radius: 999px; background: ${badge.color}15; color: ${badge.color}; font-weight: 600; border: 1px solid ${badge.color}40;">
                        ${badge.text}
                      </span>
                    </td>
                    <td style="padding: 8px; opacity: 0.8; font-size: 11px;">
                      ${account.lastInboundAt ? formatRelativeTimestamp(account.lastInboundAt) : "never"}
                    </td>
                    <td style="padding: 8px; opacity: 0.8; font-size: 11px;">
                      ${account.lastOutboundAt ? formatRelativeTimestamp(account.lastOutboundAt) : "never"}
                    </td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>
      ` : ""}

      ${expanded && allAccounts.length === 0 ? html`
        <div style="margin-top: 16px; text-align: center; opacity: 0.7; padding: 24px;">
          No channel accounts configured.
        </div>
      ` : ""}
    </section>
  `;
}
