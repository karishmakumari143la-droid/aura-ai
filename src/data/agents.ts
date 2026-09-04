import { SpecialistAgent } from '../types';

export const SPECIALIST_AGENTS: SpecialistAgent[] = [
  {
    id: 'ceo-orchestrator',
    name: 'Master Orchestrator',
    category: 'core',
    role: 'CEO & Chief Architect',
    description: 'Deconstructs high-level business intents, generates execution blueprints, and supervises sub-agents.',
    allowedTools: ['intent_parser', 'agent_router', 'task_planner', 'approval_gate', 'verification_engine'],
    status: 'idle',
    iconName: 'Cpu'
  },
  {
    id: 'website-agent',
    name: 'Website Builder Agent',
    category: 'development',
    role: 'Site Architect & Generator',
    description: 'Generates end-to-end responsive websites, templates, pricing tables, and WhatsApp integrations.',
    allowedTools: ['template_engine', 'component_builder', 'seo_meta_generator', 'html_compiler'],
    status: 'idle',
    iconName: 'Globe'
  },
  {
    id: 'frontend-agent',
    name: 'Frontend Agent',
    category: 'development',
    role: 'React & UI Engineer',
    description: 'Implements pixel-perfect user interfaces, Tailwind styling, reactive states, and micro-interactions.',
    allowedTools: ['react_scaffolder', 'tailwind_styler', 'motion_animator', 'state_manager'],
    status: 'idle',
    iconName: 'Layout'
  },
  {
    id: 'backend-agent',
    name: 'Backend Agent',
    category: 'development',
    role: 'API & Server Engineer',
    description: 'Configures secure REST endpoints, database queries, webhook listeners, and server logic.',
    allowedTools: ['api_route_generator', 'auth_enforcer', 'webhook_handler', 'middleware_setup'],
    status: 'idle',
    iconName: 'Server'
  },
  {
    id: 'ui-ux-agent',
    name: 'UI/UX Design Agent',
    category: 'core',
    role: 'Interface & Flow Specialist',
    description: 'Maintains design hierarchy, accessibility contrast, spatial balance, and user delight.',
    allowedTools: ['palette_generator', 'spatial_balancer', 'accessibility_checker'],
    status: 'idle',
    iconName: 'Sparkles'
  },
  {
    id: 'design-agent',
    name: 'Visual Design Agent',
    category: 'core',
    role: 'Brand & Asset Designer',
    description: 'Crafts visual identities, hero graphics, typography scales, and aesthetic tokens.',
    allowedTools: ['brand_synthesizer', 'asset_formatter', 'svg_generator'],
    status: 'idle',
    iconName: 'Palette'
  },
  {
    id: 'content-agent',
    name: 'Content & Copy Agent',
    category: 'marketing',
    role: 'Copywriter & Strategist',
    description: 'Produces high-converting headlines, sales copy, product descriptions, and value propositions.',
    allowedTools: ['copy_generator', 'headline_optimizer', 'tone_adapter'],
    status: 'idle',
    iconName: 'FileText'
  },
  {
    id: 'seo-agent',
    name: 'SEO Agent',
    category: 'marketing',
    role: 'Search Optimization Specialist',
    description: 'Generates structured JSON-LD data, OpenGraph cards, sitemaps, and keyword hierarchies.',
    allowedTools: ['json_ld_builder', 'meta_tagger', 'keyword_clusterer'],
    status: 'idle',
    iconName: 'Search'
  },
  {
    id: 'aeo-agent',
    name: 'AEO Agent',
    category: 'marketing',
    role: 'Answer Engine Optimizer',
    description: 'Optimizes content structure for Perplexity, ChatGPT search, Google SGE direct answer formats.',
    allowedTools: ['schema_faq_formatter', 'direct_answer_synthesizer'],
    status: 'idle',
    iconName: 'HelpCircle'
  },
  {
    id: 'geo-agent',
    name: 'GEO Agent',
    category: 'marketing',
    role: 'Generative Engine Optimizer',
    description: 'Calibrates brand authority, semantic citations, and entity co-occurrence for AI synthesis.',
    allowedTools: ['citation_grapher', 'entity_enricher'],
    status: 'idle',
    iconName: 'Compass'
  },
  {
    id: 'llmo-agent',
    name: 'LLMO Agent',
    category: 'marketing',
    role: 'LLM Visibility Specialist',
    description: 'Ensures structured facts, markdown readability, and retrieval compatibility for modern LLMs.',
    allowedTools: ['llm_context_structurer', 'rag_optimizer'],
    status: 'idle',
    iconName: 'Brain'
  },
  {
    id: 'marketing-agent',
    name: 'Growth & Marketing Agent',
    category: 'marketing',
    role: 'Campaign Architect',
    description: 'Designs go-to-market funnels, landing page conversion triggers, and promotional schedules.',
    allowedTools: ['campaign_planner', 'funnel_builder', 'cta_calibrator'],
    status: 'idle',
    iconName: 'TrendingUp'
  },
  {
    id: 'sales-agent',
    name: 'Sales & Pricing Agent',
    category: 'marketing',
    role: 'Revenue Strategist',
    description: 'Develops tier structures, pricing matrices, ROI calculators, and proposal frameworks.',
    allowedTools: ['pricing_calculator', 'proposal_generator', 'discount_matrix'],
    status: 'idle',
    iconName: 'DollarSign'
  },
  {
    id: 'client-agent',
    name: 'Client Relations Agent',
    category: 'operations',
    role: 'CRM & Account Director',
    description: 'Manages customer onboarding, client dossiers, feedback loops, and communication cadence.',
    allowedTools: ['crm_updater', 'onboarding_scripter', 'feedback_analyzer'],
    status: 'idle',
    iconName: 'Users'
  },
  {
    id: 'research-agent',
    name: 'Deep Research Agent',
    category: 'core',
    role: 'Market & Tech Analyst',
    description: 'Performs competitive intelligence, industry benchmarks, and technology evaluations.',
    allowedTools: ['web_search', 'document_synthesizer', 'matrix_comparer'],
    status: 'idle',
    iconName: 'BookOpen'
  },
  {
    id: 'automation-agent',
    name: 'Automation & n8n Agent',
    category: 'operations',
    role: 'Workflow Automator',
    description: 'Builds n8n workflow triggers, webhook payloads, notification bridges, and Zapier pipelines.',
    allowedTools: ['n8n_flow_builder', 'webhook_dispatcher', 'cron_scheduler'],
    status: 'idle',
    iconName: 'Zap'
  },
  {
    id: 'github-agent',
    name: 'GitHub Agent',
    category: 'development',
    role: 'Git & Repository Manager',
    description: 'Creates repositories, manages branches, stages files, generates commits, and opens PRs.',
    allowedTools: ['repo_creator', 'branch_manager', 'commit_pusher', 'pr_creator'],
    status: 'idle',
    iconName: 'GitBranch'
  },
  {
    id: 'qa-agent',
    name: 'QA & Verification Agent',
    category: 'quality',
    role: 'Quality Assurance Specialist',
    description: 'Validates site responsiveness, broken links, accessibility, console errors, and build health.',
    allowedTools: ['dom_linter', 'responsive_tester', 'link_validator', 'error_checker'],
    status: 'idle',
    iconName: 'CheckCircle2'
  },
  {
    id: 'security-agent',
    name: 'Security & Auth Agent',
    category: 'quality',
    role: 'Cybersecurity Architect',
    description: 'Inspects authorization rules, token confidentiality, injection vectors, and audit trails.',
    allowedTools: ['secret_scanner', 'rbac_auditor', 'csrf_shield'],
    status: 'idle',
    iconName: 'ShieldCheck'
  },
  {
    id: 'deployment-agent',
    name: 'DevOps & Deployment Agent',
    category: 'development',
    role: 'Cloud Release Engineer',
    description: 'Prepares production asset bundles, Cloud Run container specs, and custom domain routing.',
    allowedTools: ['bundle_analyzer', 'dockerfile_builder', 'domain_configurer'],
    status: 'idle',
    iconName: 'Rocket'
  },
  {
    id: 'data-agent',
    name: 'Data & Analytics Agent',
    category: 'operations',
    role: 'Data Pipeline Engineer',
    description: 'Aggregates usage telemetry, subscription metrics, operational logs, and revenue cohorts.',
    allowedTools: ['metrics_aggregator', 'telemetry_parser', 'export_formatter'],
    status: 'idle',
    iconName: 'BarChart3'
  }
];
