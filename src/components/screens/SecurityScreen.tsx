import React, { useState, useEffect } from 'react';
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
  Bell,
  BellOff,
  Sliders,
  CheckCircle,
} from 'lucide-react';

export const SecurityScreen: React.FC = () => {
  const {
    connections,
    events,
    setSelectedConnection,
    enginePort,
    authToken,
  } = useNetworkStore();

  const [engineAlerts, setEngineAlerts] = useState<any[]>([]);
  const [enableDesktopNotifs, setEnableDesktopNotifs] = useState(true);
  const [latencyThresholdMs, setLatencyThresholdMs] = useState(150);
  const [burstThresholdMb, setBurstThresholdMb] = useState(5);

  const getHeaders = (hasBody = false) => {
    const h: Record<string, string> = {};
    if (hasBody) h['Content-Type'] = 'application/json';
    if (authToken) h['X-NetSpectre-Auth'] = authToken;
    return h;
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/alerts/history`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.alerts)) {
          setEngineAlerts(data.alerts);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 4000);
    return () => clearInterval(interval);
  }, [enginePort, authToken]);

  const handleAcknowledge = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:${enginePort}/api/alerts/acknowledge`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ id }),
      });
      fetchAlerts();
    } catch { }
  };

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

      {/* Smart Alerts & Notification Configuration (REQ-09) */}
      <div className="p-5 rounded-2xl bg-[#090f20]/80 border border-purple-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono font-bold text-purple-200 uppercase tracking-wider">
              Smart Alerts Engine & Windows Desktop Notification Rules
            </span>
          </div>
          <button
            onClick={() => {
              const next = !enableDesktopNotifs;
              setEnableDesktopNotifs(next);
              if (next && (window as any).electronAPI?.sendNotification) {
                (window as any).electronAPI.sendNotification(
                  'NETSPECTRE Alerts Enabled',
                  'Windows desktop alerts will trigger upon detected latency spikes or anomalous sockets.'
                );
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center space-x-2 transition ${
              enableDesktopNotifs
                ? 'bg-purple-950 text-purple-300 border border-purple-500/50 shadow-md'
                : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}
          >
            {enableDesktopNotifs ? <Bell className="w-3.5 h-3.5 text-purple-400" /> : <BellOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>{enableDesktopNotifs ? 'Desktop Notifications Active' : 'Notifications Muted'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-[#070b16] border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Latency Spike Alert Threshold:</span>
              <span className="text-purple-300 font-bold">{latencyThresholdMs} ms</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={latencyThresholdMs}
              onChange={(e) => setLatencyThresholdMs(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>50 ms (Strict)</span>
              <span>250 ms (Normal)</span>
              <span>500 ms (Lenient)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070b16] border border-slate-800/80">
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Outbound Burst Alert Threshold:</span>
              <span className="text-cyan-300 font-bold">{burstThresholdMb} MB/s</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={burstThresholdMb}
              onChange={(e) => setBurstThresholdMb(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>1 MB/s</span>
              <span>10 MB/s</span>
              <span>50 MB/s</span>
            </div>
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

      {/* Persistent Engine Alerts Log (REQ-09 & REQ-16) */}
      <div className="space-y-3 pt-4">
        <div className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-purple-400" />
            <span>PERSISTENT ENGINE ANOMALY NOTIFICATIONS ({engineAlerts.length})</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal">
            Stored in %APPDATA%\NetSpectre\data\alerts.json
          </span>
        </div>

        <div className="space-y-2">
          {engineAlerts.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#090e1c]/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
              No persistent anomaly triggers recorded. Alert history is clean.
            </div>
          ) : (
            engineAlerts.map((al: any) => (
              <div
                key={al.id}
                className="p-3.5 rounded-xl bg-[#090f20] border border-purple-500/30 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-300 font-bold">{al.title || al.type}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                        {al.severity || 'WARNING'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {al.message || al.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-slate-500 text-[10px]">
                    {al.timestamp ? new Date(al.timestamp).toLocaleTimeString() : 'Recent'}
                  </span>
                  <button
                    onClick={() => handleAcknowledge(al.id)}
                    className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[11px] font-mono flex items-center space-x-1 transition"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Acknowledge</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
