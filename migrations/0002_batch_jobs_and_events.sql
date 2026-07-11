CREATE TABLE IF NOT EXISTS lab_batch_jobs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  source_analysis_ids_json TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_lab_batch_jobs_owner_created
  ON lab_batch_jobs(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lab_outbox_events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivering', 'delivered', 'failed', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_lab_outbox_events_status_next_attempt
  ON lab_outbox_events(status, next_attempt_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_outbox_events_aggregate_type
  ON lab_outbox_events(aggregate_id, event_type);
