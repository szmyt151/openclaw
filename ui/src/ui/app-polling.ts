import type { OpenClawApp } from "./app.ts";
import { loadDebug } from "./controllers/debug.ts";
import { loadDevices } from "./controllers/devices.ts";
import { loadLogs } from "./controllers/logs.ts";
import { loadNodes } from "./controllers/nodes.ts";

type PollingHost = {
  nodesPollInterval: number | null;
  logsPollInterval: number | null;
  debugPollInterval: number | null;
  pairingPollInterval: number | null;
  tab: string;
  pairingAutoRefresh: boolean;
};

export function startNodesPolling(host: PollingHost) {
  if (host.nodesPollInterval != null) {
    return;
  }
  host.nodesPollInterval = window.setInterval(
    () => void loadNodes(host as unknown as OpenClawApp, { quiet: true }),
    5000,
  );
}

export function stopNodesPolling(host: PollingHost) {
  if (host.nodesPollInterval == null) {
    return;
  }
  clearInterval(host.nodesPollInterval);
  host.nodesPollInterval = null;
}

export function startLogsPolling(host: PollingHost) {
  if (host.logsPollInterval != null) {
    return;
  }
  host.logsPollInterval = window.setInterval(() => {
    if (host.tab !== "logs") {
      return;
    }
    void loadLogs(host as unknown as OpenClawApp, { quiet: true });
  }, 2000);
}

export function stopLogsPolling(host: PollingHost) {
  if (host.logsPollInterval == null) {
    return;
  }
  clearInterval(host.logsPollInterval);
  host.logsPollInterval = null;
}

export function startDebugPolling(host: PollingHost) {
  if (host.debugPollInterval != null) {
    return;
  }
  host.debugPollInterval = window.setInterval(() => {
    if (host.tab !== "debug") {
      return;
    }
    void loadDebug(host as unknown as OpenClawApp);
  }, 3000);
}

export function stopDebugPolling(host: PollingHost) {
  if (host.debugPollInterval == null) {
    return;
  }
  clearInterval(host.debugPollInterval);
  host.debugPollInterval = null;
}

export function startPairingPolling(host: PollingHost) {
  if (host.pairingPollInterval != null) {
    return;
  }
  host.pairingPollInterval = window.setInterval(() => {
    if (!host.pairingAutoRefresh) {
      return;
    }
    void loadDevices(host as unknown as OpenClawApp, { quiet: true });
  }, 10000);
}

export function stopPairingPolling(host: PollingHost) {
  if (host.pairingPollInterval == null) {
    return;
  }
  clearInterval(host.pairingPollInterval);
  host.pairingPollInterval = null;
}
