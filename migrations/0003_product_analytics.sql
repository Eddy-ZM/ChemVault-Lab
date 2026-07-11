CREATE TABLE IF NOT EXISTS lab_product_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'files_import_started',
    'files_import_completed',
    'files_import_failed',
    'analysis_started',
    'analysis_completed',
    'analysis_failed',
    'result_viewed',
    'export_downloaded'
  )),
  subject_hash TEXT NOT NULL,
  surface TEXT NOT NULL DEFAULT 'lab',
  properties_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lab_product_events_name_time
  ON lab_product_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_product_events_subject_time
  ON lab_product_events(subject_hash, occurred_at DESC);
