import React, { useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  formatBytes,
  formatRate,
  getCountryFlag,
  getProcessColor,
} from '../../utils/formatters';
import {
  Cpu,
  Search,
  ExternalLink,
  ShieldCheck,
  Globe,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export const ApplicationExplorer: React.FC = () => {
  const {
    applications,
    connections,
    setSelectedApplication,
    setActiveScreen,
    setSelectedNodeId,
  } = useNetworkStore();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'bandwidth' | 'connections' | 'name'>('bandwidth');

  const filteredApps = applications
    .filter((app) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        app.processName.toLowerCase().includes(q) ||
        app.executablePath.toLowerCase().includes(q) ||
        app.pid.toString().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'bandwidth') {
        return (
          b.totalBytesReceived + b.totalBytesSent - (a.totalBytesReceived + a.totalBytesSent)
        );
      }
      if (sortBy === 'connections') {
        return b.activeConnections - a.activeConnections;
      }
      return a.processName.localeCompare(b.processName);
    });

  const handleSelectApp = (app: any) => {
    setSelectedApplication(app);
    setSelectedNodeId(`app_${app.processName}`);
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-[#070a13] space-y-6 select-none font-sans">
      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
              APPLICATION SURVEILLANCE MATRIX
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time process attribution and network bandwidth tracking across all running Windows tasks
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter application or path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#0a0f1d] border border-cyan-500/20 text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div className="flex items-center space-x-1 bg-[#0a0f1d] border border-cyan-500/20 p-1 rounded-lg text-xs font-mono">
            <button
              onClick={() => setSortBy('bandwidth')}
              className={`px-2 py-0.5 rounded transition ${
                sortBy === 'bandwidth'
                  ? 'bg-purple-900/60 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bandwidth
            </button>
            <button
              onClick={() => setSortBy('connections')}
              className={`px-2 py-0.5 rounded transition ${
                sortBy === 'connections'
                  ? 'bg-purple-900/60 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Flows
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-0.5 rounded transition ${
                sortBy === 'name'
                  ? 'bg-purple-900/60 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Name
            </button>
          </div>
        </div>
      </div>

      {/* Applications Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.map((app) => {
          const color = getProcessColor(app.processName);
          const totalBytes = app.totalBytesReceived + app.totalBytesSent;
          const isStreaming = app.currentRecvRate > 0 || app.currentSendRate > 0;

          return (
            <div
              key={app.processName + app.pid}
              onClick={() => handleSelectApp(app)}
              className="p-4 rounded-xl bg-[#090f20]/90 border border-cyan-500/15 hover:border-cyan-400/50 hover:bg-[#0c142b] transition-all cursor-pointer shadow-lg space-y-3 group"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="font-mono font-bold text-sm text-slate-100 truncate group-hover:text-cyan-300 transition">
                    {app.processName}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 text-[10px] font-mono border border-purple-500/20">
                  PID {app.pid}
                </span>
              </div>

              {/* Path */}
              <div className="text-[10px] font-mono text-slate-400 truncate bg-[#060a14] p-1.5 rounded border border-slate-800">
                {app.executablePath}
              </div>

              {/* Real-time rates & totals */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-slate-800/80">
                <div>
                  <div className="text-[10px] text-slate-500">RECV VOLUME</div>
                  <div className="text-emerald-400 font-semibold">
                    {formatBytes(app.totalBytesReceived)}
                  </div>
                  {app.currentRecvRate > 0 && (
                    <div className="text-[9px] text-emerald-500">
                      ↓ {formatRate(app.currentRecvRate)}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">SEND VOLUME</div>
                  <div className="text-amber-400 font-semibold">
                    {formatBytes(app.totalBytesSent)}
                  </div>
                  {app.currentSendRate > 0 && (
                    <div className="text-[9px] text-amber-500">
                      ↑ {formatRate(app.currentSendRate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Connections & Countries */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <div className="flex items-center space-x-1 text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>{app.activeConnections} active flows</span>
                </div>

                <div className="flex items-center space-x-1">
                  {app.countries.slice(0, 4).map((c) => (
                    <span key={c} title={c}>
                      {getCountryFlag(c)}
                    </span>
                  ))}
                  {app.countries.length > 4 && (
                    <span className="text-[10px] text-slate-500">+{app.countries.length - 4}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
