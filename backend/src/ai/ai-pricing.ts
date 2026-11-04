/**
 * USD per million tokens, Anthropic first-party list prices. Used only for the
 * cost dashboard and budget enforcement — the provider's invoice is the source
 * of truth. Unknown models fall back to AI_COST_INPUT_PER_MTOK /
 * AI_COST_OUTPUT_PER_MTOK, or to the most expensive listed rate so budgets err
 * on the side of stopping early.
 */
export const MODEL_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-fable-5-1': { input: 10, output: 50 },
  'claude-fable-5': { input: 10, output: 50 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-opus-4-6': { input: 5, output: 25 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

const MOST_EXPENSIVE = { input: 10, output: 50 };

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  override?: { input?: number; output?: number },
): number {
  const rate =
    MODEL_PRICING_USD_PER_MTOK[model] ??
    (override?.input !== undefined && override?.output !== undefined
      ? { input: override.input, output: override.output }
      : MOST_EXPENSIVE);
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}
