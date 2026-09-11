import React, { useState, useEffect } from 'react';
import { User, ImprovementSuggestion } from '../types';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Cpu, 
  Zap, 
  Check, 
  Clock, 
  TrendingUp, 
  Server, 
  Sliders,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface OwnerConsoleProps {
  currentUser: User;
  onClose?: () => void;
}

export const OwnerConsole: React.FC<OwnerConsoleProps> = ({
  currentUser,
  onClose
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/metrics');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleApproveSuggestion = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchMetrics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full space-y-6 select-none">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-purple-500/30 shadow-2xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Owner Master Observability Console</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                RESTRICTED CLEARANCE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authenticated as: <span className="text-purple-300 font-mono font-semibold">{currentUser.email}</span> (ROLE: {currentUser.role})
            </p>
          </div>
        </div>

      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
            <span className="text-xs font-mono text-slate-400">Total Registered Users</span>
            <div className="text-2xl font-black text-white">{metrics.totalUsers}</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
            <span className="text-xs font-mono text-slate-400">Active Working Agents</span>
            <div className="text-2xl font-black text-cyan-400">{metrics.activeAgents}</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
            <span className="text-xs font-mono text-slate-400">Total Executed Tasks</span>
            <div className="text-2xl font-black text-purple-400">{metrics.totalTasks}</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
            <span className="text-xs font-mono text-slate-400">System Health State</span>
            <div className="text-2xl font-black text-emerald-400 uppercase">{metrics.systemHealth}</div>
          </div>
        </div>
      )}

      {/* Self-Improvement Suggestions */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">System Self-Improvement Proposals</h3>
        </div>
        <p className="text-xs text-slate-400">
              AURA continuously observes recorded pipeline timings, identifies bottlenecks, and proposes architecture adjustments.
        </p>

        <div className="space-y-3 pt-2">
          {metrics?.suggestions?.map((sug: ImprovementSuggestion) => (
            <div
              key={sug.id}
              className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between flex-wrap gap-4"
            >
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{sug.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {sug.type}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {sug.impact}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{sug.description}</p>
              </div>

              <div className="flex items-center gap-2">
                {sug.status === 'approved' ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800">
                    <Check className="w-3.5 h-3.5" />
                    APPLIED IN PIPELINE
                  </span>
                ) : (
                  <button
                    onClick={() => handleApproveSuggestion(sug.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
                  >
                    Authorize Optimization
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users Telemetry List */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Registered Accounts & Tier State</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Plan</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {metrics?.users?.map((u: User) => (
                <tr key={u.id}>
                  <td className="py-3 font-bold text-white">{u.name} <span className="text-slate-500 text-[11px]">({u.email})</span></td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${u.role === 'OWNER' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
