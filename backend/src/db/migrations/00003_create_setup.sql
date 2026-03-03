-- Create setup table (single row config table)
CREATE TABLE IF NOT EXISTS setup (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS trigger_setup_updated_at
AFTER UPDATE ON setup
FOR EACH ROW
BEGIN
  UPDATE setup
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

-- Ensure default row exists
INSERT OR IGNORE INTO setup (id, data)
VALUES (1, '{}');
