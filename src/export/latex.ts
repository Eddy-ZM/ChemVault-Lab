import type { LabAnalysis } from "../schemas/labSchema";

export function generateLatexSummary(analysis: LabAnalysis): string {
  const summary = analysis.experiment_summary;
  const title = latexText(summary.experiment_title || "ChemVault Lab Analysis");
  const author = latexText(summary.operator || "ChemVault Lab");
  const date = summary.date ? latexText(summary.date) : "\\today";

  return [
    "\\documentclass[11pt]{article}",
    "\\usepackage[margin=1in]{geometry}",
    "\\usepackage{array}",
    "\\usepackage{booktabs}",
    "\\usepackage{longtable}",
    "\\usepackage{hyperref}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[utf8]{inputenc}",
    "",
    `\\title{${title}}`,
    `\\author{${author}}`,
    `\\date{${date}}`,
    "",
    "\\begin{document}",
    "\\maketitle",
    "",
    "\\section*{Experiment Summary}",
    keyValueTable([
      ["Experiment type", summary.experiment_type],
      ["Detected reaction", summary.detected_reaction || "Unknown"],
      ["Reaction confidence", summary.reaction_confidence],
      ["Overall confidence", summary.overall_confidence],
      ["Aim / objective", summary.aim || "Missing"],
      ["Course", summary.course || "Missing"],
      ["Source files", summary.source_files.join(", ") || "Missing"],
    ]),
    listBlock("Notes", summary.notes),
    "",
    "\\section*{Reaction Table}",
    simpleTable(
      ["Role", "Chemical", "Formula", "Mass", "Volume", "Moles", "Source", "Notes"],
      analysis.reaction_table.map((row) => [
        row.role,
        row.chemical_name || "Missing",
        row.formula,
        withUnit(row.mass, row.mass_unit),
        withUnit(row.volume, row.volume_unit),
        withUnit(row.moles, "mol"),
        row.source_reference || "Missing",
        row.notes,
      ]),
    ),
    "",
    "\\section*{Procedure Timeline}",
    simpleTable(
      ["Step", "Operation", "Materials", "Quantity", "Temperature", "Time", "Observation", "Confidence"],
      analysis.procedure_timeline.map((step) => [
        String(step.step_number),
        step.operation || "Missing",
        step.materials.join(", "),
        step.quantity,
        step.temperature,
        step.time,
        step.observation,
        step.confidence,
      ]),
    ),
    "",
    "\\section*{Raw Data}",
    rawDataTables(analysis),
    "",
    "\\section*{Calculations}",
    simpleTable(
      ["Name", "Formula", "Inputs", "Result", "Unit", "Status", "Confidence", "Notes"],
      analysis.calculations.map((calculation) => [
        calculation.name,
        calculation.formula,
        JSON.stringify(calculation.inputs),
        valueText(calculation.result),
        calculation.unit,
        calculation.calculation_status,
        calculation.confidence,
        calculation.notes,
      ]),
    ),
    "",
    "\\section*{Observations}",
    simpleTable(
      ["Step / time", "Observation", "Colour", "Phase", "Precipitate", "Gas", "Temperature", "Source"],
      analysis.observations.map((observation) => [
        [observation.step, observation.time].filter(Boolean).join(" / "),
        observation.observation,
        observation.colour_change,
        observation.phase_change,
        observation.precipitate,
        observation.gas_evolution,
        observation.temperature_change,
        observation.source_reference,
      ]),
    ),
    "",
    "\\section*{Issues and Missing Data}",
    simpleTable(
      ["Missing item", "Why it matters", "Suggested check", "Severity"],
      analysis.missing_data.map((item) => [
        item.item,
        item.why_it_matters,
        item.suggested_user_check,
        item.severity,
      ]),
    ),
    "",
    "\\section*{Warnings}",
    simpleTable(
      ["Type", "Message", "Severity"],
      analysis.warnings.map((warning) => [warning.type, warning.message, warning.severity]),
    ),
    "",
    "\\end{document}",
    "",
  ].join("\n");
}

function keyValueTable(rows: Array<[string, string]>) {
  return simpleTable(["Field", "Value"], rows);
}

function rawDataTables(analysis: LabAnalysis) {
  if (analysis.raw_data.tables.length === 0) return "No raw data tables were extracted.";
  return analysis.raw_data.tables
    .map((table) => {
      const columns = table.columns.length > 0 ? table.columns : ["Value"];
      const rows = table.rows.map((row) => columns.map((column) => valueText(row[column])));
      return [
        `\\subsection*{${latexText(table.table_name || "Raw Data Table")}}`,
        table.source_reference ? `Source: ${latexText(table.source_reference)}` : "",
        simpleTable(columns, rows),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function simpleTable(headers: string[], rows: string[][]) {
  const safeRows = rows.length > 0 ? rows : [headers.map(() => "Missing")];
  const layout = headers.map(() => "p{0.16\\linewidth}").join("");
  return [
    `\\begin{longtable}{${layout}}`,
    "\\toprule",
    `${headers.map(latexText).join(" & ")} \\\\`,
    "\\midrule",
    ...safeRows.map((row) => `${headers.map((_, index) => latexText(row[index] || "")).join(" & ")} \\\\`),
    "\\bottomrule",
    "\\end{longtable}",
  ].join("\n");
}

function withUnit(value: number | null, unit: string) {
  if (value === null) return "";
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function listBlock(title: string, values: string[]) {
  if (values.length === 0) return "";
  return [`\\subsection*{${latexText(title)}}`, "\\begin{itemize}", ...values.map((value) => `\\item ${latexText(value)}`), "\\end{itemize}"].join("\n");
}

function latexText(value: string) {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
