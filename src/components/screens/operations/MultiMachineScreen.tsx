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
  const { enginePort, launchWorkbenchTool } = useNetworkStore();
  const [devices, setDevices] = useState<InfrastructureDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch { }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [enginePort]);

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
                INFRASTRUCTURE & MULTI-DEVICE MONITOR
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized reachability telemetry for local default gateways, DNS clusters, enterprise servers, and cloud endpoints.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchDevices}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Poll Infrastructure</span>
        </button>
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
    </div>
  );
};
