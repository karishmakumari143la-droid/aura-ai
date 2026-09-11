import React from 'react';
import { ComputerPermissionConfig, ToolDefinition, ComputerPermissionType, PermissionState } from '../types';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  Folder, 
  Globe, 
  Monitor, 
  Clipboard, 
  GitBranch, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle,
  Cpu,
  Radio,
  Server,
  Lock
} from 'lucide-react';

interface PermissionsManagerProps {
  permissions: ComputerPermissionConfig[];
  tools: ToolDefinition[];
  companion: {
    connected: boolean;
    version: string;
    os: string;
    hostname: string;
  };
  onUpdatePermission: (permission: ComputerPermissionType, state: PermissionState) => void;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  permissions,
  tools,
  companion,
  onUpdatePermission
}) => {
  const getPermissionIcon = (perm: ComputerPermissionType) => {
    switch (perm) {
      case 'FILES_READ':
      case 'FILES_WRITE':
      case 'FILES_DELETE':
        return Folder;
      case 'BROWSER_CONTROL':
        return Globe;
      case 'TERMINAL_EXECUTION':
        return Terminal;
      case 'SCREEN_CAPTURE':
      case 'APP_LAUNCH':
        return Monitor;
      case 'CLIPBOARD_READ':
      case 'CLIPBOARD_WRITE':
        return Clipboard;
      case 'GIT_ACCESS':
        return GitBranch;
      default:
        return Sliders;
    }
  };

  const getToolStatusBadge = (status: ToolDefinition['status']) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            CONNECTED
          </span>
        );
      case 'SETUP_REQUIRED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            SETUP REQUIRED
          </span>
        );
      case 'PERMISSION_REQUIRED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
            <Lock className="w-3 h-3 text-purple-400" />
            PERMISSION REQUIRED
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 select-none">
      {/* Local Companion Bridge Banner */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              companion.connected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Radio className={`w-6 h-6 ${companion.connected ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Local AURA Desktop Companion</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  companion.connected 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {companion.connected ? 'CONNECTED & RUNNING' : 'SETUP REQUIRED (NOT CONNECTED)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Architecture: AURA AI → Local Companion Agent → Host System Sandbox
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3.5 py-2 rounded-xl border border-white/5 space-y-0.5">
            <div>Environment: {companion.os}</div>
            <div>Protocol Version: v{companion.version}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-0.5">
            <span className="font-semibold text-white">Local Companion Security Sandbox</span>
            <p className="text-slate-400 text-[11px]">
              No command executes on your physical computer without an active local companion agent and explicit authorized permission.
            </p>
          </div>
          <button
            onClick={() => alert('AURA Desktop Companion setup is not currently available.')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs border border-cyan-500/30 transition"
          >
            Install Companion CLI
          </button>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Granular Computer Permissions</h3>
        </div>
        <p className="text-xs text-slate-400">
          Configure security clearance for authorized capabilities and AURA capability access.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {permissions.map((perm) => {
            const Icon = getPermissionIcon(perm.permission);
            return (
              <div
                key={perm.permission}
                className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-white/5 mt-0.5">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{perm.label}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                        perm.risk === 'high' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {perm.risk} risk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{perm.description}</p>
                  </div>
                </div>

                {/* 3-way toggle buttons */}
                <div className="flex rounded-xl bg-slate-950 p-1 border border-white/10 text-[11px]">
                  <button
                    onClick={() => onUpdatePermission(perm.permission, 'allowed')}
                    className={`px-2 py-1 rounded-lg font-mono transition ${
                      perm.state === 'allowed' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Allow
                  </button>
                  <button
                    onClick={() => onUpdatePermission(perm.permission, 'ask_each_time')}
                    className={`px-2 py-1 rounded-lg font-mono transition ${
                      perm.state === 'ask_each_time' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ask
                  </button>
                  <button
                    onClick={() => onUpdatePermission(perm.permission, 'denied')}
                    className={`px-2 py-1 rounded-lg font-mono transition ${
                      perm.state === 'denied' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Deny
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tool Registry Status */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">Authorized Tool Adapters & Status</h3>
        </div>
        <p className="text-xs text-slate-400">
          AURA only reports successful tool actions when confirmed by verified system responses.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 uppercase">
                    {tool.category}
                  </span>
                  {getToolStatusBadge(tool.status)}
                </div>
                <h4 className="text-xs font-bold text-white">{tool.displayName}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{tool.description}</p>
              </div>

              {tool.details && (
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-slate-500">
                  {tool.details}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
