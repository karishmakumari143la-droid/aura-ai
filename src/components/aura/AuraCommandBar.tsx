import React, { useState, useRef, useEffect } from 'react';
import { AuraState } from '../../types';
import { 
  Mic, 
  MicOff, 
  ArrowUp, 
  Paperclip, 
  X, 
  Sparkles, 
  Layers, 
  Brain, 
  Cpu, 
  Volume2,
  FileCode
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Monitor audio amplitude for mic glow effect
  useEffect(() => {
    let animId: number;
    const poll = () => {
      if (isListening || orbState === 'COMMUNICATING') {
        const audio = voiceAnalyzer.getAudioData();
        setAudioAmp(audio.amplitude);
      } else {
        setAudioAmp(0);
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
    { label: 'Build Gym Website', prompt: 'Create a high-conversion modern gym website with 3-tier pricing and WhatsApp VIP concierge' },
    { label: 'Parallel Orchestration', prompt: 'Coordinate research and UI design in parallel for a luxury restaurant booking app' },
    { label: 'Automate Lead Flow', prompt: 'Create an automated n8n webhook workflow for capturing client leads' },
    { label: 'Audit Computer Permissions', prompt: 'Review current desktop companion sandbox permissions and authorized tool adapters' }
  ];

  // Dynamic Mic State
  const getMicStatus = () => {
    if (isListening) return 'listening';
    if (orbState === 'COMMUNICATING') return 'speaking';
    if (isExecuting) return 'processing';
    return 'idle';
  };
  const micStatus = getMicStatus();

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-3 ${className}`}>
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

      {/* Main Command Input Box */}
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-end gap-2 p-2 sm:p-2.5 rounded-3xl bg-slate-950/80 backdrop-blur-2xl border transition-all duration-300 shadow-2xl ${
          isListening 
            ? 'border-teal-400 shadow-teal-500/20 ring-1 ring-teal-400/40' 
            : isExecuting 
            ? 'border-cyan-500/60 shadow-cyan-500/20' 
            : 'border-white/10 hover:border-white/20 focus-within:border-cyan-500/50 focus-within:shadow-cyan-500/10'
        }`}
      >
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 sm:p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900/80 transition focus:outline-none shrink-0"
          title="Attach files or documentation"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text Input Area */}
        <div className="flex-1 py-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={commandText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening 
                ? "AURA is listening to your voice..." 
                : isExecuting 
                ? "AURA Brain is orchestrating parallel tasks..." 
                : "Talk to AURA... (Type command, press Enter or click mic)"
            }
            className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 resize-none focus:outline-none leading-relaxed max-h-32"
          />
        </div>

        {/* Microphone Button with Voice Reactivity */}
        {onMicToggle && (
          <button
            type="button"
            onClick={onMicToggle}
            className={`relative p-2.5 sm:p-3 rounded-2xl transition-all duration-300 shrink-0 focus:outline-none flex items-center justify-center ${
              micStatus === 'listening'
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/30 font-bold'
                : micStatus === 'speaking'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
            style={{
              transform: micStatus === 'listening' ? `scale(${1.0 + audioAmp * 0.15})` : 'scale(1)'
            }}
            title={isListening ? "Mute Microphone" : "Speak to AURA"}
          >
            {micStatus === 'speaking' ? (
              <Volume2 className="w-5 h-5 animate-pulse" />
            ) : micStatus === 'listening' ? (
              <Mic className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}

            {/* Ripple ring while listening */}
            {isListening && (
              <span className="absolute inset-0 rounded-2xl border-2 border-teal-400 animate-ping opacity-60 pointer-events-none" />
            )}
          </button>
        )}

        {/* Submit Execution Button */}
        <button
          type="submit"
          disabled={(!commandText.trim() && attachedFiles.length === 0) || isExecuting}
          className={`p-2.5 sm:p-3 rounded-2xl font-bold transition-all duration-300 shrink-0 focus:outline-none flex items-center justify-center ${
            commandText.trim().length > 0 || attachedFiles.length > 0
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 cursor-pointer'
              : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-white/5'
          }`}
          title="Dispatch command to AURA Brain"
        >
          {isExecuting ? (
            <Cpu className="w-5 h-5 animate-spin text-cyan-400" />
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Suggested Quick Action Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 no-scrollbar text-xs">
        <span className="text-slate-500 font-mono text-[11px] shrink-0 flex items-center gap-1">
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
            className="px-3 py-1 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 hover:border-cyan-500/30 whitespace-nowrap transition shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
