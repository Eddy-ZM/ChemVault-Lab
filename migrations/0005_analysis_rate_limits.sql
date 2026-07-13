CREATE TABLE IF NOT EXISTS lab_analysis_rate_limits (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_lab_analysis_rate_limits_owner_window
  ON lab_analysis_rate_limits(owner_id, window_start DESC);
