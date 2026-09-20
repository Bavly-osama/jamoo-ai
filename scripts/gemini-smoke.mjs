import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const models = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-2.5-flash-lite",
];

for (const model of models) {
  try {
    const r = await ai.models.generateContent({
      model,
      contents: JSON.stringify({
        kind: "gesture",
        context: "tutorial_pinch",
        pinch: 0.3,
      }),
      config: {
        temperature: 0,
        maxOutputTokens: 64,
        responseMimeType: "application/json",
        systemInstruction:
          'Return only JSON like {"action":"pinch_click","confidence":0.9}',
      },
    });
    console.log("OK", model, r.text);
    process.exit(0);
  } catch (e) {
    console.error("FAIL", model, e?.message || e);
  }
}
process.exit(1);
