import React, { useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  formatBytes,
  formatRate,
  getCountryFlag,
} from '../../utils/formatters';
import {
  Globe2,
  Search,
  Server,
  Shield,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

export const DestinationIntelligence: React.FC = () => {
  const {
    connections,
    setSelectedConnection,
  } = useNetworkStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');

  // Group connections by destination IP/host
  const destMap = new Map<string, {
    ip: string;
    domain: string;
    asn: string;
    org: string;
    countryCode: string;
    countryName: string;
    isPrivate: boolean;
    conns: typeof connections;
    totalRecv: number;
    totalSend: number;
    recvRate: number;
    sendRate: number;
  }>();

  connections.forEach((c) => {
    const key = c.remoteAddress;
    if (!destMap.has(key)) {
      destMap.set(key, {
        ip: c.remoteAddress,
        domain: c.domain,
        asn: c.asn,
        org: c.organization,
        countryCode: c.countryCode,
        countryName: c.countryName,
        isPrivate: c.isPrivate,
        conns: [],
        totalRecv: 0,
        totalSend: 0,
        recvRate: 0,
        sendRate: 0,
      });
    }
    const entry = destMap.get(key)!;
    entry.conns.push(c);
    entry.totalRecv += c.bytesReceived;
    entry.totalSend += c.bytesSent;
    entry.recvRate += c.recvRateBps;
    entry.sendRate += c.sendRateBps;
    if (!entry.domain && c.domain) entry.domain = c.domain;
  });

  const destinations = Array.from(destMap.values())
    .filter((d) => {
      if (filterType === 'PUBLIC' && d.isPrivate) return false;
      if (filterType === 'PRIVATE' && !d.isPrivate) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        d.ip.toLowerCase().includes(q) ||
        d.domain.toLowerCase().includes(q) ||
        d.org.toLowerCase().includes(q) ||
        d.asn.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.totalRecv + b.totalSend - (a.totalRecv + a.totalSend));

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-[#070a13] space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
              DESTINATION & AUTONOMOUS SYSTEM INTELLIGENCE
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Global remote endpoint aggregation, ASN network routing, and approximate geographic geolocation
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter IP, domain, ASN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#0a0f1d] border border-cyan-500/20 text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div className="flex items-center space-x-1 bg-[#0a0f1d] border border-cyan-500/20 p-1 rounded-lg text-xs font-mono">
            {(['ALL', 'PUBLIC', 'PRIVATE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-0.5 rounded transition ${
                  filterType === t
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Destinations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {destinations.map((d) => (
          <div
            key={d.ip}
            onClick={() => {
              if (d.conns.length > 0) setSelectedConnection(d.conns[0]);
            }}
            className="p-4 rounded-xl bg-[#090f20]/90 border border-cyan-500/15 hover:border-cyan-400/50 hover:bg-[#0c142b] transition-all cursor-pointer shadow-lg space-y-3 group"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-base">{getCountryFlag(d.countryCode)}</span>
                <span className="font-mono font-bold text-sm text-slate-100 truncate group-hover:text-cyan-300 transition">
                  {d.domain || d.ip}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  d.isPrivate
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {d.isPrivate ? 'PRIVATE RFC1918' : d.countryCode}
              </span>
            </div>

            {/* IP & Org */}
            <div className="space-y-1 font-mono text-[11px]">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Observed IP:</span>
                <span className="text-slate-200">{d.ip}</span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Organization:</span>
                <span className="text-slate-200 truncate max-w-[160px]">{d.org}</span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Routing ASN:</span>
                <span className="text-cyan-400 font-semibold">{d.asn}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80">
              <div>
                <div className="text-[10px] text-slate-500">RECEIVED</div>
                <div className="text-emerald-400 font-semibold">{formatBytes(d.totalRecv)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">TRANSMITTED</div>
                <div className="text-amber-400 font-semibold">{formatBytes(d.totalSend)}</div>
              </div>
            </div>

            {/* Communicating processes count */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>{d.conns.length} active sockets</span>
              <span className="text-cyan-400 group-hover:underline">Inspect flow details →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
