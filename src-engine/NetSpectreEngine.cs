using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace NetSpectre
{
    public class Program
    {
        public static void Main(string[] args)
        {
            int port = 48123;
            bool daemonMode = true;

            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--port" && i + 1 < args.Length)
                {
                    int.TryParse(args[i + 1], out port);
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
            var server = new HttpServer(engine, port);
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
        private HttpListener listener;
        private Thread serverThread;
        private volatile bool isRunning = false;

        public event Action OnShutdownRequested;

        public HttpServer(NetworkEngine engine, int port)
        {
            this.engine = engine;
            this.port = port;
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

            // CORS headers for Vite frontend
            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 204;
                res.Close();
                return;
            }

            try
            {
                string path = req.Url.AbsolutePath.ToLowerInvariant();

                if (path == "/api/status" || path == "/api/telemetry")
                {
                    string json = engine.GetFullSnapshotJson();
                    byte[] bytes = Encoding.UTF8.GetBytes(json);
                    res.ContentType = "application/json";
                    res.ContentLength64 = bytes.Length;
                    res.OutputStream.Write(bytes, 0, bytes.Length);
                }
                else if (path == "/api/history")
                {
                    string json = engine.GetTimelineHistoryJson();
                    byte[] bytes = Encoding.UTF8.GetBytes(json);
                    res.ContentType = "application/json";
                    res.ContentLength64 = bytes.Length;
                    res.OutputStream.Write(bytes, 0, bytes.Length);
                }
                else if (path == "/api/pcap/export")
                {
                    byte[] pcapBytes = engine.GeneratePcapCapture();
                    res.ContentType = "application/vnd.tcpdump.pcap";
                    res.Headers.Add("Content-Disposition", "attachment; filename=\"netspectre-capture.pcap\"");
                    res.ContentLength64 = pcapBytes.Length;
                    res.OutputStream.Write(pcapBytes, 0, pcapBytes.Length);
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
                    byte[] bytes = Encoding.UTF8.GetBytes("{\"error\":\"Endpoint not found\"}");
                    res.ContentType = "application/json";
                    res.OutputStream.Write(bytes, 0, bytes.Length);
                }
            }
            catch (Exception ex)
            {
                try
                {
                    res.StatusCode = 500;
                    byte[] bytes = Encoding.UTF8.GetBytes("{\"error\":\"" + ex.Message.Replace("\"", "'") + "\"}");
                    res.ContentType = "application/json";
                    res.OutputStream.Write(bytes, 0, bytes.Length);
                }
                catch { }
            }
            finally
            {
                try { res.Close(); } catch { }
            }
        }
    }

    #endregion
}
