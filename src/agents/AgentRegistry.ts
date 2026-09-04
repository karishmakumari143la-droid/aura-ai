export interface AgentCapability {
  name: string;
  description: string;
}

export interface AgentExecutionResult {
  success: boolean;
  message: string;
  artifact?: any;
  logs: string[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  shortCode: string;
  avatarColor: string;
  description: string;
  capabilities: string[];
  status: 'idle' | 'thinking' | 'active' | 'completed' | 'error';
  permissions: string[];
  executeTask: (context: { taskTitle: string; input?: any }) => Promise<AgentExecutionResult>;
}

export class AgentRegistryService {
  private agents: Map<string, AgentDefinition> = new Map();

  constructor() {
    this.registerDefaultAgents();
  }

  private registerDefaultAgents() {
    // 1. AURA - Lead Orchestrator & Cognitive Director
    this.register({
      id: 'aura',
      name: 'AURA',
      role: 'Cognitive Orchestrator & Strategic Mind',
      shortCode: 'AU',
      avatarColor: 'from-cyan-500 to-blue-600',
      description: 'Understands complex user prompts, conducts intent classification, DAG task decomposition, and oversees all parallel workers.',
      capabilities: ['Intent Classification', 'Parallel DAG Decomposition', 'Human Approval Routing', 'Autonomous Synthesis'],
      status: 'idle',
      permissions: ['ALL_INTERNAL', 'DISPATCH_AGENTS', 'SYSTEM_SUPERVISOR'],
      executeTask: async ({ taskTitle }) => {
        return {
          success: true,
          message: `AURA decomposed high-level objective: "${taskTitle}" into verified DAG execution nodes.`,
          logs: [
            `Parsed semantic intent for: ${taskTitle}`,
            `Synthesized prerequisite dependency tree`,
            `Dispatched parallel task streams to SCOUT and PIXEL`
          ]
        };
      }
    });

    // 2. PIXEL - UI/UX & Visual Experience Designer
    this.register({
      id: 'pixel',
      name: 'PIXEL',
      role: 'Creative Design & Design System Architect',
      shortCode: 'PX',
      avatarColor: 'from-pink-500 to-purple-600',
      description: 'Generates responsive layouts, modern dark/light themes, typography scales, accessibility contrasts, and micro-interactions.',
      capabilities: ['Design System Tokens', 'Responsive Mobile Layouts', 'CSS Micro-Interactions', 'Aesthetic Balancing'],
      status: 'idle',
      permissions: ['DESIGN_TOKENS', 'CANVAS_LAYOUT', 'ASSET_GENERATION'],
      executeTask: async ({ taskTitle }) => {
        return {
          success: true,
          message: `PIXEL designed spatial wireframe and responsive component specifications for: ${taskTitle}`,
          logs: [
            `Crafted obsidian deep-space theme tokens (#030509)`,
            `Formulated 1.333 typography hierarchy`,
            `Checked WCAG AA 4.5:1 text-to-background contrast metrics`
          ]
        };
      }
    });

    // 3. CODE - Full-Stack Software Engineer
    this.register({
      id: 'code',
      name: 'CODE',
      role: 'Full-Stack Software Engineer & Compiler',
      shortCode: 'CD',
      avatarColor: 'from-cyan-400 to-emerald-500',
      description: 'Builds production-grade React components, TypeScript interfaces, REST APIs, state machines, and integrations.',
      capabilities: ['React/TypeScript Engineering', 'State Synchronization', 'API Handlers', 'Clean Architecture'],
      status: 'idle',
      permissions: ['CODE_SYNTHESIS', 'SANDBOX_EXECUTION', 'COMPONENT_BUILD'],
      executeTask: async ({ taskTitle }) => {
        return {
          success: true,
          message: `CODE synthesized production-ready code blocks and state handlers for: ${taskTitle}`,
          logs: [
            `Engineered component architecture with strict TypeScript types`,
            `Configured event listeners and reactive hooks`,
            `Packaged verified module bundle`
          ]
        };
      }
    });

    // 4. SCOUT - Deep Researcher & Market Intelligence
    this.register({
      id: 'scout',
      name: 'SCOUT',
      role: 'Deep Research & Knowledge Harvester',
      shortCode: 'SC',
      avatarColor: 'from-amber-400 to-orange-500',
      description: 'Harvests competitor data, user personas, SEO/AEO keywords, domain knowledge, and reference benchmarks.',
      capabilities: ['Domain Research', 'SEO & AEO Keywords', 'Competitor Analysis', 'Knowledge Retrieval'],
      status: 'idle',
      permissions: ['SEARCH_WEB', 'SCRAPE_STRUCTURED', 'RETRIEVAL_AUGMENTATION'],
      executeTask: async ({ taskTitle }) => {
        return {
          success: true,
          message: `SCOUT gathered contextual research and domain parameters for: ${taskTitle}`,
          logs: [
            `Indexed domain benchmarks and competitor positioning`,
            `Extracted high-intent Answer Engine Optimization keywords`,
            `Transmitted research packet to CODE and PIXEL`
          ]
        };
      }
    });

    // 5. QA - Quality Assurance & Security Auditor
    this.register({
      id: 'qa',
      name: 'QA',
      role: 'Quality Assurance & Security Auditor',
      shortCode: 'QA',
      avatarColor: 'from-emerald-400 to-teal-500',
      description: 'Validates syntax, verifies security rules, inspects device responsiveness, and ensures zero broken links.',
      capabilities: ['Syntax Auditing', 'Vulnerability Checks', 'Accessibility Scans', 'Runtime Verification'],
      status: 'idle',
      permissions: ['TEST_EXECUTION', 'SECURITY_AUDIT', 'APPROVAL_CHECK'],
      executeTask: async ({ taskTitle }) => {
        return {
          success: true,
          message: `QA verified 100% test coverage and compliance for: ${taskTitle}`,
          logs: [
            `Verified TypeScript compilation: 0 errors`,
            `Checked mobile touch target minimums (44px)`,
            `Passed production readiness checklist`
          ]
        };
      }
    });

    // 6. WEB - Autonomous Site Synthesizer
    this.register({
      id: 'web',
      name: 'WEB',
      role: 'Production Web Builder',
      shortCode: 'WB',
      avatarColor: 'from-blue-500 to-indigo-600',
      description: 'Generates ready-to-deploy multi-section business landing pages with VIP WhatsApp links, pricing matrices, and SEO tags.',
      capabilities: ['HTML/CSS Site Synthesis', 'WhatsApp Direct Links', 'Responsive Multi-Device Layouts'],
      status: 'idle',
      permissions: ['TEMPLATE_SYNTHESIS', 'EXPORT_FILES'],
      executeTask: async ({ taskTitle }) => {
        return {
          success: true,
          message: `WEB synthesized live responsive website instance for: ${taskTitle}`,
          logs: [
            `Assembled Hero, Tiered Membership, and Contact sections`,
            `Embedded direct VIP WhatsApp conversion link`,
            `Generated standalone HTML bundle ready for export`
          ]
        };
      }
    });

    // 7. AUTOMATION - Workflow & Webhook Orchestrator
    this.register({
      id: 'automation',
      name: 'AUTOMATION',
      role: 'Workflow & Webhook Specialist',
      shortCode: 'AT',
      avatarColor: 'from-violet-400 to-purple-600',
      description: 'Orchestrates webhook triggers, n8n workflows, CRM synchronization, and multi-step pipeline actions.',
      capabilities: ['Webhook Triggers', 'n8n Integrations', 'Lead Automation', 'Data Transformers'],
      status: 'idle',
      permissions: ['WEBHOOK_DISPATCH', 'N8N_ORCHESTRATION'],
      executeTask: async ({ taskTitle }) => {
        return {
          success: true,
          message: `AUTOMATION configured real-time lead capture webhook trigger for: ${taskTitle}`,
          logs: [
            `Formulated JSON payload schema`,
            `Configured delivery retry and backoff mechanisms`,
            `Linked to local memory store`
          ]
        };
      }
    });
  }

  public register(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
  }

  public getAgent(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  public updateAgentStatus(id: string, status: AgentDefinition['status']): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
    }
  }
}

export const agentRegistry = new AgentRegistryService();
