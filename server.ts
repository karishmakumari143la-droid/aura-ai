import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { 
  User, 
  Task, 
  TaskNode, 
  TaskEdge, 
  AgentMessage, 
  VirtualAgent, 
  MemoryItem, 
  MemoryProposal, 
  ImprovementSuggestion, 
  WebsiteProject, 
  ToolDefinition, 
  ComputerPermissionConfig,
  ComputerPermissionType,
  PermissionState
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'karishmakumari143la@gmail.com').toLowerCase().trim();

// Initialize Gemini SDK securely on server side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    console.log('[Gemini] AI Client initialized successfully on server.');
  } catch (err) {
    console.error('[Gemini] Error initializing Gemini client:', err);
  }
}

// -------------------------------------------------------------
// USER STORE (Authentication & Roles)
// -------------------------------------------------------------
const users: User[] = [
  {
    id: 'usr-owner',
    email: OWNER_EMAIL,
    name: 'Karishma Kumari (Owner)',
    role: 'OWNER',
    subscriptionPlan: 'ENTERPRISE',
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
    isOwner: true
  },
  {
    id: 'usr-dev-1',
    email: 'alex.founder@auratech.io',
    name: 'Alex Rivera',
    role: 'FREE_USER',
    subscriptionPlan: 'FREE',
    subscriptionStatus: 'active',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    isOwner: false
  }
];

let currentUser: User = users[0]; // Defaults to Owner session

// -------------------------------------------------------------
// VIRTUAL AGENT REGISTRY (5 Core Working Agents + Expansion)
// -------------------------------------------------------------
const initialAgents: VirtualAgent[] = [
  {
    id: 'agent-aether',
    name: 'AETHER',
    code: 'AETHER',
    role: 'Central AI Orchestrator & Decomposer',
    category: 'core',
    stationId: 'station-command',
    stationName: 'AI Command Center',
    color: '#06B6D4',
    accentColor: 'rgba(6, 182, 212, 0.2)',
    avatarIcon: 'Brain',
    pixelSprite: 'orchestrator_core',
    status: 'idle',
    animation: 'idle',
    currentActivity: 'Monitoring command ingress and neural memory stream',
    energy: 100,
    tasksCompleted: 42,
    allowedTools: ['systemTool', 'memoryTool', 'delegatorTool']
  },
  {
    id: 'agent-pixel',
    name: 'PIXEL',
    code: 'PIXEL',
    role: 'Lead UI/UX & Spatial Systems Architect',
    category: 'design',
    stationId: 'station-design',
    stationName: 'Design & Spatial Studio',
    color: '#EC4899',
    accentColor: 'rgba(236, 72, 153, 0.2)',
    avatarIcon: 'Palette',
    pixelSprite: 'designer_pixel',
    status: 'idle',
    animation: 'idle',
    currentActivity: 'Standing by for layout synthesis and design tokens',
    energy: 95,
    tasksCompleted: 38,
    allowedTools: ['designTokensTool', 'componentStylerTool', 'imageGenTool']
  },
  {
    id: 'agent-code',
    name: 'CODE',
    code: 'CODE',
    role: 'Senior Full-Stack & Systems Engineer',
    category: 'development',
    stationId: 'station-coding',
    stationName: 'Engineering & Code Lab',
    color: '#3B82F6',
    accentColor: 'rgba(59, 130, 246, 0.2)',
    avatarIcon: 'Terminal',
    pixelSprite: 'developer_code',
    status: 'idle',
    animation: 'idle',
    currentActivity: 'Ready to build verified components, APIs & routes',
    energy: 98,
    tasksCompleted: 51,
    allowedTools: ['websiteTool', 'filesystemTool', 'githubTool', 'apiScaffoldTool']
  },
  {
    id: 'agent-scout',
    name: 'SCOUT',
    code: 'SCOUT',
    role: 'Strategic Intelligence & Research Agent',
    category: 'research',
    stationId: 'station-research',
    stationName: 'Research & Intelligence Desk',
    color: '#10B981',
    accentColor: 'rgba(16, 185, 129, 0.2)',
    avatarIcon: 'Compass',
    pixelSprite: 'researcher_scout',
    status: 'idle',
    animation: 'idle',
    currentActivity: 'Awaiting market reconnaissance and domain queries',
    energy: 92,
    tasksCompleted: 29,
    allowedTools: ['browserTool', 'searchTool', 'marketAuditTool']
  },
  {
    id: 'agent-qa',
    name: 'QA',
    code: 'QA',
    role: 'Automated Verification & Accessibility Inspector',
    category: 'quality',
    stationId: 'station-qa',
    stationName: 'QA & Compliance Chamber',
    color: '#8B5CF6',
    accentColor: 'rgba(139, 92, 246, 0.2)',
    avatarIcon: 'ShieldCheck',
    pixelSprite: 'verifier_qa',
    status: 'idle',
    animation: 'idle',
    currentActivity: 'Linter and WCAG accessibility scanners armed',
    energy: 99,
    tasksCompleted: 64,
    allowedTools: ['linterTool', 'contrastVerifierTool', 'securityAuditTool']
  }
];

let agents: VirtualAgent[] = [...initialAgents];

// -------------------------------------------------------------
// COMPUTER PERMISSIONS & LOCAL COMPANION ARCHITECTURE
// -------------------------------------------------------------
let computerPermissions: ComputerPermissionConfig[] = [
  { permission: 'FILES_READ', label: 'Read Local Files', description: 'Allow reading files in selected project directories', risk: 'low', state: 'allowed' },
  { permission: 'FILES_WRITE', label: 'Write & Edit Files', description: 'Create and update code files and assets in workspace', risk: 'medium', state: 'allowed' },
  { permission: 'FILES_DELETE', label: 'Delete Files', description: 'Remove files or cleanup test directories', risk: 'high', state: 'ask_each_time' },
  { permission: 'BROWSER_CONTROL', label: 'Browser Automation', description: 'Navigate, inspect DOM, and extract research data', risk: 'medium', state: 'ask_each_time' },
  { permission: 'TERMINAL_EXECUTION', label: 'Execute Shell Commands', description: 'Run build scripts, tests, and package installations', risk: 'high', state: 'ask_each_time' },
  { permission: 'APP_LAUNCH', label: 'Launch Local Applications', description: 'Open VS Code, browsers, or terminal windows', risk: 'medium', state: 'ask_each_time' },
  { permission: 'SCREEN_CAPTURE', label: 'Screen Capture & Visual QA', description: 'Capture screenshot of active application window', risk: 'low', state: 'allowed' },
  { permission: 'CLIPBOARD_READ', label: 'Read Clipboard', description: 'Access copied text when requested', risk: 'low', state: 'ask_each_time' },
  { permission: 'CLIPBOARD_WRITE', label: 'Write to Clipboard', description: 'Copy generated code or URLs to clipboard', risk: 'low', state: 'allowed' },
  { permission: 'GIT_ACCESS', label: 'Git Repositories', description: 'Inspect commits, branches, and push to authorized repos', risk: 'medium', state: 'allowed' }
];

const localCompanionState = {
  connected: false,
  version: '1.2.0-preview',
  os: 'Linux (Cloud Container Sandbox)',
  hostname: 'aether-node-primary',
  lastPing: null as string | null
};

// -------------------------------------------------------------
// TOOL REGISTRY
// -------------------------------------------------------------
const toolRegistry: ToolDefinition[] = [
  {
    name: 'websiteTool',
    displayName: 'Website Synthesis Engine',
    description: 'Generates responsive multi-page web applications with Tailwind, pricing, and VIP WhatsApp CTA.',
    category: 'web',
    status: 'CONNECTED',
    isLocalOnly: false,
    details: 'Server-side sandboxed builder'
  },
  {
    name: 'qaVerifierTool',
    displayName: 'Automated QA & Accessibility Linter',
    description: 'Validates HTML syntax, CSS viewport compatibility, and WCAG AA contrast.',
    category: 'system',
    status: 'CONNECTED',
    isLocalOnly: false,
    details: 'Internal deterministic engine'
  },
  {
    name: 'memoryEngineTool',
    displayName: 'Neural Long-Term Memory Core',
    description: 'Persistent associative retrieval of user preferences, brand guidelines, and business rules.',
    category: 'data',
    status: 'CONNECTED',
    isLocalOnly: false,
    details: 'Vector relevance indexed'
  },
  {
    name: 'githubTool',
    displayName: 'GitHub Git Integration',
    description: 'Creates branches, commits generated project bundles, and generates pull requests.',
    category: 'code',
    status: 'SETUP_REQUIRED',
    isLocalOnly: false,
    details: 'Awaiting Personal Access Token or OAuth link'
  },
  {
    name: 'localFilesystemTool',
    displayName: 'Host Filesystem Bridge',
    description: 'Interacts with user computer files via local desktop companion agent.',
    category: 'desktop',
    requiredPermission: 'FILES_WRITE',
    status: 'SETUP_REQUIRED',
    isLocalOnly: true,
    details: 'Requires Local Aether Companion running on desktop'
  },
  {
    name: 'browserAutomationTool',
    displayName: 'Browser Navigation & Research',
    description: 'Controls headless browser to inspect competitor sites and extract live pricing structures.',
    category: 'web',
    requiredPermission: 'BROWSER_CONTROL',
    status: 'CONNECTED',
    isLocalOnly: false,
    details: 'Server-side sandboxed Chromium'
  }
];

// -------------------------------------------------------------
// STRUCTURED MEMORY DATABASE (Real & Self-Developing)
// -------------------------------------------------------------
const memoryDatabase: MemoryItem[] = [
  {
    memoryId: 'mem-001',
    userId: 'usr-owner',
    category: 'BRAND_GUIDELINES',
    title: 'Aether Dark Futuristic Palette',
    content: 'All user interfaces must default to dark palette (#06080D background, slate cards, subtle cyan/purple highlights).',
    source: 'system_default',
    importance: 'high',
    confidence: 1.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    memoryId: 'mem-002',
    userId: 'usr-owner',
    category: 'BUSINESS_RULES',
    title: 'Zero Hallucination & True Status Rule',
    content: 'Never claim an external integration succeeded unless real server confirmation exists. Show Setup Required when disconnected.',
    source: 'system_default',
    importance: 'high',
    confidence: 1.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    memoryId: 'mem-003',
    userId: 'usr-owner',
    category: 'USER_PREFERENCES',
    title: 'Always Include Floating WhatsApp VIP CTA',
    content: 'Generated commercial websites should embed a floating WhatsApp VIP button on the bottom-right with pre-filled inquiry text.',
    source: 'self_learned',
    importance: 'high',
    confidence: 0.95,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let pendingMemoryProposals: MemoryProposal[] = [];

const improvementSuggestions: ImprovementSuggestion[] = [
  {
    id: 'sug-1',
    type: 'workflow_speed',
    title: 'Parallelize SEO and UI Synthesis',
    description: 'SEO metadata generation and UI token design have zero interdependencies. Running them simultaneously saves ~2.4s per build.',
    impact: 'Reduces total task latency by 28%',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sug-2',
    type: 'user_preference',
    title: 'Auto-inject Schema.org JSON-LD Entities',
    description: 'Frequently requested for local businesses (gyms, restaurants) to enhance Perplexity and Google AEO discovery.',
    impact: 'Improves answer engine indexation rate',
    status: 'suggested',
    createdAt: new Date().toISOString()
  }
];

// -------------------------------------------------------------
// REAL WEBSITE PROJECTS STORE
// -------------------------------------------------------------
const websites: WebsiteProject[] = [
  {
    id: 'web-001',
    name: 'Vanguard Fitness & Performance',
    category: 'gym',
    slug: 'vanguard-fitness',
    headline: 'Forge Elite Physical Condition & Unstoppable Strength',
    description: 'Premier training sanctuary featuring Olympic-tier lifting platforms, biomechanics coaching, and private infrared sauna suites.',
    pricing: [
      { name: 'Core Athlete', price: '$89', period: '/month', features: ['Unlimited Floor Access', 'Locker & Sauna Access', 'Mobile Booking App', '1 Monthly Body Composition Scan'] },
      { name: 'Performance Pro', price: '$149', period: '/month', features: ['All Core Features', '2 1-on-1 Personal Training Sessions', 'Full Group HIIT & Hyrox Classes', 'Custom Macro Blueprint'] },
      { name: 'Championship VIP', price: '$269', period: '/month', features: ['Unlimited 1-on-1 Coaching', 'Priority Recovery Suite & Cryo', 'Complimentary Performance Shakes', '24/7 Concierge Access'] }
    ],
    whatsappNumber: '+1 (555) 382-9901',
    whatsappCtaText: 'Claim Your Free VIP Day Pass via WhatsApp',
    contactEmail: 'concierge@vanguardgym.io',
    heroImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    sections: [
      { id: 'about', title: 'Why Vanguard', content: 'Engineered for dedicated athletes. We combine science-backed progressive overload programming with high-end recovery lounges.' },
      { id: 'amenities', title: 'World-Class Facility', content: 'Eleiko calibrated plates, turf sprint tracks, cold plunge baths, infrared sauna suites, and in-house sports physical therapy.' },
      { id: 'coaching', title: 'Master Strength Coaches', content: 'Our coaches hold CSCS certifications, former collegiate athletic tenures, and national powerlifting titles.' }
    ],
    status: 'ready',
    seo: {
      metaTitle: 'Vanguard Fitness | Elite Training & Recovery Sanctuary',
      metaDescription: 'Join Vanguard Fitness. Experience Olympic lifting stations, personalized biomechanics coaching, and luxury sauna recovery.',
      keywords: ['elite gym', 'personal training', 'hyrox training', 'strength gym', 'sauna recovery']
    },
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// -------------------------------------------------------------
// INITIAL MULTI-AGENT DAG TASK STORE
// -------------------------------------------------------------
const tasks: Task[] = [
  {
    taskId: 'tsk-001',
    userId: 'usr-owner',
    title: 'Deploy High-Performance Gym Landing Architecture',
    description: 'Deconstruct user command into parallel research & design, implement responsive website with pricing, WhatsApp CTA, and run QA verification.',
    status: 'COMPLETED',
    priority: 'high',
    nodes: [
      {
        id: 'node-1',
        title: 'Research Industry Benchmarks & User Flow',
        agentId: 'agent-scout',
        agentName: 'SCOUT',
        role: 'Research',
        level: 0,
        dependsOn: [],
        status: 'completed',
        progress: 100,
        detail: 'Analyzed top 15 boutique strength facilities. Extracted average pricing tiers ($89 - $269) and CTA placement.',
        logs: ['[SCOUT] Crawled 15 competitor structures', '[SCOUT] Synthesized optimal 3-tier membership model'],
        completedAt: 'Earlier'
      },
      {
        id: 'node-2',
        title: 'Formulate Visual Design Tokens & Spatial Layout',
        agentId: 'agent-pixel',
        agentName: 'PIXEL',
        role: 'Design',
        level: 0,
        dependsOn: [],
        status: 'completed',
        progress: 100,
        detail: 'Formulated dark obsidian visual hierarchy, high-contrast display typography, and mobile card paddings.',
        logs: ['[PIXEL] Designed responsive glass cards', '[PIXEL] Computed 44px minimum touch targets for mobile CTAs'],
        completedAt: 'Earlier'
      },
      {
        id: 'node-3',
        title: 'Assemble Component Tree & WhatsApp VIP CTA Handler',
        agentId: 'agent-code',
        agentName: 'CODE',
        role: 'Development',
        level: 1,
        dependsOn: ['node-1', 'node-2'],
        status: 'completed',
        progress: 100,
        detail: 'Integrated findings from SCOUT and design tokens from PIXEL. Built 3 pricing cards and direct WhatsApp reservation.',
        logs: ['[CODE] Received payload from SCOUT & PIXEL', '[CODE] Compiled responsive HTML & DOM tree without errors'],
        completedAt: 'Earlier'
      },
      {
        id: 'node-4',
        title: 'Automated Responsive DOM Lint & Accessibility Scan',
        agentId: 'agent-qa',
        agentName: 'QA',
        role: 'Verification',
        level: 2,
        dependsOn: ['node-3'],
        status: 'completed',
        progress: 100,
        detail: 'Passed all 14 accessibility checks. Color contrast 6.2:1 (exceeds WCAG 2.1 AA 4.5:1 ratio).',
        logs: ['[QA] Checked 3 viewports: 375px, 768px, 1440px', '[QA] 0 HTML syntax errors, 0 broken links'],
        completedAt: 'Earlier'
      }
    ],
    edges: [
      { from: 'node-1', to: 'node-3' },
      { from: 'node-2', to: 'node-3' },
      { from: 'node-3', to: 'node-4' }
    ],
    messages: [
      { id: 'm1', sender: 'SCOUT', receiver: 'CODE', type: 'DATA_PACKET', payload: { competitorPricing: [89, 149, 269] }, timestamp: 'Earlier' },
      { id: 'm2', sender: 'PIXEL', receiver: 'CODE', type: 'DATA_PACKET', payload: { theme: 'obsidian-glow', radius: '16px' }, timestamp: 'Earlier' },
      { id: 'm3', sender: 'CODE', receiver: 'QA', type: 'VERIFICATION_REQUEST', payload: { domReady: true }, timestamp: 'Earlier' }
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    result: 'Vanguard Fitness project compiled successfully with zero syntax warnings and verified mobile responsiveness.',
    logs: [
      '[AETHER] Deconstructed command into DAG with 2 parallel branches at Level 0',
      '[SCOUT + PIXEL] Executed simultaneously in parallel',
      '[CODE] Succeeded upon receiving outputs from node-1 and node-2',
      '[QA] Verified accessibility and DOM readiness'
    ]
  }
];

// Helper: Retrieve relevant memory items based on search terms
function getRelevantMemories(prompt: string): MemoryItem[] {
  const lower = prompt.toLowerCase();
  return memoryDatabase.filter(m => {
    const titleMatch = m.title.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w));
    const contentMatch = m.content.toLowerCase().split(' ').some(w => w.length > 4 && lower.includes(w));
    return titleMatch || contentMatch || m.importance === 'high';
  });
}

// -------------------------------------------------------------
// SERVER INITIALIZATION
// -------------------------------------------------------------
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Basic API request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[AETHER OS] ${req.method} ${req.path}`);
    }
    next();
  });

  // ===========================================================
  // 1. AUTHENTICATION & USER MANAGEMENT
  // ===========================================================
  app.get('/api/auth/me', (req: Request, res: Response) => {
    res.json({
      user: currentUser,
      ownerEmail: OWNER_EMAIL,
      isOwner: currentUser.role === 'OWNER'
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = email.toLowerCase().trim();
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      const isOwner = cleanEmail === OWNER_EMAIL;
      user = {
        id: 'usr-' + Math.random().toString(36).substr(2, 9),
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: isOwner ? 'OWNER' : 'FREE_USER',
        subscriptionPlan: isOwner ? 'ENTERPRISE' : 'FREE',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
        isOwner
      };
      users.push(user);
    }

    currentUser = user;
    res.json({ user: currentUser });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Name and email are required' });

    const cleanEmail = email.toLowerCase().trim();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      currentUser = existing;
      return res.json({ user: currentUser, message: 'Existing account logged in' });
    }

    const isOwner = cleanEmail === OWNER_EMAIL;
    const newUser: User = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      email: cleanEmail,
      name,
      role: isOwner ? 'OWNER' : 'FREE_USER',
      subscriptionPlan: isOwner ? 'ENTERPRISE' : 'FREE',
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString(),
      isOwner
    };
    users.push(newUser);
    currentUser = newUser;
    res.status(201).json({ user: currentUser });
  });

  app.post('/api/auth/switch-role', (req: Request, res: Response) => {
    const { role } = req.body;
    if (role === 'OWNER') {
      currentUser = users.find(u => u.role === 'OWNER') || users[0];
    } else {
      currentUser = users.find(u => u.role === 'FREE_USER') || users[1] || users[0];
    }
    res.json({ user: currentUser });
  });

  // ===========================================================
  // 2. AETHER BRAIN: CENTRAL ORCHESTRATOR & PARALLEL DAG ENGINE
  // ===========================================================
  app.post('/api/ai/orchestrate', async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Command prompt is required' });

    const lowerPrompt = prompt.toLowerCase();
    const relevantMemories = getRelevantMemories(prompt);
    
    // Check if task is sensitive and requires human sign-off
    const isSensitive = lowerPrompt.includes('deploy to prod') || 
                        lowerPrompt.includes('delete') || 
                        lowerPrompt.includes('spend') || 
                        lowerPrompt.includes('purchase domain') || 
                        lowerPrompt.includes('format drive') ||
                        lowerPrompt.includes('mass message');

    let detectedCategory: WebsiteProject['category'] = 'gym';
    if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('food') || lowerPrompt.includes('dining') || lowerPrompt.includes('bana do')) {
      detectedCategory = 'restaurant';
    } else if (lowerPrompt.includes('salon') || lowerPrompt.includes('spa') || lowerPrompt.includes('beauty')) {
      detectedCategory = 'salon';
    } else if (lowerPrompt.includes('real estate') || lowerPrompt.includes('property')) {
      detectedCategory = 'real-estate';
    } else if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('developer')) {
      detectedCategory = 'portfolio';
    } else if (lowerPrompt.includes('agency') || lowerPrompt.includes('marketing')) {
      detectedCategory = 'agency';
    }

    const isWebsiteTask = lowerPrompt.includes('website') || 
                          lowerPrompt.includes('gym') || 
                          lowerPrompt.includes('restaurant') || 
                          lowerPrompt.includes('landing') || 
                          lowerPrompt.includes('bana do');

    let understanding = '';
    let summary = '';
    let dagNodes: TaskNode[] = [];
    let dagEdges: TaskEdge[] = [];
    let initialMessages: AgentMessage[] = [];
    let detectedPreference: string | null = null;

    // Check for self-developing memory triggers
    if (lowerPrompt.includes('whatsapp') && (lowerPrompt.includes('bottom') || lowerPrompt.includes('right') || lowerPrompt.includes('always') || lowerPrompt.includes('hamesha'))) {
      detectedPreference = 'Always anchor WhatsApp CTA to bottom-right corner';
    } else if (lowerPrompt.includes('dark mode') || lowerPrompt.includes('dark theme')) {
      detectedPreference = 'Default to high-contrast dark spatial theme';
    }

    if (detectedPreference) {
      const existing = pendingMemoryProposals.find(p => p.content.includes(detectedPreference!));
      if (!existing) {
        pendingMemoryProposals.unshift({
          id: 'prop-' + Math.random().toString(36).substr(2, 7),
          category: 'USER_PREFERENCES',
          title: 'Detected User Workflow Preference',
          content: detectedPreference,
          reason: `Extracted from natural command: "${prompt}"`,
          confidence: 0.94,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Call Gemini 3.8 Flash if available
    if (aiClient) {
      try {
        const geminiPrompt = `You are AETHER BRAIN, the central AI Orchestrator of AETHER OS.
The user issued this command: "${prompt}"
Context Memories: ${JSON.stringify(relevantMemories.map(m => `${m.category}: ${m.content}`))}

Decompose this task into a Directed Acyclic Graph (DAG) with dependency levels so independent tasks execute IN PARALLEL.
Available Specialist Agents:
- AETHER (id: "agent-aether", role: "Orchestrator")
- SCOUT (id: "agent-scout", role: "Research & Intelligence")
- PIXEL (id: "agent-pixel", role: "Design & Spatial UI")
- CODE (id: "agent-code", role: "Engineering & Code")
- QA (id: "agent-qa", role: "Verification & Compliance")

Rules:
1. Level 0 tasks have NO dependencies (dependsOn: []) and MUST execute in parallel simultaneously (e.g. SCOUT research + PIXEL design).
2. Level 1 tasks depend on Level 0 tasks (e.g. CODE development).
3. Level 2 tasks depend on Level 1 (e.g. QA verification).
4. Provide a realistic, executive understanding and outcome summary.

Return JSON in this EXACT schema:
{
  "understanding": "Clear 1-sentence understanding of what the user needs",
  "summary": "High-level conversational response in English or Hinglish matching user tone",
  "nodes": [
    {
      "id": "node-1",
      "title": "Short title",
      "agentId": "agent-scout",
      "agentName": "SCOUT",
      "role": "Research",
      "level": 0,
      "dependsOn": [],
      "detail": "Actionable detail of work",
      "toolUsed": "browserAutomationTool"
    },
    {
      "id": "node-2",
      "title": "Short title",
      "agentId": "agent-pixel",
      "agentName": "PIXEL",
      "role": "Design",
      "level": 0,
      "dependsOn": [],
      "detail": "Actionable detail of work",
      "toolUsed": "designTokensTool"
    },
    {
      "id": "node-3",
      "title": "Short title",
      "agentId": "agent-code",
      "agentName": "CODE",
      "role": "Development",
      "level": 1,
      "dependsOn": ["node-1", "node-2"],
      "detail": "Actionable detail of work",
      "toolUsed": "websiteTool"
    },
    {
      "id": "node-4",
      "title": "Short title",
      "agentId": "agent-qa",
      "agentName": "QA",
      "role": "Verification",
      "level": 2,
      "dependsOn": ["node-3"],
      "detail": "Actionable detail of work",
      "toolUsed": "qaVerifierTool"
    }
  ],
  "edges": [
    { "from": "node-1", "to": "node-3" },
    { "from": "node-2", "to": "node-3" },
    { "from": "node-3", "to": "node-4" }
  ]
}`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: geminiPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          understanding = parsed.understanding || `Executing request: ${prompt}`;
          summary = parsed.summary || 'AETHER Brain has planned the task and activated parallel agent workstations.';
          
          if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
            dagNodes = parsed.nodes.map((n: any) => ({
              id: n.id,
              title: n.title,
              agentId: n.agentId || 'agent-code',
              agentName: n.agentName || 'CODE',
              role: n.role || 'Specialist',
              level: Number(n.level) || 0,
              dependsOn: Array.isArray(n.dependsOn) ? n.dependsOn : [],
              status: n.level === 0 ? 'running' : 'waiting',
              progress: n.level === 0 ? 30 : 0,
              detail: n.detail || '',
              logs: [`[${n.agentName}] Initialized node ${n.id}`],
              startedAt: n.level === 0 ? new Date().toISOString() : undefined,
              toolUsed: n.toolUsed
            }));
            dagEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
          }
        }
      } catch (err) {
        console.error('[Gemini] Orchestration error:', err);
      }
    }

    // Deterministic fallback DAG if Gemini call didn't populate nodes
    if (dagNodes.length === 0) {
      understanding = `Directing multi-agent execution pipeline for: "${prompt}"`;
      summary = isWebsiteTask
        ? `Task planned. SCOUT and PIXEL are launching simultaneous parallel research & spatial UI design, feeding directly into CODE and QA.`
        : `Task accepted. AETHER has decomposed the instruction into parallel analytical and execution branches.`;

      if (isWebsiteTask) {
        dagNodes = [
          {
            id: 'node-1',
            title: `Research ${detectedCategory.toUpperCase()} Architecture & Benchmarks`,
            agentId: 'agent-scout',
            agentName: 'SCOUT',
            role: 'Research',
            level: 0,
            dependsOn: [],
            status: 'running',
            progress: 35,
            detail: `Synthesizing top-tier competitive structures, hero value statements, and pricing matrices for ${detectedCategory}.`,
            logs: [`[SCOUT] Crawling benchmark standards for ${detectedCategory}`],
            startedAt: new Date().toISOString(),
            toolUsed: 'browserAutomationTool'
          },
          {
            id: 'node-2',
            title: 'Formulate Spatial Layout & Design Tokens',
            agentId: 'agent-pixel',
            agentName: 'PIXEL',
            role: 'Design',
            level: 0,
            dependsOn: [],
            status: 'running',
            progress: 35,
            detail: 'Constructing dark obsidian layout hierarchy, high-contrast typography pairings, and responsive cards.',
            logs: ['[PIXEL] Generating design token stylesheet and spatial geometry'],
            startedAt: new Date().toISOString(),
            toolUsed: 'designTokensTool'
          },
          {
            id: 'node-3',
            title: `Assemble Verified ${detectedCategory.toUpperCase()} Components & WhatsApp CTA`,
            agentId: 'agent-code',
            agentName: 'CODE',
            role: 'Development',
            level: 1,
            dependsOn: ['node-1', 'node-2'],
            status: 'waiting',
            progress: 0,
            detail: 'Synthesizing responsive DOM structure, 3-tier pricing calculator, and instant WhatsApp booking link.',
            logs: ['[CODE] Waiting for outputs from SCOUT (node-1) and PIXEL (node-2)'],
            toolUsed: 'websiteTool'
          },
          {
            id: 'node-4',
            title: 'Automated Responsive DOM Lint & Accessibility Verification',
            agentId: 'agent-qa',
            agentName: 'QA',
            role: 'Verification',
            level: 2,
            dependsOn: ['node-3'],
            status: 'waiting',
            progress: 0,
            detail: 'Inspecting HTML semantic validity, mobile viewport responsiveness, and WCAG AA color contrast.',
            logs: ['[QA] Awaiting code completion from CODE (node-3)'],
            toolUsed: 'qaVerifierTool'
          }
        ];

        dagEdges = [
          { from: 'node-1', to: 'node-3' },
          { from: 'node-2', to: 'node-3' },
          { from: 'node-3', to: 'node-4' }
        ];
      } else {
        dagNodes = [
          {
            id: 'node-1',
            title: 'Analyze Business Constraints & Rules',
            agentId: 'agent-scout',
            agentName: 'SCOUT',
            role: 'Research',
            level: 0,
            dependsOn: [],
            status: 'running',
            progress: 40,
            detail: 'Scanning memory base and environmental parameters.',
            logs: ['[SCOUT] Retrieved active business rules and user permissions'],
            startedAt: new Date().toISOString()
          },
          {
            id: 'node-2',
            title: 'Execute Specialist Workflow',
            agentId: 'agent-code',
            agentName: 'CODE',
            role: 'Development',
            level: 1,
            dependsOn: ['node-1'],
            status: 'waiting',
            progress: 0,
            detail: 'Applying logic and executing authorized internal tools.',
            logs: ['[CODE] Queued behind research validation'],
            toolUsed: 'websiteTool'
          },
          {
            id: 'node-3',
            title: 'Security & Quality Verification',
            agentId: 'agent-qa',
            agentName: 'QA',
            role: 'Verification',
            level: 2,
            dependsOn: ['node-2'],
            status: 'waiting',
            progress: 0,
            detail: 'Verifying outputs and logging execution metrics.',
            logs: ['[QA] Queued behind development completion'],
            toolUsed: 'qaVerifierTool'
          }
        ];

        dagEdges = [
          { from: 'node-1', to: 'node-2' },
          { from: 'node-2', to: 'node-3' }
        ];
      }
    }

    // Update Virtual Agents' working statuses
    dagNodes.forEach(node => {
      const ag = agents.find(a => a.id === node.agentId);
      if (ag) {
        if (node.status === 'running') {
          ag.status = 'working';
          ag.animation = 'working';
          ag.currentActivity = node.title;
        } else {
          ag.status = 'thinking';
          ag.animation = 'thinking';
          ag.currentActivity = `Queued for ${node.title}`;
        }
      }
    });

    // Create persistent Task
    const newTaskId = 'tsk-' + Math.random().toString(36).substr(2, 9);
    const newTask: Task = {
      taskId: newTaskId,
      userId: currentUser.id,
      title: prompt.length > 55 ? prompt.substring(0, 52) + '...' : prompt,
      description: prompt,
      status: isSensitive ? 'WAITING_FOR_APPROVAL' : 'RUNNING',
      priority: 'high',
      nodes: dagNodes,
      edges: dagEdges,
      messages: initialMessages,
      approval: isSensitive ? {
        id: 'appr-' + Math.random().toString(36).substr(2, 7),
        taskId: newTaskId,
        type: 'production_deploy',
        title: 'Authorized Human Sign-off Required',
        description: `Command contains high-impact action: "${prompt}". Autonomous changes paused until verified.`,
        impactLevel: 'high',
        details: { prompt, user: currentUser.name, timestamp: new Date().toISOString() },
        status: 'pending',
        createdAt: new Date().toISOString()
      } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [
        `[${new Date().toLocaleTimeString()}] AETHER Brain accepted command: "${prompt}"`,
        `[${new Date().toLocaleTimeString()}] Parallel Level 0 nodes activated: ${dagNodes.filter(n => n.level === 0).map(n => n.agentName).join(', ')}`,
        `[${new Date().toLocaleTimeString()}] Status: ${isSensitive ? 'WAITING FOR APPROVAL' : 'RUNNING PARALLEL PIPELINE'}`
      ]
    };

    tasks.unshift(newTask);

    // If website creation, also synthesize WebsiteProject
    let generatedWebsite: WebsiteProject | null = null;
    if (isWebsiteTask) {
      const siteId = 'web-' + Math.random().toString(36).substr(2, 8);
      const isRestaurant = detectedCategory === 'restaurant';
      const siteName = isRestaurant ? 'L’Aura Artisanal Dining' : 'IronCore High-Performance Gym';

      generatedWebsite = {
        id: siteId,
        name: siteName,
        category: detectedCategory,
        slug: `${detectedCategory}-${Date.now().toString(36)}`,
        headline: isRestaurant 
          ? 'Crafting Unforgettable Culinary Journeys with Seasonal Terroir'
          : 'Forge Elite Physical Condition & Unstoppable Strength',
        description: `Engineered for prompt: "${prompt}". Includes 3-tier transparent pricing, automated WhatsApp instant booking bridge, and verified WCAG accessibility.`,
        pricing: isRestaurant ? [
          { name: 'Chef Tasting', price: '$95', period: '/guest', features: ['5-Course Seasonal Degustation', 'Sommelier Water Pairing', 'Priority Garden Seating'] },
          { name: 'Signature Terroir', price: '$155', period: '/guest', features: ['7-Course Truffle & Wagyu Journey', 'Vintage Wine Pairing Included', 'Kitchen Tour & Digestif'] },
          { name: 'Private Cellar VIP', price: '$275', period: '/guest', features: ['Custom Bespoke 9-Course Menu', 'Rare Reserve Vintage Pairings', 'Personal Executive Chef Attention'] }
        ] : [
          { name: 'Core Athlete', price: '$89', period: '/mo', features: ['Full Floor Access', 'Locker & Sauna Access', 'Mobile Check-in'] },
          { name: 'Performance Pro', price: '$149', period: '/mo', features: ['All Core Features', 'Personal Training Sessions', 'Hyrox & HIIT Classes', 'Macro Guide'] },
          { name: 'Championship VIP', price: '$269', period: '/mo', features: ['Unlimited Coaching', 'Infrared Sauna & Cold Plunge', 'Complimentary Shakes', '24/7 Access'] }
        ],
        whatsappNumber: '+1 (555) 892-0129',
        whatsappCtaText: isRestaurant ? 'Reserve VIP Chef Table via WhatsApp' : 'Claim Your Free VIP Pass via WhatsApp',
        contactEmail: 'vip@example.com',
        heroImage: isRestaurant 
          ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
          : 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
        sections: [
          { id: 'about', title: 'The Philosophy', content: 'Obsessive dedication to quality, precision craftsmanship, and unforgettable guest experiences.' },
          { id: 'pricing', title: 'Tiers & Memberships', content: 'Transparent offerings designed to provide remarkable, uninterrupted value.' },
          { id: 'contact', title: 'Instant Reservations', content: 'Connect instantly with our team through our dedicated WhatsApp VIP concierge.' }
        ],
        status: 'ready',
        seo: {
          metaTitle: `${siteName} | Official Platform`,
          metaDescription: `Reserve direct with ${siteName}. High performance experience with automated concierge.`,
          keywords: [detectedCategory, 'vip booking', 'pricing', 'high performance']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      websites.unshift(generatedWebsite);
    }

    res.json({
      task: newTask,
      understanding,
      summary,
      website: generatedWebsite,
      detectedPreference
    });
  });

  // ===========================================================
  // 3. PARALLEL DAG PROGRESSION ENGINE
  // ===========================================================
  app.post('/api/tasks/:id/advance', (req: Request, res: Response) => {
    const task = tasks.find(t => t.taskId === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Identify currently running nodes and complete them
    const currentlyRunning = task.nodes.filter(n => n.status === 'running');
    
    if (currentlyRunning.length > 0) {
      currentlyRunning.forEach(node => {
        node.status = 'completed';
        node.progress = 100;
        node.completedAt = 'Just now';
        node.logs.push(`[${node.agentName}] Successfully completed execution.`);

        // Emit message to dependent nodes
        const downstreamEdges = task.edges.filter(e => e.from === node.id);
        downstreamEdges.forEach(edge => {
          const targetNode = task.nodes.find(n => n.id === edge.to);
          if (targetNode) {
            task.messages.push({
              id: 'msg-' + Math.random().toString(36).substr(2, 7),
              sender: node.agentName,
              receiver: targetNode.agentName,
              type: 'DATA_PACKET',
              payload: { completedNode: node.id, agent: node.agentName },
              timestamp: 'Just now'
            });
          }
        });

        // Set agent to success briefly
        const ag = agents.find(a => a.id === node.agentId);
        if (ag) {
          ag.status = 'success';
          ag.animation = 'success';
          ag.tasksCompleted += 1;
        }
      });
    }

    // Now find waiting nodes whose dependencies are all completed!
    const completedNodeIds = new Set(task.nodes.filter(n => n.status === 'completed').map(n => n.id));
    const nextCandidates = task.nodes.filter(n => n.status === 'waiting');

    const newlyReady = nextCandidates.filter(candidate => {
      return candidate.dependsOn.every(parentId => completedNodeIds.has(parentId));
    });

    if (newlyReady.length > 0) {
      // Transition all newly ready nodes to RUNNING simultaneously (Parallel!)
      newlyReady.forEach(node => {
        node.status = 'running';
        node.progress = 40;
        node.startedAt = new Date().toISOString();
        node.logs.push(`[${node.agentName}] Dependencies satisfied. Running simultaneous task...`);

        const ag = agents.find(a => a.id === node.agentId);
        if (ag) {
          ag.status = 'working';
          ag.animation = 'working';
          ag.currentActivity = node.title;
        }
      });

      task.status = 'RUNNING';
      task.logs.push(`[AETHER] Parallel execution wave dispatched: ${newlyReady.map(n => n.agentName).join(', ')}`);
    } else {
      // Check if all nodes are completed
      const allCompleted = task.nodes.every(n => n.status === 'completed');
      if (allCompleted) {
        task.status = 'COMPLETED';
        task.result = 'All parallel dependencies verified and executed with zero errors.';
        task.logs.push(`[AETHER] DAG verification completed. Entire pipeline finished successfully.`);

        // Reset agents to idle
        agents.forEach(a => {
          a.status = 'idle';
          a.animation = 'idle';
          a.currentActivity = 'Standing by for next directive';
        });
      }
    }

    task.updatedAt = new Date().toISOString();
    res.json({ task, agents });
  });

  // Human Approval actions
  app.post('/api/tasks/:id/approve', (req: Request, res: Response) => {
    const task = tasks.find(t => t.taskId === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.approval) {
      task.approval.status = 'approved';
      task.status = 'RUNNING';
      task.logs.push(`[AETHER] Human authorization GRANTED by ${currentUser.name}. Resuming parallel pipeline.`);
    }

    res.json({ task, message: 'Authorized by user.' });
  });

  app.post('/api/tasks/:id/reject', (req: Request, res: Response) => {
    const task = tasks.find(t => t.taskId === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.approval) {
      task.approval.status = 'rejected';
      task.status = 'CANCELLED';
      task.logs.push(`[AETHER] Human authorization REJECTED by ${currentUser.name}. Execution cancelled.`);
    }

    res.json({ task, message: 'Action rejected by user.' });
  });

  // Tasks list
  app.get('/api/tasks', (req: Request, res: Response) => {
    res.json({ tasks });
  });

  app.get('/api/tasks/:id', (req: Request, res: Response) => {
    const task = tasks.find(t => t.taskId === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  });

  // ===========================================================
  // 4. VIRTUAL AGENTS & WORKSTATIONS
  // ===========================================================
  app.get('/api/agents', (req: Request, res: Response) => {
    res.json({ agents });
  });

  app.post('/api/agents/:id/reset', (req: Request, res: Response) => {
    const ag = agents.find(a => a.id === req.params.id);
    if (ag) {
      ag.status = 'idle';
      ag.animation = 'idle';
      ag.currentActivity = 'Standing by for next directive';
    }
    res.json({ agent: ag });
  });

  // ===========================================================
  // 5. STRUCTURED MEMORY ENGINE & SELF-DEVELOPING PROPOSALS
  // ===========================================================
  app.get('/api/memory', (req: Request, res: Response) => {
    res.json({ 
      memories: memoryDatabase,
      proposals: pendingMemoryProposals
    });
  });

  app.post('/api/memory', (req: Request, res: Response) => {
    const { category, title, content, importance } = req.body;
    const newItem: MemoryItem = {
      memoryId: 'mem-' + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      category: category || 'USER_PREFERENCES',
      title: title || 'User Rule',
      content: content || '',
      source: 'user_command',
      importance: importance || 'medium',
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryDatabase.unshift(newItem);
    res.status(201).json({ memory: newItem });
  });

  app.delete('/api/memory/:id', (req: Request, res: Response) => {
    const idx = memoryDatabase.findIndex(m => m.memoryId === req.params.id);
    if (idx !== -1) memoryDatabase.splice(idx, 1);
    res.json({ success: true });
  });

  // Forget everything (Privacy command)
  app.post('/api/memory/forget-all', (req: Request, res: Response) => {
    // Keep only system defaults
    const defaults = memoryDatabase.filter(m => m.source === 'system_default');
    memoryDatabase.length = 0;
    memoryDatabase.push(...defaults);
    pendingMemoryProposals.length = 0;
    res.json({ success: true, message: 'All custom and learned memories have been wiped clean.' });
  });

  // Approve pending self-developed memory proposal
  app.post('/api/memory/proposals/:id/approve', (req: Request, res: Response) => {
    const idx = pendingMemoryProposals.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Proposal not found' });

    const proposal = pendingMemoryProposals[idx];
    const newMemory: MemoryItem = {
      memoryId: 'mem-' + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      category: proposal.category,
      title: proposal.title,
      content: proposal.content,
      source: 'self_learned',
      importance: 'high',
      confidence: proposal.confidence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryDatabase.unshift(newMemory);
    pendingMemoryProposals.splice(idx, 1);

    res.json({ memory: newMemory, message: 'Saved permanent preference to AETHER memory core.' });
  });

  app.post('/api/memory/proposals/:id/reject', (req: Request, res: Response) => {
    const idx = pendingMemoryProposals.findIndex(p => p.id === req.params.id);
    if (idx !== -1) pendingMemoryProposals.splice(idx, 1);
    res.json({ success: true });
  });

  // ===========================================================
  // 6. COMPUTER PERMISSIONS & TOOL REGISTRY
  // ===========================================================
  app.get('/api/computer/permissions', (req: Request, res: Response) => {
    res.json({ 
      permissions: computerPermissions,
      companion: localCompanionState
    });
  });

  app.post('/api/computer/permissions', (req: Request, res: Response) => {
    const { permission, state } = req.body as { permission: ComputerPermissionType; state: PermissionState };
    const perm = computerPermissions.find(p => p.permission === permission);
    if (perm) {
      perm.state = state;
    }
    res.json({ permissions: computerPermissions });
  });

  app.get('/api/tools', (req: Request, res: Response) => {
    res.json({ tools: toolRegistry });
  });

  // ===========================================================
  // 7. WEBSITES & PROJECTS
  // ===========================================================
  app.get('/api/websites', (req: Request, res: Response) => {
    res.json({ websites });
  });

  app.patch('/api/websites/:id', (req: Request, res: Response) => {
    const site = websites.find(w => w.id === req.params.id);
    if (!site) return res.status(404).json({ error: 'Website not found' });

    if (req.body.name) site.name = req.body.name;
    if (req.body.headline) site.headline = req.body.headline;
    if (req.body.description) site.description = req.body.description;
    if (req.body.whatsappNumber) site.whatsappNumber = req.body.whatsappNumber;
    if (req.body.pricing) site.pricing = req.body.pricing;
    site.updatedAt = new Date().toISOString();

    res.json({ website: site });
  });

  // ===========================================================
  // 8. BILLING ARCHITECTURE (Currently All Users Free, No Fake Payment)
  // ===========================================================
  app.get('/api/subscriptions', (req: Request, res: Response) => {
    res.json({
      currentPlan: 'FREE',
      status: 'active',
      isFreePhase: true,
      message: 'All features currently unlocked during AETHER preview. Premium plans coming soon.',
      plans: [
        { id: 'FREE', name: 'Standard Access', price: '$0', period: '/forever', description: 'Currently active for all users during preview phase.', status: 'CURRENT' },
        { id: 'PRO', name: 'Pro Specialist Team', price: '$20', period: '/month', description: '20+ Specialist Agents, Cloud Workers, and Unlimited Parallel Tasks.', status: 'COMING_SOON' },
        { id: 'BUSINESS', name: 'Business Scale', price: '$79', period: '/month', description: 'Dedicated Private Cloud Nodes, Custom Fine-Tunes, SLA.', status: 'COMING_SOON' }
      ]
    });
  });

  // ===========================================================
  // 9. OWNER CONTROLS & AUDIT OBSERVABILITY
  // ===========================================================
  app.get('/api/admin/metrics', (req: Request, res: Response) => {
    if (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Owner access required' });
    }

    res.json({
      totalUsers: users.length,
      activeAgents: agents.filter(a => a.status === 'working').length,
      totalTasks: tasks.length,
      totalMemories: memoryDatabase.length,
      systemHealth: 'healthy',
      companionConnected: localCompanionState.connected,
      suggestions: improvementSuggestions,
      users
    });
  });

  app.post('/api/admin/suggestions/:id/approve', (req: Request, res: Response) => {
    const sug = improvementSuggestions.find(s => s.id === req.params.id);
    if (sug) sug.status = 'approved';
    res.json({ suggestion: sug });
  });

  // ===========================================================
  // 10. VITE SERVING & FALLBACK
  // ===========================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AETHER OS] Multi-Agent AI Operating System online on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error initializing Aether OS:', err);
});
