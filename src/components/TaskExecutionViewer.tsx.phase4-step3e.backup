import React from 'react';
import { Task, TaskStep } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Play, 
  XCircle, 
  ShieldAlert, 
  Check, 
  X, 
  Terminal, 
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface TaskExecutionViewerProps {
  task: Task;
  onAdvanceStep?: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onViewWebsite?: () => void;
}

export const TaskExecutionViewer: React.FC<TaskExecutionViewerProps> = ({
  task,
  onAdvanceStep,
  onApprove,
  onReject,
  onViewWebsite
}) => {
  const isCompleted = task.status === 'COMPLETED';
  const isWaitingApproval = (task.status === 'WAITING' || (task.status as any) === 'WAITING_FOR_USER') && task.approval && task.approval.status === 'pending';

  const steps = (task as any).steps || (task?.nodes || []).map((node: any) => ({
    id: node.id,
    title: node.title,
    agent: node.agentName || node.role || 'Agent',
    status: node.status,
    detail: node.detail,
    completedAt: node.completedAt
  }));

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between flex-wrap gap-3 bg-slate-950/40">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              task.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
              task.status === 'WAITING_FOR_USER' ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse' :
              'bg-cyan-950 text-cyan-300 border border-cyan-800'
            }`}>
              {task.status}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {task.taskId}</span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-1">{task.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {onAdvanceStep && !isCompleted && !isWaitingApproval && (
            <button
              onClick={() => onAdvanceStep(task.taskId)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 flex items-center gap-1.5 transition"
            >
              <Play className="w-3 h-3" />
              <span>Advance Step</span>
            </button>
          )}

          {onViewWebsite && isCompleted && (
            <button
              onClick={onViewWebsite}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:opacity-90 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preview Live Website</span>
            </button>
          )}
        </div>
      </div>

      {/* Human Approval Required Banner */}
      {isWaitingApproval && task.approval && (
        <div className="p-4 sm:p-5 bg-amber-950/30 border-b border-amber-500/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  High-Impact Autonomous Action: Approval Required
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  Critical
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-100 mt-1">{task.approval.title}</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{task.approval.description}</p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => onApprove?.(task.taskId)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Approve & Execute</span>
                </button>
                <button
                  onClick={() => onReject?.(task.taskId)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-800 flex items-center gap-1.5 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps Execution Timeline */}
      <div className="p-4 sm:p-6 space-y-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span>Multi-Agent Step Pipeline</span>
          <span className="text-slate-600">•</span>
          <span className="text-cyan-400 font-mono">
            {steps.filter((s: any) => s.status === 'completed').length}/{steps.length} Completed
          </span>
        </h4>

        <div className="space-y-3">
          {steps.map((step: any, idx: number) => {
            const isStepDone = step.status === 'completed';
            const isStepRunning = step.status === 'running';
            const isStepPending = step.status === 'pending';

            return (
              <div 
                key={step.id} 
                className={`p-3 rounded-xl border transition-all ${
                  isStepRunning ? 'bg-slate-800/80 border-cyan-500/50 shadow-md shadow-cyan-500/10' :
                  isStepDone ? 'bg-slate-950/40 border-slate-800/80' :
                  'bg-slate-950/20 border-slate-900/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    {isStepDone && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {isStepRunning && (
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                    )}
                    {isStepPending && <Circle className="w-4 h-4 text-slate-600 shrink-0" />}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{step.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {step.agent}
                        </span>
                      </div>
                      {step.detail && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{step.detail}</p>
                      )}
                    </div>
                  </div>

                  {step.completedAt && (
                    <span className="text-[10px] text-slate-500 font-mono">{step.completedAt}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Execution Logs Terminal */}
        {task.logs && task.logs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-mono">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Orchestrator Execution Logs</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto space-y-1">
              {task.logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-cyan-500 mr-2">›</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Result Banner */}
        {task.result && (
          <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide">Verification Passed</p>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{task.result}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
