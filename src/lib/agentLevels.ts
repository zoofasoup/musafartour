import { Award, Medal, Trophy, Crown } from "lucide-react";
import { createElement, type ReactNode } from "react";

export type AgentLevel = "bronze" | "silver" | "gold" | "platinum";

/**
 * Single source of truth for agent level styling. Previously duplicated
 * independently across AgentDashboard, AgentProfile, and AgentLeaderboard -
 * they'd drifted out of sync (silver was bg-gray-400 in two files and
 * bg-slate-400 in the third), so the same badge looked like a different
 * color depending which page you were on.
 */
export const AGENT_LEVEL_COLORS: Record<AgentLevel, string> = {
  bronze: "bg-amber-600",
  silver: "bg-slate-400",
  gold: "bg-yellow-500",
  platinum: "bg-gradient-to-r from-purple-500 to-blue-500",
};

export const AGENT_LEVEL_LABELS: Record<AgentLevel, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const AGENT_LEVEL_ICONS: Record<AgentLevel, ReactNode> = {
  bronze: createElement(Award, { className: "h-5 w-5 text-amber-600" }),
  silver: createElement(Medal, { className: "h-5 w-5 text-slate-400" }),
  gold: createElement(Trophy, { className: "h-5 w-5 text-yellow-500" }),
  platinum: createElement(Crown, { className: "h-5 w-5 text-purple-500" }),
};

export const AGENT_LEVEL_PROGRESSION: Record<AgentLevel, { next: string | null; salesNeeded: number }> = {
  bronze: { next: "Silver", salesNeeded: 5 },
  silver: { next: "Gold", salesNeeded: 15 },
  gold: { next: "Platinum", salesNeeded: 30 },
  platinum: { next: null, salesNeeded: 0 },
};

export function agentLevelColor(level: string | null | undefined): string {
  return AGENT_LEVEL_COLORS[(level as AgentLevel) || "bronze"] || AGENT_LEVEL_COLORS.bronze;
}

export function agentLevelLabel(level: string | null | undefined): string {
  return AGENT_LEVEL_LABELS[(level as AgentLevel) || "bronze"] || (level ?? "Bronze");
}
