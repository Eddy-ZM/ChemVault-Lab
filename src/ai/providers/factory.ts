import { DeepSeekProvider } from "./deepseek";
import { HeuristicProvider } from "./heuristic";
import { LocalModelProvider } from "./local";
import { OpenAIProvider } from "./openai";
import type { AIProvider, AIProviderEnv } from "./types";

export function createAIProvider(env: AIProviderEnv = {}): AIProvider {
  const requested = (env.AI_PROVIDER || "deepseek").toLowerCase();

  if (requested === "openai") {
    const provider = new OpenAIProvider(env);
    return provider.isConfigured() ? provider : new HeuristicProvider();
  }

  if (requested === "local") {
    const provider = new LocalModelProvider(env);
    return provider.isConfigured() ? provider : new HeuristicProvider();
  }

  if (requested === "none" || requested === "heuristic") {
    return new HeuristicProvider();
  }

  const provider = new DeepSeekProvider(env);
  return provider.isConfigured() ? provider : new HeuristicProvider();
}
