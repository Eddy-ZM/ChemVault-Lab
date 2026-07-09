import type { ParsedDocumentBlock } from "../schemas/labSchema";

export function parseHplcText(fileName: string, fileType: string, text: string): ParsedDocumentBlock[] {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headerIndex = lines.findIndex((line) => /retention|peak|area|height|sample/i.test(line));

  if (headerIndex === -1) {
    return [
      {
        source_file: fileName,
        file_type: fileType,
        page_or_sheet: "instrument text",
        block_type: "text",
        content: text.slice(0, 12000),
        confidence: 0.45,
        metadata: {
          parser: "instrument/text",
          warning: "No HPLC-style table header found",
        },
      },
    ];
  }

  const columns = splitRow(lines[headerIndex], delimiter);
  const rows = lines.slice(headerIndex + 1).map((line) => {
    const cells = splitRow(line, delimiter);
    return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""]));
  });

  return [
    {
      source_file: fileName,
      file_type: fileType,
      page_or_sheet: "instrument export",
      block_type: "table",
      content: [columns.join("\t"), ...rows.map((row) => columns.map((column) => row[column]).join("\t"))].join("\n"),
      confidence: rows.length > 0 ? 0.78 : 0.4,
      metadata: {
        parser: "instrument/hplc-text",
        columns,
        rows,
      },
    },
  ];
}

function splitRow(line: string, delimiter: string) {
  return line
    .split(delimiter)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}
