import React, { useEffect } from 'react';
import { useNetworkStore } from './store/networkStore';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { ContextPanel } from './components/ContextPanel';
import { BottomTimeline } from './components/BottomTimeline';

// Screens
import { CommandCenter } from './components/screens/CommandCenter';
import { DataCommunicationExplorer } from './components/screens/DataCommunicationExplorer';
import { ApplicationExplorer } from './components/screens/ApplicationExplorer';
import { ConnectionInspector } from './components/screens/ConnectionInspector';
import { PacketExplorer } from './components/screens/PacketExplorer';
import { DestinationIntelligence } from './components/screens/DestinationIntelligence';
import { TimelinePlayback } from './components/screens/TimelinePlayback';
import { TrafficAnalytics } from './components/screens/TrafficAnalytics';
import { SecurityScreen } from './components/screens/SecurityScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

// Personal Workspace Screens
import { NetworkDoctorScreen } from './components/screens/personal/NetworkDoctorScreen';
import { InternetUsageScreen } from './components/screens/personal/InternetUsageScreen';
import { FirewallControlScreen } from './components/screens/personal/FirewallControlScreen';

// Developer Workspace Screens
import { ApiInspectorScreen } from './components/screens/developer/ApiInspectorScreen';
import { ApiFailureAnalyzerScreen } from './components/screens/developer/ApiFailureAnalyzerScreen';
import { EnvironmentMonitorScreen } from './components/screens/developer/EnvironmentMonitorScreen';

// Operations Workspace Screens
import { NetworkWorkbenchScreen } from './components/screens/operations/NetworkWorkbenchScreen';
import { IncidentRecorderScreen } from './components/screens/operations/IncidentRecorderScreen';
import { MultiMachineScreen } from './components/screens/operations/MultiMachineScreen';

export const App: React.FC = () => {
  const {
    activeScreen,
    enginePort,
    updateTelemetry,
    setConnected,
    isPaused,
    isHistoryMode,
  } = useNetworkStore();

  // Telemetry Polling Effect
  useEffect(() => {
    let isMounted = true;

    const fetchSnapshot = async () => {
      if (isPaused || isHistoryMode) return;

      try {
        const res = await fetch(`http://127.0.0.1:${enginePort}/api/telemetry`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            updateTelemetry(data);
            setConnected(true);
          }
        } else {
          if (isMounted) setConnected(false);
        }
      } catch (err) {
        if (isMounted) setConnected(false);
      }
    };

    // Initial fetch
    fetchSnapshot();

    // 750ms polling interval for smooth, responsive 60 FPS charts
    const interval = setInterval(fetchSnapshot, 750);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enginePort, isPaused, isHistoryMode, updateTelemetry, setConnected]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#070a13] text-slate-100 select-none">
      {/* Top Bar */}
      <TopBar />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Nav Sidebar */}
        <Sidebar />

        {/* Center Screen Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-hidden relative">
            {activeScreen === 'command-center' && <CommandCenter />}
            {activeScreen === 'data-explorer' && <DataCommunicationExplorer />}
            {activeScreen === 'applications' && <ApplicationExplorer />}
            {activeScreen === 'connections' && <ConnectionInspector />}
            {activeScreen === 'packets' && <PacketExplorer />}
            {activeScreen === 'destinations' && <DestinationIntelligence />}
            {activeScreen === 'timeline' && <TimelinePlayback />}
            {activeScreen === 'analytics' && <TrafficAnalytics />}
            {activeScreen === 'security' && <SecurityScreen />}
            {activeScreen === 'settings' && <SettingsScreen />}

            {/* Personal Workspace */}
            {activeScreen === 'network-doctor' && <NetworkDoctorScreen />}
            {activeScreen === 'internet-usage' && <InternetUsageScreen />}
            {activeScreen === 'firewall' && <FirewallControlScreen />}

            {/* Developer Workspace */}
            {activeScreen === 'api-debugger' && <ApiInspectorScreen />}
            {activeScreen === 'api-failure-analyzer' && <ApiFailureAnalyzerScreen />}
            {activeScreen === 'env-monitor' && <EnvironmentMonitorScreen />}

            {/* Network Operations Workspace */}
            {activeScreen === 'workbench' && <NetworkWorkbenchScreen />}
            {activeScreen === 'incident-recorder' && <IncidentRecorderScreen />}
            {activeScreen === 'devices' && <MultiMachineScreen />}
          </div>

          {/* Bottom Activity Timeline */}
          <BottomTimeline />
        </main>

        {/* Right Context Drawer */}
        <ContextPanel />
      </div>
    </div>
  );
};

export default App;
