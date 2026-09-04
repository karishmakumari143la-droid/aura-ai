import React, { useState, useEffect } from 'react';
import { AuraState } from '../../types';
import { voiceAnalyzer } from '../../services/audio/voiceAnalyzer';

interface AuraFaceProps {
  state: AuraState;
  size?: number; // dimension in pixels
  className?: string;
}

export const AuraFace: React.FC<AuraFaceProps> = ({
  state,
  size = 110,
  className = ''
}) => {
  const [blink, setBlink] = useState(false);
  const [mouthAmp, setMouthAmp] = useState(0.05);

  // Natural organic blinking interval
  useEffect(() => {
    let timeout: any;
    const triggerBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
      const nextTime = Math.random() * 3200 + 2500;
      timeout = setTimeout(triggerBlink, nextTime);
    };
    timeout = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Audio-reactive mouth wave sampling
  useEffect(() => {
    let animId: number;
    const checkAudio = () => {
      const audio = voiceAnalyzer.getAudioData();
      setMouthAmp(audio.amplitude);
      animId = requestAnimationFrame(checkAudio);
    };
    animId = requestAnimationFrame(checkAudio);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Expression parameters based on state
  const isThinking = state === 'THINKING' || state === 'PLANNING';
  const isListening = state === 'LISTENING';
  const isExecuting = state === 'EXECUTING' || state === 'COMMUNICATING';
  const isSuccess = state === 'SUCCESS';
  const isError = state === 'ERROR';

  // Eye dimensions
  const eyeHeight = blink ? 1.5 : isListening ? 14 : isExecuting ? 11 : isSuccess ? 8 : 10;
  const eyeWidth = 7;
  const eyeRadius = blink ? 1 : 4.5;

  // Luminous accent colors
  const primaryColor = isError ? '#F43F5E' : 
                       isSuccess ? '#34D399' : 
                       isListening ? '#2DD4BF' : 
                       isThinking ? '#A855F7' : 
                       '#38BDF8';

  const glowFilter = isError ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.8))' :
                     isSuccess ? 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.8))' :
                     isListening ? 'drop-shadow(0 0 10px rgba(45, 212, 191, 0.9))' :
                     isThinking ? 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.9))' :
                     'drop-shadow(0 0 8px rgba(56, 189, 248, 0.75))';

  // Mouth waveform dynamic height based on audio
  const speechHeight = Math.max(2, mouthAmp * 14);

  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full transition-transform duration-300"
        style={{ filter: glowFilter }}
      >
        <defs>
          <linearGradient id="auraEyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="auraGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Thought / Planning Orbit Scanning Arc */}
        {isThinking && (
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.8"
            strokeDasharray="25 60"
            className="animate-spin"
            style={{ animationDuration: '2.5s', transformOrigin: 'center' }}
          />
        )}

        {/* Outer subtle geometric compass ticks */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.8"
          strokeDasharray="2 12"
        />

        {/* Left Eye */}
        <rect
          x={36 - eyeWidth / 2}
          y={48 - eyeHeight / 2}
          width={eyeWidth}
          height={eyeHeight}
          rx={eyeRadius}
          fill="url(#auraEyeGrad)"
          className="transition-all duration-150"
        />

        {/* Right Eye */}
        <rect
          x={64 - eyeWidth / 2}
          y={48 - eyeHeight / 2}
          width={eyeWidth}
          height={eyeHeight}
          rx={eyeRadius}
          fill="url(#auraEyeGrad)"
          className="transition-all duration-150"
        />

        {/* Friendly AI Smile / Speech Energy Wave Mouth */}
        {isSuccess ? (
          // Happy gentle smile curve
          <path
            d="M 40 64 Q 50 71 60 64"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ) : isError ? (
          // Soft concerned mouth line
          <line
            x1="42"
            y1="65"
            x2="58"
            y2="65"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : mouthAmp > 0.12 ? (
          // Active audio vocalization mouth: dynamic waveform
          <g>
            <path
              d={`M 38 65 Q 50 ${65 + speechHeight} 62 65 Q 50 ${65 - speechHeight} 38 65`}
              fill={primaryColor}
              opacity="0.85"
            />
          </g>
        ) : (
          // Resting friendly neutral micro-bar
          <line
            x1="44"
            y1="64"
            x2="56"
            y2="64"
            stroke={primaryColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}

        {/* Forehead Neural Sparkle Dot */}
        <circle
          cx="50"
          cy="32"
          r={isListening ? 2.5 : 1.8}
          fill={primaryColor}
          opacity={isThinking ? 1 : 0.6}
          className={isThinking ? 'animate-pulse' : ''}
        />
      </svg>
    </div>
  );
};
