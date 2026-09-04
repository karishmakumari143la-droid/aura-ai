import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Mail, 
  MessageSquare, 
  Zap, 
  CreditCard, 
  Database, 
  Flame, 
  Globe, 
  Check, 
  AlertCircle, 
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const iconMap: Record<string, any> = {
    GitBranch,
    Mail,
    MessageSquare,
    Zap,
    CreditCard,
    Database,
    Flame,
    Globe
  };

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/integrations/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchIntegrations();
      }
    } catch (err) {
      console.error(err);
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
            Production connections to GitHub, Google Workspace, WhatsApp Cloud API, n8n, Stripe, and databases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {integrations.map((item) => {
          const Icon = iconMap[item.icon] || Globe;
          const isConnected = item.status === 'connected';

          return (
            <div key={item.id} className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                    isConnected ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {isConnected ? 'Connected' : 'Setup Required'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-3">{item.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-mono text-slate-500">
                  {item.details}
                </div>
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition ${
                    isConnected ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
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
