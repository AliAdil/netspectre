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
} from 'lucide-react';

export const ApiInspectorScreen: React.FC = () => {
  const { enginePort } = useNetworkStore();

  const [url, setUrl] = useState('https://api.github.com/zen');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [headersText, setHeadersText] = useState('{\n  "Accept": "application/json"\n}');
  const [requestBody, setRequestBody] = useState('');
  const [activeTab, setActiveTab] = useState<'response' | 'headers' | 'waterfall'>('waterfall');

  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ApiExecutionResult | null>(null);
  const [history, setHistory] = useState<ApiExecutionResult[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/api-inspector/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch { }
  };

  useEffect(() => {
    fetchHistory();
  }, [enginePort]);

  const handleExecute = async () => {
    if (!url) return;
    setExecuting(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/api-inspector/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      curl += ` -d '${requestBody}'`;
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
        creator: { name: 'NETSPECTRE Api Inspector', version: '3.0' },
        entries: [
          {
            startedDateTime: new Date(result.timestamp).toISOString(),
            time: result.totalMs,
            request: {
              method: result.method,
              url: result.url,
              headers: Object.entries(result.headers || {}).map(([name, value]) => ({ name, value })),
            },
            response: {
              status: result.statusCode,
              statusText: result.statusDescription,
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
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `api-trace-${Date.now()}.har`;
    a.click();
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
    if (status >= 300 && status < 400) return 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40';
    if (status >= 400 && status < 500) return 'text-amber-400 bg-amber-950/80 border-amber-500/40';
    return 'text-rose-400 bg-rose-950/80 border-rose-500/40';
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Code2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-cyan-300">
                API TRAFFIC DEBUGGER & PHASE WATERFALL
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute REST APIs with microsecond phase metrics (DNS, TCP, TLS, TTFB, Download), secret masking, and cURL/HAR export.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyAsCurl}
            className="px-3.5 py-2 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center space-x-2 transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'COPIED!' : 'Copy cURL'}</span>
          </button>
          <button
            onClick={exportHar}
            disabled={!result}
            className="px-3.5 py-2 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-cyan-500/30 text-slate-300 hover:text-cyan-300 text-xs font-mono flex items-center space-x-2 transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export HAR</span>
          </button>
        </div>
      </div>

      {/* API Request Bar */}
      <div className="mt-6 flex flex-col md:flex-row items-center gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as any)}
          className="w-full md:w-32 px-3 py-2.5 rounded-xl bg-[#091024] border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
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
          placeholder="https://api.example.com/v1/endpoint"
          className="flex-1 w-full px-4 py-2.5 rounded-xl bg-[#091024] border border-cyan-500/30 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />

        <button
          onClick={handleExecute}
          disabled={executing}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
        >
          <Send className={`w-4 h-4 ${executing ? 'animate-pulse' : ''}`} />
          <span>{executing ? 'EXECUTING...' : 'SEND REQUEST'}</span>
        </button>
      </div>

      {/* Secret Masking Security Disclosure */}
      <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1.5 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>
          Security Guard Active: Authorization headers, tokens, and API keys are automatically sanitized from historical logs.
        </span>
      </div>

      {/* Request Options & Response Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Col: Request Configuration (Headers & Body) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#091024]/80 border border-cyan-500/20">
            <div className="text-xs font-mono font-bold text-slate-300 mb-2">Request Headers (JSON)</div>
            <textarea
              rows={4}
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
            <div className="p-4 rounded-xl bg-[#091024]/80 border border-cyan-500/20">
              <div className="text-xs font-mono font-bold text-slate-300 mb-2">Request Body (JSON/Payload)</div>
              <textarea
                rows={6}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{"query": "data"}'
                className="w-full p-2.5 rounded-lg bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>
          )}

          {/* Quick History Drawer */}
          <div className="p-4 rounded-xl bg-[#091024]/80 border border-cyan-500/20">
            <div className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center space-x-2">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recent Requests</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-[10px] text-slate-500 font-mono">No requests executed yet.</div>
              ) : (
                history.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setUrl(h.url);
                      setMethod(h.method as any);
                      setResult(h);
                    }}
                    className="p-2 rounded-lg bg-[#070b16] hover:bg-cyan-950/40 cursor-pointer text-xs font-mono flex items-center justify-between border border-transparent hover:border-cyan-500/30 transition"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-[10px] text-cyan-400 font-bold">{h.method}</span>
                      <span className="text-slate-300 truncate max-w-[170px] text-[11px]">{h.url}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(h.statusCode)}`}>
                      {h.statusCode || 'ERR'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Inspection Results & Waterfall */}
        <div className="lg:col-span-7 flex flex-col">
          {result ? (
            <div className="p-5 rounded-xl bg-[#091024]/90 border border-cyan-500/30 flex-1 flex flex-col shadow-xl">
              {/* Response Header Summary */}
              <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getStatusColor(
                      result.statusCode
                    )}`}
                  >
                    {result.statusCode} {result.statusDescription || 'FAILED'}
                  </span>
                  <div className="text-xs font-mono text-slate-300">
                    Duration: <span className="text-cyan-300 font-bold">{result.totalMs} ms</span>
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400">
                  Size: <span className="text-slate-200">{formatBytes(result.respBytes)}</span>
                </div>
              </div>

              {/* Failure Root-Cause Callout if error */}
              {result.rootCause && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono text-rose-300 space-y-1">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>AUTOMATIC FAILURE ROOT CAUSE:</span>
                  </div>
                  <div className="text-slate-200 leading-relaxed pl-6">{result.rootCause}</div>
                </div>
              )}

              {/* Tabs for Waterfall, Response Body, Headers */}
              <div className="mt-4 flex items-center space-x-2 border-b border-cyan-500/20 pb-2">
                <button
                  onClick={() => setActiveTab('waterfall')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                    activeTab === 'waterfall'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Phase Waterfall ({result.totalMs}ms)
                </button>
                <button
                  onClick={() => setActiveTab('response')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                    activeTab === 'response'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Response Body
                </button>
                <button
                  onClick={() => setActiveTab('headers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                    activeTab === 'headers'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Response Headers
                </button>
              </div>

              {/* Tab 1: Phase Waterfall Breakdown */}
              {activeTab === 'waterfall' && (
                <div className="mt-4 space-y-3.5">
                  {[
                    { label: 'DNS Lookup', ms: result.dnsMs, color: 'bg-blue-500', text: 'text-blue-300' },
                    { label: 'TCP Handshake', ms: result.connectMs, color: 'bg-emerald-500', text: 'text-emerald-300' },
                    { label: 'TLS / SSL Handshake', ms: result.sslMs, color: 'bg-purple-500', text: 'text-purple-300' },
                    { label: 'Time To First Byte (TTFB)', ms: result.ttfbMs, color: 'bg-amber-500', text: 'text-amber-300' },
                    { label: 'Content Download', ms: result.downloadMs, color: 'bg-cyan-500', text: 'text-cyan-300' },
                  ].map((phase, idx) => {
                    const widthPct =
                      result.totalMs > 0 ? Math.min(100, Math.max(3, (phase.ms / result.totalMs) * 100)) : 0;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-300">{phase.label}</span>
                          <span className={`font-bold ${phase.text}`}>{phase.ms} ms</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${phase.color}`}
                            style={{ width: `${widthPct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Response Body */}
              {activeTab === 'response' && (
                <div className="mt-4 flex-1 overflow-hidden">
                  <pre className="w-full h-72 p-3 rounded-lg bg-[#070b16] border border-cyan-500/20 text-[11px] font-mono text-emerald-300 overflow-auto whitespace-pre-wrap">
                    {result.body || '[Empty response body]'}
                  </pre>
                </div>
              )}

              {/* Tab 3: Headers */}
              {activeTab === 'headers' && (
                <div className="mt-4 flex-1 overflow-hidden">
                  <div className="w-full h-72 p-3 rounded-lg bg-[#070b16] border border-cyan-500/20 text-[11px] font-mono text-slate-300 overflow-auto space-y-1">
                    {Object.entries(result.headers || {}).map(([k, v]) => (
                      <div key={k} className="flex">
                        <span className="text-cyan-400 font-semibold w-48 shrink-0">{k}:</span>
                        <span className="text-slate-200 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-[#091024]/40 border border-dashed border-slate-800 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mb-2" />
              <span>Enter an API URL above and click "SEND REQUEST" to inspect live phase waterfall timings.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
