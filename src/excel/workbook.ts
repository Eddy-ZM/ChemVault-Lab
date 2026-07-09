import ExcelJS from "exceljs";
import type { LabAnalysis, RawDataTable } from "../schemas/labSchema";

const headerFill = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFEAF4F7" },
};

export async function generateExcelWorkbook(analysis: LabAnalysis): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ChemVault Lab";
  workbook.created = new Date();
  workbook.modified = new Date();

  addExperimentSummary(workbook, analysis);
  addReactionTable(workbook, analysis);
  addProcedureTimeline(workbook, analysis);
  addRawData(workbook, analysis.raw_data.tables);
  addCalculations(workbook, analysis);
  addObservations(workbook, analysis);
  addIssues(workbook, analysis);

  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function makeExcelFilename(analysis: LabAnalysis): string {
  const title = slugify(analysis.experiment_summary.experiment_title || "experiment");
  const date = (analysis.experiment_summary.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "-");
  return `chemvault_lab_${title}_${date}.xlsx`;
}

function addExperimentSummary(workbook: ExcelJS.Workbook, analysis: LabAnalysis) {
  const summary = analysis.experiment_summary;
  const rows = [
    ["Experiment Title", summary.experiment_title],
    ["Experiment Type", summary.experiment_type],
    ["Detected Reaction", summary.detected_reaction],
    ["Aim / Objective", summary.aim],
    ["Date", summary.date],
    ["Course", summary.course],
    ["Student / Operator", summary.operator],
    ["Source Files", summary.source_files.join("; ")],
    ["Confidence Level", summary.overall_confidence],
    ["Notes / Warnings", [...summary.notes, ...analysis.warnings.map((warning) => warning.message)].join("; ")],
  ];
  const sheet = workbook.addWorksheet("Experiment Summary");
  sheet.addRow(["Field", "Value"]);
  rows.forEach((row) => sheet.addRow(row));
  finishSheet(sheet);
}

function addReactionTable(workbook: ExcelJS.Workbook, analysis: LabAnalysis) {
  const sheet = workbook.addWorksheet("Reaction Table");
  const columns = [
    "Role",
    "Chemical Name",
    "Formula",
    "CAS Number",
    "Molecular Weight",
    "Mass Used",
    "Mass Unit",
    "Volume Used",
    "Volume Unit",
    "Density",
    "Concentration",
    "Moles",
    "Equivalents",
    "Solvent / Reagent / Catalyst / Product",
    "Hazards",
    "Source",
    "Notes",
  ];
  sheet.addRow(columns);
  analysis.reaction_table.forEach((row) => {
    sheet.addRow([
      row.role,
      row.chemical_name,
      row.formula,
      row.cas_number,
      row.molecular_weight,
      row.mass,
      row.mass_unit,
      row.volume,
      row.volume_unit,
      row.density,
      row.concentration,
      row.moles,
      row.equivalents,
      row.role,
      row.hazards.join("; "),
      row.source_reference,
      row.notes,
    ]);
  });
  finishSheet(sheet, [5, 6, 8, 10, 11, 12, 13]);
}

function addProcedureTimeline(workbook: ExcelJS.Workbook, analysis: LabAnalysis) {
  const sheet = workbook.addWorksheet("Procedure Timeline");
  sheet.addRow([
    "Step Number",
    "Operation",
    "Reagent / Material",
    "Quantity",
    "Temperature",
    "Time",
    "Observation",
    "Source Location",
    "Confidence",
    "Notes",
  ]);
  analysis.procedure_timeline.forEach((step) => {
    sheet.addRow([
      step.step_number,
      step.operation,
      step.materials.join("; "),
      step.quantity,
      step.temperature,
      step.time,
      step.observation,
      step.source_reference,
      step.confidence,
      "",
    ]);
  });
  finishSheet(sheet, [1]);
}

function addRawData(workbook: ExcelJS.Workbook, tables: RawDataTable[]) {
  const sheet = workbook.addWorksheet("Raw Data");
  const maxColumns = Math.max(1, ...tables.map((table) => table.columns.length));
  sheet.addRow(["Table Name", "Source", ...Array.from({ length: maxColumns }, (_, index) => `Column ${index + 1}`)]);

  tables.forEach((table) => {
    if (table.rows.length === 0) {
      sheet.addRow([table.table_name, table.source_reference, ...table.columns]);
      return;
    }

    sheet.addRow([table.table_name, table.source_reference, ...table.columns]);
    table.rows.forEach((row) => {
      sheet.addRow(["", "", ...table.columns.map((column) => row[column] ?? "")]);
    });
  });
  finishSheet(sheet);
}

function addCalculations(workbook: ExcelJS.Workbook, analysis: LabAnalysis) {
  const sheet = workbook.addWorksheet("Calculations");
  sheet.addRow([
    "Calculation Name",
    "Formula Used",
    "Input Values",
    "Result",
    "Unit",
    "Source Data",
    "Confidence Level",
    "Notes",
  ]);
  analysis.calculations.forEach((calculation) => {
    sheet.addRow([
      calculation.name,
      calculation.formula,
      JSON.stringify(calculation.inputs),
      calculation.result,
      calculation.unit,
      calculation.source_data,
      calculation.confidence,
      calculation.notes,
    ]);
  });
  finishSheet(sheet, [4]);
}

function addObservations(workbook: ExcelJS.Workbook, analysis: LabAnalysis) {
  const sheet = workbook.addWorksheet("Observations");
  sheet.addRow([
    "Time / Step",
    "Observation",
    "Colour Change",
    "Phase Change",
    "Precipitate",
    "Gas Evolution",
    "Temperature Change",
    "Other Notes",
  ]);
  analysis.observations.forEach((observation) => {
    sheet.addRow([
      observation.time || observation.step,
      observation.observation,
      observation.colour_change,
      observation.phase_change,
      observation.precipitate,
      observation.gas_evolution,
      observation.temperature_change,
      observation.source_reference,
    ]);
  });
  finishSheet(sheet);
}

function addIssues(workbook: ExcelJS.Workbook, analysis: LabAnalysis) {
  const sheet = workbook.addWorksheet("Issues and Missing Data");
  sheet.addRow(["Missing Item", "Why It Matters", "Suggested User Check", "Severity"]);
  analysis.missing_data.forEach((item) => {
    sheet.addRow([item.item, item.why_it_matters, item.suggested_user_check, item.severity]);
  });
  analysis.warnings.forEach((warning) => {
    sheet.addRow([warning.type, warning.message, "Review source document or provider configuration", warning.severity]);
  });
  finishSheet(sheet);
}

function finishSheet(sheet: ExcelJS.Worksheet, numericColumns: number[] = []) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FF102033" } };
  header.fill = headerFill;
  header.alignment = { vertical: "middle", wrapText: true };

  numericColumns.forEach((columnNumber) => {
    sheet.getColumn(columnNumber).numFmt = "0.000";
  });

  sheet.columns.forEach((column) => {
    let width = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value == null ? "" : String(cell.value);
      width = Math.max(width, Math.min(46, value.length + 2));
    });
    column.width = width;
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "experiment";
}
