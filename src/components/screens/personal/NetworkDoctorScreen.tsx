import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { DoctorDiagnosticResult, DoctorFinding } from '../../../types/network';
import { formatRate, formatBytes, getProcessColor } from '../../../utils/formatters';
import {
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wifi,
  Globe,
  Radio,
  Server,
  Zap,
  ArrowRight,
  ShieldAlert,
  Cpu,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Send,
  Sparkles,
} from 'lucide-react';

export const NetworkDoctorScreen: React.FC = () => {
  const { enginePort, applications, launchWorkbenchTool, setActiveScreen, authToken } = useNetworkStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DoctorDiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  // Explain My Network state (REQ-08)
  const [userQuestion, setUserQuestion] = useState('Why is my internet slow?');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainResult, setExplainResult] = useState<{
    question: string;
    answer: string;
    status: string;
    evidence: string[];
    remediation: string[];
  } | null>(null);

  const getHeaders = (hasBody = false) => {
    const h: Record<string, string> = {};
    if (hasBody) h['Content-Type'] = 'application/json';
    if (authToken) h['X-NetSpectre-Auth'] = authToken;
    return h;
  };

  const runDiagnosis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/diagnose/doctor`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        setError(`Diagnostic service returned status ${res.status}`);
      }
    } catch (err: any) {
      setError(`Cannot contact diagnostic engine: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (queryText?: string) => {
    const q = queryText || userQuestion;
    if (!q.trim()) return;
    setIsExplaining(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/diagnose/explain`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ question: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setExplainResult(data);
      }
    } catch { }
    finally {
      setIsExplaining(false);
    }
  };

  useEffect(() => {
    runDiagnosis();
  }, [enginePort, authToken]);

  // Find top bandwidth consuming apps
  const topApps = [...applications]
    .sort((a, b) => b.currentRecvRate + b.currentSendRate - (a.currentRecvRate + a.currentSendRate))
    .slice(0, 4);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/50 from-emerald-500/20';
    if (score >= 65) return 'text-cyan-400 border-cyan-500/50 from-cyan-500/20';
    if (score >= 45) return 'text-amber-400 border-amber-500/50 from-amber-500/20';
    return 'text-rose-400 border-rose-500/50 from-rose-500/20';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 65) return 'bg-cyan-500';
    if (score >= 45) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Stethoscope className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-cyan-300">
                NETWORK DOCTOR — 1-CLICK HEALTH DIAGNOSTIC
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive automated health analysis, connectivity bottleneck detection, and plain-English solutions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={runDiagnosis}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'ANALYZING NETWORK...' : 'DIAGNOSE NETWORK NOW'}</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Diagnostic Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Overall Health Score Card */}
        <div className="p-6 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-3">
            OVERALL NETWORK HEALTH SCORE
          </div>

          <div
            className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center bg-gradient-to-b ${
              result ? getScoreColor(result.score) : 'border-slate-700 text-slate-500'
            } shadow-2xl relative`}
          >
            <span className="text-4xl font-extrabold font-mono tracking-tighter">
              {result ? result.score : '--'}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 mt-1">
              {result ? result.status : 'PENDING'}
            </span>
          </div>

          <div className="w-full mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Quality Index</span>
              <span className="text-cyan-300">{result?.score ?? 0} / 100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  result ? getScoreBg(result.score) : 'bg-slate-700'
                }`}
                style={{ width: `${result?.score ?? 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars of Connectivity */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gateway Pillar */}
          <div className="p-4 rounded-xl bg-[#091024]/70 border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold font-mono text-slate-200">Local Router / Gateway</div>
                  <div className="text-[10px] text-slate-400 font-mono">{result?.gatewayIp || '192.168.1.1'}</div>
                </div>
              </div>
              {result?.gatewayOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400">Response Latency:</span>
              <span className="text-sm font-mono font-bold text-cyan-300">
                {result && result.gatewayLatencyMs >= 0 ? `${result.gatewayLatencyMs} ms` : 'Unreachable'}
              </span>
            </div>
          </div>

          {/* Internet Backbone Pillar */}
          <div className="p-4 rounded-xl bg-[#091024]/70 border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold font-mono text-slate-200">Global Internet Link</div>
                  <div className="text-[10px] text-slate-400 font-mono">1.1.1.1 / 8.8.8.8 Backbone</div>
                </div>
              </div>
              {result?.internetOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400">Internet Latency:</span>
              <span className="text-sm font-mono font-bold text-emerald-300">
                {result && result.internetLatencyMs >= 0 ? `${result.internetLatencyMs} ms` : 'Offline'}
              </span>
            </div>
          </div>

          {/* DNS Resolver Pillar */}
          <div className="p-4 rounded-xl bg-[#091024]/70 border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-purple-950 border border-purple-500/30 text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold font-mono text-slate-200">DNS Name Resolution</div>
                  <div className="text-[10px] text-slate-400 font-mono">Domain lookup speed</div>
                </div>
              </div>
              {result?.dnsOk ? (
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400">Lookup Latency:</span>
              <span className="text-sm font-mono font-bold text-purple-300">
                {result && result.dnsLatencyMs >= 0 ? `${result.dnsLatencyMs} ms` : 'Failed'}
              </span>
            </div>
          </div>

          {/* Wi-Fi / Adapter Pillar */}
          <div className="p-4 rounded-xl bg-[#091024]/70 border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-blue-950 border border-blue-500/30 text-blue-400">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold font-mono text-slate-200">Physical Link Quality</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                    {result?.wifiSsid || 'Active Interface'}
                  </div>
                </div>
              </div>
              <Radio className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400">Signal / Link:</span>
              <span className="text-sm font-mono font-bold text-blue-300">
                {result ? `${result.wifiSignalPercent}%` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Findings & Plain-English Explanations */}
      <div className="mt-8">
        <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase mb-4 flex items-center space-x-2">
          <span>Actionable Health Findings & Plain-English Guidance</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-normal">
            {result?.findings?.length || 0} checks
          </span>
        </h2>

        <div className="space-y-3">
          {result?.findings?.map((f) => {
            const isExpanded = expandedFinding === f.id;
            return (
              <div
                key={f.id}
                className={`p-4 rounded-xl border transition-all ${
                  f.severity === 'critical'
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400/60'
                    : f.severity === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/60'
                    : 'bg-[#091024]/60 border-cyan-500/20 hover:border-cyan-400/40'
                }`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedFinding(isExpanded ? null : f.id)}
                >
                  <div className="flex items-center space-x-3">
                    {f.severity === 'critical' ? (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    ) : f.severity === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold font-mono text-slate-100">{f.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                          {f.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{f.explanation}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-400">
                    <span className="text-[10px] font-mono uppercase hidden sm:inline">Details</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 pl-8 space-y-2">
                    <div className="text-xs text-cyan-300 font-semibold flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Recommended Solution:</span>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed bg-[#0c1328] p-3 rounded-lg border border-cyan-500/20">
                      {f.recommendedAction}
                    </div>

                    <div className="pt-2 flex items-center space-x-3">
                      {f.category.includes('Router') && (
                        <button
                          onClick={() => launchWorkbenchTool('ping', result?.gatewayIp || '192.168.1.1')}
                          className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono hover:bg-cyan-900 transition flex items-center space-x-1.5"
                        >
                          <span>Ping Router in Workbench</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {f.category.includes('DNS') && (
                        <button
                          onClick={() => launchWorkbenchTool('dns', 'cloudflare.com')}
                          className="px-3 py-1.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-mono hover:bg-purple-900 transition flex items-center space-x-1.5"
                        >
                          <span>Test DNS in Workbench</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {f.category.includes('Internet') && (
                        <button
                          onClick={() => launchWorkbenchTool('traceroute', '1.1.1.1')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono hover:bg-emerald-900 transition flex items-center space-x-1.5"
                        >
                          <span>Traceroute to Internet Backbone</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Explain My Network — Deterministic Diagnostic Assistant (REQ-08) */}
      <div className="mt-8 p-6 rounded-2xl bg-[#091024]/90 border border-purple-500/30 shadow-xl">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono tracking-wider text-purple-200 uppercase">
              EXPLAIN MY NETWORK — DETERMINISTIC INTELLIGENCE ASSISTANT
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ask real-world questions in plain English. NETSPECTRE evaluates telemetry evidence to deliver deterministic, verified diagnosis and remediation.
            </p>
          </div>
        </div>

        {/* Quick Question Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            'Why is my internet slow?',
            'Which applications consume my bandwidth?',
            'Where is my data going?',
            'Why cannot my application connect?',
            'Is DNS resolving correctly?',
            'Is a firewall blocking my connections?',
          ].map((promptText) => (
            <button
              key={promptText}
              onClick={() => {
                setUserQuestion(promptText);
                handleAskQuestion(promptText);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#070b16] hover:bg-purple-950/60 border border-purple-500/20 hover:border-purple-400/40 text-purple-300 text-xs font-mono transition"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="mt-4 flex items-center space-x-2">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskQuestion();
            }}
            placeholder="Type any network troubleshooting question (e.g. Why is ping high?)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#070b16] border border-purple-500/30 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400"
          />
          <button
            onClick={() => handleAskQuestion()}
            disabled={isExplaining}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-purple-600/20 disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isExplaining ? 'ANALYZING...' : 'EXPLAIN'}</span>
          </button>
        </div>

        {/* Assistant Response Card */}
        {explainResult && (
          <div className="mt-5 p-5 rounded-xl bg-[#070b16] border border-purple-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-slate-200">
                  Question: &quot;{explainResult.question}&quot;
                </span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                  explainResult.status === 'HEALTHY'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : explainResult.status === 'DEGRADED'
                    ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                    : 'bg-rose-950 text-rose-300 border-rose-500/40'
                }`}
              >
                {explainResult.status}
              </span>
            </div>

            <div className="text-xs text-slate-200 font-mono leading-relaxed bg-[#0b1022] p-3.5 rounded-lg border border-cyan-500/20">
              <div className="font-bold text-cyan-300 uppercase tracking-wide text-[10px] mb-1">
                Verified Diagnostic Explanation:
              </div>
              {explainResult.answer}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Evidence Metrics */}
              {explainResult.evidence && explainResult.evidence.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#0b1022]/60 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Telemetry Evidence</span>
                  </div>
                  <ul className="space-y-1">
                    {explainResult.evidence.map((ev, i) => (
                      <li key={i} className="text-[11px] font-mono text-slate-300 flex items-start space-x-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Remediation Steps */}
              {explainResult.remediation && explainResult.remediation.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#0b1022]/60 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recommended Remediation</span>
                  </div>
                  <ul className="space-y-1">
                    {explainResult.remediation.map((rem, i) => (
                      <li key={i} className="text-[11px] font-mono text-slate-300 flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{rem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Bandwidth Consumers Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Active Bandwidth Consumers (Why is my data moving?)</span>
          </h2>
          <button
            onClick={() => setActiveScreen('applications')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
          >
            <span>View All Apps</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topApps.map((app) => (
            <div
              key={app.pid}
              className="p-4 rounded-xl bg-[#091024]/70 border border-cyan-500/20 hover:border-cyan-400/40 transition flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold font-mono text-slate-100 truncate max-w-[140px]">
                    {app.processName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">PID: {app.pid}</div>
                </div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getProcessColor(app.processName) }}
                ></div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Download:</span>
                  <span className="text-emerald-300 font-bold">{formatRate(app.currentRecvRate)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Upload:</span>
                  <span className="text-amber-300 font-bold">{formatRate(app.currentSendRate)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span>Active Flows:</span>
                  <span>{app.activeConnections}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
