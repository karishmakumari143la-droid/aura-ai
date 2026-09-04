import React, { useState, useEffect, useRef } from 'react';
import { AuraNavbar, AuraTab } from './components/aura/AuraNavbar';
import { AuraCore } from './components/aura/AuraCore';
import { AuraCommandBar } from './components/aura/AuraCommandBar';
import { AuraConversation, ChatMessage } from './components/aura/AuraConversation';
import { TaskGraphViewer } from './components/TaskGraphViewer';
import { AgentWorldView } from './components/AgentWorldView';
import { WebsiteView } from './components/WebsiteView';
import { MemoryManager } from './components/MemoryManager';
import { PermissionsManager } from './components/PermissionsManager';
import { OwnerConsole } from './components/OwnerConsole';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { PricingModal } from './components/PricingModal';
import { ProjectAllowanceModal } from './components/ProjectAllowanceModal';
import { AutomationsView } from './components/AutomationsView';
import { IntegrationsView } from './components/IntegrationsView';
import { speechService } from './services/audio/speechService';
import { auraBrain } from './services/ai/AuraBrain';
import { 
  User, 
  AuraState, 
  Task, 
  WebsiteProject, 
  VirtualAgent, 
  ComputerPermissionConfig, 
  ToolDefinition, 
  ComputerPermissionType, 
  PermissionState,
  ProjectQuotaStatus
} from './types';
import { 
  Sparkles, 
  Globe, 
  Cpu, 
  Layers, 
  Brain, 
  Sliders, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Maximize2,
  Volume2,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string>('karishmakumari143la@gmail.com');
  const [activeTab, setActiveTab] = useState<AuraTab>('aura');
  const [auraMode, setAuraMode] = useState<'COMMAND' | 'WORLD'>('COMMAND');
  const [orbState, setOrbState] = useState<AuraState>('IDLE');
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState<boolean>(false);
  const [projectQuota, setProjectQuota] = useState<ProjectQuotaStatus | null>(null);
  
  // Execution & AI State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [websitesList, setWebsitesList] = useState<WebsiteProject[]>([]);
  const [activeWebsite, setActiveWebsite] = useState<WebsiteProject | null>(null);
  const [showTaskGraphModal, setShowTaskGraphModal] = useState<boolean>(false);
  const [showFullConversation, setShowFullConversation] = useState<boolean>(false);

  // Chat conversation stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'aura',
      text: 'AURA AI is active and initialized. I am your intelligent AI partner. You can speak or type any goal—such as creating a high-conversion gym website with WhatsApp CTA, orchestrating parallel development workflows, or configuring automated tasks.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activeAgents: ['AURA', 'SCOUT', 'PIXEL', 'CODE', 'QA'],
      status: 'completed'
    }
  ]);
  
  // Agents, Permissions & Companion
  const [agents, setAgents] = useState<VirtualAgent[]>([]);
  const [permissions, setPermissions] = useState<ComputerPermissionConfig[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [companion, setCompanion] = useState({
    connected: true,
    version: '2.0.0-aura',
    os: 'Linux (Cloud Container Sandbox)',
    hostname: 'aura-node-primary'
  });

  // Natural Voice Assistant
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Initialize and fetch user session & state
  useEffect(() => {
    fetchSession();
    fetchTasks();
    fetchWebsites();
    fetchAgents();
    fetchPermissions();
    fetchTools();
    fetchProjectQuota();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
        if (data.ownerEmail) {
          setOwnerEmail(data.ownerEmail);
        }
      }
    } catch (err) {
      console.error('Failed to fetch auth session:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.tasks) {
          setTasksList(data.tasks);
          if (data.tasks.length > 0 && !currentTask) {
            setCurrentTask(data.tasks[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const fetchWebsites = async () => {
    try {
      const res = await fetch('/api/websites');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.websites) {
          setWebsitesList(data.websites);
          if (data.websites.length > 0 && !activeWebsite) {
            setActiveWebsite(data.websites[0]);
          }
        }
        if (data.quota) {
          setProjectQuota(data.quota);
        }
      }
    } catch (err) {
      console.error('Failed to fetch websites:', err);
    }
  };

  const fetchProjectQuota = async () => {
    try {
      const res = await fetch('/api/usage/projects');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setProjectQuota(data);
      }
    } catch (err) {
      console.error('Failed to fetch project quota:', err);
    }
  };

  const handleSimulateLimit = async () => {
    try {
      const res = await fetch('/api/usage/simulate-limit', { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.quota) {
          setProjectQuota(data.quota);
        }
      }
    } catch (err) {
      console.error('Failed to simulate quota limit:', err);
    }
  };

  const handleResetQuota = async () => {
    try {
      const res = await fetch('/api/usage/reset-for-testing', { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.quota) {
          setProjectQuota(data.quota);
        }
      }
    } catch (err) {
      console.error('Failed to reset quota:', err);
    }
  };

  const handleCreateProject = async (projectData: Partial<WebsiteProject>) => {
    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      const data = await res.json();
      if (!res.ok) {
        fetchProjectQuota();
        return {
          success: false,
          error: data.message || "Today's 5-project limit is reached. Your project allowance will reset tomorrow."
        };
      }
      if (data.website) {
        setWebsitesList(prev => [data.website, ...(prev || []).filter(w => w?.id !== data.website.id)]);
        setActiveWebsite(data.website);
        if (data.quota) {
          setProjectQuota(data.quota);
        } else {
          fetchProjectQuota();
        }
        return { success: true };
      }
      return { success: false, error: 'Unknown response' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.agents) {
          setAgents(data.agents);
        }
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/computer/permissions');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.permissions) {
          setPermissions(data.permissions);
        }
        if (data.companion) {
          setCompanion(data.companion);
        }
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/tools');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.tools) {
          setTools(data.tools);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tools:', err);
    }
  };

  const handleUpdatePermission = async (permission: ComputerPermissionType, state: PermissionState) => {
    try {
      const res = await fetch('/api/computer/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission, state })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.permissions) {
          setPermissions(data.permissions);
        }
      }
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  // Voice Interaction Handler
  const handleToggleVoice = async () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      setIsVoiceActive(false);
      setOrbState('IDLE');
    } else {
      setIsVoiceActive(true);
      setOrbState('LISTENING');
      setIsListening(true);

      speechService.startListening({
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            setIsListening(false);
            if (transcript.trim()) {
              handleExecuteCommand(transcript.trim());
            } else {
              setOrbState('IDLE');
            }
          }
        },
        onError: (error) => {
          console.warn('Voice error:', error);
          setIsListening(false);
          setOrbState('IDLE');
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
    }
  };

  const speakAuraReply = (text: string, targetStateAfter: AuraState = 'IDLE', lang?: string) => {
    speechService.speak(
      text,
      () => setOrbState('SPEAKING'),
      () => setOrbState(targetStateAfter),
      lang
    );
  };

  // Execute Natural Command through AURA Brain DAG Orchestrator
  const handleExecuteCommand = async (command: string, files?: File[]) => {
    if (!command.trim() && (!files || files.length === 0)) return;

    const userMsgId = `user-${Date.now()}`;
    const auraMsgId = `aura-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message to conversation
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: command,
        timestamp
      }
    ]);

    setIsExecuting(true);
    setOrbState('UNDERSTANDING');

    // Create a client-side DAG plan first for instant responsiveness
    const clientPlan = auraBrain.planCommand(command);

    try {
      const res = await fetch('/api/ai/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: command })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = (res.ok && contentType.includes('application/json')) ? await res.json() : null;

      if (data && data.task) {
        setCurrentTask(data.task);
        setTasksList(prev => [data.task, ...(prev || []).filter(t => t?.taskId !== data.task.taskId)]);

        if (data.website) {
          setActiveWebsite(data.website);
          setWebsitesList(prev => [data.website, ...(prev || []).filter(w => w?.id !== data.website.id)]);
          if (data.openWebsite) {
            setActiveTab('projects');
          }
        }

        fetchAgents();

        const summaryText = data.summary || `AURA decomposed "${command}" into a parallel task DAG. Work delegated to SCOUT, PIXEL, CODE, and QA.`;
        
        // Add AURA response message
        setMessages(prev => [
          ...prev,
          {
            id: auraMsgId,
            sender: 'aura',
            text: summaryText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            task: data.task,
            websiteUrl: data.website ? `/api/websites/${data.website.id}` : undefined,
            activeAgents: ['AURA', 'SCOUT', 'PIXEL', 'CODE', 'QA'],
            status: data.task.status === 'COMPLETED' ? 'completed' : 'executing'
          }
        ]);

        const nextState: AuraState = (data.auraState as AuraState) || (data.task.status === 'COMPLETED' ? 'SUCCESS' : 'WORKING');

        speakAuraReply(summaryText, nextState, data.language);

        if (data.task.status === 'WAITING_FOR_USER') {
          setOrbState('ERROR');
        } else if (data.task.status === 'RUNNING') {
          setOrbState('WORKING');
          runParallelDAGProgression(data.task.taskId, auraMsgId);
        } else {
          setOrbState(nextState);
          if (nextState === 'SUCCESS') {
            setTimeout(() => setOrbState('IDLE'), 3500);
          }
        }
      } else {
        // Fallback with client plan
        setOrbState('WORKING');
        setMessages(prev => [
          ...prev,
          {
            id: auraMsgId,
            sender: 'aura',
            text: `AURA Cognitive Engine planned 5 parallel tasks. Autonomous agents dispatched.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            activeAgents: ['SCOUT', 'PIXEL', 'CODE'],
            status: 'completed'
          }
        ]);
        setTimeout(() => setOrbState('SUCCESS'), 2000);
      }
    } catch (err) {
      console.error('Orchestration error:', err);
      setOrbState('ERROR');
      setMessages(prev => [
        ...prev,
        {
          id: auraMsgId,
          sender: 'aura',
          text: 'Encountered an issue processing command. Re-establishing neural link.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'error'
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  // DAG Progression Simulator
  const runParallelDAGProgression = async (taskId: string, messageId: string) => {
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 1400));
      try {
        const res = await fetch(`/api/tasks/${taskId}/advance`, { method: 'POST' });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.task) {
            setCurrentTask(data.task);
            fetchAgents();
            if (data.task.status === 'COMPLETED') {
              setOrbState('SUCCESS');
              fetchWebsites();

              // Update conversation message status to completed
              setMessages(prev => prev.map(m => m.id === messageId ? {
                ...m,
                status: 'completed',
                websiteUrl: activeWebsite ? `/api/websites/${activeWebsite.id}` : m.websiteUrl
              } : m));

              speakAuraReply('Execution completed successfully. All artifacts verified.');
              setTimeout(() => setOrbState('IDLE'), 3000);
              break;
            }
          }
        }
      } catch (err) {
        break;
      }
    }
  };

  const handleAdvanceStep = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/advance`, { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.task) {
          setCurrentTask(data.task);
          fetchAgents();
          if (data.task.status === 'COMPLETED') {
            setOrbState('SUCCESS');
            fetchWebsites();
            setTimeout(() => setOrbState('IDLE'), 3000);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.task) {
          setCurrentTask(data.task);
          setOrbState('EXECUTING');
          runParallelDAGProgression(taskId, `aura-${Date.now()}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/reject`, { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.task) {
          setCurrentTask(data.task);
          setOrbState('IDLE');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchRole = async (role: 'OWNER' | 'FREE_USER') => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (showLanding) {
    return (
      <LandingPage
        onStartUsingAI={() => {
          setShowLanding(false);
          setActiveTab('aura');
        }}
        onPromptSelect={(prompt) => {
          setShowLanding(false);
          setActiveTab('aura');
          handleExecuteCommand(prompt);
        }}
        onOpenPricing={() => { setShowLanding(false); setIsAllowanceModalOpen(true); }}
        onLogin={() => { setShowLanding(false); setIsAuthOpen(true); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#030509] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sleek Minimalist Top Navigation */}
      <AuraNavbar
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        orbState={orbState}
        onToggleVoice={handleToggleVoice}
        isVoiceActive={isVoiceActive}
        onSwitchRole={handleSwitchRole}
        onOpenLanding={() => setShowLanding(true)}
        quota={projectQuota}
        onOpenAllowanceModal={() => setIsAllowanceModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col">

          {/* TAB: AURA (Core Living AI Entity & Command Cockpit) */}
          {activeTab === 'aura' && (() => {
            const latestAuraMsg = [...messages].reverse().find(m => m.sender === 'aura');
            return (
              <div className="flex-1 flex flex-col items-center justify-start space-y-6 w-full">
                
                {/* Header Title & Subtitle */}
                <div className="text-center pt-1 select-none">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 text-xs font-mono mb-2 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>LIVING AI COGNITIVE CORE</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    AURA Autonomous Operating System
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl mx-auto">
                    Speaks, understands intent, synthesizes production websites, and delegates multi-agent DAGs.
                  </p>
                </div>

                {/* Mode Switch Pill (COMMAND vs WORLD) */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-white/10 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setAuraMode('COMMAND')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      auraMode === 'COMMAND'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AURA LIVING CORE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuraMode('WORLD')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      auraMode === 'WORLD'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>2.5D WORLD ENVIRONMENT</span>
                  </button>
                </div>

                {/* View Rendering based on Mode */}
                {auraMode === 'COMMAND' ? (
                  <div className="w-full flex-1 flex flex-col items-center space-y-6">
                    {/* Central Living Circular AI Core (Hero Scale) */}
                    <div className="relative py-1 flex flex-col items-center justify-center">
                      <AuraCore
                        state={orbState}
                        size="hero"
                        showLabel
                        onCoreClick={() => {
                          if (orbState === 'IDLE') setOrbState('THINKING');
                          else if (orbState === 'THINKING') setOrbState('PLANNING');
                          else setOrbState('IDLE');
                        }}
                      />
                    </div>

                    {/* AURA Voice / Response Transcript Card directly beneath Core */}
                    {latestAuraMsg && (
                      <div className="w-full max-w-2xl px-5 py-4 rounded-3xl bg-slate-950/90 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
                              AURA TRANSCRIPT
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{latestAuraMsg.timestamp}</span>
                          </div>
                          {latestAuraMsg.websiteUrl && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('projects')}
                              className="text-[11px] font-bold text-cyan-300 hover:underline flex items-center gap-1"
                            >
                              Open Website Preview →
                            </button>
                          )}
                        </div>
                        <p className="text-sm sm:text-base text-slate-100 font-sans leading-relaxed">
                          "{latestAuraMsg.text}"
                        </p>
                        {latestAuraMsg.activeAgents && latestAuraMsg.activeAgents.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-slate-400 flex-wrap">
                            <span>Specialists Assigned:</span>
                            {latestAuraMsg.activeAgents.map((ag: string) => (
                              <span key={ag} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-cyan-300 font-bold">
                                {ag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Floating Voice & Command Bar directly beneath Core & Transcript */}
                    <div className="w-full max-w-3xl">
                      <AuraCommandBar
                        onExecuteCommand={handleExecuteCommand}
                        isExecuting={isExecuting}
                        orbState={orbState}
                        onMicToggle={handleToggleVoice}
                        isListening={isListening}
                      />
                    </div>

                    {/* Active Task Progress Banner if a task is running */}
                    {currentTask && (
                      <div className="w-full max-w-3xl p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 backdrop-blur-xl flex items-center justify-between shadow-xl animate-in fade-in">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                            <Cpu className="w-4 h-4 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{currentTask.title}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                                {currentTask.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Parallel DAG with {currentTask.nodes?.length || 0} nodes running across specialized agents.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowTaskGraphModal(!showTaskGraphModal)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{showTaskGraphModal ? 'Hide Graph' : 'Inspect DAG'}</span>
                        </button>
                      </div>
                    )}

                    {/* Optional Task Graph Expandable Drawer */}
                    {currentTask && showTaskGraphModal && (
                      <div className="w-full max-w-4xl animate-in zoom-in-95 duration-200">
                        <TaskGraphViewer
                          task={currentTask}
                          onAdvanceStep={handleAdvanceStep}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onViewWebsite={() => setActiveTab('projects')}
                        />
                      </div>
                    )}

                    {/* Collapsible Full Neural Conversation History Drawer */}
                    <div className="w-full max-w-3xl flex flex-col items-center pt-2 pb-6">
                      <button
                        type="button"
                        onClick={() => setShowFullConversation(!showFullConversation)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-xs font-mono text-slate-400 hover:text-white transition shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{showFullConversation ? 'Hide Conversation History' : `View Full Conversation History (${messages.length})`}</span>
                        {showFullConversation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showFullConversation && (
                        <div className="w-full mt-4 animate-in fade-in duration-300">
                          <AuraConversation
                            messages={messages}
                            currentTask={currentTask}
                            onOpenWebsitePreview={() => setActiveTab('projects')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 2.5D Digital Workspace World */
                  <div className="w-full space-y-4 animate-in fade-in duration-300">
                    <AgentWorldView agents={agents} />
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: WORK (Dedicated Task DAG Graph & Execution History) */}
          {activeTab === 'work' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-cyan-400" />
                    <span>Parallel Task Execution Graph</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Topological multi-level DAG with autonomous parallel agent delegation and human approval gateways.
                  </p>
                </div>

                {tasksList.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-mono">Tasks:</span>
                    <select
                      value={currentTask?.taskId || ''}
                      onChange={(e) => {
                        const t = tasksList.find(x => x.taskId === e.target.value);
                        if (t) setCurrentTask(t);
                      }}
                      className="bg-slate-900 border border-white/10 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    >
                      {tasksList.map(t => (
                        <option key={t.taskId} value={t.taskId}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {currentTask ? (
                <TaskGraphViewer
                  task={currentTask}
                  onAdvanceStep={handleAdvanceStep}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewWebsite={() => setActiveTab('projects')}
                />
              ) : (
                <div className="p-12 text-center rounded-3xl bg-slate-950/60 border border-white/10">
                  <Cpu className="w-8 h-8 text-cyan-400 mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-bold text-white">No Active Task Graph</p>
                  <p className="text-xs text-slate-400 mt-1">Submit a natural command in the command bar to synthesize a task DAG.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: WORLD (2.5D Digital Workspace) */}
          {activeTab === 'world' && (
            <div className="space-y-4">
              <AgentWorldView agents={agents} />
            </div>
          )}

          {/* TAB: MEMORY (Structured Knowledge & Proactive Rules) */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <MemoryManager />
            </div>
          )}

          {/* TAB: PROJECTS (Synthesized Websites & Artifacts) */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <WebsiteView websites={websitesList} />
            </div>
          )}

          {/* TAB: INTEGRATIONS (Computer Clearance & External Tools) */}
          {activeTab === 'integrations' && (
            <div className="space-y-8">
              <PermissionsManager
                permissions={permissions}
                tools={tools}
                companion={companion}
                onUpdatePermission={handleUpdatePermission}
              />
              <IntegrationsView />
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <span>AURA System Settings</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Voice reactivity preferences, cognitive parameters, and sandbox security controls.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h4 className="font-bold text-sm text-white">Voice Output (TTS)</h4>
                    <p className="text-xs text-slate-400">Speak AURA responses using natural browser speech synthesis.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      isVoiceActive ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-900 border-white/10 text-slate-400'
                    }`}
                  >
                    {isVoiceActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h4 className="font-bold text-sm text-white">Particle Frequency Modulation</h4>
                    <p className="text-xs text-slate-400">Sample Web Audio AnalyserNode to pulsate orbital rings dynamically.</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800">
                    ONLINE
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h4 className="font-bold text-sm text-white">User Plan & Commercial Status</h4>
                    <p className="text-xs text-slate-400">Free open tier active. No restrictions or simulated locks.</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800">
                    ALL USERS FREE
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">Cloud Container Host</h4>
                    <p className="text-xs text-slate-400">{companion.hostname} ({companion.os})</p>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded-full border border-white/10">
                    v{companion.version}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OWNER (Restricted Panel) */}
          {activeTab === 'owner' && (
            <div className="space-y-6">
              <OwnerConsole
                currentUser={currentUser || {
                  id: 'owner-default',
                  name: 'Owner',
                  email: ownerEmail,
                  role: 'OWNER',
                  isOwner: true,
                  subscriptionPlan: 'ENTERPRISE',
                  subscriptionStatus: 'active',
                  createdAt: new Date().toISOString()
                }}
                onSwitchRole={(role) => handleSwitchRole(role === 'OWNER' ? 'OWNER' : 'FREE_USER')}
              />
            </div>
          )}
        </div>

        {/* Sticky Command Bar at the bottom (Available across other tabs) */}
        {activeTab !== 'aura' && (
          <div className="sticky bottom-0 pt-4 pb-3 px-4 sm:px-6 bg-gradient-to-t from-[#030509] via-[#030509]/95 to-transparent z-30">
            <AuraCommandBar
              onExecuteCommand={handleExecuteCommand}
              isExecuting={isExecuting}
              orbState={orbState}
              onMicToggle={handleToggleVoice}
              isListening={isListening}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
        ownerEmail={ownerEmail}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        user={currentUser}
        onPlanUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />
    </div>
  );
}
