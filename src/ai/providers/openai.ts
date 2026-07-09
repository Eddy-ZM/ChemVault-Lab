import type { AIProvider, AIProviderEnv, AIStagePrompt } from "./types";

export class OpenAIProvider implements AIProvider {
  name = "openai-reserved";
  private readonly env: AIProviderEnv;

  constructor(env: AIProviderEnv) {
    this.env = env;
  }

  isConfigured() {
    return Boolean(this.env.OPENAI_API_KEY);
  }

  async completeJson<T>(_prompt: AIStagePrompt, fallback: T): Promise<T> {
    return fallback;
  }
}
