import React, { useState, useEffect, useRef } from 'react';
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
  const [saccade, setSaccade] = useState({ x: 0, y: 0 });
  const [breatheScale, setBreatheScale] = useState(1.0);

  // Natural organic blinking interval
  useEffect(() => {
    let timeout: any;
    const triggerBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
      const nextTime = Math.random() * 3400 + 2600;
      timeout = setTimeout(triggerBlink, nextTime);
    };
    timeout = setTimeout(triggerBlink, 2800);
    return () => clearTimeout(timeout);
  }, []);

  // Micro eye movement (slight saccades simulating living attention)
  useEffect(() => {
    let timeout: any;
    const shiftGaze = () => {
      // Subtle micro-shift: -1.5px to +1.5px
      const sx = (Math.random() - 0.5) * 2.8;
      const sy = (Math.random() - 0.5) * 1.8;
      setSaccade({ x: sx, y: sy });
      const nextShift = Math.random() * 2400 + 1600;
      timeout = setTimeout(shiftGaze, nextShift);
    };
    timeout = setTimeout(shiftGaze, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Audio-reactive mouth wave sampling & breathing loop
  useEffect(() => {
    let animId: number;
    let time = 0;
    const loop = () => {
      time += 0.03;
      const audio = voiceAnalyzer.getAudioData();
      setMouthAmp(audio.amplitude);

      // Subtle breathing expansion
      const bScale = 1.0 + Math.sin(time) * 0.025 + (audio.amplitude * 0.04);
      setBreatheScale(bScale);

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Expression parameters based on state
  const isThinking = state === 'THINKING';
  const isPlanning = state === 'PLANNING';
  const isListening = state === 'LISTENING';
  const isUnderstanding = state === 'UNDERSTANDING';
  const isExecuting = state === 'EXECUTING' || state === 'WORKING';
  const isCommunicating = state === 'COMMUNICATING';
  const isSuccess = state === 'SUCCESS';
  const isError = state === 'ERROR';
  const isEmpathy = state === 'EMPATHY';
  const isLearning = state === 'LEARNING';
  const isSpeaking = state === 'SPEAKING';

  // Eye dimensions & shapes
  const isCurvedEye = isSuccess || isEmpathy;
  const eyeHeight = blink ? 1.5 : isListening ? 14 : isExecuting ? 11 : isThinking ? 9 : 10;
  const eyeWidth = isListening ? 7.5 : 7;
  const eyeRadius = blink ? 1 : 4.5;

  // Luminous accent colors
  const primaryColor = isError ? '#F43F5E' : 
                       isSuccess ? '#34D399' : 
                       isListening ? '#2DD4BF' : 
                       isThinking ? '#A855F7' : 
                       isPlanning ? '#38BDF8' :
                       isEmpathy ? '#FB7185' :
                       isLearning ? '#F59E0B' :
                       '#38BDF8';

  const glowFilter = isError ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.85))' :
                     isSuccess ? 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.9))' :
                     isListening ? 'drop-shadow(0 0 10px rgba(45, 212, 191, 0.9))' :
                     isThinking ? 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.9))' :
                     isEmpathy ? 'drop-shadow(0 0 10px rgba(251, 113, 133, 0.85))' :
                     isLearning ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.85))' :
                     'drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))';

  // Mouth waveform dynamic height based on audio
  const speechHeight = Math.max(2, mouthAmp * 16);

  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        transform: `scale(${breatheScale})`,
        transition: 'transform 0.15s ease-out'
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full transition-transform duration-300"
        style={{ filter: glowFilter }}
      >
        <defs>
          <linearGradient id="auraEyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.85" />
          </linearGradient>

          <radialGradient id="auraIrisGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="60%" stopColor={primaryColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Thought / Planning Rotating Holographic Scanning Arc */}
        {(isThinking || isPlanning || isUnderstanding) && (
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.8"
            strokeDasharray="24 62"
            className="animate-spin"
            style={{ 
              animationDuration: isThinking ? '2.4s' : '3.6s', 
              transformOrigin: '50px 50px' 
            }}
          />
        )}

        {/* Outer subtle geometric compass ticks */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.8"
          strokeDasharray="2 12"
        />

        {/* Forehead Neural Sparkle Indicator */}
        <circle
          cx="50"
          cy="31"
          r={isListening ? 2.6 : 1.8}
          fill={primaryColor}
          opacity={isThinking || isListening ? 1 : 0.65}
          className={isThinking || isListening ? 'animate-pulse' : ''}
        />

        {/* Left Eye */}
        {isCurvedEye && !blink ? (
          // Welcoming / smiling gentle eye curve
          <path
            d={`M ${30 + saccade.x} ${49 + saccade.y} Q ${36 + saccade.x} ${42 + saccade.y} ${42 + saccade.x} ${49 + saccade.y}`}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        ) : (
          <g>
            <rect
              x={36 - eyeWidth / 2 + saccade.x}
              y={48 - eyeHeight / 2 + saccade.y}
              width={eyeWidth}
              height={eyeHeight}
              rx={eyeRadius}
              fill="url(#auraEyeGrad)"
              className="transition-all duration-150"
            />
            {/* Iris highlight dot */}
            {!blink && (
              <circle
                cx={36 + saccade.x}
                cy={48 + saccade.y - (isListening ? 1.5 : 0)}
                r="1.2"
                fill="#FFFFFF"
                opacity="0.9"
              />
            )}
          </g>
        )}

        {/* Right Eye */}
        {isCurvedEye && !blink ? (
          <path
            d={`M ${58 + saccade.x} ${49 + saccade.y} Q ${64 + saccade.x} ${42 + saccade.y} ${70 + saccade.x} ${49 + saccade.y}`}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        ) : (
          <g>
            <rect
              x={64 - eyeWidth / 2 + saccade.x}
              y={48 - eyeHeight / 2 + saccade.y}
              width={eyeWidth}
              height={eyeHeight}
              rx={eyeRadius}
              fill="url(#auraEyeGrad)"
              className="transition-all duration-150"
            />
            {/* Iris highlight dot */}
            {!blink && (
              <circle
                cx={64 + saccade.x}
                cy={48 + saccade.y - (isListening ? 1.5 : 0)}
                r="1.2"
                fill="#FFFFFF"
                opacity="0.9"
              />
            )}
          </g>
        )}

        {/* Intelligent Minimal Mouth / Vocal Waveform */}
        {isSuccess ? (
          // Happy gentle smile curve
          <path
            d="M 40 65 Q 50 72 60 65"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ) : isEmpathy ? (
          // Soft comforting smile curve
          <path
            d="M 41 65 Q 50 70 59 65"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : isError ? (
          // Soft concerned mouth line
          <line
            x1="43"
            y1="66"
            x2="57"
            y2="66"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : mouthAmp > 0.10 || isSpeaking ? (
          // Active audio vocalization mouth: dynamic harmonic aperture
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
            y1="65"
            x2="56"
            y2="65"
            stroke={primaryColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}
      </svg>
    </div>
  );
};
