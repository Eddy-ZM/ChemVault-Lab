import type { ParsedDocumentBlock } from "../schemas/labSchema";

export function parseJcamp(fileName: string, fileType: string, text: string): ParsedDocumentBlock[] {
  const metadata = parseMetadata(text);
  const peaks = parsePeakTable(text);
  const blocks: ParsedDocumentBlock[] = [
    {
      source_file: fileName,
      file_type: fileType,
      page_or_sheet: "JCAMP-DX metadata",
      block_type: "text",
      content: Object.entries(metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n"),
      confidence: Object.keys(metadata).length > 0 ? 0.8 : 0.35,
      metadata: {
        parser: "instrument/jcamp",
        instrument_type: detectInstrumentType(text),
        fields: metadata,
      },
    },
  ];

  if (peaks.length > 0) {
    blocks.push({
      source_file: fileName,
      file_type: fileType,
      page_or_sheet: "JCAMP-DX peaks",
      block_type: "table",
      content: ["x\ty", ...peaks.map((row) => `${row.x}\t${row.y}`)].join("\n"),
      confidence: 0.72,
      metadata: {
        parser: "instrument/jcamp",
        columns: ["x", "y"],
        rows: peaks,
      },
    });
  }

  return blocks;
}

function parseMetadata(text: string) {
  const fields: Record<string, string> = {};
  for (const match of text.matchAll(/^##([^=]+)=(.*)$/gm)) {
    fields[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return fields;
}

function parsePeakTable(text: string) {
  const peakSection = text.match(/##PEAK TABLE=.*?\n([\s\S]*?)(?=\n##|$)/i)?.[1] || "";
  const source = peakSection || text.match(/##XYDATA=.*?\n([\s\S]*?)(?=\n##|$)/i)?.[1] || "";
  const rows: Array<{ x: number; y: number }> = [];

  for (const line of source.split(/\r?\n/)) {
    const numbers = line.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) || [];
    for (let index = 0; index + 1 < numbers.length; index += 2) {
      rows.push({ x: numbers[index], y: numbers[index + 1] });
    }
    if (rows.length >= 500) break;
  }

  return rows;
}

function detectInstrumentType(text: string) {
  if (/infrared|ir spectrum|ftir/i.test(text)) return "IR analysis";
  if (/nmr|chemical shift|hz/i.test(text)) return "NMR analysis";
  if (/uv|visible|absorbance/i.test(text)) return "UV-Vis";
  return "instrument spectrum";
}
