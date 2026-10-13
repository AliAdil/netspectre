import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { formatBytes, formatRate } from '../../../utils/formatters';
import {
  Camera,
  AlertTriangle,
  Download,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  HardDrive,
  Cpu,
  Layers,
  ShieldAlert,
} from 'lucide-react';

export const IncidentRecorderScreen: React.FC = () => {
  const { enginePort, totalDownloadBps, totalUploadBps, applications, connections, primaryAdapter } = useNetworkStore();
  const [reason, setReason] = useState('Sudden network latency spike or packet loss event');
  const [isRecording, setIsRecording] = useState(false);
  const [lastReport, setLastReport] = useState<any | null>(null);

  const fetchLastReport = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/incident/report`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.incidentId) {
          setLastReport(data);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchLastReport();
  }, [enginePort]);

  const handleCaptureSnapshot = async () => {
    setIsRecording(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/incident/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastReport(data);
      }
    } catch (err: any) {
      alert(`Failed to capture incident snapshot: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  const downloadReportJson = () => {
    if (!lastReport) return;
    const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `incident-report-${lastReport.incidentId || Date.now()}.json`;
    a.click();
  };

  const downloadMarkdownReport = () => {
    if (!lastReport) return;
    const md = `# NETSPECTRE INCIDENT DIAGNOSTIC REPORT
**Incident ID:** ${lastReport.incidentId}
**Recorded At:** ${lastReport.recordedAt}
**Trigger Reason:** ${lastReport.reason}
**Primary Adapter:** ${primaryAdapter}

## Telemetry Snapshot Summary
- **Live Inbound Rate:** ${formatRate(totalDownloadBps)}
- **Live Outbound Rate:** ${formatRate(totalUploadBps)}
- **Active Connections:** ${connections.length}
- **Monitored Processes:** ${applications.length}

## Top Active Processes
${applications
  .slice(0, 5)
  .map((a) => `- **${a.processName}** (PID ${a.pid}): ${formatBytes(a.totalBytesReceived + a.totalBytesSent)} (${a.activeConnections} active flows)`)
  .join('\n')}

## Recommended Actions
1. Inspect anomalous outbound sockets communicating on high ports.
2. Verify Default Gateway latency in NETSPECTRE Workbench.
3. Review firewall block status for suspicious executables.
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `incident-report-${lastReport.incidentId || Date.now()}.md`;
    a.click();
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-400/40 text-rose-400 shadow-lg shadow-rose-500/10">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-rose-300">
                NETWORK INCIDENT RECORDER & SNAPSHOT AUDIT
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Freeze real-time state during outages, traffic bursts, or packet loss, and generate exportable post-mortem forensic reports.
              </p>
            </div>
          </div>
        </div>

        {lastReport && (
          <div className="flex items-center space-x-2">
            <button
              onClick={downloadMarkdownReport}
              className="px-3.5 py-2 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center space-x-2 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>
            <button
              onClick={downloadReportJson}
              className="px-3.5 py-2 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center space-x-2 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Snapshot Trigger Card */}
      <div className="mt-6 p-6 rounded-2xl bg-[#091024]/80 border border-rose-500/30 shadow-xl space-y-4">
        <h2 className="text-xs font-bold font-mono tracking-wider text-rose-300 uppercase flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Freeze Telemetry & Capture Incident Forensic Snapshot</span>
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the incident (e.g. Outbound connection failure, VPN drop, latency surge)"
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-[#070b16] border border-cyan-500/30 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-400"
          />

          <button
            onClick={handleCaptureSnapshot}
            disabled={isRecording}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
          >
            <Camera className={`w-4 h-4 ${isRecording ? 'animate-spin' : ''}`} />
            <span>{isRecording ? 'FREEZING SNAPSHOT...' : 'CAPTURE INCIDENT SNAPSHOT'}</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Captures complete socket table, process bandwidth consumption, adapter statuses, and active TCP states.
        </div>
      </div>

      {/* Last Incident Report Review */}
      {lastReport ? (
        <div className="mt-8 p-6 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                  {lastReport.incidentId}
                </span>
                <span className="text-xs font-mono text-slate-300 font-bold">{lastReport.reason}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Recorded: {lastReport.recordedAt}
              </div>
            </div>

            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-[#070b16] border border-cyan-500/10">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Connections Frozen</div>
              <div className="text-base font-mono font-bold text-cyan-300">
                {lastReport.snapshot?.connections?.length || connections.length}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#070b16] border border-cyan-500/10">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Processes Frozen</div>
              <div className="text-base font-mono font-bold text-purple-300">
                {lastReport.snapshot?.applications?.length || applications.length}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#070b16] border border-cyan-500/10">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Downlink Rate</div>
              <div className="text-base font-mono font-bold text-emerald-300">
                {formatRate(lastReport.snapshot?.totalDownloadBps || totalDownloadBps)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#070b16] border border-cyan-500/10">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Uplink Rate</div>
              <div className="text-base font-mono font-bold text-amber-300">
                {formatRate(lastReport.snapshot?.totalUploadBps || totalUploadBps)}
              </div>
            </div>
          </div>

          {/* Forensic Recommendations */}
          <div className="p-4 rounded-xl bg-[#070d1e] border border-cyan-500/20 space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-300">Incident Remediation Recommendations:</div>
            <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc font-mono">
              <li>Inspect high-bandwidth applications active at moment of snapshot.</li>
              <li>Verify routing table in Network Workbench for gateway reachability.</li>
              <li>Export report as Markdown for team post-mortem analysis.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-8 p-12 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <Clock className="w-8 h-8 text-slate-600 mb-2" />
          <span>No incident snapshots captured in this session. Trigger one above when a network issue occurs.</span>
        </div>
      )}
    </div>
  );
};
