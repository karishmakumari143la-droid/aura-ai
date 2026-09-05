import React from 'react';
import { 
  PlusCircle, 
  MessageSquare, 
  FolderKanban, 
  Globe, 
  Users, 
  Zap, 
  FileCode, 
  Layers, 
  Brain, 
  Settings, 
  Crown,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export type NavTab = 
  | 'workspace' 
  | 'world'
  | 'permissions'
  | 'conversations' 
  | 'projects' 
  | 'websites' 
  | 'clients' 
  | 'automations' 
  | 'files' 
  | 'integrations' 
  | 'memory' 
  | 'settings' 
  | 'owner_panel';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOwner?: boolean;
  onNewTask: () => void;
  unreadTasksCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOwner,
  onNewTask,
  unreadTasksCount = 0
}) => {
  const mainNavItems = [
    { id: 'workspace' as NavTab, label: 'Command Cockpit', icon: Sparkles, badge: 'Live' },
    { id: 'world' as NavTab, label: 'Virtual Agent World', icon: Globe, badge: '2.5D' },
    { id: 'websites' as NavTab, label: 'Synthesized Sites', icon: Layers, badge: 'Live' },
    { id: 'memory' as NavTab, label: 'Structured Memory', icon: Brain, badge: null },
    { id: 'permissions' as NavTab, label: 'Computer Clearance', icon: Settings, badge: 'Security' },
    { id: 'automations' as NavTab, label: 'Automations (n8n)', icon: Zap, badge: 'Active' },
    { id: 'clients' as NavTab, label: 'Clients & CRM', icon: Users, badge: 'Leads' },
    { id: 'integrations' as NavTab, label: 'Tool Adapters Hub', icon: FolderKanban, badge: '6 Tools' },
  ];

  return (
    <aside className="w-64 border-r border-white/[0.07] bg-slate-950/60 backdrop-blur-xl flex flex-col justify-between h-[calc(100vh-4rem)] p-3 shrink-0">
      <div className="space-y-4">
        {/* Primary New Task Action */}
        <button
          onClick={onNewTask}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group transition-all"
        >
          <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Natural AI Command</span>
        </button>

        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Workspace Hub
          </p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800/90 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Owner Special Section (Bottom) */}
      <div className="pt-3 border-t border-white/[0.07] space-y-2">
        {isOwner && (
          <button
            onClick={() => setActiveTab('owner_panel')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
              activeTab === 'owner_panel'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                : 'bg-amber-950/20 border-amber-500/25 text-amber-400/90 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Owner Control Panel</p>
                <p className="text-[10px] text-amber-400/70">Unrestricted Master Access</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400/60" />
          </button>
        )}

        <div className="px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Autonomous Core</span>
          </span>
          <span className="font-mono text-[10px] text-slate-500">AURA Core</span>
        </div>
      </div>
    </aside>
  );
};
