import React, { useState, useEffect } from 'react';
import { AuraState } from '../../types';
import { AuraParticles } from './AuraParticles';
import { AuraFace } from './AuraFace';
import { voiceAnalyzer } from '../../services/audio/voiceAnalyzer';
import { Sparkles, Mic, Brain, Cpu, CheckCircle2, AlertCircle, Volume2 } from 'lucide-react';

interface AuraCoreProps {
  state: AuraState;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showLabel?: boolean;
  onCoreClick?: () => void;
  className?: string;
}

export const AuraCore: React.FC<AuraCoreProps> = ({
  state,
  size = 'hero',
  showLabel = true,
  onCoreClick,
  className = ''
}) => {
  const [audioAmp, setAudioAmp] = useState<number>(0.05);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Pixel sizing mapping
  const dimMap = {
    sm: { canvasSize: 180, coreSize: 64, faceSize: 42 },
    md: { canvasSize: 280, coreSize: 96, faceSize: 60 },
    lg: { canvasSize: 380, coreSize: 130, faceSize: 84 },
    hero: { canvasSize: 480, coreSize: 170, faceSize: 110 }
  }[size];

  // Continuous audio volume polling for subtle core breathing expansion
  useEffect(() => {
    let animId: number;
    const poll = () => {
      const data = voiceAnalyzer.getAudioData();
      setAudioAmp(data.amplitude);
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, []);

  // State metadata
  const stateMeta = {
    IDLE: {
      title: 'AURA Online',
      desc: 'Intelligent AI Partner Ready',
      glow: 'from-cyan-500/30 via-blue-600/20 to-transparent',
      borderColor: 'border-cyan-500/40',
      icon: Sparkles,
      iconColor: 'text-cyan-400'
    },
    LISTENING: {
      title: 'Listening...',
      desc: 'Streaming voice input into neural parser',
      glow: 'from-teal-400/40 via-emerald-500/25 to-transparent',
      borderColor: 'border-teal-400/60',
      icon: Mic,
      iconColor: 'text-teal-300'
    },
    UNDERSTANDING: {
      title: 'Understanding Intent',
      desc: 'Analyzing linguistic and emotional context',
      glow: 'from-sky-400/45 via-cyan-500/30 to-transparent',
      borderColor: 'border-sky-400/60',
      icon: Brain,
      iconColor: 'text-sky-300'
    },
    THINKING: {
      title: 'Thinking & Synthesizing',
      desc: 'Formulating strategy and retrieving context',
      glow: 'from-purple-500/40 via-indigo-600/30 to-transparent',
      borderColor: 'border-purple-400/60',
      icon: Brain,
      iconColor: 'text-purple-300'
    },
    PLANNING: {
      title: 'Decomposing Parallel DAG',
      desc: 'Mapping multi-agent workflow & dependency nodes',
      glow: 'from-cyan-400/45 via-blue-600/35 to-transparent',
      borderColor: 'border-cyan-400/70',
      icon: Cpu,
      iconColor: 'text-cyan-300'
    },
    SPEAKING: {
      title: 'Speaking',
      desc: 'Vocalizing natural synthesized response',
      glow: 'from-cyan-400/50 via-teal-500/30 to-transparent',
      borderColor: 'border-cyan-300/80',
      icon: Volume2,
      iconColor: 'text-cyan-200'
    },
    WORKING: {
      title: 'Executing Work',
      desc: 'Specialist agents running parallel tasks',
      glow: 'from-blue-500/45 via-cyan-500/35 to-transparent',
      borderColor: 'border-cyan-300/80',
      icon: Cpu,
      iconColor: 'text-cyan-200'
    },
    EXECUTING: {
      title: 'Executing Autonomous Work',
      desc: 'Specialist agents actively coding, designing & verifying',
      glow: 'from-blue-500/45 via-cyan-500/35 to-transparent',
      borderColor: 'border-cyan-300/80',
      icon: Cpu,
      iconColor: 'text-cyan-200'
    },
    COMMUNICATING: {
      title: 'Agent Bus Routing',
      desc: 'Streaming data packets across workstations',
      glow: 'from-sky-400/40 via-indigo-500/30 to-transparent',
      borderColor: 'border-sky-400/70',
      icon: Volume2,
      iconColor: 'text-sky-300'
    },
    LEARNING: {
      title: 'Evolving Preference Memory',
      desc: 'Extracting repeated pattern for memory proposal',
      glow: 'from-amber-400/40 via-purple-500/25 to-transparent',
      borderColor: 'border-amber-400/60',
      icon: Sparkles,
      iconColor: 'text-amber-300'
    },
    EMPATHY: {
      title: 'Active Emotional Support',
      desc: 'Present, listening, and breaking stress into steps',
      glow: 'from-rose-400/45 via-amber-500/30 to-transparent',
      borderColor: 'border-rose-400/70',
      icon: Sparkles,
      iconColor: 'text-rose-300'
    },
    VERIFYING: {
      title: 'Compliance & Verification',
      desc: 'Checking code syntax, accessibility & SEO metrics',
      glow: 'from-indigo-500/40 via-purple-500/30 to-transparent',
      borderColor: 'border-indigo-400/70',
      icon: CheckCircle2,
      iconColor: 'text-indigo-300'
    },
    SUCCESS: {
      title: 'Completed Successfully',
      desc: 'Pipeline execution verified & artifacts ready',
      glow: 'from-emerald-400/50 via-teal-500/35 to-transparent',
      borderColor: 'border-emerald-400/80',
      icon: CheckCircle2,
      iconColor: 'text-emerald-300'
    },
    ERROR: {
      title: 'Attention Required',
      desc: 'AURA encountered an interruption',
      glow: 'from-rose-500/50 via-red-600/35 to-transparent',
      borderColor: 'border-rose-500/80',
      icon: AlertCircle,
      iconColor: 'text-rose-400'
    },
    WAITING: {
      title: 'Standing By',
      desc: 'Awaiting your confirmation or clearance',
      glow: 'from-cyan-500/25 via-slate-600/20 to-transparent',
      borderColor: 'border-cyan-500/30',
      icon: Sparkles,
      iconColor: 'text-cyan-400'
    }
  }[state] || {
    title: 'AURA Online',
    desc: 'Intelligent AI Partner Ready',
    glow: 'from-cyan-500/30 via-blue-600/20 to-transparent',
    borderColor: 'border-cyan-500/40',
    icon: Sparkles,
    iconColor: 'text-cyan-400'
  };

  const Icon = stateMeta.icon;

  // Scale core based on audio amplitude (breathes with voice!)
  const coreScale = 1.0 + (audioAmp * 0.12) + (isHovered ? 0.04 : 0);

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Central Canvas Particle Field & Concentric Orbits */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: dimMap.canvasSize, height: dimMap.canvasSize }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Real Programmatic Particle Engine */}
        <AuraParticles
          state={state}
          size={dimMap.canvasSize}
          onParticleClick={onCoreClick}
          className="absolute inset-0"
        />

        {/* Ambient Radial Deep Space Glow Backing */}
        <div 
          className={`absolute rounded-full bg-gradient-radial ${stateMeta.glow} filter blur-2xl pointer-events-none transition-all duration-700`}
          style={{
            width: dimMap.coreSize * 1.8,
            height: dimMap.coreSize * 1.8,
            opacity: 0.6 + (audioAmp * 0.4)
          }}
        />

        {/* Outer Circular Optical Ring (breathing border with glass sheen) */}
        <div
          className={`absolute rounded-full border ${stateMeta.borderColor} pointer-events-none transition-transform duration-300 shadow-2xl`}
          style={{
            width: dimMap.coreSize * 1.25,
            height: dimMap.coreSize * 1.25,
            transform: `scale(${coreScale * 1.03})`,
            boxShadow: `0 0 ${20 + audioAmp * 30}px rgba(56, 189, 248, 0.25)`
          }}
        />

        {/* Central Physical AURA Core (Spherical Glass Orb) */}
        <button
          type="button"
          onClick={onCoreClick}
          className="relative rounded-full flex items-center justify-center cursor-pointer focus:outline-none transition-all duration-200 group z-10 shadow-2xl"
          style={{
            width: dimMap.coreSize,
            height: dimMap.coreSize,
            transform: `scale(${coreScale})`,
            background: 'radial-gradient(circle at 35% 30%, #15243E 0%, #081120 50%, #03060E 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: 'inset 0 2px 14px rgba(255,255,255,0.2), inset 0 -4px 18px rgba(0,0,0,0.9), 0 8px 32px rgba(0,0,0,0.8)'
          }}
          title="AURA AI Core - Click to interact"
        >
          {/* Internal Refractive Highlights */}
          <div className="absolute top-2 left-4 w-10 h-5 rounded-full bg-white/15 filter blur-[2px] transform -rotate-12 pointer-events-none" />

          {/* Living AI Face / Neural Indicator */}
          <AuraFace
            state={state}
            size={dimMap.faceSize}
          />
        </button>
      </div>

      {/* State Status Display */}
      {showLabel && (
        <div className="mt-2 text-center flex flex-col items-center gap-1 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                state === 'ERROR' ? 'bg-rose-400' :
                state === 'SUCCESS' ? 'bg-emerald-400' :
                state === 'LISTENING' ? 'bg-teal-400' : 'bg-cyan-400'
              } opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                state === 'ERROR' ? 'bg-rose-500' :
                state === 'SUCCESS' ? 'bg-emerald-500' :
                state === 'LISTENING' ? 'bg-teal-500' : 'bg-cyan-500'
              }`} />
            </span>
            <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${stateMeta.iconColor}`} />
              <span>{stateMeta.title}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans max-w-xs">{stateMeta.desc}</p>
        </div>
      )}
    </div>
  );
};
