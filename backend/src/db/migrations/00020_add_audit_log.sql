-- Audit log for security-sensitive actions (e.g. admin impersonation).
-- Replaces the implicit, unlogged PASSEPARTOUT master-password backdoor.
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,            -- e.g. 'impersonation.start'
  actor_user_id TEXT,             -- who performed the action (the admin)
  target_user_id TEXT,            -- who it was performed on (the impersonated user)
  ip TEXT,
  user_agent TEXT,
  metadata TEXT,                  -- JSON blob with action-specific context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
