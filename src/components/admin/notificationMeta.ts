import { Banknote, Bell, Handshake, UserPlus, type LucideIcon } from "lucide-react";

export type NotificationTone = "info" | "over" | "mute";

interface TypeMeta {
  icon: LucideIcon;
  tone: NotificationTone;
  /** Short name of the area the notification belongs to, shown next to the time. */
  label: string;
  /** Title for a collapsed group of n items. */
  groupTitle: (n: number) => string;
  /** Prefix removed from item titles when previewing who is inside a group. */
  titlePrefix?: string;
}

export const NOTIFICATION_TYPES: Record<string, TypeMeta> = {
  jamaah_intake: {
    icon: UserPlus,
    tone: "info",
    label: "Pendaftaran jamaah",
    groupTitle: n => `${n} pendaftaran baru`,
    titlePrefix: "Pendaftaran baru:",
  },
  agent_registration: {
    icon: Handshake,
    tone: "over",
    label: "Agen",
    groupTitle: n => `${n} agen baru mendaftar`,
  },
  agent_withdrawal: {
    icon: Banknote,
    tone: "info",
    label: "Penarikan agen",
    groupTitle: n => `${n} permintaan penarikan`,
  },
  commission_eligible: {
    icon: Banknote,
    tone: "info",
    label: "Komisi layak dibayar",
    groupTitle: n => `${n} keberangkatan dengan komisi layak dibayar`,
  },
  commission_clawback: {
    icon: Banknote,
    tone: "over",
    label: "Komisi dikembalikan",
    groupTitle: n => `${n} komisi perlu dikembalikan agen`,
  },
};

export const FALLBACK_TYPE: TypeMeta = {
  icon: Bell,
  tone: "mute",
  label: "Lainnya",
  groupTitle: n => `${n} notifikasi`,
};

export const typeMeta = (type: string): TypeMeta => NOTIFICATION_TYPES[type] ?? FALLBACK_TYPE;

/** Pastel icon chip colours, matching the status palette in the UI Kit. */
export const TONE_CLASS: Record<NotificationTone, string> = {
  info: "bg-sky-100 text-sky-700",
  over: "bg-violet-100 text-violet-700",
  mute: "bg-slate-100 text-slate-600",
};
