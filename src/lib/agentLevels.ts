import { Medal, Trophy, Crown } from "lucide-react";
import { createElement, type ReactNode } from "react";

/** Levels by jamaah per year: Silver (new agents start here), Gold, Platinum. "Duta Musafar" is the name of the community, not a level. */
export type AgentLevel = "silver" | "gold" | "platinum";

/**
 * Single source of truth for agent level styling. Previously duplicated
 * independently across AgentDashboard, AgentProfile, and AgentLeaderboard -
 * they'd drifted out of sync (silver was bg-gray-400 in two files and
 * bg-slate-400 in the third), so the same badge looked like a different
 * color depending which page you were on.
 */
export const AGENT_LEVEL_COLORS: Record<AgentLevel, string> = {
  silver: "bg-slate-400",
  gold: "bg-yellow-500",
  platinum: "bg-gradient-to-r from-purple-500 to-blue-500",
};

export const AGENT_LEVEL_LABELS: Record<AgentLevel, string> = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/** Minimum jamaah per year for each level (matches public.agent_levels). */
export const AGENT_LEVEL_MIN_JAMAAH: Record<AgentLevel, number> = {
  silver: 0,
  gold: 15,
  platinum: 30,
};

export const AGENT_LEVEL_BENEFITS: readonly string[] = [
  "Komisi sesuai tingkat dan paket",
  "Akses marketing kit",
  "Dukungan PIC Agen via WhatsApp",
];

export const AGENT_LEVEL_ICONS: Record<AgentLevel, ReactNode> = {
  silver: createElement(Medal, { className: "h-5 w-5 text-slate-400" }),
  gold: createElement(Trophy, { className: "h-5 w-5 text-yellow-500" }),
  platinum: createElement(Crown, { className: "h-5 w-5 text-purple-500" }),
};

export const AGENT_LEVEL_PROGRESSION: Record<AgentLevel, { next: string | null; salesNeeded: number }> = {
  silver: { next: "Gold", salesNeeded: 15 },
  gold: { next: "Platinum", salesNeeded: 30 },
  platinum: { next: null, salesNeeded: 0 },
};

export function agentLevelColor(level: string | null | undefined): string {
  return AGENT_LEVEL_COLORS[(level as AgentLevel) || "silver"] || AGENT_LEVEL_COLORS.silver;
}

export function agentLevelLabel(level: string | null | undefined): string {
  return AGENT_LEVEL_LABELS[(level as AgentLevel) || "silver"] || (level ?? "Silver");
}
