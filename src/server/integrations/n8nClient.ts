export interface N8NWorkflowItem {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8NStatusReport {
  configured: boolean;
  connected: boolean;
  baseUrl: string;
  apiOrigin: string;
  hasApiKey: boolean;
  status: 'CONNECTED' | 'UNAUTHORIZED' | 'ENDPOINT_NOT_FOUND' | 'NOT_CONFIGURED' | 'CONNECTION_ERROR';
  message: string;
  workflows: N8NWorkflowItem[];
  webhookUrl?: string;
}

export interface N8NExecutionResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  rawResponse?: string;
  durationMs: number;
}

export class N8NClient {
  static getConfig() {
    const rawUrl = process.env.N8N_BASE_URL || '';
    const apiKey = process.env.N8N_API_KEY || '';
    let origin = '';
    let webhookUrl: string | undefined;

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        origin = parsed.origin;
        if (parsed.pathname && parsed.pathname !== '/') {
          webhookUrl = rawUrl;
        }
      } catch {
        origin = rawUrl;
      }
    }

    return {
      rawUrl,
      origin,
      apiKey,
      webhookUrl,
      isConfigured: Boolean(rawUrl && apiKey)
    };
  }

  /**
   * Performs genuine live probe against the configured n8n instance
   */
  static async checkStatus(): Promise<N8NStatusReport> {
    const config = N8NClient.getConfig();

    if (!config.rawUrl) {
      return {
        configured: false,
        connected: false,
        baseUrl: '',
        apiOrigin: '',
        hasApiKey: false,
        status: 'NOT_CONFIGURED',
        message: 'N8N_BASE_URL is not configured in the environment.',
        workflows: []
      };
    }

    try {
      // 1. Probe the Management API (/api/v1/workflows)
      const apiEndpoint = `${config.origin}/api/v1/workflows?limit=15`;
      const apiRes = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': config.apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (apiRes.status === 200) {
        const data = await apiRes.json() as any;
        const workflows: N8NWorkflowItem[] = (data.data || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          active: Boolean(w.active),
          createdAt: w.createdAt,
          updatedAt: w.updatedAt
        }));

        return {
          configured: true,
          connected: true,
          baseUrl: config.rawUrl,
          apiOrigin: config.origin,
          hasApiKey: Boolean(config.apiKey),
          status: 'CONNECTED',
          message: `Successfully connected to n8n instance at ${config.origin}. Found ${workflows.length} workflow(s).`,
          workflows,
          webhookUrl: config.webhookUrl
        };
      }

      if (apiRes.status === 401) {
        return {
          configured: true,
          connected: false,
          baseUrl: config.rawUrl,
          apiOrigin: config.origin,
          hasApiKey: Boolean(config.apiKey),
          status: 'UNAUTHORIZED',
          message: `N8N API returned 401 Unauthorized for ${config.origin}. Check if N8N_API_KEY is valid or expired.`,
          workflows: [],
          webhookUrl: config.webhookUrl
        };
      }

      if (apiRes.status === 404) {
        return {
          configured: true,
          connected: false,
          baseUrl: config.rawUrl,
          apiOrigin: config.origin,
          hasApiKey: Boolean(config.apiKey),
          status: 'ENDPOINT_NOT_FOUND',
          message: `N8N API endpoint not found at ${config.origin}/api/v1/workflows (HTTP 404).`,
          workflows: [],
          webhookUrl: config.webhookUrl
        };
      }

      return {
        configured: true,
        connected: false,
        baseUrl: config.rawUrl,
        apiOrigin: config.origin,
        hasApiKey: Boolean(config.apiKey),
        status: 'CONNECTION_ERROR',
        message: `N8N responded with HTTP ${apiRes.status}: ${apiRes.statusText}`,
        workflows: [],
        webhookUrl: config.webhookUrl
      };
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        baseUrl: config.rawUrl,
        apiOrigin: config.origin,
        hasApiKey: Boolean(config.apiKey),
        status: 'CONNECTION_ERROR',
        message: `Failed to reach n8n instance at ${config.origin}: ${err.message}`,
        workflows: [],
        webhookUrl: config.webhookUrl
      };
    }
  }

  /**
   * Executes a real workflow or webhook in n8n
   */
  static async executeWorkflow(params: {
    workflowId?: string;
    webhookUrl?: string;
    payload: Record<string, any>;
  }): Promise<N8NExecutionResult> {
    const startTime = Date.now();
    const config = N8NClient.getConfig();

    if (!config.rawUrl) {
      return {
        success: false,
        error: 'N8N_BASE_URL is not configured.',
        durationMs: Date.now() - startTime
      };
    }

    const targetUrl = params.webhookUrl || config.webhookUrl || (params.workflowId ? `${config.origin}/webhook/${params.workflowId}` : '');

    if (!targetUrl) {
      return {
        success: false,
        error: 'No target n8n webhook URL or workflow ID provided.',
        durationMs: Date.now() - startTime
      };
    }

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(config.apiKey ? { 'X-N8N-API-KEY': config.apiKey } : {})
        },
        body: JSON.stringify(params.payload),
        signal: AbortSignal.timeout(15000)
      });

      const raw = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { rawText: raw };
      }

      const durationMs = Date.now() - startTime;
      return {
        success: res.ok,
        statusCode: res.status,
        data: parsed,
        rawResponse: raw.slice(0, 1000),
        error: res.ok ? undefined : `n8n execution failed with HTTP ${res.status}: ${parsed?.message || raw.slice(0, 200)}`,
        durationMs
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Network error dispatching to n8n: ${err.message}`,
        durationMs: Date.now() - startTime
      };
    }
  }
}
