import React, { useRef, useEffect, useState } from 'react';
import { AuraState } from '../../types';
import { voiceAnalyzer, AudioFrequencyData } from '../../services/audio/voiceAnalyzer';

interface AuraParticlesProps {
  state: AuraState;
  size?: number; // pixel width/height of canvas
  interactive?: boolean;
  onParticleClick?: () => void;
  className?: string;
}

interface Particle {
  layer: number; // 1 to 4
  angle: number; // current orbit angle in radians
  baseRadius: number; // nominal orbit distance from center
  currentRadius: number; // actual instantaneous radius
  speed: number; // angular velocity
  baseSize: number; // dot diameter
  currentSize: number;
  opacity: number;
  baseOpacity: number;
  phase: number; // harmonic oscillation offset
  noiseSpeed: number;
  depth: number; // 0.0 (background) to 1.0 (foreground)
  colorType: 'cyan' | 'blue' | 'purple' | 'emerald' | 'amber';
  radialDrift: number; // outward/inward velocity for shockwaves/packets
}

export const AuraParticles: React.FC<AuraParticlesProps> = ({
  state,
  size = 460,
  interactive = true,
  onParticleClick,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const shockwaveRef = useRef<{ radius: number; maxRadius: number; opacity: number; active: boolean }>({
    radius: 0,
    maxRadius: 220,
    opacity: 0,
    active: false
  });
  
  // Track previous state for trigger transitions (e.g. burst on SUCCESS or ERROR)
  const prevStateRef = useRef<AuraState>(state);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number>(0);

  // Initialize particle field based on screen capability
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 190 : 360;
    const centerRadius = size / 2;
    const newParticles: Particle[] = [];

    // Palette choices for futuristic living AI
    const colorChoices: Particle['colorType'][] = ['cyan', 'blue', 'cyan', 'purple', 'blue'];

    for (let i = 0; i < count; i++) {
      // Allocate into 4 distinctive orbital layers:
      // Layer 1: Core halo orbit (inner ring, high density)
      // Layer 2: Mid synchronous orbit
      // Layer 3: Outer cosmic orbit (counter-rotating)
      // Layer 4: Floating ambient neural dust
      let layer = 1;
      let orbitBandMin = 65;
      let orbitBandMax = 110;
      let baseSpeed = 0.008;

      const layerRoll = Math.random();
      if (layerRoll < 0.35) {
        layer = 1;
        orbitBandMin = 60;
        orbitBandMax = 95;
        baseSpeed = (Math.random() * 0.006 + 0.004) * (Math.random() > 0.5 ? 1 : -1);
      } else if (layerRoll < 0.65) {
        layer = 2;
        orbitBandMin = 95;
        orbitBandMax = 145;
        baseSpeed = (Math.random() * 0.008 + 0.005) * (Math.random() > 0.4 ? 1 : -1);
      } else if (layerRoll < 0.88) {
        layer = 3;
        orbitBandMin = 145;
        orbitBandMax = 195;
        baseSpeed = (Math.random() * 0.005 + 0.003) * -1; // counter-directional
      } else {
        layer = 4;
        orbitBandMin = 40;
        orbitBandMax = 220;
        baseSpeed = (Math.random() * 0.003 + 0.002);
      }

      // Scale orbit radius relative to canvas size
      const scaleFactor = (size / 460);
      const orbitRadius = (orbitBandMin + Math.random() * (orbitBandMax - orbitBandMin)) * scaleFactor;
      const angle = Math.random() * Math.PI * 2;
      const baseSize = layer === 1 ? (Math.random() * 2.2 + 1.2) : 
                        layer === 2 ? (Math.random() * 2.8 + 1.4) : 
                        layer === 3 ? (Math.random() * 3.4 + 1.6) : 
                                      (Math.random() * 1.8 + 0.8);

      const baseOpacity = layer === 4 ? (Math.random() * 0.45 + 0.2) : (Math.random() * 0.55 + 0.4);

      newParticles.push({
        layer,
        angle,
        baseRadius: orbitRadius,
        currentRadius: orbitRadius,
        speed: baseSpeed,
        baseSize,
        currentSize: baseSize,
        opacity: baseOpacity,
        baseOpacity,
        phase: Math.random() * Math.PI * 2,
        noiseSpeed: Math.random() * 0.02 + 0.01,
        depth: Math.random(),
        colorType: colorChoices[Math.floor(Math.random() * colorChoices.length)],
        radialDrift: 0
      });
    }

    particlesRef.current = newParticles;
  }, [size]);

  // Handle state change triggers (shockwaves, packet bursts)
  useEffect(() => {
    if (state === 'SUCCESS') {
      shockwaveRef.current = {
        radius: size * 0.15,
        maxRadius: size * 0.48,
        opacity: 0.9,
        active: true
      };
      // Accelerate particles outward
      particlesRef.current.forEach(p => {
        p.radialDrift = (Math.random() * 2.5 + 1.5) * (size / 460);
      });
    } else if (state === 'ERROR') {
      shockwaveRef.current = {
        radius: size * 0.1,
        maxRadius: size * 0.35,
        opacity: 0.8,
        active: true
      };
      // Jitter
      particlesRef.current.forEach(p => {
        p.radialDrift = (Math.random() - 0.5) * 4;
      });
    } else if (state === 'COMMUNICATING') {
      // Data packet pulses
      particlesRef.current.forEach((p, idx) => {
        if (idx % 6 === 0) {
          p.radialDrift = (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1);
        }
      });
    }
    prevStateRef.current = state;
  }, [state, size]);

  // Main Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    // Set actual canvas buffer dimensions for retina displays
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    let time = 0;

    const render = () => {
      time += 0.018;

      // Sample real or synthetic voice audio data
      const audio: AudioFrequencyData = voiceAnalyzer.getAudioData();
      const amp = audio.amplitude; // 0..1
      const bass = audio.bass;
      const treble = audio.treble;

      // Check reduced motion
      const prefersReducedMotion = typeof window !== 'undefined' && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Clear with soft alpha trail for slight luminous persistence
      ctx.clearRect(0, 0, size, size);

      // 1. Draw Concentric Geometric Orbital Track Rings (soft guideline halos)
      const ringRadii = [
        size * 0.19,
        size * 0.28,
        size * 0.38,
        size * 0.46
      ];

      ringRadii.forEach((radius, idx) => {
        ctx.beginPath();
        // Dynamic ring expansion based on voice amplitude & state
        let expansion = (amp * 12) + (state === 'PLANNING' ? Math.sin(time * 2 + idx) * 3 : 0);
        if (state === 'LISTENING') expansion -= 8;
        if (state === 'VERIFYING') expansion *= 0.6; // tight rings

        const finalRadius = Math.max(10, radius + expansion);
        ctx.arc(centerX, centerY, finalRadius, 0, Math.PI * 2);

        // Ring color and dash style
        let strokeAlpha = 0.07 + (amp * 0.12);
        if (state === 'PLANNING') strokeAlpha = 0.18;
        if (state === 'VERIFYING') strokeAlpha = 0.22;

        ctx.strokeStyle = state === 'ERROR' ? `rgba(244, 63, 94, ${strokeAlpha})` :
                          state === 'SUCCESS' ? `rgba(52, 211, 153, ${strokeAlpha})` :
                          state === 'PLANNING' ? `rgba(56, 189, 248, ${strokeAlpha * 1.5})` :
                          `rgba(56, 189, 248, ${strokeAlpha})`;

        ctx.lineWidth = idx === 1 ? 1.4 : 0.8;
        if (idx === 1 || idx === 3) {
          ctx.setLineDash([4, 8]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 2. Render shockwave pulse if active
      if (shockwaveRef.current.active) {
        const sw = shockwaveRef.current;
        sw.radius += 3.8;
        sw.opacity *= 0.94;

        if (sw.opacity < 0.02 || sw.radius > sw.maxRadius) {
          sw.active = false;
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = state === 'ERROR' 
            ? `rgba(244, 63, 94, ${sw.opacity})` 
            : `rgba(56, 189, 248, ${sw.opacity})`;
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 16;
          ctx.shadowColor = state === 'ERROR' ? '#F43F5E' : '#38BDF8';
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Update & Draw Living Particles
      const particles = particlesRef.current;
      const mouse = mousePosRef.current;

      // State physics multipliers
      let speedMult = 1.0;
      let targetRadialShift = 0;
      let chaosNoise = 0;

      switch (state) {
        case 'IDLE':
          speedMult = 0.85 + (amp * 1.5);
          targetRadialShift = Math.sin(time * 1.2) * 3;
          break;
        case 'LISTENING':
          speedMult = 0.7 + (amp * 2.2);
          targetRadialShift = -18 - (amp * 16); // inward attraction!
          chaosNoise = amp * 2.5;
          break;
        case 'THINKING':
          speedMult = 2.4 + (amp * 1.8);
          targetRadialShift = Math.sin(time * 3.5) * 8;
          chaosNoise = 5.0;
          break;
        case 'PLANNING':
          speedMult = 1.3;
          targetRadialShift = 0; // lock into strict rings
          break;
        case 'EXECUTING':
          speedMult = 3.6 + (amp * 2.0); // directional stream speed
          targetRadialShift = (Math.sin(time * 2) * 5);
          break;
        case 'COMMUNICATING':
          speedMult = 1.8;
          targetRadialShift = Math.sin(time * 4) * 14; // outward/inward wave
          break;
        case 'VERIFYING':
          speedMult = 1.1;
          targetRadialShift = -12; // tighter concentric rings
          break;
        case 'SUCCESS':
          speedMult = 1.4;
          targetRadialShift = 10;
          break;
        case 'ERROR':
          speedMult = 0.9;
          chaosNoise = 8.0;
          break;
      }

      if (prefersReducedMotion) {
        speedMult *= 0.25;
        chaosNoise = 0;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Harmonic breathing & noise
        p.phase += p.noiseSpeed;
        const naturalOscillation = Math.sin(p.phase + time) * (p.layer === 4 ? 6 : 3.5);

        // Update radial drift (from shockwaves or packet bursts) with damping
        if (Math.abs(p.radialDrift) > 0.05) {
          p.currentRadius += p.radialDrift;
          p.radialDrift *= 0.92; // decay back to nominal orbit
        } else {
          // Smooth spring return to nominal baseRadius + target shift
          const targetR = p.baseRadius + targetRadialShift + naturalOscillation + (amp * 20 * (p.layer / 4));
          p.currentRadius += (targetR - p.currentRadius) * 0.08;
        }

        // Angular rotation
        const stateSpeed = p.speed * speedMult;
        p.angle += stateSpeed;

        // Position coordinates with optional chaos jitter
        let px = centerX + Math.cos(p.angle) * p.currentRadius;
        let py = centerY + Math.sin(p.angle) * p.currentRadius;

        if (chaosNoise > 0) {
          px += (Math.sin(p.phase * 3 + time * 5) * chaosNoise);
          py += (Math.cos(p.phase * 3 + time * 5) * chaosNoise);
        }

        // Mouse magnetic interaction (subtle push away on hover)
        if (interactive && mouse.active) {
          const dx = px - mouse.x;
          const dy = py - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80 && dist > 0.1) {
            const force = (1 - dist / 80) * 14;
            px += (dx / dist) * force;
            py += (dy / dist) * force;
          }
        }

        // Dynamic size & opacity reaction to audio
        const audioSizeBoost = amp * (p.layer === 1 ? 2.2 : 1.6);
        p.currentSize = Math.max(0.6, p.baseSize + audioSizeBoost);

        const audioOpacityBoost = amp * 0.4;
        p.opacity = Math.min(1.0, p.baseOpacity + audioOpacityBoost);

        // Color selection
        let fillR = 56;
        let fillG = 189;
        let fillB = 248; // cyan #38BDF8 default

        if (state === 'ERROR') {
          fillR = 244; fillG = 63; fillB = 94; // rose-red #F43F5E
        } else if (state === 'SUCCESS') {
          fillR = 52; fillG = 211; fillB = 153; // emerald #34D399
        } else if (state === 'LISTENING') {
          fillR = 45; fillG = 212; fillB = 191; // teal #2DD4BF
        } else if (state === 'THINKING') {
          fillR = 168; fillG = 85; fillB = 247; // purple #A855F7
        } else if (p.colorType === 'purple') {
          fillR = 192; fillG = 132; fillB = 252;
        } else if (p.colorType === 'blue') {
          fillR = 96; fillG = 165; fillB = 250;
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(px, py, p.currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${fillR}, ${fillG}, ${fillB}, ${p.opacity})`;

        // Glow effects for foreground dots or when speaking
        if (p.currentSize > 2.6 || amp > 0.3) {
          ctx.shadowBlur = Math.min(18, p.currentSize * 4 + (amp * 10));
          ctx.shadowColor = `rgba(${fillR}, ${fillG}, ${fillB}, ${p.opacity * 0.9})`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fill();

        // Draw directional tail stream when EXECUTING
        if (state === 'EXECUTING' && p.layer <= 2 && i % 3 === 0) {
          const tailAngle = p.angle - (p.speed > 0 ? 0.22 : -0.22);
          const tx = centerX + Math.cos(tailAngle) * p.currentRadius;
          const ty = centerY + Math.sin(tailAngle) * p.currentRadius;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = `rgba(${fillR}, ${fillG}, ${fillB}, ${p.opacity * 0.35})`;
          ctx.lineWidth = p.currentSize * 0.7;
          ctx.stroke();
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [state, size, interactive]);

  // Mouse event listeners for magnetic hover & pulse click
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true
    };
  };

  const handleMouseLeave = () => {
    mousePosRef.current.active = false;
  };

  const handleClick = () => {
    // Trigger energy pulse shockwave on click
    shockwaveRef.current = {
      radius: size * 0.16,
      maxRadius: size * 0.45,
      opacity: 0.95,
      active: true
    };
    particlesRef.current.forEach(p => {
      p.radialDrift = (Math.random() * 2.2 + 1.2) * (size / 460);
    });

    if (onParticleClick) {
      onParticleClick();
    }
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="pointer-events-auto cursor-pointer select-none transition-transform duration-300"
      />
    </div>
  );
};
