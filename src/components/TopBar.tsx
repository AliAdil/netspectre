import React from 'react';
import { useNetworkStore } from '../store/networkStore';
import { formatRate, formatBytes } from '../utils/formatters';
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  Pause,
  Play,
  Search,
  Download,
  Shield,
  Radio,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    isConnected,
    totalDownloadBps,
    totalUploadBps,
    activeConnectionCount,
    applications,
    primaryAdapter,
    searchQuery,
    isPaused,
    setSearchQuery,
    togglePause,
    setActiveScreen,
    enginePort,
  } = useNetworkStore();

  const handleExportPcap = () => {
    window.open(`http://127.0.0.1:${enginePort}/api/pcap/export`, '_blank');
  };

  return (
    <header className="h-14 border-b border-cyan-500/20 bg-[#070b16]/90 backdrop-blur-xl px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Live Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 rounded-lg border border-cyan-400/30 animate-ping opacity-25"></div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent font-mono">
                NETSPECTRE
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                v2.4 WIN-NATIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 tracking-tight flex items-center space-x-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              ></span>
              <span className="font-mono">
                {isConnected ? 'WINDOWS TELEMETRY LIVE' : 'CONNECTING TO ENGINE...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Telemetry Rate Gauges */}
      <div className="hidden lg:flex items-center space-x-4">
        {/* Download Rate */}
        <div className="px-3 py-1.5 rounded-lg bg-[#0c1222] border border-cyan-500/20 flex items-center space-x-2.5 shadow-inner">
          <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
              DOWNLINK SPEED
            </div>
            <div className="text-xs font-mono font-bold text-emerald-300">
              {formatRate(totalDownloadBps)}
            </div>
          </div>
        </div>

        {/* Upload Rate */}
        <div className="px-3 py-1.5 rounded-lg bg-[#0c1222] border border-cyan-500/20 flex items-center space-x-2.5 shadow-inner">
          <ArrowUpCircle className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
              UPLINK SPEED
            </div>
            <div className="text-xs font-mono font-bold text-amber-300">
              {formatRate(totalUploadBps)}
            </div>
          </div>
        </div>

        {/* Active Connections */}
        <div className="px-3 py-1.5 rounded-lg bg-[#0c1222] border border-cyan-500/20 flex items-center space-x-2.5 shadow-inner">
          <Activity className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
              ACTIVE FLOWS
            </div>
            <div className="text-xs font-mono font-bold text-cyan-300">
              {activeConnectionCount}{' '}
              <span className="text-[10px] text-slate-400 font-normal">
                ({applications.length} apps)
              </span>
            </div>
          </div>
        </div>

        {/* Monitored Adapter */}
        <div className="hidden xl:flex px-3 py-1.5 rounded-lg bg-[#0c1222] border border-cyan-500/20 items-center space-x-2 shadow-inner">
          <Radio className="w-4 h-4 text-purple-400" />
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
              ADAPTER
            </div>
            <div className="text-xs font-mono font-bold text-purple-300 truncate max-w-[150px]">
              {primaryAdapter}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Action Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Global Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search process, domain, IP, port..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 xl:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#0a0f1d] border border-cyan-500/20 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition"
          />
        </div>

        {/* Pause/Resume button */}
        <button
          onClick={togglePause}
          className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1.5 transition ${
            isPaused
              ? 'bg-amber-950/40 border-amber-500 text-amber-300'
              : 'bg-[#0a0f1d] border-cyan-500/20 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
          }`}
          title={isPaused ? 'Resume Real-Time Polling' : 'Pause Live Updates'}
        >
          {isPaused ? <Play className="w-4 h-4 fill-amber-300" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Export PCAP */}
        <button
          onClick={handleExportPcap}
          className="px-2.5 py-1.5 rounded-lg bg-[#0a0f1d] border border-cyan-500/20 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 text-xs font-mono flex items-center space-x-1.5 transition shadow-sm"
          title="Export Raw PCAP Capture for Wireshark"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">PCAP</span>
        </button>

        {/* Settings button */}
        <button
          onClick={() => setActiveScreen('settings')}
          className="p-1.5 rounded-lg bg-[#0a0f1d] border border-cyan-500/20 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 transition"
          title="System Settings"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
