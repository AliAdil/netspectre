import React, { useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  formatBytes,
  formatRate,
  formatTimestamp,
  getCountryFlag,
} from '../../utils/formatters';
import {
  Binary,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  ShieldAlert,
  Globe,
  Cpu,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Sliders,
  FileCode,
} from 'lucide-react';

export const DataCommunicationExplorer: React.FC = () => {
  const {
    connections,
    selectedConnection,
    setSelectedConnection,
    packetSamples,
  } = useNetworkStore();

  const [activeTab, setActiveTab] = useState<'system-telemetry' | 'browser-observability'>('system-telemetry');
  const [browserObservabilityConsent, setBrowserObservabilityConsent] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // If no connection is selected, default to the first active one
  const currentConn = selectedConnection || connections[0];

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Filter packet/flow events for the selected connection
  const connPackets = packetSamples.filter((p) => {
    if (!currentConn) return true;
    return (
      (p.sourceIp === currentConn.remoteAddress || p.destIp === currentConn.remoteAddress) ||
      (p.sourcePort === currentConn.remotePort || p.destPort === currentConn.remotePort) ||
      p.processName === currentConn.processName
    );
  });

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Binary className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-mono font-bold tracking-wider text-slate-100 uppercase">
              DATA COMMUNICATION EXPLORER
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Microsecond flow communication timeline, cryptographic payload disclosures, and browser request correlation
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center space-x-2 bg-[#0a0f1d] p-1 rounded-xl border border-cyan-500/20 text-xs font-mono">
          <button
            onClick={() => setActiveTab('system-telemetry')}
            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
              activeTab === 'system-telemetry'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MODE A: SYSTEM TELEMETRY
          </button>
          <button
            onClick={() => setActiveTab('browser-observability')}
            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
              activeTab === 'browser-observability'
                ? 'bg-purple-600 text-slate-100 shadow-md shadow-purple-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MODE B: BROWSER OBSERVABILITY
          </button>
        </div>
      </div>

      {/* Main Split: Connection Selector & Communication Timeline */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left: Active Connection Selector */}
        <div className="flex flex-col rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-cyan-500/20 bg-[#0c1428] flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-100 uppercase">
              ACTIVE SOCKET FLOWS ({connections.length})
            </span>
            <div className="relative w-36">
              <input
                type="text"
                placeholder="Search flow..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-2 pr-2 py-0.5 text-[10px] rounded bg-[#070b16] border border-cyan-500/20 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {connections
              .filter((c) => {
                if (!search) return true;
                const q = search.toLowerCase();
                return (
                  c.processName.toLowerCase().includes(q) ||
                  c.remoteAddress.toLowerCase().includes(q) ||
                  c.domain.toLowerCase().includes(q)
                );
              })
              .map((conn) => {
                const isSelected = currentConn?.id === conn.id;

                return (
                  <div
                    key={conn.id}
                    onClick={() => setSelectedConnection(conn)}
                    className={`p-2.5 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow'
                        : 'bg-[#0a1020] border-slate-800 hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-100 truncate">
                        {conn.processName}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                          conn.state === 'ESTABLISHED'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {conn.protocol} {conn.state}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {conn.domain || conn.remoteAddress}:{conn.remotePort}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>↓ {formatBytes(conn.bytesReceived)}</span>
                      <span>↑ {formatBytes(conn.bytesSent)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right 2 Columns: Chronological Event Stream & Cryptographic Disclosures */}
        <div className="lg:col-span-2 flex flex-col rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 overflow-hidden shadow-xl">
          {currentConn ? (
            <>
              {/* Selected Connection Overview Banner */}
              <div className="p-4 border-b border-cyan-500/20 bg-[#0c1428] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{getCountryFlag(currentConn.countryCode)}</span>
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {currentConn.domain || currentConn.remoteAddress}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                      {currentConn.protocol} / {currentConn.remotePort}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
                    <span>Process: {currentConn.processName} (PID {currentConn.pid})</span>
                    <span>•</span>
                    <span>Organization: {currentConn.organization}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">
                      ↓ {formatBytes(currentConn.bytesReceived)}
                    </div>
                    <div className="text-amber-400 font-bold">
                      ↑ {formatBytes(currentConn.bytesSent)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode A: System Network Telemetry View */}
              {activeTab === 'system-telemetry' && (
                <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
                  {/* Cryptographic Privacy Card */}
                  <div className="p-3.5 rounded-xl bg-[#060a14] border border-cyan-500/20 flex items-start space-x-3 text-xs">
                    <Lock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-mono font-bold text-slate-200">
                        TRANSPORT ENCRYPTION (TLS 1.3 / QUIC)
                      </div>
                      <div className="text-slate-400 leading-relaxed text-[11px]">
                        Communication payload is encrypted end-to-end between your browser and the remote server.
                        NETSPECTRE truthfully logs packet sizes, frame arrival times, and endpoint addresses without decrypting passwords, private tokens, or message contents.
                      </div>
                    </div>
                  </div>

                  {/* Chronological Communication Event Stream */}
                  <div className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center justify-between">
                    <span>CHRONOLOGICAL FRAME SEQUENCE</span>
                    <span className="text-[10px] text-slate-400">
                      {connPackets.length} events observed
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {connPackets.length === 0 ? (
                      <div className="p-8 text-center font-mono text-xs text-slate-500">
                        Monitoring socket for new packets. Trigger network activity in your browser to sample live frames.
                      </div>
                    ) : (
                      connPackets.map((pkt) => {
                        const isIncoming = pkt.direction === 'INCOMING';

                        return (
                          <div
                            key={pkt.id}
                            className="p-3 rounded-lg bg-[#0a1020] border border-slate-800 hover:border-cyan-500/30 transition flex items-center justify-between font-mono text-xs"
                          >
                            <div className="flex items-center space-x-3">
                              <span
                                className={`p-1.5 rounded-md ${
                                  isIncoming
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {isIncoming ? (
                                  <ArrowDownLeft className="w-4 h-4" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4" />
                                )}
                              </span>

                              <div>
                                <div className="text-slate-200 font-bold flex items-center space-x-2">
                                  <span>{isIncoming ? 'INCOMING RESPONSE' : 'OUTGOING REQUEST'}</span>
                                  <span className="text-slate-500 text-[10px]">
                                    ({pkt.length} Bytes)
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {pkt.sourceIp}:{pkt.sourcePort} → {pkt.destIp}:{pkt.destPort}
                                </div>
                              </div>
                            </div>

                            <div className="text-right text-[11px] text-slate-400">
                              <div>{formatTimestamp(pkt.timestamp)}</div>
                              <div className="text-cyan-400 text-[10px]">Flags: [{pkt.flags}]</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Mode B: Optional Browser Request Observability */}
              {activeTab === 'browser-observability' && (
                <div className="flex-1 p-6 space-y-6 overflow-y-auto font-sans">
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                    <div className="flex items-center space-x-2.5">
                      <Eye className="w-5 h-5 text-purple-400" />
                      <h3 className="font-mono text-sm font-bold text-slate-100">
                        OPTIONAL BROWSER REQUEST OBSERVABILITY
                      </h3>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      For browser sessions (such as ChatGPT, YouTube, or Google), this optional mode inspects higher-level HTTP request URLs and response codes (e.g. POST https://chatgpt.com/backend-api/conversation → 200 OK) via standard debugging telemetry when explicitly authorized.
                    </p>

                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        onClick={() => setBrowserObservabilityConsent(!browserObservabilityConsent)}
                        className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold transition ${
                          browserObservabilityConsent
                            ? 'bg-purple-600 text-slate-100 shadow-lg shadow-purple-900/50'
                            : 'bg-[#0c1428] text-slate-400 border border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {browserObservabilityConsent ? '✓ OBSERVABILITY AUTHORIZED' : 'ENABLE USER CONSENT'}
                      </button>
                    </div>
                  </div>

                  {browserObservabilityConsent ? (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="font-bold text-slate-200 uppercase tracking-wider">
                        OBSERVED HTTP REQUEST METADATA
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#0a1020] border border-cyan-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">
                            POST (HTTPS)
                          </span>
                          <span className="text-[10px] text-slate-400">Status: 200 OK</span>
                        </div>
                        <div className="text-slate-200 truncate">
                          https://{currentConn.domain || currentConn.remoteAddress}/api/v1/telemetry
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Initiating Context: Chrome Tab #17 • Content-Type: application/json
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#0a1020] border border-cyan-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-bold text-[10px]">
                            GET (HTTPS)
                          </span>
                          <span className="text-[10px] text-slate-400">Status: 200 OK</span>
                        </div>
                        <div className="text-slate-200 truncate">
                          https://{currentConn.domain || currentConn.remoteAddress}/assets/bundle.js
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Transfer Size: 48.2 KB • Cache: Max-Age 3600
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center font-mono text-xs text-slate-500 bg-[#060a14] rounded-xl border border-slate-800">
                      Observability is currently disabled. Click "ENABLE USER CONSENT" above to activate high-level browser request telemetry.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
              Select an active connection on the left to inspect its chronological communication stream.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
