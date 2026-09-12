import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  Mail,
  MessageSquare,
  Zap,
  CreditCard,
  Database,
  Flame,
  Globe,
  QrCode,
} from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [whatsappStatus, setWhatsappStatus] =
    useState<string>('NOT_CONFIGURED');
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [whatsappConfigLoading, setWhatsappConfigLoading] = useState(false);
  const [whatsappDisconnectLoading, setWhatsappDisconnectLoading] =
    useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const [whatsappConfig, setWhatsappConfig] = useState({
    access_token: '',
    phone_number_id: '',
    api_version: 'v23.0',
    base_url: 'https://graph.facebook.com',
  });

  const iconMap: Record<string, any> = {
    GitBranch,
    Mail,
    MessageSquare,
    Zap,
    CreditCard,
    Database,
    Flame,
    Globe,
    QrCode,
  };

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch {
      // Non-critical legacy integration list failure.
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch(
        '/api/brain/communication/whatsapp/status?user_id=default_user'
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setWhatsappStatus(data.status || 'NOT_CONFIGURED');
      } else {
        setWhatsappError(
          data.detail?.message ||
            data.detail ||
            'Unable to check WhatsApp connection.'
        );
      }
    } catch {
      setWhatsappError('Unable to reach AURA WhatsApp service.');
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchWhatsAppStatus();
  }, []);

  const handleWhatsAppRefresh = async () => {
    setWhatsappLoading(true);
    setWhatsappError('');
    setWhatsappMessage('');

    await fetchWhatsAppStatus();

    setWhatsappLoading(false);
  };

  const handleWhatsAppConfigure = async (confirmed = false) => {
    setWhatsappConfigLoading(true);
    setWhatsappError('');
    setWhatsappMessage('');

    try {
      const res = await fetch(
        '/api/brain/communication/whatsapp/configure',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: 'default_user',
            ...whatsappConfig,
            confirmed,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      const detail = data.detail;

      if (res.ok) {
        setWhatsappStatus(data.status || 'CONNECTED');
        setWhatsappMessage(
          'WhatsApp Cloud API connected successfully.'
        );

        setWhatsappConfig((current) => ({
          ...current,
          access_token: '',
        }));

        setShowWhatsAppConfig(false);
        return;
      }

      if (
        res.status === 409 &&
        detail?.code === 'CONFIRMATION_REQUIRED'
      ) {
        const approved = window.confirm(
          'AURA requires confirmation before securely storing the WhatsApp credential. Continue?'
        );

        if (approved) {
          await handleWhatsAppConfigure(true);
        }

        return;
      }

      setWhatsappError(
        detail?.message ||
          detail ||
          data.message ||
          'WhatsApp configuration failed.'
      );
    } catch {
      setWhatsappError('Unable to reach AURA WhatsApp service.');
    } finally {
      setWhatsappConfigLoading(false);
    }
  };

  const handleWhatsAppDisconnect = async () => {
    const approved = window.confirm(
      'Disconnect WhatsApp from AURA? Stored WhatsApp credentials will be removed.'
    );

    if (!approved) return;

    setWhatsappDisconnectLoading(true);
    setWhatsappError('');
    setWhatsappMessage('');

    try {
      const res = await fetch(
        '/api/brain/communication/whatsapp/disconnect',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: 'default_user',
            confirmed: true,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setWhatsappStatus(data.status || 'NOT_CONFIGURED');
        setWhatsappMessage('WhatsApp disconnected.');
      } else {
        setWhatsappError(
          data.detail?.message ||
            data.detail ||
            'Unable to disconnect WhatsApp.'
        );
      }
    } catch {
      setWhatsappError('Unable to reach AURA WhatsApp service.');
    } finally {
      setWhatsappDisconnectLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/integrations/${id}/toggle`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);

        if (data?.authUrl) {
          window.location.href = data.authUrl;
          return;
        }

        fetchIntegrations();
      }
    } catch {
      // Non-critical legacy integration action failure.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span>Integrations & Service Infrastructure</span>
          </h2>

          <p className="text-xs text-slate-400 mt-0.5">
            Production connections to GitHub, Google Workspace, WhatsApp
            Cloud API, n8n, Direct UPI Payments, and databases.
          </p>
        </div>
      </div>

      {showWhatsAppConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Connect WhatsApp Cloud API
                </h3>

                <p className="mt-1 text-[11px] text-slate-400">
                  Credentials are sent to AURA's secure backend. The access
                  token is never displayed after submission.
                </p>
              </div>

              <button
                onClick={() => setShowWhatsAppConfig(false)}
                className="text-slate-500 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  WhatsApp Access Token
                </label>

                <input
                  type="password"
                  autoComplete="off"
                  value={whatsappConfig.access_token}
                  onChange={(e) =>
                    setWhatsappConfig((current) => ({
                      ...current,
                      access_token: e.target.value,
                    }))
                  }
                  placeholder="Paste Meta access token"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  Phone Number ID
                </label>

                <input
                  type="text"
                  autoComplete="off"
                  value={whatsappConfig.phone_number_id}
                  onChange={(e) =>
                    setWhatsappConfig((current) => ({
                      ...current,
                      phone_number_id: e.target.value,
                    }))
                  }
                  placeholder="Meta WhatsApp Phone Number ID"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  API Version
                </label>

                <input
                  type="text"
                  value={whatsappConfig.api_version}
                  onChange={(e) =>
                    setWhatsappConfig((current) => ({
                      ...current,
                      api_version: e.target.value,
                    }))
                  }
                  placeholder="v23.0"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  Graph API Base URL
                </label>

                <input
                  type="url"
                  value={whatsappConfig.base_url}
                  onChange={(e) =>
                    setWhatsappConfig((current) => ({
                      ...current,
                      base_url: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              {whatsappError && (
                <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-[11px] text-red-300">
                  {whatsappError}
                </div>
              )}

              <div className="rounded-lg border border-cyan-900/60 bg-cyan-950/20 px-3 py-2 text-[11px] text-slate-400">
                AURA validates the credentials with WhatsApp before storing
                them. Credentials are encrypted at rest.
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowWhatsAppConfig(false)}
                  className="flex-1 rounded-lg bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleWhatsAppConfigure(false)}
                  disabled={
                    whatsappConfigLoading ||
                    !whatsappConfig.access_token.trim() ||
                    !whatsappConfig.phone_number_id.trim() ||
                    !whatsappConfig.api_version.trim() ||
                    !whatsappConfig.base_url.trim()
                  }
                  className="flex-1 rounded-lg bg-cyan-500 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {whatsappConfigLoading
                    ? 'Validating...'
                    : 'Validate & Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
                <MessageSquare className="w-4 h-4" />
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                  whatsappStatus === 'CONNECTED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : whatsappStatus === 'ERROR'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {whatsappStatus === 'CONNECTED'
                  ? 'Connected'
                  : whatsappStatus === 'ERROR'
                    ? 'Error'
                    : 'Setup Required'}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mt-3">
              WhatsApp
            </h3>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              AURA communication channel for authorized WhatsApp messaging.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-mono text-slate-500">
              Provider: whatsapp_business
            </div>

            {whatsappError && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-[11px] text-red-300">
                {whatsappError}
              </div>
            )}

            {whatsappMessage && (
              <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-[11px] text-emerald-300">
                {whatsappMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleWhatsAppRefresh}
                disabled={whatsappLoading}
                className="py-1.5 rounded-lg text-xs font-semibold transition bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200"
              >
                {whatsappLoading ? 'Checking...' : 'Check'}
              </button>

              <button
                onClick={() => {
                  setWhatsappError('');
                  setWhatsappMessage('');
                  setShowWhatsAppConfig(true);
                }}
                className="py-1.5 rounded-lg text-xs font-bold transition bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              >
                {whatsappStatus === 'CONNECTED'
                  ? 'Reconfigure'
                  : 'Connect'}
              </button>
            </div>

            {whatsappStatus === 'CONNECTED' && (
              <button
                onClick={handleWhatsAppDisconnect}
                disabled={whatsappDisconnectLoading}
                className="w-full py-1.5 rounded-lg text-xs font-semibold transition bg-red-950 hover:bg-red-900 disabled:opacity-50 text-red-300 border border-red-900"
              >
                {whatsappDisconnectLoading
                  ? 'Disconnecting...'
                  : 'Disconnect'}
              </button>
            )}
          </div>
        </div>

        {integrations.map((item) => {
          const Icon = iconMap[item.icon] || Globe;
          const isConnected = item.status === 'connected';

          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700">
                    <Icon className="w-4 h-4" />
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                      isConnected
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {isConnected ? 'Connected' : 'Setup Required'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-3">
                  {item.name}
                </h3>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-mono text-slate-500">
                  {item.details}
                </div>

                <button
                  onClick={() => handleToggle(item.id)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition ${
                    isConnected
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                  }`}
                >
                  {isConnected ? 'Reconfigure' : 'Connect Service'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
