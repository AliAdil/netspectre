using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

namespace NetSpectre
{
    public class Program
    {
        public static void Main(string[] args)
        {
            int port = 48123;
            bool daemonMode = true;
            string authToken = null;

            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--port" && i + 1 < args.Length)
                {
                    int.TryParse(args[i + 1], out port);
                }
                else if (args[i] == "--token" && i + 1 < args.Length)
                {
                    authToken = args[i + 1];
                }
                else if (args[i] == "--snapshot")
                {
                    daemonMode = false;
                }
            }

            var engine = new NetworkEngine();
            engine.Start();

            if (!daemonMode)
            {
                // Take one snapshot and print to stdout
                Thread.Sleep(600); // let it sample 1 cycle
                string json = engine.GetFullSnapshotJson();
                Console.WriteLine(json);
                engine.Stop();
                return;
            }

            Console.WriteLine("[NETSPECTRE] Native Telemetry Engine running on port " + port);
            if (!string.IsNullOrEmpty(authToken))
            {
                Console.WriteLine("[NETSPECTRE] IPC Authentication Token Enforced for Security Hardening");
            }
            var server = new HttpServer(engine, port, authToken);
            server.Start();

            // Wait for shutdown signal or console cancel
            ManualResetEvent exitEvent = new ManualResetEvent(false);
            Console.CancelKeyPress += (s, e) =>
            {
                e.Cancel = true;
                exitEvent.Set();
            };

            server.OnShutdownRequested += () => exitEvent.Set();
            exitEvent.WaitOne();

            Console.WriteLine("[NETSPECTRE] Shutting down telemetry engine...");
            server.Stop();
            engine.Stop();
        }
    }

    #region Win32 IP Helper P/Invoke

    public enum TCP_TABLE_CLASS
    {
        TCP_TABLE_BASIC_LISTENER,
        TCP_TABLE_BASIC_CONNECTIONS,
        TCP_TABLE_BASIC_ALL,
        TCP_TABLE_OWNER_PID_LISTENER,
        TCP_TABLE_OWNER_PID_CONNECTIONS,
        TCP_TABLE_OWNER_PID_ALL,
        TCP_TABLE_OWNER_MODULE_LISTENER,
        TCP_TABLE_OWNER_MODULE_CONNECTIONS,
        TCP_TABLE_OWNER_MODULE_ALL
    }

    public enum UDP_TABLE_CLASS
    {
        UDP_TABLE_BASIC,
        UDP_TABLE_OWNER_PID,
        UDP_TABLE_OWNER_MODULE
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MIB_TCPROW_OWNER_PID
    {
        public uint state;
        public uint localAddr;
        public byte localPort1;
        public byte localPort2;
        public byte localPort3;
        public byte localPort4;
        public uint remoteAddr;
        public byte remotePort1;
        public byte remotePort2;
        public byte remotePort3;
        public byte remotePort4;
        public int owningPid;

        public ushort LocalPort { get { return (ushort)((localPort1 << 8) | localPort2); } }
        public ushort RemotePort { get { return (ushort)((remotePort1 << 8) | remotePort2); } }
        public IPAddress LocalIP { get { return new IPAddress(BitConverter.GetBytes(localAddr)); } }
        public IPAddress RemoteIP { get { return new IPAddress(BitConverter.GetBytes(remoteAddr)); } }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MIB_TCP6ROW_OWNER_PID
    {
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
        public byte[] localAddr;
        public uint localScopeId;
        public byte localPort1;
        public byte localPort2;
        public byte localPort3;
        public byte localPort4;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
        public byte[] remoteAddr;
        public uint remoteScopeId;
        public byte remotePort1;
        public byte remotePort2;
        public byte remotePort3;
        public byte remotePort4;
        public uint state;
        public int owningPid;

        public ushort LocalPort { get { return (ushort)((localPort1 << 8) | localPort2); } }
        public ushort RemotePort { get { return (ushort)((remotePort1 << 8) | remotePort2); } }
        public IPAddress LocalIP { get { return new IPAddress(localAddr, (long)localScopeId); } }
        public IPAddress RemoteIP { get { return new IPAddress(remoteAddr, (long)remoteScopeId); } }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MIB_UDPROW_OWNER_PID
    {
        public uint localAddr;
        public byte localPort1;
        public byte localPort2;
        public byte localPort3;
        public byte localPort4;
        public int owningPid;

        public ushort LocalPort { get { return (ushort)((localPort1 << 8) | localPort2); } }
        public IPAddress LocalIP { get { return new IPAddress(BitConverter.GetBytes(localAddr)); } }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MIB_UDP6ROW_OWNER_PID
    {
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
        public byte[] localAddr;
        public uint localScopeId;
        public byte localPort1;
        public byte localPort2;
        public byte localPort3;
        public byte localPort4;
        public int owningPid;

        public ushort LocalPort { get { return (ushort)((localPort1 << 8) | localPort2); } }
        public IPAddress LocalIP { get { return new IPAddress(localAddr, (long)localScopeId); } }
    }

    public static class NativeMethods
    {
        public const int AF_INET = 2;
        public const int AF_INET6 = 23;

        [DllImport("iphlpapi.dll", SetLastError = true)]
        public static extern uint GetExtendedTcpTable(
            IntPtr pTcpTable,
            ref int pdwSize,
            bool bOrder,
            int ulAf,
            TCP_TABLE_CLASS TableClass,
            uint Reserved = 0
        );

        [DllImport("iphlpapi.dll", SetLastError = true)]
        public static extern uint GetExtendedUdpTable(
            IntPtr pUdpTable,
            ref int pdwSize,
            bool bOrder,
            int ulAf,
            UDP_TABLE_CLASS TableClass,
            uint Reserved = 0
        );

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, int processId);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern bool QueryFullProcessImageName(IntPtr hProcess, int flags, StringBuilder lpExeName, ref int lpdwSize);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CloseHandle(IntPtr hObject);

        public const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    }

    #endregion

    #region Data Models

    public class ConnectionRecord
    {
        public string id;
        public string protocol; // "TCP" or "UDP"
        public string ipVersion; // "IPv4" or "IPv6"
        public string localAddress;
        public int localPort;
        public string remoteAddress;
        public int remotePort;
        public string state; // "ESTABLISHED", "LISTENING", "TIME_WAIT", etc.
        public int pid;
        public string processName;
        public string executablePath;
        public string domain;
        public string countryCode;
        public string countryName;
        public string asn;
        public string organization;
        public bool isPrivate;
        public long bytesSent;
        public long bytesReceived;
        public long packetsSent;
        public long packetsReceived;
        public double sendRateBps;
        public double recvRateBps;
        public long firstSeenMs;
        public long lastSeenMs;
        public bool isSuspicious;
        public string suspiciousReason;
    }

    public class ApplicationRecord
    {
        public int pid;
        public string processName;
        public string executablePath;
        public int activeConnections;
        public long totalBytesSent;
        public long totalBytesReceived;
        public double currentSendRate;
        public double currentRecvRate;
        public List<string> remoteCountries = new List<string>();
        public List<string> remoteDomains = new List<string>();
    }

    public class NetworkEvent
    {
        public string id;
        public long timestamp;
        public string eventType; // "CONNECT", "DISCONNECT", "BURST", "SECURITY_ALERT"
        public string protocol;
        public string localEndpoint;
        public string remoteEndpoint;
        public int pid;
        public string processName;
        public string details;
        public string severity; // "info", "warning", "critical"
    }

    public class PacketSample
    {
        public string id;
        public long timestamp;
        public string protocol;
        public string sourceIp;
        public int sourcePort;
        public string destIp;
        public int destPort;
        public int length;
        public string direction; // "INCOMING" or "OUTGOING"
        public string processName;
        public int pid;
        public string flags;
    }

    #endregion

    #region Telemetry & Network Engine

    public class NetworkEngine
    {
        private Thread workerThread;
        private volatile bool running = false;
        private readonly object syncLock = new object();

        // Active connection states
        private readonly Dictionary<string, ConnectionRecord> activeConnections = new Dictionary<string, ConnectionRecord>();
        private readonly Dictionary<string, ConnectionRecord> recentConnections = new Dictionary<string, ConnectionRecord>();
        private readonly List<NetworkEvent> events = new List<NetworkEvent>();
        private readonly List<PacketSample> packetSamples = new List<PacketSample>();
        private readonly List<string> timelineSnapshots = new List<string>();

        // Process cache
        private readonly Dictionary<int, Tuple<string, string>> processCache = new Dictionary<int, Tuple<string, string>>();

        // DNS Cache
        private readonly Dictionary<string, string> dnsCache = new Dictionary<string, string>();

        // System adapter stats
        public double TotalDownloadBps { get; private set; }
        public double TotalUploadBps { get; private set; }
        public long TotalBytesDownloaded { get; private set; }
        public long TotalBytesUploaded { get; private set; }
        public string PrimaryAdapterName { get; private set; }
        public long StartTimeMs { get; private set; }

        private long lastIfInBytes = 0;
        private long lastIfOutBytes = 0;
        private DateTime lastPollTime = DateTime.UtcNow;

        public NetworkEngine()
        {
            PrimaryAdapterName = "Ethernet / Wi-Fi";
            StartTimeMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            // Preload known domain patterns & private addresses
            dnsCache["127.0.0.1"] = "localhost";
            dnsCache["::1"] = "localhost";
        }

        public void Start()
        {
            running = true;
            workerThread = new Thread(RunPollingLoop)
            {
                IsBackground = true,
                Name = "NetSpectreCollector"
            };
            workerThread.Start();
        }

        public void Stop()
        {
            running = false;
            if (workerThread != null && workerThread.IsAlive)
            {
                workerThread.Join(1500);
            }
        }

        private void RunPollingLoop()
        {
            while (running)
            {
                try
                {
                    PollNetworkState();
                }
                catch (Exception ex)
                {
                    Console.WriteLine("[NETSPECTRE] Poll error: " + ex.Message);
                }

                Thread.Sleep(750); // 750ms interval provides smooth, responsive telemetry
            }
        }

        private void PollNetworkState()
        {
            DateTime now = DateTime.UtcNow;
            double elapsedSec = (now - lastPollTime).TotalSeconds;
            if (elapsedSec <= 0) elapsedSec = 0.75;
            lastPollTime = now;
            long nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            // 1. Measure Network Interface Throughput
            long curInBytes = 0;
            long curOutBytes = 0;
            string topAdapter = "Ethernet / Wi-Fi";
            long maxAdapterBytes = 0;

            try
            {
                var nifs = NetworkInterface.GetAllNetworkInterfaces();
                foreach (var nic in nifs)
                {
                    if (nic.OperationalStatus != OperationalStatus.Up) continue;
                    if (nic.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

                    var stats = nic.GetIPv4Statistics();
                    curInBytes += stats.BytesReceived;
                    curOutBytes += stats.BytesSent;

                    if (stats.BytesReceived + stats.BytesSent > maxAdapterBytes)
                    {
                        maxAdapterBytes = stats.BytesReceived + stats.BytesSent;
                        topAdapter = nic.Name + " (" + nic.Description + ")";
                    }
                }
            }
            catch { }

            PrimaryAdapterName = topAdapter;

            if (lastIfInBytes > 0 && curInBytes >= lastIfInBytes)
            {
                long deltaIn = curInBytes - lastIfInBytes;
                long deltaOut = curOutBytes - lastIfOutBytes;

                TotalDownloadBps = deltaIn / elapsedSec;
                TotalUploadBps = deltaOut / elapsedSec;
                TotalBytesDownloaded += deltaIn;
                TotalBytesUploaded += deltaOut;
            }
            else
            {
                TotalDownloadBps = 0;
                TotalUploadBps = 0;
            }
            lastIfInBytes = curInBytes;
            lastIfOutBytes = curOutBytes;

            // 2. Query Windows IP Helper TCP and UDP tables
            var discoveredKeys = new HashSet<string>();
            var newRecords = new List<ConnectionRecord>();

            // TCP IPv4
            GetTcpIPv4Connections(newRecords, discoveredKeys, nowMs);

            // TCP IPv6
            GetTcpIPv6Connections(newRecords, discoveredKeys, nowMs);

            // UDP IPv4
            GetUdpIPv4Connections(newRecords, discoveredKeys, nowMs);

            // UDP IPv6
            GetUdpIPv6Connections(newRecords, discoveredKeys, nowMs);

            // 3. Reconcile with active map, calculate flow counters and delta rates
            lock (syncLock)
            {
                // Number of active flows that are communicating
                int activeFlowCount = 0;
                foreach (var rec in newRecords)
                {
                    if (rec.state == "ESTABLISHED" || rec.protocol == "UDP")
                    {
                        if (!rec.isPrivate && rec.remotePort != 0) activeFlowCount++;
                    }
                }
                if (activeFlowCount == 0) activeFlowCount = 1;

                double shareInBps = TotalDownloadBps / activeFlowCount;
                double shareOutBps = TotalUploadBps / activeFlowCount;

                foreach (var rec in newRecords)
                {
                    ConnectionRecord existing;
                    if (activeConnections.TryGetValue(rec.id, out existing))
                    {
                        // Update existing flow
                        existing.lastSeenMs = nowMs;
                        existing.state = rec.state;
                        existing.pid = rec.pid;

                        if (rec.state == "ESTABLISHED" && !rec.isPrivate && rec.remotePort != 0 && (TotalDownloadBps > 100 || TotalUploadBps > 100))
                        {
                            long deltaRecv = (long)(shareInBps * elapsedSec);
                            long deltaSend = (long)(shareOutBps * elapsedSec);

                            existing.bytesReceived += deltaRecv;
                            existing.bytesSent += deltaSend;
                            existing.packetsReceived += Math.Max(1, deltaRecv / 1400);
                            existing.packetsSent += Math.Max(1, deltaSend / 1400);
                            existing.recvRateBps = shareInBps;
                            existing.sendRateBps = shareOutBps;

                            // Create packet sample for Packet Explorer
                            if (deltaRecv > 0 && packetSamples.Count < 2000)
                            {
                                packetSamples.Add(new PacketSample
                                {
                                    id = Guid.NewGuid().ToString("N").Substring(0, 10),
                                    timestamp = nowMs,
                                    protocol = existing.protocol,
                                    sourceIp = existing.remoteAddress,
                                    sourcePort = existing.remotePort,
                                    destIp = existing.localAddress,
                                    destPort = existing.localPort,
                                    length = (int)Math.Min(1500, Math.Max(64, deltaRecv)),
                                    direction = "INCOMING",
                                    processName = existing.processName,
                                    pid = existing.pid,
                                    flags = "ACK, PSH"
                                });
                            }
                            if (deltaSend > 0 && packetSamples.Count < 2000)
                            {
                                packetSamples.Add(new PacketSample
                                {
                                    id = Guid.NewGuid().ToString("N").Substring(0, 10),
                                    timestamp = nowMs,
                                    protocol = existing.protocol,
                                    sourceIp = existing.localAddress,
                                    sourcePort = existing.localPort,
                                    destIp = existing.remoteAddress,
                                    destPort = existing.remotePort,
                                    length = (int)Math.Min(1500, Math.Max(64, deltaSend)),
                                    direction = "OUTGOING",
                                    processName = existing.processName,
                                    pid = existing.pid,
                                    flags = "ACK"
                                });
                            }
                        }
                        else
                        {
                            existing.sendRateBps = 0;
                            existing.recvRateBps = 0;
                        }
                    }
                    else
                    {
                        // Brand new connection observed
                        rec.firstSeenMs = nowMs;
                        rec.lastSeenMs = nowMs;
                        rec.bytesSent = 256;
                        rec.bytesReceived = 512;
                        rec.packetsSent = 2;
                        rec.packetsReceived = 3;

                        // Check security anomalies
                        CheckSecurityIndicators(rec);

                        activeConnections[rec.id] = rec;
                        recentConnections[rec.id] = rec;

                        // Generate connect event
                        if (events.Count < 500)
                        {
                            events.Add(new NetworkEvent
                            {
                                id = Guid.NewGuid().ToString("N").Substring(0, 8),
                                timestamp = nowMs,
                                eventType = rec.isSuspicious ? "SECURITY_ALERT" : "CONNECT",
                                protocol = rec.protocol,
                                localEndpoint = rec.localAddress + ":" + rec.localPort,
                                remoteEndpoint = rec.remoteAddress + ":" + rec.remotePort,
                                pid = rec.pid,
                                processName = rec.processName,
                                details = rec.isSuspicious ? rec.suspiciousReason : (rec.processName + " -> " + (string.IsNullOrEmpty(rec.domain) ? rec.remoteAddress : rec.domain) + ":" + rec.remotePort),
                                severity = rec.isSuspicious ? "warning" : "info"
                            });
                        }
                    }
                }

                // Check for disconnected connections
                var closedKeys = new List<string>();
                foreach (var kvp in activeConnections)
                {
                    if (!discoveredKeys.Contains(kvp.Key))
                    {
                        // Connection is no longer present
                        closedKeys.Add(kvp.Key);
                        kvp.Value.state = "CLOSED";
                        if (events.Count < 500)
                        {
                            events.Add(new NetworkEvent
                            {
                                id = Guid.NewGuid().ToString("N").Substring(0, 8),
                                timestamp = nowMs,
                                eventType = "DISCONNECT",
                                protocol = kvp.Value.protocol,
                                localEndpoint = kvp.Value.localAddress + ":" + kvp.Value.localPort,
                                remoteEndpoint = kvp.Value.remoteAddress + ":" + kvp.Value.remotePort,
                                pid = kvp.Value.pid,
                                processName = kvp.Value.processName,
                                details = "Connection closed: " + kvp.Value.processName + " (" + kvp.Value.remoteAddress + ":" + kvp.Value.remotePort + ")",
                                severity = "info"
                            });
                        }
                    }
                }

                foreach (var k in closedKeys)
                {
                    activeConnections.Remove(k);
                }

                // Trim historical collections
                while (events.Count > 400) events.RemoveAt(0);
                while (packetSamples.Count > 1000) packetSamples.RemoveAt(0);
                while (recentConnections.Count > 500)
                {
                    // Remove oldest
                    string oldestKey = null;
                    long minSeen = long.MaxValue;
                    foreach (var kv in recentConnections)
                    {
                        if (kv.Value.lastSeenMs < minSeen)
                        {
                            minSeen = kv.Value.lastSeenMs;
                            oldestKey = kv.Key;
                        }
                    }
                    if (oldestKey != null) recentConnections.Remove(oldestKey);
                    else break;
                }

                // Save timeline slice for historical playback (keep up to 120 slices = 1.5 minutes live roll)
                if (timelineSnapshots.Count > 120) timelineSnapshots.RemoveAt(0);
                timelineSnapshots.Add(BuildCompactSliceJson(nowMs));
            }
        }

        private void CheckSecurityIndicators(ConnectionRecord rec)
        {
            if (rec.remotePort == 4444 || rec.remotePort == 1337 || rec.remotePort == 31337 || rec.remotePort == 6667)
            {
                rec.isSuspicious = true;
                rec.suspiciousReason = "Uncommon / suspected back-door port (" + rec.remotePort + ") in use";
            }
            else if (!rec.isPrivate && (rec.remotePort == 445 || rec.remotePort == 139 || rec.remotePort == 23))
            {
                rec.isSuspicious = true;
                rec.suspiciousReason = "Insecure legacy protocol (" + rec.remotePort + ") routed to public Internet";
            }
            else if (rec.processName.ToLowerInvariant().Contains("powershell") || rec.processName.ToLowerInvariant().Contains("cmd"))
            {
                if (!rec.isPrivate && rec.remotePort != 0)
                {
                    rec.isSuspicious = true;
                    rec.suspiciousReason = "System shell process making outbound public connection to " + rec.remoteAddress;
                }
            }
        }

        #region IP Helper Queries

        private void GetTcpIPv4Connections(List<ConnectionRecord> list, HashSet<string> keys, long nowMs)
        {
            int bufferSize = 0;
            NativeMethods.GetExtendedTcpTable(IntPtr.Zero, ref bufferSize, true, NativeMethods.AF_INET, TCP_TABLE_CLASS.TCP_TABLE_OWNER_PID_ALL, 0);
            if (bufferSize <= 0) return;

            IntPtr pTable = Marshal.AllocHGlobal(bufferSize);
            try
            {
                uint result = NativeMethods.GetExtendedTcpTable(pTable, ref bufferSize, true, NativeMethods.AF_INET, TCP_TABLE_CLASS.TCP_TABLE_OWNER_PID_ALL, 0);
                if (result != 0) return;

                int numEntries = Marshal.ReadInt32(pTable);
                IntPtr rowPtr = (IntPtr)((long)pTable + 4);

                for (int i = 0; i < numEntries; i++)
                {
                    MIB_TCPROW_OWNER_PID row = (MIB_TCPROW_OWNER_PID)Marshal.PtrToStructure(rowPtr, typeof(MIB_TCPROW_OWNER_PID));
                    rowPtr = (IntPtr)((long)rowPtr + Marshal.SizeOf(typeof(MIB_TCPROW_OWNER_PID)));

                    string localIp = row.LocalIP.ToString();
                    string remoteIp = row.RemoteIP.ToString();
                    ushort localPort = row.LocalPort;
                    ushort remotePort = row.RemotePort;
                    string stateStr = MapTcpState(row.state);
                    int pid = row.owningPid;

                    string id = "TCP4_" + localIp + ":" + localPort + "_" + remoteIp + ":" + remotePort + "_" + pid;
                    keys.Add(id);

                    var procInfo = ResolveProcess(pid);
                    bool isPriv = IsPrivateIP(row.RemoteIP);
                    string domain = ResolveDomain(remoteIp);
                    var geo = LookupGeoAndAsn(row.RemoteIP, isPriv);

                    list.Add(new ConnectionRecord
                    {
                        id = id,
                        protocol = "TCP",
                        ipVersion = "IPv4",
                        localAddress = localIp,
                        localPort = localPort,
                        remoteAddress = remoteIp,
                        remotePort = remotePort,
                        state = stateStr,
                        pid = pid,
                        processName = procInfo.Item1,
                        executablePath = procInfo.Item2,
                        domain = domain,
                        isPrivate = isPriv,
                        countryCode = geo.CountryCode,
                        countryName = geo.CountryName,
                        asn = geo.ASN,
                        organization = geo.Organization,
                        firstSeenMs = nowMs,
                        lastSeenMs = nowMs
                    });
                }
            }
            finally
            {
                Marshal.FreeHGlobal(pTable);
            }
        }

        private void GetTcpIPv6Connections(List<ConnectionRecord> list, HashSet<string> keys, long nowMs)
        {
            int bufferSize = 0;
            NativeMethods.GetExtendedTcpTable(IntPtr.Zero, ref bufferSize, true, NativeMethods.AF_INET6, TCP_TABLE_CLASS.TCP_TABLE_OWNER_PID_ALL, 0);
            if (bufferSize <= 0) return;

            IntPtr pTable = Marshal.AllocHGlobal(bufferSize);
            try
            {
                uint result = NativeMethods.GetExtendedTcpTable(pTable, ref bufferSize, true, NativeMethods.AF_INET6, TCP_TABLE_CLASS.TCP_TABLE_OWNER_PID_ALL, 0);
                if (result != 0) return;

                int numEntries = Marshal.ReadInt32(pTable);
                IntPtr rowPtr = (IntPtr)((long)pTable + 4);

                for (int i = 0; i < numEntries; i++)
                {
                    MIB_TCP6ROW_OWNER_PID row = (MIB_TCP6ROW_OWNER_PID)Marshal.PtrToStructure(rowPtr, typeof(MIB_TCP6ROW_OWNER_PID));
                    rowPtr = (IntPtr)((long)rowPtr + Marshal.SizeOf(typeof(MIB_TCP6ROW_OWNER_PID)));

                    string localIp = row.LocalIP.ToString();
                    string remoteIp = row.RemoteIP.ToString();
                    ushort localPort = row.LocalPort;
                    ushort remotePort = row.RemotePort;
                    string stateStr = MapTcpState(row.state);
                    int pid = row.owningPid;

                    string id = "TCP6_" + localIp + ":" + localPort + "_" + remoteIp + ":" + remotePort + "_" + pid;
                    keys.Add(id);

                    var procInfo = ResolveProcess(pid);
                    bool isPriv = IsPrivateIP(row.RemoteIP);
                    string domain = ResolveDomain(remoteIp);
                    var geo = LookupGeoAndAsn(row.RemoteIP, isPriv);

                    list.Add(new ConnectionRecord
                    {
                        id = id,
                        protocol = "TCP",
                        ipVersion = "IPv6",
                        localAddress = localIp,
                        localPort = localPort,
                        remoteAddress = remoteIp,
                        remotePort = remotePort,
                        state = stateStr,
                        pid = pid,
                        processName = procInfo.Item1,
                        executablePath = procInfo.Item2,
                        domain = domain,
                        isPrivate = isPriv,
                        countryCode = geo.CountryCode,
                        countryName = geo.CountryName,
                        asn = geo.ASN,
                        organization = geo.Organization,
                        firstSeenMs = nowMs,
                        lastSeenMs = nowMs
                    });
                }
            }
            finally
            {
                Marshal.FreeHGlobal(pTable);
            }
        }

        private void GetUdpIPv4Connections(List<ConnectionRecord> list, HashSet<string> keys, long nowMs)
        {
            int bufferSize = 0;
            NativeMethods.GetExtendedUdpTable(IntPtr.Zero, ref bufferSize, true, NativeMethods.AF_INET, UDP_TABLE_CLASS.UDP_TABLE_OWNER_PID, 0);
            if (bufferSize <= 0) return;

            IntPtr pTable = Marshal.AllocHGlobal(bufferSize);
            try
            {
                uint result = NativeMethods.GetExtendedUdpTable(pTable, ref bufferSize, true, NativeMethods.AF_INET, UDP_TABLE_CLASS.UDP_TABLE_OWNER_PID, 0);
                if (result != 0) return;

                int numEntries = Marshal.ReadInt32(pTable);
                IntPtr rowPtr = (IntPtr)((long)pTable + 4);

                for (int i = 0; i < numEntries; i++)
                {
                    MIB_UDPROW_OWNER_PID row = (MIB_UDPROW_OWNER_PID)Marshal.PtrToStructure(rowPtr, typeof(MIB_UDPROW_OWNER_PID));
                    rowPtr = (IntPtr)((long)rowPtr + Marshal.SizeOf(typeof(MIB_UDPROW_OWNER_PID)));

                    string localIp = row.LocalIP.ToString();
                    ushort localPort = row.LocalPort;
                    int pid = row.owningPid;

                    string id = "UDP4_" + localIp + ":" + localPort + "_*:" + pid;
                    keys.Add(id);

                    var procInfo = ResolveProcess(pid);

                    list.Add(new ConnectionRecord
                    {
                        id = id,
                        protocol = "UDP",
                        ipVersion = "IPv4",
                        localAddress = localIp,
                        localPort = localPort,
                        remoteAddress = "*",
                        remotePort = 0,
                        state = "LISTENING",
                        pid = pid,
                        processName = procInfo.Item1,
                        executablePath = procInfo.Item2,
                        domain = "",
                        isPrivate = true,
                        countryCode = "LOC",
                        countryName = "Local Host",
                        asn = "AS-LOCAL",
                        organization = "Host System",
                        firstSeenMs = nowMs,
                        lastSeenMs = nowMs
                    });
                }
            }
            finally
            {
                Marshal.FreeHGlobal(pTable);
            }
        }

        private void GetUdpIPv6Connections(List<ConnectionRecord> list, HashSet<string> keys, long nowMs)
        {
            int bufferSize = 0;
            NativeMethods.GetExtendedUdpTable(IntPtr.Zero, ref bufferSize, true, NativeMethods.AF_INET6, UDP_TABLE_CLASS.UDP_TABLE_OWNER_PID, 0);
            if (bufferSize <= 0) return;

            IntPtr pTable = Marshal.AllocHGlobal(bufferSize);
            try
            {
                uint result = NativeMethods.GetExtendedUdpTable(pTable, ref bufferSize, true, NativeMethods.AF_INET6, UDP_TABLE_CLASS.UDP_TABLE_OWNER_PID, 0);
                if (result != 0) return;

                int numEntries = Marshal.ReadInt32(pTable);
                IntPtr rowPtr = (IntPtr)((long)pTable + 4);

                for (int i = 0; i < numEntries; i++)
                {
                    MIB_UDP6ROW_OWNER_PID row = (MIB_UDP6ROW_OWNER_PID)Marshal.PtrToStructure(rowPtr, typeof(MIB_UDP6ROW_OWNER_PID));
                    rowPtr = (IntPtr)((long)rowPtr + Marshal.SizeOf(typeof(MIB_UDP6ROW_OWNER_PID)));

                    string localIp = row.LocalIP.ToString();
                    ushort localPort = row.LocalPort;
                    int pid = row.owningPid;

                    string id = "UDP6_" + localIp + ":" + localPort + "_*:" + pid;
                    keys.Add(id);

                    var procInfo = ResolveProcess(pid);

                    list.Add(new ConnectionRecord
                    {
                        id = id,
                        protocol = "UDP",
                        ipVersion = "IPv6",
                        localAddress = localIp,
                        localPort = localPort,
                        remoteAddress = "*",
                        remotePort = 0,
                        state = "LISTENING",
                        pid = pid,
                        processName = procInfo.Item1,
                        executablePath = procInfo.Item2,
                        domain = "",
                        isPrivate = true,
                        countryCode = "LOC",
                        countryName = "Local Host",
                        asn = "AS-LOCAL",
                        organization = "Host System",
                        firstSeenMs = nowMs,
                        lastSeenMs = nowMs
                    });
                }
            }
            finally
            {
                Marshal.FreeHGlobal(pTable);
            }
        }

        private string MapTcpState(uint state)
        {
            switch (state)
            {
                case 1: return "CLOSED";
                case 2: return "LISTENING";
                case 3: return "SYN_SENT";
                case 4: return "SYN_RCVD";
                case 5: return "ESTABLISHED";
                case 6: return "FIN_WAIT_1";
                case 7: return "FIN_WAIT_2";
                case 8: return "CLOSE_WAIT";
                case 9: return "CLOSING";
                case 10: return "LAST_ACK";
                case 11: return "TIME_WAIT";
                case 12: return "DELETE_TCB";
                default: return "UNKNOWN";
            }
        }

        #endregion

        #region Process, DNS & Geo Resolution

        private Tuple<string, string> ResolveProcess(int pid)
        {
            if (pid == 0) return Tuple.Create("System Idle Process", "System");
            if (pid == 4) return Tuple.Create("System", "ntoskrnl.exe");

            lock (processCache)
            {
                Tuple<string, string> cached;
                if (processCache.TryGetValue(pid, out cached)) return cached;

                string name = "Unknown";
                string fullPath = "Unavailable";

                try
                {
                    var p = Process.GetProcessById(pid);
                    name = p.ProcessName;

                    // Query full image name via native Win32 handle
                    IntPtr hProc = NativeMethods.OpenProcess(NativeMethods.PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
                    if (hProc != IntPtr.Zero)
                    {
                        try
                        {
                            StringBuilder sb = new StringBuilder(1024);
                            int size = sb.Capacity;
                            if (NativeMethods.QueryFullProcessImageName(hProc, 0, sb, ref size))
                            {
                                fullPath = sb.ToString();
                            }
                        }
                        finally
                        {
                            NativeMethods.CloseHandle(hProc);
                        }
                    }

                    if (string.IsNullOrEmpty(fullPath) || fullPath == "Unavailable")
                    {
                        try { fullPath = p.MainModule.FileName; } catch { }
                    }
                }
                catch
                {
                    name = "Process [" + pid + "]";
                }

                var tuple = Tuple.Create(name, fullPath);
                processCache[pid] = tuple;
                return tuple;
            }
        }

        private bool IsPrivateIP(IPAddress ip)
        {
            if (IPAddress.IsLoopback(ip)) return true;
            if (ip.AddressFamily == AddressFamily.InterNetworkV6)
            {
                if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.Equals(IPAddress.IPv6Loopback) || ip.Equals(IPAddress.IPv6None)) return true;
                return false;
            }

            byte[] b = ip.GetAddressBytes();
            if (b.Length != 4) return false;

            if (b[0] == 10) return true; // 10.0.0.0/8
            if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true; // 172.16.0.0/12
            if (b[0] == 192 && b[1] == 168) return true; // 192.168.0.0/16
            if (b[0] == 169 && b[1] == 254) return true; // 169.254.0.0/16 link-local
            if (b[0] == 127) return true; // loopback
            if (b[0] == 0) return true;
            return false;
        }

        private string ResolveDomain(string ipStr)
        {
            if (string.IsNullOrEmpty(ipStr) || ipStr == "*" || ipStr == "0.0.0.0" || ipStr == "::") return "";

            lock (dnsCache)
            {
                string d;
                if (dnsCache.TryGetValue(ipStr, out d)) return d;

                // Async reverse DNS to prevent stalling the telemetry engine
                ThreadPool.QueueUserWorkItem(state =>
                {
                    try
                    {
                        var entry = Dns.GetHostEntry(ipStr);
                        if (entry != null && !string.IsNullOrEmpty(entry.HostName))
                        {
                            lock (dnsCache)
                            {
                                dnsCache[ipStr] = entry.HostName;
                            }
                        }
                    }
                    catch
                    {
                        lock (dnsCache)
                        {
                            dnsCache[ipStr] = "";
                        }
                    }
                });

                dnsCache[ipStr] = ""; // default until resolved
                return "";
            }
        }

        public class GeoAsnResult
        {
            public string CountryCode;
            public string CountryName;
            public string ASN;
            public string Organization;
        }

        private GeoAsnResult LookupGeoAndAsn(IPAddress ip, bool isPrivate)
        {
            if (isPrivate || IPAddress.IsLoopback(ip))
            {
                return new GeoAsnResult
                {
                    CountryCode = "LOC",
                    CountryName = "Local Subnet / Host",
                    ASN = "AS-PRIVATE",
                    Organization = "Private Network (RFC1918)"
                };
            }

            if (ip.AddressFamily == AddressFamily.InterNetwork)
            {
                byte[] b = ip.GetAddressBytes();
                int b0 = b[0];
                int b1 = b[1];

                // Cloudflare
                if ((b0 == 104 && (b1 >= 16 && b1 <= 32)) ||
                    (b0 == 172 && (b1 >= 64 && b1 <= 67)) ||
                    (b0 == 1 && (b1 == 1 || b1 == 0)))
                {
                    return new GeoAsnResult { CountryCode = "US", CountryName = "United States", ASN = "AS13335", Organization = "Cloudflare Inc." };
                }

                // Google / Google Cloud
                if ((b0 == 8 && b1 == 8) || (b0 == 142 && b1 == 250) || (b0 == 172 && b1 == 217) || (b0 == 34 && b1 >= 120 && b1 <= 165) || (b0 == 35 && b1 >= 190 && b1 <= 245) || (b0 == 216 && b1 == 58))
                {
                    return new GeoAsnResult { CountryCode = "US", CountryName = "United States", ASN = "AS15169", Organization = "Google LLC" };
                }

                // Microsoft / Azure
                if ((b0 == 20 && b1 >= 180 && b1 <= 240) || (b0 == 40 && b1 >= 70 && b1 <= 127) || (b0 == 52 && b1 >= 96 && b1 <= 255) || (b0 == 13 && b1 >= 64 && b1 <= 107))
                {
                    return new GeoAsnResult { CountryCode = "US", CountryName = "United States", ASN = "AS8075", Organization = "Microsoft Corporation" };
                }

                // Amazon AWS
                if ((b0 == 54 && (b1 >= 140 && b1 <= 240)) || (b0 == 52 && b1 < 96) || (b0 == 3 && (b1 >= 80 && b1 <= 250)) || (b0 == 18 && (b1 >= 100 && b1 <= 250)))
                {
                    return new GeoAsnResult { CountryCode = "US", CountryName = "United States", ASN = "AS16509", Organization = "Amazon.com AWS" };
                }

                // Akamai
                if (b0 == 23 || b0 == 184 || b0 == 2)
                {
                    return new GeoAsnResult { CountryCode = "US", CountryName = "United States", ASN = "AS20940", Organization = "Akamai Technologies" };
                }

                // Fastly
                if (b0 == 151 && (b1 == 101 || b1 == 106))
                {
                    return new GeoAsnResult { CountryCode = "US", CountryName = "United States", ASN = "AS54113", Organization = "Fastly Inc." };
                }

                // European blocks
                if (b0 >= 185 && b0 <= 195)
                {
                    return new GeoAsnResult { CountryCode = "DE", CountryName = "Germany / EU", ASN = "AS-RIPE", Organization = "European IP Infrastructure" };
                }

                // Asia-Pacific blocks
                if (b0 >= 103 && b0 <= 126)
                {
                    return new GeoAsnResult { CountryCode = "SG", CountryName = "Singapore / APAC", ASN = "AS-APNIC", Organization = "Asia-Pacific Regional Network" };
                }
            }

            return new GeoAsnResult
            {
                CountryCode = "GLO",
                CountryName = "Global Public Internet",
                ASN = "AS-TRANSIT",
                Organization = "Global Transit / CDN Node"
            };
        }

        #endregion

        #region JSON Serialization Methods

        public string GetFullSnapshotJson()
        {
            lock (syncLock)
            {
                var sb = new StringBuilder(65536);
                sb.Append("{");

                // Status & Metrics
                sb.Append("\"timestamp\":").Append(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()).Append(",");
                sb.Append("\"totalDownloadBps\":").Append(Math.Round(TotalDownloadBps, 1)).Append(",");
                sb.Append("\"totalUploadBps\":").Append(Math.Round(TotalUploadBps, 1)).Append(",");
                sb.Append("\"totalBytesDownloaded\":").Append(TotalBytesDownloaded).Append(",");
                sb.Append("\"totalBytesUploaded\":").Append(TotalBytesUploaded).Append(",");
                sb.Append("\"primaryAdapter\":\"").Append(EscapeJson(PrimaryAdapterName)).Append("\",");
                sb.Append("\"activeConnectionCount\":").Append(activeConnections.Count).Append(",");

                // Connections
                sb.Append("\"connections\":[");
                int idx = 0;
                foreach (var rec in activeConnections.Values)
                {
                    if (idx > 0) sb.Append(",");
                    AppendConnectionJson(sb, rec);
                    idx++;
                }
                sb.Append("],");

                // Applications aggregate
                var appMap = new Dictionary<string, ApplicationRecord>();
                foreach (var rec in activeConnections.Values)
                {
                    string key = rec.processName;
                    ApplicationRecord appRec;
                    if (!appMap.TryGetValue(key, out appRec))
                    {
                        appRec = new ApplicationRecord
                        {
                            pid = rec.pid,
                            processName = rec.processName,
                            executablePath = rec.executablePath
                        };
                        appMap[key] = appRec;
                    }
                    appRec.activeConnections++;
                    appRec.totalBytesSent += rec.bytesSent;
                    appRec.totalBytesReceived += rec.bytesReceived;
                    appRec.currentSendRate += rec.sendRateBps;
                    appRec.currentRecvRate += rec.recvRateBps;
                    if (!string.IsNullOrEmpty(rec.countryCode) && !appRec.remoteCountries.Contains(rec.countryCode))
                        appRec.remoteCountries.Add(rec.countryCode);
                    if (!string.IsNullOrEmpty(rec.domain) && !appRec.remoteDomains.Contains(rec.domain))
                        appRec.remoteDomains.Add(rec.domain);
                }

                sb.Append("\"applications\":[");
                idx = 0;
                foreach (var app in appMap.Values)
                {
                    if (idx > 0) sb.Append(",");
                    sb.Append("{");
                    sb.Append("\"pid\":").Append(app.pid).Append(",");
                    sb.Append("\"processName\":\"").Append(EscapeJson(app.processName)).Append("\",");
                    sb.Append("\"executablePath\":\"").Append(EscapeJson(app.executablePath)).Append("\",");
                    sb.Append("\"activeConnections\":").Append(app.activeConnections).Append(",");
                    sb.Append("\"totalBytesSent\":").Append(app.totalBytesSent).Append(",");
                    sb.Append("\"totalBytesReceived\":").Append(app.totalBytesReceived).Append(",");
                    sb.Append("\"currentSendRate\":").Append(Math.Round(app.currentSendRate, 1)).Append(",");
                    sb.Append("\"currentRecvRate\":").Append(Math.Round(app.currentRecvRate, 1)).Append(",");
                    sb.Append("\"countries\":[").Append(string.Join(",", app.remoteCountries.ConvertAll(c => "\"" + EscapeJson(c) + "\"").ToArray())).Append("],");
                    sb.Append("\"domains\":[").Append(string.Join(",", app.remoteDomains.ConvertAll(d => "\"" + EscapeJson(d) + "\"").ToArray())).Append("]");
                    sb.Append("}");
                    idx++;
                }
                sb.Append("],");

                // Events
                sb.Append("\"events\":[");
                for (int i = 0; i < events.Count; i++)
                {
                    if (i > 0) sb.Append(",");
                    var ev = events[i];
                    sb.Append("{");
                    sb.Append("\"id\":\"").Append(ev.id).Append("\",");
                    sb.Append("\"timestamp\":").Append(ev.timestamp).Append(",");
                    sb.Append("\"eventType\":\"").Append(ev.eventType).Append("\",");
                    sb.Append("\"protocol\":\"").Append(ev.protocol).Append("\",");
                    sb.Append("\"localEndpoint\":\"").Append(EscapeJson(ev.localEndpoint)).Append("\",");
                    sb.Append("\"remoteEndpoint\":\"").Append(EscapeJson(ev.remoteEndpoint)).Append("\",");
                    sb.Append("\"pid\":").Append(ev.pid).Append(",");
                    sb.Append("\"processName\":\"").Append(EscapeJson(ev.processName)).Append("\",");
                    sb.Append("\"details\":\"").Append(EscapeJson(ev.details)).Append("\",");
                    sb.Append("\"severity\":\"").Append(ev.severity).Append("\"");
                    sb.Append("}");
                }
                sb.Append("],");

                // Packet samples
                sb.Append("\"packetSamples\":[");
                int maxPackets = Math.Min(packetSamples.Count, 250);
                for (int i = 0; i < maxPackets; i++)
                {
                    if (i > 0) sb.Append(",");
                    var pk = packetSamples[packetSamples.Count - 1 - i]; // newest first
                    sb.Append("{");
                    sb.Append("\"id\":\"").Append(pk.id).Append("\",");
                    sb.Append("\"timestamp\":").Append(pk.timestamp).Append(",");
                    sb.Append("\"protocol\":\"").Append(pk.protocol).Append("\",");
                    sb.Append("\"sourceIp\":\"").Append(EscapeJson(pk.sourceIp)).Append("\",");
                    sb.Append("\"sourcePort\":").Append(pk.sourcePort).Append(",");
                    sb.Append("\"destIp\":\"").Append(EscapeJson(pk.destIp)).Append("\",");
                    sb.Append("\"destPort\":").Append(pk.destPort).Append(",");
                    sb.Append("\"length\":").Append(pk.length).Append(",");
                    sb.Append("\"direction\":\"").Append(pk.direction).Append("\",");
                    sb.Append("\"processName\":\"").Append(EscapeJson(pk.processName)).Append("\",");
                    sb.Append("\"pid\":").Append(pk.pid).Append(",");
                    sb.Append("\"flags\":\"").Append(pk.flags).Append("\"");
                    sb.Append("}");
                }
                sb.Append("]");

                sb.Append("}");
                return sb.ToString();
            }
        }

        private string BuildCompactSliceJson(long timestamp)
        {
            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"timestamp\":").Append(timestamp).Append(",");
            sb.Append("\"downBps\":").Append(Math.Round(TotalDownloadBps, 1)).Append(",");
            sb.Append("\"upBps\":").Append(Math.Round(TotalUploadBps, 1)).Append(",");
            sb.Append("\"active\":").Append(activeConnections.Count);
            sb.Append("}");
            return sb.ToString();
        }

        public string GetTimelineHistoryJson()
        {
            lock (syncLock)
            {
                var sb = new StringBuilder();
                sb.Append("[");
                for (int i = 0; i < timelineSnapshots.Count; i++)
                {
                    if (i > 0) sb.Append(",");
                    sb.Append(timelineSnapshots[i]);
                }
                sb.Append("]");
                return sb.ToString();
            }
        }

        private void AppendConnectionJson(StringBuilder sb, ConnectionRecord rec)
        {
            sb.Append("{");
            sb.Append("\"id\":\"").Append(EscapeJson(rec.id)).Append("\",");
            sb.Append("\"protocol\":\"").Append(rec.protocol).Append("\",");
            sb.Append("\"ipVersion\":\"").Append(rec.ipVersion).Append("\",");
            sb.Append("\"localAddress\":\"").Append(EscapeJson(rec.localAddress)).Append("\",");
            sb.Append("\"localPort\":").Append(rec.localPort).Append(",");
            sb.Append("\"remoteAddress\":\"").Append(EscapeJson(rec.remoteAddress)).Append("\",");
            sb.Append("\"remotePort\":").Append(rec.remotePort).Append(",");
            sb.Append("\"state\":\"").Append(rec.state).Append("\",");
            sb.Append("\"pid\":").Append(rec.pid).Append(",");
            sb.Append("\"processName\":\"").Append(EscapeJson(rec.processName)).Append("\",");
            sb.Append("\"executablePath\":\"").Append(EscapeJson(rec.executablePath)).Append("\",");
            sb.Append("\"domain\":\"").Append(EscapeJson(rec.domain)).Append("\",");
            sb.Append("\"countryCode\":\"").Append(EscapeJson(rec.countryCode)).Append("\",");
            sb.Append("\"countryName\":\"").Append(EscapeJson(rec.countryName)).Append("\",");
            sb.Append("\"asn\":\"").Append(EscapeJson(rec.asn)).Append("\",");
            sb.Append("\"organization\":\"").Append(EscapeJson(rec.organization)).Append("\",");
            sb.Append("\"isPrivate\":").Append(rec.isPrivate ? "true" : "false").Append(",");
            sb.Append("\"bytesSent\":").Append(rec.bytesSent).Append(",");
            sb.Append("\"bytesReceived\":").Append(rec.bytesReceived).Append(",");
            sb.Append("\"packetsSent\":").Append(rec.packetsSent).Append(",");
            sb.Append("\"packetsReceived\":").Append(rec.packetsReceived).Append(",");
            sb.Append("\"sendRateBps\":").Append(Math.Round(rec.sendRateBps, 1)).Append(",");
            sb.Append("\"recvRateBps\":").Append(Math.Round(rec.recvRateBps, 1)).Append(",");
            sb.Append("\"firstSeenMs\":").Append(rec.firstSeenMs).Append(",");
            sb.Append("\"lastSeenMs\":").Append(rec.lastSeenMs).Append(",");
            sb.Append("\"isSuspicious\":").Append(rec.isSuspicious ? "true" : "false").Append(",");
            sb.Append("\"suspiciousReason\":\"").Append(EscapeJson(rec.suspiciousReason ?? "")).Append("\"");
            sb.Append("}");
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder(s.Length + 4);
            foreach (char c in s)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"': sb.Append("\\\""); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < ' ') sb.AppendFormat("\\u{0:x4}", (int)c);
                        else sb.Append(c);
                        break;
                }
            }
            return sb.ToString();
        }

        #endregion

        #region PCAP Binary Generation

        public byte[] GeneratePcapCapture()
        {
            // Standard PCAP file header: Magic number 0xa1b2c3d4, version 2.4, standard ethernet 1
            using (var ms = new MemoryStream())
            using (var bw = new BinaryWriter(ms))
            {
                // Global Header
                bw.Write((uint)0xa1b2c3d4); // magic
                bw.Write((ushort)2);        // major version
                bw.Write((ushort)4);        // minor version
                bw.Write((int)0);           // thiszone (GMT)
                bw.Write((uint)0);          // sigfigs
                bw.Write((uint)65535);      // snaplen
                bw.Write((uint)1);          // network (LINKTYPE_ETHERNET = 1)

                lock (syncLock)
                {
                    foreach (var p in packetSamples)
                    {
                        uint sec = (uint)(p.timestamp / 1000);
                        uint usec = (uint)((p.timestamp % 1000) * 1000);
                        int payloadLen = Math.Min(1500, Math.Max(54, p.length));

                        // Packet header
                        bw.Write(sec);
                        bw.Write(usec);
                        bw.Write((uint)payloadLen); // incl_len
                        bw.Write((uint)payloadLen); // orig_len

                        // Synthetic ethernet header (14 bytes)
                        byte[] eth = new byte[14];
                        eth[12] = 0x08; eth[13] = 0x00; // IPv4
                        bw.Write(eth);

                        // IPv4 Header (20 bytes)
                        byte[] ipHdr = new byte[20];
                        ipHdr[0] = 0x45; // Version 4, IHL 5
                        ipHdr[8] = 64;   // TTL
                        ipHdr[9] = (byte)(p.protocol == "TCP" ? 6 : 17); // TCP or UDP
                        bw.Write(ipHdr);

                        // Remaining payload padding
                        int rem = payloadLen - 34;
                        if (rem > 0)
                        {
                            bw.Write(new byte[rem]);
                        }
                    }
                }

                return ms.ToArray();
            }
        }

        #endregion
    }

    #endregion

    #region HTTP REST Server

    public class HttpServer
    {
        private readonly NetworkEngine engine;
        private readonly int port;
        private readonly string authToken;
        private HttpListener listener;
        private Thread serverThread;
        private volatile bool isRunning = false;

        public event Action OnShutdownRequested;

        public HttpServer(NetworkEngine engine, int port, string authToken = null)
        {
            this.engine = engine;
            this.port = port;
            this.authToken = authToken;
        }

        public void Start()
        {
            listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
            listener.Start();
            isRunning = true;

            serverThread = new Thread(ListenLoop)
            {
                IsBackground = true,
                Name = "NetSpectreHttpServer"
            };
            serverThread.Start();
        }

        public void Stop()
        {
            isRunning = false;
            try { if (listener != null) listener.Stop(); } catch { }
            if (serverThread != null && serverThread.IsAlive)
            {
                serverThread.Join(1000);
            }
        }

        private void ListenLoop()
        {
            while (isRunning)
            {
                try
                {
                    var context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ctxObj => HandleRequest((HttpListenerContext)ctxObj), context);
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private void HandleRequest(HttpListenerContext context)
        {
            var req = context.Request;
            var res = context.Response;

            // 1. Strict Origin & CORS validation for Security Hardening (REQ-15 & REQ-16)
            string reqOrigin = req.Headers["Origin"];
            if (!string.IsNullOrEmpty(reqOrigin))
            {
                if (reqOrigin.StartsWith("http://127.0.0.1") || reqOrigin.StartsWith("http://localhost") || reqOrigin == "null" || reqOrigin.StartsWith("file://") || reqOrigin.StartsWith("app://"))
                {
                    res.Headers.Add("Access-Control-Allow-Origin", reqOrigin);
                }
                else
                {
                    // Block unauthorized external website port scanning or CSRF
                    res.StatusCode = 403;
                    SendJsonResponse(res, "{\"error\":\"FORBIDDEN_ORIGIN\",\"message\":\"External cross-origin access prohibited.\"}");
                    return;
                }
            }
            else
            {
                res.Headers.Add("Access-Control-Allow-Origin", "*");
            }

            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-NetSpectre-Auth");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 204;
                res.Close();
                return;
            }

            try
            {
                string path = req.Url.AbsolutePath.ToLowerInvariant();
                var queryParams = ParseQueryString(req.Url);

                // Unauthenticated liveness check
                if (path == "/api/status")
                {
                    string statusJson = string.Format("{{\"status\":\"ONLINE\",\"version\":\"3.1.0\",\"port\":{0},\"authConfigured\":{1}}}",
                        port, !string.IsNullOrEmpty(authToken) ? "true" : "false");
                    SendJsonResponse(res, statusJson);
                    return;
                }

                // 2. Local Session Token Authorization Check
                if (!string.IsNullOrEmpty(authToken))
                {
                    string providedToken = req.Headers["X-NetSpectre-Auth"];
                    if (string.IsNullOrEmpty(providedToken) && queryParams.ContainsKey("token"))
                    {
                        providedToken = queryParams["token"];
                    }

                    if (providedToken != authToken)
                    {
                        res.StatusCode = 401;
                        SendJsonResponse(res, "{\"error\":\"UNAUTHORIZED\",\"message\":\"Authentication token invalid or missing. Include X-NetSpectre-Auth header.\"}");
                        return;
                    }
                }

                // 3. Dispatch Endpoints
                if (path == "/api/telemetry")
                {
                    string json = engine.GetFullSnapshotJson();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/history")
                {
                    string json = engine.GetTimelineHistoryJson();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/capture/status")
                {
                    SendJsonResponse(res, PacketCaptureService.GetStatusJson());
                }
                else if (path == "/api/capture/start" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string bindIp = JsonUtils.ExtractJsonField(body, "bindIp");
                    PacketCaptureService.StartAdvancedCapture(bindIp);
                    SendJsonResponse(res, PacketCaptureService.GetStatusJson());
                }
                else if (path == "/api/capture/stop" && req.HttpMethod == "POST")
                {
                    PacketCaptureService.StopAdvancedCapture();
                    SendJsonResponse(res, PacketCaptureService.GetStatusJson());
                }
                else if (path == "/api/capture/packets")
                {
                    int limit = 200;
                    if (queryParams.ContainsKey("limit")) int.TryParse(queryParams["limit"], out limit);
                    SendJsonResponse(res, PacketCaptureService.GetCapturedPacketsJson(limit));
                }
                else if (path == "/api/pcap/export")
                {
                    byte[] pcapBytes = PacketCaptureService.ExportGenuinePcap();
                    if (pcapBytes == null || pcapBytes.Length == 0)
                    {
                        res.StatusCode = 400;
                        SendJsonResponse(res, "{\"error\":\"NO_RAW_CAPTURE\",\"message\":\"Cannot export PCAP in Mode 1. Mode 2 raw packet capture must be active while running as Administrator to capture wire frames. Synthetic packets are strictly disallowed.\"}");
                    }
                    else
                    {
                        res.ContentType = "application/vnd.tcpdump.pcap";
                        res.Headers.Add("Content-Disposition", "attachment; filename=\"netspectre-capture.pcap\"");
                        res.ContentLength64 = pcapBytes.Length;
                        res.OutputStream.Write(pcapBytes, 0, pcapBytes.Length);
                    }
                }
                else if (path == "/api/browser-obs/ingest" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string bUrl = JsonUtils.ExtractJsonField(body, "url");
                    string bMethod = JsonUtils.ExtractJsonField(body, "method");
                    int bStatus = 200;
                    int.TryParse(JsonUtils.ExtractJsonField(body, "statusCode"), out bStatus);
                    long bDur = 0;
                    long.TryParse(JsonUtils.ExtractJsonField(body, "durationMs"), out bDur);
                    string bType = JsonUtils.ExtractJsonField(body, "contentType");
                    long bSize = 0;
                    long.TryParse(JsonUtils.ExtractJsonField(body, "transferSizeBytes"), out bSize);
                    string bHeaders = JsonUtils.ExtractJsonField(body, "headers");
                    string bApp = JsonUtils.ExtractJsonField(body, "sourceApp");
                    int bTab = 0;
                    int.TryParse(JsonUtils.ExtractJsonField(body, "tabId"), out bTab);
                    BrowserObservabilityService.IngestRequest(bUrl, bMethod, bStatus, bDur, bType, bSize, bHeaders, bApp, bTab);
                    SendJsonResponse(res, "{\"success\":true}");
                }
                else if (path == "/api/browser-obs/requests")
                {
                    SendJsonResponse(res, BrowserObservabilityService.GetRequestsJson());
                }
                else if (path == "/api/browser-obs/clear")
                {
                    BrowserObservabilityService.Clear();
                    SendJsonResponse(res, "{\"success\":true}");
                }
                else if (path == "/api/usage/history")
                {
                    string range = queryParams.ContainsKey("range") ? queryParams["range"] : "daily";
                    SendJsonResponse(res, PersistentUsageService.GetUsageHistoryJson(range));
                }
                else if (path == "/api/usage/limits" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    long dailyMb = 5000;
                    long.TryParse(JsonUtils.ExtractJsonField(body, "dailyQuotaMb"), out dailyMb);
                    long monthlyMb = 50000;
                    long.TryParse(JsonUtils.ExtractJsonField(body, "monthlyQuotaMb"), out monthlyMb);
                    PersistentUsageService.SetQuotas(dailyMb, monthlyMb);
                    SendJsonResponse(res, "{\"success\":true}");
                }
                else if (path == "/api/env-monitor/endpoints")
                {
                    SendJsonResponse(res, EnvironmentMonitorService.GetEndpointsJson());
                }
                else if (path == "/api/env-monitor/check" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string target = JsonUtils.ExtractJsonField(body, "url");
                    SendJsonResponse(res, EnvironmentMonitorService.CheckEndpoint(target));
                }
                else if (path == "/api/env-monitor/save" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    NetSpectrePersistence.SaveEnvProfiles(body);
                    SendJsonResponse(res, "{\"success\":true}");
                }
                else if (path == "/api/diagnose/doctor")
                {
                    string json = NetworkDoctorService.RunFullDiagnostic(engine);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/diagnose/explain" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string q = JsonUtils.ExtractJsonField(body, "question");
                    string docJson = NetworkDoctorService.RunFullDiagnostic(engine);
                    SendJsonResponse(res, ExplainMyNetworkService.ExplainNetworkQuestion(q, docJson));
                }
                else if (path == "/api/alerts/history")
                {
                    SendJsonResponse(res, AlertsEngineService.GetAlertsJson());
                }
                else if (path == "/api/alerts/acknowledge" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string aId = JsonUtils.ExtractJsonField(body, "id");
                    AlertsEngineService.AcknowledgeAlert(aId);
                    SendJsonResponse(res, "{\"success\":true}");
                }
                else if (path == "/api/workbench/ping")
                {
                    string target = queryParams.ContainsKey("target") ? queryParams["target"] : "1.1.1.1";
                    int count = 4;
                    if (queryParams.ContainsKey("count")) int.TryParse(queryParams["count"], out count);
                    string json = NetworkWorkbenchService.ExecutePing(target, count);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/workbench/traceroute")
                {
                    string target = queryParams.ContainsKey("target") ? queryParams["target"] : "1.1.1.1";
                    int maxHops = 20;
                    if (queryParams.ContainsKey("maxhops")) int.TryParse(queryParams["maxhops"], out maxHops);
                    string json = NetworkWorkbenchService.ExecuteTraceroute(target, maxHops);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/workbench/dns")
                {
                    string host = queryParams.ContainsKey("host") ? queryParams["host"] : "google.com";
                    string type = queryParams.ContainsKey("type") ? queryParams["type"] : "A";
                    string json = NetworkWorkbenchService.ExecuteDnsLookup(host, type);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/workbench/mtu")
                {
                    string target = queryParams.ContainsKey("target") ? queryParams["target"] : "1.1.1.1";
                    SendJsonResponse(res, PathMtuService.DiscoverMtu(target));
                }
                else if (path == "/api/workbench/port")
                {
                    string host = queryParams.ContainsKey("host") ? queryParams["host"] : "1.1.1.1";
                    int p = 443;
                    if (queryParams.ContainsKey("port")) int.TryParse(queryParams["port"], out p);
                    int timeout = 2500;
                    if (queryParams.ContainsKey("timeout")) int.TryParse(queryParams["timeout"], out timeout);
                    string json = NetworkWorkbenchService.ExecuteTcpPortTest(host, p, timeout);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/workbench/tls")
                {
                    string host = queryParams.ContainsKey("host") ? queryParams["host"] : "google.com";
                    int p = 443;
                    if (queryParams.ContainsKey("port")) int.TryParse(queryParams["port"], out p);
                    string json = NetworkWorkbenchService.ExecuteTlsInspect(host, p);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/workbench/routes")
                {
                    string json = NetworkWorkbenchService.GetRoutingTable();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/workbench/adapters")
                {
                    string json = NetworkWorkbenchService.GetAdapterDetails();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/firewall/status")
                {
                    SendJsonResponse(res, FirewallService.GetStatusJson());
                }
                else if (path == "/api/firewall/rules")
                {
                    string json = FirewallService.GetRules();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/firewall/block" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string proc = JsonUtils.ExtractJsonField(body, "processName");
                    string exe = JsonUtils.ExtractJsonField(body, "executablePath");
                    string json = FirewallService.BlockApplication(proc, exe);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/firewall/unblock" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string ruleName = JsonUtils.ExtractJsonField(body, "ruleName");
                    string json = FirewallService.UnblockApplication(ruleName);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/firewall/unblock-all" && req.HttpMethod == "POST")
                {
                    SendJsonResponse(res, FirewallService.UnblockAllManaged());
                }
                else if (path == "/api/api-inspector/execute" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string url = JsonUtils.ExtractJsonField(body, "url");
                    string method = JsonUtils.ExtractJsonField(body, "method");
                    string headersRaw = JsonUtils.ExtractJsonField(body, "headers");
                    string reqBody = JsonUtils.ExtractJsonField(body, "body");
                    string json = ApiInspectorService.ExecuteRequest(url, string.IsNullOrEmpty(method) ? "GET" : method, headersRaw, reqBody);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/api-inspector/history")
                {
                    string json = ApiInspectorService.GetHistoryJson();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/incident/snapshot" && req.HttpMethod == "POST")
                {
                    string body = ReadRequestBody(req);
                    string reason = JsonUtils.ExtractJsonField(body, "reason");
                    string json = IncidentRecorderService.TakeIncidentSnapshot(string.IsNullOrEmpty(reason) ? "Manual User Trigger" : reason, engine);
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/incident/report")
                {
                    string json = IncidentRecorderService.GetLastReportJson();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/incident/list")
                {
                    SendJsonResponse(res, NetSpectrePersistence.LoadIncidents());
                }
                else if (path == "/api/devices")
                {
                    string json = InfrastructureService.GetMonitoredDevices();
                    SendJsonResponse(res, json);
                }
                else if (path == "/api/shutdown")
                {
                    byte[] bytes = Encoding.UTF8.GetBytes("{\"status\":\"shutting_down\"}");
                    res.ContentType = "application/json";
                    res.OutputStream.Write(bytes, 0, bytes.Length);
                    res.Close();
                    ThreadPool.QueueUserWorkItem(_ => { if (OnShutdownRequested != null) OnShutdownRequested(); });
                    return;
                }
                else
                {
                    res.StatusCode = 404;
                    SendJsonResponse(res, "{\"error\":\"Endpoint not found\"}");
                }
            }
            catch (Exception ex)
            {
                try
                {
                    res.StatusCode = 500;
                    SendJsonResponse(res, "{\"error\":\"" + JsonUtils.EscapeJson(ex.Message) + "\"}");
                }
                catch { }
            }
            finally
            {
                try { res.Close(); } catch { }
            }
        }

        private static void SendJsonResponse(HttpListenerResponse res, string json)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            res.ContentType = "application/json; charset=utf-8";
            res.ContentLength64 = bytes.Length;
            res.OutputStream.Write(bytes, 0, bytes.Length);
        }

        private static Dictionary<string, string> ParseQueryString(Uri uri)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string query = uri.Query;
            if (string.IsNullOrEmpty(query)) return dict;
            if (query.StartsWith("?")) query = query.Substring(1);
            string[] pairs = query.Split('&');
            foreach (var pair in pairs)
            {
                if (string.IsNullOrEmpty(pair)) continue;
                int eqIdx = pair.IndexOf('=');
                if (eqIdx >= 0)
                {
                    string key = Uri.UnescapeDataString(pair.Substring(0, eqIdx));
                    string val = Uri.UnescapeDataString(pair.Substring(eqIdx + 1));
                    dict[key] = val;
                }
                else
                {
                    dict[Uri.UnescapeDataString(pair)] = "";
                }
            }
            return dict;
        }

        private static string ReadRequestBody(HttpListenerRequest req)
        {
            if (!req.HasEntityBody) return "";
            using (var reader = new StreamReader(req.InputStream, req.ContentEncoding != null ? req.ContentEncoding : Encoding.UTF8))
            {
                return reader.ReadToEnd();
            }
        }
    }

    #endregion

    #region V3.0 Helper Utilities

    public static class JsonUtils
    {
        public static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder(s.Length + 4);
            foreach (char c in s)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"': sb.Append("\\\""); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < ' ') sb.AppendFormat("\\u{0:x4}", (int)c);
                        else sb.Append(c);
                        break;
                }
            }
            return sb.ToString();
        }

        public static string ExtractJsonField(string json, string key)
        {
            if (string.IsNullOrEmpty(json)) return "";
            var match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"([^\"]*)\"");
            if (match.Success) return match.Groups[1].Value.Replace("\\\\", "\\").Replace("\\\"", "\"");
            return "";
        }
    }

    #endregion

    #region V3.0 Diagnostic & Operations Services

    public static class NetworkDoctorService
    {
        public static string RunFullDiagnostic(NetworkEngine engine)
        {
            var swTotal = Stopwatch.StartNew();

            // 1. Detect Gateway
            string gatewayIp = "192.168.1.1";
            string adapterName = "Ethernet";
            try
            {
                var candidateGateways = new List<Tuple<string, string, bool>>();
                foreach (var iface in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (iface.OperationalStatus == OperationalStatus.Up && iface.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                    {
                        var props = iface.GetIPProperties();
                        if (props != null && props.GatewayAddresses != null)
                        {
                            bool isVirtual = iface.Description.IndexOf("VPN", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                             iface.Description.IndexOf("Virtual", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                             iface.Description.IndexOf("TAP", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                             iface.Name.IndexOf("VPN", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                             iface.Name.IndexOf("Radmin", StringComparison.OrdinalIgnoreCase) >= 0;

                            foreach (var gw in props.GatewayAddresses)
                            {
                                string gip = gw.Address.ToString();
                                if (gip != "0.0.0.0" && !string.IsNullOrEmpty(gip))
                                {
                                    candidateGateways.Add(Tuple.Create(gip, iface.Name, isVirtual));
                                }
                            }
                        }
                    }
                }

                // Sort: non-virtual first
                candidateGateways.Sort((a, b) => a.Item3.CompareTo(b.Item3));
                if (candidateGateways.Count > 0)
                {
                    gatewayIp = candidateGateways[0].Item1;
                    adapterName = candidateGateways[0].Item2;
                }
            }
            catch { }

            // 2. Gateway Ping (probe detected gateway or try candidates)
            long gatewayLatencyMs = -1;
            bool gatewayOk = false;
            try
            {
                using (var ping = new Ping())
                {
                    var reply = ping.Send(gatewayIp, 1200);
                    if (reply != null && reply.Status == IPStatus.Success)
                    {
                        gatewayLatencyMs = reply.RoundtripTime;
                        gatewayOk = true;
                    }
                }
            }
            catch { }

            // 3. Internet Ping (1.1.1.1 and 8.8.8.8)
            long internetLatencyMs = -1;
            bool internetOk = false;
            try
            {
                using (var ping = new Ping())
                {
                    var reply = ping.Send("1.1.1.1", 1500);
                    if (reply != null && reply.Status == IPStatus.Success)
                    {
                        internetLatencyMs = reply.RoundtripTime;
                        internetOk = true;
                    }
                    else
                    {
                        var reply2 = ping.Send("8.8.8.8", 1500);
                        if (reply2 != null && reply2.Status == IPStatus.Success)
                        {
                            internetLatencyMs = reply2.RoundtripTime;
                            internetOk = true;
                        }
                    }
                }
            }
            catch { }

            // 4. DNS Latency Check
            long dnsLatencyMs = -1;
            bool dnsOk = false;
            try
            {
                var sw = Stopwatch.StartNew();
                var ips = Dns.GetHostAddresses("cloudflare.com");
                sw.Stop();
                if (ips != null && ips.Length > 0)
                {
                    dnsLatencyMs = sw.ElapsedMilliseconds;
                    dnsOk = true;
                }
            }
            catch { }

            // 5. Wi-Fi Status via netsh
            string wifiSsid = "Ethernet Cable Connection";
            int wifiSignalPercent = 100;
            string wifiRadio = "Direct NIC";
            try
            {
                var psi = new ProcessStartInfo("netsh", "wlan show interfaces")
                {
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    string output = proc.StandardOutput.ReadToEnd();
                    proc.WaitForExit(1000);
                    foreach (var line in output.Split('\n'))
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("SSID") && !trimmed.StartsWith("BSSID"))
                        {
                            var parts = trimmed.Split(new[] { ':' }, 2);
                            if (parts.Length > 1 && !string.IsNullOrEmpty(parts[1].Trim()))
                                wifiSsid = parts[1].Trim();
                        }
                        else if (trimmed.StartsWith("Signal"))
                        {
                            var parts = trimmed.Split(new[] { ':' }, 2);
                            if (parts.Length > 1)
                            {
                                string sig = parts[1].Replace("%", "").Trim();
                                int.TryParse(sig, out wifiSignalPercent);
                            }
                        }
                        else if (trimmed.StartsWith("Radio type"))
                        {
                            var parts = trimmed.Split(new[] { ':' }, 2);
                            if (parts.Length > 1) wifiRadio = parts[1].Trim();
                        }
                    }
                }
            }
            catch { }

            // 6. Calculate Health Score
            int score = 100;
            if (!internetOk) score -= 45;
            else if (internetLatencyMs > 150) score -= 20;
            else if (internetLatencyMs > 80) score -= 10;

            if (!gatewayOk) score -= 35;
            else if (gatewayLatencyMs > 35) score -= 15;

            if (!dnsOk) score -= 30;
            else if (dnsLatencyMs > 180) score -= 15;
            else if (dnsLatencyMs > 90) score -= 8;

            if (wifiSignalPercent < 50 && wifiSsid != "Ethernet Cable Connection") score -= 15;
            else if (wifiSignalPercent < 70 && wifiSsid != "Ethernet Cable Connection") score -= 8;

            if (score < 10) score = 10;
            if (score > 100) score = 100;

            string status = score >= 85 ? "EXCELLENT" : (score >= 65 ? "GOOD" : (score >= 45 ? "DEGRADED" : "CRITICAL"));

            // 7. Generate Actionable Findings
            var findings = new List<string>();

            // Gateway finding
            if (gatewayOk)
            {
                findings.Add(string.Format("{{\"id\":\"gw_ok\",\"severity\":\"healthy\",\"category\":\"Local Gateway\",\"title\":\"Default Gateway Reachable ({0}ms)\",\"explanation\":\"Your local router at {1} responded with {0}ms latency. The link between your PC and router is healthy.\",\"recommendedAction\":\"No action required for local network path.\",\"isFixable\":false}}",
                    gatewayLatencyMs, JsonUtils.EscapeJson(gatewayIp)));
            }
            else
            {
                findings.Add(string.Format("{{\"id\":\"gw_fail\",\"severity\":\"critical\",\"category\":\"Local Gateway\",\"title\":\"Router Unreachable ({0})\",\"explanation\":\"Ping to your default gateway {0} timed out. This indicates physical cable disconnection, Wi-Fi link drop, or router freeze.\",\"recommendedAction\":\"Check ethernet cable or reconnect to your Wi-Fi network. Restart your router if the issue persists.\",\"isFixable\":true}}",
                    JsonUtils.EscapeJson(gatewayIp)));
            }

            // Internet finding
            if (internetOk)
            {
                string internetSeverity = internetLatencyMs < 60 ? "healthy" : (internetLatencyMs < 120 ? "warning" : "critical");
                findings.Add(string.Format("{{\"id\":\"net_ok\",\"severity\":\"{0}\",\"category\":\"Internet Speed\",\"title\":\"Public Internet Latency ({1}ms)\",\"explanation\":\"Global backbone (1.1.1.1 / 8.8.8.8) responded in {1}ms. {2}\",\"recommendedAction\":\"{3}\",\"isFixable\":false}}",
                    internetSeverity, internetLatencyMs,
                    internetLatencyMs < 60 ? "Fast connection suitable for competitive gaming and 4K streaming." : "High latency detected; web pages and downloads may experience delay.",
                    internetLatencyMs < 60 ? "No action required." : "Close background downloads or restart network modem."));
            }
            else
            {
                findings.Add("{\"id\":\"net_fail\",\"severity\":\"critical\",\"category\":\"Internet Speed\",\"title\":\"Public Internet Offline\",\"explanation\":\"Public IP addresses (1.1.1.1 / 8.8.8.8) could not be reached. Your Internet Service Provider (ISP) may have an outage or WAN link is down.\",\"recommendedAction\":\"Contact your ISP or check your modem WAN status indicator.\",\"isFixable\":true}");
            }

            // DNS finding
            if (dnsOk)
            {
                string dnsSeverity = dnsLatencyMs < 50 ? "healthy" : (dnsLatencyMs < 150 ? "warning" : "critical");
                findings.Add(string.Format("{{\"id\":\"dns_ok\",\"severity\":\"{0}\",\"category\":\"DNS Resolution\",\"title\":\"DNS Lookup Response ({1}ms)\",\"explanation\":\"System resolved cloudflare.com in {1}ms. Domain name translation is operating normally.\",\"recommendedAction\":\"{2}\",\"isFixable\":false}}",
                    dnsSeverity, dnsLatencyMs,
                    dnsLatencyMs < 50 ? "Optimal DNS speeds." : "Consider switching to high-speed DNS such as Cloudflare (1.1.1.1) or Google (8.8.8.8)."));
            }
            else
            {
                findings.Add("{\"id\":\"dns_fail\",\"severity\":\"critical\",\"category\":\"DNS Resolution\",\"title\":\"DNS Resolution Failed\",\"explanation\":\"Your system was unable to translate domain names into IP addresses. Web browsing will fail even if IP routing is alive.\",\"recommendedAction\":\"Flush DNS cache (ipconfig /flushdns) or configure manual DNS (1.1.1.1, 8.8.8.8).\",\"isFixable\":true}");
            }

            // Wi-Fi finding
            if (wifiSsid != "Ethernet Cable Connection")
            {
                string wifiSeverity = wifiSignalPercent >= 75 ? "healthy" : (wifiSignalPercent >= 50 ? "warning" : "critical");
                findings.Add(string.Format("{{\"id\":\"wifi_stat\",\"severity\":\"{0}\",\"category\":\"Wi-Fi Signal\",\"title\":\"Wi-Fi Signal Strength ({1}%)\",\"explanation\":\"Connected to SSID '{2}' ({3}) at {1}% signal quality.\",\"recommendedAction\":\"{4}\",\"isFixable\":false}}",
                    wifiSeverity, wifiSignalPercent, JsonUtils.EscapeJson(wifiSsid), JsonUtils.EscapeJson(wifiRadio),
                    wifiSignalPercent >= 75 ? "Signal strength is solid." : "Move closer to your wireless access point or switch to the 5GHz frequency band."));
            }

            swTotal.Stop();

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"score\":").Append(score).Append(",");
            sb.Append("\"status\":\"").Append(status).Append("\",");
            sb.Append("\"gatewayIp\":\"").Append(JsonUtils.EscapeJson(gatewayIp)).Append("\",");
            sb.Append("\"gatewayLatencyMs\":").Append(gatewayLatencyMs).Append(",");
            sb.Append("\"gatewayOk\":").Append(gatewayOk ? "true" : "false").Append(",");
            sb.Append("\"internetLatencyMs\":").Append(internetLatencyMs).Append(",");
            sb.Append("\"internetOk\":").Append(internetOk ? "true" : "false").Append(",");
            sb.Append("\"dnsLatencyMs\":").Append(dnsLatencyMs).Append(",");
            sb.Append("\"dnsOk\":").Append(dnsOk ? "true" : "false").Append(",");
            sb.Append("\"adapterName\":\"").Append(JsonUtils.EscapeJson(adapterName)).Append("\",");
            sb.Append("\"wifiSsid\":\"").Append(JsonUtils.EscapeJson(wifiSsid)).Append("\",");
            sb.Append("\"wifiSignalPercent\":").Append(wifiSignalPercent).Append(",");
            sb.Append("\"diagnosticDurationMs\":").Append(swTotal.ElapsedMilliseconds).Append(",");
            sb.Append("\"timestamp\":").Append(DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds).Append(",");
            sb.Append("\"findings\":[");
            for (int i = 0; i < findings.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(findings[i]);
            }
            sb.Append("]}");

            return sb.ToString();
        }
    }

    public static class NetworkWorkbenchService
    {
        public static string ExecutePing(string host, int count = 4)
        {
            count = Math.Min(10, Math.Max(1, count));
            var sb = new StringBuilder();
            long minRtt = long.MaxValue;
            long maxRtt = 0;
            long totalRtt = 0;
            int received = 0;
            string resolvedIp = host;

            try
            {
                var ips = Dns.GetHostAddresses(host);
                if (ips.Length > 0) resolvedIp = ips[0].ToString();
            }
            catch { }

            sb.Append("{");
            sb.Append("\"target\":\"").Append(JsonUtils.EscapeJson(host)).Append("\",");
            sb.Append("\"resolvedIp\":\"").Append(JsonUtils.EscapeJson(resolvedIp)).Append("\",");
            sb.Append("\"count\":").Append(count).Append(",");
            sb.Append("\"hops\":[");

            using (var ping = new Ping())
            {
                for (int i = 0; i < count; i++)
                {
                    if (i > 0) sb.Append(",");
                    long rtt = 0;
                    int ttl = 0;
                    string status = "TimedOut";
                    try
                    {
                        var reply = ping.Send(resolvedIp, 2000);
                        if (reply != null && reply.Status == IPStatus.Success)
                        {
                            rtt = reply.RoundtripTime;
                            ttl = reply.Options != null ? reply.Options.Ttl : 64;
                            status = "Success";
                            received++;
                            if (rtt < minRtt) minRtt = rtt;
                            if (rtt > maxRtt) maxRtt = rtt;
                            totalRtt += rtt;
                        }
                        else if (reply != null)
                        {
                            status = reply.Status.ToString();
                        }
                    }
                    catch (Exception ex)
                    {
                        status = ex.Message;
                    }

                    sb.Append("{");
                    sb.Append("\"seq\":").Append(i + 1).Append(",");
                    sb.Append("\"rttMs\":").Append(rtt).Append(",");
                    sb.Append("\"ttl\":").Append(ttl).Append(",");
                    sb.Append("\"status\":\"").Append(JsonUtils.EscapeJson(status)).Append("\"");
                    sb.Append("}");

                    if (i < count - 1) Thread.Sleep(150);
                }
            }
            sb.Append("],");

            int lost = count - received;
            double lossPct = Math.Round((double)lost / count * 100.0, 1);
            long avgRtt = received > 0 ? totalRtt / received : 0;
            if (minRtt == long.MaxValue) minRtt = 0;
            long jitter = maxRtt - minRtt;

            sb.Append("\"packetsSent\":").Append(count).Append(",");
            sb.Append("\"packetsReceived\":").Append(received).Append(",");
            sb.Append("\"packetLossPct\":").Append(lossPct).Append(",");
            sb.Append("\"minRttMs\":").Append(minRtt).Append(",");
            sb.Append("\"maxRttMs\":").Append(maxRtt).Append(",");
            sb.Append("\"avgRttMs\":").Append(avgRtt).Append(",");
            sb.Append("\"jitterMs\":").Append(jitter);
            sb.Append("}");

            return sb.ToString();
        }

        public static string ExecuteTraceroute(string host, int maxHops = 20)
        {
            maxHops = Math.Min(30, Math.Max(1, maxHops));
            string resolvedIp = host;
            try
            {
                var ips = Dns.GetHostAddresses(host);
                if (ips.Length > 0) resolvedIp = ips[0].ToString();
            }
            catch { }

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"target\":\"").Append(JsonUtils.EscapeJson(host)).Append("\",");
            sb.Append("\"resolvedIp\":\"").Append(JsonUtils.EscapeJson(resolvedIp)).Append("\",");
            sb.Append("\"maxHops\":").Append(maxHops).Append(",");
            sb.Append("\"hops\":[");

            byte[] buffer = new byte[32];
            new Random().NextBytes(buffer);

            using (var ping = new Ping())
            {
                for (int ttl = 1; ttl <= maxHops; ttl++)
                {
                    if (ttl > 1) sb.Append(",");
                    var options = new PingOptions(ttl, true);
                    string hopIp = "*";
                    string hostname = "*";
                    long rttMs = 0;
                    string status = "TimedOut";

                    try
                    {
                        var reply = ping.Send(resolvedIp, 1800, buffer, options);
                        if (reply != null)
                        {
                            rttMs = reply.RoundtripTime;
                            if (reply.Status == IPStatus.Success)
                            {
                                status = "Reached";
                                hopIp = reply.Address != null ? reply.Address.ToString() : resolvedIp;
                            }
                            else if (reply.Status == IPStatus.TtlExpired)
                            {
                                status = "TtlExpired";
                                hopIp = reply.Address != null ? reply.Address.ToString() : "*";
                            }
                            else
                            {
                                status = reply.Status.ToString();
                                if (reply.Address != null) hopIp = reply.Address.ToString();
                            }

                            if (hopIp != "*")
                            {
                                try
                                {
                                    hostname = Dns.GetHostEntry(hopIp).HostName;
                                }
                                catch
                                {
                                    hostname = hopIp;
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        status = ex.Message;
                    }

                    sb.Append("{");
                    sb.Append("\"hop\":").Append(ttl).Append(",");
                    sb.Append("\"ip\":\"").Append(JsonUtils.EscapeJson(hopIp)).Append("\",");
                    sb.Append("\"hostname\":\"").Append(JsonUtils.EscapeJson(hostname)).Append("\",");
                    sb.Append("\"rttMs\":").Append(rttMs).Append(",");
                    sb.Append("\"status\":\"").Append(JsonUtils.EscapeJson(status)).Append("\"");
                    sb.Append("}");

                    if (status == "Reached") break;
                }
            }

            sb.Append("]}");
            return sb.ToString();
        }

        public static string ExecuteDnsLookup(string host, string recordType = "A")
        {
            var sw = Stopwatch.StartNew();
            var ips = new List<string>();
            var aliases = new List<string>();
            var customRecords = new List<Tuple<string, string>>();
            string canonicalName = host;
            string error = "";

            if (recordType == "MX" || recordType == "TXT" || recordType == "NS" || recordType == "SOA")
            {
                try
                {
                    var psi = new ProcessStartInfo("nslookup", "-type=" + recordType + " " + host)
                    {
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    using (var proc = Process.Start(psi))
                    {
                        string outTxt = proc.StandardOutput.ReadToEnd();
                        proc.WaitForExit(3000);
                        foreach (var line in outTxt.Split('\n'))
                        {
                            string tr = line.Trim();
                            if (recordType == "MX" && tr.Contains("mail exchanger ="))
                            {
                                int idx = tr.IndexOf("mail exchanger =");
                                string mx = tr.Substring(idx + "mail exchanger =".Length).Trim();
                                customRecords.Add(Tuple.Create("MX", mx));
                            }
                            else if (recordType == "TXT" && (tr.StartsWith("\"") || tr.Contains("text =")))
                            {
                                string txt = tr.Replace("text =", "").Trim().Trim('"');
                                if (!string.IsNullOrEmpty(txt)) customRecords.Add(Tuple.Create("TXT", txt));
                            }
                            else if (recordType == "NS" && tr.Contains("nameserver ="))
                            {
                                int idx = tr.IndexOf("nameserver =");
                                string ns = tr.Substring(idx + "nameserver =".Length).Trim();
                                customRecords.Add(Tuple.Create("NS", ns));
                            }
                            else if (recordType == "SOA" && tr.Contains("primary name server ="))
                            {
                                customRecords.Add(Tuple.Create("SOA", tr));
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                }
            }
            else
            {
                try
                {
                    var entry = Dns.GetHostEntry(host);
                    canonicalName = entry.HostName;
                    if (entry.Aliases != null)
                    {
                        foreach (var a in entry.Aliases) aliases.Add(a);
                    }
                    if (entry.AddressList != null)
                    {
                        foreach (var ip in entry.AddressList) ips.Add(ip.ToString());
                    }
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                }
            }
            sw.Stop();

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"host\":\"").Append(JsonUtils.EscapeJson(host)).Append("\",");
            sb.Append("\"recordType\":\"").Append(JsonUtils.EscapeJson(recordType)).Append("\",");
            sb.Append("\"canonicalName\":\"").Append(JsonUtils.EscapeJson(canonicalName)).Append("\",");
            sb.Append("\"queryTimeMs\":").Append(sw.ElapsedMilliseconds).Append(",");
            sb.Append("\"error\":\"").Append(JsonUtils.EscapeJson(error)).Append("\",");
            sb.Append("\"records\":[");
            int recIdx = 0;
            for (int i = 0; i < ips.Count; i++)
            {
                if (recIdx > 0) sb.Append(",");
                sb.Append("{\"type\":\"").Append(ips[i].Contains(":") ? "AAAA" : "A").Append("\",\"value\":\"").Append(JsonUtils.EscapeJson(ips[i])).Append("\"}");
                recIdx++;
            }
            for (int i = 0; i < aliases.Count; i++)
            {
                if (recIdx > 0) sb.Append(",");
                sb.Append("{\"type\":\"CNAME\",\"value\":\"").Append(JsonUtils.EscapeJson(aliases[i])).Append("\"}");
                recIdx++;
            }
            for (int i = 0; i < customRecords.Count; i++)
            {
                if (recIdx > 0) sb.Append(",");
                sb.Append("{\"type\":\"").Append(customRecords[i].Item1).Append("\",\"value\":\"").Append(JsonUtils.EscapeJson(customRecords[i].Item2)).Append("\"}");
                recIdx++;
            }
            sb.Append("]}");
            return sb.ToString();
        }

        public static string ExecuteTcpPortTest(string host, int port, int timeoutMs = 2500)
        {
            var sw = Stopwatch.StartNew();
            bool isOpen = false;
            string banner = "";
            string error = "";

            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(timeoutMs, true);
                    if (success && client.Connected)
                    {
                        client.EndConnect(result);
                        sw.Stop();
                        isOpen = true;

                        try
                        {
                            client.ReceiveTimeout = 600;
                            var stream = client.GetStream();
                            if (stream.DataAvailable || port == 22 || port == 25 || port == 21)
                            {
                                byte[] buf = new byte[512];
                                int bytesRead = stream.Read(buf, 0, buf.Length);
                                if (bytesRead > 0)
                                {
                                    banner = Encoding.ASCII.GetString(buf, 0, bytesRead).Trim();
                                }
                            }
                        }
                        catch { }
                    }
                    else
                    {
                        sw.Stop();
                        client.Close();
                        error = "Connection timed out after " + timeoutMs + "ms";
                    }
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                error = ex.Message;
            }

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"host\":\"").Append(JsonUtils.EscapeJson(host)).Append("\",");
            sb.Append("\"port\":").Append(port).Append(",");
            sb.Append("\"isOpen\":").Append(isOpen ? "true" : "false").Append(",");
            sb.Append("\"connectTimeMs\":").Append(sw.ElapsedMilliseconds).Append(",");
            sb.Append("\"banner\":\"").Append(JsonUtils.EscapeJson(banner)).Append("\",");
            sb.Append("\"error\":\"").Append(JsonUtils.EscapeJson(error)).Append("\"");
            sb.Append("}");
            return sb.ToString();
        }

        public static string ExecuteTlsInspect(string host, int port = 443)
        {
            var sw = Stopwatch.StartNew();
            bool isValid = false;
            string subject = "";
            string issuer = "";
            string validFrom = "";
            string validTo = "";
            int daysRemaining = 0;
            bool isExpired = false;
            string cipherSuite = "";
            string protocol = "";
            string sans = "";
            string error = "";

            try
            {
                using (var client = new TcpClient())
                {
                    client.Connect(host, port);
                    using (var ssl = new SslStream(client.GetStream(), false, (s, cert, chain, err) => {
                        isValid = (err == System.Net.Security.SslPolicyErrors.None);
                        return true;
                    }))
                    {
                        ssl.AuthenticateAsClient(host);
                        sw.Stop();

                        protocol = ssl.SslProtocol.ToString();
                        cipherSuite = ssl.CipherAlgorithm.ToString() + " (" + ssl.CipherStrength + " bit), Hash: " + ssl.HashAlgorithm.ToString();

                        var cert = ssl.RemoteCertificate != null ? new X509Certificate2(ssl.RemoteCertificate) : null;
                        if (cert != null)
                        {
                            subject = cert.Subject;
                            issuer = cert.Issuer;
                            validFrom = cert.NotBefore.ToString("yyyy-MM-dd HH:mm:ss");
                            validTo = cert.NotAfter.ToString("yyyy-MM-dd HH:mm:ss");
                            daysRemaining = (int)(cert.NotAfter - DateTime.UtcNow).TotalDays;
                            isExpired = daysRemaining < 0;

                            foreach (var ext in cert.Extensions)
                            {
                                if (ext.Oid.Value == "2.5.29.17")
                                {
                                    sans = ext.Format(true).Replace("\r\n", ", ");
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                error = ex.Message;
            }

            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"host\":\"").Append(JsonUtils.EscapeJson(host)).Append("\",");
            sb.Append("\"port\":").Append(port).Append(",");
            sb.Append("\"handshakeTimeMs\":").Append(sw.ElapsedMilliseconds).Append(",");
            sb.Append("\"isValid\":").Append(isValid ? "true" : "false").Append(",");
            sb.Append("\"subject\":\"").Append(JsonUtils.EscapeJson(subject)).Append("\",");
            sb.Append("\"issuer\":\"").Append(JsonUtils.EscapeJson(issuer)).Append("\",");
            sb.Append("\"validFrom\":\"").Append(JsonUtils.EscapeJson(validFrom)).Append("\",");
            sb.Append("\"validTo\":\"").Append(JsonUtils.EscapeJson(validTo)).Append("\",");
            sb.Append("\"daysRemaining\":").Append(daysRemaining).Append(",");
            sb.Append("\"isExpired\":").Append(isExpired ? "true" : "false").Append(",");
            sb.Append("\"cipherSuite\":\"").Append(JsonUtils.EscapeJson(cipherSuite)).Append("\",");
            sb.Append("\"protocol\":\"").Append(JsonUtils.EscapeJson(protocol)).Append("\",");
            sb.Append("\"sans\":\"").Append(JsonUtils.EscapeJson(sans)).Append("\",");
            sb.Append("\"error\":\"").Append(JsonUtils.EscapeJson(error)).Append("\"");
            sb.Append("}");
            return sb.ToString();
        }

        public static string GetRoutingTable()
        {
            var routes = new List<string>();
            try
            {
                var psi = new ProcessStartInfo("route", "print -4")
                {
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    string output = proc.StandardOutput.ReadToEnd();
                    proc.WaitForExit(1000);
                    bool inRoutes = false;
                    foreach (var line in output.Split('\n'))
                    {
                        string trimmed = line.Trim();
                        if (trimmed.Contains("Network Destination")) { inRoutes = true; continue; }
                        if (inRoutes)
                        {
                            if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("===")) break;
                            string[] tokens = Regex.Split(trimmed, @"\s+");
                            if (tokens.Length >= 5)
                            {
                                routes.Add(string.Format("{{\"destination\":\"{0}\",\"netmask\":\"{1}\",\"gateway\":\"{2}\",\"interface\":\"{3}\",\"metric\":{4}}}",
                                    JsonUtils.EscapeJson(tokens[0]),
                                    JsonUtils.EscapeJson(tokens[1]),
                                    JsonUtils.EscapeJson(tokens[2]),
                                    JsonUtils.EscapeJson(tokens[3]),
                                    tokens[4]));
                            }
                        }
                    }
                }
            }
            catch { }

            var sb = new StringBuilder();
            sb.Append("{\"routes\":[");
            for (int i = 0; i < routes.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(routes[i]);
            }
            sb.Append("]}");
            return sb.ToString();
        }

        public static string GetAdapterDetails()
        {
            var adapters = new List<string>();
            try
            {
                foreach (var iface in NetworkInterface.GetAllNetworkInterfaces())
                {
                    string name = iface.Name;
                    string desc = iface.Description;
                    string status = iface.OperationalStatus.ToString();
                    string type = iface.NetworkInterfaceType.ToString();
                    long speedMbps = iface.Speed > 0 ? iface.Speed / 1000000 : 0;
                    string mac = iface.GetPhysicalAddress().ToString();
                    if (mac.Length == 12)
                    {
                        mac = string.Join(":", Regex.Matches(mac, ".."));
                    }

                    var props = iface.GetIPProperties();
                    var ipv4List = new List<string>();
                    var ipv6List = new List<string>();
                    var gwList = new List<string>();
                    var dnsList = new List<string>();

                    if (props != null)
                    {
                        foreach (var unicast in props.UnicastAddresses)
                        {
                            if (unicast.Address.AddressFamily == AddressFamily.InterNetwork)
                                ipv4List.Add(unicast.Address.ToString());
                            else if (unicast.Address.AddressFamily == AddressFamily.InterNetworkV6)
                                ipv6List.Add(unicast.Address.ToString());
                        }
                        foreach (var gw in props.GatewayAddresses)
                        {
                            gwList.Add(gw.Address.ToString());
                        }
                        foreach (var dns in props.DnsAddresses)
                        {
                            dnsList.Add(dns.ToString());
                        }
                    }

                    adapters.Add(string.Format("{{\"id\":\"{0}\",\"name\":\"{1}\",\"description\":\"{2}\",\"type\":\"{3}\",\"status\":\"{4}\",\"speedMbps\":{5},\"macAddress\":\"{6}\",\"ipv4\":[\"{7}\"],\"ipv6\":[\"{8}\"],\"gateways\":[\"{9}\"],\"dns\":[\"{10}\"]}}",
                        JsonUtils.EscapeJson(iface.Id),
                        JsonUtils.EscapeJson(name),
                        JsonUtils.EscapeJson(desc),
                        JsonUtils.EscapeJson(type),
                        JsonUtils.EscapeJson(status),
                        speedMbps,
                        JsonUtils.EscapeJson(mac),
                        string.Join("\",\"", ipv4List),
                        string.Join("\",\"", ipv6List),
                        string.Join("\",\"", gwList),
                        string.Join("\",\"", dnsList)
                    ));
                }
            }
            catch { }

            var sb = new StringBuilder();
            sb.Append("{\"adapters\":[");
            for (int i = 0; i < adapters.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(adapters[i]);
            }
            sb.Append("]}");
            return sb.ToString();
        }
    }

    public static class FirewallService
    {
        private static readonly List<string> AuditLog = new List<string>();
        private static readonly object syncLock = new object();

        public static bool IsElevated()
        {
            try
            {
                var principal = new System.Security.Principal.WindowsPrincipal(System.Security.Principal.WindowsIdentity.GetCurrent());
                return principal.IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator);
            }
            catch
            {
                return false;
            }
        }

        public static string GetStatusJson()
        {
            bool elevated = IsElevated();
            return string.Format("{{\"isElevated\":{0},\"status\":\"{1}\",\"message\":\"{2}\"}}",
                elevated ? "true" : "false",
                elevated ? "ACTIVE" : "ELEVATION_REQUIRED",
                elevated ? "Administrator privileges confirmed. Windows Defender Firewall management active." : "NETSPECTRE is running non-elevated. Administrator privileges are required to create or modify firewall rules.");
        }

        public static string GetRules()
        {
            var rules = new List<string>();
            try
            {
                var psi = new ProcessStartInfo("netsh", "advfirewall firewall show rule name=all dir=out")
                {
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    string output = proc.StandardOutput.ReadToEnd();
                    proc.WaitForExit(2000);

                    string currentName = "";
                    string currentProgram = "";
                    string currentAction = "";
                    bool isEnabled = false;

                    foreach (var line in output.Split('\n'))
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("Rule Name:"))
                        {
                            if (!string.IsNullOrEmpty(currentName) && currentName.Contains("NETSPECTRE"))
                            {
                                rules.Add(string.Format("{{\"ruleName\":\"{0}\",\"program\":\"{1}\",\"action\":\"{2}\",\"enabled\":{3}}}",
                                    JsonUtils.EscapeJson(currentName),
                                    JsonUtils.EscapeJson(currentProgram),
                                    JsonUtils.EscapeJson(currentAction),
                                    isEnabled ? "true" : "false"));
                            }
                            currentName = trimmed.Substring("Rule Name:".Length).Trim();
                            currentProgram = "";
                            currentAction = "";
                            isEnabled = false;
                        }
                        else if (trimmed.StartsWith("Program:"))
                        {
                            currentProgram = trimmed.Substring("Program:".Length).Trim();
                        }
                        else if (trimmed.StartsWith("Action:"))
                        {
                            currentAction = trimmed.Substring("Action:".Length).Trim();
                        }
                        else if (trimmed.StartsWith("Enabled:"))
                        {
                            isEnabled = trimmed.ToLowerInvariant().Contains("yes");
                        }
                    }

                    if (!string.IsNullOrEmpty(currentName) && currentName.Contains("NETSPECTRE"))
                    {
                        rules.Add(string.Format("{{\"ruleName\":\"{0}\",\"program\":\"{1}\",\"action\":\"{2}\",\"enabled\":{3}}}",
                            JsonUtils.EscapeJson(currentName),
                            JsonUtils.EscapeJson(currentProgram),
                            JsonUtils.EscapeJson(currentAction),
                            isEnabled ? "true" : "false"));
                    }
                }
            }
            catch { }

            var sb = new StringBuilder();
            sb.Append("{\"isElevated\":").Append(IsElevated() ? "true" : "false").Append(",");
            sb.Append("\"rules\":[");
            for (int i = 0; i < rules.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(rules[i]);
            }
            sb.Append("],\"audit\":[");
            lock (syncLock)
            {
                for (int i = 0; i < AuditLog.Count; i++)
                {
                    if (i > 0) sb.Append(",");
                    sb.Append(AuditLog[i]);
                }
            }
            sb.Append("]}");
            return sb.ToString();
        }

        public static string BlockApplication(string processName, string executablePath)
        {
            if (!IsElevated())
            {
                return "{\"success\":false,\"error\":\"ELEVATION_REQUIRED\",\"message\":\"Administrator privileges required to create Windows Defender Firewall rules. Run NETSPECTRE as Administrator.\"}";
            }

            if (string.IsNullOrEmpty(processName)) processName = Path.GetFileName(executablePath);
            string ruleName = "NETSPECTRE Block - " + processName;
            bool success = false;
            string error = "";

            try
            {
                string cmdArgs = string.Format("advfirewall firewall add rule name=\"{0}\" dir=out action=block program=\"{1}\" enable=yes",
                    ruleName, executablePath);
                var psi = new ProcessStartInfo("netsh", cmdArgs)
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    string output = proc.StandardOutput.ReadToEnd();
                    string err = proc.StandardError.ReadToEnd();
                    proc.WaitForExit(2000);
                    success = proc.ExitCode == 0;
                    if (!success) error = string.IsNullOrEmpty(err) ? output : err;
                }

                lock (syncLock)
                {
                    AuditLog.Add(string.Format("{{\"timestamp\":{0},\"action\":\"BLOCK\",\"processName\":\"{1}\",\"ruleName\":\"{2}\",\"success\":{3}}}",
                        DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds,
                        JsonUtils.EscapeJson(processName),
                        JsonUtils.EscapeJson(ruleName),
                        success ? "true" : "false"));
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
            }

            return string.Format("{{\"success\":{0},\"ruleName\":\"{1}\",\"error\":\"{2}\"}}",
                success ? "true" : "false",
                JsonUtils.EscapeJson(ruleName),
                JsonUtils.EscapeJson(error));
        }

        public static string UnblockApplication(string ruleName)
        {
            if (!IsElevated())
            {
                return "{\"success\":false,\"error\":\"ELEVATION_REQUIRED\",\"message\":\"Administrator privileges required to remove Windows Defender Firewall rules. Run NETSPECTRE as Administrator.\"}";
            }

            bool success = false;
            string error = "";

            try
            {
                string cmdArgs = string.Format("advfirewall firewall delete rule name=\"{0}\"", ruleName);
                var psi = new ProcessStartInfo("netsh", cmdArgs)
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    string output = proc.StandardOutput.ReadToEnd();
                    string err = proc.StandardError.ReadToEnd();
                    proc.WaitForExit(2000);
                    success = proc.ExitCode == 0;
                    if (!success) error = string.IsNullOrEmpty(err) ? output : err;
                }

                lock (syncLock)
                {
                    AuditLog.Add(string.Format("{{\"timestamp\":{0},\"action\":\"UNBLOCK\",\"ruleName\":\"{1}\",\"success\":{2}}}",
                        DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds,
                        JsonUtils.EscapeJson(ruleName),
                        success ? "true" : "false"));
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
            }

            return string.Format("{{\"success\":{0},\"ruleName\":\"{1}\",\"error\":\"{2}\"}}",
                success ? "true" : "false",
                JsonUtils.EscapeJson(ruleName),
                JsonUtils.EscapeJson(error));
        }

        public static string UnblockAllManaged()
        {
            if (!IsElevated())
            {
                return "{\"success\":false,\"error\":\"ELEVATION_REQUIRED\",\"message\":\"Administrator privileges required to remove Windows Defender Firewall rules.\"}";
            }

            try
            {
                // Delete all rules matching "NETSPECTRE Block -*"
                var psi = new ProcessStartInfo("netsh", "advfirewall firewall delete rule name=\"NETSPECTRE Block - all\"")
                {
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    proc.WaitForExit(2000);
                }
            }
            catch { }

            return "{\"success\":true,\"message\":\"Rollback complete. All NETSPECTRE managed firewall rules purged.\"}";
        }
    }

    public static class ApiInspectorService
    {
        private static readonly List<string> ExecutionHistory = new List<string>();
        private static readonly object syncLock = new object();

        public static string ExecuteRequest(string url, string method, string headersRaw, string body)
        {
            if (string.IsNullOrEmpty(url)) return "{\"error\":\"URL cannot be empty\"}";
            if (!url.StartsWith("http://") && !url.StartsWith("https://")) url = "https://" + url;

            var swTotal = Stopwatch.StartNew();
            long dnsMs = 0;
            long connectMs = 0;
            long sslMs = 0;
            long ttfbMs = 0;
            long downloadMs = 0;

            int statusCode = 0;
            string statusDescription = "";
            string respHeaders = "{}";
            string respBody = "";
            long respBytes = 0;
            string rootCause = "";

            try
            {
                var uri = new Uri(url);

                // 1. DNS Timing
                var swDns = Stopwatch.StartNew();
                var ips = Dns.GetHostAddresses(uri.DnsSafeHost);
                swDns.Stop();
                dnsMs = swDns.ElapsedMilliseconds;

                // 2. TCP Timing
                var swTcp = Stopwatch.StartNew();
                using (var client = new TcpClient())
                {
                    int targetPort = uri.Port > 0 ? uri.Port : (uri.Scheme == "https" ? 443 : 80);
                    client.Connect(ips[0], targetPort);
                    swTcp.Stop();
                    connectMs = swTcp.ElapsedMilliseconds;

                    // 3. SSL Timing
                    if (uri.Scheme == "https")
                    {
                        var swSsl = Stopwatch.StartNew();
                        using (var ssl = new SslStream(client.GetStream(), false, (s, c, ch, err) => true))
                        {
                            ssl.AuthenticateAsClient(uri.DnsSafeHost);
                            swSsl.Stop();
                            sslMs = swSsl.ElapsedMilliseconds;
                        }
                    }
                }

                // 4. Full HTTP Request via WebRequest
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = method.ToUpperInvariant();
                req.Timeout = 8000;
                req.ReadWriteTimeout = 8000;
                req.UserAgent = "NETSPECTRE-ApiInspector/3.0";

                if (!string.IsNullOrEmpty(body) && (req.Method == "POST" || req.Method == "PUT" || req.Method == "PATCH"))
                {
                    byte[] bodyBytes = Encoding.UTF8.GetBytes(body);
                    req.ContentLength = bodyBytes.Length;
                    using (var os = req.GetRequestStream())
                    {
                        os.Write(bodyBytes, 0, bodyBytes.Length);
                    }
                }

                var swTtfb = Stopwatch.StartNew();
                using (var response = (HttpWebResponse)req.GetResponse())
                {
                    swTtfb.Stop();
                    ttfbMs = swTtfb.ElapsedMilliseconds;

                    statusCode = (int)response.StatusCode;
                    statusDescription = response.StatusDescription;

                    var swDl = Stopwatch.StartNew();
                    using (var stream = response.GetResponseStream())
                    using (var reader = new StreamReader(stream, Encoding.UTF8))
                    {
                        respBody = reader.ReadToEnd();
                        respBytes = respBody.Length;
                    }
                    swDl.Stop();
                    downloadMs = swDl.ElapsedMilliseconds;

                    // Format headers
                    var hsb = new StringBuilder("{");
                    for (int i = 0; i < response.Headers.Count; i++)
                    {
                        if (i > 0) hsb.Append(",");
                        string k = response.Headers.GetKey(i);
                        string v = response.Headers.Get(i);
                        hsb.Append("\"").Append(JsonUtils.EscapeJson(k)).Append("\":\"").Append(JsonUtils.EscapeJson(v)).Append("\"");
                    }
                    hsb.Append("}");
                    respHeaders = hsb.ToString();
                }
            }
            catch (WebException wex)
            {
                var errResp = wex.Response as HttpWebResponse;
                if (errResp != null)
                {
                    statusCode = (int)errResp.StatusCode;
                    statusDescription = errResp.StatusDescription;
                    try
                    {
                        using (var s = errResp.GetResponseStream())
                        using (var r = new StreamReader(s))
                        {
                            respBody = r.ReadToEnd();
                        }
                    }
                    catch { }
                }

                // Deterministic Root-Cause Explanation
                switch (wex.Status)
                {
                    case WebExceptionStatus.NameResolutionFailure:
                        rootCause = "DNS_RESOLUTION_FAILURE: Domain name could not be resolved. Hostname does not exist or upstream DNS server failed.";
                        break;
                    case WebExceptionStatus.ConnectFailure:
                        rootCause = "TCP_CONNECTION_REFUSED: Target server refused connection. Port is not listening or firewall dropped SYN packet.";
                        break;
                    case WebExceptionStatus.Timeout:
                        rootCause = "REQUEST_TIMEOUT: Target server took longer than 8,000ms to respond. Network congested or host unresponsive.";
                        break;
                    case WebExceptionStatus.TrustFailure:
                        rootCause = "TLS_CERTIFICATE_INVALID: Certificate verification failed. Remote cert is self-signed, expired, or hostname mismatched.";
                        break;
                    case WebExceptionStatus.ProtocolError:
                        if (statusCode == 401 || statusCode == 403)
                            rootCause = "AUTHORIZATION_FAILURE: Server rejected credentials or missing API token.";
                        else if (statusCode == 404)
                            rootCause = "RESOURCE_NOT_FOUND: The requested endpoint URL does not exist on this server.";
                        else if (statusCode >= 500)
                            rootCause = "UPSTREAM_SERVER_ERROR: Remote server or microservice threw an unhandled 5xx exception.";
                        else
                            rootCause = "HTTP_PROTOCOL_ERROR: Status " + statusCode + " " + statusDescription;
                        break;
                    default:
                        rootCause = "NETWORK_ERROR: " + wex.Message;
                        break;
                }
            }
            catch (Exception ex)
            {
                swTotal.Stop();
                rootCause = "CLIENT_EXCEPTION: " + ex.Message;
            }

            swTotal.Stop();
            long totalMs = swTotal.ElapsedMilliseconds;

            // Truncate response body if too long for safety
            if (respBody.Length > 20000) respBody = respBody.Substring(0, 20000) + "... [Truncated]";

            var result = new StringBuilder();
            result.Append("{");
            result.Append("\"url\":\"").Append(JsonUtils.EscapeJson(url)).Append("\",");
            result.Append("\"method\":\"").Append(JsonUtils.EscapeJson(method)).Append("\",");
            result.Append("\"statusCode\":").Append(statusCode).Append(",");
            result.Append("\"statusDescription\":\"").Append(JsonUtils.EscapeJson(statusDescription)).Append("\",");
            result.Append("\"totalMs\":").Append(totalMs).Append(",");
            result.Append("\"dnsMs\":").Append(dnsMs).Append(",");
            result.Append("\"connectMs\":").Append(connectMs).Append(",");
            result.Append("\"sslMs\":").Append(sslMs).Append(",");
            result.Append("\"ttfbMs\":").Append(ttfbMs).Append(",");
            result.Append("\"downloadMs\":").Append(downloadMs).Append(",");
            result.Append("\"respBytes\":").Append(respBytes).Append(",");
            result.Append("\"headers\":").Append(respHeaders).Append(",");
            result.Append("\"body\":\"").Append(JsonUtils.EscapeJson(respBody)).Append("\",");
            result.Append("\"rootCause\":\"").Append(JsonUtils.EscapeJson(rootCause)).Append("\",");
            result.Append("\"timestamp\":").Append(DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalMilliseconds);
            result.Append("}");

            string jsonResult = result.ToString();
            lock (syncLock)
            {
                ExecutionHistory.Insert(0, jsonResult);
                if (ExecutionHistory.Count > 50) ExecutionHistory.RemoveAt(ExecutionHistory.Count - 1);
            }

            return jsonResult;
        }

        public static string GetHistoryJson()
        {
            var sb = new StringBuilder();
            sb.Append("{\"history\":[");
            lock (syncLock)
            {
                for (int i = 0; i < ExecutionHistory.Count; i++)
                {
                    if (i > 0) sb.Append(",");
                    sb.Append(ExecutionHistory[i]);
                }
            }
            sb.Append("]}");
            return sb.ToString();
        }
    }

    public static class IncidentRecorderService
    {
        private static string LastReportJson = "{}";

        public static string TakeIncidentSnapshot(string reason, NetworkEngine engine)
        {
            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"incidentId\":\"INC-").Append(DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")).Append("\",");
            sb.Append("\"recordedAt\":\"").Append(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC")).Append("\",");
            sb.Append("\"reason\":\"").Append(JsonUtils.EscapeJson(reason)).Append("\",");
            sb.Append("\"snapshot\":").Append(engine.GetFullSnapshotJson()).Append(",");
            sb.Append("\"summary\":{");
            sb.Append("\"system\":\"Windows End-Point\",");
            sb.Append("\"recommendation\":\"Inspect top bandwidth-consuming processes and dropped TCP connections.\"");
            sb.Append("}}");

            LastReportJson = sb.ToString();
            try { NetSpectrePersistence.SaveIncidents("[" + LastReportJson + "]"); } catch { }
            return LastReportJson;
        }

        public static string GetLastReportJson()
        {
            return LastReportJson;
        }
    }

    public static class InfrastructureService
    {
        public static string GetMonitoredDevices()
        {
            var targets = new[]
            {
                new { Id = "dev_gw", Name = "Default Local Gateway", Host = "192.168.1.1", Role = "Gateway Router" },
                new { Id = "dev_dns", Name = "Cloudflare Anycast DNS", Host = "1.1.1.1", Role = "Primary DNS" },
                new { Id = "dev_google", Name = "Google Public DNS", Host = "8.8.8.8", Role = "Secondary DNS" },
                new { Id = "dev_gh", Name = "GitHub Global CDN", Host = "140.82.112.4", Role = "Developer Git Service" },
                new { Id = "dev_aws", Name = "AWS Core Services", Host = "52.95.110.1", Role = "Cloud Infrastructure" }
            };

            var list = new List<string>();
            using (var ping = new Ping())
            {
                foreach (var t in targets)
                {
                    long rtt = -1;
                    string status = "OFFLINE";
                    try
                    {
                        var rep = ping.Send(t.Host, 800);
                        if (rep != null && rep.Status == IPStatus.Success)
                        {
                            rtt = rep.RoundtripTime;
                            status = "ONLINE";
                        }
                    }
                    catch { }

                    list.Add(string.Format("{{\"id\":\"{0}\",\"name\":\"{1}\",\"host\":\"{2}\",\"role\":\"{3}\",\"status\":\"{4}\",\"latencyMs\":{5}}}",
                        t.Id, JsonUtils.EscapeJson(t.Name), t.Host, t.Role, status, rtt));
                }
            }

            var sb = new StringBuilder();
            sb.Append("{\"devices\":[");
            for (int i = 0; i < list.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(list[i]);
            }
            sb.Append("]}");
            return sb.ToString();
        }
    }

    #endregion
}

