import { BasicOcrProvider } from "./basic";
import type { OcrInput, OcrProvider } from "../types";

export class CloudflareMarkdownOcrProvider implements OcrProvider {
  name = "cloudflare-markdown-ocr";
  private readonly ai?: Ai;

  constructor(ai?: Ai) {
    this.ai = ai;
  }

  isConfigured() {
    return Boolean(this.ai?.toMarkdown);
  }

  async extract(input: OcrInput) {
    if (!this.isConfigured()) {
      return new BasicOcrProvider().extract(input);
    }

    try {
      const response = await this.ai!.toMarkdown(
        {
          name: input.fileName,
          blob: new Blob([input.buffer], { type: input.mimeType || "application/octet-stream" }),
        },
        {
          conversionOptions: {
            image: {
              descriptionLanguage: "en",
            },
            pdf: {
              metadata: true,
              images: {
                convert: true,
                maxConvertedImages: 12,
                descriptionLanguage: "en",
              },
            },
          },
        },
      );

      if (response.format === "error") {
        return {
          source_file: input.fileName,
          file_type: input.mimeType || "image",
          page_or_sheet: "ocr",
          block_type: "image_ocr" as const,
          content: "OCR failed: Cloudflare markdown conversion returned an error",
          confidence: 0.1,
          metadata: {
            provider: this.name,
            error: response.error,
          },
        };
      }

      const text = response.data.trim();
      return {
        source_file: input.fileName,
        file_type: input.mimeType || response.mimeType || "image",
        page_or_sheet: "ocr",
        block_type: "image_ocr" as const,
        content: text || "OCR returned no readable text",
        confidence: text ? 0.74 : 0.2,
        metadata: {
          provider: this.name,
          tokens: response.tokens,
          configured: true,
        },
      };
    } catch (error) {
      return {
        source_file: input.fileName,
        file_type: input.mimeType || "image",
        page_or_sheet: "ocr",
        block_type: "image_ocr" as const,
        content: "OCR failed: Cloudflare markdown conversion threw an error",
        confidence: 0.1,
        metadata: {
          provider: this.name,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
