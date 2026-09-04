import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Paperclip, 
  Sparkles, 
  ArrowUp, 
  Command, 
  Layers, 
  Globe, 
  Zap, 
  ShieldCheck,
  X
} from 'lucide-react';
import { AIOrbState } from '../types';

interface CommandComposerProps {
  onExecuteCommand: (command: string, attachments?: File[]) => void;
  isExecuting: boolean;
  orbState: AIOrbState;
  onMicToggle?: () => void;
  isListening?: boolean;
}

export const CommandComposer: React.FC<CommandComposerProps> = ({
  onExecuteCommand,
  isExecuting,
  orbState,
  onMicToggle,
  isListening = false
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestionPills = [
    { label: 'Gym Website + WhatsApp CTA', prompt: 'Create a new gym website using my premium template, add pricing, add WhatsApp CTA, create the content, put everything in GitHub, test the website and prepare it for deployment.' },
    { label: 'Artisanal Restaurant Menu', prompt: 'Build an artisanal restaurant website with seasonal 5-course tasting menu, wine list, and WhatsApp table reservation.' },
    { label: 'WhatsApp Lead to CRM Automation', prompt: 'Create an automated workflow: When a new lead inquires via WhatsApp, score the lead, draft a proposal, and save to CRM.' },
    { label: 'Audit Security & Accessibility', prompt: 'Run a full verification audit on website responsiveness, broken links, WCAG accessibility, and token security.' }
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isExecuting) return;

    onExecuteCommand(input.trim(), attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...filesArray]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2.5">
      {/* Quick Suggestion Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Suggestions:
        </span>
        {suggestionPills.map((pill, idx) => (
          <button
            key={idx}
            onClick={() => setInput(pill.prompt)}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-800 transition-all shrink-0 flex items-center gap-1.5"
          >
            <span>{pill.label}</span>
          </button>
        ))}
      </div>

      {/* Main Glass Composer */}
      <div className="relative rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl p-3 focus-within:border-cyan-500/50 transition-all">
        {/* Attachment preview tags */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-slate-800">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700">
                <Paperclip className="w-3 h-3 text-cyan-400" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-rose-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Speak or type an autonomous command: e.g. 'Create a new gym website, add pricing, add WhatsApp CTA, test and prepare deployment'..."
          rows={2}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          {/* Left tools: Attachments & Mic */}
          <div className="flex items-center gap-1 sm:gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              multiple 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach documents or guidelines for AI"
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {onMicToggle && (
              <button
                type="button"
                onClick={onMicToggle}
                title={isListening ? 'Stop listening' : 'Start voice command'}
                className={`p-2 rounded-xl transition ${
                  isListening
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/20 animate-pulse'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                }`}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-mono pl-2">
              <Command className="w-3 h-3" />
              <span>Enter to execute</span>
            </div>
          </div>

          {/* Right: Submit Button & State */}
          <div className="flex items-center gap-2">
            {isExecuting && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium px-2 py-1 rounded-md bg-amber-950/40 border border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Orchestrating...</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isExecuting}
              className={`p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                input.trim() && !isExecuting
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 scale-100'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="hidden sm:inline">Execute</span>
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
