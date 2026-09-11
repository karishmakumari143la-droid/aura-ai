import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  FileCode,
  Paperclip,
  Sparkles,
  X,
  Mic,
  Volume2,
  Brain,
  Loader2,
} from 'lucide-react';
import { AuraState } from '../../types';
import { voiceAnalyzer } from '../../services/audio/voiceAnalyzer';

interface AuraCommandBarProps {
  onExecuteCommand: (command: string, files?: File[]) => void;
  isExecuting?: boolean;
  orbState?: AuraState;
  onMicToggle?: () => void;
  isListening?: boolean;
  className?: string;
}

const STATE_LABELS: Partial<Record<AuraState, string>> = {
  IDLE: 'Ready',
  LISTENING: 'Listening',
  UNDERSTANDING: 'Understanding',
  THINKING: 'Thinking',
  PLANNING: 'Planning',
  WORKING: 'Working',
  COMMUNICATING: 'Communicating',
  VERIFYING: 'Verifying',
  RECOVERING: 'Recovering',
  SPEAKING: 'Speaking',
  EMPATHY: 'Present',
  SUCCESS: 'Completed',
  ERROR: 'Needs attention',
  WAITING: 'Waiting',
};

const QUICK_IDEAS = [
  {
    label: 'Build a website',
    prompt: 'Create a premium website for my business.',
  },
  {
    label: 'Improve my website',
    prompt: 'Analyze my website and suggest practical improvements.',
  },
  {
    label: 'Automate a workflow',
    prompt: 'Create an automation workflow for my business process.',
  },
  {
    label: 'Check my project',
    prompt: 'Inspect my project, find important issues, and verify the current state.',
  },
];

export const AuraCommandBar: React.FC<AuraCommandBarProps> = ({
  onExecuteCommand,
  isExecuting = false,
  orbState = 'IDLE',
  onMicToggle,
  isListening = false,
  className = '',
}) => {
  const [commandText, setCommandText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [audioAmp, setAudioAmp] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([
    3, 5, 4, 7, 5, 4, 3,
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /*
   * The command bar only visualizes audio activity.
   * Actual microphone ownership remains in App.tsx/speechService.
   */
  useEffect(() => {
    let animationFrame = 0;
    let tick = 0;

    const pollAudio = () => {
      tick += 1;

      const voiceVisualState =
        isListening ||
        orbState === 'SPEAKING' ||
        orbState === 'COMMUNICATING';

      if (voiceVisualState) {
        const audio = voiceAnalyzer.getAudioData();
        const amplitude = Number.isFinite(audio.amplitude)
          ? audio.amplitude
          : 0;

        setAudioAmp(amplitude);

        if (tick % 3 === 0) {
          setWaveformBars(
            Array.from({ length: 7 }, (_, index) => {
              const harmonic =
                Math.sin(tick * 0.2 + index * 0.8) * 0.5 + 0.5;

              return Math.max(
                3,
                Math.round(harmonic * amplitude * 22 + 4),
              );
            }),
          );
        }
      } else {
        setAudioAmp(0);
        setWaveformBars([3, 4, 3, 5, 4, 3, 4]);
      }

      animationFrame = requestAnimationFrame(pollAudio);
    };

    animationFrame = requestAnimationFrame(pollAudio);

    return () => cancelAnimationFrame(animationFrame);
  }, [isListening, orbState]);

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (
      (!commandText.trim() && attachedFiles.length === 0) ||
      isExecuting
    ) {
      return;
    }

    onExecuteCommand(commandText.trim(), attachedFiles);

    setCommandText('');
    setAttachedFiles([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setCommandText(event.target.value);

    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(
      event.target.scrollHeight,
      120,
    )}px`;
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!event.target.files) return;

    setAttachedFiles((previous) => [
      ...previous,
      ...Array.from(event.target.files),
    ]);

    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index),
    );
  };

  const stateLabel = STATE_LABELS[orbState] ?? 'Ready';

  const isVoiceVisualState =
    isListening ||
    orbState === 'SPEAKING' ||
    orbState === 'COMMUNICATING';

  return (
    <div
      className={`relative w-full max-w-3xl mx-auto space-y-2.5 select-none ${className}`}
    >
      {/* Connection glow */}
      <div
        className={`absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-12 bg-gradient-to-b from-cyan-500/15 to-transparent blur-xl pointer-events-none transition-opacity duration-500 ${
          isListening
            ? 'opacity-100'
            : isExecuting
              ? 'opacity-90'
              : 'opacity-40'
        }`}
      />

      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3">
          {attachedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-sm"
            >
              <FileCode className="w-3.5 h-3.5 shrink-0" />

              <span className="max-w-[140px] truncate">
                {file.name}
              </span>

              <button
                type="button"
                onClick={() => removeFile(index)}
                className="hover:text-rose-400 ml-1 transition"
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cognitive command surface */}
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
        {/* Attach */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900/80 transition focus:outline-none shrink-0"
          title="Attach files or documentation"
          aria-label="Attach files"
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

        {/* Input */}
        <div className="flex-1 py-0.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={commandText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening… speak naturally to AURA'
                : isExecuting
                  ? `AURA is ${stateLabel.toLowerCase()}…`
                  : 'Talk to AURA or type a request… Hindi, English or Hinglish'
            }
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none leading-relaxed max-h-28"
            aria-label="Talk to AURA"
          />
        </div>

        {/* Live voice activity */}
        {isVoiceVisualState && (
          <div
            className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-xl bg-slate-900/80 border border-teal-500/30 h-7 shrink-0"
            aria-label={stateLabel}
          >
            {waveformBars.map((height, index) => (
              <div
                key={index}
                className="w-1 rounded-full transition-all duration-100 bg-teal-400"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        )}

        {/* Voice status / access indicator.
            The actual voice session remains controlled by App.tsx.
            No "Mute Microphone" terminology is used here.
         */}
        {onMicToggle && (
          <button
            type="button"
            onClick={onMicToggle}
            className={`relative p-2 sm:p-2.5 rounded-2xl transition-all duration-300 shrink-0 focus:outline-none flex items-center justify-center ${
              isListening
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/30'
                : orbState === 'SPEAKING'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
            style={{
              transform: isListening
                ? `scale(${1 + audioAmp * 0.12})`
                : 'scale(1)',
            }}
            title={
              isListening
                ? 'AURA is listening'
                : 'Voice access'
            }
            aria-label={
              isListening
                ? 'AURA is listening'
                : 'Voice access'
            }
          >
            {orbState === 'SPEAKING' ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            ) : (
              <Mic
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  isListening ? 'animate-pulse' : ''
                }`}
              />
            )}

            {isListening && (
              <span className="animate-ping absolute inset-0 rounded-2xl border-2 border-teal-400 opacity-60 pointer-events-none" />
            )}
          </button>
        )}

        {/* Send */}
        <button
          type="submit"
          disabled={
            (!commandText.trim() &&
              attachedFiles.length === 0) ||
            isExecuting
          }
          className={`p-2 sm:p-2.5 rounded-2xl font-bold transition-all duration-300 shrink-0 focus:outline-none flex items-center justify-center ${
            commandText.trim() || attachedFiles.length > 0
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 cursor-pointer'
              : 'bg-slate-900/80 text-slate-600 cursor-not-allowed border border-white/5'
          }`}
          title="Send to AURA"
          aria-label="Send to AURA"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </form>

      {/* Quick ideas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 no-scrollbar text-xs">
        <span className="text-slate-500 font-mono text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Quick Ideas
        </span>

        {QUICK_IDEAS.map((idea) => (
          <button
            key={idea.label}
            type="button"
            onClick={() => {
              setCommandText(idea.prompt);
              requestAnimationFrame(() => {
                textareaRef.current?.focus();
              });
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-900 text-slate-400 hover:text-white border border-white/[0.06] hover:border-cyan-500/30 whitespace-nowrap transition shrink-0 text-[11px]"
          >
            {idea.label}
          </button>
        ))}
      </div>

      {/* Truthful cognitive state */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-600">
        <Brain className="w-3 h-3 text-cyan-500/70" />
        <span>AURA</span>
        <span className="text-slate-700">•</span>
        <span>{stateLabel}</span>
      </div>
    </div>
  );
};
