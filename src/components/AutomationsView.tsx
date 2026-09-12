import React, { useEffect, useState } from 'react';
import {
  Zap,
  Play,
  Clock,
  Terminal,
  Plus,
  RefreshCw,
  Trash2,
  Power,
  PowerOff,
} from 'lucide-react';

interface RecurringJob {
  job_id: string;
  user_id: string;
  title: string;
  prompt: string;
  frequency: 'hourly' | 'daily' | 'weekly' | string;
  timezone: string;
  next_run_at: number;
  enabled: number | boolean;
  last_run_at?: number | null;
  last_task_id?: string | null;
  created_at: number;
  updated_at: number;
}

interface AutomationsViewProps {
  userId?: string;
}

const formatTime = (timestamp?: number | null) => {
  if (!timestamp) return 'Never';
  return new Date(timestamp * 1000).toLocaleString();
};

const frequencyLabel = (frequency: string) => {
  switch (frequency) {
    case 'hourly':
      return 'Every hour';
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Every week';
    default:
      return frequency;
  }
};

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  userId = 'default_user',
}) => {
  const [jobs, setJobs] = useState<RecurringJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [frequency, setFrequency] = useState('daily');

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/brain/recurring?user_id=${encodeURIComponent(userId)}`
      );

      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      }
    } catch (err) {
      console.error('[AURA] Failed to load recurring jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [userId]);

  const createJob = async () => {
    if (!title.trim() || !prompt.trim() || saving) return;

    setSaving(true);

    try {
      const res = await fetch('/api/brain/recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          title: title.trim(),
          prompt: prompt.trim(),
          frequency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      });

      if (!res.ok) {
        throw new Error(`Create recurring job failed: ${res.status}`);
      }

      setTitle('');
      setPrompt('');
      setFrequency('daily');
      setShowCreate(false);

      await fetchJobs();
    } catch (err) {
      console.error('[AURA] Failed to create recurring job:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleJob = async (job: RecurringJob) => {
    try {
      const enabled = !(job.enabled === true || job.enabled === 1);

      const res = await fetch(
        `/api/brain/recurring/${encodeURIComponent(job.job_id)}/toggle`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled }),
        }
      );

      if (!res.ok) {
        throw new Error(`Toggle recurring job failed: ${res.status}`);
      }

      await fetchJobs();
    } catch (err) {
      console.error('[AURA] Failed to toggle recurring job:', err);
    }
  };

  const runJobNow = async (job: RecurringJob) => {
    if (runningId === job.job_id) return;

    setRunningId(job.job_id);

    try {
      const res = await fetch(
        `/api/brain/recurring/${encodeURIComponent(job.job_id)}/run`,
        {
          method: 'POST',
        }
      );

      if (!res.ok) {
        throw new Error(`Run recurring job failed: ${res.status}`);
      }

      await res.json();
      await fetchJobs();
    } catch (err) {
      console.error('[AURA] Failed to run recurring job:', err);
    } finally {
      setRunningId(null);
    }
  };

  const deleteJob = async (job: RecurringJob) => {
    try {
      const res = await fetch(
        `/api/brain/recurring/${encodeURIComponent(job.job_id)}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        throw new Error(`Delete recurring job failed: ${res.status}`);
      }

      await fetchJobs();
    } catch (err) {
      console.error('[AURA] Failed to delete recurring job:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>AURA Recurring Work</span>
          </h2>

          <p className="text-xs text-slate-400 mt-0.5">
            Persistent local workflows executed by AURA Brain in the background.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition"
            title="Refresh recurring work"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
          </button>

          <button
            onClick={() => setShowCreate((value) => !value)}
            className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Recurring Work
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Create persistent AURA work
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              AURA will execute this instruction automatically on the selected schedule.
            </p>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Work title"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white outline-none focus:border-cyan-500/50"
          />

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What should AURA do automatically?"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white outline-none focus:border-cyan-500/50 resize-none"
          />

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white outline-none"
            >
              <option value="hourly">Every hour</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
            </select>

            <button
              onClick={createJob}
              disabled={!title.trim() || !prompt.trim() || saving}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Work'}
            </button>

            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          Loading AURA recurring work...
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 text-center">
          <Clock className="w-7 h-7 mx-auto text-slate-600 mb-2" />
          <p className="text-sm text-slate-300">
            No recurring work configured.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Create a job and AURA will run it automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => {
            const enabled = job.enabled === true || job.enabled === 1;

            return (
              <div
                key={job.job_id}
                className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-white">
                      {job.title}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        enabled
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      {enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {job.prompt}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="text-amber-400 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        Schedule:
                      </span>
                      <span>{frequencyLabel(job.frequency)}</span>
                    </div>

                    <div className="text-cyan-300 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        Next:
                      </span>
                      <span>{formatTime(job.next_run_at)}</span>
                    </div>

                    <div className="text-slate-400 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        Last:
                      </span>
                      <span>{formatTime(job.last_run_at)}</span>
                    </div>
                  </div>

                  {job.last_task_id && (
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-400">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-cyan-400" />
                        Last durable task
                      </div>
                      <p className="text-slate-300 mt-1 break-all">
                        {job.last_task_id}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500">
                    {job.timezone}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleJob(job)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                      title={enabled ? 'Pause' : 'Enable'}
                    >
                      {enabled ? (
                        <PowerOff className="w-3.5 h-3.5" />
                      ) : (
                        <Power className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => deleteJob(job)}
                      className="p-2 rounded-lg bg-red-950/30 text-red-300 hover:bg-red-950/50 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => runJobNow(job)}
                      disabled={!enabled || runningId === job.job_id}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                    >
                      <Play
                        className={`w-3 h-3 ${
                          runningId === job.job_id ? 'animate-spin' : ''
                        }`}
                      />
                      {runningId === job.job_id ? 'Running...' : 'Run Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
