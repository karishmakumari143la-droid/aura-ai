import { voiceAnalyzer } from './voiceAnalyzer';

export interface SpeechRecognitionHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export type SpeechLanguage = 'en' | 'hi' | 'hinglish';

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
        this.recognition.lang = navigator.language.toLowerCase().startsWith('hi') ? 'hi-IN' : 'en-IN';
      }
    }
  }

  public isRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public setRecognitionLanguage(language: SpeechLanguage): void {
    if (!this.recognition) return;
    this.recognition.lang = language === 'hi' ? 'hi-IN' : language === 'hinglish' ? 'en-IN' : 'en-US';
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
        // Safe no-speech recovery: do not treat silence as fatal error
        if (event.error === 'no-speech') {
          console.log('[Voice] No speech detected in window, standing by...');
          this.isListening = false;
          voiceAnalyzer.stopMicrophoneAnalysis();
          handlers.onEnd?.();
          return;
        }

        if (event.error === 'aborted') {
          this.isListening = false;
          voiceAnalyzer.stopMicrophoneAnalysis();
          return;
        }

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
    onEnd?: () => void,
    lang?: string
  ): boolean {
    if (!this.isSynthesisSupported()) {
      onEnd?.();
      return false;
    }

    // Recognition is paused before TTS so AURA cannot route its own voice back into the brain.
    this.stopListening();

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
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(plainText.slice(0, 300)); // vocalize initial conversational summary
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const isHindi = lang === 'hi' || /[\u0900-\u097F]/.test(plainText);
    const isHinglish = lang === 'hinglish';

    if (isHindi) {
      utterance.lang = 'hi-IN';
      const hiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi') || v.name.includes('India'));
      if (hiVoice) {
        utterance.voice = hiVoice;
      }
    } else {
      utterance.lang = isHinglish ? 'en-IN' : 'en-US';
      // Pick best futuristic sounding or natural voice if available
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Natural') || 
        v.name.includes('Samantha') || 
        v.name.includes('Victoria')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
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
    return true;
  }

  public stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    voiceAnalyzer.stopSpeechModulation();
  }

  // Welcome greeting for authenticated session with autoplay restrictions fallback
  public speakWelcomeGreeting(userName: string, language: 'en' | 'hi' | 'hinglish' = 'hinglish'): void {
    const greetings = {
      en: `Welcome back, ${userName}. AURA neural core is armed and ready.`,
      hi: `नमस्ते ${userName}, ऑरा सिस्टम सक्रिय है। आज हम क्या बना रहे हैं?`,
      hinglish: `Welcome ${userName}! AURA online hai. Aaj hum kya build karenge?`
    };

    const text = greetings[language] || greetings.hinglish;
    try {
      this.speak(text, undefined, undefined, language);
    } catch {
      console.log('[Voice] Autoplay was blocked by browser policy. Interaction required for audio.');
    }
  }
}

export const speechService = new SpeechService();
