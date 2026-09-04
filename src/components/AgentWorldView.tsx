import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VirtualAgent, Workstation, AgentMessage } from '../types';
import { 
  Brain, 
  Palette, 
  Terminal, 
  Compass, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Globe,
  Radio,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Info
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

  // Default workstations in the 2.5D futuristic digital command center
  const workstations: Workstation[] = [
    { id: 'station-command', name: 'AURA Cognitive Core', category: 'core', agentId: 'agent-aura', gridX: 50, gridY: 26, active: true, color: '#38BDF8' },
    { id: 'station-research', name: 'Research Station (SCOUT)', category: 'research', agentId: 'agent-scout', gridX: 18, gridY: 42, active: true, color: '#10B981' },
    { id: 'station-design', name: 'Design Studio (PIXEL)', category: 'design', agentId: 'agent-pixel', gridX: 82, gridY: 42, active: true, color: '#EC4899' },
    { id: 'station-coding', name: 'Code Engineering Lab (CODE)', category: 'development', agentId: 'agent-code', gridX: 32, gridY: 72, active: true, color: '#3B82F6' },
    { id: 'station-qa', name: 'QA & Verification Chamber (QA)', category: 'quality', agentId: 'agent-qa', gridX: 68, gridY: 72, active: true, color: '#8B5CF6' }
  ];

  // Visual packet animation generator when messages arrive
  useEffect(() => {
    if (activeMessages.length > 0) {
      const recent = activeMessages.slice(-3);
      const safeAgents = agents || [];
      const packets = recent.map((msg, idx) => {
        const sourceAgent = safeAgents.find(a => a.name.toLowerCase() === msg.sender.toLowerCase());
        const targetAgent = safeAgents.find(a => a.name.toLowerCase() === msg.receiver.toLowerCase());
        const sourceStation = sourceAgent ? workstations.find(w => w.agentId === sourceAgent.id) : workstations[0];
        const targetStation = targetAgent ? workstations.find(w => w.agentId === targetAgent.id) : workstations[3];

        return {
          id: msg.id || `pkt-${idx}-${Date.now()}`,
          fromX: sourceStation?.gridX ?? 50,
          fromY: sourceStation?.gridY ?? 30,
          toX: targetStation?.gridX ?? 35,
          toY: targetStation?.gridY ?? 70,
          color: sourceAgent?.color || '#06B6D4',
          label: msg.type
        };
      });
      setActivePackets(packets);
    }
  }, [activeMessages, agents]);

  // Icon map for agents
  const getIcon = (code: string) => {
    switch (code) {
      case 'AETHER': return Brain;
      case 'PIXEL': return Palette;
      case 'CODE': return Terminal;
      case 'SCOUT': return Compass;
      case 'QA': return ShieldCheck;
      default: return Activity;
    }
  };

  return (
    <div className="relative w-full rounded-3xl bg-[#030712] border border-white/10 overflow-hidden shadow-2xl flex flex-col select-none">
      {/* Top HUD Bar */}
      <div className="p-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">AURA AI DIGITAL WORKSPACE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                2.5D SPATIAL LAB
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time parallel agents communicating across virtual workstations.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{(agents || []).filter(a => a?.status === 'working').length} Active Workers</span>
          </span>
          {onRefreshAgents && (
            <button
              onClick={onRefreshAgents}
              title="Refresh Agent Telemetry"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main 2.5D Virtual Office Floor */}
      <div className="relative w-full h-[520px] sm:h-[580px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-[#030712] to-[#02050B] overflow-hidden">
        {/* Isometric Grid Lines Pattern */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(6, 182, 212, 0.2) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(6, 182, 212, 0.2) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            perspective: '600px',
            transform: 'rotateX(40deg) scale(1.3)'
          }}
        />

        {/* Ambient Floor Glow Circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* SVG Connection Network & Data Packets */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Static network lines between stations */}
          <line x1="50%" y1="28%" x2="20%" y2="40%" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="50%" y1="28%" x2="80%" y2="40%" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="20%" y1="40%" x2="35%" y2="72%" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="80%" y1="40%" x2="35%" y2="72%" stroke="rgba(236, 72, 153, 0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="35%" y1="72%" x2="65%" y2="72%" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="65%" y1="72%" x2="50%" y2="28%" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Animated Traveling Data Packets */}
          {activePackets.map((pkt) => (
            <g key={pkt.id}>
              <motion.circle
                initial={{ cx: `${pkt.fromX}%`, cy: `${pkt.fromY}%`, r: 4, opacity: 0 }}
                animate={{ 
                  cx: [`${pkt.fromX}%`, `${pkt.toX}%`],
                  cy: [`${pkt.fromY}%`, `${pkt.toY}%`],
                  opacity: [0, 1, 1, 0]
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                fill={pkt.color}
              />
              <motion.circle
                initial={{ cx: `${pkt.fromX}%`, cy: `${pkt.fromY}%`, r: 8, opacity: 0 }}
                animate={{ 
                  cx: [`${pkt.fromX}%`, `${pkt.toX}%`],
                  cy: [`${pkt.fromY}%`, `${pkt.toY}%`],
                  opacity: [0, 0.5, 0]
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                fill="none"
                stroke={pkt.color}
                strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>

        {/* Workstations & Animated Pixel-Style Virtual Agents */}
        {workstations.map((station) => {
          const agent = (agents || []).find(a => a.id === station.agentId);
          if (!agent) return null;
          const Icon = getIcon(agent.code);
          const isWorking = agent.status === 'working';
          const isThinking = agent.status === 'thinking';
          const isSuccess = agent.status === 'success';

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
              {/* Station Pad / Glow Floor */}
              <motion.div
                animate={{
                  scale: isWorking ? [1, 1.12, 1] : [1, 1.03, 1],
                  opacity: isWorking ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3]
                }}
                transition={{ duration: isWorking ? 1.4 : 3, repeat: Infinity }}
                style={{ borderColor: station.color, backgroundColor: `${station.color}15` }}
                className="w-28 h-28 rounded-2xl border-2 backdrop-blur-sm absolute -inset-3 -z-10 shadow-lg"
              />

              {/* Pixel-Style Virtual Agent Avatar Box */}
              <motion.div
                animate={{
                  y: isWorking ? [-3, 3, -3] : isThinking ? [-1, 2, -1] : [0, -2, 0],
                  scale: isSuccess ? [1, 1.15, 1] : 1
                }}
                transition={{
                  duration: isWorking ? 0.6 : 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className={`relative w-24 h-24 rounded-2xl bg-slate-900/90 border-2 p-3 shadow-2xl flex flex-col items-center justify-between transition-transform duration-300 group-hover:scale-110 ${
                  isWorking ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-white/10'
                }`}
                style={{ borderColor: isWorking ? station.color : 'rgba(255,255,255,0.15)' }}
              >
                {/* Status Indicator Tag */}
                <div className="w-full flex items-center justify-between">
                  <span 
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ backgroundColor: `${station.color}30`, color: station.color }}
                  >
                    {agent.code}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    isWorking ? 'bg-cyan-400 animate-ping' : isThinking ? 'bg-purple-400 animate-pulse' : 'bg-slate-500'
                  }`} />
                </div>

                {/* Pixel Avatar Representation */}
                <div className="relative my-1">
                  <div 
                    className="p-2.5 rounded-xl border flex items-center justify-center"
                    style={{ backgroundColor: `${station.color}20`, borderColor: `${station.color}40`, color: station.color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Thinking Sparks / Working Tool Animation */}
                  {isWorking && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-slate-950 text-[8px] font-bold"
                    >
                      ⚡
                    </motion.div>
                  )}
                </div>

                {/* Micro Energy Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${agent.energy}%`, backgroundColor: station.color }}
                  />
                </div>
              </motion.div>

              {/* Station Name & Live Activity Bubble */}
              <div className="mt-2 text-center pointer-events-none">
                <div className="text-[11px] font-bold text-white tracking-wide">{agent.name}</div>
                <div className="text-[9px] text-slate-400 max-w-[130px] truncate">{agent.currentActivity}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Inspector Drawer */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="p-5 bg-slate-900 border-t border-white/10 z-30 flex items-start justify-between flex-wrap gap-4"
          >
            <div className="flex items-start gap-4">
              <div 
                className="p-3 rounded-2xl border flex items-center justify-center"
                style={{ backgroundColor: `${selectedAgent.color}20`, borderColor: `${selectedAgent.color}50`, color: selectedAgent.color }}
              >
                {React.createElement(getIcon(selectedAgent.code), { className: 'w-6 h-6' })}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{selectedAgent.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                    {selectedAgent.role}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    selectedAgent.status === 'working' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedAgent.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl">{selectedAgent.currentActivity}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                  <span>Workstation: {selectedAgent.stationName}</span>
                  <span>Tasks Finished: {selectedAgent.tasksCompleted}</span>
                  <span>Energy Level: {selectedAgent.energy}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
