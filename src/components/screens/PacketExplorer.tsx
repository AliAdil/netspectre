import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import { formatTimestamp, formatBytes } from '../../utils/formatters';
import {
  Binary,
  Download,
  Pause,
  Play,
  Filter,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  FileCode,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export const PacketExplorer: React.FC = () => {
  const {
    packetSamples,
    isPaused,
    togglePause,
    enginePort,
    authToken
  } = useNetworkStore();

  const [captureMode, setCaptureMode] = useState<'MODE_1' | 'MODE_2'>('MODE_1');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [selectedPacket, setSelectedPacket] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  // Mode 2 state
  const [isElevated, setIsElevated] = useState(false);
  const [rawCaptureState, setRawCaptureState] = useState<'IDLE' | 'RUNNING' | 'UNAVAILABLE' | 'ERROR'>('IDLE');
  const [rawStatusMsg, setRawStatusMsg] = useState('Checking raw socket privileges...');
  const [rawPackets, setRawPackets] = useState<any[]>([]);
  const [showPcapNotice, setShowPcapNotice] = useState(false);

  // Poll capture status
  const fetchStatus = async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['X-NetSpectre-Auth'] = authToken;
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/capture/status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setIsElevated(data.isElevated);
        setRawCaptureState(data.state);
        setRawStatusMsg(data.statusMessage);
      }
    } catch (e) {}
  };

  const fetchRawPackets = async () => {
    if (captureMode !== 'MODE_2' || isPaused) return;
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['X-NetSpectre-Auth'] = authToken;
      const res = await fetch(`http://127.0.0.1:${enginePort}/api/capture/packets?limit=150`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.packets) setRawPackets(data.packets);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      if (captureMode === 'MODE_2') fetchRawPackets();
    }, 1500);
    return () => clearInterval(interval);
  }, [enginePort, authToken, captureMode, isPaused]);

  const handleStartCapture = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['X-NetSpectre-Auth'] = authToken;
      await fetch(`http://127.0.0.1:${enginePort}/api/capture/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      fetchStatus();
    } catch (e) {}
  };

  const handleStopCapture = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['X-NetSpectre-Auth'] = authToken;
      await fetch(`http://127.0.0.1:${enginePort}/api/capture/stop`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      fetchStatus();
    } catch (e) {}
  };

  const handleExportPcap = () => {
    if (captureMode === 'MODE_1') {
      setShowPcapNotice(true);
      return;
    }
    const tokenQuery = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    window.open(`http://127.0.0.1:${enginePort}/api/pcap/export${tokenQuery}`, '_blank');
  };

  const currentList = captureMode === 'MODE_1' ? packetSamples : rawPackets;

  const filteredPackets = currentList.filter((p) => {
    if (captureMode === 'MODE_1' && filterDirection !== 'ALL' && p.direction !== filterDirection) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.sourceIp && p.sourceIp.includes(q)) ||
      (p.destIp && p.destIp.includes(q)) ||
      (p.processName && p.processName.toLowerCase().includes(q)) ||
      (p.sourcePort && p.sourcePort.toString().includes(q)) ||
      (p.destPort && p.destPort.toString().includes(q)) ||
      (p.protocol && p.protocol.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Binary className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
              NETWORK PACKET & FLOW EXPLORER
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
              {captureMode === 'MODE_1' ? 'MODE 1: WIN32 FLOWS' : 'MODE 2: RAW WIRE SNIFFER'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cryptographically honest packet inspection — zero synthetic frames generated
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-3">
          {/* Capture Mode Toggle */}
          <div className="flex bg-[#0a0f1d] border border-cyan-500/30 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setCaptureMode('MODE_1')}
              className={`px-3 py-1 rounded transition ${
                captureMode === 'MODE_1'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mode 1 (Win32 Flows)
            </button>
            <button
              onClick={() => setCaptureMode('MODE_2')}
              className={`px-3 py-1 rounded transition flex items-center space-x-1 ${
                captureMode === 'MODE_2'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Mode 2 (Raw Wire)</span>
            </button>
          </div>

          {/* Pause / Resume */}
          <button
            onClick={togglePause}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition ${
              isPaused
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-[#0a0f1d] border-cyan-500/20 text-slate-300 hover:text-cyan-300'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME STREAM' : 'FREEZE'}</span>
          </button>

          {/* Wireshark PCAP Export */}
          <button
            onClick={handleExportPcap}
            className="px-3.5 py-1.5 rounded-lg bg-[#0d162d] hover:bg-[#122044] border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-cyan-950/50"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT PCAP (WIRESHARK)</span>
          </button>
        </div>
      </div>

      {/* Mode Disclosures & Capability Banner */}
      {captureMode === 'MODE_1' ? (
        <div className="mt-3 px-4 py-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-xs font-mono text-cyan-300">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Mode 1 Active:</strong> Displaying Win32 IP Helper socket flow events (TCP/UDP state transitions & byte delta samples). Standard user permissions.
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Zero driver dependencies required</span>
        </div>
      ) : (
        <div className={`mt-3 px-4 py-2.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
          isElevated
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
        }`}>
          <div className="flex items-center space-x-2">
            {isElevated ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>
              {isElevated ? (
                <><strong>Mode 2 Administrator Confirmed:</strong> Raw socket sniffing (SIO_RCVALL) enabled. Capturing genuine wire frames.</>
              ) : (
                <><strong>Mode 2 Unavailable:</strong> Deep packet sniffing requires Windows Administrator elevation. Run NETSPECTRE as Administrator to capture raw wire frames.</>
              )}
            </span>
          </div>
          {isElevated && (
            <div className="flex items-center space-x-2">
              {rawCaptureState === 'RUNNING' ? (
                <button
                  onClick={handleStopCapture}
                  className="px-2.5 py-1 rounded bg-rose-950 border border-rose-500 text-rose-300 text-[11px]"
                >
                  STOP WIRE SNIFFER
                </button>
              ) : (
                <button
                  onClick={handleStartCapture}
                  className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 text-[11px]"
                >
                  START WIRE SNIFFER
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* PCAP Mode 1 Notice Modal */}
      {showPcapNotice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-cyan-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl font-mono">
            <div className="flex items-center space-x-2 text-amber-400 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base">PCAP Export Cryptographic Disclosure</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              NETSPECTRE adheres to strict cryptographic truthfulness: <strong>it will never generate synthetic or fake Ethernet/IP frames from socket metadata.</strong>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              To export genuine wire capture files for Wireshark, switch to <strong>Mode 2 (Raw Wire)</strong> while running NETSPECTRE with Windows Administrator privileges.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowPcapNotice(false)}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
              >
                UNDERSTOOD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-3 py-2 bg-[#090e1c] border border-cyan-500/20 rounded-lg">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-cyan-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by IP, process, port, or protocol..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>

        {captureMode === 'MODE_1' && (
          <div className="flex items-center space-x-2 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-2 py-0.5 rounded ${filterDirection === 'ALL' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterDirection('INCOMING')}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 ${filterDirection === 'INCOMING' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}
            >
              <ArrowDownLeft className="w-3 h-3 text-cyan-400" />
              <span>IN</span>
            </button>
            <button
              onClick={() => setFilterDirection('OUTGOING')}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 ${filterDirection === 'OUTGOING' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400'}`}
            >
              <ArrowUpRight className="w-3 h-3 text-purple-400" />
              <span>OUT</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Split: Stream Table & Dissection Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 mt-3 overflow-hidden">
        {/* Packets Stream Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md shadow-xl">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 bg-[#0c1428] text-slate-400 text-[11px] border-b border-cyan-500/20 uppercase tracking-wider z-10">
              <tr>
                <th className="p-3">Time</th>
                {captureMode === 'MODE_1' && <th className="p-3">Dir</th>}
                <th className="p-3">Source Endpoint</th>
                <th className="p-3">Destination Endpoint</th>
                <th className="p-3">Proto</th>
                <th className="p-3">Length</th>
                <th className="p-3">{captureMode === 'MODE_1' ? 'Process' : 'TTL'}</th>
                <th className="p-3">Flags / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {captureMode === 'MODE_1'
                      ? 'Listening for socket flow events... Generate network traffic to sample.'
                      : isElevated
                      ? 'Raw wire sniffer is idle. Click "START WIRE SNIFFER" above to begin capturing.'
                      : 'Raw wire sniffer unavailable without Administrator elevation.'}
                  </td>
                </tr>
              ) : (
                filteredPackets.map((pkt) => {
                  const isSelected = selectedPacket?.id === pkt.id;
                  const isIncoming = pkt.direction === 'INCOMING';

                  return (
                    <tr
                      key={pkt.id}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`cursor-pointer transition hover:bg-cyan-950/30 ${
                        isSelected ? 'bg-cyan-950/50 border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      <td className="p-3 text-slate-400">{formatTimestamp(pkt.timestamp)}</td>
                      {captureMode === 'MODE_1' && (
                        <td className="p-3">
                          {isIncoming ? (
                            <span className="flex items-center text-cyan-400">
                              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> IN
                            </span>
                          ) : (
                            <span className="flex items-center text-purple-400">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> OUT
                            </span>
                          )}
                        </td>
                      )}
                      <td className="p-3 text-slate-200">
                        {pkt.sourceIp}:{pkt.sourcePort}
                      </td>
                      <td className="p-3 text-slate-200">
                        {pkt.destIp}:{pkt.destPort}
                      </td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pkt.protocol === 'TCP'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        }`}>
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{pkt.length} B</td>
                      <td className="p-3 text-slate-300 truncate max-w-[120px]">
                        {captureMode === 'MODE_1' ? pkt.processName : `TTL=${pkt.ttl || 64}`}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">{pkt.flags || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Packet Inspector Drawer */}
        <div className="w-full lg:w-96 rounded-xl border border-cyan-500/20 bg-[#090e1c]/90 backdrop-blur-md p-4 flex flex-col font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                FRAME DISSECTION INSPECTOR
              </h2>
            </div>
            {selectedPacket && (
              <span className="text-[10px] text-cyan-400">{selectedPacket.protocol}</span>
            )}
          </div>

          {selectedPacket ? (
            <div className="flex-1 overflow-auto space-y-4 mt-3 text-xs">
              {/* Layer 3: IP Layer */}
              <div className="bg-[#0c1428] p-3 rounded-lg border border-cyan-500/20">
                <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center justify-between">
                  <span>INTERNET PROTOCOL (IPv4)</span>
                  <span>Len: {selectedPacket.length}B</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-500">Source:</span> {selectedPacket.sourceIp}
                  </div>
                  <div>
                    <span className="text-slate-500">Dest:</span> {selectedPacket.destIp}
                  </div>
                  <div>
                    <span className="text-slate-500">Protocol:</span> {selectedPacket.protocol}
                  </div>
                  <div>
                    <span className="text-slate-500">TTL:</span> {selectedPacket.ttl || 64}
                  </div>
                </div>
              </div>

              {/* Layer 4: Transport Layer */}
              <div className="bg-[#0c1428] p-3 rounded-lg border border-cyan-500/20">
                <div className="text-[11px] font-bold text-purple-400 mb-2">
                  TRANSPORT LAYER ({selectedPacket.protocol})
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-500">Src Port:</span> {selectedPacket.sourcePort}
                  </div>
                  <div>
                    <span className="text-slate-500">Dst Port:</span> {selectedPacket.destPort}
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Flags:</span>{' '}
                    <span className="text-emerald-400">{selectedPacket.flags || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Layer 7: Process Attribution */}
              <div className="bg-[#0c1428] p-3 rounded-lg border border-cyan-500/20">
                <div className="text-[11px] font-bold text-emerald-400 mb-2">
                  PROCESS & KERNEL ATTRIBUTION
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-500">Process:</span> {selectedPacket.processName || 'Kernel Raw Socket'}
                  </div>
                  {selectedPacket.pid && (
                    <div>
                      <span className="text-slate-500">PID:</span> {selectedPacket.pid}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Capture Mode:</span> {captureMode === 'MODE_1' ? 'Win32 IP Helper Table' : 'Raw Wire SIO_RCVALL'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-6 text-xs">
              <Binary className="w-8 h-8 text-slate-600 mb-2" />
              <p>Select any packet in the stream to inspect IP header dissection and transport flags.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PacketExplorer;
