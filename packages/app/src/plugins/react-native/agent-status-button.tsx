import React, { useCallback, useMemo } from "react";
import { Text, View, type GestureResponderEvent } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import type { AgentStatusButtonProps } from "@getpaseo/plugin/client/react-native";
import { useProviderIcon } from "@/components/provider-icons";
import { StatusRing } from "@/components/status-ring";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AgentStatusButton({ agent, serverId, connected, onPress }: AgentStatusButtonProps) {
  const Icon = useProviderIcon(agent.provider, serverId);
  const { t } = useTranslation();
  let state = t(`agentList.status.${agent.status}`);
  if (!connected) state = t("common.connectionStatus.offline");
  else if (agent.statusBucket === "needs_input")
    state = t("agentList.badges.pending", { count: 1 });
  else if (agent.statusBucket === "attention") state = t("agentList.badges.attention");
  const label = `${agent.title || agent.id} · ${agent.provider} · ${state}`;
  const busy =
    connected &&
    agent.statusBucket !== "needs_input" &&
    (agent.status === "initializing" || agent.statusBucket === "running");
  const accessibilityState = useMemo(() => ({ busy }), [busy]);
  const activate = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      onPress();
    },
    [onPress],
  );
  let dotStyle = styles.inactive;
  if (connected) {
    if (agent.statusBucket === "needs_input") dotStyle = styles.waiting;
    else if (agent.statusBucket === "failed") dotStyle = styles.failed;
    else if (agent.statusBucket === "attention") dotStyle = styles.finished;
  }
  const renderIcon = useCallback(
    (color: string) => (
      <View style={styles.icon}>
        <Icon size={16} color={color} />
        <View style={styles.badge}>
          {busy ? <StatusRing /> : <View style={[styles.dot, dotStyle]} />}
        </View>
      </View>
    ),
    [Icon, busy, dotStyle],
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          accessibilityLabel={label}
          disabled={!connected}
          testID={`session-status-${agent.id}`}
          accessibilityState={accessibilityState}
          aria-busy={busy}
          style={styles.button}
          onPress={activate}
          leftIcon={renderIcon}
        />
      </TooltipTrigger>
      <TooltipContent>
        <Text style={styles.label}>{label}</Text>
      </TooltipContent>
    </Tooltip>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: { width: 28, height: 28, paddingHorizontal: 0, flexShrink: 0 },
  icon: { width: 16, height: 16 },
  badge: { position: "absolute", right: -5, bottom: -5 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.surfaceSidebar,
  },
  inactive: { backgroundColor: theme.colors.foregroundMuted },
  waiting: { backgroundColor: theme.colors.statusDotWarning },
  failed: { backgroundColor: theme.colors.statusDotDanger },
  finished: { backgroundColor: theme.colors.statusDotSuccess },
  label: { color: theme.colors.foreground, fontSize: theme.fontSize.sm },
}));
