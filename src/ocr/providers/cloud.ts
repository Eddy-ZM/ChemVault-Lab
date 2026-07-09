import { BasicOcrProvider } from "./basic";
import type { OcrInput, OcrProvider } from "../types";

export class CloudOcrProvider implements OcrProvider {
  name = "cloud-ocr-adapter";
  private readonly apiKey?: string;
  private readonly endpoint?: string;

  constructor(apiKey?: string, endpoint?: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.endpoint);
  }

  async extract(input: OcrInput) {
    if (!this.isConfigured()) {
      return new BasicOcrProvider().extract(input);
    }

    const response = await fetch(this.endpoint!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_name: input.fileName,
        mime_type: input.mimeType,
        content_base64: arrayBufferToBase64(input.buffer),
      }),
    });
    const payload = (await response.json()) as { text?: string; confidence?: number; error?: string };

    if (!response.ok) {
      return {
        source_file: input.fileName,
        file_type: input.mimeType || "image",
        page_or_sheet: "image",
        block_type: "image_ocr" as const,
        content: "OCR failed: provider returned an error",
        confidence: 0.1,
        metadata: {
          provider: this.name,
          error: payload.error || `HTTP ${response.status}`,
        },
      };
    }

    return {
      source_file: input.fileName,
      file_type: input.mimeType || "image",
      page_or_sheet: "image",
      block_type: "image_ocr" as const,
      content: payload.text?.trim() || "OCR returned no readable text",
      confidence: payload.confidence ?? 0.55,
      metadata: {
        provider: this.name,
        configured: true,
      },
    };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
