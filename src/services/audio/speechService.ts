import { voiceAnalyzer } from './voiceAnalyzer';

export interface SpeechRecognitionHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private isSpeaking = false;

  constructor() {
    // Check speech recognition support
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  public isRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // Start voice listening
  public async startListening(handlers: SpeechRecognitionHandlers): Promise<boolean> {
    if (!this.recognition) {
      handlers.onError?.('Speech recognition is not supported in this browser environment. Using text input.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    try {
      // Start microphone frequency analysis for particle reactivity
      await voiceAnalyzer.startMicrophoneAnalysis();

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const text = final || interim;
        handlers.onResult(text, Boolean(final));
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        voiceAnalyzer.stopMicrophoneAnalysis();
        this.isListening = false;
        handlers.onError?.(event.error);
      };

      this.recognition.onend = () => {
        voiceAnalyzer.stopMicrophoneAnalysis();
        this.isListening = false;
        handlers.onEnd?.();
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      voiceAnalyzer.stopMicrophoneAnalysis();
      this.isListening = false;
      handlers.onError?.(err?.message || 'Failed to start microphone');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    voiceAnalyzer.stopMicrophoneAnalysis();
    this.isListening = false;
  }

  // Vocalize AURA text with SpeechSynthesis and drive particle modulation
  public speak(
    text: string, 
    onStart?: () => void, 
    onEnd?: () => void
  ): void {
    if (!this.isSynthesisSupported()) {
      onEnd?.();
      return;
    }

    // Cancel ongoing speech
    window.speechSynthesis.cancel();

    // Clean markdown/code fences before vocalization
    const plainText = text
      .replace(/```[\s\S]*?```/g, 'Code block generated.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_>-]/g, ' ')
      .trim();

    if (!plainText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(plainText.slice(0, 300)); // vocalize initial conversational summary
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick best futuristic sounding or natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Natural') || 
      v.name.includes('Samantha') || 
      v.name.includes('Victoria')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      voiceAnalyzer.startSpeechModulation();
      onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      voiceAnalyzer.stopSpeechModulation();
      onEnd?.();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      voiceAnalyzer.stopSpeechModulation();
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    voiceAnalyzer.stopSpeechModulation();
  }
}

export const speechService = new SpeechService();
