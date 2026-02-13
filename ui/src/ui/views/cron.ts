import { html, nothing } from "lit";
import type { ChannelUiMetaEntry, CronJob, CronRunLogEntry, CronStatus } from "../types.ts";
import type { CronFormState } from "../ui-types.ts";
import { formatRelativeTimestamp, formatMs } from "../format.ts";
import { pathForTab } from "../navigation.ts";
import { formatCronSchedule, formatNextRun } from "../presenter.ts";

export type CronProps = {
  basePath: string;
  loading: boolean;
  status: CronStatus | null;
  jobs: CronJob[];
  error: string | null;
  busy: boolean;
  form: CronFormState;
  channels: string[];
  channelLabels?: Record<string, string>;
  channelMeta?: ChannelUiMetaEntry[];
  runsJobId: string | null;
  runs: CronRunLogEntry[];
  filterMode: "all" | "enabled" | "failed" | "search";
  searchQuery: string;
  lastRunsExpanded: boolean;
  onFormChange: (patch: Partial<CronFormState>) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onRun: (job: CronJob) => void;
  onRemove: (job: CronJob) => void;
  onLoadRuns: (jobId: string) => void;
  onFilterChange: (mode: "all" | "enabled" | "failed" | "search") => void;
  onSearchChange: (query: string) => void;
  onLastRunsToggle: () => void;
};

function buildChannelOptions(props: CronProps): string[] {
  const options = ["last", ...props.channels.filter(Boolean)];
  const current = props.form.deliveryChannel?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  const seen = new Set<string>();
  return options.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function resolveChannelLabel(props: CronProps, channel: string): string {
  if (channel === "last") {
    return "last";
  }
  const meta = props.channelMeta?.find((entry) => entry.id === channel);
  if (meta?.label) {
    return meta.label;
  }
  return props.channelLabels?.[channel] ?? channel;
}

export function renderCron(props: CronProps) {
  const channelOptions = buildChannelOptions(props);
  const selectedJob =
    props.runsJobId == null ? undefined : props.jobs.find((job) => job.id === props.runsJobId);
  const selectedRunTitle = selectedJob?.name ?? props.runsJobId ?? "(select a job)";
  const orderedRuns = props.runs.toSorted((a, b) => b.ts - a.ts);

  // Apply filters
  let filteredJobs = props.jobs;
  if (props.filterMode === "enabled") {
    filteredJobs = filteredJobs.filter((job) => job.enabled);
  } else if (props.filterMode === "failed") {
    filteredJobs = filteredJobs.filter((job) => job.state?.lastStatus === "error");
  } else if (props.filterMode === "search" && props.searchQuery.trim()) {
    const query = props.searchQuery.toLowerCase();
    filteredJobs = filteredJobs.filter(
      (job) =>
        job.name.toLowerCase().includes(query) ||
        job.id.toLowerCase().includes(query) ||
        (job.agentId?.toLowerCase() ?? "").includes(query)
    );
  }

  // Collect last runs from all jobs
  const allLastRuns = props.jobs
    .filter((job) => job.state?.lastRunAtMs && job.state?.lastStatus)
    .map((job) => ({
      jobId: job.id,
      jobName: job.name,
      status: job.state!.lastStatus!,
      ts: job.state!.lastRunAtMs!,
      durationMs: job.state?.lastDurationMs,
    }))
    .toSorted((a, b) => b.ts - a.ts);

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">Scheduler</div>
        <div class="card-sub">Gateway-owned cron scheduler status.</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">Enabled</div>
            <div class="stat-value">
              ${props.status ? (props.status.enabled ? "Yes" : "No") : "n/a"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Jobs</div>
            <div class="stat-value">${props.status?.jobs ?? "n/a"}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Next wake</div>
            <div class="stat-value">${formatNextRun(props.status?.nextWakeAtMs ?? null)}</div>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Refreshing…" : "Refresh"}
          </button>
          ${props.error ? html`<span class="muted">${props.error}</span>` : nothing}
        </div>
      </div>

      <div class="card">
        <div class="card-title">New Job</div>
        <div class="card-sub">Create a scheduled wakeup or agent run.</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>Name</span>
            <input
              .value=${props.form.name}
              @input=${(e: Event) =>
                props.onFormChange({ name: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="field">
            <span>Description</span>
            <input
              .value=${props.form.description}
              @input=${(e: Event) =>
                props.onFormChange({ description: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="field">
            <span>Agent ID</span>
            <input
              .value=${props.form.agentId}
              @input=${(e: Event) =>
                props.onFormChange({ agentId: (e.target as HTMLInputElement).value })}
              placeholder="default"
            />
          </label>
          <label class="field checkbox">
            <span>Enabled</span>
            <input
              type="checkbox"
              .checked=${props.form.enabled}
              @change=${(e: Event) =>
                props.onFormChange({ enabled: (e.target as HTMLInputElement).checked })}
            />
          </label>
          <label class="field">
            <span>Schedule</span>
            <select
              .value=${props.form.scheduleKind}
              @change=${(e: Event) =>
                props.onFormChange({
                  scheduleKind: (e.target as HTMLSelectElement)
                    .value as CronFormState["scheduleKind"],
                })}
            >
              <option value="every">Every</option>
              <option value="at">At</option>
              <option value="cron">Cron</option>
            </select>
          </label>
        </div>
        ${renderScheduleFields(props)}
        <div class="form-grid" style="margin-top: 12px;">
          <label class="field">
            <span>Session</span>
            <select
              .value=${props.form.sessionTarget}
              @change=${(e: Event) =>
                props.onFormChange({
                  sessionTarget: (e.target as HTMLSelectElement)
                    .value as CronFormState["sessionTarget"],
                })}
            >
              <option value="main">Main</option>
              <option value="isolated">Isolated</option>
            </select>
          </label>
          <label class="field">
            <span>Wake mode</span>
            <select
              .value=${props.form.wakeMode}
              @change=${(e: Event) =>
                props.onFormChange({
                  wakeMode: (e.target as HTMLSelectElement).value as CronFormState["wakeMode"],
                })}
            >
              <option value="now">Now</option>
              <option value="next-heartbeat">Next heartbeat</option>
            </select>
          </label>
          <label class="field">
            <span>Payload</span>
            <select
              .value=${props.form.payloadKind}
              @change=${(e: Event) =>
                props.onFormChange({
                  payloadKind: (e.target as HTMLSelectElement)
                    .value as CronFormState["payloadKind"],
                })}
            >
              <option value="systemEvent">System event</option>
              <option value="agentTurn">Agent turn</option>
            </select>
          </label>
        </div>
        <label class="field" style="margin-top: 12px;">
          <span>${props.form.payloadKind === "systemEvent" ? "System text" : "Agent message"}</span>
          <textarea
            .value=${props.form.payloadText}
            @input=${(e: Event) =>
              props.onFormChange({
                payloadText: (e.target as HTMLTextAreaElement).value,
              })}
            rows="4"
          ></textarea>
        </label>
        ${
          props.form.payloadKind === "agentTurn"
            ? html`
                <div class="form-grid" style="margin-top: 12px;">
                  <label class="field">
                    <span>Delivery</span>
                    <select
                      .value=${props.form.deliveryMode}
                      @change=${(e: Event) =>
                        props.onFormChange({
                          deliveryMode: (e.target as HTMLSelectElement)
                            .value as CronFormState["deliveryMode"],
                        })}
                    >
                      <option value="announce">Announce summary (default)</option>
                      <option value="none">None (internal)</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Timeout (seconds)</span>
                    <input
                      .value=${props.form.timeoutSeconds}
                      @input=${(e: Event) =>
                        props.onFormChange({
                          timeoutSeconds: (e.target as HTMLInputElement).value,
                        })}
                    />
                  </label>
                  ${
                    props.form.deliveryMode === "announce"
                      ? html`
                          <label class="field">
                            <span>Channel</span>
                            <select
                              .value=${props.form.deliveryChannel || "last"}
                              @change=${(e: Event) =>
                                props.onFormChange({
                                  deliveryChannel: (e.target as HTMLSelectElement).value,
                                })}
                            >
                              ${channelOptions.map(
                                (channel) =>
                                  html`<option value=${channel}>
                                    ${resolveChannelLabel(props, channel)}
                                  </option>`,
                              )}
                            </select>
                          </label>
                          <label class="field">
                            <span>To</span>
                            <input
                              .value=${props.form.deliveryTo}
                              @input=${(e: Event) =>
                                props.onFormChange({
                                  deliveryTo: (e.target as HTMLInputElement).value,
                                })}
                              placeholder="+1555… or chat id"
                            />
                          </label>
                        `
                      : nothing
                  }
                </div>
              `
            : nothing
        }
        <div class="row" style="margin-top: 14px;">
          <button class="btn primary" ?disabled=${props.busy} @click=${props.onAdd}>
            ${props.busy ? "Saving…" : "Add job"}
          </button>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">Jobs</div>
      <div class="card-sub">All scheduled jobs stored in the gateway.</div>

      <!-- Filter chips -->
      <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
        <button
          class="chip ${props.filterMode === "all" ? "chip-primary" : ""}"
          @click=${() => props.onFilterChange("all")}
          style="cursor: pointer; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 999px; background: ${props.filterMode === "all" ? "var(--accent-color)" : "transparent"}; color: ${props.filterMode === "all" ? "white" : "var(--text-color)"};"
        >
          All (${props.jobs.length})
        </button>
        <button
          class="chip ${props.filterMode === "enabled" ? "chip-primary" : ""}"
          @click=${() => props.onFilterChange("enabled")}
          style="cursor: pointer; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 999px; background: ${props.filterMode === "enabled" ? "var(--accent-color)" : "transparent"}; color: ${props.filterMode === "enabled" ? "white" : "var(--text-color)"};"
        >
          Enabled only (${props.jobs.filter((j) => j.enabled).length})
        </button>
        <button
          class="chip ${props.filterMode === "failed" ? "chip-primary" : ""}"
          @click=${() => props.onFilterChange("failed")}
          style="cursor: pointer; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 999px; background: ${props.filterMode === "failed" ? "var(--accent-color)" : "transparent"}; color: ${props.filterMode === "failed" ? "white" : "var(--text-color)"};"
        >
          Failed only (${props.jobs.filter((j) => j.state?.lastStatus === "error").length})
        </button>
        <button
          class="chip ${props.filterMode === "search" ? "chip-primary" : ""}"
          @click=${() => props.onFilterChange("search")}
          style="cursor: pointer; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 999px; background: ${props.filterMode === "search" ? "var(--accent-color)" : "transparent"}; color: ${props.filterMode === "search" ? "white" : "var(--text-color)"};"
        >
          Search
        </button>
      </div>

      <!-- Search input (visible when search mode active) -->
      ${props.filterMode === "search" ? html`
        <div style="margin-top: 12px;">
          <input
            type="text"
            placeholder="Search jobs by name, ID, or agent..."
            .value=${props.searchQuery}
            @input=${(e: Event) => props.onSearchChange((e.target as HTMLInputElement).value)}
            style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-color); color: var(--text-color);"
          />
        </div>
      ` : ""}

      ${
        filteredJobs.length === 0
          ? html`
              <div class="muted" style="margin-top: 12px">No jobs found.</div>
            `
          : html`
            <div class="list" style="margin-top: 12px;">
              ${filteredJobs.map((job) => renderJob(job, props))}
            </div>
          `
      }
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="row" style="justify-content: space-between; cursor: pointer;" @click=${props.onLastRunsToggle}>
        <div>
          <div class="card-title">Last Runs Summary</div>
          <div class="card-sub">Most recent run for each job (${allLastRuns.length} runs).</div>
        </div>
        <button class="btn" @click=${(e: Event) => { e.stopPropagation(); props.onLastRunsToggle(); }}>
          ${props.lastRunsExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      ${props.lastRunsExpanded && allLastRuns.length > 0 ? html`
        <div style="margin-top: 16px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color);">
                <th style="text-align: left; padding: 8px; font-weight: 600;">Job</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Status</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Timestamp</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Duration</th>
                <th style="text-align: left; padding: 8px; font-weight: 600;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${allLastRuns.map((run, index) => {
                const statusClass = run.status === "ok" ? "#0a7f3f" : run.status === "error" ? "#8a1c1c" : "#9a5d00";
                return html`
                  <tr style="border-bottom: 1px solid var(--border-color); ${index % 2 === 0 ? 'background: var(--bg-secondary);' : ''}">
                    <td style="padding: 8px; font-weight: 500;">${run.jobName}</td>
                    <td style="padding: 8px;">
                      <span style="font-size: 10px; padding: 3px 8px; border-radius: 999px; background: ${statusClass}15; color: ${statusClass}; font-weight: 600; border: 1px solid ${statusClass}40;">
                        ${run.status}
                      </span>
                    </td>
                    <td style="padding: 8px; opacity: 0.8; font-size: 11px;">${formatRelativeTimestamp(run.ts)}</td>
                    <td style="padding: 8px; opacity: 0.8; font-size: 11px;">${run.durationMs ?? 0}ms</td>
                    <td style="padding: 8px;">
                      <button
                        class="btn btn-sm"
                        style="padding: 4px 10px; font-size: 12px;"
                        @click=${() => props.onLoadRuns(run.jobId)}
                      >
                        Open runs
                      </button>
                    </td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>
      ` : ""}

      ${props.lastRunsExpanded && allLastRuns.length === 0 ? html`
        <div style="margin-top: 16px; text-align: center; opacity: 0.7; padding: 24px;">
          No run history yet.
        </div>
      ` : ""}
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">Run history</div>
      <div class="card-sub">Latest runs for ${selectedRunTitle}.</div>
      ${
        props.runsJobId == null
          ? html`
              <div class="muted" style="margin-top: 12px">Select a job to inspect run history.</div>
            `
          : orderedRuns.length === 0
            ? html`
                <div class="muted" style="margin-top: 12px">No runs yet.</div>
              `
            : html`
              <div class="list" style="margin-top: 12px;">
                ${orderedRuns.map((entry) => renderRun(entry, props.basePath))}
              </div>
            `
      }
    </section>
  `;
}

function renderScheduleFields(props: CronProps) {
  const form = props.form;
  if (form.scheduleKind === "at") {
    return html`
      <label class="field" style="margin-top: 12px;">
        <span>Run at</span>
        <input
          type="datetime-local"
          .value=${form.scheduleAt}
          @input=${(e: Event) =>
            props.onFormChange({
              scheduleAt: (e.target as HTMLInputElement).value,
            })}
        />
      </label>
    `;
  }
  if (form.scheduleKind === "every") {
    return html`
      <div class="form-grid" style="margin-top: 12px;">
        <label class="field">
          <span>Every</span>
          <input
            .value=${form.everyAmount}
            @input=${(e: Event) =>
              props.onFormChange({
                everyAmount: (e.target as HTMLInputElement).value,
              })}
          />
        </label>
        <label class="field">
          <span>Unit</span>
          <select
            .value=${form.everyUnit}
            @change=${(e: Event) =>
              props.onFormChange({
                everyUnit: (e.target as HTMLSelectElement).value as CronFormState["everyUnit"],
              })}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </label>
      </div>
    `;
  }
  return html`
    <div class="form-grid" style="margin-top: 12px;">
      <label class="field">
        <span>Expression</span>
        <input
          .value=${form.cronExpr}
          @input=${(e: Event) =>
            props.onFormChange({ cronExpr: (e.target as HTMLInputElement).value })}
        />
      </label>
      <label class="field">
        <span>Timezone (optional)</span>
        <input
          .value=${form.cronTz}
          @input=${(e: Event) =>
            props.onFormChange({ cronTz: (e.target as HTMLInputElement).value })}
        />
      </label>
    </div>
  `;
}

function renderJob(job: CronJob, props: CronProps) {
  const isSelected = props.runsJobId === job.id;
  const itemClass = `list-item list-item-clickable cron-job${isSelected ? " list-item-selected" : ""}`;
  return html`
    <div class=${itemClass} @click=${() => props.onLoadRuns(job.id)}>
      <div class="list-main">
        <div class="list-title">${job.name}</div>
        <div class="list-sub">${formatCronSchedule(job)}</div>
        ${renderJobPayload(job)}
        ${job.agentId ? html`<div class="muted cron-job-agent">Agent: ${job.agentId}</div>` : nothing}
      </div>
      <div class="list-meta">
        ${renderJobState(job)}
      </div>
      <div class="cron-job-footer">
        <div class="chip-row cron-job-chips">
          <span class=${`chip ${job.enabled ? "chip-ok" : "chip-danger"}`}>
            ${job.enabled ? "enabled" : "disabled"}
          </span>
          <span class="chip">${job.sessionTarget}</span>
          <span class="chip">${job.wakeMode}</span>
        </div>
        <div class="row cron-job-actions">
          <button
            class="btn"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onToggle(job, !job.enabled);
            }}
          >
            ${job.enabled ? "Disable" : "Enable"}
          </button>
          <button
            class="btn"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onRun(job);
            }}
          >
            Run
          </button>
          <button
            class="btn"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onLoadRuns(job.id);
            }}
          >
            History
          </button>
          <button
            class="btn danger"
            ?disabled=${props.busy}
            @click=${(event: Event) => {
              event.stopPropagation();
              props.onRemove(job);
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderJobPayload(job: CronJob) {
  if (job.payload.kind === "systemEvent") {
    return html`<div class="cron-job-detail">
      <span class="cron-job-detail-label">System</span>
      <span class="muted cron-job-detail-value">${job.payload.text}</span>
    </div>`;
  }

  const delivery = job.delivery;
  const deliveryTarget =
    delivery?.channel || delivery?.to
      ? ` (${delivery.channel ?? "last"}${delivery.to ? ` -> ${delivery.to}` : ""})`
      : "";

  return html`
    <div class="cron-job-detail">
      <span class="cron-job-detail-label">Prompt</span>
      <span class="muted cron-job-detail-value">${job.payload.message}</span>
    </div>
    ${
      delivery
        ? html`<div class="cron-job-detail">
            <span class="cron-job-detail-label">Delivery</span>
            <span class="muted cron-job-detail-value">${delivery.mode}${deliveryTarget}</span>
          </div>`
        : nothing
    }
  `;
}

function formatStateRelative(ms?: number) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return "n/a";
  }
  return formatRelativeTimestamp(ms);
}

function renderJobState(job: CronJob) {
  const status = job.state?.lastStatus ?? "n/a";
  const statusClass =
    status === "ok"
      ? "cron-job-status-ok"
      : status === "error"
        ? "cron-job-status-error"
        : status === "skipped"
          ? "cron-job-status-skipped"
          : "cron-job-status-na";
  const nextRunAtMs = job.state?.nextRunAtMs;
  const lastRunAtMs = job.state?.lastRunAtMs;

  return html`
    <div class="cron-job-state">
      <div class="cron-job-state-row">
        <span class="cron-job-state-key">Status</span>
        <span class=${`cron-job-status-pill ${statusClass}`}>${status}</span>
      </div>
      <div class="cron-job-state-row">
        <span class="cron-job-state-key">Next</span>
        <span class="cron-job-state-value" title=${formatMs(nextRunAtMs)}>
          ${formatStateRelative(nextRunAtMs)}
        </span>
      </div>
      <div class="cron-job-state-row">
        <span class="cron-job-state-key">Last</span>
        <span class="cron-job-state-value" title=${formatMs(lastRunAtMs)}>
          ${formatStateRelative(lastRunAtMs)}
        </span>
      </div>
    </div>
  `;
}

function renderRun(entry: CronRunLogEntry, basePath: string) {
  const chatUrl =
    typeof entry.sessionKey === "string" && entry.sessionKey.trim().length > 0
      ? `${pathForTab("chat", basePath)}?session=${encodeURIComponent(entry.sessionKey)}`
      : null;
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${entry.status}</div>
        <div class="list-sub">${entry.summary ?? ""}</div>
      </div>
      <div class="list-meta">
        <div>${formatMs(entry.ts)}</div>
        <div class="muted">${entry.durationMs ?? 0}ms</div>
        ${
          chatUrl
            ? html`<div><a class="session-link" href=${chatUrl}>Open run chat</a></div>`
            : nothing
        }
        ${entry.error ? html`<div class="muted">${entry.error}</div>` : nothing}
      </div>
    </div>
  `;
}
