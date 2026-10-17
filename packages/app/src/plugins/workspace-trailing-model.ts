import type { PluginSidebarWorkspaceAgent } from "@getpaseo/plugin/client";
import type { Agent } from "@/stores/session-store";
import { isWorkspaceRootAgent } from "@/subagents/workspace-root-policy";
import { deriveSidebarStateBucket } from "@/utils/sidebar-agent-state";

export function selectWorkspaceTrailingAgents(
  agents: ReadonlyMap<string, Agent> | undefined,
  workspaceId: string,
): readonly PluginSidebarWorkspaceAgent[] {
  if (!agents) return [];
  const result: PluginSidebarWorkspaceAgent[] = [];
  for (const agent of agents.values()) {
    if (
      agent.archivedAt ||
      agent.workspaceId !== workspaceId ||
      !isWorkspaceRootAgent(
        agent,
        agent.parentAgentId ? agents.get(agent.parentAgentId) : undefined,
      )
    )
      continue;
    let status = agent.status;
    if (agent.turn.phase === "open") status = "running";
    else if (status === "running") status = "idle";
    result.push({
      id: agent.id,
      provider: agent.provider,
      title: agent.title,
      createdAt: agent.createdAt.toISOString(),
      status,
      statusBucket: deriveSidebarStateBucket({
        status,
        pendingPermissionCount: agent.pendingPermissions.length,
        requiresAttention: Boolean(agent.requiresAttention),
        attentionReason: agent.attentionReason ?? null,
      }),
    });
  }
  return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
