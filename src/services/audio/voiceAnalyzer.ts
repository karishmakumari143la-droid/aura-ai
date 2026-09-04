/**
 * Voice & Audio Reactivity Engine for AURA AI
 * Maps real microphone input and synthetic speech synthesis to real-time audio amplitude,
 * frequency bins, and orbital particle physics modulators.
 */

export interface AudioFrequencyData {
  amplitude: number;       // 0.0 - 1.0 overall volume
  bass: number;            // 0.0 - 1.0 low-frequency energy (orb pulsation)
  mid: number;             // 0.0 - 1.0 vocal presence (ring expansion)
  treble: number;          // 0.0 - 1.0 high-frequency sparkle (particle jitter/speed)
  rawFrequencies: Uint8Array;
}

class VoiceAnalyzerService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isListeningMic = false;
  private isSynthesizingVoice = false;
  private synthPhase = 0;
  private synthVolume = 0;
  private dataArray: Uint8Array = new Uint8Array(64);

  // Initialize Web Audio context on user gesture
  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioContext) {
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  // Connect user microphone to the AnalyserNode
  public async startMicrophoneAnalysis(): Promise<boolean> {
    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) return false;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.sourceNode = ctx.createMediaStreamSource(this.micStream);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.sourceNode.connect(this.analyser);
        this.isListeningMic = true;
        return true;
      }
    } catch (err) {
      console.warn('Microphone access for audio analysis unavailable, fallback active:', err);
    }
    this.isListeningMic = false;
    return false;
  }

  public stopMicrophoneAnalysis(): void {
    this.isListeningMic = false;
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
  }

  // Triggered when AURA is vocalizing via SpeechSynthesis
  public startSpeechModulation(): void {
    this.isSynthesizingVoice = true;
  }

  public stopSpeechModulation(): void {
    this.isSynthesizingVoice = false;
    this.synthVolume = 0;
  }

  // Sample current audio frame (called every animation frame)
  public getAudioData(): AudioFrequencyData {
    // 1. Real microphone input
    if (this.isListeningMic && this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;

      const len = this.dataArray.length;
      const bassCutoff = Math.floor(len * 0.25);
      const midCutoff = Math.floor(len * 0.65);

      for (let i = 0; i < len; i++) {
        const val = this.dataArray[i] / 255;
        sum += val;
        if (i < bassCutoff) bassSum += val;
        else if (i < midCutoff) midSum += val;
        else trebleSum += val;
      }

      return {
        amplitude: Math.min(1.0, (sum / len) * 2.2),
        bass: Math.min(1.0, (bassSum / bassCutoff) * 2.0),
        mid: Math.min(1.0, (midSum / (midCutoff - bassCutoff)) * 2.2),
        treble: Math.min(1.0, (trebleSum / (len - midCutoff)) * 2.5),
        rawFrequencies: this.dataArray
      };
    }

    // 2. Synthetic voice synthesis modulation when AURA is speaking
    if (this.isSynthesizingVoice) {
      this.synthPhase += 0.22;
      // Speech syllable rhythm simulation: vowel envelope with periodic fluctuations
      const vocalRhythm = (Math.sin(this.synthPhase * 1.8) * 0.5 + 0.5) * 
                          (Math.cos(this.synthPhase * 4.2) * 0.3 + 0.7) * 
                          (Math.sin(this.synthPhase * 0.5) * 0.2 + 0.8);
      
      this.synthVolume = this.synthVolume * 0.85 + vocalRhythm * 0.15;
      const amp = Math.max(0.2, Math.min(1.0, this.synthVolume * 1.25));

      const mockFreq = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        mockFreq[i] = Math.floor(Math.sin(i * 0.3 + this.synthPhase) * 128 * amp + 127 * amp);
      }

      return {
        amplitude: amp,
        bass: amp * 0.85,
        mid: amp * 1.1,
        treble: amp * 0.9,
        rawFrequencies: mockFreq
      };
    }

    // 3. Idle resting state (subtle organic baseline flutter)
    return {
      amplitude: 0.05,
      bass: 0.04,
      mid: 0.05,
      treble: 0.03,
      rawFrequencies: new Uint8Array(64)
    };
  }
}

export const voiceAnalyzer = new VoiceAnalyzerService();
