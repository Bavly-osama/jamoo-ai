import type { Decision } from "../src/ai/TokenBudgetManager";
import { DecisionSchema } from "./schema";

export function parseDecision(text: string): Decision {
  const raw = text.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output");
  const parsed = JSON.parse(candidate.slice(start, end + 1)) as Record<
    string,
    unknown
  >;
  const confidence =
    typeof parsed.confidence === "number"
      ? parsed.confidence
      : typeof parsed.confidence === "string"
        ? Number(parsed.confidence)
        : 0.7;
  return DecisionSchema.parse({
    action: parsed.action,
    confidence: Number.isFinite(confidence) ? confidence : 0.7,
    ...(typeof parsed.target === "string" ? { target: parsed.target } : {}),
  });
}
