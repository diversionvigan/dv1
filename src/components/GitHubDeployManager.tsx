import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Github,
  Server,
  Terminal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  Layers,
  ArrowRight
} from 'lucide-react';

interface GitStatusData {
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

export const GitHubDeployManager: React.FC = () => {
  // Config state (stored in localStorage for convenience)
  const [repoUrl, setRepoUrl] = useState<string>(() => {
    return localStorage.getItem('diversion_git_repo_url') || 'https://github.com/iprintsnscctv/dv1git';
  });
  const [branch, setBranch] = useState<string>(() => {
    return localStorage.getItem('diversion_git_branch') || 'main';
  });
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem('diversion_git_token') || '';
  });
  const [commitMessage, setCommitMessage] = useState<string>(
    'Sync latest bookings, reviews, and room configurations to Hostinger VPS'
  );
  const [authorName, setAuthorName] = useState<string>('Diversion Vigan Admin');
  const [authorEmail, setAuthorEmail] = useState<string>('iprintsnscctv@gmail.com');
  const [forcePush, setForcePush] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [rememberToken, setRememberToken] = useState<boolean>(true);

  // Status and operation states
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  const [deploying, setDeploying] = useState<boolean>(false);
  const [deployStep, setDeployStep] = useState<string>('');
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    commitHash?: string;
    message?: string;
    output?: string;
    error?: string;
  } | null>(null);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  // Save config on change
  useEffect(() => {
    localStorage.setItem('diversion_git_repo_url', repoUrl);
  }, [repoUrl]);

  useEffect(() => {
    localStorage.setItem('diversion_git_branch', branch);
  }, [branch]);

  useEffect(() => {
    if (rememberToken && githubToken) {
      localStorage.setItem('diversion_git_token', githubToken);
    } else if (!rememberToken) {
      localStorage.removeItem('diversion_git_token');
    }
  }, [githubToken, rememberToken]);

  // Fetch Git Status
  const fetchGitStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/github/status');
      const data = await res.json();
      if (data.success) {
        setGitStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch git status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchGitStatus();
  }, []);

  // Test Connection
  const handleTestConnection = async () => {
    if (!repoUrl.trim() || !githubToken.trim()) {
      setConnectionResult({
        success: false,
        message: 'Please provide both GitHub Repository URL and Personal Access Token.',
      });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const res = await fetch('/api/github/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), githubToken: githubToken.trim() }),
      });
      const data = await res.json();
      setConnectionResult({
        success: data.success,
        message: data.message || (data.success ? 'Connected successfully.' : 'Authentication failed.'),
      });
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: `Connection test error: ${err.message || String(err)}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Push to GitHub & Trigger VPS Deployment
  const handlePushAndDeploy = async () => {
    if (!repoUrl.trim() || !githubToken.trim()) {
      alert('Please enter both your GitHub Repository URL and GitHub Personal Access Token.');
      return;
    }

    setDeploying(true);
    setDeployResult(null);
    setDeployStep('1. Staging latest bookings, rooms, and webapp files...');

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          githubToken: githubToken.trim(),
          branch: branch.trim() || 'main',
          commitMessage: commitMessage.trim(),
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim(),
          forcePush,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDeployStep('4. GitHub Actions workflow triggered! Auto-deploying to Hostinger VPS...');
        setDeployResult({
          success: true,
          commitHash: data.commitHash,
          message: `Successfully pushed to GitHub branch '${data.branch}'! GitHub Actions is now deploying to Hostinger VPS.`,
          output: data.output,
        });
        fetchGitStatus();
      } else {
        setDeployResult({
          success: false,
          error: data.error || 'Failed to push to GitHub.',
          output: data.output,
        });
      }
    } catch (err: any) {
      setDeployResult({
        success: false,
        error: err.message || 'Network error occurred while pushing to GitHub.',
      });
    } finally {
      setDeploying(false);
    }
  };

  const copyLogsToClipboard = () => {
    if (deployResult?.output) {
      navigator.clipboard.writeText(deployResult.output);
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2500);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6D7C3] shadow-xl space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6D7C3] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#180F09] to-[#3B281B] flex items-center justify-center text-amber-400 shadow-md">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-black text-[#2C1E15] flex items-center gap-2">
                <span>GitHub &amp; Hostinger VPS Auto-Deploy</span>
                <span className="text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Live CI/CD
                </span>
              </h3>
              <p className="text-xs text-[#786150] mt-0.5">
                Commit &amp; push all app files directly to GitHub, triggering automatic Docker redeployment on your Hostinger VPS.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchGitStatus}
          disabled={loadingStatus}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-2 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E6D7C3] text-xs font-bold text-[#2C1E15] rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#8B6B10] ${loadingStatus ? 'animate-spin' : ''}`} />
          <span>Refresh Git Status</span>
        </button>
      </div>

      {/* Visual Pipeline Flowchart */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FAF7F2] via-[#F5EBE6] to-[#FAF7F2] border border-[#E6D7C3]/80 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#786150] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#8B6B10]" />
          <span>Automated Deployment Pipeline</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Step 1 */}
          <div className="p-3 bg-white rounded-xl border border-[#E6D7C3] shadow-2xs space-y-1 relative">
            <div className="font-bold text-[#2C1E15] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-black">1</span>
              <span>This Web App</span>
            </div>
            <p className="text-[11px] text-[#786150]">Stages bookings, room settings, reviews &amp; code</p>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-white rounded-xl border border-[#E6D7C3] shadow-2xs space-y-1 relative">
            <div className="font-bold text-[#2C1E15] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-black">2</span>
              <span>Push to GitHub</span>
            </div>
            <p className="text-[11px] text-[#786150]">Branch <strong className="font-mono text-[#8B6B10]">main</strong> in <strong className="font-mono">dv1git</strong></p>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-white rounded-xl border border-[#E6D7C3] shadow-2xs space-y-1 relative">
            <div className="font-bold text-[#2C1E15] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-black">3</span>
              <span>GitHub Actions</span>
            </div>
            <p className="text-[11px] text-[#786150]">Triggers SSH runner on push event</p>
          </div>

          {/* Step 4 */}
          <div className="p-3 bg-white rounded-xl border border-emerald-300 bg-emerald-50/40 shadow-2xs space-y-1 relative">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-[10px] font-black">4</span>
              <span>Hostinger VPS</span>
            </div>
            <p className="text-[11px] text-emerald-800">Pulls code &amp; restarts Docker container</p>
          </div>
        </div>
      </div>

      {/* Current Git Status Bar */}
      {gitStatus && (
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <GitBranch className="w-4 h-4 text-[#8B6B10]" />
            <div>
              <span className="text-[#786150]">Active Branch: </span>
              <span className="font-mono font-bold text-[#2C1E15]">{gitStatus.currentBranch}</span>
            </div>
          </div>

          {gitStatus.lastCommit ? (
            <div className="text-[11px] text-[#786150]">
              <span>Last Commit: </span>
              <span className="font-mono font-bold text-[#8B6B10]">{gitStatus.lastCommit.hash}</span>
              <span className="hidden sm:inline"> — {gitStatus.lastCommit.message} ({gitStatus.lastCommit.date})</span>
            </div>
          ) : (
            <div className="text-[11px] text-[#786150] italic">No local commits recorded yet</div>
          )}

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${gitStatus.hasUncommittedChanges ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="font-semibold text-[#2C1E15]">
              {gitStatus.hasUncommittedChanges
                ? `${gitStatus.uncommittedFiles.length} file(s) modified & ready to push`
                : 'Workspace clean'}
            </span>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="space-y-5">
        <h4 className="font-serif font-bold text-base text-[#2C1E15] flex items-center gap-2">
          <span>GitHub Repository &amp; Authentication</span>
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Repo URL */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-[#2C1E15]">
              GitHub Repository URL <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Github className="w-4 h-4 text-[#8B6B10] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/iprintsnscctv/dv1git"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white text-xs font-mono text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
            <p className="text-[11px] text-[#786150]">Your target repository on GitHub.</p>
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2C1E15]">
              Branch <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <GitBranch className="w-4 h-4 text-[#8B6B10] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6D7C3] bg-white text-xs font-mono text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
            <p className="text-[11px] text-[#786150]">Triggers Hostinger deploy workflow on push.</p>
          </div>
        </div>

        {/* GitHub Token */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#2C1E15]">
              GitHub Personal Access Token (PAT) <span className="text-rose-500">*</span>
            </label>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Diversion+Vigan+Hostinger+Deploy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#8B6B10] hover:underline flex items-center gap-1"
            >
              <span>Generate Token on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              required
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxx"
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-[#E6D7C3] bg-white text-xs font-mono text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-[#786150]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberToken}
                onChange={(e) => setRememberToken(e.target.checked)}
                className="rounded border-[#E6D7C3] text-[#8B6B10] focus:ring-[#D4AF37]"
              />
              <span>Remember token in browser localStorage for 1-click deployments</span>
            </label>
            <span className="text-stone-400">Tokens are sanitized and never permanently stored in git config.</span>
          </div>
        </div>

        {/* Commit Message & Author */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-[#2C1E15]">Commit Message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="e.g. Update rates, gallery images, and guest records"
              className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs text-[#2C1E15] outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2C1E15]">Advanced Options</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] text-xs text-[#2C1E15] cursor-pointer">
              <input
                type="checkbox"
                checked={forcePush}
                onChange={(e) => setForcePush(e.target.checked)}
                className="rounded border-[#E6D7C3] text-[#8B6B10] focus:ring-[#D4AF37]"
              />
              <span className="font-semibold text-rose-700">Force Push (--force)</span>
            </label>
          </div>
        </div>

        {/* Test Connection Result Notice */}
        {connectionResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in duration-200 ${
              connectionResult.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            {connectionResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{connectionResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E6D7C3]/80">
          {/* Test Connection Button */}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection || deploying}
            className="px-4 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C1E15] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-[#8B6B10]" />
            <span>{testingConnection ? 'Testing Authentication...' : 'Test GitHub Connection'}</span>
          </button>

          {/* Push and Deploy Primary CTA */}
          <button
            type="button"
            onClick={handlePushAndDeploy}
            disabled={deploying}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#180F09] via-[#3B281B] to-[#180F09] hover:from-[#2C1E15] hover:to-[#523A2A] text-amber-300 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer border border-[#D4AF37]/50 disabled:opacity-50 active:scale-95"
          >
            {deploying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Pushing to GitHub &amp; Triggering VPS...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-400" />
                <span>🚀 Push to GitHub &amp; Deploy to Hostinger VPS</span>
              </>
            )}
          </button>
        </div>

        {/* Deploying Progress Notice */}
        {deploying && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 animate-pulse">
            <div className="font-bold flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B6B10]" />
              <span>Pipeline in Progress</span>
            </div>
            <p className="text-[11px] text-[#786150]">{deployStep}</p>
          </div>
        )}

        {/* Deploy Result & Execution Logs */}
        {deployResult && (
          <div
            className={`p-5 rounded-2xl border space-y-3 animate-in fade-in duration-300 ${
              deployResult.success
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-rose-50/50 border-rose-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {deployResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-[#2C1E15]">
                    {deployResult.success ? 'Deployment Triggered Successfully!' : 'Push Failed'}
                  </h4>
                  <p className="text-xs text-[#786150] mt-0.5">
                    {deployResult.success ? deployResult.message : deployResult.error}
                  </p>
                </div>
              </div>

              {deployResult.output && (
                <button
                  type="button"
                  onClick={copyLogsToClipboard}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E6D7C3] bg-white text-[11px] font-bold text-[#2C1E15] flex items-center gap-1 cursor-pointer hover:bg-stone-50"
                >
                  {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#786150]" />}
                  <span>{copiedLog ? 'Copied' : 'Copy Logs'}</span>
                </button>
              )}
            </div>

            {/* Terminal Logs Output */}
            {deployResult.output && (
              <div className="mt-2 rounded-xl bg-[#180F09] text-stone-200 p-4 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-[#3B281B]">
                <div className="flex items-center gap-2 text-stone-400 border-b border-stone-800 pb-2 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Git Execution Log</span>
                </div>
                <pre className="whitespace-pre-wrap">{deployResult.output}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helpful Instructions & Secret Setup Guide */}
      <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3] space-y-3">
        <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#8B6B10] flex items-center gap-2">
          <Server className="w-3.5 h-3.5" />
          <span>How Hostinger VPS Receives the Update</span>
        </h4>
        <p className="text-xs text-[#786150] leading-relaxed">
          When you click <strong>Push to GitHub &amp; Deploy to Hostinger VPS</strong>, this webapp pushes your changes to the <strong className="font-mono">main</strong> branch of your repository. GitHub Actions then executes your workflow in <strong className="font-mono">.github/workflows/deploy.yml</strong>:
        </p>
        <ul className="text-xs text-[#786150] space-y-1.5 list-disc pl-5">
          <li>It connects to your Hostinger VPS via SSH credentials configured in GitHub Secrets.</li>
          <li>It runs <strong className="font-mono text-[#2C1E15]">git pull origin main</strong> in your VPS project directory (<code className="bg-stone-200 px-1 py-0.5 rounded">/var/www/dv1git</code>).</li>
          <li>It runs <strong className="font-mono text-[#2C1E15]">docker compose up -d --build</strong> to rebuild and restart the live container on port 3000.</li>
          <li>Your live domain <strong className="font-mono text-[#8B6B10]">www.viganbooking.com</strong> instantly reflects all new changes!</li>
        </ul>
      </div>
    </div>
  );
};
