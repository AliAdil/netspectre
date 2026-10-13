import React, { useState, useEffect } from 'react';
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
  Sliders,
  CheckCircle2,
  History,
  Calendar,
} from 'lucide-react';

interface PersistentAppUsage {
  processName: string;
  bytesDownloaded: number;
  bytesUploaded: number;
  totalBytes: number;
}

interface UsageHistoryResponse {
  range: string;
  currentDate: string;
  todayTotalDownloaded: number;
  todayTotalUploaded: number;
  dailyQuotaMb: number;
  monthlyQuotaMb: number;
  consumedMb: number;
  quotaPercent: number;
  applications: PersistentAppUsage[];
}

export const InternetUsageScreen: React.FC = () => {
  const {
    applications,
    connections,
    totalBytesDownloaded,
    totalBytesUploaded,
    totalDownloadBps,
    totalUploadBps,
    setActiveScreen,
    enginePort,
    authToken,
  } = useNetworkStore();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'heavy' | 'trackers' | 'history'>('all');
  const [historyData, setHistoryData] = useState<UsageHistoryResponse | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [dailyQuotaInput, setDailyQuotaInput] = useState(5000);
  const [monthlyQuotaInput, setMonthlyQuotaInput] = useState(50000);
  const [isSavingQuotas, setIsSavingQuotas] = useState(false);

  const fetchUsageHistory = async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['X-NetSpectre-Auth'] = authToken;
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/usage/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
        if (data.dailyQuotaMb) setDailyQuotaInput(data.dailyQuotaMb);
        if (data.monthlyQuotaMb) setMonthlyQuotaInput(data.monthlyQuotaMb);
      }
    } catch { }
  };

  useEffect(() => {
    fetchUsageHistory();
    const interval = setInterval(fetchUsageHistory, 3000);
    return () => clearInterval(interval);
  }, [enginePort, authToken]);

  const handleSaveQuotas = async () => {
    setIsSavingQuotas(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['X-NetSpectre-Auth'] = authToken;
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/usage/limits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dailyQuotaMb: Number(dailyQuotaInput),
          monthlyQuotaMb: Number(monthlyQuotaInput),
        }),
      });
      if (res.ok) {
        setShowQuotaModal(false);
        fetchUsageHistory();
      }
    } catch { }
    finally {
      setIsSavingQuotas(false);
    }
  };

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

      {/* Daily Quota & Usage Limit Card (REQ-03) */}
      <div className="mt-6 p-5 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                Daily Data Quota & Persistent Budget
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {historyData ? historyData.currentDate : 'Today'}
              </span>
            </div>

            <div className="text-xs font-mono">
              <span className="text-slate-400">Consumed: </span>
              <span className="text-cyan-300 font-bold">
                {historyData ? `${historyData.consumedMb} MB` : '0 MB'}
              </span>
              <span className="text-slate-500"> / {historyData?.dailyQuotaMb || 5000} MB ({historyData?.quotaPercent || 0}%)</span>
            </div>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                (historyData?.quotaPercent || 0) > 90
                  ? 'bg-rose-500'
                  : (historyData?.quotaPercent || 0) > 75
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, historyData?.quotaPercent || 0))}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>Monthly Quota: {historyData?.monthlyQuotaMb || 50000} MB</span>
            <span className="text-slate-500">Persisted locally in %APPDATA%\NetSpectre\data\</span>
          </div>
        </div>

        <button
          onClick={() => setShowQuotaModal(true)}
          className="px-4 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center space-x-2 transition shrink-0"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configure Quota</span>
        </button>
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
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Live Apps ({applications.length})
          </button>
          <button
            onClick={() => setTab('heavy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              tab === 'heavy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            High Bandwidth
          </button>
          <button
            onClick={() => setTab('trackers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              tab === 'trackers'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trackers ({suspiciousConns.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              tab === 'history'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Persistent Daily History ({historyData?.applications?.length || 0})
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
      ) : tab === 'history' ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#091024]/90 border border-emerald-500/30">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-mono font-bold text-slate-100">
                  Persistent Daily Session Archive ({historyData?.currentDate || 'Today'})
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Cumulative bandwidth stored in local transactional state across restarts
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-emerald-300">
                Total: {formatBytes((historyData?.todayTotalDownloaded || 0) + (historyData?.todayTotalUploaded || 0))}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                ↓ {formatBytes(historyData?.todayTotalDownloaded || 0)} / ↑ {formatBytes(historyData?.todayTotalUploaded || 0)}
              </div>
            </div>
          </div>

          {(!historyData?.applications || historyData.applications.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              No persistent application usage entries recorded for today yet. Traffic is recorded continuously as data transfers occur.
            </div>
          ) : (
            historyData.applications.map((app, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#091024]/70 border border-emerald-500/20 hover:border-emerald-400/40 transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: getProcessColor(app.processName) }}
                  ></div>
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-100">{app.processName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Received: {formatBytes(app.bytesDownloaded)} • Transmitted: {formatBytes(app.bytesUploaded)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    {formatBytes(app.totalBytes)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {historyData && (historyData.todayTotalDownloaded + historyData.todayTotalUploaded) > 0
                      ? `${Math.round((app.totalBytes / (historyData.todayTotalDownloaded + historyData.todayTotalUploaded)) * 100)}% of daily total`
                      : '0%'}
                  </div>
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

      {/* Quota Settings Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0a1024] border border-cyan-500/40 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-cyan-300 uppercase mb-4 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Configure Internet Usage Quotas</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Daily Quota Limit (MB):
                </label>
                <input
                  type="number"
                  value={dailyQuotaInput}
                  onChange={(e) => setDailyQuotaInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  e.g. 5000 MB = ~5 GB per 24-hour day
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Monthly Quota Limit (MB):
                </label>
                <input
                  type="number"
                  value={monthlyQuotaInput}
                  onChange={(e) => setMonthlyQuotaInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  e.g. 50000 MB = ~50 GB per month
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowQuotaModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotas}
                disabled={isSavingQuotas}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold flex items-center space-x-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSavingQuotas ? 'Saving...' : 'Save Quotas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
