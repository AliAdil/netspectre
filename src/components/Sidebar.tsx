import React, { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { ScreenId } from '../types/network';
import {
  LayoutDashboard,
  Cpu,
  Network,
  Binary,
  Globe2,
  Clock,
  BarChart3,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Eye,
  Lock,
  Code2,
  Bug,
  Server,
  Wrench,
  Camera,
} from 'lucide-react';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const {
    activeWorkspace,
    activeScreen,
    setActiveScreen,
    connections,
    applications,
    events,
  } = useNetworkStore();

  const [collapsed, setCollapsed] = useState(false);

  const suspiciousCount = connections.filter((c) => c.isSuspicious).length;

  let navItems: NavItem[] = [];

  if (activeWorkspace === 'personal') {
    navItems = [
      {
        id: 'network-doctor',
        label: 'Network Doctor',
        icon: Stethoscope,
        badge: '1-CLICK',
        badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      },
      {
        id: 'internet-usage',
        label: 'Usage & Privacy',
        icon: Eye,
      },
      {
        id: 'firewall',
        label: 'App Firewall',
        icon: Lock,
      },
      {
        id: 'command-center',
        label: 'Neural Universe',
        icon: LayoutDashboard,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
      },
    ];
  } else if (activeWorkspace === 'developer') {
    navItems = [
      {
        id: 'api-debugger',
        label: 'API Debugger',
        icon: Code2,
        badge: 'TIMING',
        badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
      },
      {
        id: 'api-failure-analyzer',
        label: 'Failure Analyzer',
        icon: Bug,
      },
      {
        id: 'env-monitor',
        label: 'Environment Monitor',
        icon: Server,
        badge: 'DEV/PROD',
        badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
      },
      {
        id: 'data-explorer',
        label: 'Data Explorer',
        icon: Binary,
      },
      {
        id: 'command-center',
        label: 'Neural Universe',
        icon: LayoutDashboard,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
      },
    ];
  } else {
    // Operations Workspace
    navItems = [
      {
        id: 'command-center',
        label: 'Neural Highway',
        icon: LayoutDashboard,
      },
      {
        id: 'workbench',
        label: 'Troubleshooting',
        icon: Wrench,
        badge: 'TOOLS',
        badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
      },
      {
        id: 'packets',
        label: 'Packet Capture',
        icon: Binary,
      },
      {
        id: 'incident-recorder',
        label: 'Incident Recorder',
        icon: Camera,
        badge: 'AUDIT',
        badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
      },
      {
        id: 'devices',
        label: 'Infrastructure',
        icon: Server,
      },
      {
        id: 'security',
        label: 'Threat Matrix',
        icon: ShieldAlert,
        badge: suspiciousCount > 0 ? suspiciousCount : undefined,
        badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse',
      },
      {
        id: 'applications',
        label: 'Applications',
        icon: Cpu,
        badge: applications.length,
        badgeColor: 'bg-purple-900/60 text-purple-300 border-purple-500/30',
      },
      {
        id: 'connections',
        label: 'Connections',
        icon: Network,
        badge: connections.length,
        badgeColor: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
      },
      {
        id: 'destinations',
        label: 'Destinations',
        icon: Globe2,
      },
      {
        id: 'timeline',
        label: 'Time Travel',
        icon: Clock,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
      },
    ];
  }

  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] border-r border-cyan-500/20 bg-[#070b16]/95 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 z-20 select-none ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation Links */}
      <div className="py-3 px-2 space-y-1">
        <div className="px-3 py-1.5 text-[9px] font-mono tracking-widest text-slate-500 uppercase">
          {!collapsed ? 'SURVEILLANCE MODULES' : 'SYS'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/70 to-blue-950/50 border border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#0c1426] border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]' : 'text-slate-400'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate tracking-wide font-sans">{item.label}</span>
                )}
              </div>

              {!collapsed && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded-md border ${
                    item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle & Footer */}
      <div className="p-3 border-t border-cyan-500/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-[#0a0f1d] hover:bg-[#0e162c] text-slate-400 hover:text-cyan-300 border border-cyan-500/10 transition"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
