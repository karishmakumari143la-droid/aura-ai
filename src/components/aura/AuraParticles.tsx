import React, { useRef, useEffect } from 'react';
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
  layer: number; // 1 to 5
  angle: number; // current orbit angle in radians
  baseRadius: number; // nominal orbit distance from center
  currentRadius: number; // actual instantaneous radius
  targetRadius: number;
  speed: number; // angular velocity
  baseSize: number; // dot diameter
  currentSize: number;
  opacity: number;
  baseOpacity: number;
  phase: number; // harmonic oscillation offset
  noiseSpeed: number;
  depth: number; // 0.0 (background) to 1.0 (foreground)
  colorType: 'cyan' | 'blue' | 'sky' | 'purple' | 'emerald' | 'amber' | 'rose';
  radialDrift: number; // outward/inward velocity for shockwaves/packets
  trailHistory: { x: number; y: number }[];
  orbitTransitionTimer: number; // time until next orbital band jump
}

interface ThoughtWave {
  radius: number;
  maxRadius: number;
  speed: number;
  intensity: number;
  color: string;
}

export const AuraParticles: React.FC<AuraParticlesProps> = ({
  state,
  size = 520,
  interactive = true,
  onParticleClick,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const shockwavesRef = useRef<{ radius: number; maxRadius: number; opacity: number; color: string }[]>([]);
  const thoughtWavesRef = useRef<ThoughtWave[]>([]);
  const lastThoughtWaveTime = useRef<number>(0);
  const prevStateRef = useRef<AuraState>(state);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  // Initialize particle field based on screen capability
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 210 : 390;
    const newParticles: Particle[] = [];
    const scaleFactor = size / 520;

    const colorPalette: Particle['colorType'][] = ['cyan', 'sky', 'blue', 'cyan', 'purple', 'sky'];

    for (let i = 0; i < count; i++) {
      // 5 distinct orbital layers:
      // Layer 1: Core Halo Orbit (inner, dense, rapid circulation)
      // Layer 2: Equatorial Synchronous Orbit
      // Layer 3: Mid Planetary Orbit (counter-directional)
      // Layer 4: Outer Cosmic Halo
      // Layer 5: Floating Ambient Neural Dust (drifts freely across bands)
      let layer = 1;
      let orbitBandMin = 65;
      let orbitBandMax = 110;
      let baseSpeed = 0.009;

      const layerRoll = Math.random();
      if (layerRoll < 0.28) {
        layer = 1;
        orbitBandMin = 62;
        orbitBandMax = 100;
        baseSpeed = (Math.random() * 0.007 + 0.005) * (Math.random() > 0.4 ? 1 : -1);
      } else if (layerRoll < 0.55) {
        layer = 2;
        orbitBandMin = 102;
        orbitBandMax = 155;
        baseSpeed = (Math.random() * 0.008 + 0.004) * (Math.random() > 0.45 ? 1 : -1);
      } else if (layerRoll < 0.78) {
        layer = 3;
        orbitBandMin = 158;
        orbitBandMax = 215;
        baseSpeed = (Math.random() * 0.006 + 0.003) * -1; // counter-directional
      } else if (layerRoll < 0.90) {
        layer = 4;
        orbitBandMin = 218;
        orbitBandMax = 265;
        baseSpeed = (Math.random() * 0.004 + 0.002) * (Math.random() > 0.5 ? 1 : -1);
      } else {
        layer = 5;
        orbitBandMin = 45;
        orbitBandMax = 285;
        baseSpeed = (Math.random() * 0.003 + 0.001);
      }

      const orbitRadius = (orbitBandMin + Math.random() * (orbitBandMax - orbitBandMin)) * scaleFactor;
      const angle = Math.random() * Math.PI * 2;
      const baseSize = layer === 1 ? (Math.random() * 2.2 + 1.2) : 
                        layer === 2 ? (Math.random() * 2.8 + 1.4) : 
                        layer === 3 ? (Math.random() * 3.4 + 1.6) : 
                        layer === 4 ? (Math.random() * 2.4 + 1.2) :
                                      (Math.random() * 1.8 + 0.8);

      const baseOpacity = layer === 5 
        ? (Math.random() * 0.4 + 0.2) 
        : layer === 1 
        ? (Math.random() * 0.45 + 0.45) 
        : (Math.random() * 0.5 + 0.35);

      newParticles.push({
        layer,
        angle,
        baseRadius: orbitRadius,
        currentRadius: orbitRadius,
        targetRadius: orbitRadius,
        speed: baseSpeed,
        baseSize,
        currentSize: baseSize,
        opacity: baseOpacity,
        baseOpacity,
        phase: Math.random() * Math.PI * 2,
        noiseSpeed: Math.random() * 0.02 + 0.008,
        depth: Math.random(),
        colorType: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        radialDrift: 0,
        trailHistory: [],
        orbitTransitionTimer: Math.random() * 400 + 200 // frame countdown
      });
    }

    particlesRef.current = newParticles;
  }, [size]);

  // Handle visibility pause/resume for maximum battery/CPU performance
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // State change shockwaves and transitions
  useEffect(() => {
    const scaleFactor = size / 520;
    if (state === 'SUCCESS') {
      shockwavesRef.current.push({
        radius: size * 0.14,
        maxRadius: size * 0.52,
        opacity: 0.95,
        color: '#34D399'
      });
      // Outward radiant surge
      particlesRef.current.forEach(p => {
        p.radialDrift = (Math.random() * 3.2 + 1.8) * scaleFactor;
      });
    } else if (state === 'ERROR') {
      shockwavesRef.current.push({
        radius: size * 0.1,
        maxRadius: size * 0.4,
        opacity: 0.85,
        color: '#F43F5E'
      });
      // Controlled jitter
      particlesRef.current.forEach(p => {
        p.radialDrift = (Math.random() - 0.5) * 4.5;
      });
    } else if (state === 'LISTENING') {
      // Inward pull shockwave
      shockwavesRef.current.push({
        radius: size * 0.45,
        maxRadius: size * 0.15,
        opacity: 0.6,
        color: '#2DD4BF'
      });
    } else if (state === 'COMMUNICATING' || state === 'PLANNING') {
      // Packet bursts
      particlesRef.current.forEach((p, idx) => {
        if (idx % 8 === 0) {
          p.radialDrift = (Math.random() * 2.4 + 1.2) * (Math.random() > 0.5 ? 1 : -1);
        }
      });
    }
    prevStateRef.current = state;
  }, [state, size]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    let time = 0;

    const render = () => {
      // Pause if tab is backgrounded
      if (!isVisibleRef.current) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      time += 0.016;

      // Audio frequency modulation
      const audio: AudioFrequencyData = voiceAnalyzer.getAudioData();
      const amp = audio.amplitude;
      const bass = audio.bass;
      const treble = audio.treble;

      // Check reduced motion preference
      const prefersReducedMotion = typeof window !== 'undefined' && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Clear frame
      ctx.clearRect(0, 0, size, size);

      // Periodically trigger a subtle "thought wave" travelling through the particle field
      if (Date.now() - lastThoughtWaveTime.current > 3800 && (state === 'IDLE' || state === 'THINKING' || state === 'PLANNING' || state === 'WORKING')) {
        thoughtWavesRef.current.push({
          radius: size * 0.16,
          maxRadius: size * 0.52,
          speed: state === 'THINKING' ? 2.4 : 1.6,
          intensity: state === 'THINKING' ? 0.7 : 0.45,
          color: state === 'THINKING' ? '#A855F7' : state === 'PLANNING' ? '#38BDF8' : '#38BDF8'
        });
        lastThoughtWaveTime.current = Date.now();
      }

      // 1. Draw Multiple Concentric Orbital Rings (Dynamic & Deforming)
      const ringRadii = [
        size * 0.19, // inner orbit
        size * 0.29, // equatorial
        size * 0.39, // outer
        size * 0.47  // celestial
      ];

      ringRadii.forEach((baseR, idx) => {
        ctx.beginPath();

        // Audio breathing + state ring deformation
        let expansion = (bass * 14) + (amp * 8);
        if (state === 'LISTENING') expansion -= 10;
        if (state === 'PLANNING') expansion += Math.sin(time * 2.5 + idx) * 4;
        if (state === 'SUCCESS') expansion += 12;

        const dynamicR = Math.max(12, baseR + expansion);

        // Ring deformation: gentle harmonic wave across angles
        const segments = 48;
        for (let s = 0; s <= segments; s++) {
          const theta = (s / segments) * Math.PI * 2;
          const warp = Math.sin(theta * 3 + time * 1.5 + idx) * (1.5 + amp * 3);
          const r = dynamicR + warp;
          const rx = centerX + Math.cos(theta) * r;
          const ry = centerY + Math.sin(theta) * r;
          if (s === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();

        // Stroke aesthetics
        let ringAlpha = 0.08 + (amp * 0.14);
        if (state === 'PLANNING') ringAlpha = 0.22;
        if (state === 'WORKING' || state === 'EXECUTING') ringAlpha = 0.18;
        if (state === 'LISTENING') ringAlpha = 0.16;

        let strokeColor = `rgba(56, 189, 248, ${ringAlpha})`;
        if (state === 'ERROR') strokeColor = `rgba(244, 63, 94, ${ringAlpha * 1.3})`;
        else if (state === 'SUCCESS') strokeColor = `rgba(52, 211, 153, ${ringAlpha * 1.4})`;
        else if (state === 'THINKING') strokeColor = `rgba(168, 85, 247, ${ringAlpha * 1.3})`;
        else if (state === 'LISTENING') strokeColor = `rgba(45, 212, 191, ${ringAlpha * 1.4})`;
        else if (state === 'EMPATHY') strokeColor = `rgba(251, 113, 133, ${ringAlpha * 1.3})`;

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = idx === 1 ? 1.4 : idx === 3 ? 0.9 : 0.7;

        if (idx === 1) {
          ctx.setLineDash([6, 10]);
        } else if (idx === 3) {
          ctx.setLineDash([3, 14]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Orbital tick compass marks on the second ring
        if (idx === 1 && !prefersReducedMotion) {
          const numTicks = 12;
          for (let t = 0; t < numTicks; t++) {
            const tickAngle = (t / numTicks) * Math.PI * 2 + (time * 0.05);
            const innerTickR = dynamicR - 3;
            const outerTickR = dynamicR + 3;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(tickAngle) * innerTickR, centerY + Math.sin(tickAngle) * innerTickR);
            ctx.lineTo(centerX + Math.cos(tickAngle) * outerTickR, centerY + Math.sin(tickAngle) * outerTickR);
            ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha * 1.6})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      // 2. Update & Render Thought Waves
      for (let i = thoughtWavesRef.current.length - 1; i >= 0; i--) {
        const tw = thoughtWavesRef.current[i];
        tw.radius += tw.speed;
        tw.intensity *= 0.97;

        if (tw.intensity < 0.02 || tw.radius > tw.maxRadius) {
          thoughtWavesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, tw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = tw.color;
        ctx.globalAlpha = tw.intensity * 0.45;
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = 14;
        ctx.shadowColor = tw.color;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      // 3. Update & Render Shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += 4.2;
        sw.opacity *= 0.93;

        if (sw.opacity < 0.02 || sw.radius > sw.maxRadius) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.opacity;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = sw.color;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Update & Draw Intelligent Particles
      const particles = particlesRef.current;
      const mouse = mousePosRef.current;

      // State Physics Multipliers
      let speedMult = 1.0;
      let targetRadialShift = 0;
      let chaosNoise = 0;

      switch (state) {
        case 'IDLE':
          speedMult = 0.85 + (amp * 1.2);
          targetRadialShift = Math.sin(time * 1.2) * 3;
          break;
        case 'LISTENING':
          speedMult = 0.7 + (amp * 2.5);
          targetRadialShift = -26 - (amp * 22); // Inward magnetic suction!
          chaosNoise = amp * 2.0;
          break;
        case 'UNDERSTANDING':
          speedMult = 1.4;
          targetRadialShift = Math.sin(time * 2.5) * 8;
          break;
        case 'THINKING':
          speedMult = 2.2 + (amp * 1.8);
          targetRadialShift = Math.sin(time * 3.2) * 12;
          chaosNoise = 4.5;
          break;
        case 'PLANNING':
          speedMult = 1.2;
          targetRadialShift = 0; // lock into structured orbits
          break;
        case 'WORKING':
        case 'EXECUTING':
          speedMult = 3.6 + (amp * 2.0); // rapid directional streams
          targetRadialShift = Math.sin(time * 2.0) * 7;
          break;
        case 'COMMUNICATING':
          speedMult = 2.0;
          targetRadialShift = Math.sin(time * 4.0) * 15;
          break;
        case 'SPEAKING':
          speedMult = 1.5 + (amp * 3.4);
          targetRadialShift = Math.sin(time * 4.8) * (8 + amp * 24);
          break;
        case 'LEARNING':
          speedMult = 1.1;
          targetRadialShift = Math.sin(time * 2.0) * 9;
          break;
        case 'EMPATHY':
          speedMult = 0.6;
          targetRadialShift = Math.sin(time * 0.9) * 4;
          break;
        case 'SUCCESS':
          speedMult = 1.3;
          targetRadialShift = 16;
          break;
        case 'ERROR':
          speedMult = 0.85;
          chaosNoise = 7.5;
          break;
        case 'WAITING':
          speedMult = 0.75;
          targetRadialShift = Math.sin(time * 0.9) * 2;
          break;
      }

      if (prefersReducedMotion) {
        speedMult *= 0.2;
        chaosNoise = 0;
      }

      // Arrays to record 2D points for proximity filament lines
      const renderedPoints: { x: number; y: number; layer: number; opacity: number; colorR: number; colorG: number; colorB: number }[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Stochastic orbital band migration (organic entering/exiting orbital layers)
        p.orbitTransitionTimer--;
        if (p.orbitTransitionTimer <= 0 && p.layer <= 4) {
          const jumpDelta = (Math.random() - 0.5) * 32 * (size / 520);
          p.targetRadius = Math.max(50, Math.min(size * 0.48, p.baseRadius + jumpDelta));
          p.orbitTransitionTimer = Math.random() * 450 + 250;
        }

        // Harmonic breathing
        p.phase += p.noiseSpeed;
        const naturalOscillation = Math.sin(p.phase + time) * (p.layer === 5 ? 7 : 4);

        // Radial drift from shockwaves or bursts with damping
        if (Math.abs(p.radialDrift) > 0.04) {
          p.currentRadius += p.radialDrift;
          p.radialDrift *= 0.92;
        } else {
          // Smooth spring return to nominal target radius + state shift + audio boost
          const targetR = p.targetRadius + targetRadialShift + naturalOscillation + (bass * 20 * (p.layer / 5));
          p.currentRadius += (targetR - p.currentRadius) * 0.08;
        }

        // Angular velocity
        const stateSpeed = p.speed * speedMult * (1.0 + treble * 0.6);
        p.angle += stateSpeed;

        // Position coordinates
        let px = centerX + Math.cos(p.angle) * p.currentRadius;
        let py = centerY + Math.sin(p.angle) * p.currentRadius;

        // Thought wave excitation: brighten and displace if a thought wave passes
        let thoughtWaveBoost = 0;
        for (let tw of thoughtWavesRef.current) {
          const distToCenter = p.currentRadius;
          const diff = Math.abs(distToCenter - tw.radius);
          if (diff < 24) {
            const factor = (1 - diff / 24) * tw.intensity;
            thoughtWaveBoost += factor;
            px += Math.cos(p.angle) * factor * 6;
            py += Math.sin(p.angle) * factor * 6;
          }
        }

        // Chaos noise (during THINKING / ERROR)
        if (chaosNoise > 0) {
          px += Math.sin(p.phase * 3 + time * 5) * chaosNoise;
          py += Math.cos(p.phase * 3 + time * 5) * chaosNoise;
        }

        // Mouse magnetic interaction
        if (interactive && mouse.active) {
          const dx = px - mouse.x;
          const dy = py - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 85 && dist > 0.1) {
            const force = (1 - dist / 85) * 16;
            px += (dx / dist) * force;
            py += (dy / dist) * force;
          }
        }

        // Particle Trails (history buffer) for WORKING/EXECUTING or high speed
        if ((state === 'WORKING' || state === 'EXECUTING' || state === 'THINKING') && p.layer <= 3) {
          p.trailHistory.push({ x: px, y: py });
          if (p.trailHistory.length > 5) p.trailHistory.shift();

          // Render trail
          if (p.trailHistory.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trailHistory[0].x, p.trailHistory[0].y);
            for (let t = 1; t < p.trailHistory.length; t++) {
              ctx.lineTo(p.trailHistory[t].x, p.trailHistory[t].y);
            }
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * p.opacity})`;
            ctx.lineWidth = p.baseSize * 0.6;
            ctx.stroke();
          }
        } else {
          p.trailHistory = [];
        }

        // Dynamic size & opacity reaction to audio & thought waves
        const audioSizeBoost = amp * (p.layer === 1 ? 2.5 : 1.6) + (thoughtWaveBoost * 1.4);
        p.currentSize = Math.max(0.6, p.baseSize + audioSizeBoost);

        const audioOpacityBoost = amp * 0.4 + (thoughtWaveBoost * 0.5);
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
        } else if (state === 'UNDERSTANDING') {
          fillR = 56; fillG = 189; fillB = 248; // electric cyan
        } else if (state === 'EMPATHY') {
          fillR = 251; fillG = 113; fillB = 133; // rose peach #FB7185
        } else if (state === 'LEARNING') {
          fillR = 245; fillG = 158; fillB = 11; // amber #F59E0B
        } else if (state === 'SPEAKING') {
          fillR = 125; fillG = 211; fillB = 252; // bright sky #7DD3FC
        } else if (p.colorType === 'purple') {
          fillR = 192; fillG = 132; fillB = 252;
        } else if (p.colorType === 'blue') {
          fillR = 96; fillG = 165; fillB = 250;
        } else if (p.colorType === 'sky') {
          fillR = 56; fillG = 189; fillB = 248;
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(px, py, p.currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${fillR}, ${fillG}, ${fillB}, ${p.opacity})`;

        // Glow effects for foreground dots or during speech / high energy
        if (p.currentSize > 2.5 || amp > 0.25 || thoughtWaveBoost > 0.3) {
          ctx.shadowBlur = Math.min(18, p.currentSize * 4 + (amp * 12));
          ctx.shadowColor = `rgba(${fillR}, ${fillG}, ${fillB}, ${p.opacity * 0.9})`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fill();

        // Collect point for proximity connections (limit to inner & mid layers for 60fps performance)
        if (p.layer <= 3) {
          renderedPoints.push({
            x: px,
            y: py,
            layer: p.layer,
            opacity: p.opacity,
            colorR: fillR,
            colorG: fillG,
            colorB: fillB
          });
        }
      }

      // 5. Render Proximity Filaments (Connecting particle lines when nearby)
      const maxProximityDist = 32;
      const maxConnectionsPerPoint = 2; // prevent dense clusters from slowing down frame
      const len = renderedPoints.length;

      for (let i = 0; i < len; i += 2) {
        const p1 = renderedPoints[i];
        let connections = 0;

        // Check local window of neighbors
        const windowEnd = Math.min(len, i + 18);
        for (let j = i + 1; j < windowEnd; j++) {
          const p2 = renderedPoints[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxProximityDist * maxProximityDist) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxProximityDist) * 0.22 * Math.min(p1.opacity, p2.opacity);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p1.colorR}, ${p1.colorG}, ${p1.colorB}, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();

            connections++;
            if (connections >= maxConnectionsPerPoint) break;
          }
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
    // Interactive ripple shockwave on click
    shockwavesRef.current.push({
      radius: size * 0.16,
      maxRadius: size * 0.48,
      opacity: 0.95,
      color: state === 'ERROR' ? '#F43F5E' : state === 'SUCCESS' ? '#34D399' : '#38BDF8'
    });
    particlesRef.current.forEach(p => {
      p.radialDrift = (Math.random() * 2.4 + 1.2) * (size / 520);
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
        title="AURA Particle Field - Click to trigger energy pulse"
      />
    </div>
  );
};
