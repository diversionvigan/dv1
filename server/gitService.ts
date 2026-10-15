import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Storage } from './storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export interface GitStatusResult {
  isGitRepo: boolean;
  currentBranch: string;
  hasUncommittedChanges: boolean;
  uncommittedFiles: string[];
  lastCommit: {
    hash: string;
    message: string;
    date: string;
    author: string;
  } | null;
  remoteUrl: string | null;
}

export interface PushOptions {
  repoUrl: string;
  githubToken: string;
  branch?: string;
  commitMessage?: string;
  authorName?: string;
  authorEmail?: string;
  forcePush?: boolean;
}

export interface PushResult {
  success: boolean;
  commitHash?: string;
  commitMessage?: string;
  branch: string;
  filesChangedCount: number;
  output: string;
  error?: string;
}

/**
 * Executes a git command in the applet root directory
 */
function runGit(cmd: string): string {
  return execSync(cmd, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
  }).trim();
}

/**
 * Sanitizes URLs to mask any access tokens
 */
function sanitizeOutput(text: string, token?: string): string {
  let cleaned = text;
  if (token && token.trim()) {
    cleaned = cleaned.split(token).join('***TOKEN***');
  }
  // Mask any oauth/pat pattern
  cleaned = cleaned.replace(/https:\/\/[^@]+@github\.com/g, 'https://***@github.com');
  return cleaned;
}

export const GitService = {
  /**
   * Check if git repo exists and get status
   */
  getStatus(): GitStatusResult {
    const gitDir = path.join(ROOT_DIR, '.git');
    const isGitRepo = fs.existsSync(gitDir);

    if (!isGitRepo) {
      return {
        isGitRepo: false,
        currentBranch: 'main',
        hasUncommittedChanges: true,
        uncommittedFiles: [],
        lastCommit: null,
        remoteUrl: null,
      };
    }

    try {
      let currentBranch = 'main';
      try {
        currentBranch = runGit('git rev-parse --abbrev-ref HEAD');
      } catch {}

      let uncommittedFiles: string[] = [];
      try {
        const statusOutput = runGit('git status --porcelain');
        uncommittedFiles = statusOutput
          ? statusOutput.split('\n').filter(Boolean).map((line) => line.trim())
          : [];
      } catch {}

      let lastCommit: GitStatusResult['lastCommit'] = null;
      try {
        const hash = runGit('git log -1 --format="%h"');
        const message = runGit('git log -1 --format="%s"');
        const date = runGit('git log -1 --format="%cd" --date=relative');
        const author = runGit('git log -1 --format="%an"');
        if (hash) {
          lastCommit = { hash, message, date, author };
        }
      } catch {}

      let remoteUrl: string | null = null;
      try {
        const rawRemote = runGit('git remote get-url origin');
        remoteUrl = sanitizeOutput(rawRemote);
      } catch {}

      return {
        isGitRepo: true,
        currentBranch: currentBranch || 'main',
        hasUncommittedChanges: uncommittedFiles.length > 0,
        uncommittedFiles,
        lastCommit,
        remoteUrl,
      };
    } catch {
      return {
        isGitRepo: false,
        currentBranch: 'main',
        hasUncommittedChanges: true,
        uncommittedFiles: [],
        lastCommit: null,
        remoteUrl: null,
      };
    }
  },

  /**
   * Test connection to GitHub repository
   */
  async testConnection(repoUrl: string, token: string): Promise<{ success: boolean; message: string }> {
    try {
      const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/i);
      if (!match) {
        return { success: false, message: 'Invalid GitHub repository URL. Must be like https://github.com/owner/repo' };
      }
      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');

      const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Diversion-Vigan-Deployer',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, message: 'Unauthorized: GitHub token is invalid or expired.' };
        }
        if (response.status === 404) {
          return { success: false, message: `Repository ${owner}/${cleanRepo} not found or token lacks repo access.` };
        }
        return { success: false, message: `GitHub API error: ${response.statusText} (${response.status})` };
      }

      const data: any = await response.json();
      return {
        success: true,
        message: `Successfully connected to GitHub repository: ${data.full_name} (${data.private ? 'Private' : 'Public'})`,
      };
    } catch (err: any) {
      return { success: false, message: `Connection error: ${err.message || String(err)}` };
    }
  },

  /**
   * Commit all current files and push to GitHub, triggering Hostinger VPS auto-deployment
   */
  async pushToGitHub(options: PushOptions): Promise<PushResult> {
    const {
      repoUrl,
      githubToken,
      branch = 'main',
      commitMessage = 'Auto-update Diversion Vigan App & Bookings Data',
      authorName = 'Diversion Vigan Admin',
      authorEmail = 'admin@diversionvigan.ph',
      forcePush = false,
    } = options;

    if (!repoUrl || !repoUrl.trim()) {
      return { success: false, branch, filesChangedCount: 0, output: '', error: 'GitHub repository URL is required.' };
    }
    if (!githubToken || !githubToken.trim()) {
      return { success: false, branch, filesChangedCount: 0, output: '', error: 'GitHub Personal Access Token is required.' };
    }

    // Parse owner and repo
    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/i);
    if (!match) {
      return { success: false, branch, filesChangedCount: 0, output: '', error: 'Invalid GitHub repository URL format.' };
    }
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');
    const cleanRepoSlug = `${owner}/${cleanRepo}`;

    // Flush latest in-memory data to disk before commit
    try {
      const bookings = Storage.getBookings();
      Storage.saveBookings(bookings);
      const rooms = Storage.getRooms();
      Storage.saveRooms(rooms);
      const reviews = Storage.getReviews();
      Storage.saveReviews(reviews);
    } catch (err) {
      console.warn('Note: Could not flush storage prior to commit:', err);
    }

    const trimmedToken = githubToken.trim();
    // Build authenticated remote URL
    const authRemoteUrl = `https://${encodeURIComponent(trimmedToken)}@github.com/${cleanRepoSlug}.git`;
    const cleanPublicUrl = `https://github.com/${cleanRepoSlug}.git`;

    const logs: string[] = [];

    try {
      // 1. Initialize git repo if not present
      const gitDir = path.join(ROOT_DIR, '.git');
      if (!fs.existsSync(gitDir)) {
        logs.push(runGit('git init'));
        logs.push('Initialized new Git repository.');
      }

      // 2. Configure user name & email
      runGit(`git config user.name "${authorName.replace(/"/g, '\\"')}"`);
      runGit(`git config user.email "${authorEmail.replace(/"/g, '\\"')}"`);

      // 3. Ensure branch is main
      try {
        runGit(`git branch -M ${branch}`);
      } catch {}

      // 4. Configure remote URL safely
      try {
        runGit('git remote remove origin');
      } catch {}
      runGit(`git remote add origin "${authRemoteUrl}"`);

      // 5. Stage files
      runGit('git add -A');

      // 6. Check uncommitted changes
      const status = runGit('git status --porcelain');
      let filesChangedCount = status ? status.split('\n').filter(Boolean).length : 0;
      let commitHash = '';

      if (filesChangedCount > 0) {
        const fullMessage = `${commitMessage} [${new Date().toISOString().replace('T', ' ').slice(0, 19)}]`;
        const commitOut = runGit(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`);
        logs.push(commitOut);
      } else {
        logs.push('Working directory is clean. Pushing latest commit.');
      }

      try {
        commitHash = runGit('git rev-parse --short HEAD');
      } catch {}

      // 7. Push to GitHub
      logs.push(`Pushing branch '${branch}' to GitHub (${cleanRepoSlug})...`);
      const pushFlag = forcePush ? '--force' : '-u';
      const pushOut = runGit(`git push ${pushFlag} origin ${branch}`);
      logs.push(pushOut || 'Push to GitHub succeeded.');

      return {
        success: true,
        commitHash,
        commitMessage,
        branch,
        filesChangedCount,
        output: sanitizeOutput(logs.join('\n'), trimmedToken),
      };
    } catch (err: any) {
      const errMsg = sanitizeOutput(err.message || String(err), trimmedToken);
      logs.push(`Error during git operation: ${errMsg}`);
      return {
        success: false,
        branch,
        filesChangedCount: 0,
        output: sanitizeOutput(logs.join('\n'), trimmedToken),
        error: errMsg,
      };
    } finally {
      // ALWAYS sanitize the stored origin URL in .git/config so no token is stored on disk
      try {
        runGit(`git remote set-url origin "${cleanPublicUrl}"`);
      } catch {}
    }
  },
};
