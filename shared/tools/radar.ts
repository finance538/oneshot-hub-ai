// Owner radar scoring. Kept pure so the API, the UI and tests agree.
export interface ToolCounts {
  views: number;
  uses: number;
  funnels: number;
}

export const WINNER_MIN_VIEWS = 50;

/** Funnel clicks per view and usage per view, both as percentages. */
export function rates(c: ToolCounts) {
  return {
    useRate: c.views > 0 ? (c.uses / c.views) * 100 : 0,
    funnelRate: c.views > 0 ? (c.funnels / c.views) * 100 : 0,
  };
}

/** "🔥 Winning tool": enough real traffic and a strong funnel or engagement. */
export function isWinner(c: ToolCounts) {
  if (c.views < WINNER_MIN_VIEWS) return false;
  const r = rates(c);
  return r.funnelRate >= 3 || (r.useRate >= 40 && c.funnels >= 3);
}

export const TOOL_EVENTS = ["view", "use", "funnel"] as const;
export type ToolEvent = (typeof TOOL_EVENTS)[number];
