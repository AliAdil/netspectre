import React from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { formatBytes, getProcessColor } from '../../../utils/formatters';
import { Layers, Cpu, Radio, Network } from 'lucide-react';

export const ProtocolMatrixMode: React.FC = () => {
  const { applications, connections, setSelectedConnection } = useNetworkStore();

  const protocolColumns = [
    { key: 'tcp_443', label: 'TCP 443 (TLS)' },
    { key: 'udp_443', label: 'UDP 443 (QUIC)' },
    { key: 'udp_53', label: 'UDP 53 (DNS)' },
    { key: 'tcp_80', label: 'TCP 80 (HTTP)' },
    { key: 'udp_5353', label: 'UDP 5353 (mDNS)' },
    { key: 'other', label: 'Other Sockets' },
  ];

  // Helper to categorize connection
  const getProtoKey = (c: typeof connections[0]) => {
    if (c.remotePort === 443 || c.localPort === 443) {
      return c.protocol === 'TCP' ? 'tcp_443' : 'udp_443';
    }
    if (c.remotePort === 53 || c.localPort === 53) return 'udp_53';
    if (c.remotePort === 80 || c.localPort === 80) return 'tcp_80';
    if (c.remotePort === 5353 || c.localPort === 5353) return 'udp_5353';
    return 'other';
  };

  // Build matrix
  const matrix = new Map<string, Map<string, { conns: typeof connections; totalBytes: number }>>();

  applications.forEach((app) => {
    matrix.set(app.processName, new Map());
    protocolColumns.forEach((col) => {
      matrix.get(app.processName)!.set(col.key, { conns: [], totalBytes: 0 });
    });
  });

  connections.forEach((c) => {
    const key = getProtoKey(c);
    if (!matrix.has(c.processName)) {
      matrix.set(c.processName, new Map());
      protocolColumns.forEach((col) => {
        matrix.get(c.processName)!.set(col.key, { conns: [], totalBytes: 0 });
      });
    }
    const cell = matrix.get(c.processName)!.get(key)!;
    cell.conns.push(c);
    cell.totalBytes += c.bytesReceived + c.bytesSent;
  });

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h1 className="text-lg font-mono font-bold tracking-wider text-slate-100 uppercase">
            APPLICATION × PROTOCOL TRAFFIC HEATMAP
          </h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Transport and application layer protocol matrix mapping volume across Windows process groups
        </p>
      </div>

      {/* Heatmap Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 shadow-xl">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="sticky top-0 bg-[#0c1428] text-slate-400 text-[11px] border-b border-cyan-500/20 uppercase tracking-wider z-10">
            <tr>
              <th className="p-3 w-56">Application Process</th>
              {protocolColumns.map((col) => (
                <th key={col.key} className="p-3 text-center">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {Array.from(matrix.entries()).map(([appName, colMap]) => {
              const color = getProcessColor(appName);

              return (
                <tr key={appName} className="hover:bg-[#0c152d] transition">
                  <td className="p-3">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      ></span>
                      <span className="font-bold text-slate-100 truncate">{appName}</span>
                    </div>
                  </td>

                  {protocolColumns.map((col) => {
                    const data = colMap.get(col.key);
                    const count = data?.conns.length || 0;
                    const bytes = data?.totalBytes || 0;

                    let bgClass = 'bg-transparent text-slate-600';
                    if (count > 0) {
                      if (bytes > 1000000)
                        bgClass = 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold';
                      else if (bytes > 100000)
                        bgClass = 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 font-semibold';
                      else
                        bgClass = 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/20';
                    }

                    return (
                      <td key={col.key} className="p-2 text-center">
                        {count > 0 ? (
                          <div
                            onClick={() => {
                              if (data?.conns[0]) setSelectedConnection(data.conns[0]);
                            }}
                            className={`p-2 rounded-lg cursor-pointer transition ${bgClass} hover:scale-105`}
                            title={`${appName} on ${col.label}: ${count} sockets, ${formatBytes(bytes)}`}
                          >
                            <div className="text-[11px]">{count} flows</div>
                            <div className="text-[9px] text-slate-400">{formatBytes(bytes)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-700 font-mono text-[11px]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
