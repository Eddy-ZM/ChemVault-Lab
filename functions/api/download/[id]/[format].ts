import { verifySessionToken, getBearerToken } from "../../../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";
import { generateExcelWorkbook } from "../../../../src/excel/workbook";
import { generateLatexSummary } from "../../../../src/export/latex";
import { recordProductEvent } from "../../../../src/analytics/events";
import { getPersistedAnalysis } from "../../../../src/storage/serverStore";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const id = String(params.id || "");
  const format = String(params.format || "");
  const token = getBearerToken(request) || new URL(request.url).searchParams.get("token");
  const session = await verifySessionToken(env, token);
  const record = await getPersistedAnalysis(env, id, session?.sub || null);

  if (!record) {
    return Response.json(
      {
        error: "Analysis not found in temporary MVP storage. Re-run the analysis or configure D1/R2 persistence.",
      },
      { status: 404 },
    );
  }

  if (["json", "markdown", "md", "latex", "tex", "xlsx"].includes(format)) {
    await recordProductEvent(env, {
      eventName: "export_downloaded",
      subjectId: session?.sub,
      properties: { format: format === "md" ? "markdown" : format === "tex" ? "latex" : format },
    });
  }

  if (format === "json") {
    return new Response(JSON.stringify(record.analysis, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${record.excelFilename.replace(/\.xlsx$/, ".json")}"`,
      },
    });
  }

  if (format === "markdown" || format === "md") {
    return new Response(record.markdown, {
      headers: {
        "Content-Type": "text/markdown;charset=utf-8",
        "Content-Disposition": `attachment; filename="${record.excelFilename.replace(/\.xlsx$/, ".md")}"`,
      },
    });
  }

  if (format === "latex" || format === "tex") {
    return new Response(record.latex || generateLatexSummary(record.analysis), {
      headers: {
        "Content-Type": "application/x-tex;charset=utf-8",
        "Content-Disposition": `attachment; filename="${record.excelFilename.replace(/\.xlsx$/, ".tex")}"`,
      },
    });
  }

  if (format === "xlsx") {
    const excelBuffer = record.excelBuffer || (await generateExcelWorkbook(record.analysis));
    return new Response(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${record.excelFilename}"`,
      },
    });
  }

  return Response.json({ error: "Unsupported download format" }, { status: 400 });
};
