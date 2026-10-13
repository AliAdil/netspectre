import React, { useState } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { formatBytes, formatRate, getCountryFlag } from '../../../utils/formatters';
import { Globe2, Server, Shield, Layers, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const DestinationMapMode: React.FC = () => {
  const { connections, setSelectedConnection } = useNetworkStore();

  const [activeCountryFilter, setActiveCountryFilter] = useState<string | null>(null);

  // Group by Country
  const countryMap = new Map<string, typeof connections>();
  connections.forEach((c) => {
    const code = c.countryCode || 'LOC';
    if (!countryMap.has(code)) countryMap.set(code, []);
    countryMap.get(code)!.push(c);
  });

  const countryEntries = Array.from(countryMap.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const displayedConnections = connections.filter((c) => {
    if (activeCountryFilter && (c.countryCode || 'LOC') !== activeCountryFilter) return false;
    return true;
  });

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Globe2 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-mono font-bold tracking-wider text-slate-100 uppercase">
              GEOGRAPHIC & ASN DESTINATION RADAR
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Geographic distribution of observed IP endpoints across global Autonomous Systems and RFC1918 subnets
          </p>
        </div>

        {activeCountryFilter && (
          <button
            onClick={() => setActiveCountryFilter(null)}
            className="px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-mono"
          >
            Clear Filter: {activeCountryFilter} ✕
          </button>
        )}
      </div>

      {/* Main Grid: Country Badges + Active Sockets Table */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {/* Country Breakdown Cards */}
        <div className="flex flex-col rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-cyan-500/20 bg-[#0c1428] font-mono text-xs font-bold text-slate-100 uppercase">
            OBSERVED REGIONS ({countryEntries.length})
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {countryEntries.map(([code, conns]) => {
              const isSelected = activeCountryFilter === code;
              const rep = conns[0];
              const totalB = conns.reduce((s, c) => s + c.bytesReceived + c.bytesSent, 0);

              return (
                <div
                  key={code}
                  onClick={() => setActiveCountryFilter(isSelected ? null : code)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-md shadow-emerald-950/50'
                      : 'bg-[#0a1020] border-cyan-500/10 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getCountryFlag(code)}</span>
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-100">
                        {rep.countryName || (code === 'LOC' ? 'Local Network' : code)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {conns.length} active sockets
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs text-emerald-400 font-semibold">
                    {formatBytes(totalB)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remote Endpoints in Selected Region */}
        <div className="md:col-span-2 flex flex-col rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 overflow-hidden shadow-xl">
          <div className="p-3 border-b border-cyan-500/20 bg-[#0c1428] flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-100 uppercase">
              ENDPOINTS IN {activeCountryFilter || 'ALL REGIONS'} ({displayedConnections.length})
            </span>
            <span className="text-[10px] font-mono text-slate-400">Click row to inspect</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {displayedConnections.map((conn) => (
              <div
                key={conn.id}
                onClick={() => setSelectedConnection(conn)}
                className="p-3 rounded-lg bg-[#0a1020] border border-cyan-500/10 hover:border-cyan-500/30 cursor-pointer flex items-center justify-between transition"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{getCountryFlag(conn.countryCode)}</span>
                    <span className="font-mono text-xs font-bold text-slate-100 truncate">
                      {conn.domain || conn.remoteAddress}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({conn.processName})
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {conn.remoteAddress}:{conn.remotePort} • {conn.organization} ({conn.asn})
                  </div>
                </div>

                <div className="text-right font-mono text-xs shrink-0">
                  <div className="text-emerald-400 font-semibold">
                    ↓ {formatBytes(conn.bytesReceived)}
                  </div>
                  <div className="text-amber-400">↑ {formatBytes(conn.bytesSent)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
