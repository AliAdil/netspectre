import { create } from 'zustand';
import {
  ConnectionRecord,
  ApplicationRecord,
  NetworkEvent,
  PacketSample,
  TelemetrySnapshot,
  TimelinePoint,
  ScreenId,
} from '../types/network';

interface NetworkState {
  // Engine Telemetry
  isConnected: boolean;
  enginePort: number;
  lastUpdated: number;
  totalDownloadBps: number;
  totalUploadBps: number;
  totalBytesDownloaded: number;
  totalBytesUploaded: number;
  primaryAdapter: string;
  activeConnectionCount: number;

  connections: ConnectionRecord[];
  applications: ApplicationRecord[];
  events: NetworkEvent[];
  packetSamples: PacketSample[];
  historyPoints: TimelinePoint[];

  // Navigation & Selection
  activeScreen: ScreenId;
  selectedConnection: ConnectionRecord | null;
  selectedApplication: ApplicationRecord | null;
  selectedNodeId: string | null;

  // Search & Filter
  searchQuery: string;
  filterProtocol: 'ALL' | 'TCP' | 'UDP';
  filterTraffic: 'ALL' | 'ACTIVE' | 'PRIVATE' | 'PUBLIC' | 'SUSPICIOUS';

  // Playback & Freeze
  isPaused: boolean;
  isHistoryMode: boolean;
  historyPlaybackIndex: number;
  playbackSpeed: number;
  isPlayingHistory: boolean;

  // Layout Panels
  contextPanelOpen: boolean;
  bottomTimelineOpen: boolean;

  // Settings
  visualQuality: 'high' | 'medium' | 'low';
  enableParticles: boolean;
  bloomGlow: boolean;
  darkSciFiTheme: boolean;

  // Visualization Modes & Advanced Graph Options
  visMode: VisMode;
  nodeSizingMode: NodeSizingMode;
  hideInactive: boolean;
  freezeLayout: boolean;

  // Actions
  setVisMode: (mode: VisMode) => void;
  setNodeSizingMode: (mode: NodeSizingMode) => void;
  toggleHideInactive: () => void;
  toggleFreezeLayout: () => void;
  setActiveScreen: (screen: ScreenId) => void;
  setSelectedConnection: (conn: ConnectionRecord | null) => void;
  setSelectedApplication: (app: ApplicationRecord | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterProtocol: (proto: 'ALL' | 'TCP' | 'UDP') => void;
  setFilterTraffic: (traffic: 'ALL' | 'ACTIVE' | 'PRIVATE' | 'PUBLIC' | 'SUSPICIOUS') => void;
  togglePause: () => void;
  toggleContextPanel: () => void;
  toggleBottomTimeline: () => void;
  setHistoryMode: (enabled: boolean) => void;
  setHistoryPlaybackIndex: (idx: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlayingHistory: (playing: boolean) => void;
  setVisualQuality: (quality: 'high' | 'medium' | 'low') => void;
  toggleParticles: () => void;
  toggleBloomGlow: () => void;

  // Polling update
  updateTelemetry: (snapshot: TelemetrySnapshot) => void;
  setConnected: (connected: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: false,
  enginePort: 48123,
  lastUpdated: Date.now(),
  totalDownloadBps: 0,
  totalUploadBps: 0,
  totalBytesDownloaded: 0,
  totalBytesUploaded: 0,
  primaryAdapter: 'Detecting network adapter...',
  activeConnectionCount: 0,

  connections: [],
  applications: [],
  events: [],
  packetSamples: [],
  historyPoints: [],

  activeScreen: 'command-center',
  selectedConnection: null,
  selectedApplication: null,
  selectedNodeId: null,

  searchQuery: '',
  filterProtocol: 'ALL',
  filterTraffic: 'ALL',

  isPaused: false,
  isHistoryMode: false,
  historyPlaybackIndex: 0,
  playbackSpeed: 1,
  isPlayingHistory: false,

  contextPanelOpen: true,
  bottomTimelineOpen: true,

  visualQuality: 'high',
  enableParticles: true,
  bloomGlow: true,
  darkSciFiTheme: true,

  visMode: 'neural-flow',
  nodeSizingMode: 'bandwidth',
  hideInactive: false,
  freezeLayout: false,

  setVisMode: (mode) => set({ visMode: mode }),
  setNodeSizingMode: (mode) => set({ nodeSizingMode: mode }),
  toggleHideInactive: () => set((state) => ({ hideInactive: !state.hideInactive })),
  toggleFreezeLayout: () => set((state) => ({ freezeLayout: !state.freezeLayout })),

  setActiveScreen: (screen) => set({ activeScreen: screen }),
  setSelectedConnection: (conn) =>
    set({
      selectedConnection: conn,
      contextPanelOpen: conn !== null || get().selectedApplication !== null,
      selectedNodeId: conn ? conn.id : null,
    }),
  setSelectedApplication: (app) =>
    set({
      selectedApplication: app,
      contextPanelOpen: app !== null || get().selectedConnection !== null,
      selectedNodeId: app ? `app_${app.processName}` : null,
    }),
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterProtocol: (proto) => set({ filterProtocol: proto }),
  setFilterTraffic: (traffic) => set({ filterTraffic: traffic }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  toggleContextPanel: () => set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),
  toggleBottomTimeline: () => set((state) => ({ bottomTimelineOpen: !state.bottomTimelineOpen })),

  setHistoryMode: (enabled) => set({ isHistoryMode: enabled }),
  setHistoryPlaybackIndex: (idx) => set({ historyPlaybackIndex: idx }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setIsPlayingHistory: (playing) => set({ isPlayingHistory: playing }),

  setVisualQuality: (quality) => set({ visualQuality: quality }),
  toggleParticles: () => set((state) => ({ enableParticles: !state.enableParticles })),
  toggleBloomGlow: () => set((state) => ({ bloomGlow: !state.bloomGlow })),

  setConnected: (connected) => set({ isConnected: connected }),

  updateTelemetry: (snapshot) => {
    if (get().isPaused || get().isHistoryMode) return;

    const newPoint: TimelinePoint = {
      timestamp: snapshot.timestamp,
      downBps: snapshot.totalDownloadBps,
      upBps: snapshot.totalUploadBps,
      active: snapshot.activeConnectionCount,
    };

    set((state) => {
      const updatedHistory = [...state.historyPoints.slice(-60), newPoint];

      // Maintain selection if still alive
      let updatedSelectedConn = state.selectedConnection;
      if (updatedSelectedConn) {
        const found = snapshot.connections.find((c) => c.id === updatedSelectedConn?.id);
        if (found) updatedSelectedConn = found;
      }

      let updatedSelectedApp = state.selectedApplication;
      if (updatedSelectedApp) {
        const foundApp = snapshot.applications.find(
          (a) => a.processName === updatedSelectedApp?.processName
        );
        if (foundApp) updatedSelectedApp = foundApp;
      }

      return {
        isConnected: true,
        lastUpdated: snapshot.timestamp,
        totalDownloadBps: snapshot.totalDownloadBps,
        totalUploadBps: snapshot.totalUploadBps,
        totalBytesDownloaded: snapshot.totalBytesDownloaded,
        totalBytesUploaded: snapshot.totalBytesUploaded,
        primaryAdapter: snapshot.primaryAdapter,
        activeConnectionCount: snapshot.activeConnectionCount,
        connections: snapshot.connections,
        applications: snapshot.applications,
        events: snapshot.events,
        packetSamples: snapshot.packetSamples,
        historyPoints: updatedHistory,
        selectedConnection: updatedSelectedConn,
        selectedApplication: updatedSelectedApp,
      };
    });
  },
}));

if (typeof window !== 'undefined') {
  (window as any).__useNetworkStore = useNetworkStore;
}
