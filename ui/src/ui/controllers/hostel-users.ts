import type { HostelUser } from "../types.ts";

type State = {
  client: { request: (method: string, params: unknown) => Promise<unknown> } | null;
  connected: boolean;
  hostelUsersLoading: boolean;
  hostelUsersError: string | null;
  hostelUsers: HostelUser[] | null;
};

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

    if (!currentUser) continue;

    // Role: "  - rola: `administrator`"
    const roleMatch = trimmed.match(/^-\s+rola:\s+`(\w+)`/);
    if (roleMatch) {
      currentUser.role = roleMatch[1] as "administrator" | "pracownik" | "mieszkaniec";
      continue;
    }

    // Permissions: "  - uprawnienia: `accept-pairing`" or "  - uprawnienia: `accept-pairing, edit-users`"
    const permMatch = trimmed.match(/^-\s+uprawnienia:\s+`([^`]+)`/);
    if (permMatch) {
      currentUser.permissions = permMatch[1].split(",").map((p) => p.trim()).filter((p) => p);
    }
  }

  // Push last user
  if (currentUser?.userId) {
    users.push(currentUser as HostelUser);
  }

  return users;
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
