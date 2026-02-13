import { html } from "lit";
import type { ValidationError } from "../controllers/hostel-users.ts";
import type { HostelUser } from "../types.ts";

type Props = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  users: HostelUser[] | null;
  editingUsers: HostelUser[];
  validationErrors: Array<{ userId: string; errors: ValidationError[] }>;
  hasChanges: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onAddUser: () => void;
  onRemoveUser: (userId: string) => void;
  onUpdateUser: (userId: string, patch: Partial<HostelUser>) => void;
  onSave: () => void;
  onReload: () => void;
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

export function renderHostelConfig(props: Props) {
  const userErrors = new Map<string, ValidationError[]>();
  for (const item of props.validationErrors) {
    userErrors.set(item.userId, item.errors);
  }

  return html`
    <section class="card" style="margin-top: 18px;">
      <div class="row" style="justify-content: space-between; cursor: pointer;" @click=${props.onToggle}>
        <div>
          <div class="card-title">Hostel Config</div>
          <div class="card-sub">
            Manage user roles and permissions for hostel-ops-manager.
            ${
              props.hasChanges
                ? html`
                    <span style="color: #9a5d00; font-weight: 600"> (Unsaved changes)</span>
                  `
                : ""
            }
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${
            props.expanded
              ? html`
            <button class="btn" @click=${(e: Event) => {
              e.stopPropagation();
              props.onRefresh();
            }} ?disabled=${props.loading || props.saving}>
              ${props.loading ? "Loading…" : "Refresh"}
            </button>
          `
              : ""
          }
          <button class="btn" @click=${(e: Event) => {
            e.stopPropagation();
            props.onToggle();
          }}>
            ${props.expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      ${
        props.expanded && props.error
          ? html`
        <div class="callout danger" style="margin-top: 12px;">
          ${props.error}
        </div>
      `
          : ""
      }

      ${
        props.expanded && props.saveError
          ? html`
        <div class="callout danger" style="margin-top: 12px;">
          Save failed: ${props.saveError}
        </div>
      `
          : ""
      }

      ${
        props.expanded && props.loading && !props.users
          ? html`
              <div style="margin-top: 16px; text-align: center; opacity: 0.7; padding: 24px">
                Loading configuration...
              </div>
            `
          : ""
      }

      ${
        props.expanded && props.users
          ? html`
        <div style="margin-top: 16px;">
          <!-- Action buttons -->
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button 
              class="btn" 
              @click=${props.onAddUser}
              ?disabled=${props.saving}
              style="background: #0066cc; color: white;"
            >
              + Add User
            </button>
            <button 
              class="btn" 
              @click=${props.onSave}
              ?disabled=${props.saving || !props.hasChanges || props.validationErrors.length > 0}
              style="background: #0a7f3f; color: white;"
            >
              ${props.saving ? "Saving…" : "Save Changes"}
            </button>
            <button 
              class="btn" 
              @click=${props.onReload}
              ?disabled=${props.saving || !props.hasChanges}
            >
              Discard Changes
            </button>
          </div>

          ${
            props.validationErrors.length > 0
              ? html`
                  <div class="callout danger" style="margin-bottom: 12px">
                    <strong>Validation errors:</strong> Fix all errors before saving.
                  </div>
                `
              : ""
          }

          <!-- Users editor -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${props.editingUsers.map((user) => {
              const errors = userErrors.get(user.userId) ?? [];
              const hasErrors = errors.length > 0;
              return html`
                <div 
                  class="card" 
                  style="padding: 16px; border: ${hasErrors ? "2px solid #8a1c1c" : "1px solid var(--border-color)"}; background: ${hasErrors ? "#ffeaea10" : "var(--bg-secondary)"};"
                >
                  <div style="display: flex; gap: 16px; align-items: start;">
                    <!-- User ID -->
                    <label class="field" style="flex: 1;">
                      <span style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Telegram User ID</span>
                      <input
                        type="text"
                        .value=${user.userId}
                        @input=${(e: Event) => props.onUpdateUser(user.userId, { userId: (e.target as HTMLInputElement).value })}
                        placeholder="123456789"
                        style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color); font-family: monospace;"
                      />
                      ${
                        errors.find((err) => err.field === "userId")
                          ? html`
                        <span style="color: #8a1c1c; font-size: 11px; margin-top: 4px; display: block;">
                          ${errors.find((err) => err.field === "userId")?.message}
                        </span>
                      `
                          : ""
                      }
                    </label>

                    <!-- Role -->
                    <label class="field" style="flex: 1;">
                      <span style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Role</span>
                      <select
                        .value=${user.role}
                        @change=${(e: Event) => props.onUpdateUser(user.userId, { role: (e.target as HTMLSelectElement).value as HostelUser["role"] })}
                        style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color);"
                      >
                        <option value="administrator">Administrator</option>
                        <option value="pracownik">Pracownik</option>
                        <option value="mieszkaniec">Mieszkaniec</option>
                      </select>
                      ${
                        errors.find((err) => err.field === "role")
                          ? html`
                        <span style="color: #8a1c1c; font-size: 11px; margin-top: 4px; display: block;">
                          ${errors.find((err) => err.field === "role")?.message}
                        </span>
                      `
                          : ""
                      }
                    </label>

                    <!-- Permissions -->
                    <div style="flex: 1;">
                      <span style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: block;">Permissions</span>
                      <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                          <input
                            type="checkbox"
                            .checked=${user.permissions.includes("accept-pairing")}
                            @change=${(e: Event) => {
                              const checked = (e.target as HTMLInputElement).checked;
                              const newPerms = checked
                                ? [...user.permissions, "accept-pairing"]
                                : user.permissions.filter((p) => p !== "accept-pairing");
                              props.onUpdateUser(user.userId, { permissions: newPerms });
                            }}
                          />
                          <span style="font-size: 13px;">accept-pairing</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                          <input
                            type="checkbox"
                            .checked=${user.permissions.includes("edit-users")}
                            @change=${(e: Event) => {
                              const checked = (e.target as HTMLInputElement).checked;
                              const newPerms = checked
                                ? [...user.permissions, "edit-users"]
                                : user.permissions.filter((p) => p !== "edit-users");
                              props.onUpdateUser(user.userId, { permissions: newPerms });
                            }}
                          />
                          <span style="font-size: 13px;">edit-users</span>
                        </label>
                      </div>
                      ${
                        errors.find((err) => err.field === "permissions")
                          ? html`
                        <span style="color: #9a5d00; font-size: 11px; margin-top: 4px; display: block;">
                          ${errors.find((err) => err.field === "permissions")?.message}
                        </span>
                      `
                          : ""
                      }
                    </div>

                    <!-- Remove button -->
                    <button
                      class="btn"
                      @click=${() => props.onRemoveUser(user.userId)}
                      ?disabled=${props.saving}
                      style="margin-top: 20px; background: #8a1c1c; color: white; padding: 8px 12px;"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              `;
            })}
          </div>

          ${
            props.editingUsers.length === 0
              ? html`
                  <div style="text-align: center; opacity: 0.7; padding: 24px">
                    No users configured. Click "Add User" to create the first user.
                  </div>
                `
              : ""
          }
        </div>
      `
          : ""
      }
    </section>
  `;
}
