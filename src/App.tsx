import React, { useState, useEffect, useRef } from 'react';
import { AuraNavbar, AuraTab } from './components/aura/AuraNavbar';
import { AuraCore } from './components/aura/AuraCore';
import { AuraCommandBar } from './components/aura/AuraCommandBar';
import { AuraConversation, ChatMessage } from './components/aura/AuraConversation';
import { AuraUniverse } from './components/aura/AuraUniverse';
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
import { VoiceStudio } from './components/VoiceStudio';
import { 
  User, 
  AuraState, 
  WebsiteProject, 
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
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [pendingLandingPrompt, setPendingLandingPrompt] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState<boolean>(false);
  const [projectQuota, setProjectQuota] = useState<ProjectQuotaStatus | null>(null);
  
  // Execution & AI State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeExecution, setActiveExecution] = useState<any | null>(null);
  const [websitesList, setWebsitesList] = useState<WebsiteProject[]>([]);
  const [activeWebsite, setActiveWebsite] = useState<WebsiteProject | null>(null);
  const [showFullConversation, setShowFullConversation] = useState<boolean>(false);

  // Chat conversation stream
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Permissions & local companion
  const [permissions, setPermissions] = useState<ComputerPermissionConfig[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [companion, setCompanion] = useState({
    connected: false,
    version: '2.0.0-aura',
    os: 'Linux (Cloud Container Sandbox)',
    hostname: 'aura-node-primary'
  });

  // Natural Voice Assistant
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const commandInFlightRef = useRef(false);
  const voiceSessionEnabledRef = useRef(false);
  const voiceStartInFlightRef = useRef(false);
  const welcomeShownRef = useRef(false);

  // Initialize and fetch user session & state
  useEffect(() => {
    const authSuccess = new URLSearchParams(window.location.search).get('auth') === 'success';

    fetchSession().then((sessionUser) => {
      if (authSuccess && sessionUser) {
        setShowLanding(false);
        setActiveTab('aura');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setIsAuthOpen(false);

    if (!welcomeShownRef.current) {
      welcomeShownRef.current = true;
      const welcome = navigator.language.toLowerCase().startsWith('hi')
        ? 'Namaste! Welcome to AURA. Batao, aaj main tumhari kis kaam mein help karun?'
        : 'Welcome to AURA. I am ready to help. What would you like to work on?';
      setMessages([{ id: `welcome-${currentUser.id}`, sender: 'aura', text: welcome, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'completed' }]);
      speakAuraReply(welcome, 'IDLE', navigator.language.toLowerCase().startsWith('hi') ? 'hi' : 'en');
    }
    fetchWebsites();
    fetchPermissions();
    fetchTools();
    fetchProjectQuota();
  }, [currentUser]);

  const fetchSession = async (): Promise<User | null> => {
    try {
      const res = await fetch('/api/auth/me');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          if (data.ownerEmail) {
            setOwnerEmail(data.ownerEmail);
          }
          return data.user;
        }
        if (data.ownerEmail) {
          setOwnerEmail(data.ownerEmail);
        }
      }
    } catch (err) {
      console.error('Failed to fetch auth session:', err);
    }
    return null;
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

  ;

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

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/brain/permissions');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();

        if (data.permissions && typeof data.permissions === 'object') {
          const permissionMap = data.permissions as Record<string, string>;

          setPermissions(prev =>
            prev.map(permission => ({
              ...permission,
              state:
                permissionMap[permission.permission] === 'allow'
                  ? 'allowed'
                  : permissionMap[permission.permission] === 'deny'
                    ? 'denied'
                    : 'ask_each_time'
            }))
          );
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
      const brainState =
        state === 'allowed'
          ? 'allow'
          : state === 'denied'
            ? 'deny'
            : 'ask';

      const res = await fetch('/api/brain/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perm_key: permission,
          state: brainState
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        await res.json();
        await fetchPermissions();
      }
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const startVoiceSession = async () => {
    if (
      voiceStartInFlightRef.current ||
      isListening ||
      !voiceSessionEnabledRef.current ||
      commandInFlightRef.current ||
      speechService.isCurrentlySpeaking()
    ) {
      return;
    }

    voiceStartInFlightRef.current = true;
    setOrbState('LISTENING');
    setIsListening(true);

    const started = await speechService.startListening({
      onResult: (transcript, isFinal) => {
        if (!isFinal) return;

        setIsListening(false);

        if (transcript.trim()) {
          void handleExecuteCommand(transcript.trim());
        }
      },

      onError: (error) => {
        console.warn('Voice recognition error:', error);

        setIsListening(false);

        /*
         * Recognition errors such as no-speech are recoverable.
         * Only disable the persistent voice session when the browser
         * explicitly reports that speech recognition is unavailable.
         */
        const message = String(error || '').toLowerCase();

        if (
          message.includes('not-allowed') ||
          message.includes('service-not-allowed') ||
          message.includes('not supported')
        ) {
          voiceSessionEnabledRef.current = false;
          setIsVoiceActive(false);
          setOrbState('ERROR');
          return;
        }

        setOrbState('IDLE');
      },

      onEnd: () => {
        setIsListening(false);

        /*
         * SpeechRecognition naturally ends after silence in many
         * browsers. Keep the AURA voice session alive and restart
         * recognition when it is safe.
         */
        if (
          voiceSessionEnabledRef.current &&
          !commandInFlightRef.current &&
          !speechService.isCurrentlySpeaking()
        ) {
          window.setTimeout(() => {
            void startVoiceSession();
          }, 250);
        } else if (!commandInFlightRef.current) {
          setOrbState('IDLE');
        }
      }
    });

    voiceStartInFlightRef.current = false;

    if (started) {
      setIsVoiceActive(true);
      return;
    }

    setIsListening(false);
    setIsVoiceActive(false);
    setOrbState('ERROR');
  };

  /*
   * Voice is persistent after the user has enabled it once.
   * The navbar is now a status/navigation control, not an ON/OFF
   * microphone switch.
   */
  const handleToggleVoice = async () => {
    voiceSessionEnabledRef.current = true;

    if (
      !isListening &&
      !voiceStartInFlightRef.current &&
      !commandInFlightRef.current &&
      !speechService.isCurrentlySpeaking()
    ) {
      await startVoiceSession();
    }
  };

  const handleLogout = async () => {
    voiceSessionEnabledRef.current = false;
    speechService.stopListening();
    speechService.stopSpeaking();
    setIsListening(false);
    setIsVoiceActive(false);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCurrentUser(null);
    setMessages([]);
    welcomeShownRef.current = false;
    setOrbState('IDLE');
  };

  const speakAuraReply = (text: string, targetStateAfter: AuraState = 'IDLE', lang?: string) => {
    const spoken = speechService.speak(
      text,
      () => setOrbState('SPEAKING'),
      () => {
        setOrbState(targetStateAfter);
        if (voiceSessionEnabledRef.current && !commandInFlightRef.current) {
          void startVoiceSession();
        }
      },
      lang
    );
    if (!spoken) setOrbState('ERROR');
  };

  // Execute a natural command through the single AURA Cognitive Brain.
  // Conversation/question turns stay conversational; action requests are executed
  // by the Python Central Brain and return a truthful result.
  const handleExecuteCommand = async (command: string, files?: File[]) => {
    if (!command.trim() && (!files || files.length === 0)) return;
    if (commandInFlightRef.current) return;

    commandInFlightRef.current = true;

    const commandId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const userMsgId = `user-${Date.now()}`;
    const auraMsgId = `aura-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: command || (files?.length ? `Attached ${files.length} file${files.length > 1 ? 's' : ''}` : ''),
        timestamp
      }
    ]);

    setIsExecuting(true);
    setOrbState('UNDERSTANDING');

    try {
      /*
       * Brain turn currently accepts JSON.
       *
       * Preserve the attachment information in the request metadata without
       * pretending the files themselves were processed by the Brain. Actual
       * file-content execution will be wired through the secure server-side
       * upload bridge in the next migration phase.
       */
      const attachmentMetadata = (files || []).map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      }));

      const res = await fetch('/api/brain/turn', { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: command,
          session_id: `aura-${currentUser?.id || 'session'}`,
          interactive_confirm: true,
          idempotency_key: commandId,
          attachments: attachmentMetadata
        })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = (
        contentType.includes('application/json')
      ) ? await res.json() : null;

      if (!res.ok) {
        const errorText =
          data?.error ||
          data?.message ||
          `AURA Brain request failed (${res.status})`;

        throw new Error(errorText);
      }

      const responseText =
        data?.response ||
        data?.answer ||
        data?.message ||
        data?.summary ||
        data?.result?.response ||
        data?.result?.answer ||
        '';

      const intent = String(
        data?.intent ||
        data?.result?.intent ||
        ''
      ).toUpperCase();

      const execution = data?.execution || data?.result?.execution;
      const verification = data?.verification || data?.result?.verification;

      // Expose only the Brain's real execution/verification payload.
      // Never manufacture activity steps in the UI.
      const success =
        data?.success === true ||
        data?.result?.success === true ||
        execution?.success === true;

      if (intent === 'ACTION_REQUEST' && (execution || verification)) {
        setActiveExecution({
          execution: execution || null,
          verification: verification || null,
          success,
          intent
        });
      } else {
        setActiveExecution(null);
      }

      /*
       * The Brain is authoritative.
       * Do NOT manufacture a task/DAG/agent result when the Brain returned
       * a conversational or informational response.
       */
      if (responseText) {
        setMessages(prev => [
          ...prev,
          {
            id: auraMsgId,
            sender: 'aura',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            status: intent === 'ACTION_REQUEST' && !success
              ? 'executing'
              : 'completed'
          }
        ]);

        if (intent === 'ACTION_REQUEST') {
          if (success) {
            setOrbState('SUCCESS');
            fetchWebsites();
            fetchProjectQuota();
          } else if (data?.clarification_required) {
            setOrbState('WAITING');
          } else {
            setOrbState('ERROR');
          }
        } else {
          // CONVERSATION / QUESTION / FOLLOW_UP
          setOrbState('IDLE');
        }

        speakAuraReply(
          responseText,
          intent === 'ACTION_REQUEST' && success ? 'SUCCESS' : 'IDLE',
          data?.language || data?.result?.language
        );

        if (intent === 'ACTION_REQUEST' && success) {
          setTimeout(() => setOrbState('IDLE'), 3500);
        }
      } else {
        setOrbState('ERROR');

        setMessages(prev => [
          ...prev,
          {
            id: auraMsgId,
            sender: 'aura',
            text: 'AURA received no usable response from the cognitive core. No work was reported as completed.',
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            status: 'error'
          }
        ]);
      }

      /*
       * Keep these values intentionally unused for now.
       * They are retained here so the UI migration can expose verified
       * execution/verification details in the next phase without changing
       * the Brain contract again.
       */
      void execution;
      void verification;

    } catch (err) {
      console.error('AURA Brain error:', err);

      setOrbState('ERROR');

      const errorText = err instanceof Error
        ? err.message
        : 'AURA encountered an unexpected cognitive-core error.';

      setMessages(prev => [
        ...prev,
        {
          id: auraMsgId,
          sender: 'aura',
          text: `AURA could not complete this request: ${errorText}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          status: 'error'
        }
      ]);
    } finally {
      setIsExecuting(false);
      commandInFlightRef.current = false;
    }
  };

  if (showLanding) {
    return (
      <LandingPage
        onStartUsingAI={() => {
          setShowLanding(false);
          setIsAuthOpen(true);
        }}
        onPromptSelect={(prompt) => {
          setPendingLandingPrompt(prompt);
          setShowLanding(false);
          setIsAuthOpen(true);
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
        onLogout={handleLogout}
        isVoiceActive={isVoiceActive}
        onOpenLanding={() => setShowLanding(true)}
        quota={projectQuota}
        onOpenAllowanceModal={() => setIsAllowanceModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto">
        <div className={`${activeTab === 'aura' ? 'w-full px-0 py-0' : 'max-w-6xl mx-auto w-full px-4 sm:px-6 py-6'} flex-1 flex flex-col`}>

          {/* TAB: AURA (Core Living AI Entity & Command Cockpit) */}
          {activeTab === 'aura' && (
            <AuraUniverse
              state={orbState}
              messages={messages}
              quota={projectQuota}
              isExecuting={isExecuting}
              isListening={isListening}
              activeExecution={activeExecution}
              onExecuteCommand={handleExecuteCommand}
              onMicToggle={handleToggleVoice}
              onSelectTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* TAB: WORK — AURA execution activity */}
          {activeTab === 'work' && (
            <div className="space-y-6 max-w-5xl mx-auto w-full">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <span>AURA Activity</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real conversation, execution, verification, and recovery activity from the AURA cognitive core.
                </p>
              </div>

              <div className="rounded-3xl bg-slate-950/70 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Cognitive Activity
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      {isExecuting ? 'PROCESSING REQUEST' : 'READY'}
                    </p>
                  </div>

                  <div className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                    isExecuting
                      ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
                      : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                  }`}>
                    {isExecuting ? 'ACTIVE' : 'STANDBY'}
                  </div>
                </div>

                <div className="divide-y divide-white/5">
                  {messages.length === 0 ? (
                    <div className="p-10 text-center">
                      <Brain className="w-8 h-8 text-cyan-400 mx-auto mb-3 opacity-60" />
                      <p className="text-sm font-semibold text-white">
                        AURA is ready
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Start a conversation or give AURA something to work on.
                      </p>
                    </div>
                  ) : (
                    messages.slice(-20).map((message) => (
                      <div
                        key={message.id}
                        className="px-5 py-4 flex gap-4"
                      >
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          message.sender === 'aura'
                            ? 'bg-cyan-400'
                            : 'bg-slate-500'
                        }`} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                              {message.sender === 'aura' ? 'AURA' : 'YOU'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-600">
                              {message.timestamp}
                            </span>
                          </div>

                          <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">
                            {message.text}
                          </p>

                          {message.status && (
                            <span className="inline-block mt-2 text-[10px] font-mono uppercase text-slate-500">
                              {message.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <AutomationsView userId={currentUser?.id || "default_user"} />
            </div>
          )}

          {/* TAB: WORLD (2.5D Digital Workspace) */}
          {activeTab === 'world' && (
            <div className="space-y-6 max-w-5xl mx-auto w-full">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <span>AURA Workspace</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  AURA's current cognitive and execution environment.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-3xl bg-slate-950/70 border border-white/10 p-5">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Cognitive State</p>
                  <p className="text-lg font-bold text-cyan-300 mt-2">{orbState}</p>
                </div>

                <div className="rounded-3xl bg-slate-950/70 border border-white/10 p-5">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Execution</p>
                  <p className="text-lg font-bold text-white mt-2">
                    {isExecuting ? 'ACTIVE' : 'IDLE'}
                  </p>
                </div>

                <div className="rounded-3xl bg-slate-950/70 border border-white/10 p-5">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Companion</p>
                  <p className="text-lg font-bold text-white mt-2">
                    {companion.connected ? 'CONNECTED' : 'NOT CONFIGURED'}
                  </p>
                </div>
              </div>
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
              
              <VoiceStudio />
              
              </div>
            </div>
          )}

          {/* TAB: OWNER (Restricted Panel) */}
          {activeTab === 'owner' && currentUser && (
            <div className="space-y-6">
              <OwnerConsole
                currentUser={currentUser}
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
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
          setShowLanding(false);
          setActiveTab('aura');

          const prompt = pendingLandingPrompt;
          setPendingLandingPrompt(null);

          if (prompt) {
            setTimeout(() => {
              void handleExecuteCommand(prompt);
            }, 0);
          }
        }}
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
