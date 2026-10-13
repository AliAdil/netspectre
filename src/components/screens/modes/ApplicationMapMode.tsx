import React, { useState } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { formatBytes, formatRate, getProcessColor, getCountryFlag } from '../../../utils/formatters';
import { Cpu, Globe, ArrowRight, ShieldAlert, Filter, Search } from 'lucide-react';

export const ApplicationMapMode: React.FC = () => {
  const {
    applications,
    connections,
    selectedApplication,
    selectedConnection,
    setSelectedApplication,
    setSelectedConnection,
  } = useNetworkStore();

  const [search, setSearch] = useState('');
  const [activeAppFilter, setActiveAppFilter] = useState<string | null>(null);

  // Group connections by application
  const appMap = new Map<string, typeof connections>();
  connections.forEach((c) => {
    if (!appMap.has(c.processName)) appMap.set(c.processName, []);
    appMap.get(c.processName)!.push(c);
  });

  const filteredApps = applications.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.processName.toLowerCase().includes(q) || a.executablePath.toLowerCase().includes(q);
  });

  const displayedConnections = connections.filter((c) => {
    if (activeAppFilter && c.processName !== activeAppFilter) return false;
    return true;
  });

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-mono font-bold tracking-wider text-slate-100 uppercase">
              APPLICATION MAPPING MATRIX
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Bipartite process-to-destination map linking local processes directly to their contacted servers
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-3">
          {activeAppFilter && (
            <button
              onClick={() => setActiveAppFilter(null)}
              className="px-2.5 py-1 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 text-xs font-mono"
            >
              Clear Filter: {activeAppFilter} ✕
            </button>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search application..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-[#0a0f1d] border border-cyan-500/20 text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Bipartite Two-Column Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        {/* Left: Applications Column */}
        <div className="flex flex-col rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-cyan-500/20 bg-[#0c1428] flex items-center justify-between">
            <div className="flex items-center space-x-2 font-mono text-xs font-bold text-slate-100 uppercase">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>RUNNING APPLICATIONS ({filteredApps.length})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Click to isolate flows</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredApps.map((app) => {
              const isSelected = activeAppFilter === app.processName;
              const conns = appMap.get(app.processName) || [];
              const color = getProcessColor(app.processName);

              return (
                <div
                  key={app.processName}
                  onClick={() => {
                    setActiveAppFilter(isSelected ? null : app.processName);
                    setSelectedApplication(app);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-400 shadow-md shadow-purple-950/50'
                      : 'bg-[#0a1020] border-cyan-500/10 hover:border-cyan-500/30 hover:bg-[#0d162d]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    ></span>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-slate-100 truncate">
                        {app.processName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        PID {app.pid} • {conns.length} sockets
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <div className="text-emerald-400">↓ {formatBytes(app.totalBytesReceived)}</div>
                    <div className="text-amber-400">↑ {formatBytes(app.totalBytesSent)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Connected Destinations Column */}
        <div className="flex flex-col rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-cyan-500/20 bg-[#0c1428] flex items-center justify-between">
            <div className="flex items-center space-x-2 font-mono text-xs font-bold text-slate-100 uppercase">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>
                CONTACTED REMOTE ENDPOINTS (
                {displayedConnections.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {activeAppFilter ? `Filtered by ${activeAppFilter}` : 'All Endpoints'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {displayedConnections.slice(0, 40).map((conn) => {
              const isSelected = selectedConnection?.id === conn.id;

              return (
                <div
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-950/50'
                      : 'bg-[#0a1020] border-cyan-500/10 hover:border-cyan-500/30 hover:bg-[#0d162d]'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getCountryFlag(conn.countryCode)}</span>
                      <span className="font-mono text-xs font-bold text-slate-100 truncate">
                        {conn.domain || conn.remoteAddress}
                      </span>
                      {conn.isSuspicious && (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-2">
                      <span>{conn.remoteAddress}:{conn.remotePort}</span>
                      <span>•</span>
                      <span className="text-cyan-400">{conn.organization}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        conn.state === 'ESTABLISHED'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {conn.protocol} {conn.state}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {formatBytes(conn.bytesReceived + conn.bytesSent)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
