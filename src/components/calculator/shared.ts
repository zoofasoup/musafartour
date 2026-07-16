export const BRAND = {
  red: "#C8102E",
  gold: "#FFB100",
  ink: "#262626",
  bg: "#F2F3F3",
  muted: "#989999",
};

export const SAVING_CHIPS = [500_000, 1_000_000, 2_000_000, 3_000_000];
export const TIMEFRAME_CHIPS = [6, 12, 18, 24, 36];
export const WRAPPED_COUNT = 10;

export type Mode = "A" | "B";

export type Step =
  | { kind: "intro" }
  | { kind: "mode" }
  | { kind: "a-q1" }
  | { kind: "a-q2" }
  | { kind: "a-q3" }
  | { kind: "b-q1" }
  | { kind: "b-q2" }
  | { kind: "b-q3" }
  | { kind: "b-q4" }
  | { kind: "computing" }
  | { kind: "wrapped"; index: number }
  | { kind: "submitting" };

export const fade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};
