import type { LabAnalysis } from "../schemas/labSchema";

export function generateMarkdownSummary(analysis: LabAnalysis): string {
  const summary = analysis.experiment_summary;
  const lines = [
    `# ${summary.experiment_title || "ChemVault Lab Analysis"}`,
    "",
    "## Experiment Summary",
    "",
    `- Experiment type: ${summary.experiment_type}`,
    `- Detected reaction: ${summary.detected_reaction}`,
    `- Reaction confidence: ${summary.reaction_confidence}`,
    `- Aim: ${summary.aim || "Missing"}`,
    `- Date: ${summary.date || "Missing"}`,
    `- Course: ${summary.course || "Missing"}`,
    `- Student / operator: ${summary.operator || "Missing"}`,
    `- Source files: ${summary.source_files.join(", ") || "Missing"}`,
    "",
    "## Extracted Chemicals",
    "",
    "| Role | Chemical | Mass | Volume | Moles | Source | Notes |",
    "| --- | --- | ---: | ---: | ---: | --- | --- |",
    ...analysis.reaction_table.map((row) =>
      [
        row.role,
        row.chemical_name,
        formatWithUnit(row.mass, row.mass_unit),
        formatWithUnit(row.volume, row.volume_unit),
        formatWithUnit(row.moles, "mol"),
        row.source_reference || "Missing",
        row.notes || "",
      ].join(" | "),
    ),
    "",
    "## Procedure Timeline",
    "",
    ...analysis.procedure_timeline.map((step) => `${step.step_number}. ${step.operation || "Missing"} (${step.confidence})`),
    "",
    "## Missing Or Uncertain Data",
    "",
    ...analysis.missing_data.map((item) => `- ${item.item}: ${item.why_it_matters} Check: ${item.suggested_user_check}. Severity: ${item.severity}`),
    "",
    "## Warnings",
    "",
    ...analysis.warnings.map((warning) => `- ${warning.type}: ${warning.message} (${warning.severity})`),
  ];

  return lines.join("\n");
}

function formatWithUnit(value: number | null, unit: string) {
  if (value === null) return "";
  return `${value}${unit ? ` ${unit}` : ""}`;
}
