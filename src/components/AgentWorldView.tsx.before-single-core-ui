import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VirtualAgent, Workstation, AgentMessage } from '../types';
import { 
  Sparkles, 
  Palette, 
  Terminal, 
  Compass, 
  ShieldCheck, 
  Zap, 
  Activity, 
  CheckCircle2, 
  Database,
  Globe,
  Radio,
  RefreshCw,
  X,
  Play,
  Pause,
  Layers,
  FileText,
  Clock,
  ChevronRight
} from 'lucide-react';

interface AgentWorldViewProps {
  agents?: VirtualAgent[];
  activeMessages?: AgentMessage[];
  onSelectAgent?: (agent: VirtualAgent) => void;
  onRefreshAgents?: () => void;
}

export const AgentWorldView: React.FC<AgentWorldViewProps> = ({
  agents = [],
  activeMessages = [],
  onSelectAgent,
  onRefreshAgents
}) => {
  const [selectedAgent, setSelectedAgent] = useState<VirtualAgent | null>(null);
  const [activePackets, setActivePackets] = useState<any[]>([]);
  const [agentProgressMap, setAgentProgressMap] = useState<Record<string, number>>({});

  // 7 Specialist agent stations surrounding the central AURA Core Hologram
  const stations = [
    { 
      id: 'station-scout', 
      name: 'SCOUT Station', 
      code: 'SCOUT', 
      agentId: 'agent-scout', 
      role: 'Research & Intelligence',
      gridX: 20, 
      gridY: 26, 
      color: '#10B981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      icon: Compass 
    },
    { 
      id: 'station-pixel', 
      name: 'PIXEL Studio', 
      code: 'PIXEL', 
      agentId: 'agent-pixel', 
      role: 'Design & Spatial UI',
      gridX: 80, 
      gridY: 26, 
      color: '#EC4899',
      bgGlow: 'rgba(236, 72, 153, 0.15)',
      icon: Palette 
    },
    { 
      id: 'station-code', 
      name: 'CODE Lab', 
      code: 'CODE', 
      agentId: 'agent-code', 
      role: 'Engineering & Systems',
      gridX: 14, 
      gridY: 60, 
      color: '#3B82F6',
      bgGlow: 'rgba(59, 130, 246, 0.15)',
      icon: Terminal 
    },
    { 
      id: 'station-research', 
      name: 'RESEARCH Intelligence', 
      code: 'RESEARCH', 
      agentId: 'agent-research', 
      role: 'Data & Market Analytics',
      gridX: 86, 
      gridY: 60, 
      color: '#06B6D4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
      icon: Database 
    },
    { 
      id: 'station-qa', 
      name: 'QA Chamber', 
      code: 'QA', 
      agentId: 'agent-qa', 
      role: 'Verification & Compliance',
      gridX: 28, 
      gridY: 84, 
      color: '#8B5CF6',
      bgGlow: 'rgba(139, 92, 246, 0.15)',
      icon: ShieldCheck 
    },
    { 
      id: 'station-deploy', 
      name: 'DEPLOY Ops', 
      code: 'DEPLOY', 
      agentId: 'agent-deploy', 
      role: 'Cloud Runtime & CI/CD',
      gridX: 50, 
      gridY: 88, 
      color: '#14B8A6',
      bgGlow: 'rgba(20, 184, 166, 0.15)',
      icon: Globe 
    },
    { 
      id: 'station-content', 
      name: 'CONTENT Studio', 
      code: 'CONTENT', 
      agentId: 'agent-content', 
      role: 'Copywriting & SEO Engine',
      gridX: 72, 
      gridY: 84, 
      color: '#F59E0B',
      bgGlow: 'rgba(245, 158, 11, 0.15)',
      icon: FileText 
    }
  ];

  // Default fallback agents if agents prop is partially populated
  const defaultAgentMap: Record<string, Partial<VirtualAgent>> = {
    'agent-scout': {
      id: 'agent-scout',
      name: 'SCOUT',
      code: 'SCOUT',
      role: 'Research & Reconnaissance',
      status: 'idle',
      currentActivity: 'Scanning live domains and architectural best practices',
      energy: 94
    },
    'agent-pixel': {
      id: 'agent-pixel',
      name: 'PIXEL',
      code: 'PIXEL',
      role: 'Design & Spatial UI',
      status: 'idle',
      currentActivity: 'Polishing responsive layout and optical tokens',
      energy: 98
    },
    'agent-code': {
      id: 'agent-code',
      name: 'CODE',
      code: 'CODE',
      role: 'Engineering & Code Generation',
      status: 'idle',
      currentActivity: 'Engineered TypeScript and component trees',
      energy: 92
    },
    'agent-qa': {
      id: 'agent-qa',
      name: 'QA',
      code: 'QA',
      role: 'Verification & Compliance',
      status: 'idle',
      currentActivity: 'Running linter and WCAG accessibility verifications',
      energy: 100
    },
    'agent-research': {
      id: 'agent-research',
      name: 'RESEARCH',
      code: 'RESEARCH',
      role: 'Market & Data Intelligence',
      status: 'idle',
      currentActivity: 'Synthesizing competitor insights and keyword volumes',
      energy: 96
    },
    'agent-deploy': {
      id: 'agent-deploy',
      name: 'DEPLOY',
      code: 'DEPLOY',
      role: 'Cloud Runtime & Infrastructure',
      status: 'idle',
      currentActivity: 'Edge container cluster active and standing by',
      energy: 100
    },
    'agent-content': {
      id: 'agent-content',
      name: 'CONTENT',
      code: 'CONTENT',
      role: 'Copywriting & SEO Strategist',
      status: 'idle',
      currentActivity: 'Drafting high-conversion headlines and JSON-LD markup',
      energy: 95
    }
  };

  // Continuous progress oscillation for working agents
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentProgressMap(prev => {
        const next = { ...prev };
        stations.forEach(s => {
          const a = (agents || []).find(x => x.id === s.agentId);
          const isWorking = a?.status === 'working' || a?.status === 'thinking';
          if (isWorking) {
            const current = next[s.agentId] || 15;
            next[s.agentId] = current >= 95 ? 15 : current + Math.floor(Math.random() * 8 + 4);
          } else {
            next[s.agentId] = 100;
          }
        });
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [agents]);

  // Traveling data packets between Core and Station nodes
  useEffect(() => {
    const packets = stations.map((s, idx) => ({
      id: `pkt-core-${s.code}-${idx}`,
      fromX: 50,
      fromY: 42,
      toX: s.gridX,
      toY: s.gridY,
      color: s.color,
      duration: 2.4 + idx * 0.3
    }));
    setActivePackets(packets);
  }, []);

  const getAgentData = (agentId: string): VirtualAgent => {
    const found = (agents || []).find(a => a.id === agentId);
    if (found) return found;
    return (defaultAgentMap[agentId] || {
      id: agentId,
      name: agentId.replace('agent-', '').toUpperCase(),
      code: agentId.replace('agent-', '').toUpperCase(),
      role: 'Specialist Sub-agent',
      status: 'idle',
      currentActivity: 'Standing by for orchestration delegation',
      energy: 90
    }) as VirtualAgent;
  };

  return (
    <div className="relative w-full rounded-3xl bg-[#02050D] border border-white/[0.08] overflow-hidden shadow-2xl flex flex-col select-none">
      {/* Top HUD Status Bar */}
      <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                AURA AI DIGITAL ENVIRONMENT
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                2.5D SPATIAL WORKSPACE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              7 Specialist autonomous agent stations synchronized with Central Holographic Core.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="hidden sm:inline">Active Workers:</span>
            <span>{stations.filter(s => getAgentData(s.agentId).status === 'working').length || 'Idle Standby'}</span>
          </span>
          {onRefreshAgents && (
            <button
              onClick={onRefreshAgents}
              title="Refresh Telemetry"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main 2.5D Spatial Command Stage */}
      <div className="relative w-full h-[580px] sm:h-[660px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-[#030612] to-[#010307] overflow-hidden">
        {/* Isometric Deep Space Perspective Grid */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(56, 189, 248, 0.25) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(56, 189, 248, 0.25) 1px, transparent 1px)`,
            backgroundSize: '46px 46px',
            perspective: '700px',
            transform: 'rotateX(42deg) scale(1.35)'
          }}
        />

        {/* Ambient Floor Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-12 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-12 right-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* SVG Laser Conduits & Travelling Data Packets from AURA Core */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {stations.map((s) => (
            <g key={`conduit-${s.id}`}>
              {/* Glowing data conduit line */}
              <line 
                x1="50%" 
                y1="42%" 
                x2={`${s.gridX}%`} 
                y2={`${s.gridY}%`} 
                stroke={s.color} 
                strokeWidth="1.2" 
                strokeDasharray="4 6" 
                strokeOpacity="0.32" 
              />
            </g>
          ))}

          {/* Animated Travelling Packets */}
          {activePackets.map((pkt) => (
            <g key={pkt.id}>
              <motion.circle
                initial={{ cx: '50%', cy: '42%', r: 3.5, opacity: 0 }}
                animate={{ 
                  cx: ['50%', `${pkt.toX}%`],
                  cy: ['42%', `${pkt.toY}%`],
                  opacity: [0, 0.9, 0.9, 0]
                }}
                transition={{ duration: pkt.duration, repeat: Infinity, ease: 'linear' }}
                fill={pkt.color}
              />
              <motion.circle
                initial={{ cx: '50%', cy: '42%', r: 7, opacity: 0 }}
                animate={{ 
                  cx: ['50%', `${pkt.toX}%`],
                  cy: ['42%', `${pkt.toY}%`],
                  opacity: [0, 0.45, 0]
                }}
                transition={{ duration: pkt.duration, repeat: Infinity, ease: 'linear' }}
                fill="none"
                stroke={pkt.color}
                strokeWidth="1"
              />
            </g>
          ))}
        </svg>

        {/* CENTRAL HERO: AURA Core Hologram in World Mode */}
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          {/* Holographic Platform Base */}
          <div className="relative flex items-center justify-center">
            {/* Outer Holographic Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              className="w-36 h-36 rounded-full border border-cyan-400/30 border-dashed absolute"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="w-48 h-48 rounded-full border border-blue-500/20 border-dotted absolute"
            />

            {/* Central Hologram Orb */}
            <div 
              className="w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl relative"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #38BDF8 0%, #0369A1 50%, #030712 100%)',
                boxShadow: '0 0 45px rgba(56, 189, 248, 0.45), inset 0 2px 10px rgba(255,255,255,0.4)'
              }}
            >
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-cyan-200 mt-1">AURA</span>
            </div>
          </div>

          {/* Central Core Label */}
          <div className="mt-3 px-3 py-1 rounded-full bg-slate-950/80 border border-cyan-500/40 text-center shadow-lg backdrop-blur-md">
            <span className="text-[11px] font-bold text-white tracking-wider">AURA COGNITIVE CORE</span>
          </div>
        </div>

        {/* 7 SPECIALIST AGENT STATIONS */}
        {stations.map((station) => {
          const agent = getAgentData(station.agentId);
          const Icon = station.icon;
          const isWorking = agent.status === 'working';
          const isThinking = agent.status === 'thinking';
          const progress = agentProgressMap[station.agentId] || (isWorking ? 65 : 100);

          return (
            <div
              key={station.id}
              onClick={() => {
                setSelectedAgent(agent);
                if (onSelectAgent) onSelectAgent(agent);
              }}
              style={{ left: `${station.gridX}%`, top: `${station.gridY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
            >
              {/* Station Platform Pad */}
              <motion.div
                animate={{
                  scale: isWorking ? [1, 1.08, 1] : [1, 1.03, 1],
                  opacity: isWorking ? [0.6, 0.9, 0.6] : [0.35, 0.5, 0.35]
                }}
                transition={{ duration: isWorking ? 1.4 : 3.2, repeat: Infinity }}
                style={{ borderColor: station.color, backgroundColor: station.bgGlow }}
                className="w-28 sm:w-32 h-28 sm:h-32 rounded-3xl border-2 backdrop-blur-sm absolute -inset-3 -z-10 shadow-lg"
              />

              {/* Station Card Box */}
              <motion.div
                animate={{
                  y: isWorking ? [-3, 3, -3] : [0, -2, 0]
                }}
                transition={{
                  duration: isWorking ? 0.7 : 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="w-24 sm:w-28 p-2.5 rounded-2xl bg-slate-950/90 border border-white/10 group-hover:border-cyan-400 transition-all flex flex-col items-center gap-1 shadow-xl backdrop-blur-md"
              >
                {/* Agent Icon Avatar with Status Badge */}
                <div 
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${station.color}25`, border: `1.5px solid ${station.color}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: station.color }} />
                  {/* Status Indicator Dot */}
                  <span 
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                      isWorking ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
                    }`} 
                  />
                  <span 
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                      isWorking ? 'bg-cyan-400' : 'bg-emerald-400'
                    }`} 
                  />
                </div>

                {/* Agent Name */}
                <div className="text-center w-full">
                  <span className="text-[11px] font-extrabold text-white tracking-wide block truncate">
                    {station.code}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block truncate">
                    {isWorking ? 'WORKING' : 'IDLE'}
                  </span>
                </div>

                {/* Real-time Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5 mt-0.5">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: station.color
                    }}
                  />
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* SLEEK AGENT DETAIL DRAWER / INSPECTOR MODAL */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 rounded-2xl bg-slate-950/95 border border-white/15 p-4 shadow-2xl backdrop-blur-2xl z-30 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: `${selectedAgent.color || '#38BDF8'}20`, color: selectedAgent.color || '#38BDF8' }}
                >
                  {selectedAgent.code?.substring(0, 2) || 'AG'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">{selectedAgent.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedAgent.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status & Activity */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Current Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedAgent.status || 'READY'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/5 text-[11px] text-slate-300">
                <span className="text-slate-400 block text-[10px] font-mono mb-1">LIVE ACTIVITY:</span>
                {selectedAgent.currentActivity || 'Synchronized with AURA Brain and awaiting task decomposition.'}
              </div>
            </div>

            {/* Live Mock Terminal Log Output */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-cyan-400" />
                TELEMETRY LOGS:
              </span>
              <div className="p-2 rounded-xl bg-black/70 border border-white/5 font-mono text-[10px] text-slate-300 space-y-1 max-h-24 overflow-y-auto">
                <div className="text-cyan-400">&gt; [neural-bus] telemetry synced</div>
                <div className="text-slate-400">&gt; station ready: {selectedAgent.stationName || 'Virtual Chamber'}</div>
                <div className="text-emerald-400">&gt; energy: {selectedAgent.energy || 98}% | tasks: {selectedAgent.tasksCompleted || 42}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  alert(`Dispatched health verification ping to ${selectedAgent.name}. Telemetry optimal.`);
                }}
                className="flex-1 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Trigger Ping</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-white/10 transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
