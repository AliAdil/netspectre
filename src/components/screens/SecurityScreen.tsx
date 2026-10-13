import React from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  formatBytes,
  formatTimestamp,
  getCountryFlag,
} from '../../utils/formatters';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  EyeOff,
  Server,
  Cpu,
  Info,
} from 'lucide-react';

export const SecurityScreen: React.FC = () => {
  const {
    connections,
    events,
    setSelectedConnection,
  } = useNetworkStore();

  const suspiciousConns = connections.filter((c) => c.isSuspicious);
  const securityEvents = events.filter((e) => e.eventType === 'SECURITY_ALERT' || e.severity === 'warning');

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-[#070a13] space-y-6 select-none font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-cyan-500/20">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
            LOCAL SECURITY TELEMETRY & THREAT HEURISTICS
          </h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Heuristic behavioral detection of uncommon ports, high-fanout outbound traffic, and legacy protocols
        </p>
      </div>

      {/* Security Posture Status Banner */}
      <div className="p-5 rounded-2xl bg-[#090f20]/90 border border-cyan-500/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg ${
              suspiciousConns.length > 0
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
            }`}
          >
            {suspiciousConns.length > 0 ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="text-sm font-mono font-bold text-slate-100">
              {suspiciousConns.length > 0
                ? `${suspiciousConns.length} ANOMALOUS CONNECTION INDICATORS OBSERVED`
                : 'NO CRITICAL NETWORK THREATS OBSERVED'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Indicators represent investigative signals rather than verified malicious activity.
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#060a14] border border-slate-800 text-slate-300 flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>LOCAL-FIRST ENCLAVE</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#060a14] border border-slate-800 text-slate-300 flex items-center space-x-2">
            <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
            <span>ZERO CLOUD EXFILTRATION</span>
          </div>
        </div>
      </div>

      {/* Active Suspicious Flows Table */}
      <div className="space-y-3">
        <div className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>CURRENT FLAGGED CONNECTIONS ({suspiciousConns.length})</span>
        </div>

        {suspiciousConns.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#090e1c]/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
            All active network flows match standard operating system profiles and recognized public service ports.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suspiciousConns.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedConnection(c)}
                className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30 transition cursor-pointer shadow space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-100">{c.processName}</span>
                    <span className="text-[10px] font-mono text-slate-400">PID {c.pid}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50 text-[10px] font-mono font-bold">
                    PORT {c.remotePort}
                  </span>
                </div>

                <div className="text-xs text-rose-200/90 font-mono bg-[#070b16] p-2 rounded border border-rose-500/20 leading-relaxed">
                  {c.suspiciousReason}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>
                    Target: {c.remoteAddress}:{c.remotePort}
                  </span>
                  <span>{getCountryFlag(c.countryCode)} {c.countryName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Event Log */}
      <div className="space-y-3 pt-4">
        <div className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
          HISTORICAL THREAT LOG ({securityEvents.length})
        </div>

        <div className="space-y-2">
          {securityEvents.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#090e1c]/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
              No recent security anomalies recorded in the current session.
            </div>
          ) : (
            securityEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-lg bg-[#090f20] border border-rose-500/30 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center space-x-3">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="text-rose-300 font-semibold">{ev.details}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Process: {ev.processName} (PID {ev.pid}) • Endpoint: {ev.remoteEndpoint}
                    </div>
                  </div>
                </div>
                <div className="text-slate-500 text-[10px] shrink-0">
                  {formatTimestamp(ev.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
