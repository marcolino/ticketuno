import { Router } from 'express';
import { execSync } from 'child_process';
import pkg from '../../package.json';

const router = Router();

const getFromGit = (cmd: string): string | null => {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

const GIT_COMMIT = getFromGit('git rev-parse --short HEAD') ?? process.env.GIT_COMMIT ?? 'unknown';
const GIT_COMMIT_DATE = getFromGit("git log -1 --format='%ci'")?.slice(0, 19) ?? process.env.GIT_COMMIT_DATE ?? 'unknown';

// Public: get backend version
router.get('/version', async (req, res) => {
  res.json({
    version: pkg.version,
    lastCommit: GIT_COMMIT,
    lastCommitDate: GIT_COMMIT_DATE,
  });
});

// Public: get health status
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
