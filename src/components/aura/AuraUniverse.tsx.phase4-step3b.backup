import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Code2,
  Compass,
  Database,
  FileText,
  Globe2,
  Layers3,
  Link2,
  Megaphone,
  Palette,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow
} from 'lucide-react';
import { AuraState, ProjectQuotaStatus, Task, VirtualAgent } from '../../types';
import { AuraCore } from './AuraCore';
import { AuraCommandBar } from './AuraCommandBar';
import { ChatMessage } from './AuraConversation';

interface AuraUniverseProps {
  state: AuraState;
  agents: VirtualAgent[];
  currentTask: Task | null;
  messages: ChatMessage[];
  quota: ProjectQuotaStatus | null;
  isExecuting: boolean;
  isListening: boolean;
  onExecuteCommand: (command: string, files?: File[]) => void;
  onMicToggle: () => void;
  onSelectTab: (tab: 'work' | 'world' | 'memory' | 'projects' | 'integrations' | 'settings') => void;
  onInspectTask: () => void;
}

type Domain = {
  name: string;
  purpose: string;
  color: string;
  icon: React.ElementType;
  tab: AuraUniverseProps['onSelectTab'] extends (tab: infer T) => void ? T : never;
  keywords: string[];
};

const domains: Domain[] = [
  { name: 'KNOWLEDGE', purpose: 'Learn everything', color: '#67e8f9', icon: Database, tab: 'memory', keywords: ['aura', 'scout', 'research'] },
  { name: 'RESEARCH', purpose: 'Find and explore', color: '#34d399', icon: Search, tab: 'work', keywords: ['scout', 'research'] },
  { name: 'WEBSITES', purpose: 'Design and build', color: '#60a5fa', icon: Globe2, tab: 'projects', keywords: ['code', 'pixel'] },
  { name: 'CODE', purpose: 'Develop and debug', color: '#93c5fd', icon: Code2, tab: 'work', keywords: ['code'] },
  { name: 'DESIGN', purpose: 'Visualize and innovate', color: '#f0abfc', icon: Palette, tab: 'projects', keywords: ['pixel'] },
  { name: 'CONTENT', purpose: 'Shape the message', color: '#fbbf24', icon: FileText, tab: 'work', keywords: ['content'] },
  { name: 'AUTOMATION', purpose: 'Connect workflows', color: '#2dd4bf', icon: Workflow, tab: 'integrations', keywords: ['automation'] },
  { name: 'DEPLOYMENT', purpose: 'Ship with evidence', color: '#a7f3d0', icon: Radio, tab: 'work', keywords: ['deploy'] },
  { name: 'ANALYTICS', purpose: 'Read the signal', color: '#c4b5fd', icon: BarChart3, tab: 'work', keywords: ['research', 'qa'] },
  { name: 'INTEGRATIONS', purpose: 'Secure external links', color: '#fda4af', icon: Link2, tab: 'integrations', keywords: ['automation', 'deploy'] },
  { name: 'FILES', purpose: 'Work with artifacts', color: '#fcd34d', icon: Terminal, tab: 'projects', keywords: ['code', 'qa'] },
  { name: 'COMMUNICATION', purpose: 'Keep people in sync', color: '#f9a8d4', icon: Megaphone, tab: 'work', keywords: ['content', 'aura'] }
];

const statusLabel = (agent: VirtualAgent | undefined, auraState?: AuraState) => {
  if (auraState && auraState !== 'IDLE') return auraState[0] + auraState.slice(1).toLowerCase();
  if (!agent) return 'Unavailable';
  return agent.status === 'idle' ? 'Ready' : agent.status[0].toUpperCase() + agent.status.slice(1);
};

const UniverseField: React.FC<{ state: AuraState; active: boolean }> = ({ state, active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const density = window.innerWidth < 640 ? 90 : window.innerWidth < 1024 ? 150 : 240;
    const particles = Array.from({ length: density }, (_, index) => ({
      x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0007, vy: (Math.random() - 0.5) * 0.0007,
      radius: Math.random() * 1.7 + 0.35, depth: Math.random(), phase: Math.random() * Math.PI * 2, index
    }));
    let frame = 0;
    let animationId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.current = { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, active: true };
    };
    const onPointerLeave = () => { pointer.current.active = false; };
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const render = () => {
      frame += reduced ? 0.25 : 1;
      context.clearRect(0, 0, width, height);
      const intensity = state === 'ERROR' ? '#fb7185' : state === 'SUCCESS' ? '#34d399' : state === 'EMPATHY' ? '#f9a8d4' : '#38bdf8';
      const centerX = width * 0.5;
      const centerY = height * 0.49;
      const corePull = state === 'LISTENING' || state === 'UNDERSTANDING' ? 0.0008 : 0.00025;
      const speed = active ? 1.3 : 0.8;

      context.globalCompositeOperation = 'lighter';
      particles.forEach((particle) => {
        const dx = 0.5 - particle.x;
        const dy = 0.49 - particle.y;
        const distance = Math.max(0.04, Math.hypot(dx, dy));
        const noise = Math.sin(frame * 0.012 + particle.phase) * 0.00008;
        particle.vx += (dx / distance) * corePull + noise;
        particle.vy += (dy / distance) * corePull + Math.cos(frame * 0.009 + particle.phase) * 0.00008;
        if (pointer.current.active) {
          const px = pointer.current.x - particle.x;
          const py = pointer.current.y - particle.y;
          const pd = Math.max(0.035, Math.hypot(px, py));
          const force = pd < 0.2 ? -0.00035 / pd : 0.00006 / pd;
          particle.vx += px * force;
          particle.vy += py * force;
        }
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.x += particle.vx * speed;
        particle.y += particle.vy * speed;
        if (particle.x < -0.02 || particle.x > 1.02 || particle.y < -0.02 || particle.y > 1.02) {
          particle.x = Math.random(); particle.y = Math.random(); particle.vx *= 0.2; particle.vy *= 0.2;
        }
        const x = particle.x * width;
        const y = particle.y * height;
        const alpha = 0.25 + particle.depth * 0.6;
        context.beginPath();
        context.fillStyle = `${intensity}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        context.arc(x, y, particle.radius * (0.7 + particle.depth), 0, Math.PI * 2);
        context.fill();
        if (particle.index % 14 === 0) {
          const nearX = centerX + Math.cos(frame * 0.001 + particle.phase) * width * 0.2;
          const nearY = centerY + Math.sin(frame * 0.001 + particle.phase) * height * 0.2;
          context.beginPath();
          context.strokeStyle = `${intensity}18`;
          context.lineWidth = 0.5;
          context.moveTo(x, y); context.lineTo(nearX, nearY); context.stroke();
        }
      });
      context.globalCompositeOperation = 'source-over';
      animationId = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [state, active]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-75" aria-hidden="true" />;
};

export const AuraUniverse: React.FC<AuraUniverseProps> = ({
  state, agents, currentTask, messages, quota, isExecuting, isListening, onExecuteCommand, onMicToggle, onSelectTab, onInspectTask
}) => {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const activeTaskNodes = (currentTask?.nodes || []).filter(node => !['completed', 'failed'].includes(node.status));
  const activeAgentNames = new Set(activeTaskNodes.map(node => node.agentName.toLowerCase()));
  const activeDomainNames = new Set(domains.filter(domain => domain.keywords.some(keyword => activeAgentNames.has(keyword))).map(domain => domain.name));
  const recentActivity = currentTask?.logs?.slice(-3).reverse() || messages.filter(message => message.sender === 'aura').slice(-2).map(message => message.text);
  const coreActive = state !== 'IDLE' || Boolean(currentTask && ['RUNNING', 'VERIFYING', 'WAITING_FOR_APPROVAL'].includes(currentTask.status));

  return (
    <section className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#03050b] text-slate-100">
      <UniverseField state={state} active={coreActive} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(14,116,144,0.17),transparent_27%),radial-gradient(circle_at_78%_18%,rgba(124,58,237,0.12),transparent_24%),linear-gradient(180deg,rgba(2,5,11,0.32),rgba(2,5,11,0.88))]" />
      <div className="relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col px-3 pb-4 pt-3 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-[18rem] select-none">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-300"><Sparkles className="h-3.5 w-3.5" /> Aura's living universe</div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Intelligence in motion.</h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">A spatial view of the work AURA can actually observe.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 backdrop-blur-md sm:flex"><Activity className="h-3.5 w-3.5 text-emerald-300" /> Live telemetry</div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[10rem_minmax(0,1fr)_13rem] lg:items-center lg:gap-5">
          <aside className="order-2 hidden space-y-3 lg:order-1 lg:block">
            <div className="border-l border-cyan-400/30 pl-3"><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">Signal map</p><p className="mt-1 text-xs leading-relaxed text-slate-400">Domains open the real workspace behind each capability.</p></div>
            <div className="grid gap-1.5">
              {domains.slice(0, 6).map((domain) => { const Icon = domain.icon; const active = domain.keywords.some(keyword => activeAgentNames.has(keyword)); return <button key={domain.name} type="button" onClick={() => onSelectTab(domain.tab)} onMouseEnter={() => setHoveredDomain(domain.name)} onMouseLeave={() => setHoveredDomain(null)} className={`flex items-center gap-2 border-l-2 px-2 py-2 text-left transition ${active ? 'border-cyan-300 bg-cyan-400/10 text-white' : 'border-transparent text-slate-400 hover:border-white/30 hover:text-white'}`}><Icon className="h-3.5 w-3.5" style={{ color: domain.color }} /><span className="text-[10px] font-mono tracking-wider">{domain.name}</span></button>; })}
            </div>
          </aside>

          <div className="relative order-1 flex min-h-[31rem] items-center justify-center lg:order-2 lg:min-h-[42rem]">
            <div className="pointer-events-none absolute h-[20rem] w-[20rem] rounded-full border border-cyan-300/10 shadow-[0_0_100px_rgba(34,211,238,0.08)] sm:h-[29rem] sm:w-[29rem] lg:h-[34rem] lg:w-[34rem]" />
            <div className="pointer-events-none absolute h-[25rem] w-[25rem] rounded-full border border-violet-300/10 [transform:rotateX(62deg)_rotateZ(-18deg)] sm:h-[35rem] sm:w-[35rem] lg:h-[40rem] lg:w-[40rem]" />
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="universeBeamGlow"><feGaussianBlur stdDeviation="0.45" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {domains.map((domain, index) => {
                const angle = (index / domains.length) * Math.PI * 2 - Math.PI / 2;
                const x = 50 + Math.cos(angle) * 43;
                const y = 50 + Math.sin(angle) * 43;
                const isActive = activeDomainNames.has(domain.name);
                return <g key={`beam-${domain.name}`} opacity={isActive ? 0.8 : 0.18} filter={isActive ? 'url(#universeBeamGlow)' : undefined}>
                  <line x1="50" y1="50" x2={x} y2={y} stroke={domain.color} strokeWidth={isActive ? '0.32' : '0.12'} strokeDasharray={isActive ? '1.5 1.2' : '0.7 2.4'} />
                  {isActive && <circle r="0.75" fill={domain.color}><animateMotion dur="2.2s" repeatCount="indefinite" path={`M 50 50 L ${x} ${y}`} /></circle>}
                </g>;
              })}
            </svg>
            <AuraCore state={state} size="hero" showLabel={false} onCoreClick={onInspectTask} className="scale-[0.72] sm:scale-90 lg:scale-100" />
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-center"><div className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-200/80">{state}</div><div className="mt-1 text-xs text-slate-500">AURA cognitive core</div></div>
            {domains.map((domain, index) => { const Icon = domain.icon; const angle = (index / domains.length) * Math.PI * 2 - Math.PI / 2; const x = 50 + Math.cos(angle) * 43; const y = 50 + Math.sin(angle) * 43; const active = activeDomainNames.has(domain.name); return <button key={domain.name} type="button" onClick={() => onSelectTab(domain.tab)} onMouseEnter={() => setHoveredDomain(domain.name)} onMouseLeave={() => setHoveredDomain(null)} className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition duration-300 ${active ? 'scale-110' : 'hover:scale-110'}`} style={{ left: `${x}%`, top: `${y}%` }} aria-label={`${domain.name}: ${domain.purpose}`}><span className={`relative flex h-9 w-9 items-center justify-center rounded-full border bg-[#07101a]/90 backdrop-blur-md sm:h-11 sm:w-11 ${active ? 'border-white/80 shadow-[0_0_24px_currentColor]' : 'border-white/15'}`} style={{ color: domain.color }}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /><span className="absolute inset-[-5px] rounded-full border border-current/20 [transform:rotateX(68deg)]" />{active && <span className="absolute inset-[-9px] rounded-full border border-current/40 animate-ping" />}</span><span className="whitespace-nowrap text-[8px] font-mono tracking-[0.12em] text-slate-300 sm:text-[9px]">{domain.name}</span>{hoveredDomain === domain.name && <span className="absolute top-14 z-20 w-28 rounded border border-white/10 bg-[#07101a]/95 px-2 py-1 text-[9px] leading-tight text-slate-300 shadow-xl">{domain.purpose}</span>}</button>; })}
          </div>

          <aside className="order-3 space-y-3">
            <div className="border border-white/10 bg-black/25 p-3 backdrop-blur-md"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Active agents</span><Bot className="h-3.5 w-3.5 text-cyan-300" /></div><div className="space-y-2">{['AURA', 'SCOUT', 'PIXEL', 'CODE', 'QA', 'DEPLOY'].map((name) => { const agent = agents.find(item => item.name === name); const active = name === 'AURA' ? state !== 'IDLE' : activeAgentNames.has(name.toLowerCase()) || agent?.status === 'working'; return <div key={name} className="flex items-center justify-between gap-2 text-[10px] font-mono"><span className={active ? 'text-white' : 'text-slate-500'}>{name}</span><span className={active ? 'text-cyan-300' : 'text-slate-600'}>{active ? statusLabel(agent, name === 'AURA' ? state : undefined) : agent ? statusLabel(agent) : 'Unavailable'}</span></div>; })}</div></div>
            <div className="border border-white/10 bg-black/25 p-3 backdrop-blur-md"><div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400"><Layers3 className="h-3.5 w-3.5 text-violet-300" /> Recent activity</div>{recentActivity.length > 0 ? <div className="space-y-2">{recentActivity.map((entry, index) => <p key={`${entry}-${index}`} className="border-l border-violet-300/30 pl-2 text-[10px] leading-relaxed text-slate-400">{entry}</p>)}</div> : <p className="text-[10px] text-slate-600">No activity recorded yet.</p>}</div>
            <button type="button" onClick={() => onSelectTab('work')} className="flex w-full items-center justify-between border border-cyan-300/20 bg-cyan-400/5 p-3 text-left hover:bg-cyan-400/10"><span><span className="block text-[10px] font-mono uppercase tracking-wider text-cyan-300">Task graph</span><span className="mt-1 block max-w-[10rem] truncate text-xs text-slate-300">{currentTask?.title || 'No active task'}</span></span><ShieldCheck className="h-4 w-4 text-cyan-300" /></button>
          </aside>
        </div>

        <div className="mx-auto w-full max-w-3xl"><div className="mb-2 flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-wider text-slate-500"><span>{quota?.isOwner ? 'OWNER / UNLIMITED' : `FREE PLAN / ${quota?.used ?? 0} OF ${quota?.limit ?? 5} PROJECTS`}</span><span>{isExecuting ? 'Pipeline active' : isListening ? 'Listening' : 'Ready for a goal'}</span></div><AuraCommandBar onExecuteCommand={onExecuteCommand} isExecuting={isExecuting} orbState={state} onMicToggle={onMicToggle} isListening={isListening} /></div>
      </div>
    </section>
  );
};
