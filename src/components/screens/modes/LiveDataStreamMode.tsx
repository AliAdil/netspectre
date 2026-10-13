import React, { useState } from 'react';
import { useNetworkStore } from '../../../store/networkStore';
import { formatBytes, formatRate, formatTimestamp } from '../../../utils/formatters';
import { Activity, Pause, Play, Filter, ArrowDownLeft, ArrowUpRight, Zap } from 'lucide-react';

export const LiveDataStreamMode: React.FC = () => {
  const {
    packetSamples,
    events,
    totalDownloadBps,
    totalUploadBps,
    isPaused,
    togglePause,
    setSelectedConnection,
    connections,
  } = useNetworkStore();

  const [filterDir, setFilterDir] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');

  const filteredPackets = packetSamples.filter((p) => {
    if (filterDir !== 'ALL' && p.direction !== filterDir) return false;
    return true;
  });

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-mono font-bold tracking-wider text-slate-100 uppercase">
              LIVE DATA STREAM & TRAFFIC WATERFALL
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time visual stream of microsecond traffic bursts, frame throughput, and connection frequency
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-[#0a0f1d] border border-cyan-500/20 p-1 rounded-lg text-xs font-mono">
            {(['ALL', 'INCOMING', 'OUTGOING'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setFilterDir(dir)}
                className={`px-2.5 py-0.5 rounded transition ${
                  filterDir === dir
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>

          <button
            onClick={togglePause}
            className={`px-3 py-1 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition ${
              isPaused
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-[#0a0f1d] border-cyan-500/20 text-slate-300 hover:text-cyan-300'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME STREAM' : 'PAUSE'}</span>
          </button>
        </div>
      </div>

      {/* Waterfall Visual Activity Grid */}
      <div className="flex-1 overflow-y-auto space-y-2 rounded-xl border border-cyan-500/20 bg-[#090e1c]/80 p-4 shadow-xl">
        {filteredPackets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
            Waiting for real-time packet activity on network adapter...
          </div>
        ) : (
          filteredPackets.map((pkt) => {
            const isIncoming = pkt.direction === 'INCOMING';
            const widthPct = Math.min(100, Math.max(12, (pkt.length / 1500) * 100));

            return (
              <div
                key={pkt.id}
                className="p-2.5 rounded-lg bg-[#0a1020] border border-cyan-500/10 hover:border-cyan-500/30 flex items-center justify-between text-xs font-mono transition"
              >
                {/* Time & Direction */}
                <div className="flex items-center space-x-3 w-48 shrink-0">
                  <span className="text-slate-400 text-[11px]">
                    {formatTimestamp(pkt.timestamp)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 ${
                      isIncoming
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isIncoming ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    <span>{isIncoming ? 'RECV' : 'SEND'}</span>
                  </span>
                </div>

                {/* Waterfall Visual Bar */}
                <div className="flex-1 mx-4 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="truncate">
                      {pkt.processName} • {pkt.sourceIp}:{pkt.sourcePort} → {pkt.destIp}:{pkt.destPort}
                    </span>
                    <span className="text-cyan-300">{pkt.length} B</span>
                  </div>
                  <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isIncoming ? 'bg-cyan-400 shadow-[0_0_8px_#00f3ff]' : 'bg-amber-400 shadow-[0_0_8px_#ff8c00]'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Protocol & Flags */}
                <div className="w-24 text-right shrink-0">
                  <span className="text-cyan-400 font-bold">{pkt.protocol}</span>
                  <div className="text-[10px] text-slate-500">{pkt.flags}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
