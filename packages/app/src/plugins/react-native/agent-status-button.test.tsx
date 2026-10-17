/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PluginSidebarWorkspaceAgent } from "@getpaseo/plugin/client";
import { AgentStatusButton } from "./agent-status-button";

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: () => ({ startTime: 0, cancel() {} }),
  });
});
afterEach(() => {
  cleanup();
  delete (Element.prototype as Partial<Element>).animate;
  vi.unstubAllGlobals();
});
const agent: PluginSidebarWorkspaceAgent = {
  id: "session-a",
  title: "First Claude",
  provider: "claude",
  status: "idle",
  statusBucket: "needs_input",
  createdAt: "2026-10-17T00:00:00Z",
};

it("exposes the session identity and activates without triggering the workspace row", () => {
  const openWorkspace = vi.fn();
  const openSession = vi.fn();
  render(
    <div onClick={openWorkspace}>
      <AgentStatusButton agent={agent} serverId="host-a" connected onPress={openSession} />
    </div>,
  );
  fireEvent.click(screen.getByRole("button", { name: /First Claude.*claude/ }));
  expect(openSession).toHaveBeenCalledTimes(1);
  expect(openWorkspace).not.toHaveBeenCalled();
});

it("prevents navigation while the host is disconnected", () => {
  const open = vi.fn();
  render(<AgentStatusButton agent={agent} serverId="host-a" connected={false} onPress={open} />);
  fireEvent.click(screen.getByRole("button", { name: /First Claude/ }));
  expect(open).not.toHaveBeenCalled();
  expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe("true");
});

const runningAgent: PluginSidebarWorkspaceAgent = {
  ...agent,
  status: "running",
  statusBucket: "running",
};

it("announces running activity without turning navigation into a loading action", () => {
  const onPress = vi.fn();
  render(<AgentStatusButton agent={runningAgent} serverId="host-a" connected onPress={onPress} />);
  expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true");
  expect(screen.getByRole("button").getAttribute("aria-disabled")).not.toBe("true");
});
