import React, { useState, useRef, useEffect } from 'react';
import { AuraState } from '../../types';
import { 
  Mic, 
  ArrowUp, 
  Paperclip, 
  X, 
  Sparkles, 
  Cpu, 
  Volume2,
  FileCode,
  CornerDownLeft
} from 'lucide-react';
import { voiceAnalyzer } from '../../services/audio/voiceAnalyzer';

interface AuraCommandBarProps {
  onExecuteCommand: (command: string, files?: File[]) => void;
  isExecuting?: boolean;
  orbState?: AuraState;
  onMicToggle?: () => void;
  isListening?: boolean;
  className?: string;
}

export const AuraCommandBar: React.FC<AuraCommandBarProps> = ({
  onExecuteCommand,
  isExecuting = false,
  orbState = 'IDLE',
  onMicToggle,
  isListening = false,
  className = ''
}) => {
  const [commandText, setCommandText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [audioAmp, setAudioAmp] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([4, 6, 8, 5, 12, 7, 4]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Monitor audio amplitude for mic glow effect & waveform bars
  useEffect(() => {
    let animId: number;
    let tick = 0;
    const poll = () => {
      tick++;
      if (isListening || orbState === 'SPEAKING' || orbState === 'COMMUNICATING') {
        const audio = voiceAnalyzer.getAudioData();
        setAudioAmp(audio.amplitude);

        // Generate 7 organic waveform heights
        if (tick % 3 === 0) {
          const bars = Array.from({ length: 7 }, (_, i) => {
            const harmonic = Math.sin((tick * 0.2) + i * 0.8) * 0.5 + 0.5;
            return Math.max(3, Math.round(harmonic * audio.amplitude * 22 + 4));
          });
          setWaveformBars(bars);
        }
      } else {
        setAudioAmp(0);
        setWaveformBars([3, 4, 3, 5, 4, 3, 4]);
      }
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [isListening, orbState]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!commandText.trim() && attachedFiles.length === 0) || isExecuting) return;

    onExecuteCommand(commandText.trim(), attachedFiles);
    setCommandText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommandText(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const samplePrompts = [
    { label: 'Restaurant Website (Hindi/English)', prompt: 'Restaurant website ko premium bana do with online table reservation and royal dining menu' },
    { label: 'Gym Landing Page', prompt: 'Create a high-conversion modern gym website with 3-tier pricing and WhatsApp VIP concierge' },
    { label: 'Parallel Agent Workflow', prompt: 'Analyze market competitors and prepare outreach strategy in parallel' },
    { label: 'Automate Lead Flow', prompt: 'Create an automated webhook workflow for capturing client leads' }
  ];

  return (
    <div className={`relative w-full max-w-3xl mx-auto space-y-2.5 select-none ${className}`}>
      {/* Visual Energy Conduit: Subtle radial glow linking command bar to AURA Core */}
      <div 
        className={`absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-12 bg-gradient-to-b from-cyan-500/15 to-transparent blur-xl pointer-events-none transition-opacity duration-500 ${
          isListening ? 'opacity-100 from-teal-400/25' : isExecuting ? 'opacity-90 from-cyan-400/20' : 'opacity-40'
        }`}
      />

      {/* Attached Files Pill Bar */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-sm"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="max-w-[140px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="hover:text-rose-400 ml-1 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Command Input Box (Floating Glass Console) */}
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center gap-2 p-2 sm:p-2.5 rounded-3xl bg-[#030611]/90 backdrop-blur-2xl border transition-all duration-300 shadow-2xl ${
          isListening 
            ? 'border-teal-400 shadow-teal-500/20 ring-2 ring-teal-400/30' 
            : isExecuting 
            ? 'border-cyan-500/60 shadow-cyan-500/20 ring-1 ring-cyan-500/30' 
            : 'border-white/[0.09] hover:border-white/20 focus-within:border-cyan-500/50 focus-within:shadow-cyan-500/15 focus-within:ring-1 focus-within:ring-cyan-500/20'
        }`}
      >
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900/80 transition focus:outline-none shrink-0"
          title="Attach files or documentation"
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text Input Area */}
        <div className="flex-1 py-0.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={commandText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening 
                ? "Speak to AURA... listening to your voice" 
                : isExecuting 
                ? "AURA is orchestrating parallel agent workflow..." 
                : "Speak to AURA or type a command... (Hindi, English, Hinglish)"
            }
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none leading-relaxed max-h-28"
          />
        </div>

        {/* Live Audio Waveform Indicator (When Listening or Speaking) */}
        {(isListening || orbState === 'SPEAKING') && (
          <div className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-xl bg-slate-900/80 border border-teal-500/30 h-7 shrink-0">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-100 bg-teal-400"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        )}

        {/* Microphone Button with Voice Reactivity */}
        {onMicToggle && (
          <button
            type="button"
            onClick={onMicToggle}
            className={`relative p-2 sm:p-2.5 rounded-2xl transition-all duration-300 shrink-0 focus:outline-none flex items-center justify-center ${
              isListening
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/30 font-bold'
                : orbState === 'SPEAKING'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
            style={{
              transform: isListening ? `scale(${1.0 + audioAmp * 0.12})` : 'scale(1)'
            }}
            title={isListening ? "Mute Microphone" : "Speak to AURA"}
          >
            {orbState === 'SPEAKING' ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            ) : isListening ? (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            )}

            {/* Ripple ring while listening */}
            {isListening && (
              <span className="animate-ping absolute inset-0 rounded-2xl border-2 border-teal-400 opacity-60 pointer-events-none" />
            )}
          </button>
        )}

        {/* Submit Execution Button */}
        <button
          type="submit"
          disabled={(!commandText.trim() && attachedFiles.length === 0) || isExecuting}
          className={`p-2 sm:p-2.5 rounded-2xl font-bold transition-all duration-300 shrink-0 focus:outline-none flex items-center justify-center ${
            commandText.trim().length > 0 || attachedFiles.length > 0
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 cursor-pointer'
              : 'bg-slate-900/80 text-slate-600 cursor-not-allowed border border-white/5'
          }`}
          title="Send command (Enter)"
        >
          {isExecuting ? (
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-cyan-400" />
          ) : (
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </form>

      {/* Suggested Quick Action Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 no-scrollbar text-xs">
        <span className="text-slate-500 font-mono text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Quick Ideas:
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCommandText(p.prompt);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-900 text-slate-400 hover:text-white border border-white/[0.06] hover:border-cyan-500/30 whitespace-nowrap transition shrink-0 text-[11px]"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
