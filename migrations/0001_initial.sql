CREATE TABLE IF NOT EXISTS lab_analyses (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  experiment_title TEXT NOT NULL,
  experiment_type TEXT NOT NULL,
  file_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  excel_filename TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  markdown TEXT NOT NULL,
  artifact_keys_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_lab_analyses_owner_created
  ON lab_analyses(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lab_files (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_key TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (analysis_id) REFERENCES lab_analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lab_files_analysis
  ON lab_files(analysis_id);
