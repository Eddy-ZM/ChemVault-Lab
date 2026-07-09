import type { OcrInput, OcrProvider } from "../types";

export class BasicOcrProvider implements OcrProvider {
  name = "basic-ocr-placeholder";

  isConfigured() {
    return true;
  }

  async extract(input: OcrInput) {
    return {
      source_file: input.fileName,
      file_type: input.mimeType || "image",
      page_or_sheet: "image",
      block_type: "image_ocr" as const,
      content: "OCR pending: configure a cloud OCR provider to extract handwritten or scanned text",
      confidence: 0.1,
      metadata: {
        provider: this.name,
        requires_ocr_provider: true,
      },
    };
  }
}
