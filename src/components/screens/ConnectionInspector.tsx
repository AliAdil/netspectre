import React, { useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  formatBytes,
  formatRate,
  getCountryFlag,
} from '../../utils/formatters';
import {
  Network,
  Search,
  Filter,
  Download,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

export const ConnectionInspector: React.FC = () => {
  const {
    connections,
    selectedConnection,
    setSelectedConnection,
    searchQuery,
    setSearchQuery,
    filterProtocol,
    setFilterProtocol,
  } = useNetworkStore();

  const [sortField, setSortField] = useState<'bytes' | 'rate' | 'process'>('bytes');

  const filteredConnections = connections
    .filter((c) => {
      if (filterProtocol !== 'ALL' && c.protocol !== filterProtocol) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.processName.toLowerCase().includes(q) ||
        c.remoteAddress.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.localPort.toString().includes(q) ||
        c.remotePort.toString().includes(q) ||
        c.organization.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortField === 'bytes') {
        return b.bytesReceived + b.bytesSent - (a.bytesReceived + a.bytesSent);
      }
      if (sortField === 'rate') {
        return b.recvRateBps + b.sendRateBps - (a.recvRateBps + a.sendRateBps);
      }
      return a.processName.localeCompare(b.processName);
    });

  const exportCSV = () => {
    const headers = [
      'ID',
      'Protocol',
      'LocalIP',
      'LocalPort',
      'RemoteIP',
      'RemotePort',
      'State',
      'PID',
      'Process',
      'Domain',
      'Country',
      'ASN',
      'BytesRecv',
      'BytesSent',
    ];
    const rows = filteredConnections.map((c) => [
      c.id,
      c.protocol,
      c.localAddress,
      c.localPort,
      c.remoteAddress,
      c.remotePort,
      c.state,
      c.pid,
      `"${c.processName}"`,
      `"${c.domain}"`,
      c.countryCode,
      `"${c.asn}"`,
      c.bytesReceived,
      c.bytesSent,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netspectre_connections_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
              LIVE CONNECTION FLOW DIRECTORY
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time TCP and UDP sockets with Windows kernel attribution, bandwidth, and destination intelligence
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Protocol switch */}
          <div className="flex items-center space-x-1 bg-[#0a0f1d] border border-cyan-500/20 p-1 rounded-lg text-xs font-mono">
            {(['ALL', 'TCP', 'UDP'] as const).map((proto) => (
              <button
                key={proto}
                onClick={() => setFilterProtocol(proto)}
                className={`px-2 py-0.5 rounded transition ${
                  filterProtocol === proto
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {proto}
              </button>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-[#0a0f1d] border border-cyan-500/20 hover:border-cyan-400/50 text-cyan-300 text-xs font-mono flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto mt-4 rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md shadow-xl">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="sticky top-0 bg-[#0c1428] text-slate-400 text-[11px] border-b border-cyan-500/20 uppercase tracking-wider z-10">
            <tr>
              <th className="p-3">Protocol</th>
              <th className="p-3">Process / PID</th>
              <th className="p-3">Local Endpoint</th>
              <th className="p-3">Remote Endpoint</th>
              <th className="p-3">Destination / ASN</th>
              <th className="p-3">State</th>
              <th className="p-3 text-right">Recv (Rate)</th>
              <th className="p-3 text-right">Send (Rate)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredConnections.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No matching connections observed.
                </td>
              </tr>
            ) : (
              filteredConnections.map((c) => {
                const isSelected = selectedConnection?.id === c.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedConnection(c)}
                    className={`cursor-pointer transition hover:bg-[#0f1b38] ${
                      isSelected ? 'bg-[#122247] border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    {/* Protocol */}
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.protocol === 'TCP'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {c.protocol}
                      </span>
                    </td>

                    {/* Process */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
                        <span className="truncate max-w-[140px]">{c.processName}</span>
                        {c.isSuspicious && (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">PID {c.pid}</div>
                    </td>

                    {/* Local */}
                    <td className="p-3 text-slate-400">
                      {c.localAddress}:{c.localPort}
                    </td>

                    {/* Remote */}
                    <td className="p-3 font-semibold text-slate-200">
                      <div className="truncate max-w-[180px]">
                        {c.domain || c.remoteAddress}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {c.remoteAddress}:{c.remotePort}
                      </div>
                    </td>

                    {/* Destination ASN */}
                    <td className="p-3 text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span>{getCountryFlag(c.countryCode)}</span>
                        <span className="truncate max-w-[150px]">{c.organization}</span>
                      </div>
                      <div className="text-[10px] text-cyan-400/80">{c.asn}</div>
                    </td>

                    {/* State */}
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          c.state === 'ESTABLISHED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : c.state === 'LISTENING'
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.state}
                      </span>
                    </td>

                    {/* Recv */}
                    <td className="p-3 text-right font-medium text-emerald-400">
                      <div>{formatBytes(c.bytesReceived)}</div>
                      {c.recvRateBps > 0 && (
                        <div className="text-[10px] text-emerald-500 font-normal">
                          ↓ {formatRate(c.recvRateBps)}
                        </div>
                      )}
                    </td>

                    {/* Send */}
                    <td className="p-3 text-right font-medium text-amber-400">
                      <div>{formatBytes(c.bytesSent)}</div>
                      {c.sendRateBps > 0 && (
                        <div className="text-[10px] text-amber-500 font-normal">
                          ↑ {formatRate(c.sendRateBps)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
