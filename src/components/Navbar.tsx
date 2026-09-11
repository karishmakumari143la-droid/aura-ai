import React, { useState } from 'react';
import { User, AIOrbState } from '../types';
import { 
  Shield, 
  Crown, 
  Bell, 
  Sparkles, 
  ChevronDown, 
  LogOut, 
  UserCheck, 
  Check, 
  Mic, 
  MicOff,
  Cpu,
  ExternalLink,
  Layers
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  orbState: AIOrbState;
  activeTab: string;
  onSelectTab: (tab: any) => void;
  onOpenAuth: () => void;
  onOpenOwnerPanel: () => void;
  onSwitchRole: (role: 'OWNER' | 'FREE_USER') => void;
  onToggleVoice: () => void;
  isVoiceActive: boolean;
  onOpenLanding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  orbState,
  activeTab,
  onSelectTab,
  onOpenAuth,
  onOpenOwnerPanel,
  onSwitchRole,
  onToggleVoice,
  isVoiceActive,
  onOpenLanding
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 border-b border-white/[0.07] bg-slate-950/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand Identity & Core Status */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenLanding}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AURA AI
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                AI OPERATING SYSTEM
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider">AURA Intelligent Core</p>
          </div>
        </button>

        {/* MODE TOGGLE: COMMAND MODE VS WORLD MODE */}
        <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-2xl border border-white/10 text-xs shadow-inner ml-2">
          <button
            onClick={() => onSelectTab('workspace')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'workspace' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMMAND MODE</span>
          </button>
          <button
            onClick={() => onSelectTab('world')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'world' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>WORLD MODE (2.5D)</span>
          </button>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Voice Mode Button */}
        <button
          onClick={onToggleVoice}
          title={isVoiceActive ? 'Disable Natural Voice Assistant' : 'Activate Voice AI Assistant'}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${
            isVoiceActive 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 animate-pulse' 
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
          }`}
        >
          {isVoiceActive ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
          <span className="hidden sm:inline">{isVoiceActive ? 'Voice Active' : 'Voice AI'}</span>
        </button>

        {/* Landing Page Preview Button */}
        <button
          onClick={onOpenLanding}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Landing</span>
        </button>

        {/* Owner Mode Status Tag */}
        {user?.isOwner && (
          <button
            onClick={onOpenOwnerPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide shadow-md shadow-amber-500/10 hover:border-amber-400 transition"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>OWNER MODE</span>
          </button>
        )}

          {!user?.isOwner && (
            <button
              onClick={onOpenAuth}
              className="w-full text-left px-2 py-2 rounded text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account / Sign In</span>
            </button>
          )}
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 hover:opacity-90"
          >
            Sign In
          </button>
      </div>
    </header>
  );
};
