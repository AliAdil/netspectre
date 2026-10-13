import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  formatBytes,
  formatRate,
  formatTimestamp,
} from '../../utils/formatters';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  History,
  Calendar,
} from 'lucide-react';

export const TimelinePlayback: React.FC = () => {
  const {
    historyPoints,
    isHistoryMode,
    setHistoryMode,
    historyPlaybackIndex,
    setHistoryPlaybackIndex,
    playbackSpeed,
    setPlaybackSpeed,
    isPlayingHistory,
    setIsPlayingHistory,
  } = useNetworkStore();

  const totalPoints = Math.max(1, historyPoints.length);
  const currentPoint = historyPoints[Math.min(historyPlaybackIndex, historyPoints.length - 1)] || {
    timestamp: Date.now(),
    downBps: 0,
    upBps: 0,
    active: 0,
  };

  // Playback loop
  useEffect(() => {
    let timer: any = null;
    if (isPlayingHistory) {
      timer = setInterval(() => {
        setHistoryPlaybackIndex((prev: number) => {
          if (prev >= historyPoints.length - 1) {
            setIsPlayingHistory(false);
            return historyPoints.length - 1;
          }
          return prev + 1;
        });
      }, 750 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlayingHistory, playbackSpeed, historyPoints.length]);

  return (
    <div className="w-full h-full p-6 flex flex-col bg-[#070a13] select-none font-sans overflow-hidden space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
              TIME TRAVEL & HISTORICAL TELEMETRY PLAYBACK
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Step backwards through recorded Windows network telemetry snapshots and replay traffic flows
          </p>
        </div>

        {/* Live vs Replay Mode Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setHistoryMode(!isHistoryMode);
              if (!isHistoryMode) {
                setHistoryPlaybackIndex(0);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center space-x-2 transition ${
              isHistoryMode
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-lg'
                : 'bg-[#0a0f1d] text-cyan-400 border border-cyan-500/20 hover:border-cyan-400/40'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{isHistoryMode ? 'EXIT PLAYBACK' : 'ENTER TIME TRAVEL'}</span>
          </button>
        </div>
      </div>

      {/* Main Historical Scrubbing Deck */}
      <div className="p-6 rounded-2xl bg-[#090f20]/90 border border-cyan-500/20 shadow-xl space-y-6">
        {/* Playback Controls & Scrubber */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPlayingHistory(!isPlayingHistory)}
                className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-lg shadow-cyan-500/30"
              >
                {isPlayingHistory ? (
                  <Pause className="w-5 h-5 fill-slate-950" />
                ) : (
                  <Play className="w-5 h-5 fill-slate-950" />
                )}
              </button>

              <button
                onClick={() => {
                  setHistoryPlaybackIndex(0);
                  setIsPlayingHistory(false);
                }}
                className="p-3 rounded-xl bg-[#0c1428] hover:bg-[#121f3f] border border-cyan-500/20 text-slate-300 transition"
                title="Restart Timeline"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center space-x-1 bg-[#0c1428] border border-cyan-500/20 p-1 rounded-xl text-xs font-mono">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      playbackSpeed === speed
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Current Scrubbed Timestamp */}
            <div className="text-right font-mono">
              <div className="text-xs text-slate-400">PLAYBACK TIMECODE</div>
              <div className="text-base font-bold text-cyan-300">
                {formatTimestamp(currentPoint.timestamp)}
              </div>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={totalPoints - 1}
              value={historyPlaybackIndex}
              onChange={(e) => setHistoryPlaybackIndex(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>{historyPoints[0] ? formatTimestamp(historyPoints[0].timestamp) : '--:--:--'}</span>
              <span>
                SNAPSHOT {historyPlaybackIndex + 1} OF {totalPoints}
              </span>
              <span>
                {historyPoints[historyPoints.length - 1]
                  ? formatTimestamp(historyPoints[historyPoints.length - 1].timestamp)
                  : '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        {/* Replay Telemetry Gauge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          <div className="p-4 rounded-xl bg-[#060a14] border border-cyan-500/20 space-y-1">
            <div className="text-[10px] font-mono text-slate-400">HISTORICAL DOWNLINK RATE</div>
            <div className="text-xl font-mono font-bold text-emerald-400">
              {formatRate(currentPoint.downBps)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#060a14] border border-cyan-500/20 space-y-1">
            <div className="text-[10px] font-mono text-slate-400">HISTORICAL UPLINK RATE</div>
            <div className="text-xl font-mono font-bold text-amber-400">
              {formatRate(currentPoint.upBps)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#060a14] border border-cyan-500/20 space-y-1">
            <div className="text-[10px] font-mono text-slate-400">ACTIVE SOCKETS AT POINT</div>
            <div className="text-xl font-mono font-bold text-cyan-400">
              {currentPoint.active} flows
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data Retention Note */}
      <div className="p-4 rounded-xl bg-[#090f20]/60 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Telemetry retention policy: Rolling in-memory buffer (120 high-fidelity timeframes)</span>
        </div>
        <span className="text-slate-500">Zero cloud upload • Local Windows storage</span>
      </div>
    </div>
  );
};
