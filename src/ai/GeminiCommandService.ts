import { TokenBudgetManager, type Decision } from "./TokenBudgetManager";
export class GeminiCommandService {
  budget = new TokenBudgetManager();
  busy = false;
  async request(payload: Record<string, unknown>): Promise<Decision | null> {
    const key = JSON.stringify(payload);
    const now = performance.now();
    const cached = this.budget.get(key, now);
    if (cached) return cached;
    if (
      this.busy ||
      !this.budget.allow(
        {
          confidence: Number(payload.confidence ?? 0),
          ambiguousMs: Number(payload.ambiguousMs ?? 1000),
          key,
        },
        now,
      )
    )
      throw new Error("Wait a few seconds before another AI request.");
    this.busy = true;
    try {
      const res = await fetch("/api/gesture/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI unavailable.");
      this.budget.record(data.usage?.input ?? 0, data.usage?.output ?? 0);
      if (
        ![
          "NONE",
          "OPEN_PANEL",
          "CLOSE_PANEL",
          "FOCUS_OBJECT",
          "ROTATE_OBJECT",
          "RESET_SCENE",
          "OPEN_DIAGNOSTICS",
          "SHOW_STATS",
          "swipe_left",
          "swipe_right",
          "pinch_click",
        ].includes(data.action) ||
        typeof data.confidence !== "number"
      )
        return null;
      this.budget.put(key, data, now);
      return data;
    } finally {
      this.busy = false;
    }
  }
}
