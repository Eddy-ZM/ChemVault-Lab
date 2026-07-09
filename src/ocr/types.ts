import type { ParsedDocumentBlock } from "../schemas/labSchema";

export interface OcrInput {
  fileName: string;
  mimeType: string;
  buffer: ArrayBuffer;
}

export interface OcrProvider {
  name: string;
  isConfigured(): boolean;
  extract(input: OcrInput): Promise<ParsedDocumentBlock>;
}
