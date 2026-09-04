import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Check, 
  Clock, 
  ArrowRight, 
  Terminal, 
  Plus, 
  RefreshCw,
  GitBranch,
  MessageSquare,
  Globe
} from 'lucide-react';

export const AutomationsView: React.FC = () => {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      setAutomations(data.automations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleRunAutomation = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/automations/${id}/run`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchAutomations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setRunningId(null), 800);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Autonomous Workflows & n8n Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Event-driven triggers, conditional evaluation nodes, and automated background execution pipelines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automations.map((auto) => (
          <div key={auto.id} className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{auto.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {auto.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{auto.description}</p>

              {/* Trigger & Action Pipeline Box */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-amber-400 flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Trigger:</span>
                  <span>{auto.trigger}</span>
                </div>
                <div className="text-cyan-300 flex items-start gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Actions:</span>
                  <div className="flex flex-wrap gap-1">
                    {auto.actions.map((act: string, idx: number) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px]">
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Execution Logs */}
              {auto.logs && auto.logs.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-cyan-400" /> Recent Execution Log:
                  </div>
                  <p className="text-slate-300">{auto.logs[0]}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Last run: {auto.lastRun}</span>
              <button
                onClick={() => handleRunAutomation(auto.id)}
                disabled={runningId === auto.id}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Play className={`w-3 h-3 ${runningId === auto.id ? 'animate-spin' : ''}`} />
                <span>{runningId === auto.id ? 'Running...' : 'Run Trigger'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
