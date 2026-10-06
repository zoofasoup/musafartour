import { Award, Medal, Trophy, Crown } from "lucide-react";
import { createElement, type ReactNode } from "react";

/** Duta Musafar (after registration), then Silver / Gold / Platinum by jamaah per year. There is no Bronze. */
export type AgentLevel = "duta" | "silver" | "gold" | "platinum";

/**
 * Single source of truth for agent level styling. Previously duplicated
 * independently across AgentDashboard, AgentProfile, and AgentLeaderboard -
 * they'd drifted out of sync (silver was bg-gray-400 in two files and
 * bg-slate-400 in the third), so the same badge looked like a different
 * color depending which page you were on.
 */
export const AGENT_LEVEL_COLORS: Record<AgentLevel, string> = {
  duta: "bg-amber-600",
  silver: "bg-slate-400",
  gold: "bg-yellow-500",
  platinum: "bg-gradient-to-r from-purple-500 to-blue-500",
};

export const AGENT_LEVEL_LABELS: Record<AgentLevel, string> = {
  duta: "Duta Musafar",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/** Minimum jamaah per year for each level (matches public.agent_levels). */
export const AGENT_LEVEL_MIN_JAMAAH: Record<AgentLevel, number> = {
  duta: 0,
  silver: 1,
  gold: 15,
  platinum: 30,
};

export const AGENT_LEVEL_BENEFITS: readonly string[] = [
  "Komisi sesuai tingkat dan paket",
  "Akses marketing kit",
  "Dukungan PIC Agen via WhatsApp",
];

export const AGENT_LEVEL_ICONS: Record<AgentLevel, ReactNode> = {
  duta: createElement(Award, { className: "h-5 w-5 text-amber-600" }),
  silver: createElement(Medal, { className: "h-5 w-5 text-slate-400" }),
  gold: createElement(Trophy, { className: "h-5 w-5 text-yellow-500" }),
  platinum: createElement(Crown, { className: "h-5 w-5 text-purple-500" }),
};

export const AGENT_LEVEL_PROGRESSION: Record<AgentLevel, { next: string | null; salesNeeded: number }> = {
  duta: { next: "Silver", salesNeeded: 1 },
  silver: { next: "Gold", salesNeeded: 15 },
  gold: { next: "Platinum", salesNeeded: 30 },
  platinum: { next: null, salesNeeded: 0 },
};

export function agentLevelColor(level: string | null | undefined): string {
  return AGENT_LEVEL_COLORS[(level as AgentLevel) || "duta"] || AGENT_LEVEL_COLORS.duta;
}

export function agentLevelLabel(level: string | null | undefined): string {
  return AGENT_LEVEL_LABELS[(level as AgentLevel) || "duta"] || (level ?? "Duta Musafar");
}
