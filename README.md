# NETSPECTRE V3.1 — Visual Network Intelligence & Troubleshooting Platform
**Enterprise Edition for Windows 10 / 11 (64-bit)**

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20x64-00f3ff.svg)](#)
[![Version](https://img.shields.io/badge/Release-v3.1%20Enterprise-10b981.svg)](#)
[![Telemetry](https://img.shields.io/badge/Telemetry-Win32%20IP%20Helper%20%2B%20Raw%20Socket%20Mode%202-10b981.svg)](#)
[![Security](https://img.shields.io/badge/Security-Localhost%20Session%20Token%20Auth-f59e0b.svg)](#)
[![Persistence](https://img.shields.io/badge/Storage-Persistent%20AppData%20Storage-8b5cf6.svg)](#)
[![Packaging](https://img.shields.io/badge/Package-NSIS%20Installer%20%2B%20Portable-ec4899.svg)](#)

**NETSPECTRE** is a high-performance Windows network surveillance, diagnostic, and troubleshooting platform. Operating on a **100% genuine Win32 telemetry and packet capture engine**, NETSPECTRE eliminates synthetic approximations by capturing socket flows, process network attribution, gateway and DNS latencies, TLS cryptographic parameters, Windows Defender Firewall rules, and live network packets directly from the Windows kernel.

---

## 🌟 What's New in v3.1 Enterprise

- **Dual-Mode Packet Capture & Honest Wire Analysis (REQ-01):**
  - **Mode 1 (Basic Telemetry):** Standard non-elevated monitoring using Win32 IP Helper APIs (`GetExtendedTcpTable`, `GetIfTable2`). Full process attribution, byte counters, and flow state.
  - **Mode 2 (Deep Wire Capture):** Activated when running elevated as Administrator via raw sockets (`SIO_RCVALL`) or Windows Packet Monitor (`PktMon`). Genuine packet reception events, timestamps, IP headers, TCP flags, and payload bytes.
  - **Genuine PCAP Export:** Exports only genuinely captured wire frames without synthetic approximations. Exporting in Mode 1 transparently prompts for elevation.
- **Browser API Observability & HAR Importer (REQ-02):**
  - Built-in Chromium extension in `extension/` (Chrome & Edge) capturing external browser API requests.
  - Direct HTTP Request Executor with sub-millisecond phase waterfalls.
  - Full `.har` (HTTP Archive) importer for inspecting exported network logs offline.
- **Persistent Internet Usage & Quota Budgeting (REQ-03, REQ-16):**
  - Continuous transactional disk storage in `%APPDATA%\NetSpectre\data\usage.json`.
  - Configurable Daily and Monthly bandwidth quotas with visual progress bars and warnings.
  - Historical process-level daily rollups preserved across system reboots.
- **Hardened Windows Firewall Controls (REQ-04):**
  - Automated Administrator elevation check with non-elevated read-only warning.
  - Managed rule tagging (`NETSPECTRE-`) and parameterized execution preventing command injection.
  - Emergency 1-click **Rollback All Rules** restoring outbound internet access safely.
- **Dynamic Environment Health Monitor (REQ-05):**
  - Multi-tier environment tracking (DEV, SIT, UAT, PROD) with complete CRUD (Add, Edit, Delete).
  - Persistent endpoint configuration in `%APPDATA%\NetSpectre\data\environments.json`.
  - Continuous reachability, latency history, and SSL certificate expiry countdown.
- **Comprehensive Troubleshooting Workbench (REQ-06):**
  - **Expanded DNS Inspector:** Queries all 7 standard record types: `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`.
  - **Path MTU Discovery:** Probes maximum transmission unit across the upstream path using Don't Fragment (`DF=1`) packets.
  - High-precision sub-millisecond ping jitter analysis.
- **Network Incident Forensics Recorder (REQ-07, REQ-11):**
  - Pre/post-outage sliding telemetry buffer with persistent incident archive.
  - Multi-format forensic export: **HTML standalone report**, **Markdown**, and **JSON**.
- **Explain My Network Assistant (REQ-08):**
  - Deterministic natural language reasoning engine answering everyday questions (*"Why is my internet slow?"*, *"Which apps consume my bandwidth?"*).
  - Evidence cards, diagnostic confidence ratings, and 1-click remediation links.
- **Smart Alerts Engine & Windows Desktop Notifications (REQ-09):**
  - Configurable alert rules for latency spikes, large upload bursts, and anomalous sockets.
  - Native Windows desktop notifications via Electron preload bridge.
  - Persistent alert history in `%APPDATA%\NetSpectre\data\alerts.json` with manual acknowledgement.
- **Multi-Machine Endpoint Monitor (REQ-12):**
  - Centralized dashboard for enrolling remote Windows PCs, department gateways, and databases.
  - Standalone agent deployment instructions (`NetSpectreEngine.exe --port 48123 --token <SECRET>`).
- **Local IPC Security Hardening (REQ-15):**
  - Cryptographically random session tokens exchanged exclusively between Electron and the native engine.
  - Enforced `X-NetSpectre-Auth` header verification rejecting unauthorized third-party requests.
  - Strict localhost CORS origin validation preventing malicious web page port scanning.

---

## 🏗️ Tri-Persona Workspace Architecture

NETSPECTRE features a top-level **Persona Switcher** tailored for distinct operational roles:

```
+--------------------------------------------------------------------------------------------------+
|                                    NETSPECTRE v3.1 ENTERPRISE                                     |
|  [ 👤 Personal Workspace ]     |     [ </> Developer Workspace ]    |    [ 🌐 Network Ops Workspace ]  |
+--------------------------------------------------------------------------------------------------+
```

### 1. 👤 Personal Workspace (Everyday Users)
- **Network Doctor:** 1-Click health diagnostic scoring (0–100), gateway reachability, Wi-Fi quality, and plain-English solutions.
- **Explain My Network Assistant:** Natural language troubleshooting answering connectivity and speed questions.
- **Internet Usage & Privacy Monitor:** Bandwidth consumption by app, daily/monthly persistent quotas, and background tracker detection.
- **Application Firewall Controls:** Block outbound traffic for rogue apps, manage rules, and 1-click emergency rollback.

### 2. </> Developer Workspace (Software & API Engineers)
- **API Traffic Debugger & Phase Waterfall:** Microsecond phase breakdown (DNS, TCP Connect, TLS Handshake, TTFB, Download) with automatic secret masking.
- **Live Browser Observability:** Capture HTTP/HTTPS requests from Chrome and Edge via the included browser extension.
- **HAR Archive Importer:** Drag-and-drop `.har` file viewer for analyzing external network traces.
- **API Failure Root-Cause Analyzer:** Deterministic root-cause diagnoses for `NXDOMAIN`, `CONNECTION_REFUSED`, `CERT_EXPIRED`, `CORS_ERROR`, and `502/504`.
- **Environment Monitor:** Multi-stage API tracking across DEV, SIT, UAT, and PROD with SSL certificate countdown.

### 3. 🌐 Network Operations Workspace (IT, SysAdmins & Security)
- **Packet Explorer:** Mode 1 telemetry vs Mode 2 deep wire sniffer with genuine PCAP export.
- **Troubleshooting Workbench:** Ping, Traceroute, 7-record DNS Inspector, Path MTU Discovery, TCP Port Prober, TLS Inspector, Routing Table, and Adapter MTU.
- **Incident Forensics Recorder:** Capture freeze snapshots during outages and export multi-format HTML/Markdown/JSON reports.
- **Local Security Telemetry:** Heuristic detection of uncommon ports, high-fanout flows, and persistent alert notification rules.
- **Multi-Machine Monitor:** Centralized reachability for gateways, DNS clusters, enterprise servers, and enrolled Windows nodes.

---

## 🚀 Quick Start & Installation

### Option A: Running from Source (Development)
```bash
# 1. Clone the repository
git clone https://github.com/AliAdil/netspectre.git
cd netspectre

# 2. Install Node dependencies
npm install

# 3. Build native C# engine and Vite UI
npm run build

# 4. Launch NETSPECTRE desktop application
npm run electron
```

### Option B: Building Installable Desktop Package (REQ-14)
NETSPECTRE is configured with `electron-builder` to produce standalone Windows x64 binaries:
```bash
# Compile and package Windows NSIS installer and portable executable
npm run dist
```
Output artifacts are generated in `dist-electron/`:
- `NETSPECTRE Setup 3.1.0.exe` (Complete Windows NSIS installer with Start Menu & Desktop shortcuts)
- `NETSPECTRE 3.1.0.exe` (Standalone portable single-file executable)

---

## 🔒 Security & Privacy Model

NETSPECTRE is built from the ground up as a **100% local-first enclave**:
- **Zero Cloud Exfiltration:** All telemetry, socket states, and packet buffers remain in local machine memory and `%APPDATA%\NetSpectre\data\`.
- **Session Token Verification:** The native engine is launched with an unguessable 48-character hex token (`--token <HEX>`). All REST endpoints enforce `X-NetSpectre-Auth` validation.
- **CORS Protection:** Rejects cross-origin web requests from external domains.
- **Secret Redaction:** All HTTP debuggers and report generators mask sensitive headers (`Authorization`, `Bearer`, `Cookie`, `X-Api-Key`).

---

## 📄 License
Copyright © 2026 NETSPECTRE Systems Architecture. Proprietary & Enterprise Software.
