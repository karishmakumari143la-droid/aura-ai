import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Task, TaskNode, TaskEdge } from '../types';
import { 
  GitCommit, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Play, 
  ShieldAlert, 
  Terminal, 
  Sparkles, 
  Cpu, 
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  Sliders
} from 'lucide-react';

interface TaskGraphViewerProps {
  task: Task;
  onAdvance?: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  isAdvancing?: boolean;
}

export const TaskGraphViewer: React.FC<TaskGraphViewerProps> = ({
  task,
  onAdvance,
  onApprove,
  onReject,
  isAdvancing = false
}) => {
  const [activeTab, setActiveTab] = useState<'graph' | 'messages' | 'logs'>('graph');
  const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);

  // Group nodes by topological level (Level 0, 1, 2...) for parallel execution visualization
  const safeNodes = task?.nodes || [];
  const safeMessages = task?.messages || [];
  const safeLogs = task?.logs || [];

  const levels: number[] = Array.from(new Set<number>(safeNodes.map(n => Number(n.level || 0)))).sort((a: number, b: number) => a - b);
  const maxLevel = levels.length > 0 ? Math.max(...levels) : 0;

  const getStatusBadge = (status: TaskNode['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            COMPLETED
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            PARALLEL RUNNING
          </span>
        );
      case 'waiting_approval':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            APPROVAL REQUIRED
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            WAITING DEPS
          </span>
        );
    }
  };

  return (
    <div className="w-full rounded-3xl bg-slate-950/90 border border-white/10 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-4 bg-slate-900/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              DAG EXECUTION GRAPH
            </span>
            <span className="text-xs text-slate-400 font-mono">TASK ID: {task.taskId}</span>
            <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
              task.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
              task.status === 'RUNNING' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
              task.status === 'WAITING_FOR_APPROVAL' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
              'bg-slate-800 text-slate-300'
            }`}>
              {task.status}
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">{task.title}</h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'graph' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Task Graph
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'messages' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Packets ({safeMessages.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'logs' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Terminal Logs ({safeLogs.length})
            </button>
          </div>

          {/* Advance Step Button */}
          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && onAdvance && (
            <button
              onClick={() => onAdvance(task.taskId)}
              disabled={isAdvancing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isAdvancing ? 'Executing...' : 'Dispatch Next Wave'}
            </button>
          )}
        </div>
      </div>

      {/* Human Approval Banner if pending */}
      {task.approval && task.approval.status === 'pending' && (
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                Human Sign-off Required: {task.approval.title}
              </div>
              <p className="text-xs text-amber-300/80">{task.approval.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onApprove && (
              <button
                onClick={() => onApprove(task.taskId)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition"
              >
                Authorize Action
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(task.taskId)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs border border-rose-900/50 transition"
              >
                Reject & Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6 overflow-x-auto min-h-[300px]">
        {activeTab === 'graph' && (
          <div className="flex flex-col gap-8 items-center justify-center min-w-[640px]">
            {levels.map((lvl) => {
              const nodesAtLevel = safeNodes.filter(n => n.level === lvl);
              const isParallel = nodesAtLevel.length > 1;

              return (
                <div key={lvl} className="w-full flex flex-col items-center">
                  {/* Level Header Tag */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      LEVEL {lvl} {isParallel ? '— PARALLEL CONCURRENT EXECUTION' : '— SEQUENTIAL STAGE'}
                    </span>
                  </div>

                  {/* Level Nodes Grid */}
                  <div className={`grid ${isParallel ? 'grid-cols-2 gap-6' : 'grid-cols-1 max-w-xl'} w-full max-w-3xl`}>
                    {nodesAtLevel.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      const isRunning = node.status === 'running';
                      const isCompleted = node.status === 'completed';

                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                            isRunning
                              ? 'bg-cyan-950/40 border-cyan-500/70 shadow-lg shadow-cyan-500/10'
                              : isCompleted
                              ? 'bg-slate-900/60 border-emerald-500/30'
                              : 'bg-slate-900/30 border-white/5 opacity-60'
                          } ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                                {node.agentName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">({node.role})</span>
                            </div>
                            {getStatusBadge(node.status)}
                          </div>

                          {/* Node Title & Action Detail */}
                          <h4 className="text-xs font-bold text-white mb-1.5">{node.title}</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{node.detail}</p>

                          {/* Tool Tag */}
                          {node.toolUsed && (
                            <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Sliders className="w-3 h-3 text-cyan-400" />
                              Tool: {node.toolUsed}
                            </div>
                          )}

                          {/* Progress bar if running */}
                          {isRunning && (
                            <div className="mt-3 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                              <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                                className="w-1/2 h-full bg-cyan-400 rounded-full"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Connecting Arrow to next level */}
                  {lvl < maxLevel && (
                    <div className="my-3 flex items-center justify-center text-slate-600">
                      <div className="h-4 w-0.5 bg-cyan-500/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Messages & Data Packets Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {safeMessages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No inter-agent communication packets dispatched yet.
              </div>
            ) : (
              safeMessages.map((msg) => (
                <div key={msg.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {msg.sender} <span className="text-slate-500 font-normal">→</span> {msg.receiver}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300">
                      TYPE: {msg.type}
                    </div>
                    <pre className="text-[10px] font-mono bg-slate-950 p-2 rounded-lg text-slate-300 overflow-x-auto border border-white/5">
                      {JSON.stringify(msg.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Terminal Logs Tab */}
        {activeTab === 'logs' && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-300 max-w-3xl mx-auto space-y-1.5 max-h-80 overflow-y-auto">
            {safeLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No terminal logs recorded yet.
              </div>
            ) : (
              safeLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-500 select-none">›</span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Node Details Bar */}
      {selectedNode && (
        <div className="p-4 border-t border-white/10 bg-slate-900/90 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-white">{selectedNode.title}</span>
            <p className="text-slate-400 text-[11px]">{selectedNode.detail}</p>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
