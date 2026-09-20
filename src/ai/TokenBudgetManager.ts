export interface Decision {
  action: string;
  confidence: number;
  target?: string;
}
export class TokenBudgetManager {
  geminiCalls = 0;
  inputTokens = 0;
  outputTokens = 0;
  estimatedTokensSaved = 0;
  private lastCall = -Infinity;
  private cache = new Map<string, { value: Decision; time: number }>();
  get(key: string, now: number) {
    const entry = this.cache.get(key);
    if (entry && now - entry.time < 60000) {
      this.estimatedTokensSaved += 128;
      return entry.value;
    }
    if (entry) this.cache.delete(key);
  }
  put(key: string, value: Decision, now: number) {
    if (this.cache.size >= 100)
      this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { value, time: now });
  }
  allow(
    input: { confidence: number; ambiguousMs: number; key: string },
    now: number,
  ) {
    if (
      input.confidence >= 0.75 ||
      input.ambiguousMs < 900 ||
      now - this.lastCall < 5000 ||
      this.inputTokens + this.outputTokens + 512 > 2000 ||
      this.geminiCalls >= 12
    )
      return false;
    this.lastCall = now;
    this.geminiCalls++;
    return true;
  }
  record(input: number, output: number) {
    this.inputTokens += input;
    this.outputTokens += output;
  }
}
