import type { ParsedDocumentBlock } from "../schemas/labSchema";

export interface InstrumentParseResult {
  blocks: ParsedDocumentBlock[];
  instrumentType: string;
  warnings: string[];
}
