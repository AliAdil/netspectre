import React from 'react';
import { NetworkUniverse } from '../NetworkUniverse';
import { ApplicationMapMode } from './modes/ApplicationMapMode';
import { LiveDataStreamMode } from './modes/LiveDataStreamMode';
import { DestinationMapMode } from './modes/DestinationMapMode';
import { ProtocolMatrixMode } from './modes/ProtocolMatrixMode';
import { useNetworkStore } from '../../store/networkStore';
import { VisMode } from '../../types/network';
import {
  Filter,
  Layers,
  Cpu,
  Zap,
  Globe2,
  PieChart,
  Radio,
  Sliders,
  Eye,
  EyeOff,
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const {
    filterProtocol,
    filterTraffic,
    setFilterProtocol,
    setFilterTraffic,
    visMode,
    setVisMode,
    hideInactive,
    toggleHideInactive,
    nodeSizingMode,
    setNodeSizingMode,
  } = useNetworkStore();

  const visModes: { id: VisMode; label: string; icon: React.ElementType }[] = [
    { id: 'neural-flow', label: 'Neural Flow', icon: Radio },
    { id: 'app-map', label: 'App Map', icon: Cpu },
    { id: 'data-stream', label: 'Data Stream', icon: Zap },
    { id: 'dest-map', label: 'Dest Radar', icon: Globe2 },
    { id: 'protocol-matrix', label: 'Protocol Matrix', icon: Layers },
  ];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#070a13]">
      {/* Top Floating Control Bar */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 bg-[#090e1c]/90 backdrop-blur-xl px-4 py-1.5 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 select-none">
        {/* Visualization Modes */}
        <div className="flex items-center space-x-1 border-r border-slate-700/60 pr-2.5">
          {visModes.map((m) => {
            const Icon = m.icon;
            const isSelected = visMode === m.id;

            return (
              <button
                key={m.id}
                onClick={() => setVisMode(m.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Protocol filters */}
        <div className="flex items-center space-x-1 border-r border-slate-700/60 pr-2.5">
          {(['ALL', 'TCP', 'UDP'] as const).map((proto) => (
            <button
              key={proto}
              onClick={() => setFilterProtocol(proto)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                filterProtocol === proto
                  ? 'bg-slate-200 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {proto}
            </button>
          ))}
        </div>

        {/* Traffic Category filters */}
        <div className="flex items-center space-x-1 border-r border-slate-700/60 pr-2.5">
          {(['ALL', 'ACTIVE', 'PUBLIC', 'PRIVATE', 'SUSPICIOUS'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterTraffic(cat)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                filterTraffic === cat
                  ? cat === 'SUSPICIOUS'
                    ? 'bg-rose-500 text-slate-950 font-bold'
                    : 'bg-cyan-500 text-slate-950 font-bold'
                  : cat === 'SUSPICIOUS'
                  ? 'text-rose-400 hover:bg-rose-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Hide Inactive Toggle */}
        <button
          onClick={toggleHideInactive}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono transition ${
            hideInactive
              ? 'bg-purple-900/80 text-purple-200 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Inactive Sockets Visibility"
        >
          {hideInactive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span>{hideInactive ? 'Active Only' : 'Show All'}</span>
        </button>
      </div>

      {/* Main Screen Content Viewport */}
      <div className="flex-1 w-full h-full relative">
        {visMode === 'neural-flow' && <NetworkUniverse />}
        {visMode !== 'neural-flow' && (
          <div className="w-full h-full pt-20">
            {visMode === 'app-map' && <ApplicationMapMode />}
            {visMode === 'data-stream' && <LiveDataStreamMode />}
            {visMode === 'dest-map' && <DestinationMapMode />}
            {visMode === 'protocol-matrix' && <ProtocolMatrixMode />}
          </div>
        )}
      </div>
    </div>
  );
};
