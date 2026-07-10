import type { AIProvider, AIProviderEnv, AIStagePrompt } from "./types";

interface DeepSeekChoice {
  message?: {
    content?: string;
  };
}

interface DeepSeekResponse {
  choices?: DeepSeekChoice[];
  error?: {
    message?: string;
  };
}

export class DeepSeekProvider implements AIProvider {
  name = "deepseek";
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(env: AIProviderEnv) {
    this.apiKey = env.DEEPSEEK_API_KEY;
    this.baseUrl = (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
    this.model = env.DEEPSEEK_MODEL || "deepseek-v4-flash";
    this.timeoutMs = normalizeTimeout(env.AI_STAGE_TIMEOUT_MS);
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async completeJson<T>(prompt: AIStagePrompt, fallback: T): Promise<T> {
    if (!this.apiKey) {
      return fallback;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: prompt.system,
            },
            {
              role: "user",
              content: prompt.user,
            },
          ],
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const payload = (await response.json()) as DeepSeekResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message || `DeepSeek request failed with ${response.status}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    try {
      return JSON.parse(extractJson(content)) as T;
    } catch {
      return fallback;
    }
  }
}

function normalizeTimeout(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 15_000;
  return Math.min(Math.max(parsed, 3_000), 30_000);
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() || trimmed;
}
