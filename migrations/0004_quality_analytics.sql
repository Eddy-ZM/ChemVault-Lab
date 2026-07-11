PRAGMA foreign_keys = OFF;

CREATE TABLE lab_product_events_v2 (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'files_import_started',
    'files_import_completed',
    'files_import_failed',
    'analysis_started',
    'analysis_completed',
    'analysis_failed',
    'result_viewed',
    'export_downloaded',
    'review_corrected',
    'result_rejected'
  )),
  subject_hash TEXT NOT NULL,
  surface TEXT NOT NULL DEFAULT 'lab',
  properties_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

INSERT INTO lab_product_events_v2
SELECT id, event_name, subject_hash, surface, properties_json, occurred_at
FROM lab_product_events;

DROP TABLE lab_product_events;
ALTER TABLE lab_product_events_v2 RENAME TO lab_product_events;
CREATE INDEX idx_lab_product_events_name_time ON lab_product_events(event_name, occurred_at DESC);
CREATE INDEX idx_lab_product_events_subject_time ON lab_product_events(subject_hash, occurred_at DESC);

PRAGMA foreign_keys = ON;
