import type { ChemVaultLabBindings } from "../db/bindings";
import type { AnalysisPipelineResult, LabFileLike, StoredAnalysisRecord } from "../files/types";
import { generateLatexSummary } from "../export/latex";
import { getServerAnalysis, putServerAnalysis } from "./memoryStore";

export interface ServerStoredAnalysis {
  id: string;
  analysis: AnalysisPipelineResult["analysis"];
  markdown: string;
  latex: string;
  excelBuffer?: ArrayBuffer;
  excelFilename: string;
  createdAt: string;
  ownerId: string;
  fileCount: number;
  artifactKeys: Record<string, string>;
}

export async function persistAnalysis(
  env: ChemVaultLabBindings,
  result: AnalysisPipelineResult,
  files: LabFileLike[],
  ownerId: string | null,
) {
  const owner = ownerId || "anonymous";
  const artifactKeys: Record<string, string> = {};

  if (env.LAB_BUCKET) {
    const baseKey = `analyses/${owner}/${result.id}`;
    artifactKeys.json = `${baseKey}/analysis.json`;
    artifactKeys.markdown = `${baseKey}/summary.md`;
    artifactKeys.latex = `${baseKey}/summary.tex`;
    artifactKeys.source_files = `${baseKey}/source-files/`;
    await env.LAB_BUCKET.put(artifactKeys.json, JSON.stringify(result.analysis, null, 2), {
      httpMetadata: { contentType: "application/json" },
    });
    await env.LAB_BUCKET.put(artifactKeys.markdown, result.markdown, {
      httpMetadata: { contentType: "text/markdown;charset=utf-8" },
    });
    await env.LAB_BUCKET.put(artifactKeys.latex, result.latex, {
      httpMetadata: { contentType: "application/x-tex;charset=utf-8" },
    });
    if (result.excelBuffer) {
      artifactKeys.xlsx = `${baseKey}/${result.excelFilename}`;
      await env.LAB_BUCKET.put(artifactKeys.xlsx, result.excelBuffer, {
        httpMetadata: {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    if (ownerId) {
      for (const file of files) {
        const key = `${baseKey}/source-files/${safeFileName(file.name)}`;
        await env.LAB_BUCKET.put(key, await file.arrayBuffer(), {
          httpMetadata: {
            contentType: file.type || "application/octet-stream",
          },
          customMetadata: {
            originalName: file.name,
          },
        });
      }
    }
  }

  if (env.LAB_DB && ownerId) {
    await env.LAB_DB.prepare(
      `INSERT OR REPLACE INTO lab_analyses
        (id, owner_id, created_at, experiment_title, experiment_type, file_count, status, excel_filename, analysis_json, markdown, artifact_keys_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        result.id,
        owner,
        result.createdAt,
        result.analysis.experiment_summary.experiment_title || "Untitled experiment",
        result.analysis.experiment_summary.experiment_type,
        result.fileCount,
        "complete",
        result.excelFilename,
        JSON.stringify(result.analysis),
        result.markdown,
        JSON.stringify(artifactKeys),
      )
      .run();

    for (const file of files) {
      await env.LAB_DB.prepare(
        `INSERT OR REPLACE INTO lab_files
          (id, analysis_id, owner_id, file_name, file_type, file_size, storage_key, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          `${result.id}:${file.name}:${file.size}`,
          result.id,
          owner,
          file.name,
          file.type || "unknown",
          file.size,
          "",
          result.createdAt,
        )
        .run();
    }
  } else {
    putServerAnalysis(result);
  }

  return artifactKeys;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160) || "source-file";
}

export async function getPersistedAnalysis(env: ChemVaultLabBindings, id: string, ownerId: string | null) {
  if (env.LAB_DB && ownerId) {
    const row = await env.LAB_DB.prepare("SELECT * FROM lab_analyses WHERE id = ? AND owner_id = ?")
      .bind(id, ownerId)
      .first<LabAnalysisRow>();
    if (!row) return null;
    return rowToStored(row, env);
  }

  const memory = getServerAnalysis(id);
  if (!memory) return null;
  return {
    id: memory.id,
    analysis: memory.analysis,
    markdown: memory.markdown,
    latex: memory.latex,
    excelBuffer: memory.excelBuffer,
    excelFilename: memory.excelFilename,
    createdAt: memory.createdAt,
    ownerId: "anonymous",
    fileCount: memory.analysis.experiment_summary.source_files.length,
    artifactKeys: {},
  } satisfies ServerStoredAnalysis;
}

export async function listPersistedHistory(env: ChemVaultLabBindings, ownerId: string): Promise<StoredAnalysisRecord[]> {
  if (!env.LAB_DB) return [];

  const result = await env.LAB_DB.prepare(
    `SELECT id, created_at, experiment_title, file_count, status, excel_filename, analysis_json, markdown
     FROM lab_analyses
     WHERE owner_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
  )
    .bind(ownerId)
    .all<LabAnalysisRow>();

  return result.results.map((row) => {
    const analysis = JSON.parse(row.analysis_json);
    return {
      id: row.id,
      date: row.created_at,
      experimentTitle: row.experiment_title,
      fileCount: row.file_count,
      status: row.status,
      analysis,
      markdown: row.markdown,
      latex: generateLatexSummary(analysis),
      excelFilename: row.excel_filename,
      remoteDownloads: {
        xlsx: `/api/download/${row.id}/xlsx`,
        json: `/api/download/${row.id}/json`,
        markdown: `/api/download/${row.id}/markdown`,
        latex: `/api/download/${row.id}/latex`,
      },
    };
  });
}

export async function deletePersistedAnalysis(env: ChemVaultLabBindings, id: string, ownerId: string) {
  if (!env.LAB_DB) return false;

  const row = await env.LAB_DB.prepare("SELECT id, artifact_keys_json FROM lab_analyses WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .first<Pick<LabAnalysisRow, "id" | "artifact_keys_json">>();
  if (!row) return false;

  const artifactKeys = parseArtifactKeys(row.artifact_keys_json);
  await Promise.all([
    env.LAB_DB.prepare("DELETE FROM lab_files WHERE analysis_id = ? AND owner_id = ?").bind(id, ownerId).run(),
    env.LAB_DB.prepare("DELETE FROM lab_analyses WHERE id = ? AND owner_id = ?").bind(id, ownerId).run(),
  ]);

  if (env.LAB_BUCKET) {
    const keys = await collectArtifactKeys(env.LAB_BUCKET, artifactKeys);
    if (keys.length > 0) {
      await env.LAB_BUCKET.delete(keys);
    }
  }

  return true;
}

async function rowToStored(row: LabAnalysisRow, env: ChemVaultLabBindings): Promise<ServerStoredAnalysis> {
  const artifactKeys = JSON.parse(row.artifact_keys_json || "{}") as Record<string, string>;
  const analysis = JSON.parse(row.analysis_json);
  const stored: ServerStoredAnalysis = {
    id: row.id,
    analysis,
    markdown: row.markdown,
    latex: generateLatexSummary(analysis),
    excelFilename: row.excel_filename,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    fileCount: row.file_count,
    artifactKeys,
  };

  if (env.LAB_BUCKET && artifactKeys.markdown) {
    const markdownObject = await env.LAB_BUCKET.get(artifactKeys.markdown);
    if (markdownObject) stored.markdown = await markdownObject.text();
  }

  if (env.LAB_BUCKET && artifactKeys.latex) {
    const latexObject = await env.LAB_BUCKET.get(artifactKeys.latex);
    if (latexObject) stored.latex = await latexObject.text();
  }

  if (env.LAB_BUCKET && artifactKeys.xlsx) {
    const excelObject = await env.LAB_BUCKET.get(artifactKeys.xlsx);
    if (excelObject) stored.excelBuffer = await excelObject.arrayBuffer();
  }

  return stored;
}

function parseArtifactKeys(value: string) {
  try {
    return JSON.parse(value || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

async function collectArtifactKeys(bucket: R2Bucket, artifactKeys: Record<string, string>) {
  const keys = Object.values(artifactKeys).filter((key) => key && !key.endsWith("/"));
  const sourcePrefix = artifactKeys.source_files;
  if (!sourcePrefix) return keys;

  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix: sourcePrefix, cursor });
    keys.push(...listed.objects.map((object) => object.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return Array.from(new Set(keys));
}

interface LabAnalysisRow {
  id: string;
  owner_id: string;
  created_at: string;
  experiment_title: string;
  experiment_type: string;
  file_count: number;
  status: string;
  excel_filename: string;
  analysis_json: string;
  markdown: string;
  artifact_keys_json: string;
}
