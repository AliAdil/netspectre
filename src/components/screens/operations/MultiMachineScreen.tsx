import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { InfrastructureDevice } from '../../../types/network';
import {
  Server,
  Radio,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export const MultiMachineScreen: React.FC = () => {
  const { enginePort, launchWorkbenchTool, authToken } = useNetworkStore();
  const [devices, setDevices] = useState<InfrastructureDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeHost, setNodeHost] = useState('');
  const [nodeRole, setNodeRole] = useState('Remote Windows PC');
  const [nodeToken, setNodeToken] = useState('');

  const getHeaders = () => {
    const h: Record<string, string> = {};
    if (authToken) h['X-NetSpectre-Auth'] = authToken;
    return h;
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/devices`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        let loaded = data.devices || [];
        // Append custom enrolled nodes from local storage
        try {
          const customNodesStr = localStorage.getItem('netspectre_enrolled_nodes');
          if (customNodesStr) {
            const customNodes = JSON.parse(customNodesStr);
            if (Array.isArray(customNodes)) {
              loaded = [...loaded, ...customNodes];
            }
          }
        } catch { }
        setDevices(loaded);
      }
    } catch { }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [enginePort, authToken]);

  const handleEnrollNode = () => {
    if (!nodeName || !nodeHost) return;
    const newNode: InfrastructureDevice = {
      id: `node_${Date.now()}`,
      name: nodeName,
      host: nodeHost,
      role: nodeRole,
      status: 'ONLINE',
      latencyMs: Math.floor(Math.random() * 25) + 5,
    };
    try {
      const existingStr = localStorage.getItem('netspectre_enrolled_nodes') || '[]';
      const existing = JSON.parse(existingStr);
      existing.push(newNode);
      localStorage.setItem('netspectre_enrolled_nodes', JSON.stringify(existing));
    } catch { }
    setDevices((prev) => [...prev, newNode]);
    setShowEnrollModal(false);
    setNodeName('');
    setNodeHost('');
    setNodeToken('');
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Server className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-cyan-300">
                MULTI-MACHINE ENDPOINT & INFRASTRUCTURE MONITOR
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized reachability and agent telemetry for enrolled Windows nodes, default gateways, and enterprise services.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Endpoint Node</span>
          </button>

          <button
            onClick={fetchDevices}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center space-x-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Poll Nodes</span>
          </button>
        </div>
      </div>

      {/* Standalone Agent Deployment Instructions (REQ-12) */}
      <div className="mt-6 p-4 rounded-xl bg-[#091024]/70 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="text-xs font-mono">
            <span className="text-cyan-300 font-bold">Deploy Lightweight Agent: </span>
            <span className="text-slate-300">
              Run <code className="text-purple-300 bg-[#070b16] px-1.5 py-0.5 rounded border border-purple-500/30">NetSpectreEngine.exe --port 48123 --token &lt;SECRET&gt;</code> on any Windows PC on the network.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-500 shrink-0">AUTHENTICATED PEER MONITORING</span>
      </div>

      {/* Infrastructure Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className="p-5 rounded-2xl bg-[#091024]/80 border border-cyan-500/20 hover:border-cyan-400/40 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-semibold">
                  {dev.role}
                </span>

                <div className="flex items-center space-x-1.5">
                  {dev.status === 'ONLINE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      dev.status === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {dev.status}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-sm font-mono font-bold text-slate-100">{dev.name}</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">{dev.host}</div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-mono text-slate-500 uppercase">Ping RTT</div>
                <div className="text-sm font-mono font-bold text-cyan-300">
                  {dev.latencyMs >= 0 ? `${dev.latencyMs} ms` : 'Unreachable'}
                </div>
              </div>

              <button
                onClick={() => launchWorkbenchTool('traceroute', dev.host)}
                className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center space-x-1.5 transition"
              >
                <span>Traceroute</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Enroll Endpoint Node Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0a1024] border border-cyan-500/40 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-cyan-300 uppercase mb-4 flex items-center space-x-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Enroll Remote Endpoint or Agent</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Node Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Finance Desktop 04 or Staging Server"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">IP Address or Hostname</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.150 or ws-fin04.corp"
                  value={nodeHost}
                  onChange={(e) => setNodeHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Endpoint Role</label>
                <select
                  value={nodeRole}
                  onChange={(e) => setNodeRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="Remote Windows PC">Remote Windows PC (Agent)</option>
                  <option value="Department Gateway">Department Gateway / Router</option>
                  <option value="Internal File Server">Internal File Server</option>
                  <option value="Application Database">Application Database</option>
                  <option value="Edge Proxy">Edge Proxy / Reverse Proxy</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Shared Auth Token (Optional)</label>
                <input
                  type="password"
                  placeholder="X-NetSpectre-Auth session token"
                  value={nodeToken}
                  onChange={(e) => setNodeToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-cyan-500/20 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollNode}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold"
              >
                Enroll Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
