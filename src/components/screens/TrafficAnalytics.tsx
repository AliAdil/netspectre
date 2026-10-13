import React from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  formatBytes,
  formatRate,
  getProcessColor,
  getCountryFlag,
} from '../../utils/formatters';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  Cpu,
  Globe2,
  PieChart,
} from 'lucide-react';

export const TrafficAnalytics: React.FC = () => {
  const {
    totalDownloadBps,
    totalUploadBps,
    totalBytesDownloaded,
    totalBytesUploaded,
    activeConnectionCount,
    applications,
    connections,
    primaryAdapter,
  } = useNetworkStore();

  // Protocol count
  const tcpCount = connections.filter((c) => c.protocol === 'TCP').length;
  const udpCount = connections.filter((c) => c.protocol === 'UDP').length;
  const totalProto = Math.max(1, tcpCount + udpCount);

  // Top bandwidth apps
  const topApps = [...applications]
    .sort(
      (a, b) =>
        b.totalBytesReceived + b.totalBytesSent - (a.totalBytesReceived + a.totalBytesSent)
    )
    .slice(0, 6);

  // Top ports
  const portMap = new Map<number, number>();
  connections.forEach((c) => {
    const p = c.remotePort || c.localPort;
    portMap.set(p, (portMap.get(p) || 0) + 1);
  });
  const topPorts = Array.from(portMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-[#070a13] space-y-6 select-none font-sans">
      {/* Page Header */}
      <div className="pb-4 border-b border-cyan-500/20">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
            TELEMETRY & TRAFFIC ANALYTICS
          </h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Cumulative data volume, protocol distributions, and interface bandwidth statistics for {primaryAdapter}
        </p>
      </div>

      {/* Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Download */}
        <div className="p-4 rounded-xl bg-[#090f20]/90 border border-cyan-500/15 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>TOTAL DOWNLOAD</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-emerald-300">
            {formatBytes(totalBytesDownloaded)}
          </div>
          <div className="text-[11px] font-mono text-emerald-500">
            Current: {formatRate(totalDownloadBps)}
          </div>
        </div>

        {/* Total Upload */}
        <div className="p-4 rounded-xl bg-[#090f20]/90 border border-cyan-500/15 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>TOTAL UPLOAD</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-amber-300">
            {formatBytes(totalBytesUploaded)}
          </div>
          <div className="text-[11px] font-mono text-amber-500">
            Current: {formatRate(totalUploadBps)}
          </div>
        </div>

        {/* Active Connections */}
        <div className="p-4 rounded-xl bg-[#090f20]/90 border border-cyan-500/15 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ACTIVE FLOWS</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-cyan-300">
            {activeConnectionCount}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            TCP: {tcpCount} • UDP: {udpCount}
          </div>
        </div>

        {/* Communicating Applications */}
        <div className="p-4 rounded-xl bg-[#090f20]/90 border border-cyan-500/15 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ACTIVE APPLICATIONS</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-purple-300">
            {applications.length}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Tracked Windows processes
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Applications By Bandwidth */}
        <div className="p-5 rounded-2xl bg-[#090f20]/90 border border-cyan-500/15 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
                TOP BANDWIDTH PROCESSES
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Volume</span>
          </div>

          <div className="space-y-3">
            {topApps.map((app) => {
              const total = app.totalBytesReceived + app.totalBytesSent;
              const maxTotal = topApps[0]
                ? topApps[0].totalBytesReceived + topApps[0].totalBytesSent
                : 1;
              const pct = Math.max(8, Math.min(100, (total / (maxTotal || 1)) * 100));

              return (
                <div key={app.processName} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-semibold">{app.processName}</span>
                    <span className="text-slate-300">{formatBytes(total)}</span>
                  </div>
                  <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: getProcessColor(app.processName),
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Protocol & Port Distribution */}
        <div className="p-5 rounded-2xl bg-[#090f20]/90 border border-cyan-500/15 shadow-xl space-y-6">
          {/* Protocol Split */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
                PROTOCOL DISTRIBUTION
              </h2>
            </div>

            <div className="flex items-center space-x-4 pt-1">
              <div className="flex-1 space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-cyan-400 font-semibold">TCP</span>
                  <span className="text-slate-300">
                    {tcpCount} ({Math.round((tcpCount / totalProto) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full"
                    style={{ width: `${(tcpCount / totalProto) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex-1 space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-indigo-400 font-semibold">UDP</span>
                  <span className="text-slate-300">
                    {udpCount} ({Math.round((udpCount / totalProto) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full"
                    style={{ width: `${(udpCount / totalProto) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Destination Ports */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
              TOP OBSERVED PORTS
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
              {topPorts.map(([port, count]) => {
                let name = `Port ${port}`;
                if (port === 443) name = '443 (HTTPS/TLS)';
                else if (port === 80) name = '80 (HTTP)';
                else if (port === 53) name = '53 (DNS)';
                else if (port === 5353) name = '5353 (mDNS)';

                return (
                  <div
                    key={port}
                    className="p-2.5 rounded-lg bg-[#060a14] border border-cyan-500/10 space-y-0.5"
                  >
                    <div className="text-cyan-300 font-semibold">{name}</div>
                    <div className="text-[10px] text-slate-500">{count} active flows</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
