import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  Globe, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Bot,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'aura';
  text: string;
  timestamp: string;
  websiteUrl?: string;
  status?: 'planning' | 'executing' | 'verifying' | 'completed' | 'error';
}

interface AuraConversationProps {
  messages: ChatMessage[];
  onOpenWebsitePreview?: () => void;
  className?: string;
}

export const AuraConversation: React.FC<AuraConversationProps> = ({
  messages,
  onOpenWebsitePreview,
  className = ''
}) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={`w-full max-w-3xl mx-auto space-y-4 px-2 select-text ${className}`}>
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all animate-in fade-in duration-300`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-xl ${
                isUser
                  ? 'bg-gradient-to-r from-cyan-600/90 to-blue-700/90 text-white border border-cyan-400/30'
                  : 'bg-slate-950/80 backdrop-blur-xl text-slate-100 border border-white/10'
              }`}
            >
              {/* Header tag */}
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10 text-xs">
                {isUser ? (
                  <span className="font-bold tracking-wide text-cyan-200">YOU</span>
                ) : (
                  <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AURA</span>
                    {msg.status && (
                      <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 uppercase">
                        {msg.status}
                      </span>
                    )}
                  </div>
                )}
                <span className="ml-auto text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
              </div>

              {/* Message text */}
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-slate-200">
                {msg.text}
              </p>

              {/* Active Agent Badges */}
              

              {/* Website Preview Trigger Button if generated */}
              {msg.websiteUrl && onOpenWebsitePreview && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Production Website Ready</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenWebsitePreview}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Open Live Preview</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
