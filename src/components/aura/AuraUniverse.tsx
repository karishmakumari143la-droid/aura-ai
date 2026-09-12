import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Brain,
  Eye,
  X,
  Database,
  FileText,
  Globe2,
  Layers3,
  Link2,
  Megaphone,
  Palette,
  Radio,
  Search,
  Sparkles,
  Terminal,
  Workflow,
} from 'lucide-react';

import { AuraState, ProjectQuotaStatus } from '../../types';
import { AuraCore } from './AuraCore';
import { AuraCommandBar } from './AuraCommandBar';
import { ChatMessage } from './AuraConversation';

interface AuraUniverseProps {
  state: AuraState;
  messages: ChatMessage[];
  quota: ProjectQuotaStatus | null;
  isExecuting: boolean;
  isListening: boolean;
  activeExecution?: {
    execution?: any;
    verification?: any;
    success?: boolean;
    intent?: string;
  } | null;
  onExecuteCommand: (command: string, files?: File[]) => void;
  onMicToggle: () => void;
  onSelectTab: (
    tab:
      | 'work'
      | 'world'
      | 'memory'
      | 'projects'
      | 'integrations'
      | 'settings'
  ) => void;
}

type Domain = {
  name: string;
  purpose: string;
  color: string;
  icon: React.ElementType;
  tab: AuraUniverseProps['onSelectTab'] extends (tab: infer T) => void
    ? T
    : never;
};

const domains: Domain[] = [
  {
    name: 'KNOWLEDGE',
    purpose: 'Remember, retrieve and organize knowledge',
    color: '#67e8f9',
    icon: Database,
    tab: 'memory',
  },
  {
    name: 'RESEARCH',
    purpose: 'Find, inspect and understand information',
    color: '#34d399',
    icon: Search,
    tab: 'work',
  },
  {
    name: 'WEBSITES',
    purpose: 'Create and improve real websites',
    color: '#60a5fa',
    icon: Globe2,
    tab: 'projects',
  },
  {
    name: 'CODE',
    purpose: 'Develop, inspect, test and debug',
    color: '#93c5fd',
    icon: Terminal,
    tab: 'work',
  },
  {
    name: 'DESIGN',
    purpose: 'Create visual experiences and interfaces',
    color: '#f0abfc',
    icon: Palette,
    tab: 'projects',
  },
  {
    name: 'CONTENT',
    purpose: 'Write, transform and communicate',
    color: '#fbbf24',
    icon: FileText,
    tab: 'work',
  },
  {
    name: 'AUTOMATION',
    purpose: 'Connect tools and execute workflows',
    color: '#2dd4bf',
    icon: Workflow,
    tab: 'integrations',
  },
  {
    name: 'DEPLOYMENT',
    purpose: 'Prepare and ship verified work',
    color: '#a7f3d0',
    icon: Radio,
    tab: 'work',
  },
  {
    name: 'ANALYTICS',
    purpose: 'Measure, inspect and interpret signals',
    color: '#c4b5fd',
    icon: BarChart3,
    tab: 'work',
  },
  {
    name: 'INTEGRATIONS',
    purpose: 'Connect authorized external systems',
    color: '#fda4af',
    icon: Link2,
    tab: 'integrations',
  },
  {
    name: 'FILES',
    purpose: 'Read, create and manage authorized artifacts',
    color: '#fcd34d',
    icon: Terminal,
    tab: 'projects',
  },
  {
    name: 'COMMUNICATION',
    purpose: 'Keep people and systems in sync',
    color: '#f9a8d4',
    icon: Megaphone,
    tab: 'work',
  },
];

const stateDescription: Record<string, string> = {
  IDLE: 'Ready for your next goal',
  LISTENING: 'Listening for your request',
  UNDERSTANDING: 'Understanding your intent',
  THINKING: 'Reasoning about the request',
  PLANNING: 'Preparing the safest execution path',
  WORKING: 'Executing authorized work',
  COMMUNICATING: 'Communicating with an authorized system',
  VERIFYING: 'Checking the result with evidence',
  RECOVERING: 'Recovering from an execution problem',
  SPEAKING: 'Speaking the response',
  EMPATHY: 'Responding with contextual awareness',
  SUCCESS: 'Verified work completed',
  ERROR: 'Execution or system error',
  WAITING: 'Waiting for required input or approval',
};

const stateAccent = (state: AuraState) => {
  switch (state) {
    case 'ERROR':
      return '#fb7185';
    case 'SUCCESS':
      return '#34d399';
    case 'EMPATHY':
      return '#f9a8d4';
    case 'LISTENING':
      return '#a78bfa';
    case 'THINKING':
    case 'UNDERSTANDING':
    case 'PLANNING':
      return '#67e8f9';
    case 'WORKING':
    case 'VERIFYING':
    case 'COMMUNICATING':
      return '#38bdf8';
    default:
      return '#38bdf8';
  }
};

const UniverseField: React.FC<{
  state: AuraState;
  active: boolean;
}> = ({ state, active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({
    x: 0,
    y: 0,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const density =
      window.innerWidth < 640
        ? 90
        : window.innerWidth < 1024
          ? 150
          : 240;

    const particles = Array.from({ length: density }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0007,
      vy: (Math.random() - 0.5) * 0.0007,
      radius: Math.random() * 1.7 + 0.35,
      depth: Math.random(),
      phase: Math.random() * Math.PI * 2,
      index,
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

      pointer.current = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
        active: true,
      };
    };

    const onPointerLeave = () => {
      pointer.current.active = false;
    };

    resize();

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const render = () => {
      frame += reduced ? 0.25 : 1;

      context.clearRect(0, 0, width, height);

      const intensity = stateAccent(state);

      const centerX = width * 0.5;
      const centerY = height * 0.49;

      const corePull =
        state === 'LISTENING' ||
        state === 'UNDERSTANDING' ||
        state === 'THINKING'
          ? 0.0008
          : state === 'WORKING' ||
              state === 'VERIFYING' ||
              state === 'PLANNING'
            ? 0.00055
            : 0.00025;

      const speed = active ? 1.3 : 0.8;

      context.globalCompositeOperation = 'lighter';

      particles.forEach((particle) => {
        const dx = 0.5 - particle.x;
        const dy = 0.49 - particle.y;

        const distance = Math.max(
          0.04,
          Math.hypot(dx, dy)
        );

        const noise =
          Math.sin(
            frame * 0.012 + particle.phase
          ) * 0.00008;

        particle.vx +=
          (dx / distance) * corePull + noise;

        particle.vy +=
          (dy / distance) * corePull +
          Math.cos(
            frame * 0.009 + particle.phase
          ) *
            0.00008;

        if (pointer.current.active) {
          const px =
            pointer.current.x - particle.x;
          const py =
            pointer.current.y - particle.y;

          const pd = Math.max(
            0.035,
            Math.hypot(px, py)
          );

          const force =
            pd < 0.2
              ? -0.00035 / pd
              : 0.00006 / pd;

          particle.vx += px * force;
          particle.vy += py * force;
        }

        particle.vx *= 0.985;
        particle.vy *= 0.985;

        particle.x += particle.vx * speed;
        particle.y += particle.vy * speed;

        if (
          particle.x < -0.02 ||
          particle.x > 1.02 ||
          particle.y < -0.02 ||
          particle.y > 1.02
        ) {
          particle.x = Math.random();
          particle.y = Math.random();
          particle.vx *= 0.2;
          particle.vy *= 0.2;
        }

        const x = particle.x * width;
        const y = particle.y * height;

        const alpha =
          0.25 + particle.depth * 0.6;

        context.beginPath();
        context.fillStyle = `${intensity}${Math.round(
          alpha * 255
        )
          .toString(16)
          .padStart(2, '0')}`;

        context.arc(
          x,
          y,
          particle.radius *
            (0.7 + particle.depth),
          0,
          Math.PI * 2
        );

        context.fill();

        if (particle.index % 14 === 0) {
          const nearX =
            centerX +
            Math.cos(
              frame * 0.001 +
                particle.phase
            ) *
              width *
              0.2;

          const nearY =
            centerY +
            Math.sin(
              frame * 0.001 +
                particle.phase
            ) *
              height *
              0.2;

          context.beginPath();

          context.strokeStyle = `${intensity}18`;
          context.lineWidth = 0.5;

          context.moveTo(x, y);
          context.lineTo(nearX, nearY);
          context.stroke();
        }
      });

      context.globalCompositeOperation =
        'source-over';

      animationId =
        requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);

      window.removeEventListener(
        'resize',
        resize
      );

      canvas.removeEventListener(
        'pointermove',
        onPointerMove
      );

      canvas.removeEventListener(
        'pointerleave',
        onPointerLeave
      );
    };
  }, [state, active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full opacity-75"
      aria-hidden="true"
    />
  );
};

export const AuraUniverse: React.FC<
  AuraUniverseProps
> = ({
  state,
  messages,
  quota,
  isExecuting,
  isListening,
  activeExecution,
  onExecuteCommand,
  onMicToggle,
  onSelectTab,
}) => {
  const [hoveredDomain, setHoveredDomain] =
    useState<string | null>(null);
  const [showExecutionInspector, setShowExecutionInspector] =
    useState(false);

  const recentActivity = messages
    .filter(
      (message) => message.sender === 'aura'
    )
    .slice(-3)
    .reverse();

  const coreActive =
    state !== 'IDLE' || isExecuting || isListening;

  const accent = stateAccent(state);

  return (
    <section className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#03050b] text-slate-100">
      <UniverseField
        state={state}
        active={coreActive}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(14,116,144,0.17),transparent_27%),radial-gradient(circle_at_78%_18%,rgba(124,58,237,0.12),transparent_24%),linear-gradient(180deg,rgba(2,5,11,0.32),rgba(2,5,11,0.88))]" />

      <div className="relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col px-3 pb-4 pt-3 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-[20rem] select-none">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              AURA AI
            </div>

            <h1 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Intelligence in motion.
            </h1>

            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              One cognitive core that understands,
              reasons, acts, verifies and communicates.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 backdrop-blur-md sm:flex">
            <Activity
              className="h-3.5 w-3.5"
              style={{ color: accent }}
            />
            {state}
          </div>
        </div>

        {/* Universe */}
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[10rem_minmax(0,1fr)_13rem] lg:items-center lg:gap-5">

          {/* Capability map */}
          <aside className="order-2 hidden space-y-3 lg:order-1 lg:block">
            <div className="border-l border-cyan-400/30 pl-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">
                Capability map
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                AURA can move between capabilities
                while remaining one intelligence.
              </p>
            </div>

            <div className="grid gap-1.5">
              {domains.slice(0, 6).map(
                (domain) => {
                  const Icon = domain.icon;

                  return (
                    <button
                      key={domain.name}
                      type="button"
                      onClick={() =>
                        onSelectTab(domain.tab)
                      }
                      onMouseEnter={() =>
                        setHoveredDomain(
                          domain.name
                        )
                      }
                      onMouseLeave={() =>
                        setHoveredDomain(null)
                      }
                      className="flex items-center gap-2 border-l-2 border-transparent px-2 py-2 text-left text-slate-400 transition hover:border-white/30 hover:text-white"
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{
                          color: domain.color,
                        }}
                      />

                      <span className="text-[10px] font-mono tracking-wider">
                        {domain.name}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </aside>

          {/* Central AURA core */}
          <div className="relative order-1 flex min-h-[31rem] items-center justify-center lg:order-2 lg:min-h-[42rem]">

            <div className="pointer-events-none absolute h-[20rem] w-[20rem] rounded-full border border-cyan-300/10 shadow-[0_0_100px_rgba(34,211,238,0.08)] sm:h-[29rem] sm:w-[29rem] lg:h-[34rem] lg:w-[34rem]" />

            <div className="pointer-events-none absolute h-[25rem] w-[25rem] rounded-full border border-violet-300/10 [transform:rotateX(62deg)_rotateZ(-18deg)] sm:h-[35rem] sm:w-[35rem] lg:h-[40rem] lg:w-[40rem]" />

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <filter id="universeBeamGlow">
                  <feGaussianBlur
                    stdDeviation="0.45"
                    result="blur"
                  />

                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {domains.map(
                (domain, index) => {
                  const angle =
                    (index /
                      domains.length) *
                      Math.PI *
                      2 -
                    Math.PI / 2;

                  const x =
                    50 +
                    Math.cos(angle) *
                      43;

                  const y =
                    50 +
                    Math.sin(angle) *
                      43;

                  return (
                    <g
                      key={`beam-${domain.name}`}
                      opacity="0.18"
                    >
                      <line
                        x1="50"
                        y1="50"
                        x2={x}
                        y2={y}
                        stroke={
                          domain.color
                        }
                        strokeWidth="0.12"
                        strokeDasharray="0.7 2.4"
                      />

                      {coreActive && (
                        <circle
                          r="0.55"
                          fill={
                            domain.color
                          }
                          opacity="0.7"
                        >
                          <animateMotion
                            dur="3.5s"
                            repeatCount="indefinite"
                            path={`M 50 50 L ${x} ${y}`}
                          />
                        </circle>
                      )}
                    </g>
                  );
                }
              )}
            </svg>

            <AuraCore
              state={state}
              size="hero"
              showLabel={false}
              className="scale-[0.72] sm:scale-90 lg:scale-100"
            />

            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
              <div
                className="text-[10px] font-mono uppercase tracking-[0.35em]"
                style={{ color: accent }}
              >
                {state}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                AURA cognitive core
              </div>

              <div className="mt-1 max-w-[18rem] text-[10px] text-slate-600">
                {stateDescription[state] ||
                  'Ready for your next goal'}
              </div>
            </div>

            {/* Capability worlds */}
            {domains.map(
              (domain, index) => {
                const Icon = domain.icon;

                const angle =
                  (index /
                    domains.length) *
                    Math.PI *
                    2 -
                  Math.PI / 2;

                const x =
                  50 +
                  Math.cos(angle) *
                    43;

                const y =
                  50 +
                  Math.sin(angle) *
                    43;

                return (
                  <button
                    key={domain.name}
                    type="button"
                    onClick={() =>
                      onSelectTab(
                        domain.tab
                      )
                    }
                    onMouseEnter={() =>
                      setHoveredDomain(
                        domain.name
                      )
                    }
                    onMouseLeave={() =>
                      setHoveredDomain(
                        null
                      )
                    }
                    className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition duration-300 hover:scale-110"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    aria-label={`${domain.name}: ${domain.purpose}`}
                  >
                    <span
                      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#07101a]/90 backdrop-blur-md sm:h-11 sm:w-11"
                      style={{
                        color: domain.color,
                      }}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />

                      <span className="absolute inset-[-5px] rounded-full border border-current/20 [transform:rotateX(68deg)]" />
                    </span>

                    <span className="whitespace-nowrap text-[8px] font-mono tracking-[0.12em] text-slate-300 sm:text-[9px]">
                      {domain.name}
                    </span>

                    {hoveredDomain ===
                      domain.name && (
                      <span className="absolute top-14 z-20 w-32 rounded border border-white/10 bg-[#07101a]/95 px-2 py-1 text-[9px] leading-tight text-slate-300 shadow-xl">
                        {domain.purpose}
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {/* AURA status / activity */}
          <aside className="order-3 space-y-3">

            <div className="border border-white/10 bg-black/25 p-3 backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  AURA state
                </span>

                <Brain
                  className="h-3.5 w-3.5"
                  style={{ color: accent }}
                />
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: accent,
                  }}
                />

                <span className="text-xs font-mono text-white">
                  {state}
                </span>
              </div>

              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                {stateDescription[state] ||
                  'Ready for your next goal'}
              </p>
            </div>

            <div className="border border-white/10 bg-black/25 p-3 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                <Layers3 className="h-3.5 w-3.5 text-violet-300" />
                Recent activity
              </div>

              {recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map(
                    (entry, index) => (
                      <p
                        key={`${entry.id}-${index}`}
                        className="border-l border-violet-300/30 pl-2 text-[10px] leading-relaxed text-slate-400"
                      >
                        {entry.text}
                      </p>
                    )
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-600">
                  No activity recorded yet.
                </p>
              )}
            </div>

            {activeExecution && (
              <button
                type="button"
                onClick={() => setShowExecutionInspector(true)}
                className="w-full border border-cyan-300/20 bg-black/35 p-3 text-left backdrop-blur-md transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">
                    <Terminal className="h-3.5 w-3.5" />
                    Live Work
                  </span>

                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeExecution.success
                        ? 'bg-emerald-400'
                        : isExecuting
                          ? 'bg-cyan-400 animate-pulse'
                          : 'bg-amber-400'
                    }`}
                  />

                  <span className="text-xs font-mono text-white">
                    {activeExecution.success
                      ? 'WORK COMPLETED'
                      : isExecuting
                        ? 'AURA IS WORKING'
                        : 'WORK REPORTED'}
                  </span>
                </div>

                <p className="mt-1 text-[9px] text-slate-500">
                  Click to inspect real execution details
                </p>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onSelectTab('work')
              }
              className="w-full border border-cyan-300/20 bg-cyan-400/5 p-3 text-left transition hover:bg-cyan-400/10"
            >
              <span className="block text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                Cognitive activity
              </span>

              <span className="mt-1 block text-xs text-slate-300">
                {isExecuting
                  ? 'AURA is working'
                  : isListening
                    ? 'AURA is listening'
                    : 'No active execution'}
              </span>
            </button>
          </aside>
        </div>

        {/* Command bar */}
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <span>
              {quota?.isOwner
                ? 'OWNER / UNLIMITED'
                : `FREE / ${quota?.used ?? 0} OF ${quota?.limit ?? 5} PROJECTS`}
            </span>

            <span>
              {isExecuting
                ? 'Working'
                : isListening
                  ? 'Listening'
                  : 'Ready'}
            </span>
          </div>

          <AuraCommandBar
            onExecuteCommand={
              onExecuteCommand
            }
            isExecuting={isExecuting}
            orbState={state}
            onMicToggle={onMicToggle}
            isListening={isListening}
          />
        </div>
      </div>

      {showExecutionInspector && activeExecution && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="AURA execution details"
          onClick={() => setShowExecutionInspector(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#07101a] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Terminal className="h-4 w-4 text-cyan-300" />
                  AURA Execution Inspector
                </p>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  {activeExecution.success ? 'VERIFIED / SUCCESS' : 'EXECUTION RESULT'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExecutionInspector(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Close execution inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-80px)] overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[9px] font-mono uppercase text-slate-500">
                    Intent
                  </p>
                  <p className="mt-1 text-xs font-mono text-cyan-300">
                    {activeExecution.intent || 'ACTION_REQUEST'}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[9px] font-mono uppercase text-slate-500">
                    Result
                  </p>
                  <p className={`mt-1 text-xs font-mono ${
                    activeExecution.success
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}>
                    {activeExecution.success ? 'SUCCESS' : 'NOT VERIFIED'}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Execution Timeline
                </p>

                {Array.isArray(activeExecution.execution?.executed_steps) &&
                activeExecution.execution.executed_steps.length > 0 ? (
                  <div className="space-y-2">
                    {activeExecution.execution.executed_steps.map(
                      (step: any, index: number) => {
                        const verified =
                          step?.outcome_verification?.verified === true ||
                          step?.verification_status === 'VERIFIED';

                        return (
                          <div
                            key={`${step?.tool || 'step'}-${index}`}
                            className="rounded-xl border border-white/10 bg-black/35 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-mono ${
                                  verified
                                    ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                                    : 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20'
                                }`}
                              >
                                {index + 1}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white">
                                  {step?.tool || step?.action || 'Execution step'}
                                </p>

                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  {verified
                                    ? 'Verified successfully'
                                    : step?.verification_status || 'Executed'}
                                </p>
                              </div>

                              <span
                                className={`text-[9px] font-mono uppercase ${
                                  verified
                                    ? 'text-emerald-300'
                                    : 'text-slate-500'
                                }`}
                              >
                                {verified ? 'VERIFIED' : 'EXECUTED'}
                              </span>
                            </div>

                            {step?.args && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-[9px] font-mono uppercase tracking-wider text-slate-500 hover:text-cyan-300">
                                  View operation details
                                </summary>

                                <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/5 bg-black/50 p-3 text-[9px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
{JSON.stringify(step.args, null, 2)}
                                </pre>
                              </details>
                            )}

                            {step?.result && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-[9px] font-mono uppercase tracking-wider text-slate-500 hover:text-cyan-300">
                                  View result / output
                                </summary>

                                <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/5 bg-black/50 p-3 text-[9px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
{JSON.stringify(step.result, null, 2)}
                                </pre>
                              </details>
                            )}

                            {step?.outcome_verification && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-[9px] font-mono uppercase tracking-wider text-emerald-400/70 hover:text-emerald-300">
                                  View verification
                                </summary>

                                <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-emerald-400/10 bg-black/40 p-3 text-[9px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
{JSON.stringify(step.outcome_verification, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <p className="text-[10px] text-slate-500">
                      No executed steps were reported by the cognitive core.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Final Verification
                </p>

                <pre className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/50 p-4 text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
{JSON.stringify(activeExecution.verification ?? null, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
