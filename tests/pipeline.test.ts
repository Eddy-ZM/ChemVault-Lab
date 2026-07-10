import ExcelJS from "exceljs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "../src/auth/jwt";
import { buildUserSystemLoginUrl, normalizeUserSystemProfile, sanitizeLocalReturnTo } from "../src/auth/userSystem";
import { analyseLabFiles } from "../src/analysis/pipeline";
import { generateExcelWorkbook } from "../src/excel/workbook";
import { generateLatexSummary } from "../src/export/latex";
import type { AnalysisUserOptions } from "../src/files/types";
import { CloudOcrProvider } from "../src/ocr/providers/cloud";
import { CloudflareMarkdownOcrProvider } from "../src/ocr/providers/cloudflare";
import { parseLabFiles } from "../src/parsers";
import { deleteAnalysisRecord, listAnalysisHistory, saveAnalysisToHistory } from "../src/storage/history";

const baseOptions: AnalysisUserOptions = {
  uploadIntent: "Auto detect",
  experimentName: "",
  courseName: "CHEM101",
  experimentDate: "2026-07-07",
  operatorName: "Test Operator",
  outputLanguage: "English",
  generateExcel: true,
  generateJson: true,
  generateMarkdown: true,
  generateLatex: true,
};

describe("ChemVault Lab MVP pipeline", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("parses an organic synthesis handout and returns structured JSON", async () => {
    const file = textFile(
      "aspirin-handout.csv",
      "Section,Content\nTitle,Aspirin synthesis\nAim,prepare acetylsalicylic acid\nProcedure,Add salicylic acid and acetic anhydride heat cool filter crystals\nData,Record crude mass and purified mass",
      "text/csv",
    );
    const result = await analyseLabFiles([file], { ...baseOptions, experimentName: "Aspirin synthesis" }, { AI_PROVIDER: "heuristic" });

    expect(result.analysis.experiment_summary.experiment_type).toBe("Organic synthesis");
    expect(result.analysis.experiment_summary.detected_reaction).toMatch(/aspirin|unknown/i);
    expect(result.analysis.procedure_timeline.length).toBeGreaterThan(0);
  });

  it("detects a titration lab notebook from text evidence", async () => {
    const file = textFile(
      "titration-notebook.csv",
      "Section,Content\nNotebook,Titration lab notebook\nAim,determine concentration of sodium hydroxide\nObservation,Trial 1 initial burette 0.10 mL final burette 24.80 mL endpoint colour change observed",
      "text/csv",
    );
    const result = await analyseLabFiles([file], baseOptions, { AI_PROVIDER: "heuristic" });

    expect(result.analysis.experiment_summary.experiment_type).toBe("Titration");
    expect(result.analysis.calculations.some((calculation) => calculation.name.includes("titre"))).toBe(true);
  });

  it("parses HPLC calibration CSV data", async () => {
    const file = textFile(
      "hplc-calibration.csv",
      "Sample,Retention Time,Peak Area,Concentration\nSTD1,2.10,1000,1\nSTD2,2.12,2100,2\nUnknown,2.11,1600,",
      "text/csv",
    );
    const blocks = await parseLabFiles([file]);
    const result = await analyseLabFiles([file], baseOptions, { AI_PROVIDER: "heuristic" });

    expect(blocks[0].block_type).toBe("table");
    expect(result.analysis.experiment_summary.experiment_type).toBe("HPLC");
    expect(result.analysis.raw_data.tables[0].rows.length).toBe(3);
  });

  it("parses UV-Vis absorbance table data", async () => {
    const file = textFile(
      "uv-vis-data.csv",
      "Sample,Wavelength,Absorbance,Concentration,pH\nA,520,0.123,0.5,7\nB,520,0.248,1.0,7",
      "text/csv",
    );
    const result = await analyseLabFiles([file], baseOptions, { AI_PROVIDER: "heuristic" });

    expect(result.analysis.experiment_summary.experiment_type).toBe("UV-Vis");
    expect(result.analysis.raw_data.tables[0].columns).toContain("Absorbance");
  });

  it("detects a TLC record and keeps missing values explicit", async () => {
    const file = textFile(
      "tlc-record.csv",
      "Spot,Solvent System,Distance Spot Travelled,Distance Solvent Front,Rf\nA,ethyl acetate hexane,2.1,5.0,0.42",
      "text/csv",
    );
    const result = await analyseLabFiles([file], baseOptions, { AI_PROVIDER: "heuristic" });

    expect(result.analysis.experiment_summary.experiment_type).toBe("TLC");
    expect(result.analysis.raw_data.tables[0].columns).toContain("Rf");
  });

  it("uses a manually entered column chromatography title for experiment detection", async () => {
    const file = textFile("uploaded-handout.pdf", "not a real pdf body", "application/pdf");
    const result = await analyseLabFiles(
      [file],
      { ...baseOptions, experimentName: "separating mixtures by column chromatography" },
      { AI_PROVIDER: "heuristic" },
    );

    expect(result.analysis.experiment_summary.experiment_type).toBe("Purification");
    expect(result.analysis.raw_data.tables[0].columns).toContain("Eluent / Solvent System");
    expect(result.analysis.procedure_timeline[0].operation).toBe("Missing procedure details");
  });

  it("extracts materials from a readable column chromatography handout", async () => {
    const file = textFile(
      "column-chromatography-handout.txt",
      [
        "Separating mixtures by column chromatography.",
        "Use TLC to analyse the components of spearmint oil and determine an eluent solvent system.",
        "The TLC stationary phase contains zinc sulfide ZnS indicator.",
        "Pack the flash column with silica gel and keep the stationary phase solvated.",
        "Visualise compounds by staining with alkaline KMnO4 solution.",
      ].join("\n"),
      "text/plain",
    );
    const result = await analyseLabFiles(
      [file],
      { ...baseOptions, experimentName: "Separating mixtures by column chromatography" },
      { AI_PROVIDER: "heuristic" },
    );
    const chemicalNames = result.analysis.reaction_table.map((row) => row.chemical_name);

    expect(result.analysis.experiment_summary.experiment_type).toBe("TLC");
    expect(result.analysis.experiment_summary.notes.join(" ")).toContain("TLC -> Purification");
    expect(result.analysis.experiment_summary.detected_reaction).toBe("Not a reaction-centred experiment");
    expect(chemicalNames).toContain("Spearmint Oil");
    expect(chemicalNames).toContain("Silica");
    expect(chemicalNames).toContain("Zinc Sulfide");
    expect(chemicalNames).toContain("Potassium Permanganate");
    expect(result.analysis.reaction_table.every((row) => row.chemical_name !== "Missing")).toBe(true);
  });

  it("keeps workflow-first TLC evidence ahead of AI reaction false positives", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body || "{}"));
        const user = JSON.parse(body.messages?.[1]?.content || "{}");
        const fallback = user.fallback_shape;
        const output =
          user.stage === "detect_reaction"
            ? {
                detected_reaction: "Oxidation",
                reaction_class: "Redox",
                reaction_confidence: "medium",
                alternative_possibilities: [],
                uncertainty_reason: "",
              }
            : user.stage === "generate_structured_json"
              ? {
                  analysis: {
                    ...fallback,
                    experiment_summary: {
                      ...fallback.experiment_summary,
                      experiment_type: "Purification",
                      detected_reaction: "Oxidation",
                      reaction_confidence: "medium",
                    },
                    raw_data: {
                      data_type: "Purification",
                      tables: [
                        {
                          table_name: "Generic purification raw data",
                          columns: ["Measurement", "Value", "Unit", "Notes"],
                          rows: [],
                          source_reference: "Missing",
                        },
                      ],
                    },
                  },
                }
              : fallback;

        return Response.json({
          choices: [{ message: { content: JSON.stringify(output) } }],
        });
      }),
    );
    const file = textFile(
      "workflow-handout.txt",
      [
        "Separating mixtures by column chromatography.",
        "Use thin-layer chromatography TLC to identify components and calculate Rf values.",
        "Stain the TLC plate with alkaline KMnO4 only to visualise spots.",
        "Then pack a flash column with silica gel and collect eluted fractions.",
      ].join("\n"),
      "text/plain",
    );
    const result = await analyseLabFiles(
      [file],
      { ...baseOptions, experimentName: "Separating mixtures by column chromatography" },
      { AI_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "test-key" },
    );

    expect(result.analysis.experiment_summary.experiment_type).toBe("TLC");
    expect(result.analysis.experiment_summary.detected_reaction).toBe("Not a reaction-centred experiment");
    expect(result.analysis.raw_data.tables[0].columns).toContain("Rf");
    expect(result.analysis.experiment_summary.notes.join(" ")).toContain("Reaction field normalized");
  });

  it("runs independent AI stages concurrently", async () => {
    let activeRequests = 0;
    let peakRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input, init) => {
        activeRequests += 1;
        peakRequests = Math.max(peakRequests, activeRequests);
        const body = JSON.parse(String(init?.body || "{}"));
        const user = JSON.parse(body.messages?.[1]?.content || "{}");
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeRequests -= 1;

        return Response.json({
          choices: [{ message: { content: JSON.stringify(user.fallback_shape) } }],
        });
      }),
    );
    const file = textFile(
      "parallel-stages.txt",
      "Titration notebook. Trial 1 initial burette 0.10 mL final burette 24.80 mL.",
      "text/plain",
    );

    await analyseLabFiles([file], baseOptions, {
      AI_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "test-key",
    });

    expect(peakRequests).toBeGreaterThanOrEqual(2);
  });

  it("normalizes AI-only column chromatography labels back into the stable schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body || "{}"));
        const user = JSON.parse(body.messages?.[1]?.content || "{}");
        const fallback = user.fallback_shape;
        const output =
          user.stage === "extract_chemicals"
            ? { reaction_table: [] }
            : user.stage === "generate_structured_json"
              ? {
                  analysis: {
                    ...fallback,
                    experiment_summary: {
                      ...fallback.experiment_summary,
                      experiment_type: "Column Chromatography",
                      detected_reaction: null,
                    },
                    reaction_table: [],
                    warnings: ["Handle silica dust in a fume hood."],
                  },
                }
              : fallback;

        return Response.json({
          choices: [{ message: { content: JSON.stringify(output) } }],
        });
      }),
    );
    const file = textFile(
      "column-chromatography-handout.txt",
      "Separating mixtures by column chromatography. Spearmint oil is separated on silica gel with alkaline KMnO4 staining.",
      "text/plain",
    );
    const result = await analyseLabFiles(
      [file],
      { ...baseOptions, experimentName: "Separating mixtures by column chromatography" },
      { AI_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "test-key" },
    );

    expect(result.analysis.experiment_summary.experiment_type).toBe("Purification");
    expect(result.analysis.experiment_summary.detected_reaction).toBe("Not a reaction-centred experiment");
    expect(result.analysis.reaction_table.map((row) => row.chemical_name)).toContain("Silica");
    expect(result.analysis.warnings[0].message).toContain("silica");
  });

  it("marks unreadable PDFs as OCR-required instead of silently treating them as text", async () => {
    const file = textFile("scanned-lab-book.pdf", "not a real pdf body", "application/pdf");
    const blocks = await parseLabFiles([file]);
    const result = await analyseLabFiles([file], baseOptions, { AI_PROVIDER: "heuristic" });

    expect(blocks[0].block_type).toBe("image_ocr");
    expect(blocks[0].metadata.requires_ocr_provider).toBe(true);
    expect(result.stages.find((stage) => stage.key === "text_extracted")?.status).toBe("warning");
    expect(result.analysis.warnings.some((warning) => warning.type === "ocr_required")).toBe(true);
    expect(result.analysis.missing_data.some((item) => item.item === "Readable source text / OCR")).toBe(true);
  });

  it("does not let an AI unknown override deterministic experiment evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body || "{}"));
        const user = JSON.parse(body.messages?.[1]?.content || "{}");
        const fallback = user.fallback_shape;
        const output =
          user.stage === "detect_experiment"
            ? { ...fallback, experiment_type: "Unknown / uncertain", confidence: "low" }
            : user.stage === "extract_chemicals"
              ? { reaction_table: fallback }
              : user.stage === "extract_raw_data"
                ? { raw_data: fallback }
                : user.stage === "identify_calculations"
                  ? { calculations: fallback }
                  : user.stage === "generate_structured_json"
                    ? { analysis: fallback }
            : fallback;

        return Response.json({
          choices: [{ message: { content: JSON.stringify(output) } }],
        });
      }),
    );

    const file = textFile("uploaded-handout.pdf", "not a real pdf body", "application/pdf");
    const result = await analyseLabFiles(
      [file],
      { ...baseOptions, experimentName: "separating mixtures by column chromatography" },
      { AI_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "test-key" },
    );

    expect(result.provider).toBe("deepseek");
    expect(result.analysis.experiment_summary.experiment_type).toBe("Purification");
  });

  it("does not crash on a missing data case", async () => {
    const file = textFile("unclear-note.csv", "Section,Content\nObservation,Lab note image transcription unclear observed cloudy mixture", "text/csv");
    const result = await analyseLabFiles([file], { ...baseOptions, experimentDate: "" }, { AI_PROVIDER: "heuristic" });

    expect(result.analysis.experiment_summary.experiment_type).toBe("Unknown / uncertain");
    expect(result.analysis.missing_data.length).toBeGreaterThan(0);
    expect(result.analysis.warnings.length).toBeGreaterThan(0);
  });

  it("returns a clear warning when no API key is configured", async () => {
    const file = textFile("no-api-key.csv", "Trial,Titre\n1,24.7", "text/csv");
    const result = await analyseLabFiles([file], baseOptions, {});

    expect(result.provider).toBe("heuristic");
    expect(result.analysis.warnings.some((warning) => warning.type === "ai_provider")).toBe(true);
  });

  it("merges multiple uploaded files and generates an Excel workbook", async () => {
    const notebook = textFile("notebook.csv", "Section,Content\nNotebook,HPLC notebook inject sample and record peak area", "text/csv");
    const data = textFile("raw-data.csv", "Sample,Retention Time,Peak Area\nSample 1,2.1,1500", "text/csv");
    const result = await analyseLabFiles([notebook, data], baseOptions, { AI_PROVIDER: "heuristic" });
    const workbookBuffer = await generateExcelWorkbook(result.analysis);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer);

    expect(result.fileCount).toBe(2);
    expect(result.analysis.experiment_summary.source_files).toHaveLength(2);
    expect(workbook.getWorksheet("Experiment Summary")).toBeTruthy();
    expect(workbook.getWorksheet("Issues and Missing Data")).toBeTruthy();
  });

  it("deletes one local analysis history record without clearing the rest", async () => {
    const first = await analyseLabFiles(
      [textFile("first.csv", "Section,Content\nTitle,Titration\nObservation,Trial 1 titre 24.7 mL", "text/csv")],
      baseOptions,
      { AI_PROVIDER: "heuristic" },
    );
    const second = await analyseLabFiles(
      [textFile("second.csv", "Sample,Retention Time,Peak Area\nA,2.10,1500", "text/csv")],
      baseOptions,
      { AI_PROVIDER: "heuristic" },
    );
    saveAnalysisToHistory(first);
    saveAnalysisToHistory(second);

    const remaining = deleteAnalysisRecord(first.id);

    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
    expect(listAnalysisHistory().map((record) => record.id)).toEqual([second.id]);
  });

  it("generates a LaTeX report artifact from structured analysis", async () => {
    const file = textFile("latex-report.csv", "Section,Content\nTitle,Titration report\nObservation,Trial 1 titre 24.7 mL", "text/csv");
    const result = await analyseLabFiles([file], baseOptions, { AI_PROVIDER: "heuristic" });
    const latex = generateLatexSummary(result.analysis);

    expect(result.latex).toContain("\\documentclass");
    expect(latex).toContain("\\section*{Experiment Summary}");
    expect(latex).toContain("\\section*{Issues and Missing Data}");
  });

  it("parses JCAMP-DX spectrum metadata and peak tables", async () => {
    const file = textFile(
      "ir-spectrum.jdx",
      "##TITLE=Sample IR\n##DATA TYPE=INFRARED SPECTRUM\n##PEAK TABLE=(XY..XY)\n1700 80 1600 30\n##END=",
      "chemical/x-jcamp-dx",
    );
    const blocks = await parseLabFiles([file]);

    expect(blocks.some((block) => block.metadata.parser === "instrument/jcamp")).toBe(true);
    expect(blocks.some((block) => block.block_type === "table")).toBe(true);
  });

  it("parses HPLC text exports into table blocks", async () => {
    const file = textFile(
      "hplc-export.txt",
      "Sample,Retention Time,Peak Area\nA,2.10,1500\nB,2.20,1800",
      "text/plain",
    );
    const blocks = await parseLabFiles([file]);

    expect(blocks[0].block_type).toBe("table");
    expect(blocks[0].metadata.parser).toBe("instrument/hplc-text");
  });

  it("creates and verifies a private-history JWT session", async () => {
    const env = { JWT_SECRET: "test-secret" };
    const token = await createSessionToken(env, "Student One");
    const session = await verifySessionToken(env, token);

    expect(session?.name).toBe("Student One");
    expect(session?.sub).toBe("lab-user-student-one");
  });

  it("builds a User System handoff URL with a Lab callback return target", () => {
    const loginUrl = buildUserSystemLoginUrl(
      { USER_SYSTEM_URL: "https://user.chemvault.science" },
      "https://lab.chemvault.science/api/auth/user-system/start?next=%2Fhistory",
      "/history",
    );
    const parsed = new URL(loginUrl);
    const returnTo = new URL(parsed.searchParams.get("returnTo") || "");

    expect(parsed.origin).toBe("https://user.chemvault.science");
    expect(parsed.pathname).toBe("/api/auth/handoff/start");
    expect(returnTo.origin).toBe("https://lab.chemvault.science");
    expect(returnTo.pathname).toBe("/auth/callback");
    expect(returnTo.searchParams.get("next")).toBe("/history");
  });

  it("keeps User System return targets local and away from API routes", () => {
    expect(sanitizeLocalReturnTo("/analyse")).toBe("/analyse");
    expect(sanitizeLocalReturnTo("/api/history")).toBe("/history");
    expect(sanitizeLocalReturnTo("https://example.test/history")).toBe("/history");
  });

  it("normalizes a User System profile response", () => {
    const profile = normalizeUserSystemProfile({
      authenticated: true,
      user: {
        id: "usr_123",
        name: "Student User",
        email: "student@example.test",
        system_role: "member",
      },
    });

    expect(profile?.id).toBe("usr_123");
    expect(profile?.name).toBe("Student User");
    expect(profile?.email).toBe("student@example.test");
  });

  it("uses cloud OCR adapter when configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          text: "Handwritten titration endpoint observed",
          confidence: 0.73,
        }),
      ),
    );
    const provider = new CloudOcrProvider("ocr-key", "https://ocr.example.test/extract");
    const block = await provider.extract({
      fileName: "notebook.png",
      mimeType: "image/png",
      buffer: new ArrayBuffer(4),
    });

    expect(block.content).toContain("titration");
    expect(block.confidence).toBe(0.73);
  });

  it("uses Cloudflare markdown OCR adapter when the AI binding is configured", async () => {
    const provider = new CloudflareMarkdownOcrProvider({
      toMarkdown: vi.fn(async () => ({
        id: "ocr-1",
        name: "notebook.pdf",
        mimeType: "application/pdf",
        format: "markdown",
        tokens: 42,
        data: "Column chromatography procedure: add silica, load sample, elute fractions.",
      })),
    } as unknown as Ai);
    const block = await provider.extract({
      fileName: "notebook.pdf",
      mimeType: "application/pdf",
      buffer: new ArrayBuffer(4),
    });

    expect(block.content).toContain("Column chromatography");
    expect(block.metadata.provider).toBe("cloudflare-markdown-ocr");
  });
});

function textFile(name: string, text: string, type: string) {
  return new File([text], name, { type });
}
