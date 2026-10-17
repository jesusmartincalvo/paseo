/** @vitest-environment jsdom */
import React, { useCallback } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { PluginSidebarWorkspaceTrailingProps } from "@getpaseo/plugin/client";
import type { InstalledPlugin } from "./types";
import { useSessionStore, type Agent } from "@/stores/session-store";
import { PluginWorkspaceTrailing } from "./workspace-trailing";

const fixture = vi.hoisted(() => ({
  plugins: [] as InstalledPlugin[],
  connected: true,
  openAgent: vi.fn(),
}));
vi.mock("./registry", () => ({ useInstalledPlugins: () => fixture.plugins }));
vi.mock("./host-navigation", () => ({
  usePluginHostNavigation: () => ({ openAgent: fixture.openAgent }),
}));
vi.mock("@/runtime/host-runtime", () => ({
  useHostRuntimeSnapshot: () => ({
    connectionStatus: fixture.connected ? "online" : "offline",
  }),
}));

afterEach(() => {
  cleanup();
  fixture.plugins = [];
  fixture.connected = true;
  vi.clearAllMocks();
});

function createAgents(title: string, status: Agent["status"] = "idle") {
  return new Map([
    [
      "same-agent-id",
      {
        id: "same-agent-id",
        workspaceId: "same-workspace-id",
        provider: "claude",
        title,
        createdAt: new Date("2026-10-17T10:00:00Z"),
        status,
        turn: status === "running" ? { phase: "open", turnId: null } : { phase: "idle" },
        pendingPermissions: [],
        archivedAt: null,
        parentAgentId: null,
      } as unknown as Agent,
    ],
  ]);
}
function seed(serverId: string, title: string, status: Agent["status"] = "idle") {
  act(() =>
    useSessionStore.setState((state) => ({
      sessions: {
        ...state.sessions,
        [serverId]: { agents: createAgents(title, status) },
      } as typeof state.sessions,
    })),
  );
}
function Sessions({ host, agents, connected, navigation }: PluginSidebarWorkspaceTrailingProps) {
  const activate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) =>
      navigation?.openAgent({
        agentId: event.currentTarget.value,
        serverId: host.id,
      }),
    [navigation, host.id],
  );
  return (
    <>
      {agents.map((agent) => (
        <button
          type="button"
          value={agent.id}
          key={agent.id}
          disabled={!connected}
          onClick={activate}
        >
          {agent.title} · {agent.statusBucket}
        </button>
      ))}
    </>
  );
}
function plugin(serverId: string, Component = Sessions): InstalledPlugin {
  return {
    id: "session-status",
    serverId,
    queryClient: new QueryClient(),
    paseo: {},
    invoke: async () => null,
    workspaceTrailing: [{ id: "sessions", title: "Sessions", Component }],
  } as unknown as InstalledPlugin;
}

it("keeps contributions and same-ID session data on their owning hosts", () => {
  seed("host-a", "Host A");
  seed("host-b", "Host B", "running");
  fixture.plugins = [plugin("host-a"), plugin("host-b")];
  render(<PluginWorkspaceTrailing serverId="host-b" workspaceId="same-workspace-id" />);
  expect(screen.queryByText(/Host A/)).toBeNull();
  fireEvent.click(screen.getByText("Host B · running"));
  expect(fixture.openAgent).toHaveBeenCalledWith({
    agentId: "same-agent-id",
    serverId: "host-b",
  });
});

it("observes individual session updates and disables disconnected snapshots", () => {
  seed("host-a", "Session");
  fixture.plugins = [plugin("host-a")];
  const { rerender } = render(
    <PluginWorkspaceTrailing serverId="host-a" workspaceId="same-workspace-id" />,
  );
  expect(screen.getByText("Session · done")).not.toBeNull();
  seed("host-a", "Session", "running");
  expect(screen.getByText("Session · running")).not.toBeNull();
  fixture.connected = false;
  rerender(<PluginWorkspaceTrailing serverId="host-a" workspaceId="same-workspace-id" />);
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
  fixture.plugins = [];
  rerender(<PluginWorkspaceTrailing serverId="host-a" workspaceId="same-workspace-id" />);
  expect(screen.queryByRole("button")).toBeNull();
});

it("isolates a failing contribution and recovers with its replacement installation", () => {
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  seed("host-a", "Session");
  fixture.plugins = [
    plugin("host-a", () => {
      throw new Error("broken slot");
    }),
  ];
  const { rerender } = render(
    <PluginWorkspaceTrailing serverId="host-a" workspaceId="same-workspace-id" />,
  );
  expect(screen.queryByRole("button")).toBeNull();
  fixture.plugins = [plugin("host-a")];
  rerender(<PluginWorkspaceTrailing serverId="host-a" workspaceId="same-workspace-id" />);
  expect(screen.getByText("Session · done")).not.toBeNull();
  log.mockRestore();
  errors.mockRestore();
});
