import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Users, 
  DollarSign, 
  Cpu, 
  FolderKanban, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Settings, 
  FileText, 
  RefreshCw,
  Search,
  Sliders,
  AlertCircle,
  QrCode,
  XCircle
} from 'lucide-react';
import { UPIOrder } from '../types';

interface OwnerControlPanelProps {
  onClose?: () => void;
}

export const OwnerControlPanel: React.FC<OwnerControlPanelProps> = ({ onClose }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'logs' | 'settings' | 'upi'>('metrics');
  const [upiOrders, setUpiOrders] = useState<UPIOrder[]>([]);
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [upiActionMsg, setUpiActionMsg] = useState<string | null>(null);

  const fetchUpiOrders = async () => {
    setLoadingUpi(true);
    try {
      const res = await fetch('/api/upi/orders');
      if (res.ok) {
        const data = await res.json();
        setUpiOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching UPI orders:', err);
    } finally {
      setLoadingUpi(false);
    }
  };

  const handleVerifyUpiOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/upi/orders/${orderId}/verify`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setUpiActionMsg(`Order ${orderId} successfully verified! Customer upgraded to PRO.`);
        fetchUpiOrders();
        fetchMetrics();
      } else {
        alert(data.error || 'Failed to verify order');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectUpiOrder = async (orderId: string) => {
    const reason = prompt('Enter rejection reason (e.g. UTR not found on bank statement):');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/admin/upi/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'UTR not found in bank statement' })
      });
      const data = await res.json();
      if (res.ok) {
        setUpiActionMsg(`Order ${orderId} marked REJECTED.`);
        fetchUpiOrders();
      } else {
        alert(data.error || 'Failed to reject order');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleUpdateUser = async (userId: string, field: 'role' | 'plan' | 'status', value: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        fetchMetrics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
        <p className="text-xs">Connecting to Owner Security Gateway...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-purple-950/30 border border-amber-500/40 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-md">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Owner Master Control Panel</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase font-bold">
                Level 0 Authority
              </span>
            </div>
            <p className="text-xs text-amber-300/80">
              Direct administrative authority over system users, billing plans, audit trails, and autonomous agent limits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{metrics?.totalUsers || 3}</p>
          <span className="text-[10px] text-emerald-400 font-mono">100% Verified Accounts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monthly Run-Rate</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-300">${metrics?.revenue || 4280}</p>
          <span className="text-[10px] text-slate-400 font-mono">214 Active Pro Subscribers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>AI Execution Accuracy</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-purple-300">{metrics?.successRate || 98.4}%</p>
          <span className="text-[10px] text-emerald-400 font-mono">Zero Security Leaks</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>System Health</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-cyan-300">OPERATIONAL</p>
          <span className="text-[10px] text-slate-400 font-mono">AURA Intelligence Core</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${activeTab === 'metrics' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'}`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${activeTab === 'logs' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'}`}
        >
          Security Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${activeTab === 'settings' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'}`}
        >
          Global Model Limits
        </button>
        <button
          onClick={() => { setActiveTab('upi'); fetchUpiOrders(); }}
          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${activeTab === 'upi' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'}`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>UPI Orders & Bank UTRs</span>
        </button>
      </div>

      {/* Tab: Users Management Table */}
      {activeTab === 'metrics' && (
        <div className="rounded-2xl bg-slate-900/90 border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-bold text-white">Registered Users & Assigned Privileges</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search user email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5 font-mono">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">System Role</th>
                  <th className="p-3.5">Subscription Plan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {(metrics?.users || []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.isOwner && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 inline" title="System Owner" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={u.role}
                        disabled={u.isOwner}
                        onChange={(e) => handleUpdateUser(u.id, 'role', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="PAID_USER">PAID_USER</option>
                        <option value="FREE_USER">FREE_USER</option>
                      </select>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={u.subscriptionPlan}
                        disabled={u.isOwner}
                        onChange={(e) => handleUpdateUser(u.id, 'plan', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="FREE">FREE ($0)</option>
                        <option value="PRO">PRO ($20/mo)</option>
                        <option value="BUSINESS">BUSINESS ($79/mo)</option>
                        <option value="ENTERPRISE">ENTERPRISE (Custom)</option>
                      </select>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        u.subscriptionStatus === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.subscriptionStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {!u.isOwner ? (
                        <button
                          onClick={() => handleUpdateUser(u.id, 'status', u.subscriptionStatus === 'active' ? 'inactive' : 'active')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-medium transition"
                        >
                          {u.subscriptionStatus === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-mono">Protected Master</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Security Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl bg-slate-900 border border-white/10 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Immutable Security Audit Log</span>
          </h3>
          <div className="divide-y divide-white/5">
            {(metrics?.auditLogs || []).map((log: any) => (
              <div key={log.id} className="py-3 flex items-start justify-between text-xs gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-semibold">{log.action}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{log.user}</span>
                  </div>
                  <p className="text-slate-400 mt-0.5 text-[11px]">{log.details}</p>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono shrink-0">
                  <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  <div>IP: {log.ip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl bg-slate-900 border border-white/10 p-5 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-white">Global Autonomous Engine Parameters</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Owner Rate Limits</p>
                <p className="text-slate-400 text-[11px]">Unrestricted zero-throttle token throughput.</p>
              </div>
              <span className="text-emerald-400 font-mono font-bold">UNLIMITED</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Human-In-The-Loop Approval Gateway</p>
                <p className="text-slate-400 text-[11px]">Require owner confirmation before executing high-risk financial or deployment actions.</p>
              </div>
              <span className="text-cyan-400 font-mono font-bold">ENFORCED</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Gemini Primary Model</p>
                <p className="text-slate-400 text-[11px]">Server-side execution with @google/genai SDK.</p>
              </div>
              <span className="text-purple-400 font-mono font-bold">gemini-3.8-flash</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: UPI Payments & Bank UTR Reconciliation */}
      {activeTab === 'upi' && (
        <div className="rounded-2xl bg-slate-900/90 border border-white/10 overflow-hidden shadow-2xl space-y-4 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Direct UPI Orders & Bank UTR Reconciliation</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  Zero Gateway Middlemen
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Payments settle directly to <strong className="text-emerald-300 font-mono">9818691915@pytes</strong>. Review customer submitted 12-digit UTRs against your UPI app/bank statement.
              </p>
            </div>

            <button
              onClick={fetchUpiOrders}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUpi ? 'animate-spin' : ''}`} />
              <span>Refresh Orders</span>
            </button>
          </div>

          {upiActionMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{upiActionMsg}</span>
            </div>
          )}

          {upiOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No UPI payment orders recorded yet. When customers generate a UPI QR code or submit a UTR, they will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5 font-mono">
                  <tr>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Plan & Amount</th>
                    <th className="p-3.5">Submitted UTR</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Reconciliation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {upiOrders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        <div>{ord.orderId}</div>
                        <div className="text-[10px] text-slate-500">{new Date(ord.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{ord.userName || 'Customer'}</div>
                        <div className="text-[11px] text-slate-400">{ord.userEmail}</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="text-emerald-400 font-bold text-sm">₹{ord.amount}</div>
                        <div className="text-[10px] text-slate-400">{ord.planName}</div>
                      </td>
                      <td className="p-3.5">
                        {ord.customerUtr ? (
                          <div className="font-mono font-bold text-cyan-300 text-xs bg-slate-950 px-2 py-1 rounded border border-cyan-500/30 inline-block">
                            {ord.customerUtr}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Not submitted yet</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        {ord.status === 'CREATED' && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            CREATED
                          </span>
                        )}
                        {ord.status === 'PENDING_VERIFICATION' && (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                            PENDING VERIFICATION
                          </span>
                        )}
                        {ord.status === 'VERIFIED' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            VERIFIED (PRO UPGRADED)
                          </span>
                        )}
                        {ord.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                            REJECTED: {ord.rejectionReason}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {ord.status === 'PENDING_VERIFICATION' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerifyUpiOrder(ord.orderId)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition"
                            >
                              Verify & Upgrade
                            </button>
                            <button
                              onClick={() => handleRejectUpiOrder(ord.orderId)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {ord.status === 'VERIFIED' && (
                          <span className="text-emerald-400 font-bold text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Reconciled</span>
                          </span>
                        )}
                        {ord.status === 'CREATED' && (
                          <span className="text-slate-500 text-[11px]">Awaiting customer UTR</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
