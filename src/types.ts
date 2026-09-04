export type UserRole = 'OWNER' | 'ADMIN' | 'PAID_USER' | 'FREE_USER';

export type SubscriptionPlan = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'canceled';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  avatarUrl?: string;
  isOwner?: boolean;
}

export type AIOrbState = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'UNDERSTANDING'
  | 'THINKING' 
  | 'PLANNING' 
  | 'SPEAKING'
  | 'WORKING'
  | 'EXECUTING' 
  | 'COMMUNICATING' 
  | 'LEARNING'
  | 'EMPATHY'
  | 'VERIFYING' 
  | 'SUCCESS' 
  | 'ERROR'
  | 'WAITING';

export type AuraState = AIOrbState;

export type UserEmotion = 
  | 'CALM' 
  | 'HAPPY' 
  | 'EXCITED' 
  | 'CONFUSED' 
  | 'STRESSED' 
  | 'SAD' 
  | 'FRUSTRATED' 
  | 'URGENT' 
  | 'FOCUSED' 
  | 'NEUTRAL';

export type TaskStatus = 
  | 'QUEUED'
  | 'PLANNING' 
  | 'RUNNING' 
  | 'WAITING'
  | 'WAITING_FOR_APPROVAL' 
  | 'VERIFYING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export type StepStatus = 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'waiting_approval';

export interface TaskStep {
  id: string;
  title: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  detail?: string;
  logs?: string[];
  completedAt?: string;
  outputArtifact?: {
    type: 'website' | 'code' | 'file' | 'pr' | 'automation' | 'lead';
    data: any;
  };
}

export interface SpecialistAgent {
  id: string;
  name: string;
  category: 'core' | 'development' | 'marketing' | 'operations' | 'quality';
  role: string;
  description: string;
  allowedTools: string[];
  status: 'idle' | 'active' | 'executing' | 'completed' | 'error';
  iconName: string;
}

export interface TaskNode {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  role: string;
  level: number; // 0, 1, 2... for topological execution level
  dependsOn: string[]; // parent node IDs
  status: StepStatus;
  progress: number; // 0 to 100
  detail: string;
  logs: string[];
  output?: any;
  startedAt?: string;
  completedAt?: string;
  toolUsed?: string;
}

export interface TaskEdge {
  from: string;
  to: string;
}

export interface AgentMessage {
  id: string;
  sender: string;
  receiver: string;
  type: 'TASK_ASSIGN' | 'TASK_RESULT' | 'DATA_PACKET' | 'VERIFICATION_REQUEST' | 'APPROVAL_REQUEST';
  payload: any;
  timestamp: string;
}

export interface HumanApproval {
  id: string;
  taskId: string;
  type: 'spending' | 'domain_purchase' | 'mass_message' | 'data_deletion' | 'sensitive_publish' | 'github_push' | 'production_deploy';
  title: string;
  description: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Task {
  taskId: string;
  userId: string;
  projectId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  nodes: TaskNode[];
  edges: TaskEdge[];
  messages: AgentMessage[];
  approval?: HumanApproval;
  createdAt: string;
  updatedAt: string;
  result?: string;
  error?: string;
  logs: string[];
}

export type AgentAnimationState = 'idle' | 'walking' | 'typing' | 'thinking' | 'working' | 'success' | 'error';

export interface VirtualAgent {
  id: string;
  name: string;
  code: string;
  role: string;
  category: 'core' | 'development' | 'design' | 'research' | 'quality' | 'operations' | 'marketing';
  stationId: string;
  stationName: string;
  color: string;
  accentColor: string;
  avatarIcon: string;
  pixelSprite: string; // identifier for visual sprite
  status: 'idle' | 'thinking' | 'working' | 'communicating' | 'success' | 'error';
  animation: AgentAnimationState;
  currentActivity: string;
  currentTaskTitle?: string;
  energy: number; // 0-100
  tasksCompleted: number;
  allowedTools: string[];
}

export interface Workstation {
  id: string;
  name: string;
  category: string;
  agentId: string;
  gridX: number;
  gridY: number;
  active: boolean;
  color: string;
}

export type ComputerPermissionType = 
  | 'FILES_READ'
  | 'FILES_WRITE'
  | 'FILES_DELETE'
  | 'BROWSER_CONTROL'
  | 'TERMINAL_EXECUTION'
  | 'APP_LAUNCH'
  | 'SCREEN_CAPTURE'
  | 'CLIPBOARD_READ'
  | 'CLIPBOARD_WRITE'
  | 'GIT_ACCESS';

export type PermissionState = 'allowed' | 'denied' | 'ask_each_time';

export interface ComputerPermissionConfig {
  permission: ComputerPermissionType;
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  state: PermissionState;
}

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  category: 'system' | 'web' | 'code' | 'desktop' | 'data';
  requiredPermission?: ComputerPermissionType;
  status: 'CONNECTED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SETUP_REQUIRED' | 'PERMISSION_REQUIRED';
  isLocalOnly: boolean;
  details?: string;
}

export interface WebsiteProject {
  id: string;
  name: string;
  category: 'gym' | 'restaurant' | 'salon' | 'real-estate' | 'portfolio' | 'agency' | 'ecommerce';
  slug: string;
  headline: string;
  description: string;
  pricing: Array<{ name: string; price: string; period: string; features: string[] }>;
  whatsappNumber?: string;
  whatsappCtaText?: string;
  contactEmail?: string;
  heroImage?: string;
  sections: Array<{ id: string; title: string; content: string }>;
  githubRepo?: string;
  deployedUrl?: string;
  status: 'draft' | 'ready' | 'deployed';
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  generatedHtml?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MemoryCategory = 
  | 'USER_PREFERENCES' 
  | 'BUSINESS_RULES' 
  | 'BRAND_GUIDELINES' 
  | 'PROJECTS' 
  | 'CLIENTS' 
  | 'TEMPLATES' 
  | 'PRICING' 
  | 'WORKFLOWS' 
  | 'IMPORTANT_DECISIONS'
  | 'SUCCESSFUL_PATTERNS'
  | 'FAILED_PATTERNS'
  | 'TOOL_PREFERENCES';

export interface MemoryItem {
  memoryId: string;
  userId: string;
  category: MemoryCategory;
  title: string;
  content: string;
  source: 'user_command' | 'self_learned' | 'system_default';
  importance: 'low' | 'medium' | 'high';
  confidence: number; // 0.0 - 1.0
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface MemoryProposal {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  reason: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface ImprovementSuggestion {
  id: string;
  type: 'workflow_speed' | 'tool_integration' | 'user_preference' | 'error_prevention';
  title: string;
  description: string;
  impact: string;
  status: 'suggested' | 'approved' | 'dismissed';
  createdAt: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  status: 'active' | 'paused' | 'draft';
  lastRun?: string;
  nextRun?: string;
  logs: string[];
}

export interface IntegrationService {
  id: string;
  name: string;
  category: 'code' | 'google' | 'messaging' | 'automation' | 'database' | 'payment';
  icon: string;
  description: string;
  status: 'connected' | 'needs_setup' | 'permission_required' | 'not_connected';
  authType: 'oauth' | 'api_key' | 'webhook' | 'local';
  details?: string;
}

export interface ClientLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'proposal_sent' | 'won' | 'lost';
  value: number;
  notes: string;
  createdAt: string;
}

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url?: string;
  summary?: string;
}

export interface DailyProjectUsage {
  userId: string;
  date: string; // YYYY-MM-DD
  projectsCreated: number;
  projectIds: string[];
}

export interface ProjectQuotaStatus {
  userId: string;
  date: string;
  isOwner: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  projectsCreatedToday: number;
  totalProjects: number;
  allowed: boolean;
  message?: string;
}
