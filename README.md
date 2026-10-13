# NETSPECTRE V3.0 — Visual Network Intelligence & Troubleshooting Platform
**Enterprise Edition for Windows 10 / 11 (64-bit)**

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20x64-00f3ff.svg)](#)
[![Version](https://img.shields.io/badge/Release-v3.0%20Enterprise-10b981.svg)](#)
[![Telemetry](https://img.shields.io/badge/Telemetry-Native%20Win32%20IP%20Helper-10b981.svg)](#)
[![Renderer](https://img.shields.io/badge/Graphics-WebGL%20Three.js%2060FPS-a855f7.svg)](#)
[![Security](https://img.shields.io/badge/Privacy-100%25%20Local--First-f59e0b.svg)](#)

**NETSPECTRE** is a high-performance Windows network surveillance, diagnostic, and troubleshooting desktop platform. Operating on a **100% genuine Win32 telemetry engine**, NETSPECTRE eliminates guesswork by measuring live socket flows, process network attribution, gateway and DNS latencies, TLS cryptographic parameters, and firewall rules directly from the Windows kernel.

---

## 🌟 Tri-Persona Workspace Architecture

NETSPECTRE V3.0 features a top-level **Persona Switcher** designed for three distinct workflows:

```
+--------------------------------------------------------------------------------------------------+
|                                    NETSPECTRE v3.0 ENTERPRISE                                     |
|  [ 👤 Personal Workspace ]     |     [ </> Developer Workspace ]    |    [ 🌐 Network Ops Workspace ]  |
+--------------------------------------------------------------------------------------------------+
```

---

### 1. 👤 Personal Workspace (Everyday Windows Users)
*For everyday PC users, home office setups, and remote workers needing instant clarity on internet health, bandwidth hogs, and privacy leaks.*

- **Network Doctor (`network-doctor`):**
  - **1-Click Health Diagnostic:** Calculates an objective **0–100 Health Quality Index** from real network measurements: Default Gateway ping, Global Backbone (1.1.1.1 / 8.8.8.8), DNS lookup latency, and physical link / Wi-Fi signal quality (`netsh wlan show interfaces`).
  - **Plain-English Explanations:** Clear, jargon-free explanations with 1-click remediation actions.
  - **Bandwidth Consumers:** Identifies top active applications consuming bandwidth in real time.
- **Internet Usage & Privacy Monitor (`internet-usage`):**
  - **Per-Application Data Volume:** Progress bars showing bandwidth share for every process.
  - **Stealth Background Consumers:** Identifies silent background processes moving data without UI windows.
  - **Telemetry & Tracker Audit:** Automatically detects connections communicating with known analytics and advertising trackers.
- **Application Firewall Controls (`firewall`):**
  - **1-Click Outbound Blocking:** Uses native Windows Defender Firewall rules (`netsh advfirewall firewall add rule dir=out action=block`) to prevent suspicious applications from phoning home.
  - **Rule Manager & 1-Click Unblocker:** View active block rules and restore internet access with one click.
  - **Security Audit Log:** Timestamped chronological history of all firewall actions.

---

### 2. </> Developer Workspace (Software & API Engineers)
*For developers, API engineers, and backend teams debugging REST microservices and diagnosing failed HTTP/HTTPS connections.*

- **API Traffic Debugger & Phase Waterfall (`api-debugger`):**
  - **Interactive Request Runner:** Execute GET, POST, PUT, DELETE, PATCH, and HEAD requests with header and JSON payload editors.
  - **Microsecond Phase Waterfall Breakdown:**
    $$\text{Total Duration} = \text{DNS Lookup} + \text{TCP Handshake} + \text{TLS Handshake} + \text{TTFB} + \text{Content Download}$$
  - **Automated Secret Masking:** Built-in security guard that redacts `Authorization`, `Bearer`, `Cookie`, and API keys before saving to local audit history.
  - **cURL & HAR Export:** 1-Click "Copy as cURL" for terminal replaying and 1-Click "Export HAR" for Chrome DevTools / Postman sharing.
- **API Failure Root-Cause Analyzer (`api-failure-analyzer`):**
  - **Automated Root-Cause Diagnostic:** Pinpoints the exact layer of failure: `DNS_RESOLUTION_FAILURE (NXDOMAIN)`, `TCP_CONNECTION_REFUSED`, `TLS_CERTIFICATE_EXPIRED`, `CORS_PREFLIGHT_BLOCKED`, or `HTTP 502/504 GATEWAY TIMEOUT`.
  - **Step-by-Step Remediation Playbook:** Concrete instructions for rapid bug resolution.
- **Multi-Stage Environment Monitor (`env-monitor`):**
  - Track reachability across **DEV, SIT, UAT, and PROD** environments.
  - Live round-trip response time (ms) and status indicators (ONLINE / DEGRADED / OFFLINE).
  - **SSL Certificate Expiry Countdown:** Displays remaining certificate validity days to prevent unexpected production outages.
- **Data Communication Explorer (`data-explorer`):**
  - Microsecond frame sequences and cryptographic transparency disclosures. Discloses visibility boundaries between OS-level packet metrics and TLS 1.3 / QUIC encrypted application payloads.

---

### 3. 🌐 Network Operations Workspace (IT & Security Engineers)
*For IT administrators, network infrastructure specialists, and security operations center (SOC) analysts.*

- **2.5D Orthographic Neural Highway (`command-center`):**
  - 5-Column Graph Architecture: Local System $\rightarrow$ Applications $\rightarrow$ Protocols $\rightarrow$ Remote Destinations $\rightarrow$ Cloud / ASN.
  - Directional particle flow: Cyan (inbound downloads), Amber (outbound uploads), scaled to live throughput.
  - 5 Specialized Visualization Modes: *Neural Flow*, *App Map*, *Data Stream*, *Dest Radar*, and *Protocol Matrix*.
  - **Interactive Right-Click Context Menu:** Right-click any node on the graph to immediately:
    - *Test Ping Reachability* $\rightarrow$ launches Workbench Ping
    - *Trace Route (Traceroute)* $\rightarrow$ launches Workbench Traceroute
    - *Inspect DNS Records* $\rightarrow$ launches Workbench DNS lookup
    - *Test TCP Port Reachability* $\rightarrow$ launches Workbench Port Tester
    - *Inspect TLS Certificate* $\rightarrow$ launches Workbench TLS Inspector
    - *Block in Windows Firewall* $\rightarrow$ 1-click firewall block
    - *Diagnose with Network Doctor* $\rightarrow$ jumps to Health Doctor
- **Troubleshooting Workbench (`workbench`):**
  - **Ping Tool:** ICMP pings with sequence numbers, RTT (ms), TTL, packet loss %, jitter calculation, and min/max/avg latency statistics.
  - **Traceroute Tool:** Hop-by-hop TTL progression identifying intermediate routing gateways, latencies, and reverse hostnames.
  - **DNS Inspector:** Query A, AAAA, and CNAME records with sub-millisecond query duration timers.
  - **TCP Port Prober:** Perform 3-way TCP handshakes against ports (80, 443, 22, 3306, 5432, 8080) and capture service greeting banners.
  - **TLS Certificate Inspector:** Complete client TLS handshakes with SNI, extract Subject, Issuer, Validity Dates, Days Until Expiry, Cipher Suite, and Subject Alternative Names (SANs).
  - **Routing Table Viewer:** Structured representation of the Windows IPv4 Routing Table.
  - **Adapter & MTU Inspector:** Detailed configuration for physical and virtual NICs, including MAC addresses, Link Speeds (Mbps), IPv4/IPv6 assignments, and Gateways.
- **Incident Recorder & Snapshot Audit (`incident-recorder`):**
  - Freeze socket tables, active processes, and bandwidth rates during an outage.
  - Export structured Incident Forensic Reports in JSON or Markdown format.
- **Infrastructure & Multi-Device Monitor (`devices`):**
  - Live reachability of Default Gateway, Primary DNS, Secondary DNS, and Cloud Core infrastructure (GitHub, AWS, Cloudflare).
- **Packet Capture & PCAP Generator (`packets`):**
  - Continuous circular packet buffer with protocol filtering and 1-click standard **PCAP export** compatible with Wireshark.

---

## 🔒 Privacy & Cryptographic Integrity

- **Encrypted Traffic Disclosure**: Modern HTTPS and QUIC (HTTP/3) traffic is encrypted with TLS 1.3. NETSPECTRE truthfully monitors connection metadata, endpoints, packet counts, and flow rates rather than pretending to decrypt private payload contents.
- **100% Local-First**: No telemetry, packet headers, or process names are ever uploaded to any cloud service.

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

## 📡 Native Engine REST Endpoints (`http://127.0.0.1:48123`)

| HTTP Method | URI Path | Purpose / Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` or `/api/telemetry` | Full JSON telemetry snapshot (connections, processes, rates, events). |
| `GET` | `/api/history` | Rolling 60-point throughput history buffer. |
| `GET` | `/api/pcap/export` | Generates standard binary PCAP capture file for Wireshark analysis. |
| `GET` | `/api/diagnose/doctor` | Executes full health diagnostic (Gateway, Internet, DNS, Wi-Fi, Score). |
| `GET` | `/api/workbench/ping?target={t}&count={c}` | Runs real Windows ICMP ping test with min/avg/max/jitter statistics. |
| `GET` | `/api/workbench/traceroute?target={t}&maxHops={h}` | Runs ICMP TTL-increment traceroute with reverse DNS hostnames. |
| `GET` | `/api/workbench/dns?host={h}&type={t}` | Queries DNS records (A, AAAA, CNAME) and measures response time. |
| `GET` | `/api/workbench/port?host={h}&port={p}` | Tests TCP 3-way handshake connect latency and grabs service banners. |
| `GET` | `/api/workbench/tls?host={h}&port={p}` | Performs TLS handshake, inspects certificate validity, SANs, and ciphers. |
| `GET` | `/api/workbench/routes` | Returns system IPv4 routing table. |
| `GET` | `/api/workbench/adapters` | Returns physical and virtual network adapters with link speeds and MACs. |
| `GET` | `/api/firewall/rules` | Lists active NETSPECTRE Windows Defender Firewall outbound block rules. |
| `POST` | `/api/firewall/block` | Adds outbound executable block rule via `netsh advfirewall`. |
| `POST` | `/api/firewall/unblock` | Deletes outbound executable rule via `netsh advfirewall`. |
| `POST` | `/api/api-inspector/execute` | Executes HTTP/HTTPS call with waterfall metrics and secret masking. |
| `GET` | `/api/api-inspector/history` | Returns recent developer API executions. |
| `POST` | `/api/incident/snapshot` | Freezes current network state and compiles forensic incident report. |
| `GET` | `/api/incident/report` | Returns last recorded incident forensic report. |
| `GET` | `/api/devices` | Probes default gateway, DNS resolvers, and cloud endpoints. |
| `POST` | `/api/shutdown` | Graceful engine termination. |

---

## 📁 Project Structure

```
├── electron/
│   ├── main.js                   # Electron main process & engine daemon manager
│   └── preload.js                # Secure IPC bridge
├── src-engine/
│   ├── NetSpectreEngine.cs       # Native C# Windows telemetry engine source (Win32 P/Invoke)
│   └── NetSpectreEngine.exe      # Compiled 64-bit native engine binary
├── src/
│   ├── components/
│   │   ├── TopBar.tsx            # Top bar with Persona Workspace Switcher
│   │   ├── Sidebar.tsx           # Dynamic navigation tailored to active persona
│   │   ├── NetworkUniverse.tsx   # Three.js 2.5D orthographic neural highway with right-click menu
│   │   └── screens/
│   │       ├── personal/         # Personal Workspace screens (Doctor, Usage, Firewall)
│   │       ├── developer/        # Developer Workspace screens (ApiDebugger, Analyzer, EnvMonitor)
│   │       ├── operations/       # Network Ops screens (Workbench, IncidentRecorder, MultiMachine)
│   │       └── modes/            # 5 Visualization Modes (AppMap, DataStream, DestMap, ProtocolMatrix)
│   ├── store/
│   │   └── networkStore.ts       # Zustand reactive store with quick-jump actions
│   └── types/
│       └── network.ts            # TypeScript data contracts and diagnostic interfaces
├── NETSPECTRE_User_Manual.html   # Full typeset user manual source
├── NETSPECTRE_User_Manual.pdf    # Official high-resolution PDF User Operations Manual
├── ARCHITECTURE.md               # Technical system architecture and engineering report
└── README.md                     # Product overview and quick start guide
```
