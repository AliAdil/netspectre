# NETSPECTRE — Real-Time Windows Network Traffic Intelligence & Visualization Platform

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20x64-00f3ff.svg)](#)
[![Telemetry](https://img.shields.io/badge/Telemetry-Native%20Win32%20IP%20Helper-10b981.svg)](#)
[![Renderer](https://img.shields.io/badge/Graphics-WebGL%20Three.js%2060FPS-a855f7.svg)](#)
[![Security](https://img.shields.io/badge/Privacy-100%25%20Local--First-f59e0b.svg)](#)

**NETSPECTRE** is a high-fidelity Windows network surveillance and intelligence desktop platform. It monitors actual network telemetry directly from the Windows operating system and transforms incoming and outgoing network traffic into an interactive, sci-fi-style neural network universe.

---

## 🌟 Key Features

### 1. Genuine Windows Network Engine
- **Direct Kernel & IP Helper Telemetry**: Real-time extraction of active IPv4/IPv6 TCP and UDP sockets using `GetExtendedTcpTable` and `GetExtendedUdpTable` from `iphlpapi.dll`.
- **Zero Fake / Simulated Data**: Every IP, port, socket state, and traffic counter represents genuine network activity on your Windows PC.
- **Accurate Process Attribution**: Native PID resolution, process name mapping (`chrome`, `msedge`, `Discord`, `OneDrive`, `Unity`, `System`, etc.), and executable path querying via `QueryFullProcessImageNameW`.
- **Hardware-Level Network Counters**: Real-time adapter throughput (Wi-Fi, Ethernet, VPN) measured via `NetworkInterface` and `GetIfTable2`.

### 2. Interactive Sci-Fi Neural Universe (Three.js WebGL)
- **Neural Topology Architecture**: Multi-layer neural network layout connecting your Local PC Core -> Communicating Applications -> Remote Server Endpoints.
- **Directional Particle Streams**:
  - **Amber / Orange particles** flow outward for outgoing transmissions.
  - **Electric Cyan particles** flow inward for incoming downlink traffic.
  - Particle speed and count dynamically scale with real measured transfer rates (`B/s`, `KB/s`, `MB/s`).
- **Interactive Orbit Controls**: Smooth 60 FPS GPU rendering, 3D/2D toggle, polar radial vs neural layout modes, hover raycasting, node clicking, and double-click camera focus.

### 3. Comprehensive Application Screens
1. **Command Center**: Full-window animated network universe with real-time HUD gauges, live flow filters (TCP, UDP, Active, Suspicious, Public, Private).
2. **Application Explorer**: Matrix of communicating applications, PIDs, executable paths, socket counts, and cumulative bandwidth totals.
3. **Connection Inspector**: Detailed tabular flow directory with sorting, searching, and one-click CSV export.
4. **Packet Explorer**: Wireshark-inspired live frame stream, protocol dissection (Ethernet, IPv4, TCP/UDP headers), and binary PCAP export.
5. **Destination Intelligence**: Aggregation of remote endpoints by ASN, autonomous routing organizations (Cloudflare, Google, Microsoft, AWS, Fastly, Akamai), and approximate GeoIP flags.
6. **Time Travel / Timeline Playback**: Historical scrubbing slider, 1x/2x/5x speed controls, and time-series replay using recorded telemetry.
7. **Traffic Analytics**: KPI dashboards, protocol distribution (TCP vs UDP), top bandwidth processes, and top observed port distributions.
8. **Security & Threat View**: Local heuristic detection of uncommon ports (e.g. 4444, 1337), suspicious public shells, and unencrypted legacy protocols.
9. **Settings**: Performance tuning, bloom glow toggles, particle density, and privacy disclosures.

---

## 🔒 Privacy & Cryptographic Integrity

- **Encrypted Traffic Disclosure**: Modern HTTPS and QUIC (HTTP/3) traffic is encrypted with TLS 1.3. NETSPECTRE truthfully monitors connection metadata, endpoints, packet counts, and flow rates rather than pretending to decrypt private payload contents.
- **Zero Cloud Exfiltration**: 100% local-first. No telemetry, packet headers, or process names are ever uploaded to any cloud service.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Node.js**: v18+ (tested on Node v24)
- **C# Compiler**: Uses the built-in Microsoft Visual C# Compiler included with Windows (`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`). No Visual Studio installation required!

### 1. Build the Native Windows Telemetry Engine
```powershell
npm run build:engine
```
This compiles `src-engine/NetSpectreEngine.cs` into `src-engine/NetSpectreEngine.exe` using native 64-bit compiler optimizations.

### 2. Run the Native Engine (Daemon Mode)
```powershell
.\src-engine\NetSpectreEngine.exe --port 48123
```
Or take a one-shot CLI snapshot to inspect the JSON output:
```powershell
.\src-engine\NetSpectreEngine.exe --snapshot
```

### 3. Launch the Application
In development:
```powershell
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in any browser, or launch the desktop shell:
```powershell
npm run electron
```

### 4. Build for Production
```powershell
npm run build
```
This builds both the optimized native C# engine and the production React bundle into `dist/`.

---

## 📁 Project Structure

```
├── electron/
│   ├── main.js                   # Electron main process & engine daemon manager
│   └── preload.js                # Secure IPC bridge
├── src-engine/
│   ├── NetSpectreEngine.cs       # Native C# Windows telemetry engine source
│   └── NetSpectreEngine.exe      # Compiled 64-bit native engine binary
├── src/
│   ├── components/
│   │   ├── screens/              # 8 Specialized Application Screens
│   │   │   ├── CommandCenter.tsx
│   │   │   ├── ApplicationExplorer.tsx
│   │   │   ├── ConnectionInspector.tsx
│   │   │   ├── PacketExplorer.tsx
│   │   │   ├── DestinationIntelligence.tsx
│   │   │   ├── TimelinePlayback.tsx
│   │   │   ├── TrafficAnalytics.tsx
│   │   │   ├── SecurityScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── NetworkUniverse.tsx   # Three.js 3D WebGL Neural Graph Engine
│   │   ├── TopBar.tsx            # Real-time HUD and global rate gauges
│   │   ├── Sidebar.tsx           # Cyberpunk navigation sidebar
│   │   ├── ContextPanel.tsx      # Right-side flow inspection drawer
│   │   └── BottomTimeline.tsx    # Collapsible real-time event ticker
│   ├── store/
│   │   └── networkStore.ts       # Zustand reactive telemetry state store
│   ├── types/
│   │   └── network.ts            # TypeScript telemetry schemas
│   ├── utils/
│   │   └── formatters.ts         # Formatting utilities for bytes, rates, flags
│   ├── App.tsx                   # Master desktop shell layout
│   ├── index.css                 # Cyberpunk styling and Tailwind layers
│   └── main.tsx                  # React DOM mount point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📊 Wireshark PCAP Export
NETSPECTRE includes built-in packet frame recording. You can export a binary PCAP file directly:
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:48123/api/pcap/export" -OutFile "capture.pcap"
```
The file starts with standard `0xa1b2c3d4` magic bytes and can be opened in Wireshark or NetworkMiner.
