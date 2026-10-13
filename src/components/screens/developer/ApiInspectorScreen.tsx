import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { ApiExecutionResult } from '../../../types/network';
import { formatBytes } from '../../../utils/formatters';
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  ShieldCheck,
  History,
  Layers,
  ArrowRight,
  RefreshCw,
  Code2,
  Globe,
  UploadCloud,
  FileJson,
  Radio,
  ExternalLink
} from 'lucide-react';

export const ApiInspectorScreen: React.FC = () => {
  const { enginePort, authToken } = useNetworkStore();

  const [topMode, setTopMode] = useState<'EXECUTOR' | 'BROWSER_OBS' | 'HAR_IMPORT'>('EXECUTOR');

  // Direct Executor State
  const [url, setUrl] = useState('https://api.github.com/zen');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [headersText, setHeadersText] = useState('{\n  "Accept": "application/json"\n}');
  const [requestBody, setRequestBody] = useState('');
  const [activeTab, setActiveTab] = useState<'response' | 'headers' | 'waterfall'>('waterfall');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ApiExecutionResult | null>(null);
  const [history, setHistory] = useState<ApiExecutionResult[]>([]);
  const [copied, setCopied] = useState(false);

  // Browser Observability State
  const [observedRequests, setObservedRequests] = useState<any[]>([]);
  const [selectedObserved, setSelectedObserved] = useState<any | null>(null);
  const [isObsListening, setIsObsListening] = useState(true);

  // HAR Importer State
  const [importedHarEntries, setImportedHarEntries] = useState<any[]>([]);
  const [selectedHarEntry, setSelectedHarEntry] = useState<any | null>(null);
  const [harFileName, setHarFileName] = useState('');

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) h['X-NetSpectre-Auth'] = authToken;
    return h;
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/api-inspector/history`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch { }
  };

  const fetchBrowserRequests = async () => {
    if (!isObsListening) return;
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/browser-obs/requests`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setObservedRequests(data.requests || []);
      }
    } catch { }
  };

  useEffect(() => {
    fetchHistory();
  }, [enginePort, authToken]);

  useEffect(() => {
    if (topMode === 'BROWSER_OBS') {
      fetchBrowserRequests();
      const interval = setInterval(fetchBrowserRequests, 1500);
      return () => clearInterval(interval);
    }
  }, [topMode, isObsListening, enginePort, authToken]);

  const handleExecute = async () => {
    if (!url) return;
    setExecuting(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/api-inspector/execute`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          url,
          method,
          headers: headersText,
          body: requestBody,
        }),
      });
      if (res.ok) {
        const data: ApiExecutionResult = await res.json();
        setResult(data);
        fetchHistory();
      }
    } catch (err: any) {
      alert(`API execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const copyAsCurl = () => {
    let curl = `curl -X ${method} "${url}"`;
    try {
      const h = JSON.parse(headersText);
      for (const [k, v] of Object.entries(h)) {
        curl += ` -H "${k}: ${v}"`;
      }
    } catch { }
    if (requestBody && (method === 'POST' || method === 'PUT')) {
      curl += ` -d '${requestBody.replace(/'/g, "\\'")}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportHar = () => {
    if (!result) return;
    const har = {
      log: {
        version: '1.2',
        creator: { name: 'NETSPECTRE', version: '3.1.0' },
        entries: [
          {
            startedDateTime: new Date(result.timestamp).toISOString(),
            time: result.totalMs,
            request: {
              method: result.method,
              url: result.url,
              headers: [],
            },
            response: {
              status: result.statusCode,
              statusText: result.statusDescription,
              headers: Object.entries(result.headers || {}).map(([name, value]) => ({ name, value })),
              content: { size: result.respBytes, text: result.body },
            },
            timings: {
              dns: result.dnsMs,
              connect: result.connectMs,
              ssl: result.sslMs,
              wait: result.ttfbMs,
              receive: result.downloadMs,
            },
          },
        ],
      },
    };

    const blob = new Blob([JSON.stringify(har, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `netspectre-api-${Date.now()}.har`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  };

  // Handle HAR file upload
  const handleHarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHarFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.log && Array.isArray(parsed.log.entries)) {
          setImportedHarEntries(parsed.log.entries);
        } else {
          alert('Invalid HAR format: Missing log.entries');
        }
      } catch (err) {
        alert('Failed to parse HAR JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
              API OBSERVABILITY & TRAFFIC DEBUGGER
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
              v3.1 ENTERPRISE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Microsecond HTTP/HTTPS phase waterfalls, live Chromium observability, and HAR archive dissection
          </p>
        </div>

        {/* Top Mode Selector Tabs */}
        <div className="flex bg-[#0a0f1d] border border-cyan-500/30 rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={() => setTopMode('EXECUTOR')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              topMode === 'EXECUTOR'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>Direct Executor</span>
          </button>
          <button
            onClick={() => setTopMode('BROWSER_OBS')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              topMode === 'BROWSER_OBS'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Browser Observability</span>
          </button>
          <button
            onClick={() => setTopMode('HAR_IMPORT')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              topMode === 'HAR_IMPORT'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3 h-3" />
            <span>Import HAR Archive</span>
          </button>
        </div>
      </div>

      {/* MODE 1: DIRECT EXECUTOR */}
      {topMode === 'EXECUTOR' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 mt-4 overflow-hidden">
          {/* Left Panel: Request Builder */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-auto">
            {/* URL Input Bar */}
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="px-3 py-2 rounded-lg bg-[#0c1428] border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold focus:outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>

                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/v1/resource"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#0c1428] border border-cyan-500/30 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-400"
                />

                <button
                  onClick={handleExecute}
                  disabled={executing}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition shadow-lg shadow-cyan-950/50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{executing ? 'SENDING...' : 'SEND'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <div className="flex items-center space-x-3">
                  <button onClick={copyAsCurl} className="hover:text-cyan-300 flex items-center space-x-1 transition">
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'COPIED CURL!' : 'Copy cURL'}</span>
                  </button>
                  <button onClick={exportHar} disabled={!result} className="hover:text-cyan-300 disabled:opacity-40 flex items-center space-x-1 transition">
                    <Download className="w-3 h-3" />
                    <span>Export HAR</span>
                  </button>
                </div>
                <div className="flex items-center space-x-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Auto-Credential Redaction Active</span>
                </div>
              </div>
            </div>

            {/* Headers & Body Editors */}
            <div className="flex-1 flex flex-col p-4 rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md">
              <div className="text-xs font-mono font-bold text-slate-300 mb-2">Request Headers (JSON)</div>
              <textarea
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                rows={4}
                className="w-full p-2.5 rounded-lg bg-[#020617] border border-cyan-500/20 text-cyan-300 text-xs font-mono focus:outline-none resize-none"
              />

              {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
                <>
                  <div className="text-xs font-mono font-bold text-slate-300 mt-4 mb-2">Request Body (JSON / Text)</div>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={4}
                    placeholder='{"key": "value"}'
                    className="w-full p-2.5 rounded-lg bg-[#020617] border border-cyan-500/20 text-slate-200 text-xs font-mono focus:outline-none resize-none"
                  />
                </>
              )}
            </div>
          </div>

          {/* Right Panel: Response & Waterfall */}
          <div className="w-full lg:w-1/2 flex flex-col p-4 rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md overflow-hidden">
            {result ? (
              <div className="flex-1 flex flex-col overflow-hidden font-mono">
                {/* Result Status Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      result.statusCode >= 200 && result.statusCode < 300
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    }`}>
                      {result.statusCode || 'ERR'} {result.statusDescription}
                    </span>
                    <span className="text-xs text-slate-400">{result.totalMs} ms</span>
                  </div>
                  <span className="text-xs text-slate-400">{formatBytes(result.respBytes)}</span>
                </div>

                {/* Sub-tabs */}
                <div className="flex border-b border-slate-800 text-xs mt-3">
                  <button
                    onClick={() => setActiveTab('waterfall')}
                    className={`px-4 py-1.5 border-b-2 font-bold transition ${
                      activeTab === 'waterfall' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Phase Waterfall
                  </button>
                  <button
                    onClick={() => setActiveTab('response')}
                    className={`px-4 py-1.5 border-b-2 font-bold transition ${
                      activeTab === 'response' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Response Body
                  </button>
                  <button
                    onClick={() => setActiveTab('headers')}
                    className={`px-4 py-1.5 border-b-2 font-bold transition ${
                      activeTab === 'headers' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Headers
                  </button>
                </div>

                {/* Tab Views */}
                <div className="flex-1 overflow-auto mt-3">
                  {activeTab === 'waterfall' && (
                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] text-slate-400 mb-2">Microsecond Timing Breakdown:</div>
                      {[
                        { name: 'DNS Lookup', ms: result.dnsMs, color: 'bg-blue-500' },
                        { name: 'TCP Connect', ms: result.connectMs, color: 'bg-emerald-500' },
                        { name: 'TLS Handshake', ms: result.sslMs, color: 'bg-purple-500' },
                        { name: 'TTFB (Wait)', ms: result.ttfbMs, color: 'bg-amber-500' },
                        { name: 'Content Download', ms: result.downloadMs, color: 'bg-cyan-500' },
                      ].map((phase) => (
                        <div key={phase.name} className="flex items-center text-xs">
                          <span className="w-32 text-slate-400">{phase.name}</span>
                          <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden mx-2 border border-slate-800">
                            <div
                              className={`h-full ${phase.color}`}
                              style={{ width: `${Math.min(100, Math.max(5, (phase.ms / Math.max(result.totalMs, 1)) * 100))}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-slate-200">{phase.ms} ms</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'response' && (
                    <pre className="p-3 bg-[#020617] rounded-lg border border-cyan-500/20 text-slate-200 text-xs overflow-auto h-full max-h-96">
                      {result.body || '[Empty Response Body]'}
                    </pre>
                  )}

                  {activeTab === 'headers' && (
                    <pre className="p-3 bg-[#020617] rounded-lg border border-cyan-500/20 text-cyan-300 text-xs overflow-auto h-full max-h-96">
                      {JSON.stringify(result.headers, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono text-xs text-center">
                <Code2 className="w-8 h-8 text-slate-600 mb-2" />
                <p>Click "SEND" to profile request timings and view HTTP waterfall breakdown.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: BROWSER OBSERVABILITY */}
      {topMode === 'BROWSER_OBS' && (
        <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden font-mono">
          {/* Extension Status Bar */}
          <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <Radio className="w-5 h-5 text-purple-400 animate-pulse shrink-0" />
              <div>
                <div className="font-bold text-purple-300">
                  Chromium Extension Bridge: Listening on Port {enginePort}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Load the <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">extension/</code> directory in Chrome or Edge via <strong>chrome://extensions</strong> &rarr; <strong>Load unpacked</strong>.
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-slate-400">Captured: {observedRequests.length} requests</span>
              <button
                onClick={fetchBrowserRequests}
                className="px-3 py-1 rounded bg-[#0d162d] border border-cyan-500/40 text-cyan-300 hover:text-white"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Observed Requests Table */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
            <div className="flex-1 overflow-auto rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0c1428] text-slate-400 text-[11px] border-b border-cyan-500/20 uppercase tracking-wider z-10">
                  <tr>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">URL</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {observedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No browser requests observed yet. Open Chrome or Edge with the NETSPECTRE extension loaded and navigate to any website.
                      </td>
                    </tr>
                  ) : (
                    observedRequests.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedObserved(req)}
                        className={`cursor-pointer transition hover:bg-cyan-950/30 ${
                          selectedObserved?.id === req.id ? 'bg-cyan-950/50 border-l-2 border-cyan-400' : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-cyan-300">{req.method}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            req.statusCode >= 200 && req.statusCode < 300
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}>
                            {req.statusCode}
                          </span>
                        </td>
                        <td className="p-3 truncate max-w-md text-slate-200">{req.url}</td>
                        <td className="p-3 text-slate-400">{req.durationMs} ms</td>
                        <td className="p-3 text-slate-400">{formatBytes(req.transferSizeBytes || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Observed Request Inspector */}
            <div className="w-full lg:w-96 rounded-xl border border-cyan-500/20 bg-[#090e1c]/90 backdrop-blur-md p-4 flex flex-col">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-cyan-500/20 mb-3">
                Browser Request Metadata
              </h3>
              {selectedObserved ? (
                <div className="space-y-3 text-xs overflow-auto">
                  <div>
                    <span className="text-slate-500">URL:</span>
                    <div className="text-cyan-300 break-all">{selectedObserved.url}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Source:</span> {selectedObserved.sourceApp} (Tab {selectedObserved.tabId})
                  </div>
                  <div>
                    <span className="text-slate-500">Duration:</span> {selectedObserved.durationMs} ms
                  </div>
                  <div>
                    <span className="text-slate-500">Content-Type:</span> {selectedObserved.contentType}
                  </div>
                  <div>
                    <span className="text-slate-500">Sanitized Headers:</span>
                    <pre className="mt-1 p-2 bg-[#020617] rounded border border-slate-800 text-[11px] text-slate-300 overflow-auto max-h-48">
                      {JSON.stringify(JSON.parse(selectedObserved.headers || '{}'), null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs text-center">
                  Select an observed request from the table to inspect details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: HAR ARCHIVE IMPORTER */}
      {topMode === 'HAR_IMPORT' && (
        <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden font-mono">
          {/* HAR Upload Box */}
          <div className="p-6 rounded-xl border border-dashed border-cyan-500/40 bg-[#090e1c]/60 flex flex-col items-center justify-center text-center">
            <UploadCloud className="w-8 h-8 text-cyan-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-200">Import HTTP Archive (.har)</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Drag and drop or select a .har file exported from Chrome DevTools, Edge, Postman, Charles, or Fiddler.
            </p>
            <label className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition">
              Select HAR File
              <input type="file" accept=".har,.json" onChange={handleHarFileUpload} className="hidden" />
            </label>
            {harFileName && <span className="text-xs text-cyan-300 mt-2">Loaded: {harFileName} ({importedHarEntries.length} entries)</span>}
          </div>

          {/* HAR Entries Table */}
          {importedHarEntries.length > 0 && (
            <div className="flex-1 overflow-auto rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0c1428] text-slate-400 text-[11px] border-b border-cyan-500/20 uppercase tracking-wider z-10">
                  <tr>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">URL</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {importedHarEntries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-cyan-950/30">
                      <td className="p-3 font-bold text-cyan-300">{entry.request?.method}</td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200">
                          {entry.response?.status}
                        </span>
                      </td>
                      <td className="p-3 truncate max-w-lg text-slate-200">{entry.request?.url}</td>
                      <td className="p-3 text-slate-400">{Math.round(entry.time || 0)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiInspectorScreen;
