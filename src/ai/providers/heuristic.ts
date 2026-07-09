import type { AIProvider, AIStagePrompt } from "./types";

export class HeuristicProvider implements AIProvider {
  name = "heuristic";

  isConfigured() {
    return true;
  }

  async completeJson<T>(_prompt: AIStagePrompt, fallback: T): Promise<T> {
    return fallback;
  }
}
