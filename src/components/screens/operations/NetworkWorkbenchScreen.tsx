import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import {
  PingResult,
  TracerouteResult,
  DnsLookupResult,
  PortTestResult,
  TlsInspectResult,
  RouteEntry,
  AdapterDetail,
} from '../../../types/network';
import {
  Wrench,
  Radio,
  Share2,
  Zap,
  Globe,
  Lock,
  Route,
  Cpu,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Download,
} from 'lucide-react';

export const NetworkWorkbenchScreen: React.FC = () => {
  const {
    enginePort,
    workbenchTarget,
    setWorkbenchTarget,
    workbenchActiveTool,
    setWorkbenchActiveTool,
  } = useNetworkStore();

  const [target, setTarget] = useState(workbenchTarget || '1.1.1.1');
  const [port, setPort] = useState(443);
  const [loading, setLoading] = useState(false);

  // Results
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [traceResult, setTraceResult] = useState<TracerouteResult | null>(null);
  const [dnsResult, setDnsResult] = useState<DnsLookupResult | null>(null);
  const [portResult, setPortResult] = useState<PortTestResult | null>(null);
  const [tlsResult, setTlsResult] = useState<TlsInspectResult | null>(null);
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [adapters, setAdapters] = useState<AdapterDetail[]>([]);

  // Sync target when store updates
  useEffect(() => {
    if (workbenchTarget) {
      setTarget(workbenchTarget);
    }
  }, [workbenchTarget]);

  // Load routes or adapters on tab switch
  useEffect(() => {
    if (workbenchActiveTool === 'routes') {
      fetchRoutes();
    } else if (workbenchActiveTool === 'adapters') {
      fetchAdapters();
    }
  }, [workbenchActiveTool, enginePort]);

  const runPing = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/ping?target=${encodeURIComponent(target)}&count=4`);
      if (res.ok) setPingResult(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  const runTraceroute = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/traceroute?target=${encodeURIComponent(target)}&maxHops=18`);
      if (res.ok) setTraceResult(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  const runDns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/dns?host=${encodeURIComponent(target)}&type=A`);
      if (res.ok) setDnsResult(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  const runPortTest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/port?host=${encodeURIComponent(target)}&port=${port}&timeout=2500`);
      if (res.ok) setPortResult(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  const runTlsInspect = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/tls?host=${encodeURIComponent(target)}&port=${port}`);
      if (res.ok) setTlsResult(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/routes`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch { }
    finally { setLoading(false); }
  };

  const fetchAdapters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/workbench/adapters`);
      if (res.ok) {
        const data = await res.json();
        setAdapters(data.adapters || []);
      }
    } catch { }
    finally { setLoading(false); }
  };

  const handleExecuteActiveTool = () => {
    switch (workbenchActiveTool) {
      case 'ping': runPing(); break;
      case 'traceroute': runTraceroute(); break;
      case 'dns': runDns(); break;
      case 'port': runPortTest(); break;
      case 'tls': runTlsInspect(); break;
      case 'routes': fetchRoutes(); break;
      case 'adapters': fetchAdapters(); break;
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070b16] p-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Wrench className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide font-mono text-cyan-300">
                NETWORK TROUBLESHOOTING WORKBENCH
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-protocol diagnostics suite: Ping, Traceroute, DNS Inspector, TCP Port Prober, TLS Certificate Inspector, Routing & Adapters.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workbench Tools Segmented Navigation */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[
          { id: 'ping', label: 'Ping Test', icon: Radio },
          { id: 'traceroute', label: 'Traceroute', icon: Share2 },
          { id: 'dns', label: 'DNS Inspector', icon: Globe },
          { id: 'port', label: 'TCP Port Prober', icon: Zap },
          { id: 'tls', label: 'TLS Cert Inspector', icon: Lock },
          { id: 'routes', label: 'Routing Table', icon: Route },
          { id: 'adapters', label: 'Adapter & MTU', icon: Cpu },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = workbenchActiveTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setWorkbenchActiveTool(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center space-x-2 transition ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#091024]/70 border border-cyan-500/20 text-slate-400 hover:text-slate-200 hover:border-cyan-500/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Target Input & Action Bar (For tools that take a host target) */}
      {workbenchActiveTool !== 'routes' && workbenchActiveTool !== 'adapters' && (
        <div className="mt-6 p-4 rounded-2xl bg-[#091024]/80 border border-cyan-500/20 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setWorkbenchTarget(e.target.value);
              }}
              placeholder="Target Host or IP (e.g. 1.1.1.1, google.com, api.github.com)"
              className="w-full px-4 py-2.5 rounded-xl bg-[#070b16] border border-cyan-500/30 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {(workbenchActiveTool === 'port' || workbenchActiveTool === 'tls') && (
            <div className="w-full sm:w-28">
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="Port"
                className="w-full px-3 py-2.5 rounded-xl bg-[#070b16] border border-cyan-500/30 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <button
            onClick={handleExecuteActiveTool}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-pulse' : ''}`} />
            <span>{loading ? 'EXECUTING...' : 'RUN DIAGNOSTIC'}</span>
          </button>
        </div>
      )}

      {/* TOOL 1: PING RESULTS */}
      {workbenchActiveTool === 'ping' && (
        <div className="mt-6 space-y-4">
          {pingResult ? (
            <div className="p-5 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 shadow-xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-cyan-500/20">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Min Latency</div>
                  <div className="text-base font-mono font-bold text-emerald-300">{pingResult.minRttMs} ms</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Avg Latency</div>
                  <div className="text-base font-mono font-bold text-cyan-300">{pingResult.avgRttMs} ms</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Max Latency</div>
                  <div className="text-base font-mono font-bold text-amber-300">{pingResult.maxRttMs} ms</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Jitter / Loss</div>
                  <div className="text-base font-mono font-bold text-slate-200">
                    {pingResult.jitterMs}ms / <span className="text-emerald-400">{pingResult.packetLossPct}% loss</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-300">Packet Response Sequence:</div>
                {pingResult.hops.map((h) => (
                  <div
                    key={h.seq}
                    className="p-2.5 rounded-lg bg-[#070b16] border border-cyan-500/10 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-500">#{h.seq}</span>
                      <span className="text-slate-200">{pingResult.resolvedIp}</span>
                      <span className="text-slate-500 text-[10px]">TTL={h.ttl}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">{h.rttMs} ms</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Enter target host or IP and click "RUN DIAGNOSTIC" to execute real Windows ICMP ping.
            </div>
          )}
        </div>
      )}

      {/* TOOL 2: TRACEROUTE RESULTS */}
      {workbenchActiveTool === 'traceroute' && (
        <div className="mt-6 space-y-4">
          {traceResult ? (
            <div className="p-5 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 shadow-xl space-y-3">
              <div className="text-xs font-mono font-bold text-cyan-300 mb-2">
                Route Path to {traceResult.target} ({traceResult.resolvedIp}):
              </div>
              {traceResult.hops.map((hop) => (
                <div
                  key={hop.hop}
                  className="p-3 rounded-lg bg-[#070b16] border border-cyan-500/10 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 text-slate-500 font-bold">#{hop.hop}</span>
                    <span className="text-slate-200 font-semibold">{hop.ip}</span>
                    <span className="text-slate-400 text-[11px] truncate max-w-[280px]">
                      {hop.hostname !== '*' ? `(${hop.hostname})` : ''}
                    </span>
                  </div>
                  <div>
                    {hop.status === 'TimedOut' ? (
                      <span className="text-slate-500">* * * Request Timed Out</span>
                    ) : (
                      <span className="text-cyan-300 font-bold">{hop.rttMs} ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Enter target and click "RUN DIAGNOSTIC" to trace real network hops.
            </div>
          )}
        </div>
      )}

      {/* TOOL 3: DNS INSPECTOR RESULTS */}
      {workbenchActiveTool === 'dns' && (
        <div className="mt-6 space-y-4">
          {dnsResult ? (
            <div className="p-5 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 text-xs font-mono">
                <div>
                  Canonical Name: <span className="text-cyan-300 font-bold">{dnsResult.canonicalName}</span>
                </div>
                <div className="text-slate-400">
                  Lookup Duration: <span className="text-purple-300 font-bold">{dnsResult.queryTimeMs} ms</span>
                </div>
              </div>

              <div className="space-y-2">
                {dnsResult.records.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#070b16] border border-cyan-500/10 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                      {rec.type}
                    </span>
                    <span className="text-slate-100 font-semibold">{rec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Enter domain and click "RUN DIAGNOSTIC" to query DNS records.
            </div>
          )}
        </div>
      )}

      {/* TOOL 4: TCP PORT PROBER */}
      {workbenchActiveTool === 'port' && (
        <div className="mt-6 space-y-4">
          {portResult ? (
            <div className="p-5 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 shadow-xl space-y-4">
              <div className="flex items-center space-x-3">
                {portResult.isOpen ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <div className="text-sm font-mono font-bold text-slate-100">
                    Port {portResult.port} on {portResult.host} is{' '}
                    <span className={portResult.isOpen ? 'text-emerald-400' : 'text-rose-400'}>
                      {portResult.isOpen ? 'OPEN / LISTENING' : 'CLOSED / FILTERED'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Connect Time: {portResult.connectTimeMs} ms
                  </div>
                </div>
              </div>

              {portResult.banner && (
                <div className="mt-3 p-3 rounded-lg bg-[#070b16] border border-cyan-500/20 text-xs font-mono">
                  <span className="text-slate-500">Service Banner: </span>
                  <span className="text-cyan-300">{portResult.banner}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Specify host and port to test TCP handshake reachability.
            </div>
          )}
        </div>
      )}

      {/* TOOL 5: TLS CERTIFICATE INSPECTOR */}
      {workbenchActiveTool === 'tls' && (
        <div className="mt-6 space-y-4">
          {tlsResult ? (
            <div className="p-5 rounded-2xl bg-[#091024]/90 border border-cyan-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {tlsResult.protocol} Handshake Successful ({tlsResult.handshakeTimeMs} ms)
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  Status:{' '}
                  <span className={tlsResult.isExpired ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                    {tlsResult.isExpired ? 'EXPIRED' : `${tlsResult.daysRemaining} days remaining`}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#070b16] border border-cyan-500/10">
                  <div className="text-slate-500 text-[10px] uppercase">Subject</div>
                  <div className="text-slate-200">{tlsResult.subject}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#070b16] border border-cyan-500/10">
                  <div className="text-slate-500 text-[10px] uppercase">Issuer</div>
                  <div className="text-slate-200">{tlsResult.issuer}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#070b16] border border-cyan-500/10">
                  <div className="text-slate-500 text-[10px] uppercase">Cipher Suite</div>
                  <div className="text-cyan-300">{tlsResult.cipherSuite}</div>
                </div>
                {tlsResult.sans && (
                  <div className="p-3 rounded-lg bg-[#070b16] border border-cyan-500/10">
                    <div className="text-slate-500 text-[10px] uppercase">Subject Alternative Names (SANs)</div>
                    <div className="text-slate-300 break-all">{tlsResult.sans}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Enter hostname and click "RUN DIAGNOSTIC" to inspect remote TLS certificate chain.
            </div>
          )}
        </div>
      )}

      {/* TOOL 6: ROUTING TABLE */}
      {workbenchActiveTool === 'routes' && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
              Windows IPv4 Routing Table ({routes.length} routes)
            </span>
            <button
              onClick={fetchRoutes}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-cyan-500/20">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-[#091024] text-slate-400 border-b border-cyan-500/20">
                <tr>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Netmask</th>
                  <th className="p-3">Gateway</th>
                  <th className="p-3">Interface</th>
                  <th className="p-3">Metric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-[#070b16]">
                {routes.map((r, idx) => (
                  <tr key={idx} className="hover:bg-cyan-950/20">
                    <td className="p-3 text-cyan-300 font-bold">{r.destination}</td>
                    <td className="p-3 text-slate-400">{r.netmask}</td>
                    <td className="p-3 text-emerald-300">{r.gateway}</td>
                    <td className="p-3 text-slate-300">{r.interface}</td>
                    <td className="p-3 text-slate-400">{r.metric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOOL 7: ADAPTER & MTU */}
      {workbenchActiveTool === 'adapters' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
              Physical & Virtual Adapters ({adapters.length})
            </span>
            <button
              onClick={fetchAdapters}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adapters.map((ad) => (
              <div
                key={ad.id}
                className="p-5 rounded-2xl bg-[#091024]/80 border border-cyan-500/20 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-slate-100">{ad.name}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      ad.status === 'Up' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {ad.status}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 truncate">{ad.description}</div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">MAC Address:</span>
                    <span className="text-slate-300">{ad.macAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Link Speed:</span>
                    <span className="text-cyan-300 font-bold">{ad.speedMbps} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IPv4 Address:</span>
                    <span className="text-emerald-300">{ad.ipv4.join(', ') || 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gateway:</span>
                    <span className="text-slate-300">{ad.gateways.join(', ') || 'None'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
