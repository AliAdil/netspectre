import React from 'react';
import { useNetworkStore } from '../store/networkStore';
import { formatTimestamp } from '../utils/formatters';
import {
  ChevronUp,
  ChevronDown,
  Radio,
  ShieldAlert,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const BottomTimeline: React.FC = () => {
  const {
    events,
    bottomTimelineOpen,
    toggleBottomTimeline,
    setSelectedConnection,
    connections,
  } = useNetworkStore();

  const handleSelectEvent = (endpoint: string) => {
    const found = connections.find((c) =>
      endpoint.includes(c.remoteAddress) && endpoint.includes(c.remotePort.toString())
    );
    if (found) setSelectedConnection(found);
  };

  return (
    <div className="border-t border-cyan-500/20 bg-[#070b16]/95 backdrop-blur-xl z-20 select-none">
      {/* Collapsible Bar Header */}
      <div
        onClick={toggleBottomTimeline}
        className="px-4 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#0c1426] transition text-xs font-mono text-slate-400"
      >
        <div className="flex items-center space-x-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
            REAL-TIME EVENT STREAM
          </span>
          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px]">
            {events.length} EVENTS BUFFERED
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-slate-500">
            {bottomTimelineOpen ? 'Click to collapse' : 'Click to expand'}
          </span>
          {bottomTimelineOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Events Ticker / Table */}
      {bottomTimelineOpen && (
        <div className="h-32 overflow-x-auto overflow-y-hidden px-3 py-2 flex items-center space-x-2.5">
          {events.length === 0 ? (
            <div className="w-full text-center text-xs font-mono text-slate-500 py-6">
              Listening for active connection lifecycle events on Windows network adapter...
            </div>
          ) : (
            [...events].reverse().slice(0, 30).map((ev) => {
              let badgeColor = 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30';
              let Icon = Radio;

              if (ev.eventType === 'SECURITY_ALERT') {
                badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-500/50';
                Icon = ShieldAlert;
              } else if (ev.eventType === 'DISCONNECT') {
                badgeColor = 'bg-slate-900 text-slate-400 border-slate-700';
                Icon = CheckCircle2;
              } else if (ev.eventType === 'BURST') {
                badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
                Icon = AlertTriangle;
              }

              return (
                <div
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev.remoteEndpoint)}
                  className="shrink-0 w-64 p-2.5 rounded-lg bg-[#0a1020] hover:bg-[#0e162c] border border-cyan-500/15 cursor-pointer transition shadow hover:border-cyan-400/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border flex items-center space-x-1 ${badgeColor}`}
                    >
                      <Icon className="w-2.5 h-2.5 mr-1" />
                      <span>{ev.eventType}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatTimestamp(ev.timestamp)}
                    </span>
                  </div>

                  <div className="text-xs font-mono font-semibold text-slate-200 truncate flex items-center space-x-1">
                    <span className="text-purple-400">{ev.processName}</span>
                    <span className="text-slate-500">({ev.protocol})</span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {ev.details || `${ev.localEndpoint} -> ${ev.remoteEndpoint}`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
