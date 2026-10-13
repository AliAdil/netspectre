import React, { useState } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { formatBytes, formatRate, getProcessColor } from '../../../utils/formatters';
import {
  HardDrive,
  ArrowDownCircle,
  ArrowUpCircle,
  Shield,
  Eye,
  AlertTriangle,
  Globe2,
  Lock,
  Layers,
  Search,
  Filter,
} from 'lucide-react';

export const InternetUsageScreen: React.FC = () => {
  const {
    applications,
    connections,
    totalBytesDownloaded,
    totalBytesUploaded,
    totalDownloadBps,
    totalUploadBps,
    setActiveScreen,
  } = useNetworkStore();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'heavy' | 'trackers'>('all');

  // Filter applications
  const filteredApps = applications.filter((app) =>
    app.processName.toLowerCase().includes(search.toLowerCase())
  );

  // Identify tracker & telemetry domains
  const trackerKeywords = ['telemetry', 'analytics', 'tracking', 'metrics', 'doubleclick', 'crashlytics', 'scorecardresearch', 'ads'];
  const suspiciousConns = connections.filter((c) =>
    trackerKeywords.some((kw) => c.domain.toLowerCase().includes(kw)) || c.isSuspicious
  );

  // Group total data transferred by app
  const totalSessionBytes = totalBytesDownloaded + totalBytesUploaded;

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-400/40 text-purple-400 shadow-lg shadow-purple-500/10">
              <Eye className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-purple-300">
                INTERNET USAGE & PRIVACY MONITOR
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track bandwidth consumption per application, identify stealth background consumers, and inspect telemetry trackers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Consumption KPI Pills */}
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#091024] border border-emerald-500/30 flex items-center space-x-2.5">
            <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">Total Received</div>
              <div className="text-xs font-mono font-bold text-emerald-300">
                {formatBytes(totalBytesDownloaded)}
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#091024] border border-amber-500/30 flex items-center space-x-2.5">
            <ArrowUpCircle className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">Total Transmitted</div>
              <div className="text-xs font-mono font-bold text-amber-300">
                {formatBytes(totalBytesUploaded)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Telemetry Highlights Card */}
      <div className="mt-6 p-5 rounded-2xl bg-[#091024]/80 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold font-mono text-purple-200">
              Privacy & Outbound Telemetry Scan
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Found <span className="text-purple-300 font-bold">{suspiciousConns.length}</span> active connections
              communicating with known background telemetry, ad, or analytics endpoints.
            </div>
          </div>
        </div>

        <button
          onClick={() => setTab('trackers')}
          className="px-3.5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-mono font-semibold transition"
        >
          Review Telemetry Connections
        </button>
      </div>

      {/* Controls: Search and Tabs */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-[#091024] p-1 rounded-xl border border-cyan-500/20">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              tab === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Applications ({applications.length})
          </button>
          <button
            onClick={() => setTab('heavy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              tab === 'heavy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            High Bandwidth Consumers
          </button>
          <button
            onClick={() => setTab('trackers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              tab === 'trackers'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Telemetry & Trackers ({suspiciousConns.length})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter process by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-8 pr-3 py-1.5 rounded-xl bg-[#091024] border border-cyan-500/20 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Content based on tab */}
      {tab === 'trackers' ? (
        <div className="mt-6 space-y-3">
          {suspiciousConns.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              No active background telemetry or tracking connections detected at this moment.
            </div>
          ) : (
            suspiciousConns.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#091024]/70 border border-purple-500/20 hover:border-purple-400/40 transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-lg bg-purple-950 border border-purple-500/30 text-purple-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-100">{c.processName}</span>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/30">
                        {c.domain || c.remoteAddress}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {c.remoteAddress}:{c.remotePort} • {c.countryName || 'Unknown Region'} • ASN: {c.asn || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    {formatBytes(c.bytesSent + c.bytesReceived)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">{c.state}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filteredApps.map((app) => {
            const appTotalBytes = app.totalBytesReceived + app.totalBytesSent;
            const pct =
              totalSessionBytes > 0
                ? Math.min(100, Math.round((appTotalBytes / totalSessionBytes) * 100))
                : 0;

            return (
              <div
                key={app.pid}
                className="p-4 rounded-xl bg-[#091024]/70 border border-cyan-500/20 hover:border-cyan-400/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3.5 flex-1 min-w-[220px]">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: getProcessColor(app.processName) }}
                  ></div>
                  <div className="truncate">
                    <div className="text-xs font-mono font-bold text-slate-100 flex items-center space-x-2">
                      <span className="truncate">{app.processName}</span>
                      <span className="text-[10px] text-slate-500 font-normal">PID {app.pid}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {app.executablePath || 'Windows Subsystem Binary'}
                    </div>
                  </div>
                </div>

                {/* Progress share bar */}
                <div className="w-full md:w-64 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Bandwidth Share</span>
                    <span className="text-cyan-300 font-bold">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rates & Volume Stats */}
                <div className="flex items-center space-x-6 text-right shrink-0">
                  <div>
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Live Rate</div>
                    <div className="text-xs font-mono font-bold text-emerald-300">
                      ↓ {formatRate(app.currentRecvRate)}
                    </div>
                    <div className="text-[10px] font-mono text-amber-300">
                      ↑ {formatRate(app.currentSendRate)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Total Volume</div>
                    <div className="text-xs font-mono font-bold text-cyan-300">
                      {formatBytes(appTotalBytes)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {app.activeConnections} active flows
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
