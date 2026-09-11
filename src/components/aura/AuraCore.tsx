import React, { useState, useEffect } from 'react';
import { AuraState } from '../../types';
import { AuraParticles } from './AuraParticles';
import { AuraFace } from './AuraFace';
import { voiceAnalyzer } from '../../services/audio/voiceAnalyzer';
import { 
  Sparkles, 
  Mic, 
  Brain, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  HeartHandshake, 
  Clock,
  Layers,
  Compass
} from 'lucide-react';

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
  const [clickRipple, setClickRipple] = useState<boolean>(false);

  // Pixel sizing mapping
  const dimMap = {
    sm: { canvasSize: 200, coreSize: 72, faceSize: 48 },
    md: { canvasSize: 300, coreSize: 104, faceSize: 68 },
    lg: { canvasSize: 420, coreSize: 142, faceSize: 94 },
    hero: { canvasSize: 540, coreSize: 178, faceSize: 118 }
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

  // State metadata configuration
  const stateMeta = {
    IDLE: {
      title: 'AURA Online',
      desc: 'Living AI Core Active & Attentive',
      glow: 'from-cyan-500/30 via-blue-600/20 to-transparent',
      outerRingColor: 'border-cyan-500/30',
      icon: Sparkles,
      iconColor: 'text-cyan-400'
    },
    LISTENING: {
      title: 'Listening...',
      desc: 'Streaming voice input into neural parser',
      glow: 'from-teal-400/45 via-emerald-500/25 to-transparent',
      outerRingColor: 'border-teal-400/60',
      icon: Mic,
      iconColor: 'text-teal-300'
    },
    UNDERSTANDING: {
      title: 'Understanding Intent',
      desc: 'Analyzing linguistic intent and emotional nuance',
      glow: 'from-sky-400/45 via-cyan-500/30 to-transparent',
      outerRingColor: 'border-sky-400/60',
      icon: Brain,
      iconColor: 'text-sky-300'
    },
    THINKING: {
      title: 'Thinking & Synthesizing',
      desc: 'Retrieving memories and formulating execution plan',
      glow: 'from-purple-500/45 via-indigo-600/30 to-transparent',
      outerRingColor: 'border-purple-400/65',
      icon: Brain,
      iconColor: 'text-purple-300'
    },
    PLANNING: {
      title: 'Planning the Next Action',
      desc: 'Turning your request into a clear execution plan',
      glow: 'from-cyan-400/50 via-blue-600/35 to-transparent',
      outerRingColor: 'border-cyan-400/70',
      icon: Cpu,
      iconColor: 'text-cyan-300'
    },
    SPEAKING: {
      title: 'Speaking',
      desc: 'Vocalizing natural synthesized response',
      glow: 'from-cyan-400/55 via-teal-500/35 to-transparent',
      outerRingColor: 'border-cyan-300/80',
      icon: Volume2,
      iconColor: 'text-cyan-200'
    },
    WORKING: {
      title: 'Working on Your Request',
      desc: 'AURA is creating, changing, and verifying the requested result',
      glow: 'from-blue-500/45 via-cyan-500/35 to-transparent',
      outerRingColor: 'border-cyan-300/80',
      icon: Cpu,
      iconColor: 'text-cyan-200'
    },
    EXECUTING: {
      title: 'Executing the Planned Action',
      desc: 'AURA is actively carrying out the requested work',
      glow: 'from-blue-500/50 via-cyan-500/40 to-transparent',
      outerRingColor: 'border-cyan-300/80',
      icon: Cpu,
      iconColor: 'text-cyan-200'
    },
    COMMUNICATING: {
      title: 'Coordinating Work',
      desc: 'Coordinating the tools and steps needed to complete the request',
      glow: 'from-sky-400/45 via-indigo-500/30 to-transparent',
      outerRingColor: 'border-sky-400/70',
      icon: Volume2,
      iconColor: 'text-sky-300'
    },
    LEARNING: {
      title: 'Evolving Preference Memory',
      desc: 'Synthesizing verified preference into long-term memory',
      glow: 'from-amber-400/45 via-purple-500/25 to-transparent',
      outerRingColor: 'border-amber-400/60',
      icon: Sparkles,
      iconColor: 'text-amber-300'
    },
    EMPATHY: {
      title: 'Active Emotional Support',
      desc: 'Present, calm, and breaking down overwhelm into steps',
      glow: 'from-rose-400/50 via-amber-500/30 to-transparent',
      outerRingColor: 'border-rose-400/70',
      icon: HeartHandshake,
      iconColor: 'text-rose-300'
    },
    VERIFYING: {
      title: 'Verifying Result',
      desc: 'Checking the result for correctness and quality',
      glow: 'from-indigo-500/45 via-purple-500/30 to-transparent',
      outerRingColor: 'border-indigo-400/70',
      icon: CheckCircle2,
      iconColor: 'text-indigo-300'
    },
    SUCCESS: {
      title: 'Execution Completed',
      desc: 'Work completed and verified',
      glow: 'from-emerald-400/55 via-teal-500/35 to-transparent',
      outerRingColor: 'border-emerald-400/80',
      icon: CheckCircle2,
      iconColor: 'text-emerald-300'
    },
    ERROR: {
      title: 'Attention Required',
      desc: 'AURA encountered an interruption in execution',
      glow: 'from-rose-500/50 via-red-600/35 to-transparent',
      outerRingColor: 'border-rose-500/80',
      icon: AlertCircle,
      iconColor: 'text-rose-400'
    },
    WAITING: {
      title: 'Standing By',
      desc: 'Awaiting your approval or next clearance',
      glow: 'from-cyan-500/25 via-slate-600/20 to-transparent',
      outerRingColor: 'border-cyan-500/35',
      icon: Clock,
      iconColor: 'text-cyan-400'
    }
  }[state] || {
    title: 'AURA Online',
    desc: 'Living AI Core Active & Attentive',
    glow: 'from-cyan-500/30 via-blue-600/20 to-transparent',
    outerRingColor: 'border-cyan-500/30',
    icon: Sparkles,
    iconColor: 'text-cyan-400'
  };

  const Icon = stateMeta.icon;

  // Scale core based on real audio amplitude (breathes with voice!)
  const coreScale = 1.0 + (audioAmp * 0.12) + (isHovered ? 0.03 : 0);

  const handleCoreClick = () => {
    setClickRipple(true);
    setTimeout(() => setClickRipple(false), 500);
    if (onCoreClick) onCoreClick();
  };

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Central Canvas Particle Field & Concentric Orbits Container */}
      <div 
        className="relative flex items-center justify-center"
        style={{ 
          width: dimMap.canvasSize, 
          height: dimMap.canvasSize,
          maxWidth: '92vw',
          maxHeight: '92vw'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Real Programmatic Particle Engine (Canvas) */}
        <AuraParticles
          state={state}
          size={dimMap.canvasSize}
          onParticleClick={handleCoreClick}
          className="absolute inset-0 z-0"
        />

        {/* Ambient Deep Space Radial Glow Backing */}
        <div 
          className={`absolute rounded-full bg-gradient-radial ${stateMeta.glow} filter blur-3xl pointer-events-none transition-all duration-700`}
          style={{
            width: dimMap.coreSize * 2.2,
            height: dimMap.coreSize * 2.2,
            opacity: 0.65 + (audioAmp * 0.35)
          }}
        />

        {/* Outer Circular Optical Ring (breathing border with glass sheen) */}
        <div
          className={`absolute rounded-full border ${stateMeta.outerRingColor} pointer-events-none transition-transform duration-300 shadow-2xl`}
          style={{
            width: dimMap.coreSize * 1.32,
            height: dimMap.coreSize * 1.32,
            transform: `scale(${coreScale * 1.02})`,
            boxShadow: `0 0 ${24 + audioAmp * 35}px rgba(56, 189, 248, 0.22)`
          }}
        />

        {/* Interactive Click Ripple Ring */}
        {clickRipple && (
          <div
            className="absolute rounded-full border-2 border-cyan-400 pointer-events-none animate-ping"
            style={{
              width: dimMap.coreSize * 1.4,
              height: dimMap.coreSize * 1.4,
              animationDuration: '0.6s'
            }}
          />
        )}

        {/* Central Spherical Glass Core */}
        <button
          type="button"
          onClick={handleCoreClick}
          className="relative rounded-full flex items-center justify-center cursor-pointer focus:outline-none transition-all duration-200 group z-10 shadow-2xl"
          style={{
            width: dimMap.coreSize,
            height: dimMap.coreSize,
            transform: `scale(${coreScale})`,
            background: 'radial-gradient(circle at 35% 30%, #15243E 0%, #081120 52%, #02050B 100%)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: 'inset 0 2px 14px rgba(255,255,255,0.22), inset 0 -4px 20px rgba(0,0,0,0.92), 0 10px 38px rgba(0,0,0,0.85)'
          }}
          title="AURA AI Living Core - Click to interact"
        >
          {/* Internal Refractive Highlights (Optical glass reflection) */}
          <div className="absolute top-2 left-4 w-11 h-6 rounded-full bg-white/18 filter blur-[2px] transform -rotate-12 pointer-events-none" />
          <div className="absolute bottom-2 right-4 w-8 h-4 rounded-full bg-cyan-400/10 filter blur-[3px] pointer-events-none" />

          {/* Minimal Living AI Face Avatar */}
          <AuraFace
            state={state}
            size={dimMap.faceSize}
          />
        </button>
      </div>

      {/* State Status Display directly beneath Core */}
      {showLabel && (
        <div className="mt-1 text-center flex flex-col items-center gap-1.5 animate-in fade-in duration-300 select-none">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-white/10 shadow-lg backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                state === 'ERROR' ? 'bg-rose-400' :
                state === 'SUCCESS' ? 'bg-emerald-400' :
                state === 'LISTENING' ? 'bg-teal-400' : 
                state === 'THINKING' ? 'bg-purple-400' : 'bg-cyan-400'
              } opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                state === 'ERROR' ? 'bg-rose-500' :
                state === 'SUCCESS' ? 'bg-emerald-500' :
                state === 'LISTENING' ? 'bg-teal-500' : 
                state === 'THINKING' ? 'bg-purple-500' : 'bg-cyan-500'
              }`} />
            </span>
            <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${stateMeta.iconColor}`} />
              <span>{stateMeta.title}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans max-w-sm px-2 text-center">{stateMeta.desc}</p>
        </div>
      )}
    </div>
  );
};
