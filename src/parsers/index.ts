import mammoth from "mammoth";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { assertSupportedFile, describeFileType } from "../files/fileTypes";
import type { LabFileLike } from "../files/types";
import { parseHplcText } from "../instruments/hplcText";
import { parseJcamp } from "../instruments/jcamp";
import type { ParsedDocumentBlock } from "../schemas/labSchema";

interface TableParseResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function parseLabFiles(files: LabFileLike[]): Promise<ParsedDocumentBlock[]> {
  const blocks: ParsedDocumentBlock[] = [];

  for (const file of files) {
    const extension = assertSupportedFile(file.name);
    const buffer = await file.arrayBuffer();

    if (extension === "csv") {
      blocks.push(...parseCsv(file, buffer));
      continue;
    }

    if (extension === "xlsx") {
      blocks.push(...(await parseXlsx(file, buffer)));
      continue;
    }

    if (extension === "docx") {
      blocks.push(...(await parseDocx(file, buffer)));
      continue;
    }

    if (extension === "pdf") {
      blocks.push(...(await parsePdf(file, buffer)));
      continue;
    }

    if (extension === "txt" || extension === "asc" || extension === "jdx" || extension === "dx") {
      blocks.push(...parseInstrumentOrText(file, buffer));
      continue;
    }

    blocks.push(parseImagePlaceholder(file));
  }

  return blocks;
}

function parseCsv(file: LabFileLike, buffer: ArrayBuffer): ParsedDocumentBlock[] {
  const text = new TextDecoder("utf-8").decode(buffer);
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const table = normalizePapaTable(parsed.data);

  return [
    {
      source_file: file.name,
      file_type: describeFileType(file.name, file.type),
      page_or_sheet: "CSV",
      block_type: "table",
      content: tableToText(table),
      confidence: 0.98,
      metadata: {
        columns: table.columns,
        rows: table.rows,
        parser: "papaparse",
        errors: parsed.errors.map((error) => error.message),
      },
    },
  ];
}

async function parseXlsx(file: LabFileLike, buffer: ArrayBuffer): Promise<ParsedDocumentBlock[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  return workbook.worksheets.map((worksheet) => {
    const matrix: unknown[][] = [];
    worksheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      matrix.push(values.map(normalizeExcelCell));
    });
    const [headerRow = [], ...bodyRows] = matrix;
    const columns = headerRow.map((value, index) => String(value || `Column ${index + 1}`));
    const rows = bodyRows
      .filter((row) => row.some((value) => value !== ""))
      .map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""])));
    const table = normalizePapaTable(rows);

    return {
      source_file: file.name,
      file_type: describeFileType(file.name, file.type),
      page_or_sheet: worksheet.name,
      block_type: "table" as const,
      content: tableToText(table),
      confidence: 0.98,
      metadata: {
        columns: table.columns,
        rows: table.rows,
        parser: "xlsx",
      },
    };
  });
}

function normalizeExcelCell(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return (value as { result?: unknown }).result ?? "";
  return value;
}

async function parseDocx(file: LabFileLike, buffer: ArrayBuffer): Promise<ParsedDocumentBlock[]> {
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer: buffer }),
    mammoth.convertToHtml({ arrayBuffer: buffer }),
  ]);
  const tableBlocks = extractDocxTables(file, htmlResult.value);

  return [
    {
      source_file: file.name,
      file_type: describeFileType(file.name, file.type),
      page_or_sheet: "document",
      block_type: "text",
      content: textResult.value.trim() || "Missing readable DOCX text",
      confidence: textResult.value.trim() ? 0.9 : 0.35,
      metadata: {
        parser: "mammoth",
        warnings: [...textResult.messages, ...htmlResult.messages].map((message) => message.message),
      },
    },
    ...tableBlocks,
  ];
}

function parseInstrumentOrText(file: LabFileLike, buffer: ArrayBuffer): ParsedDocumentBlock[] {
  const text = new TextDecoder("utf-8").decode(buffer);
  const fileType = describeFileType(file.name, file.type);
  if (/\.(jdx|dx)$/i.test(file.name) || /^##TITLE=/im.test(text)) {
    return parseJcamp(file.name, fileType, text);
  }
  if (/retention|peak area|chromatogram|sample/i.test(text)) {
    return parseHplcText(file.name, fileType, text);
  }
  return [
    {
      source_file: file.name,
      file_type: fileType,
      page_or_sheet: "text",
      block_type: "text",
      content: text.slice(0, 12000),
      confidence: 0.68,
      metadata: {
        parser: "plain-text",
      },
    },
  ];
}

async function parsePdf(file: LabFileLike, buffer: ArrayBuffer): Promise<ParsedDocumentBlock[]> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      useWorkerFetch: false,
    });
    const pdf = await loadingTask.promise;
    const blocks: ParsedDocumentBlock[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      blocks.push({
        source_file: file.name,
        file_type: describeFileType(file.name, file.type),
        page_or_sheet: `page ${pageNumber}`,
        block_type: text ? "text" : "image_ocr",
        content: text || "Missing readable PDF text; scanned PDF OCR is required",
        confidence: text ? 0.82 : 0.25,
        metadata: {
          parser: "pdfjs-dist",
          scanned_or_image_only: !text,
          requires_ocr_provider: !text,
        },
      });
    }

    return blocks;
  } catch (error) {
    return [
      {
        source_file: file.name,
        file_type: describeFileType(file.name, file.type),
        page_or_sheet: "document",
        block_type: "image_ocr",
        content: "Missing readable PDF text; PDF parsing failed or OCR is required",
        confidence: 0.2,
        metadata: {
          parser: "pdfjs-dist",
          error: error instanceof Error ? error.message : String(error),
          requires_ocr_provider: true,
        },
      },
    ];
  }
}

function parseImagePlaceholder(file: LabFileLike): ParsedDocumentBlock {
  return {
    source_file: file.name,
    file_type: describeFileType(file.name, file.type),
    page_or_sheet: "image",
    block_type: "image_ocr",
    content: "OCR pending: image text was not extracted in the basic MVP parser",
    confidence: 0.1,
    metadata: {
      parser: "ocr/providers/basic",
      requires_ocr_provider: true,
    },
  };
}

function extractDocxTables(file: LabFileLike, html: string): ParsedDocumentBlock[] {
  const blocks: ParsedDocumentBlock[] = [];
  const tableMatches = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)];

  tableMatches.forEach((match, tableIndex) => {
    const rows = [...match[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((rowMatch) =>
      [...rowMatch[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) =>
        stripHtml(cellMatch[1]).trim(),
      ),
    );
    const [header = [], ...bodyRows] = rows.filter((row) => row.length > 0);
    if (header.length === 0) return;
    const columns = header.map((column, index) => column || `Column ${index + 1}`);
    const rowObjects = bodyRows.map((row) =>
      Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""])),
    );

    blocks.push({
      source_file: file.name,
      file_type: describeFileType(file.name, file.type),
      page_or_sheet: `table ${tableIndex + 1}`,
      block_type: "table",
      content: [columns.join("\t"), ...rowObjects.map((row) => columns.map((column) => row[column]).join("\t"))].join("\n"),
      confidence: 0.76,
      metadata: {
        parser: "mammoth-html-table",
        columns,
        rows: rowObjects,
      },
    });
  });

  return blocks;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function normalizePapaTable(rows: Record<string, unknown>[]): TableParseResult {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return {
    columns,
    rows: rows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const column of columns) {
        normalized[column] = row[column] ?? "";
      }
      return normalized;
    }),
  };
}

function tableToText(table: TableParseResult): string {
  const header = table.columns.join("\t");
  const body = table.rows
    .slice(0, 80)
    .map((row) => table.columns.map((column) => String(row[column] ?? "")).join("\t"))
    .join("\n");
  return [header, body].filter(Boolean).join("\n");
}
