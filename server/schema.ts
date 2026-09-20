import { z } from "zod";
export const actions = [
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
] as const;
export const DecisionSchema = z
  .object({
    action: z.enum(actions),
    confidence: z.number().min(0).max(1),
    target: z.enum(["core", "globe", "scanner", "diagnostics"]).optional(),
  })
  .strict();
export const PayloadSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("command"),
      text: z.string().trim().min(1).max(240),
    })
    .strict(),
  z
    .object({
      kind: z.literal("gesture"),
      gestureCandidates: z
        .array(z.enum(["swipe", "drag", "pinch", "none"]))
        .min(1)
        .max(3),
      confidence: z.number().min(0).max(1),
      ambiguousMs: z.number().min(0).max(5000),
      dx: z.number().min(-1).max(1),
      dy: z.number().min(-1).max(1),
      velocity: z.number().min(0).max(10),
      pinch: z.number().min(0).max(3),
      duration: z.number().min(0).max(5000),
      context: z.enum(["carousel", "tutorial_pinch"]),
    })
    .strict(),
]);
export const validatePayload = (value: unknown) =>
  PayloadSchema.safeParse(value);
