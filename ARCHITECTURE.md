# NETSPECTRE V3.0 — System Architecture & Engineering Report
**Enterprise Network Telemetry & Diagnostics Platform**

---

## 1. Architectural Overview

NETSPECTRE is built as a modular, high-performance Windows desktop application designed to bridge low-level kernel socket dynamics with intuitive human intelligence.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NETSPECTRE FRONTEND SHELL                             │
│   React 19 • TypeScript • Tailwind CSS • Three.js WebGL 60FPS                   │
│   Zustand Store • Persona Switcher (Personal / Developer / Operations)          │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                    HTTP REST IPC (Port 48123, 750ms Polling)
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                   NATIVE WINDOWS TELEMETRY & DIAGNOSTIC ENGINE                  │
│                     (src-engine/NetSpectreEngine.exe, 64-bit)                   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Win32 IP Helper P/Invoke (iphlpapi.dll)                                 │   │
│   │ • GetExtendedTcpTable (IPv4 & IPv6 TCP Tables, States & PIDs)           │   │
│   │ • GetExtendedUdpTable (IPv4 & IPv6 UDP Listener Tables)                 │   │
│   │ • GetIfTable2 / NetworkInterface Throughput Counters                    │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Process Identification Subsystem (kernel32.dll)                         │   │
│   │ • QueryFullProcessImageNameW (PROCESS_QUERY_LIMITED_INFORMATION)        │   │
│   │ • Full Executable Path & Process Name Attribution                       │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ V3.0 Diagnostic & Operational Services                                  │   │
│   │ • NetworkDoctorService: Gateway, Internet, DNS & Wi-Fi Diagnostics      │   │
│   │ • NetworkWorkbenchService: Ping, Traceroute, DNS, Port & TLS Probing    │   │
│   │ • FirewallService: Windows Defender Firewall netsh Management           │   │
│   │ • ApiInspectorService: HTTP/HTTPS Runner with Phase Waterfall & Masking │   │
│   │ • IncidentRecorderService: Rolling Buffer & Forensic Snapshot Exporter   │   │
│   │ • InfrastructureService: Multi-Device Reachability Monitoring           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tri-Persona Architecture & User Workspaces

### 2.1 Personal Workspace
- **Target Audience:** Everyday Windows users, remote workers, home network managers.
- **Components:**
  - `NetworkDoctorScreen.tsx`: Automated health diagnostic calculating a 0–100 Health Quality Index with plain-English solutions.
  - `InternetUsageScreen.tsx`: Per-app data volume progress bars, background bandwidth consumer detection, and tracker auditing.
  - `FirewallControlScreen.tsx`: 1-click outbound executable blocking via Windows Defender Firewall with audit history.

### 2.2 Developer Workspace
- **Target Audience:** Software engineers, API developers, microservice architects.
- **Components:**
  - `ApiInspectorScreen.tsx`: REST API request runner with microsecond phase waterfall (DNS $\rightarrow$ TCP $\rightarrow$ TLS $\rightarrow$ TTFB $\rightarrow$ Download), automated token masking, and cURL / HAR exports.
  - `ApiFailureAnalyzerScreen.tsx`: Automated root-cause diagnostics (DNS NXDOMAIN, TCP connection refused, SSL expired, CORS blocked, 502/504 timeouts) and developer playbooks.
  - `EnvironmentMonitorScreen.tsx`: Reachability, response time, and SSL certificate expiration tracking across DEV, SIT, UAT, and PROD.
  - `DataCommunicationExplorer.tsx`: OS-level network frame inspection and cryptographic TLS 1.3 / QUIC transparency disclosure.

### 2.3 Network Operations Workspace
- **Target Audience:** IT administrators, network infrastructure specialists, SOC security analysts.
- **Components:**
  - `NetworkUniverse.tsx`: 2.5D orthographic neural highway with 5 columns (Local System $\rightarrow$ Applications $\rightarrow$ Protocols $\rightarrow$ Destinations $\rightarrow$ ASN/Cloud), directional amber/cyan particle flow, 5 visualization modes, and right-click context menu.
  - `NetworkWorkbenchScreen.tsx`: Deep troubleshooting suite featuring Ping (with jitter/loss), Traceroute (with reverse DNS), DNS lookup, TCP Port Prober, TLS Certificate Inspector, Routing Table, and Adapter & MTU configuration.
  - `IncidentRecorderScreen.tsx`: Freeze telemetry snapshots during outages and export forensic Markdown/JSON incident reports.
  - `MultiMachineScreen.tsx`: Multi-device and infrastructure reachability monitoring.
  - `PacketExplorer.tsx`: Circular packet buffer with protocol filtering and binary PCAP export for Wireshark.

---

## 3. Windows Kernel & Telemetry Layer

### 3.1 Socket Flow Collection
- Uses `GetExtendedTcpTable` with `TCP_TABLE_OWNER_PID_ALL` (value `5`) to retrieve all IPv4 and IPv6 TCP sockets, connection states (`ESTABLISHED`, `LISTENING`, `TIME_WAIT`, `CLOSE_WAIT`), and owning PIDs.
- Uses `GetExtendedUdpTable` with `UDP_TABLE_OWNER_PID` (value `1`) for UDP listener sockets.

### 3.2 Process Attribution
- Calls `QueryFullProcessImageNameW` using `PROCESS_QUERY_LIMITED_INFORMATION = 0x1000`.
- Avoids elevation exceptions while reliably resolving executable paths across system and user processes.

### 3.3 Hardware-Level Rate Calculation
- Interface counters are queried every 750ms using `NetworkInterface.GetAllNetworkInterfaces()`.
- Bandwidth deltas divided by elapsed time calculate instantaneous downlink and uplink rates.
- Rates are apportioned across active `ESTABLISHED` flows and accumulated over each socket's lifetime.

---

## 4. Native Diagnostic Services (`NetSpectreEngine.cs`)

### 4.1 Network Doctor Service
- Queries active gateway IPs, prioritizing non-virtual physical adapters over VPNs.
- Pings Gateway and public internet backbones (`1.1.1.1` and `8.8.8.8`).
- Measures DNS lookup latency against `cloudflare.com`.
- Extracts Wi-Fi signal quality, SSID, and radio type via `netsh wlan show interfaces`.
- Calculates an objective 0–100 Health Quality Index and generates structured actionable findings.

### 4.2 Network Workbench Service
- **Ping:** Sends ICMP echo requests with configurable count and timeout, tracking min/avg/max latency, packet loss %, and jitter.
- **Traceroute:** Increments ICMP TTL from 1 to 20, recording hop IPs, reverse hostnames, and round-trip times.
- **DNS Inspector:** Queries `Dns.GetHostEntry` for A, AAAA, and CNAME records, measuring query duration.
- **Port Tester:** Executes non-blocking TCP connect handshakes and reads service greeting banners.
- **TLS Inspector:** Completes TLS handshake via `SslStream`, extracting Subject, Issuer, Validity Dates, Days Remaining, Cipher Suite, and Subject Alternative Names (SANs).
- **Routing Table:** Parses system IPv4 routing tables into structured records.
- **Adapter Inspector:** Retrieves link speeds, MAC addresses, MTUs, and IPv4/IPv6 assignments.

### 4.3 Firewall Service
- Manages Windows Defender Firewall outbound rules via `netsh advfirewall firewall add/delete rule`.
- Maintains an in-memory chronological audit log of all block and unblock actions.

### 4.4 API Inspector Service
- Executes HTTP/HTTPS requests with phase-by-phase `Stopwatch` timing (DNS, TCP, TLS, TTFB, Download).
- Automatically masks sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`, `Token`, `Secret`).
- Generates deterministic root-cause analysis for any failed connection.

---

## 5. REST API Endpoint Reference (`http://127.0.0.1:48123`)

| HTTP Method | URI Path | Service |
| :--- | :--- | :--- |
| `GET` | `/api/status` or `/api/telemetry` | Full telemetry snapshot. |
| `GET` | `/api/history` | Rolling 60-point throughput history buffer. |
| `GET` | `/api/pcap/export` | Generates standard binary PCAP capture file. |
| `GET` | `/api/diagnose/doctor` | Health diagnostic (Gateway, Internet, DNS, Wi-Fi, Score). |
| `GET` | `/api/workbench/ping` | ICMP Ping test with min/avg/max/jitter statistics. |
| `GET` | `/api/workbench/traceroute` | ICMP TTL-increment traceroute with reverse hostnames. |
| `GET` | `/api/workbench/dns` | DNS records (A, AAAA, CNAME) and resolution speed. |
| `GET` | `/api/workbench/port` | TCP 3-way handshake connect latency and service banner. |
| `GET` | `/api/workbench/tls` | TLS handshake, certificate expiry, SANs, and ciphers. |
| `GET` | `/api/workbench/routes` | System IPv4 routing table. |
| `GET` | `/api/workbench/adapters` | Physical and virtual adapters with link speeds and MACs. |
| `GET` | `/api/firewall/rules` | Lists active NETSPECTRE firewall block rules. |
| `POST` | `/api/firewall/block` | Adds outbound executable block rule via `netsh`. |
| `POST` | `/api/firewall/unblock` | Deletes outbound executable rule via `netsh`. |
| `POST` | `/api/api-inspector/execute` | Executes HTTP/HTTPS request with waterfall metrics. |
| `GET` | `/api/api-inspector/history` | Returns recent developer API executions. |
| `POST` | `/api/incident/snapshot` | Freezes current network state and compiles incident report. |
| `GET` | `/api/incident/report` | Returns last recorded forensic report. |
| `GET` | `/api/devices` | Probes default gateway, DNS resolvers, and cloud endpoints. |
| `POST` | `/api/shutdown` | Graceful engine termination. |
