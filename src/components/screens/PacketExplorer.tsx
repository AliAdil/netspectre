import React, { useState } from 'react';
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
} from 'lucide-react';

export const PacketExplorer: React.FC = () => {
  const {
    packetSamples,
    isPaused,
    togglePause,
    enginePort,
  } = useNetworkStore();

  const [filterDirection, setFilterDirection] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [selectedPacket, setSelectedPacket] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const filteredPackets = packetSamples.filter((p) => {
    if (filterDirection !== 'ALL' && p.direction !== filterDirection) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.sourceIp.includes(q) ||
      p.destIp.includes(q) ||
      p.processName.toLowerCase().includes(q) ||
      p.sourcePort.toString().includes(q) ||
      p.destPort.toString().includes(q)
    );
  });

  const handleExportPcap = () => {
    window.open(`http://127.0.0.1:${enginePort}/api/pcap/export`, '_blank');
  };

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Binary className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
              LIVE PACKET & FRAME EXPLORER
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time frame telemetry stream, IP header dissection, and binary PCAP Wireshark export
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-3">
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

      {/* Main Split: Stream Table & Dissection Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 mt-4 overflow-hidden">
        {/* Packets Stream Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 backdrop-blur-md shadow-xl">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 bg-[#0c1428] text-slate-400 text-[11px] border-b border-cyan-500/20 uppercase tracking-wider z-10">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Dir</th>
                <th className="p-3">Source Endpoint</th>
                <th className="p-3">Destination Endpoint</th>
                <th className="p-3">Proto</th>
                <th className="p-3">Length</th>
                <th className="p-3">Process</th>
                <th className="p-3">TCP Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Listening for network packets... Generate browser or socket activity to sample.
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
                      className={`cursor-pointer transition hover:bg-[#0f1b38] ${
                        isSelected ? 'bg-[#122247] border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      <td className="p-3 text-slate-400 font-mono">
                        {formatTimestamp(pkt.timestamp)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center w-fit space-x-1 ${
                            isIncoming
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDownLeft className="w-3 h-3 mr-0.5" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          )}
                          <span>{pkt.direction}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {pkt.sourceIp}:{pkt.sourcePort}
                      </td>
                      <td className="p-3 text-slate-300">
                        {pkt.destIp}:{pkt.destPort}
                      </td>
                      <td className="p-3">
                        <span className="text-cyan-400 font-semibold">{pkt.protocol}</span>
                      </td>
                      <td className="p-3 text-slate-400">{pkt.length} B</td>
                      <td className="p-3 font-semibold text-slate-100">{pkt.processName}</td>
                      <td className="p-3 text-[11px] text-slate-400">{pkt.flags}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Packet Header Inspector (Wireshark-style dissection) */}
        {selectedPacket ? (
          <div className="w-full lg:w-96 rounded-xl border border-cyan-500/20 bg-[#090e1c]/95 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold text-slate-100 uppercase">
                    FRAME DISSECTION #{selectedPacket.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPacket(null)}
                  className="text-slate-400 hover:text-slate-100 text-xs font-mono"
                >
                  CLOSE
                </button>
              </div>

              {/* Tree view of layers */}
              <div className="mt-3 space-y-3 font-mono text-xs">
                {/* Layer 2: Ethernet */}
                <div className="p-2.5 rounded bg-[#070b16] border border-slate-800 space-y-1">
                  <div className="text-cyan-400 font-semibold">▶ Layer 2: Ethernet II</div>
                  <div className="text-[11px] text-slate-400 pl-3">
                    Type: IPv4 (0x0800) • Header: 14 Bytes
                  </div>
                </div>

                {/* Layer 3: IPv4 */}
                <div className="p-2.5 rounded bg-[#070b16] border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">
                    ▶ Layer 3: Internet Protocol (IPv4)
                  </div>
                  <div className="text-[11px] text-slate-400 pl-3 space-y-0.5">
                    <div>Source: {selectedPacket.sourceIp}</div>
                    <div>Destination: {selectedPacket.destIp}</div>
                    <div>Length: {selectedPacket.length} bytes • TTL: 64</div>
                  </div>
                </div>

                {/* Layer 4: TCP / UDP */}
                <div className="p-2.5 rounded bg-[#070b16] border border-slate-800 space-y-1">
                  <div className="text-amber-400 font-semibold">
                    ▶ Layer 4: Transport ({selectedPacket.protocol})
                  </div>
                  <div className="text-[11px] text-slate-400 pl-3 space-y-0.5">
                    <div>Source Port: {selectedPacket.sourcePort}</div>
                    <div>Dest Port: {selectedPacket.destPort}</div>
                    <div>Flags: [{selectedPacket.flags}]</div>
                  </div>
                </div>

                {/* Encrypted payload note */}
                <div className="p-2.5 rounded bg-[#070b16] border border-cyan-500/20 text-slate-400 space-y-1">
                  <div className="text-purple-400 font-semibold">
                    ▶ Encrypted TLS/QUIC Application Data
                  </div>
                  <div className="text-[10px] text-slate-400 pl-3 leading-relaxed">
                    Payload is encrypted at the transport layer by modern TLS/HTTPS ciphers. NETSPECTRE preserves end-to-end privacy and never decrypts private communications.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[10px] font-mono text-slate-500 text-center">
              Sampled frame telemetry from Windows Network Stack
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex w-80 rounded-xl border border-cyan-500/10 bg-[#090e1c]/50 p-6 items-center justify-center text-center text-slate-500 font-mono text-xs">
            Select a packet row to view protocol header dissection & network frame metadata.
          </div>
        )}
      </div>
    </div>
  );
};
