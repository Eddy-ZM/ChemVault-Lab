import type { AIProviderEnv } from "../../ai/providers/types";
import { BasicOcrProvider } from "./basic";
import { CloudOcrProvider } from "./cloud";
import { CloudflareMarkdownOcrProvider } from "./cloudflare";
import type { OcrProvider } from "../types";

export interface OcrEnv extends AIProviderEnv {
  AI?: Ai;
  OCR_PROVIDER?: string;
  OCR_API_KEY?: string;
  OCR_ENDPOINT?: string;
}

export function createOcrProvider(env: OcrEnv = {}): OcrProvider {
  const provider = (env.OCR_PROVIDER || "basic").toLowerCase();
  if (provider === "cloudflare" || provider === "workers-ai" || provider === "markdown") {
    const cloudflare = new CloudflareMarkdownOcrProvider(env.AI);
    return cloudflare.isConfigured() ? cloudflare : new BasicOcrProvider();
  }
  if (provider === "cloud") {
    const cloud = new CloudOcrProvider(env.OCR_API_KEY, env.OCR_ENDPOINT);
    return cloud.isConfigured() ? cloud : new BasicOcrProvider();
  }
  return new BasicOcrProvider();
}
