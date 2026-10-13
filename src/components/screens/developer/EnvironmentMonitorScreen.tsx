import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { EnvEndpoint } from '../../../types/network';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  Trash2,
} from 'lucide-react';

const INITIAL_ENVIRONMENTS: EnvEndpoint[] = [
  {
    id: 'env_1',
    name: 'Production API Gateway',
    env: 'PROD',
    url: 'api.github.com',
    status: 'ONLINE',
    latencyMs: 24,
    tlsDaysRemaining: 184,
  },
  {
    id: 'env_2',
    name: 'Staging Cloudflare Edge',
    env: 'UAT',
    url: 'cloudflare.com',
    status: 'ONLINE',
    latencyMs: 16,
    tlsDaysRemaining: 98,
  },
  {
    id: 'env_3',
    name: 'SIT Integration Service',
    env: 'SIT',
    url: 'httpbin.org',
    status: 'ONLINE',
    latencyMs: 62,
    tlsDaysRemaining: 240,
  },
  {
    id: 'env_4',
    name: 'Dev Local Service',
    env: 'DEV',
    url: '127.0.0.1:48123',
    status: 'ONLINE',
    latencyMs: 1,
    tlsDaysRemaining: 365,
  },
];

export const EnvironmentMonitorScreen: React.FC = () => {
  const { enginePort, launchWorkbenchTool, authToken } = useNetworkStore();
  const [endpoints, setEndpoints] = useState<EnvEndpoint[]>(INITIAL_ENVIRONMENTS);
  const [refreshing, setRefreshing] = useState(false);
  const [filterEnv, setFilterEnv] = useState<'ALL' | 'DEV' | 'SIT' | 'UAT' | 'PROD'>('ALL');

  // New endpoint modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEnv, setNewEnv] = useState<'DEV' | 'SIT' | 'UAT' | 'PROD'>('DEV');

  const getHeaders = (hasBody = false) => {
    const h: Record<string, string> = {};
    if (hasBody) h['Content-Type'] = 'application/json';
    if (authToken) h['X-NetSpectre-Auth'] = authToken;
    return h;
  };

  const loadEndpoints = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/env-monitor/endpoints`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.endpoints && data.endpoints.length > 0) {
          setEndpoints(data.endpoints);
        }
      }
    } catch { }
  };

  useEffect(() => {
    loadEndpoints();
  }, [enginePort, authToken]);

  const saveEndpointsToBackend = async (eps: EnvEndpoint[]) => {
    try {
      await fetch(`http://127.0.0.1:${enginePort}/api/env-monitor/save`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(eps),
      });
    } catch { }
  };

  const checkEndpoint = async (ep: EnvEndpoint) => {
    try {
      const cleanHost = ep.url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/port?host=${cleanHost}&port=443&timeout=2000`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          ...ep,
          status: (data.isOpen ? 'ONLINE' : 'DEGRADED') as any,
          latencyMs: data.connectTimeMs,
        };
      }
    } catch { }
    return ep;
  };

  const refreshAll = async () => {
    setRefreshing(true);
    const updated = await Promise.all(endpoints.map((ep) => checkEndpoint(ep)));
    setEndpoints(updated);
    setRefreshing(false);
    saveEndpointsToBackend(updated);
  };

  const handleAddEndpoint = () => {
    if (!newName || !newUrl) return;
    const newEp: EnvEndpoint = {
      id: `env_${Date.now()}`,
      name: newName,
      url: newUrl,
      env: newEnv,
      status: 'CHECKING',
      latencyMs: 0,
      tlsDaysRemaining: 90,
    };
    const updated = [newEp, ...endpoints];
    setEndpoints(updated);
    saveEndpointsToBackend(updated);
    setShowAddModal(false);
    setNewName('');
    setNewUrl('');
    checkEndpoint(newEp).then((checked) => {
      setEndpoints((prev) => {
        const list = prev.map((e) => (e.id === newEp.id ? checked : e));
        saveEndpointsToBackend(list);
        return list;
      });
    });
  };

  const handleDeleteEndpoint = (id: string) => {
    if (!confirm('Remove this environment endpoint from monitoring?')) return;
    const updated = endpoints.filter((e) => e.id !== id);
    setEndpoints(updated);
    saveEndpointsToBackend(updated);
  };

  const filteredEndpoints =
    filterEnv === 'ALL' ? endpoints : endpoints.filter((e) => e.env === filterEnv);

  const getEnvBadgeColor = (env: string) => {
    switch (env) {
      case 'PROD':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      case 'UAT':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'SIT':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      default:
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-400/40 text-purple-400 shadow-lg shadow-purple-500/10">
              <Server className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-purple-300">
                ENVIRONMENT HEALTH MONITOR (DEV / SIT / UAT / PROD)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-stage application endpoint tracker with reachability telemetry, round-trip latency, and SSL certificate expiry.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold flex items-center space-x-2 transition shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Endpoint</span>
          </button>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center space-x-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex items-center space-x-2">
        {(['ALL', 'PROD', 'UAT', 'SIT', 'DEV'] as const).map((e) => (
          <button
            key={e}
            onClick={() => setFilterEnv(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              filterEnv === e
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {e} ({e === 'ALL' ? endpoints.length : endpoints.filter((item) => item.env === e).length})
          </button>
        ))}
      </div>

      {/* Endpoints Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredEndpoints.map((ep) => (
          <div
            key={ep.id}
            className="p-5 rounded-2xl bg-[#091024]/80 border border-cyan-500/20 hover:border-cyan-400/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getEnvBadgeColor(
                      ep.env
                    )}`}
                  >
                    {ep.env}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-100">{ep.name}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {ep.status === 'ONLINE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : ep.status === 'DEGRADED' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      ep.status === 'ONLINE'
                        ? 'text-emerald-400'
                        : ep.status === 'DEGRADED'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {ep.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-[11px] font-mono text-slate-400 truncate">
                Host / URL: <span className="text-cyan-300">{ep.url}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Response RTT</div>
                  <div className="text-xs font-mono font-bold text-emerald-300">{ep.latencyMs} ms</div>
                </div>

                <div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase">SSL Expiry</div>
                  <div className="text-xs font-mono font-bold text-purple-300 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    <span>{ep.tlsDaysRemaining ? `${ep.tlsDaysRemaining} days` : 'Valid'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => launchWorkbenchTool('tls', ep.url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0])}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono hover:bg-cyan-900 transition"
                  title="Inspect TLS Certificate in Workbench"
                >
                  TLS Cert
                </button>
                <button
                  onClick={() => launchWorkbenchTool('ping', ep.url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0])}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-mono hover:bg-purple-900 transition"
                  title="Test Ping in Workbench"
                >
                  Ping
                </button>
                <button
                  onClick={() => handleDeleteEndpoint(ep.id)}
                  className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-500/30 hover:bg-rose-900 transition"
                  title="Remove Endpoint"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Endpoint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0a1024] border border-cyan-500/40 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-cyan-300 uppercase mb-4">
              Add New Monitored Environment Endpoint
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Payments Microservice"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Host / URL</label>
                <input
                  type="text"
                  placeholder="e.g. api.payments.dev.corp or 10.0.1.50"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Environment Tier</label>
                <select
                  value={newEnv}
                  onChange={(e) => setNewEnv(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="DEV">DEV (Development)</option>
                  <option value="SIT">SIT (System Integration Testing)</option>
                  <option value="UAT">UAT (User Acceptance Testing / Staging)</option>
                  <option value="PROD">PROD (Production)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEndpoint}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold"
              >
                Add Endpoint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
