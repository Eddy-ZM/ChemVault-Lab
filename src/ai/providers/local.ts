import type { AIProvider, AIProviderEnv, AIStagePrompt } from "./types";

export class LocalModelProvider implements AIProvider {
  name = "local-model-reserved";
  private readonly env: AIProviderEnv;

  constructor(env: AIProviderEnv) {
    this.env = env;
  }

  isConfigured() {
    return Boolean(this.env.LOCAL_AI_ENDPOINT);
  }

  async completeJson<T>(_prompt: AIStagePrompt, fallback: T): Promise<T> {
    return fallback;
  }
}
