import React, { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import {
  formatBytes,
  formatRate,
  formatDuration,
  formatTimestamp,
  getCountryFlag,
} from '../utils/formatters';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Server,
  Cpu,
  Globe,
  Radio,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const ContextPanel: React.FC = () => {
  const {
    contextPanelOpen,
    toggleContextPanel,
    selectedConnection,
    selectedApplication,
    setSelectedConnection,
    setSelectedApplication,
  } = useNetworkStore();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!contextPanelOpen || (!selectedConnection && !selectedApplication)) {
    return null;
  }

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const closePanel = () => {
    setSelectedConnection(null);
    setSelectedApplication(null);
  };

  return (
    <aside className="w-80 xl:w-96 h-[calc(100vh-3.5rem)] border-l border-cyan-500/20 bg-[#070b16]/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden z-20 shadow-2xl select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-cyan-500/20 flex items-center justify-between bg-[#0a0f1e]/80">
        <div className="flex items-center space-x-2">
          {selectedConnection ? (
            <Server className="w-4 h-4 text-cyan-400" />
          ) : (
            <Cpu className="w-4 h-4 text-purple-400" />
          )}
          <span className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase">
            {selectedConnection ? 'FLOW TELEMETRY INSPECTOR' : 'PROCESS INTELLIGENCE'}
          </span>
        </div>
        <button
          onClick={closePanel}
          className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans text-slate-300">
        {selectedConnection && (
          <div className="space-y-4">
            {/* Target Card */}
            <div className="p-3 rounded-lg bg-[#0c1326] border border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  REMOTE ENDPOINT
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    selectedConnection.state === 'ESTABLISHED'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {selectedConnection.state}
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-slate-100 flex items-center justify-between">
                <span className="truncate">
                  {selectedConnection.domain || selectedConnection.remoteAddress}
                </span>
                <button
                  onClick={() =>
                    handleCopy('endpoint', `${selectedConnection.remoteAddress}:${selectedConnection.remotePort}`)
                  }
                  className="text-slate-400 hover:text-cyan-400 p-0.5"
                  title="Copy remote endpoint"
                >
                  {copiedKey === 'endpoint' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5">
                <span>{selectedConnection.remoteAddress}</span>
                <span>:</span>
                <span className="text-cyan-400 font-semibold">{selectedConnection.remotePort}</span>
                <span className="text-slate-500">({selectedConnection.protocol})</span>
              </div>
            </div>

            {/* Suspicious Warning If Any */}
            {selectedConnection.isSuspicious && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 space-y-1">
                <div className="flex items-center space-x-2 text-rose-400 font-semibold font-mono text-[11px]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>SUSPICIOUS PATTERN DETECTED</span>
                </div>
                <div className="text-[11px] text-rose-300/90 leading-relaxed">
                  {selectedConnection.suspiciousReason}
                </div>
              </div>
            )}

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-[#0a1020] border border-cyan-500/10">
                <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                  <span>RECV TOTAL</span>
                </div>
                <div className="text-sm font-mono font-bold text-emerald-300 mt-1">
                  {formatBytes(selectedConnection.bytesReceived)}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {selectedConnection.packetsReceived} pkts
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0a1020] border border-cyan-500/10">
                <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                  <ArrowUpRight className="w-3 h-3 text-amber-400" />
                  <span>SEND TOTAL</span>
                </div>
                <div className="text-sm font-mono font-bold text-amber-300 mt-1">
                  {formatBytes(selectedConnection.bytesSent)}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {selectedConnection.packetsSent} pkts
                </div>
              </div>
            </div>

            {/* Process Attribution */}
            <div className="p-3 rounded-lg bg-[#0a1020] border border-cyan-500/15 space-y-2">
              <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>OWNING PROCESS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 font-mono">
                  {selectedConnection.processName}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 text-[10px] font-mono border border-purple-500/20">
                  PID {selectedConnection.pid}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 break-all bg-[#070b16] p-2 rounded border border-slate-800">
                {selectedConnection.executablePath}
              </div>
            </div>

            {/* GeoIP & Autonomous System */}
            <div className="p-3 rounded-lg bg-[#0a1020] border border-cyan-500/15 space-y-2">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>NETWORK INTELLIGENCE & ASN</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Country:</span>
                  <span className="text-slate-200">
                    {getCountryFlag(selectedConnection.countryCode)} {selectedConnection.countryName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Organization:</span>
                  <span className="text-slate-200 truncate max-w-[180px]">
                    {selectedConnection.organization}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ASN:</span>
                  <span className="text-cyan-400">{selectedConnection.asn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scope:</span>
                  <span className="text-slate-200">
                    {selectedConnection.isPrivate ? 'Local RFC1918' : 'Public Internet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Flow Timestamps */}
            <div className="p-3 rounded-lg bg-[#0a1020] border border-cyan-500/15 space-y-1.5 font-mono text-[11px]">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>FLOW LIFECYCLE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">First Observed:</span>
                <span className="text-slate-300">
                  {formatTimestamp(selectedConnection.firstSeenMs)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Telemetry:</span>
                <span className="text-slate-300">
                  {formatTimestamp(selectedConnection.lastSeenMs)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="text-cyan-400">
                  {formatDuration(selectedConnection.lastSeenMs - selectedConnection.firstSeenMs)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Application details if selected */}
        {!selectedConnection && selectedApplication && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#0c1326] border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                  APPLICATION METRICS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                  PID {selectedApplication.pid}
                </span>
              </div>
              <div className="font-mono text-base font-bold text-slate-100">
                {selectedApplication.processName}
              </div>
              <div className="text-[10px] font-mono text-slate-400 break-all bg-[#070b16] p-2 rounded border border-slate-800">
                {selectedApplication.executablePath}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-[#0a1020] border border-cyan-500/10">
                <div className="text-[10px] font-mono text-slate-400">ACTIVE FLOWS</div>
                <div className="text-base font-mono font-bold text-cyan-300 mt-1">
                  {selectedApplication.activeConnections}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0a1020] border border-cyan-500/10">
                <div className="text-[10px] font-mono text-slate-400">COUNTRIES</div>
                <div className="text-base font-mono font-bold text-purple-300 mt-1">
                  {selectedApplication.countries.length}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0a1020] border border-cyan-500/15 space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                ACCUMULATED VOLUME
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Total Received:</span>
                <span className="text-emerald-400 font-bold">
                  {formatBytes(selectedApplication.totalBytesReceived)}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Total Sent:</span>
                <span className="text-amber-400 font-bold">
                  {formatBytes(selectedApplication.totalBytesSent)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-cyan-500/20 bg-[#0a0f1e]/80 flex items-center justify-between">
        <button
          onClick={() => {
            const data = selectedConnection || selectedApplication;
            if (data) {
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `netspectre_${selectedConnection ? 'flow' : 'app'}_${Date.now()}.json`;
              a.click();
            }
          }}
          className="w-full py-1.5 px-3 rounded-lg bg-[#0d162c] hover:bg-[#121f3f] border border-cyan-500/30 text-cyan-300 text-xs font-mono transition text-center shadow"
        >
          EXPORT TELEMETRY RECORD (JSON)
        </button>
      </div>
    </aside>
  );
};
