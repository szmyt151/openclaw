import type { HostelUser } from "../types.ts";

type State = {
  client: { request: (method: string, params: unknown) => Promise<unknown> } | null;
  connected: boolean;
  hostelUsersLoading: boolean;
  hostelUsersError: string | null;
  hostelUsers: HostelUser[] | null;
  hostelUsersSaving: boolean;
  hostelUsersSaveError: string | null;
};

export type ValidationError = {
  field: string;
  message: string;
};

const VALID_ROLES = ["administrator", "pracownik", "mieszkaniec"] as const;
const VALID_PERMISSIONS = ["accept-pairing", "edit-users"] as const;

export function parseUsersMarkdown(content: string): HostelUser[] {
  const users: HostelUser[] = [];
  const lines = content.split("\n");
  let currentUser: Partial<HostelUser> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // User ID: "- `1838151698`"
    const userMatch = trimmed.match(/^-\s+`(\d+)`/);
    if (userMatch) {
      if (currentUser?.userId) {
        users.push(currentUser as HostelUser);
      }
      currentUser = { userId: userMatch[1], role: "mieszkaniec", permissions: [] };
      continue;
    }

    if (!currentUser) {
      continue;
    }

    // Role: "  - rola: `administrator`"
    const roleMatch = trimmed.match(/^-\s+rola:\s+`(\w+)`/);
    if (roleMatch) {
      currentUser.role = roleMatch[1] as "administrator" | "pracownik" | "mieszkaniec";
      continue;
    }

    // Permissions: "  - uprawnienia: `accept-pairing`" or "  - uprawnienia: `accept-pairing, edit-users`"
    const permMatch = trimmed.match(/^-\s+uprawnienia:\s+`([^`]+)`/);
    if (permMatch) {
      currentUser.permissions = permMatch[1]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);
    }
  }

  // Push last user
  if (currentUser?.userId) {
    users.push(currentUser as HostelUser);
  }

  return users;
}

/**
 * Validate a single user entry
 */
export function validateUser(user: HostelUser): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate userId: must be numeric Telegram ID
  if (!user.userId || !/^\d+$/.test(user.userId)) {
    errors.push({ field: "userId", message: "User ID must contain only digits" });
  }

  // Validate role: must be one of the valid roles
  if (!VALID_ROLES.includes(user.role)) {
    errors.push({
      field: "role",
      message: `Role must be one of: ${VALID_ROLES.join(", ")}`,
    });
  }

  // Validate permissions
  for (const perm of user.permissions) {
    if (!VALID_PERMISSIONS.includes(perm as (typeof VALID_PERMISSIONS)[number])) {
      errors.push({
        field: "permissions",
        message: `Invalid permission: ${perm}. Valid: ${VALID_PERMISSIONS.join(", ")}`,
      });
    }
  }

  // Warn if non-admin has accept-pairing
  if (user.permissions.includes("accept-pairing") && user.role !== "administrator") {
    errors.push({
      field: "permissions",
      message:
        "Warning: accept-pairing permission should typically only be granted to administrators",
    });
  }

  return errors;
}

/**
 * Serialize users array back to markdown format
 */
export function serializeUsersMarkdown(users: HostelUser[]): string {
  const lines: string[] = [];

  lines.push("# Użytkownicy hostelu");
  lines.push("");
  lines.push("Lista użytkowników z rolami i uprawnieniami.");
  lines.push("");

  for (const user of users) {
    lines.push(`- \`${user.userId}\``);
    lines.push(`  - rola: \`${user.role}\``);
    if (user.permissions.length > 0) {
      lines.push(`  - uprawnienia: \`${user.permissions.join(", ")}\``);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export async function loadHostelUsers(state: State, agentId: string) {
  if (!state.client || !state.connected || state.hostelUsersLoading) {
    return;
  }

  state.hostelUsersLoading = true;
  state.hostelUsersError = null;

  try {
    const res = (await state.client.request("agents.files.get", {
      agentId,
      name: "USERS.md",
    })) as { file?: { content?: string } } | undefined;

    if (!res?.file?.content) {
      state.hostelUsers = [];
      return;
    }

    state.hostelUsers = parseUsersMarkdown(res.file.content);
  } catch (err) {
    state.hostelUsersError = String(err);
    state.hostelUsers = null;
  } finally {
    state.hostelUsersLoading = false;
  }
}

/**
 * Save users back to USERS.md
 */
export async function saveHostelUsers(state: State, agentId: string, users: HostelUser[]) {
  if (!state.client || !state.connected || state.hostelUsersSaving) {
    return { success: false, error: "Not connected or already saving" };
  }

  // Validate all users
  const allErrors: Array<{ userId: string; errors: ValidationError[] }> = [];
  for (const user of users) {
    const errors = validateUser(user);
    if (errors.length > 0) {
      allErrors.push({ userId: user.userId, errors });
    }
  }

  if (allErrors.length > 0) {
    return {
      success: false,
      error: "Validation failed",
      validationErrors: allErrors,
    };
  }

  state.hostelUsersSaving = true;
  state.hostelUsersSaveError = null;

  try {
    const content = serializeUsersMarkdown(users);

    await state.client.request("agents.files.save", {
      agentId,
      name: "USERS.md",
      content,
    });

    state.hostelUsers = users;
    return { success: true };
  } catch (err) {
    state.hostelUsersSaveError = String(err);
    return { success: false, error: String(err) };
  } finally {
    state.hostelUsersSaving = false;
  }
}
