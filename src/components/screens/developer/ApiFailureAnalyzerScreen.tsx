import React, { useState } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Server,
  Zap,
  RefreshCw,
  Search,
} from 'lucide-react';

interface CommonFailureScenario {
  id: string;
  category: string;
  title: string;
  symptom: string;
  rootCause: string;
  solutionSteps: string[];
}

const FAILURE_KNOWLEDGE_BASE: CommonFailureScenario[] = [
  {
    id: 'dns_fail',
    category: 'DNS Resolution',
    title: 'DNS_NAME_NOT_RESOLVED (NXDOMAIN)',
    symptom: 'Fetch / Axios throws "ENOTFOUND" or "NameResolutionFailure" before any TCP connection occurs.',
    rootCause: 'The domain does not exist in public DNS records, or the local machine DNS resolver returned an NXDOMAIN response.',
    solutionSteps: [
      'Verify the hostname spelling in your environment config (.env).',
      'Test resolution with NETSPECTRE Workbench DNS tool to confirm A / CNAME records.',
      'Check if internal VPN is required for private domains (*.internal.corp).',
      'Flush local DNS cache with: ipconfig /flushdns',
    ],
  },
  {
    id: 'conn_refused',
    category: 'TCP Transport',
    title: 'TCP Connection Refused (ECONNREFUSED)',
    symptom: 'Request immediately aborts within milliseconds with "Connection Refused".',
    rootCause: 'The destination IP is reachable, but no process or reverse proxy (Nginx/Envoy) is listening on the target port.',
    solutionSteps: [
      'Verify target port number (e.g. 80 vs 443 vs 8080 vs 3000).',
      'Check if local or backend service process crashed or failed to bind to 0.0.0.0.',
      'Test port reachability using NETSPECTRE Workbench Port Tester.',
    ],
  },
  {
    id: 'tls_handshake',
    category: 'TLS / SSL Security',
    title: 'SSL / TLS Certificate Validation Failed (CERT_HAS_EXPIRED)',
    symptom: 'Request fails during handshake with "certificate has expired" or "self-signed certificate".',
    rootCause: 'The server SSL certificate date is expired, hostname does not match SANs, or CA root certificate is not in Windows Trust Store.',
    solutionSteps: [
      'Inspect certificate validity using NETSPECTRE Workbench TLS Certificate Inspector.',
      'Renew certificate via Let\'s Encrypt / Certbot on the server.',
      'For local development, install self-signed root cert into Windows Trusted Root CA store.',
    ],
  },
  {
    id: 'cors_blocked',
    category: 'Browser / HTTP Protocol',
    title: 'CORS Preflight Blocked (Missing Access-Control-Allow-Origin)',
    symptom: 'Browser client blocks response while Postman or cURL succeeds.',
    rootCause: 'The backend API did not respond with "Access-Control-Allow-Origin" during OPTIONS preflight.',
    solutionSteps: [
      'Configure backend middleware to allow your frontend origin (e.g. http://localhost:5173).',
      'Ensure OPTIONS preflight returns HTTP 200/204 with Access-Control-Allow-Methods and Headers.',
      'In production, route frontend and API through the same reverse proxy domain.',
    ],
  },
  {
    id: 'gateway_timeout',
    category: 'Upstream Reverse Proxy',
    title: 'HTTP 504 Gateway Timeout / 502 Bad Gateway',
    symptom: 'Client receives 502 or 504 after waiting 30-60 seconds.',
    rootCause: 'The edge reverse proxy (Cloudflare, AWS ALB, Nginx) was unable to connect to the backend container or microservice.',
    solutionSteps: [
      'Check container logs for backend microservice crash or memory limit (OOM).',
      'Inspect upstream proxy keepalive and proxy_pass timeout configuration.',
      'Verify internal VPC security groups and firewall routing between proxy and microservice.',
    ],
  },
];

export const ApiFailureAnalyzerScreen: React.FC = () => {
  const { enginePort, launchWorkbenchTool } = useNetworkStore();
  const [testUrl, setTestUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [activeScenario, setActiveScenario] = useState<CommonFailureScenario | null>(FAILURE_KNOWLEDGE_BASE[0]);
  const [liveDiagnosis, setLiveDiagnosis] = useState<any | null>(null);

  const handleTestUrl = async () => {
    if (!testUrl) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/api-inspector/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl, method: 'GET' }),
      });
      const data = await res.json();
      setLiveDiagnosis(data);
    } catch (err: any) {
      alert(`Test execution failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-400/40 text-amber-400 shadow-lg shadow-amber-500/10">
              <Bug className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-amber-300">
                API FAILURE ROOT-CAUSE ANALYZER
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic automated root-cause diagnosis for failed HTTP/HTTPS requests, CORS errors, and network disconnects.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Endpoint Diagnostic Input */}
      <div className="mt-6 p-5 rounded-2xl bg-[#091024]/80 border border-cyan-500/20">
        <div className="text-xs font-mono font-bold text-slate-200 mb-3 flex items-center space-x-2">
          <Search className="w-4 h-4 text-cyan-400" />
          <span>Diagnose Any Failing Endpoint URL</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://failing-api.example.com/api/v1/health"
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-[#070b16] border border-cyan-500/30 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleTestUrl}
            disabled={analyzing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'DIAGNOSING...' : 'RUN ROOT-CAUSE ANALYSIS'}</span>
          </button>
        </div>

        {liveDiagnosis && (
          <div className="mt-4 p-4 rounded-xl bg-[#070d1e] border border-cyan-500/30 space-y-2">
            <div className="flex items-center space-x-3">
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  liveDiagnosis.statusCode >= 200 && liveDiagnosis.statusCode < 300
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                }`}
              >
                {liveDiagnosis.statusCode || 'ERR'}
              </span>
              <span className="text-xs font-mono text-slate-200 font-semibold">{liveDiagnosis.url}</span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              <span className="text-slate-500">Root Cause:</span> {liveDiagnosis.rootCause || 'Endpoint is responding normally.'}
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Base of Developer Failure Scenarios */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Failure Categories */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Diagnostic Failure Catalog
          </div>
          {FAILURE_KNOWLEDGE_BASE.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveScenario(item)}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                activeScenario?.id === item.id
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-[#091024]/60 border-cyan-500/20 hover:border-cyan-400/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    activeScenario?.id === item.id ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <div>
                  <div className="text-xs font-mono font-bold text-slate-100">{item.title}</div>
                  <div className="text-[10px] font-mono text-slate-400">{item.category}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Detailed Remediation Playbook */}
        <div className="lg:col-span-7">
          {activeScenario && (
            <div className="p-6 rounded-2xl bg-[#091024]/90 border border-amber-500/30 space-y-5 shadow-xl">
              <div>
                <span className="text-[10px] font-mono uppercase bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                  {activeScenario.category}
                </span>
                <h2 className="text-base font-bold font-mono text-slate-100 mt-2">
                  {activeScenario.title}
                </h2>
              </div>

              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Observed Symptom
                </div>
                <div className="text-xs text-slate-200 bg-[#070b16] p-3 rounded-xl border border-cyan-500/20 leading-relaxed font-mono">
                  {activeScenario.symptom}
                </div>
              </div>

              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Technical Root Cause
                </div>
                <div className="text-xs text-amber-200 bg-amber-950/20 p-3 rounded-xl border border-amber-500/30 leading-relaxed">
                  {activeScenario.rootCause}
                </div>
              </div>

              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Step-by-Step Remediation Plan
                </div>
                <div className="space-y-2">
                  {activeScenario.solutionSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#070b16] border border-cyan-500/20 flex items-start space-x-3 text-xs text-slate-200 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
