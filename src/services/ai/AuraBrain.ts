import { Task, TaskNode, TaskEdge, AgentMessage, AuraState, StepStatus } from '../../types';
import { agentRegistry } from '../../agents/AgentRegistry';

export interface DataPacketEvent {
  id: string;
  fromAgent: string;
  toAgent: string;
  dataSummary: string;
  timestamp: string;
}

export interface AuraBrainResult {
  responseSummary: string;
  task: Task;
  suggestedMemoryProposal?: {
    category: any;
    title: string;
    content: string;
    reason: string;
  };
}

class AuraBrainService {
  /**
   * Understand, Plan & Decompose high-level user command into a topological DAG
   */
  public planCommand(command: string): Task {
    const taskId = `task_${Date.now()}`;
    const lower = command.toLowerCase();

    // Determine domain category & structure
    const isWebsite = lower.includes('site') || lower.includes('web') || lower.includes('gym') || lower.includes('restaurant') || lower.includes('portfolio') || lower.includes('landing');
    const isAutomation = lower.includes('automate') || lower.includes('webhook') || lower.includes('lead') || lower.includes('crm') || lower.includes('n8n');
    const isAudit = lower.includes('permission') || lower.includes('audit') || lower.includes('security') || lower.includes('desktop');

    let nodes: TaskNode[] = [];
    let edges: TaskEdge[] = [];

    if (isWebsite) {
      // Parallel Level 0: SCOUT (Research) & PIXEL (Design) run concurrently!
      // Level 1: CODE (Engineer frontend & WhatsApp booking)
      // Level 2: QA (Accessibility & Cross-device testing)
      // Level 3: WEB (Production compiler & export ready)
      nodes = [
        {
          id: 'node_scout_research',
          title: 'Domain & Competitive Research',
          agentId: 'scout',
          agentName: 'SCOUT',
          role: 'Deep Research Specialist',
          level: 0,
          dependsOn: [],
          status: 'pending',
          progress: 0,
          detail: 'Analyzing competitive positioning, target demographic expectations, and key conversion triggers.',
          logs: []
        },
        {
          id: 'node_pixel_design',
          title: 'Design System & Spatial Wireframe',
          agentId: 'pixel',
          agentName: 'PIXEL',
          role: 'UI/UX Visual Architect',
          level: 0,
          dependsOn: [],
          status: 'pending',
          progress: 0,
          detail: 'Formulating obsidian dark palette, 1.333 typography scale, and responsive grid geometry.',
          logs: []
        },
        {
          id: 'node_code_build',
          title: 'Full-Stack Assembly & WhatsApp Direct Concierge',
          agentId: 'code',
          agentName: 'CODE',
          role: 'Engineering Lead',
          level: 1,
          dependsOn: ['node_scout_research', 'node_pixel_design'],
          status: 'pending',
          progress: 0,
          detail: 'Synthesizing responsive React/HTML code, tiered pricing tables, and floating VIP booking action.',
          logs: []
        },
        {
          id: 'node_qa_verify',
          title: 'Quality & Accessibility Audit',
          agentId: 'qa',
          agentName: 'QA',
          role: 'Compliance & Verification',
          level: 2,
          dependsOn: ['node_code_build'],
          status: 'pending',
          progress: 0,
          detail: 'Scanning WCAG AA contrast ratio, 44px touch targets, responsive viewports, and zero console warnings.',
          logs: []
        },
        {
          id: 'node_web_finalize',
          title: 'Production Artifact Synthesis',
          agentId: 'web',
          agentName: 'WEB',
          role: 'Site Synthesizer',
          level: 3,
          dependsOn: ['node_qa_verify'],
          status: 'pending',
          progress: 0,
          detail: 'Compiling standalone HTML artifact with AEO structured JSON-LD data.',
          logs: []
        }
      ];

      edges = [
        { from: 'node_scout_research', to: 'node_code_build' },
        { from: 'node_pixel_design', to: 'node_code_build' },
        { from: 'node_code_build', to: 'node_qa_verify' },
        { from: 'node_qa_verify', to: 'node_web_finalize' }
      ];
    } else if (isAutomation) {
      nodes = [
        {
          id: 'node_scout_schema',
          title: 'Webhook & Schema Discovery',
          agentId: 'scout',
          agentName: 'SCOUT',
          role: 'Integration Specialist',
          level: 0,
          dependsOn: [],
          status: 'pending',
          progress: 0,
          detail: 'Verifying n8n endpoint schema, headers, and authentication parameters.',
          logs: []
        },
        {
          id: 'node_auto_configure',
          title: 'Pipeline Automation Builder',
          agentId: 'automation',
          agentName: 'AUTOMATION',
          role: 'Workflow Specialist',
          level: 1,
          dependsOn: ['node_scout_schema'],
          status: 'pending',
          progress: 0,
          detail: 'Configuring multi-step webhook trigger, exponential backoff retries, and data mapping.',
          logs: []
        },
        {
          id: 'node_qa_test',
          title: 'End-to-End Simulation & Verification',
          agentId: 'qa',
          agentName: 'QA',
          role: 'QA Auditor',
          level: 2,
          dependsOn: ['node_auto_configure'],
          status: 'pending',
          progress: 0,
          detail: 'Simulating mock lead payloads and verifying delivery handshake.',
          logs: []
        }
      ];

      edges = [
        { from: 'node_scout_schema', to: 'node_auto_configure' },
        { from: 'node_auto_configure', to: 'node_qa_test' }
      ];
    } else {
      // General task
      nodes = [
        {
          id: 'node_aura_plan',
          title: 'Cognitive Strategy & Context Retrieval',
          agentId: 'aura',
          agentName: 'AURA',
          role: 'Master Orchestrator',
          level: 0,
          dependsOn: [],
          status: 'pending',
          progress: 0,
          detail: `Deconstructing prompt: "${command}" and retrieving relevant user preferences.`,
          logs: []
        },
        {
          id: 'node_scout_exec',
          title: 'Contextual Research & Verification',
          agentId: 'scout',
          agentName: 'SCOUT',
          role: 'Researcher',
          level: 1,
          dependsOn: ['node_aura_plan'],
          status: 'pending',
          progress: 0,
          detail: 'Synthesizing relevant reference data and system clearance.',
          logs: []
        },
        {
          id: 'node_code_deliver',
          title: 'Execution & Synthesis',
          agentId: 'code',
          agentName: 'CODE',
          role: 'Engineer',
          level: 2,
          dependsOn: ['node_scout_exec'],
          status: 'pending',
          progress: 0,
          detail: 'Packaging final response and verified outputs.',
          logs: []
        }
      ];

      edges = [
        { from: 'node_aura_plan', to: 'node_scout_exec' },
        { from: 'node_scout_exec', to: 'node_code_deliver' }
      ];
    }

    const task: Task = {
      taskId,
      userId: 'user_active',
      title: command.length > 55 ? `${command.slice(0, 52)}...` : command,
      description: command,
      status: 'PLANNING',
      priority: 'high',
      nodes,
      edges,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [`AURA Brain initialized DAG workflow with ${nodes.length} nodes.`]
    };

    return task;
  }

  /**
   * Check for recurring instructions and suggest structured memory additions
   */
  public checkForProactiveMemoryProposal(command: string): {
    category: any;
    title: string;
    content: string;
    reason: string;
  } | undefined {
    const lower = command.toLowerCase();
    if (lower.includes('dark') || lower.includes('theme') || lower.includes('obsidian')) {
      return {
        category: 'BRAND_GUIDELINES',
        title: 'Obsidian Deep Space UI Style',
        content: 'Default to obsidian dark canvas (#030509), electric cyan accents (#38BDF8), and high-contrast WCAG AA typography.',
        reason: 'You frequently specify deep space dark themes for your generated interfaces.'
      };
    }
    if (lower.includes('whatsapp') || lower.includes('booking') || lower.includes('vip')) {
      return {
        category: 'BUSINESS_RULES',
        title: 'WhatsApp VIP Concierge Integration',
        content: 'Embed floating WhatsApp quick-booking action in bottom-right corner (+1 555-0199) on all conversion pages.',
        reason: 'Detected repeated request to include direct WhatsApp concierge conversion channels.'
      };
    }
    return undefined;
  }
}

export const auraBrain = new AuraBrainService();
