import React from 'react';
import { useNetworkStore } from '../../store/networkStore';
import {
  Settings,
  Shield,
  Monitor,
  Database,
  Cpu,
  Radio,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const {
    enginePort,
    isConnected,
    primaryAdapter,
    visualQuality,
    setVisualQuality,
    enableParticles,
    toggleParticles,
    bloomGlow,
    toggleBloomGlow,
  } = useNetworkStore();

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-[#070a13] space-y-6 select-none font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-cyan-500/20">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 uppercase">
            SYSTEM & TELEMETRY CONFIGURATION
          </h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Engine IPC parameters, GPU rendering quality, privacy controls, and Windows OS permissions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Native Engine Status */}
        <div className="p-5 rounded-2xl bg-[#090f20]/90 border border-cyan-500/15 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
              WINDOWS TELEMETRY ENGINE
            </h2>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between p-2.5 rounded-lg bg-[#060a14] border border-slate-800">
              <span className="text-slate-400">Daemon Status:</span>
              <span
                className={`font-semibold flex items-center space-x-1.5 ${
                  isConnected ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isConnected ? 'ONLINE (ACTIVE MONITORING)' : 'DISCONNECTED'}</span>
              </span>
            </div>

            <div className="flex justify-between p-2.5 rounded-lg bg-[#060a14] border border-slate-800">
              <span className="text-slate-400">Local IPC Port:</span>
              <span className="text-cyan-400 font-bold">{enginePort} (HTTP / REST / SSE)</span>
            </div>

            <div className="flex justify-between p-2.5 rounded-lg bg-[#060a14] border border-slate-800">
              <span className="text-slate-400">Monitored Adapter:</span>
              <span className="text-slate-200 truncate max-w-[200px]">{primaryAdapter}</span>
            </div>

            <div className="flex justify-between p-2.5 rounded-lg bg-[#060a14] border border-slate-800">
              <span className="text-slate-400">Collection Mechanism:</span>
              <span className="text-purple-300">Win32 IP Helper + Kernel32 P/Invoke</span>
            </div>
          </div>
        </div>

        {/* Graphics & Visual Settings */}
        <div className="p-5 rounded-2xl bg-[#090f20]/90 border border-cyan-500/15 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
              GRAPHICS & 3D VISUAL QUALITY
            </h2>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#060a14] border border-slate-800">
              <div>
                <div className="text-slate-200 font-semibold">Directional Flow Particles</div>
                <div className="text-[10px] text-slate-400">
                  Animate live traffic particles along bezier spline links
                </div>
              </div>
              <button
                onClick={toggleParticles}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  enableParticles
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {enableParticles ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#060a14] border border-slate-800">
              <div>
                <div className="text-slate-200 font-semibold">Neural Bloom Glow Pass</div>
                <div className="text-[10px] text-slate-400">
                  High-fidelity cybernetic glow on active sockets
                </div>
              </div>
              <button
                onClick={toggleBloomGlow}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  bloomGlow ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {bloomGlow ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#060a14] border border-slate-800">
              <div>
                <div className="text-slate-200 font-semibold">Rendering Detail Preset</div>
                <div className="text-[10px] text-slate-400">Target 60 FPS GPU acceleration</div>
              </div>
              <div className="flex items-center space-x-1">
                {(['high', 'medium', 'low'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setVisualQuality(q)}
                    className={`px-2 py-0.5 rounded uppercase text-[10px] transition ${
                      visualQuality === q
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Technical Disclosure */}
        <div className="p-5 rounded-2xl bg-[#090f20]/90 border border-cyan-500/15 shadow-xl space-y-4 lg:col-span-2">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
              PRIVACY MANDATE & TECHNICAL ACCURACY DISCLOSURE
            </h2>
          </div>

          <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-3 bg-[#060a14] p-4 rounded-xl border border-slate-800">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 font-mono">End-to-End Cryptographic Integrity:</strong> Modern
                HTTPS, TLS 1.3, and QUIC (HTTP/3) communications are encrypted. NETSPECTRE measures connection
                endpoints, IP headers, flow bandwidth, and socket lifecycle without attempting covert TLS
                decryption or unauthorized certificate injection.
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 font-mono">100% Local-First Processing:</strong> All network
                telemetry, packet metadata, and process correlation remain exclusively on your PC. No data is
                ever transmitted to cloud services or external servers.
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 font-mono">Transparent Windows Permissions:</strong> NETSPECTRE
                utilizes standard Windows IP Helper APIs (`iphlpapi.dll`) and process query APIs, operating
                safely within standard Windows security boundaries.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
