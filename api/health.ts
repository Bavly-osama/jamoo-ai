import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, aiEnabled: Boolean(process.env.GEMINI_API_KEY) });
}
