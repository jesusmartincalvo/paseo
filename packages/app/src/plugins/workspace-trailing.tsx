import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { PluginTheme } from "@getpaseo/plugin";
import type { PluginSidebarWorkspaceTrailingContribution } from "@getpaseo/plugin/client";
import { PluginClientStateProvider } from "@getpaseo/plugin/client/host";
import { useIsCompactFormFactor } from "@/constants/layout";
import { useHostRuntimeSnapshot } from "@/runtime/host-runtime";
import { useSessionStore } from "@/stores/session-store";
import { workspaceEqualityFns } from "@/stores/session-store-hooks/selectors";
import type { Theme } from "@/styles/theme";
import { createPluginClientStateSource } from "./client-state/source";
import { usePluginHostNavigation } from "./host-navigation";
import { PluginInstallationProvider } from "./installation-provider";
import { resolvePluginPlatform } from "./platform";
import { useInstalledPlugins } from "./registry";
import { SurfaceErrorBoundary } from "./surface-error-boundary";
import { toPluginTheme } from "./theme";
import type { InstalledPlugin } from "./types";
import { selectWorkspaceTrailingAgents } from "./workspace-trailing-model";

interface WorkspaceIdentity {
  serverId: string;
  workspaceId: string;
}
const slotStyle = { flexShrink: 0, maxWidth: 96 } as const;
function renderNothing() {
  return null;
}

export function PluginWorkspaceTrailing({ serverId, workspaceId }: WorkspaceIdentity) {
  const plugins = useInstalledPlugins();
  return plugins
    .filter((plugin) => plugin.serverId === serverId)
    .flatMap((plugin) =>
      plugin.workspaceTrailing.map((contribution) => (
        <SurfaceErrorBoundary
          key={`${serverId}/${plugin.id}/${contribution.id}`}
          installation={plugin}
          Surface={contribution.Component}
          renderError={renderNothing}
        >
          <ThemedContribution
            plugin={plugin}
            contribution={contribution}
            workspaceId={workspaceId}
            uniProps={themeMapping}
          />
        </SurfaceErrorBoundary>
      )),
    );
}

function Contribution({
  plugin,
  contribution,
  workspaceId,
  theme,
}: {
  plugin: InstalledPlugin;
  contribution: PluginSidebarWorkspaceTrailingContribution;
  workspaceId: string;
  theme: PluginTheme;
}) {
  const selector = useCallback(
    (state: ReturnType<typeof useSessionStore.getState>) =>
      selectWorkspaceTrailingAgents(state.sessions[plugin.serverId]?.agents, workspaceId),
    [plugin.serverId, workspaceId],
  );
  const agents = useStoreWithEqualityFn(useSessionStore, selector, workspaceEqualityFns.deep);
  const snapshot = useHostRuntimeSnapshot(plugin.serverId);
  const connected = snapshot?.connectionStatus === "online";
  const navigation = usePluginHostNavigation(plugin.serverId);
  const compact = useIsCompactFormFactor();
  const source = useMemo(() => createPluginClientStateSource(plugin.serverId), [plugin.serverId]);
  const host = useMemo(() => ({ id: plugin.serverId, label: plugin.serverId }), [plugin.serverId]);
  const layout = useMemo(() => ({ compact, platform: resolvePluginPlatform() }), [compact]);
  const Component = contribution.Component;
  return (
    <PluginInstallationProvider plugin={plugin}>
      <PluginClientStateProvider source={source}>
        <View style={slotStyle}>
          <Component
            theme={theme}
            host={host}
            layout={layout}
            workspaceId={workspaceId}
            agents={agents}
            connected={connected}
            navigation={navigation}
          />
        </View>
      </PluginClientStateProvider>
    </PluginInstallationProvider>
  );
}

const themeMapping = (theme: Theme) => ({ theme: toPluginTheme(theme) });
const ThemedContribution = withUnistyles(Contribution);
