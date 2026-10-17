import { expect, it } from "vitest";
import type { Agent } from "@/stores/session-store";
import { selectWorkspaceTrailingAgents } from "./workspace-trailing-model";

function agent(id: string, input: Partial<Agent> = {}): Agent {
  return {
    id,
    provider: "claude",
    title: id,
    workspaceId: "workspace-a",
    createdAt: new Date("2026-10-17T10:00:00Z"),
    status: "idle",
    turn: { phase: "idle", cancellationRequestId: null },
    pendingPermissions: [],
    parentAgentId: null,
    archivedAt: null,
    ...input,
  } as Agent;
}

it("keeps two sessions of the same provider with independent states", () => {
  const agents = new Map([
    [
      "b",
      agent("b", {
        status: "running",
        turn: {
          phase: "open",
          turnId: null,
          startedAt: null,
          cancellationRequestId: null,
        },
      }),
    ],
    [
      "a",
      agent("a", {
        pendingPermissions: [{ id: "permission" }] as Agent["pendingPermissions"],
      }),
    ],
  ]);
  expect(
    selectWorkspaceTrailingAgents(agents, "workspace-a").map(({ id, statusBucket }) => ({
      id,
      statusBucket,
    })),
  ).toEqual([
    { id: "a", statusBucket: "needs_input" },
    { id: "b", statusBucket: "running" },
  ]);
});

it("normalizes stale running status using turn liveness", () => {
  expect(
    selectWorkspaceTrailingAgents(
      new Map([["a", agent("a", { status: "running" })]]),
      "workspace-a",
    )[0].status,
  ).toBe("idle");
});

it("filters archived, unrelated and internal child sessions without dropping cross-workspace roots", () => {
  const agents = new Map([
    ["parent", agent("parent")],
    ["child", agent("child", { parentAgentId: "parent" })],
    ["archived", agent("archived", { archivedAt: new Date() })],
    ["other", agent("other", { workspaceId: "workspace-b" })],
    ["cross", agent("cross", { parentAgentId: "other" })],
  ]);
  expect(selectWorkspaceTrailingAgents(agents, "workspace-a").map(({ id }) => id)).toEqual([
    "cross",
    "parent",
  ]);
  expect(selectWorkspaceTrailingAgents(agents, "workspace-b").map(({ id }) => id)).toEqual([
    "other",
  ]);
});

it("reports permission attention ahead of running and handles an absent host", () => {
  const a = agent("a", {
    status: "running",
    turn: {
      phase: "open",
      turnId: null,
      startedAt: null,
      cancellationRequestId: null,
    },
    pendingPermissions: [{}] as Agent["pendingPermissions"],
  });
  expect(selectWorkspaceTrailingAgents(new Map([["a", a]]), "workspace-a")[0].statusBucket).toBe(
    "needs_input",
  );
  expect(selectWorkspaceTrailingAgents(undefined, "workspace-a")).toEqual([]);
});
