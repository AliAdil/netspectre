import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { FirewallRule, FirewallAuditEntry } from '../../../types/network';
import { getProcessColor } from '../../../utils/formatters';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const FirewallControlScreen: React.FC = () => {
  const { enginePort, applications } = useNetworkStore();
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [audit, setAudit] = useState<FirewallAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAppPid, setSelectedAppPid] = useState<number | ''>('');
  const [customPath, setCustomPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFirewallStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/firewall/rules`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setAudit(data.audit || []);
      } else {
        setError(`Failed to fetch firewall status: code ${res.status}`);
      }
    } catch (err: any) {
      setError(`Cannot reach firewall backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirewallStatus();
  }, [enginePort]);

  const handleBlockApp = async () => {
    let procName = '';
    let exePath = customPath.trim();

    if (selectedAppPid !== '') {
      const app = applications.find((a) => a.pid === Number(selectedAppPid));
      if (app) {
        procName = app.processName;
        exePath = app.executablePath;
      }
    }

    if (!exePath) {
      alert('Please select an active application or provide an executable path.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/firewall/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processName: procName, executablePath: exePath }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomPath('');
        setSelectedAppPid('');
        await fetchFirewallStatus();
      } else {
        alert(`Failed to create firewall rule: ${data.error || 'Access Denied'}`);
      }
    } catch (err: any) {
      alert(`Error contacting firewall service: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblock = async (ruleName: string) => {
    if (!confirm(`Are you sure you want to restore internet access for ${ruleName}?`)) return;

    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/firewall/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleName }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFirewallStatus();
      } else {
        alert(`Failed to unblock rule: ${data.error || 'Error'}`);
      }
    } catch (err: any) {
      alert(`Error unblocking rule: ${err.message}`);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-400/40 text-rose-400 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-rose-300">
                APPLICATION INTERNET FIREWALL CONTROLS
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Block or restore outbound internet access for any Windows executable using native Windows Defender Firewall rules.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchFirewallStatus}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center space-x-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Rules</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Block An Application Card */}
      <div className="mt-6 p-6 rounded-2xl bg-[#091024]/80 border border-cyan-500/20 shadow-xl">
        <h2 className="text-xs font-bold font-mono tracking-wider text-cyan-300 uppercase mb-4 flex items-center space-x-2">
          <Lock className="w-4 h-4 text-rose-400" />
          <span>Block Outbound Internet Access for An Application</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Select Running Process:
            </label>
            <select
              value={selectedAppPid}
              onChange={(e) => setSelectedAppPid(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="">-- Choose active application --</option>
              {applications.map((app) => (
                <option key={app.pid} value={app.pid}>
                  {app.processName} (PID {app.pid})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Or Custom Executable Path:
            </label>
            <input
              type="text"
              placeholder="C:\Path\To\Application.exe"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleBlockApp}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'APPLYING RULE...' : 'BLOCK INTERNET ACCESS'}</span>
            </button>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-slate-400 flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Rules are applied via Windows Defender Firewall (`netsh advfirewall`). Administrative privileges are used if running elevated.
          </span>
        </div>
      </div>

      {/* Active NETSPECTRE Block Rules */}
      <div className="mt-8">
        <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase mb-4 flex items-center space-x-2">
          <span>Active NETSPECTRE Firewall Rules</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
            {rules.length} blocked
          </span>
        </h2>

        {rules.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
            No active NETSPECTRE firewall block rules found. All system applications are permitted outbound traffic.
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#091024]/70 border border-rose-500/30 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-100">{rule.ruleName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[450px]">
                      {rule.program || 'System Executable'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="px-2 py-1 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-500/40 font-semibold">
                    OUTBOUND BLOCKED
                  </span>
                  <button
                    onClick={() => handleUnblock(rule.ruleName)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center space-x-1.5 transition"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unblock</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit History Log */}
      {audit.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold font-mono tracking-wider text-slate-400 uppercase mb-4 flex items-center space-x-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Firewall Action Audit History</span>
          </h2>

          <div className="space-y-2">
            {audit.map((entry, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#080d1e] border border-cyan-500/10 text-xs font-mono flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  {entry.success ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span
                    className={
                      entry.action === 'BLOCK' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'
                    }
                  >
                    [{entry.action}]
                  </span>
                  <span className="text-slate-200">{entry.ruleName}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
