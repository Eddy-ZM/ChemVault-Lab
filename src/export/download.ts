import type { LabAnalysis } from "../schemas/labSchema";
import { fetchWithAuth } from "../auth/client";
import type { ArtifactFormat } from "../files/types";

export async function downloadAnalysisArtifact(analysis: LabAnalysis, format: ArtifactFormat) {
  if (format === "json") {
    downloadBlob(
      new Blob([JSON.stringify(analysis, null, 2)], { type: "application/json" }),
      `${makeBaseName(analysis)}.json`,
    );
    return;
  }

  if (format === "markdown") {
    const { generateMarkdownSummary } = await import("./markdown");
    downloadBlob(
      new Blob([generateMarkdownSummary(analysis)], { type: "text/markdown;charset=utf-8" }),
      `${makeBaseName(analysis)}.md`,
    );
    return;
  }

  if (format === "latex") {
    const { generateLatexSummary } = await import("./latex");
    downloadBlob(
      new Blob([generateLatexSummary(analysis)], { type: "application/x-tex;charset=utf-8" }),
      `${makeBaseName(analysis)}.tex`,
    );
    return;
  }

  const { generateExcelWorkbook, makeExcelFilename } = await import("../excel/workbook");
  const buffer = await generateExcelWorkbook(analysis);
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    makeExcelFilename(analysis),
  );
}

export async function downloadRemoteArtifact(url: string, filename: string) {
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw new Error("Download failed");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  downloadBlob(blob, match?.[1] || filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function makeBaseName(analysis: LabAnalysis) {
  const title = (analysis.experiment_summary.experiment_title || "experiment")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "experiment";
  const date = (analysis.experiment_summary.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "-");
  return `chemvault_lab_${title}_${date}`;
}
