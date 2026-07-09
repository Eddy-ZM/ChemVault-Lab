import type {
  Calculation,
  ConfidenceLevel,
  ExperimentType,
  LabAnalysis,
  ParsedDocumentBlock,
  ReactionRow,
  RawDataTable,
} from "./types";
import type { AnalysisUserOptions } from "../files/types";
import { experimentTypes } from "../schemas/labSchema";

const reactionHints = [
  { pattern: /esterification|fischer/i, name: "Fischer esterification", reactionClass: "Esterification" },
  { pattern: /aspirin|acetylsalicylic|salicylic/i, name: "Aspirin synthesis", reactionClass: "Acylation" },
  { pattern: /grignard/i, name: "Grignard reaction", reactionClass: "Carbon-carbon bond formation" },
  { pattern: /aldol/i, name: "Aldol reaction", reactionClass: "Carbon-carbon bond formation" },
  { pattern: /sn1|substitution.*unimolecular/i, name: "SN1 substitution", reactionClass: "Nucleophilic substitution" },
  { pattern: /sn2|substitution.*bimolecular/i, name: "SN2 substitution", reactionClass: "Nucleophilic substitution" },
  { pattern: /oxidation|permanganate|dichromate/i, name: "Oxidation", reactionClass: "Redox" },
  { pattern: /reduction|sodium borohydride|lithium aluminium hydride/i, name: "Reduction", reactionClass: "Redox" },
];

const chemicalDescriptors = [
  { name: "acetic acid", role: "reagent" },
  { name: "acetic anhydride", role: "reagent" },
  { name: "acetone", role: "solvent" },
  { name: "acetylsalicylic acid", role: "product" },
  { name: "ethanol", role: "solvent" },
  { name: "ethyl acetate", role: "solvent" },
  { name: "hexane", role: "solvent" },
  { name: "hydrochloric acid", role: "reagent" },
  { name: "methanol", role: "solvent" },
  { name: "phenol", role: "unknown" },
  { name: "salicylic acid", role: "reactant" },
  { name: "sodium hydroxide", role: "reagent" },
  { name: "sulfuric acid", role: "catalyst" },
  { name: "water", role: "solvent" },
  {
    name: "spearmint oil",
    role: "unknown",
    notes: "Sample mixture for chromatographic separation",
  },
  {
    name: "silica",
    role: "unknown",
    formula: "SiO2",
    aliases: ["silica gel", "stationary phase"],
    notes: "Stationary phase for TLC or flash column chromatography",
  },
  {
    name: "zinc sulfide",
    role: "reagent",
    formula: "ZnS",
    aliases: ["zinc sulphide", "ZnS"],
    notes: "TLC plate fluorescence indicator when explicitly present",
  },
  {
    name: "potassium permanganate",
    role: "reagent",
    formula: "KMnO4",
    aliases: ["KMnO4", "alkaline KMnO4", "permanganate"],
    hazards: ["strong oxidant"],
    notes: "TLC staining reagent when explicitly present",
  },
  {
    name: "eluent / solvent system",
    role: "solvent",
    aliases: ["eluent", "solvent system", "mobile phase"],
    notes: "Composition must be taken from the user's TLC record when available",
  },
] satisfies Array<{
  name: string;
  role: ReactionRow["role"];
  formula?: string;
  aliases?: string[];
  hazards?: string[];
  notes?: string;
}>;

export interface DocumentClassification {
  documents: Array<{
    source_file: string;
    document_type: string;
    confidence: ConfidenceLevel;
    reason: string;
  }>;
}

export interface ExperimentDetection {
  experiment_title: string;
  experiment_type: ExperimentType;
  aim: string;
  confidence: ConfidenceLevel;
  workflow_types: ExperimentType[];
}

export interface ReactionDetection {
  detected_reaction: string;
  reaction_class: string;
  reaction_confidence: ConfidenceLevel;
  alternative_possibilities: string[];
  uncertainty_reason: string;
}

export function classifyDocuments(blocks: ParsedDocumentBlock[]): DocumentClassification {
  return {
    documents: blocks.map((block) => {
      const text = `${block.source_file} ${block.content}`.toLowerCase();
      let documentType = "mixed or unknown";
      if (/handout|worksheet|instruction|manual|aim|objective/.test(text)) documentType = "experiment handout";
      if (/notebook|observation|procedure|date|student|operator/.test(text)) documentType = "lab notebook";
      if (block.block_type === "table" || /trial|peak area|absorbance|titre|retention time/.test(text)) {
        documentType = "raw data table";
      }
      if (block.block_type === "image_ocr") documentType = "image requiring OCR";

      return {
        source_file: block.source_file,
        document_type: documentType,
        confidence: block.block_type === "image_ocr" ? "low" : "medium",
        reason: `Detected from ${block.block_type} block and filename cues`,
      };
    }),
  };
}

export function detectExperiment(blocks: ParsedDocumentBlock[], options: AnalysisUserOptions): ExperimentDetection {
  const explicitTitle = options.experimentName?.trim();
  const contentCorpus = getContentCorpus(blocks);
  const titleCorpus = getCorpus(blocks, [explicitTitle, options.courseName].filter(Boolean).join("\n"));
  const workflowTypes = detectExperimentWorkflow(contentCorpus);
  const titleFallbackTypes =
    workflowTypes.length === 0
      ? detectExperimentWorkflow([explicitTitle, options.courseName].filter(Boolean).join("\n"), false)
      : [];
  const type = workflowTypes[0] || titleFallbackTypes[0] || "Unknown / uncertain";
  const titleFromText = findTitle(titleCorpus, type);

  return {
    experiment_title: explicitTitle || titleFromText || type,
    experiment_type: type,
    aim: findAim(contentCorpus) || "Missing",
    confidence: type === "Unknown / uncertain" ? "low" : "medium",
    workflow_types: workflowTypes.length > 0 ? workflowTypes : titleFallbackTypes,
  };
}

export function detectReaction(blocks: ParsedDocumentBlock[], experimentType: ExperimentType): ReactionDetection {
  const corpus = getCorpus(blocks);
  if (!/Organic synthesis|General wet lab experiment|Unknown \/ uncertain/.test(experimentType)) {
    return {
      detected_reaction: "Not a reaction-centred experiment",
      reaction_class: "Not applicable",
      reaction_confidence: "medium",
      alternative_possibilities: [],
      uncertainty_reason: "The experiment type is mainly analytical or procedural",
    };
  }

  const hint = reactionHints.find((candidate) => candidate.pattern.test(corpus));
  if (hint) {
    return {
      detected_reaction: hint.name,
      reaction_class: hint.reactionClass,
      reaction_confidence: "medium",
      alternative_possibilities: [],
      uncertainty_reason: "",
    };
  }

  if (experimentType === "Organic synthesis") {
    return {
      detected_reaction: "Unknown organic reaction",
      reaction_class: "Unknown / uncertain",
      reaction_confidence: "low",
      alternative_possibilities: ["Likely synthesis reaction, but no clear reaction name was found"],
      uncertainty_reason: "The source text does not contain a confident reaction name or distinctive reagent pattern",
    };
  }

  return {
    detected_reaction: experimentType === "Unknown / uncertain" ? "Unknown" : "Not a reaction-centred experiment",
    reaction_class: "Not applicable",
    reaction_confidence: experimentType === "Unknown / uncertain" ? "low" : "medium",
    alternative_possibilities: [],
    uncertainty_reason:
      experimentType === "Unknown / uncertain"
        ? "Document evidence was insufficient"
        : "The experiment type is mainly analytical or procedural",
  };
}

export function extractChemicals(blocks: ParsedDocumentBlock[]): ReactionRow[] {
  const corpus = getCorpus(blocks);
  const rows = chemicalDescriptors.flatMap<ReactionRow>((descriptor) => {
    const matchedAlias = [descriptor.name, ...(descriptor.aliases || [])].find((alias) =>
      new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(corpus),
    );
    if (!matchedAlias) return [];

    const context = findContext(corpus, matchedAlias);
    const quantity = context.match(/(\d+(?:\.\d+)?)\s*(mg|g|kg|mL|L|uL|mmol|mol|M)\b/i);
    const amount = quantity ? Number(quantity[1]) : null;
    const unit = quantity?.[2] || "";
    return {
      role: descriptor.role,
      chemical_name: titleCase(descriptor.name),
      formula: descriptor.formula || "",
      cas_number: "",
      molecular_weight: null,
      mass: unit.match(/mg|g|kg/i) ? amount : null,
      mass_unit: unit.match(/mg|g|kg/i) ? unit : "",
      volume: unit.match(/mL|L|uL/i) ? amount : null,
      volume_unit: unit.match(/mL|L|uL/i) ? unit : "",
      density: null,
      density_unit: "",
      concentration: unit === "M" ? amount : null,
      concentration_unit: unit === "M" ? unit : "",
      moles: unit.match(/mol|mmol/i) ? amount : null,
      equivalents: null,
      hazards: descriptor.hazards || [],
      notes: descriptor.notes || (amount === null ? "Quantity missing from extracted text" : ""),
      source_reference: findSourceReference(blocks, matchedAlias),
    };
  });

  if (rows.length > 0) return rows;

  return [
    {
      role: "unknown",
      chemical_name: "Missing",
      formula: "",
      cas_number: "",
      molecular_weight: null,
      mass: null,
      mass_unit: "",
      volume: null,
      volume_unit: "",
      density: null,
      density_unit: "",
      concentration: null,
      concentration_unit: "",
      moles: null,
      equivalents: null,
      hazards: [],
      notes: "No chemical names were confidently extracted",
      source_reference: "",
    },
  ];
}

export function extractRawData(blocks: ParsedDocumentBlock[], experimentType: ExperimentType) {
  const tables = blocks
    .filter((block) => block.block_type === "table")
    .map<RawDataTable>((block) => ({
      table_name: `${block.source_file} ${block.page_or_sheet}`.trim(),
      columns: toStringArray(block.metadata.columns),
      rows: Array.isArray(block.metadata.rows) ? (block.metadata.rows as Record<string, unknown>[]) : [],
      source_reference: `${block.source_file} ${block.page_or_sheet}`.trim(),
    }));

  return {
    data_type: experimentType,
    tables:
      tables.length > 0
        ? tables
        : [
            {
              table_name: `${experimentType} raw data`,
              columns: suggestedRawDataColumns(experimentType),
              rows: [],
              source_reference: "Missing",
            },
          ],
  };
}

export function identifyCalculations(analysis: Pick<LabAnalysis, "experiment_summary" | "raw_data">): Calculation[] {
  const type = analysis.experiment_summary.experiment_type;
  const templates: Record<string, Calculation[]> = {
    Titration: [
      calculation("Average titre", "sum(titres) / trial_count", "mL"),
      calculation("Analyte concentration", "C1V1 = C2V2", "mol L-1"),
    ],
    HPLC: [
      calculation("Calibration equation", "response = slope * concentration + intercept", ""),
      calculation("Sample concentration", "(peak_area - intercept) / slope", "concentration unit"),
    ],
    "UV-Vis": [
      calculation("Calibration curve concentration", "absorbance = slope * concentration + intercept", ""),
      calculation("Beer-Lambert estimate", "A = epsilon * l * c", "mol L-1"),
    ],
    TLC: [calculation("Rf value", "distance_spot / distance_solvent_front", "")],
    Purification: [
      calculation("Percent recovery", "recovered_mass / starting_mass * 100", "%"),
      calculation("Fraction recovery", "fraction_mass / total_recovered_mass * 100", "%"),
    ],
    "Organic synthesis": [
      calculation("Theoretical yield", "limiting_reagent_moles * product_molecular_weight", "g"),
      calculation("Percentage yield", "actual_yield / theoretical_yield * 100", "%"),
    ],
  };

  return templates[type] || [calculation("Experiment-specific calculation", "Missing source values", "")];
}

export function extractProcedure(blocks: ParsedDocumentBlock[]) {
  const materialNames = chemicalDescriptors.map((descriptor) => descriptor.name);
  const lines = getCorpus(blocks)
    .split(/\n|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter((line) =>
      /\b(add|mix|heat|cool|filter|wash|dry|titrate|inject|measure|record|stir|reflux|load|elute|collect|separate)\b/i.test(line),
    )
    .slice(0, 12);

  return (lines.length ? lines : ["Missing procedure details"]).map((line, index) => ({
    step_number: index + 1,
    operation: line,
    materials: materialNames.filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(line)).map(titleCase),
    quantity: line.match(/\d+(?:\.\d+)?\s*(mg|g|kg|mL|L|uL|mmol|mol|M)\b/i)?.[0] || "",
    temperature: line.match(/\d+(?:\.\d+)?\s*(?:deg\s*C|C|degrees C|K)\b/i)?.[0] || "",
    time: line.match(/\d+(?:\.\d+)?\s*(?:s|min|h|hr|hours|minutes)\b/i)?.[0] || "",
    observation: /(colour|color|precipitate|gas|cloudy|clear|solid|crystal)/i.test(line) ? line : "",
    source_reference: "",
    confidence: line === "Missing procedure details" ? ("low" as const) : ("medium" as const),
  }));
}

export function extractObservations(blocks: ParsedDocumentBlock[]) {
  const lines = getCorpus(blocks)
    .split(/\n|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter((line) => /(observ|colour|color|precipitate|gas|cloudy|clear|crystal|phase|temperature)/i.test(line))
    .slice(0, 20);

  return lines.map((line, index) => ({
    step: String(index + 1),
    time: line.match(/\d+(?:\.\d+)?\s*(?:s|min|h|hr|hours|minutes)\b/i)?.[0] || "",
    observation: line,
    colour_change: /(colour|color)/i.test(line) ? line : "",
    phase_change: /phase|solid|liquid|crystal/i.test(line) ? line : "",
    precipitate: /precipitate/i.test(line) ? line : "",
    gas_evolution: /gas|bubble|effervescence/i.test(line) ? line : "",
    temperature_change: /temperature|warm|cool|heat/i.test(line) ? line : "",
    source_reference: "",
  }));
}

export function buildMissingData(analysis: LabAnalysis) {
  const missing = [];
  const summary = analysis.experiment_summary;

  if (!summary.date) {
    missing.push({
      item: "Experiment date",
      why_it_matters: "Needed for lab report metadata and file naming",
      suggested_user_check: "Check the notebook heading or course record",
      severity: "medium" as const,
    });
  }

  if (analysis.reaction_table.every((row) => row.chemical_name === "Missing" || row.mass === null && row.volume === null && row.moles === null)) {
    missing.push({
      item: "Chemical quantities",
      why_it_matters: "Needed for stoichiometry and yield calculations",
      suggested_user_check: "Confirm masses, volumes, concentrations, and units from the original record",
      severity: "high" as const,
    });
  }

  if (analysis.raw_data.tables.every((table) => table.rows.length === 0)) {
    missing.push({
      item: "Raw data rows",
      why_it_matters: "Needed for calculations and plot-ready tables",
      suggested_user_check: "Upload the original CSV/XLSX data file or a clearer table image",
      severity: "high" as const,
    });
  }

  return missing;
}

export function buildBaseAnalysis(
  blocks: ParsedDocumentBlock[],
  options: AnalysisUserOptions,
  detection = detectExperiment(blocks, options),
  reaction = detectReaction(blocks, detection.experiment_type),
): LabAnalysis {
  const workflowTypes = Array.isArray(detection.workflow_types)
    ? detection.workflow_types
    : detectExperiment(blocks, options).workflow_types;
  const analysis: LabAnalysis = {
    experiment_summary: {
      experiment_title: detection.experiment_title,
      experiment_type: detection.experiment_type,
      detected_reaction: reaction.detected_reaction,
      reaction_confidence: reaction.reaction_confidence,
      aim: detection.aim,
      date: options.experimentDate || "",
      course: options.courseName || "",
      operator: options.operatorName || "",
      source_files: Array.from(new Set(blocks.map((block) => block.source_file))),
      overall_confidence: detection.confidence,
      notes: [
        `Handout handling: ${options.uploadIntent}`,
        `Output language: ${options.outputLanguage}`,
        workflowTypes.length > 1 ? `Detected workflow order: ${workflowTypes.join(" -> ")}` : "",
        reaction.uncertainty_reason,
      ].filter(Boolean),
    },
    reaction_table: extractChemicals(blocks),
    procedure_timeline: extractProcedure(blocks),
    raw_data: extractRawData(blocks, detection.experiment_type),
    calculations: [],
    observations: extractObservations(blocks),
    missing_data: [],
    warnings: [],
  };

  analysis.calculations = identifyCalculations(analysis);
  analysis.missing_data = buildMissingData(analysis);
  return analysis;
}

function detectExperimentWorkflow(corpus: string, stripOpeningTitle = true): ExperimentType[] {
  const workflowCorpus = stripOpeningTitle ? removeOpeningTitleMarker(corpus) : corpus;
  const signals: Array<[RegExp, ExperimentType]> = [
    [/hplc|retention time|peak area|chromatogram/i, "HPLC"],
    [/\buv[-\s]?vis\b|absorbance|wavelength|beer[-\s]?lambert/i, "UV-Vis"],
    [/\btlc\b|thin[-\s]?layer chromatography|rf value|solvent front|spot travelled/i, "TLC"],
    [/titration|burette|titre|endpoint/i, "Titration"],
    [/column\s+chromatography|flash\s+chromatography|flash\s+column|pack(?:ing)?\s+(?:the\s+)?column|load(?:ing)?\s+(?:the\s+)?column|elut(?:e|ing)\s+fractions?|chromatographic\s+separation|separat(?:e|ing)\s+mixtures/i, "Purification"],
    [/\bnmr\b|chemical shift|multiplicity|integration/i, "NMR analysis"],
    [/\bir\b|infrared|wavenumber|ftir/i, "IR analysis"],
    [/enzyme|michaelis|vmax|km\b/i, "Enzyme kinetics"],
    [/calibration curve|standard curve/i, "Calibration curve"],
    [/distillation|boiling point/i, "Distillation"],
    [/recrystall/i, "Recrystallisation"],
    [/liquid[-\s]?liquid extraction|solvent extraction|separatory funnel|partition coefficient|partitioning between/i, "Extraction"],
    [/rate constant|kinetics|first order|second order/i, "Kinetics"],
    [/\borganic\s+synthesis\b|\bsynthesis\b(?!\s+chemistry)|\bsynthesi[sz](?:e|ed|ing)?\b|acetylsalicylic|reactant|reflux|limiting reagent/i, "Organic synthesis"],
  ];
  const seen = new Set<ExperimentType>();

  return signals
    .flatMap(([pattern, type]) => {
      const match = pattern.exec(workflowCorpus);
      return match?.index === undefined ? [] : [{ type, index: match.index }];
    })
    .sort((left, right) => left.index - right.index)
    .flatMap(({ type }) => {
      if (seen.has(type)) return [];
      seen.add(type);
      return [type];
    });
}

function findTitle(corpus: string, fallbackType: ExperimentType) {
  const titleLine = corpus
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => /experiment|lab|synthesis|titration|hplc|uv[-\s]?vis|tlc/i.test(line) && line.length < 100);
  return titleLine || (fallbackType !== "Unknown / uncertain" ? fallbackType : "");
}

function findAim(corpus: string) {
  return corpus.match(/(?:aim|objective|purpose)\s*:?\s*([^\n.]+(?:\.[^\n.]+)?)/i)?.[1]?.trim() || "";
}

function suggestedRawDataColumns(type: ExperimentType) {
  const suggestions: Record<string, string[]> = {
    Titration: ["Trial", "Initial Burette Reading", "Final Burette Reading", "Titre", "Average Titre"],
    HPLC: ["Sample", "Retention Time", "Peak Area", "Concentration", "Calibration Equation"],
    "UV-Vis": ["Sample", "Wavelength", "Absorbance", "Concentration", "pH"],
    "NMR analysis": ["Peak", "Chemical Shift", "Integration", "Multiplicity", "Assignment"],
    TLC: ["Spot", "Solvent System", "Distance Spot Travelled", "Distance Solvent Front", "Rf"],
    Purification: ["Fraction", "Eluent / Solvent System", "Observation", "Collected Volume", "Recovered Mass", "Percent Recovery"],
    "Organic synthesis": ["Crude Mass", "Purified Mass", "Theoretical Yield", "Percentage Yield", "Melting Point"],
  };
  return suggestions[type] || ["Measurement", "Value", "Unit", "Notes"];
}

function calculation(name: string, formula: string, unit: string): Calculation {
  return {
    name,
    formula,
    inputs: {},
    result: null,
    unit,
    calculation_status: "insufficient_data",
    source_data: "Missing",
    confidence: "low",
    notes: "Source values are missing or incomplete; calculation not performed",
  };
}

function getCorpus(blocks: ParsedDocumentBlock[], extra = "") {
  return normalizeCorpusText(
    [extra, ...blocks.map((block) => `${block.source_file}\n${block.content}`)]
      .filter(Boolean)
      .join("\n\n"),
  );
}

function getContentCorpus(blocks: ParsedDocumentBlock[]) {
  return normalizeCorpusText(blocks.map((block) => block.content).join("\n\n"));
}

function removeOpeningTitleMarker(corpus: string) {
  const titleAnchors = [
    "aims and intended learning outcomes",
    "introduction",
  ];
  const lower = corpus.toLowerCase();
  const anchorIndex = titleAnchors
    .map((anchor) => lower.indexOf(anchor))
    .filter((index) => index > 0 && index < 1500)
    .sort((left, right) => left - right)[0];
  if (anchorIndex !== undefined) return corpus.slice(anchorIndex);

  const firstBreak = corpus.indexOf("\n");
  const firstLine = firstBreak >= 0 ? corpus.slice(0, firstBreak).trim() : "";
  if (
    firstLine &&
    firstLine.length < 180 &&
    /experiment|chromatography|synthesis|titration|analysis/i.test(firstLine) &&
    !/\t|,/.test(firstLine)
  ) {
    return corpus.slice(firstBreak + 1);
  }
  return corpus;
}

function findSourceReference(blocks: ParsedDocumentBlock[], term: string) {
  const block = blocks.find((candidate) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(candidate.content));
  return block ? `${block.source_file} ${block.page_or_sheet}`.trim() : "";
}

function findContext(corpus: string, term: string) {
  const match = new RegExp(`[^.\\n]{0,160}\\b${escapeRegExp(term)}\\b[^.\\n]{0,160}`, "i").exec(corpus);
  return match?.[0] || "";
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCorpusText(value: string) {
  const plusAsSpace = value.replace(/\+/g, " ");
  let decoded = plusAsSpace;
  try {
    decoded = decodeURIComponent(plusAsSpace);
  } catch {
    decoded = plusAsSpace;
  }
  return decoded.replace(/_/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

export { experimentTypes };
