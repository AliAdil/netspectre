# NETSPECTRE V3.1 — System Architecture & Engineering Specification
**Enterprise Network Telemetry & Diagnostics Platform**

---

## 1. Architectural Overview

NETSPECTRE is engineered as a decoupled, multi-tier Windows desktop system combining low-level Win32 kernel telemetry, real-time packet capture, and developer observability with a modern React 19 / Three.js 2.5D visual frontend.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               NETSPECTRE FRONTEND SHELL                                │
│   React 19 • TypeScript • Tailwind CSS • Three.js WebGL 60FPS • Zustand Store          │
│   Tri-Persona Switcher: [Personal] • [Developer] • [Network Operations]                │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
         Hardened Local IPC (Port 48123, X-NetSpectre-Auth Header, CORS Protected)
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                       NATIVE WINDOWS ENGINE & PACKET BACKEND                           │
│                      (src-engine/NetSpectreEngine.exe, 64-bit)                         │
│                                                                                        │
│   ┌───────────────────────────────┐        ┌───────────────────────────────────────┐   │
│   │ Win32 IP Helper P/Invoke      │        │ Dual-Mode Packet Capture Engine       │   │
│   │ • GetExtendedTcpTable         │        │ • Mode 1: Win32 Flow Telemetry        │   │
│   │ • GetExtendedUdpTable         │        │ • Mode 2: Raw Socket SIO_RCVALL Wire  │   │
│   │ • GetIfTable2 / Interface Bps │        │ • Honest PCAP Stream Serializer       │   │
│   └───────────────────────────────┘        └───────────────────────────────────────┘   │
│   ┌───────────────────────────────┐        ┌───────────────────────────────────────┐   │
│   │ Process Attributor (kernel32) │        │ Advanced Microservices Subsystem      │   │
│   │ • QueryFullProcessImageNameW  │        │ • BrowserObservabilityService         │   │
│   │ • Per-Socket PID & Path Bind  │        │ • ExplainMyNetworkService (Assis.)    │   │
│   └───────────────────────────────┘        │ • PersistentUsageService & Quotas     │   │
│   ┌───────────────────────────────┐        │ • PathMtuService (DF=1 Prober)        │   │
│   │ Transactional Persistence     │        │ • AlertsEngineService (Thresholds)    │   │
│   │ • %APPDATA%\NetSpectre\data\  │        │ • EnvironmentMonitorService (CRUD)    │   │
│   └───────────────────────────────┘        └───────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-File Native C# Engine Architecture

The native engine is compiled via `csc.exe` into a single standalone x64 binary `src-engine/NetSpectreEngine.exe`:

### 2.1 `NetSpectreEngine.cs`
- **Native Entrypoint & Configuration:** Handles CLI flags (`--port`, `--token`), initializes thread pools, and binds `HttpListener` to `http://127.0.0.1:48123/`.
- **Hardened HTTP Server:** Enforces origin checks, rejects cross-origin web requests, and requires the cryptographically generated `X-NetSpectre-Auth` session token.
- **Kernel Interop & Telemetry Engine:** Calls Win32 `GetExtendedTcpTable` (IPv4 & IPv6) and `GetExtendedUdpTable` to enumerate all live socket endpoints, active connection states, and owning process IDs.
- **Network Workbench Service:** High-precision ICMP ping, TTL traceroute, 7-record DNS lookups (`A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`), TCP port prober, and TLS certificate inspection.
- **Firewall Service:** Manages Windows Defender Firewall rules via parameterized `netsh advfirewall` execution. Checks Administrator elevation (`WindowsBuiltInRole.Administrator`) and provides safe 1-click rollback.

### 2.2 `PacketCaptureService.cs` (REQ-01)
- **Dual-Mode Architecture:**
  - **Mode 1 (Basic Monitoring):** Enumerates active connections and delta byte rates via Win32 IP Helper.
  - **Mode 2 (Deep Wire Capture):** Prompts for Administrator elevation and activates raw socket sniffing (`SocketType.Raw`, `ProtocolType.IP`, `SIO_RCVALL`). Dissects IP headers (IPv4/IPv6), TCP headers (ports, seq, ack, flags), UDP, and ICMP frames with microsecond timestamps.
- **Honest PCAP Export:** Implements the official libpcap 2.4 file format (`Magic: 0xa1b2c3d4`, `LinkType: 1 / Ethernet`). Exports strictly captured packets. Rejects synthetic packet generation when in Mode 1.

### 2.3 `AdvancedServices.cs`
- **`BrowserObservabilityService` (REQ-02):** Ingestion buffer for requests received from the Chromium extension. Redacts auth headers, indexes endpoints, and aggregates status codes.
- **`PersistentUsageService` (REQ-03):** Tracks daily and monthly data quotas. Computes consumed MB against quotas and rolls over counters at midnight UTC.
- **`EnvironmentMonitorService` (REQ-05):** Persistent multi-tier health prober for DEV, SIT, UAT, and PROD endpoints with latency history and TLS certificate expiry countdown.
- **`ExplainMyNetworkService` (REQ-08):** Deterministic diagnostic rules engine mapping user questions to evidence metrics, confidence scores, and remediation steps.
- **`AlertsEngineService` (REQ-09):** Evaluates live telemetry against user-configured thresholds (latency spikes, upload bursts, anomalous ports) and triggers desktop notifications.
- **`PathMtuService` (REQ-06):** Probes Maximum Transmission Unit using Don't Fragment (`DF=1`) ICMP packets to identify MTU bottlenecks (e.g., 1492 for PPPoE/VPN vs 1500 for Ethernet).

### 2.4 `NetSpectrePersistence.cs` (REQ-16)
- Thread-safe, atomic transactional storage manager writing formatted JSON data directly into `%APPDATA%\NetSpectre\data\`:
  - `usage.json`: Daily/monthly bandwidth history and application totals.
  - `environments.json`: Configured multi-stage environment profiles.
  - `alerts.json`: Anomaly notification history.
  - `incidents.json`: Frozen forensic snapshots and post-mortem reports.
  - `devices.json`: Enrolled multi-machine nodes and remote agents.

---

## 3. Chromium Browser API Observability Extension (REQ-02)

NETSPECTRE includes a lightweight Chromium extension located in `extension/`:
- **Manifest V3 (`manifest.json`):** Configured with `webRequest`, `webRequestResponseBodies`, and `declarativeNetRequest`.
- **Background Service Worker (`background.js`):** Intercepts outbound browser HTTP/HTTPS requests, calculates duration, automatically redacts sensitive authentication headers (`Authorization`, `Bearer`, `Cookie`), and forwards telemetry to `http://127.0.0.1:48123/api/browser-obs/ingest`.

---

## 4. Electron IPC Bridge & Security Architecture (REQ-15)

- **Cryptographically Random Session Token:**
  `const sessionToken = crypto.randomBytes(24).toString('hex');`
- **Privilege Separation:**
  The native engine is spawned by Electron using `--token <sessionToken>`. The token is exposed to the frontend renderer strictly via `electron/preload.js` (`window.electronAPI.getSessionToken()`).
- **Web App Rejection:** Any third-party web application attempting to scan `127.0.0.1:48123` is immediately rejected with `401 Unauthorized`.

---

## 5. Build & Packaging Pipeline (REQ-14)

```
npm run build ──► 1. powershell (csc.exe) ──► src-engine/NetSpectreEngine.exe
              ──► 2. vite build           ──► dist/ (HTML, CSS, JS bundles)

npm run dist  ──► 3. electron-builder     ──► dist-electron/
                                                ├── NETSPECTRE Setup 3.1.0.exe (NSIS)
                                                └── NETSPECTRE 3.1.0.exe (Portable)
```
