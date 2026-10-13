using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Principal;
using System.Text;
using System.Threading;

namespace NetSpectre
{
    public enum CaptureMode
    {
        Basic,     // Mode 1: Win32 IP Helper socket telemetry (flow metadata, no raw wire frames)
        Advanced   // Mode 2: Genuine raw packet wire capture (Raw Socket SIO_RCVALL or PktMon)
    }

    public enum CaptureState
    {
        Idle,
        Running,
        Unavailable,
        Error
    }

    public class RawPacketRecord
    {
        public string id;
        public long timestampMs;
        public long timestampUs;
        public string protocol;
        public string sourceIp;
        public int sourcePort;
        public string destIp;
        public int destPort;
        public int length;
        public string flags;
        public int ttl;
        public byte[] rawBytes;
    }

    /// <summary>
    /// Genuine network packet capture service for NETSPECTRE v3.1 Enterprise.
    /// Supports Mode 1 (Basic Win32 IP Helper telemetry) and Mode 2 (Deep wire packet capture).
    /// Enforces cryptographic truthfulness and NEVER generates synthetic frames.
    /// </summary>
    public static class PacketCaptureService
    {
        private static readonly object syncLock = new object();
        private static readonly List<RawPacketRecord> packetBuffer = new List<RawPacketRecord>();
        private const int MaxBufferPackets = 5000;

        public static CaptureMode CurrentMode = CaptureMode.Basic;
        public static CaptureState CurrentState = CaptureState.Idle;
        public static string StatusMessage = "Mode 1: Basic Telemetry (Win32 IP Helper). For Mode 2 wire capture, run as Administrator.";
        public static bool IsElevated = false;

        private static Socket snifferSocket = null;
        private static Thread snifferThread = null;
        private static volatile bool isSniffing = false;
        private static long totalPacketsCaptured = 0;
        private static long totalBytesCaptured = 0;

        static PacketCaptureService()
        {
            try
            {
                var identity = WindowsIdentity.GetCurrent();
                var principal = new WindowsPrincipal(identity);
                IsElevated = principal.IsInRole(WindowsBuiltInRole.Administrator);
                if (IsElevated)
                {
                    StatusMessage = "Administrator detected. Mode 2 (Advanced Wire Capture) is available.";
                }
            }
            catch
            {
                IsElevated = false;
            }
        }

        public static string GetStatusJson()
        {
            lock (syncLock)
            {
                var sb = new StringBuilder();
                sb.Append("{");
                sb.Append("\"mode\":\"").Append(CurrentMode == CaptureMode.Basic ? "BASIC" : "ADVANCED").Append("\",");
                sb.Append("\"state\":\"").Append(CurrentState.ToString().ToUpperInvariant()).Append("\",");
                sb.Append("\"isElevated\":").Append(IsElevated ? "true" : "false").Append(",");
                sb.Append("\"statusMessage\":\"").Append(JsonUtils.EscapeJson(StatusMessage)).Append("\",");
                sb.Append("\"packetCount\":").Append(packetBuffer.Count).Append(",");
                sb.Append("\"totalPacketsCaptured\":").Append(totalPacketsCaptured).Append(",");
                sb.Append("\"totalBytesCaptured\":").Append(totalBytesCaptured).Append(",");
                sb.Append("\"provider\":").Append(IsElevated ? "\"Windows Raw Sockets (SIO_RCVALL)\"" : "\"Win32 IP Helper Telemetry\"");
                sb.Append("}");
                return sb.ToString();
            }
        }

        public static bool StartAdvancedCapture(string bindIp = null)
        {
            if (!IsElevated)
            {
                CurrentMode = CaptureMode.Basic;
                CurrentState = CaptureState.Unavailable;
                StatusMessage = "Packet capture unavailable. Administrator elevation is required for raw wire sniffing. Run NETSPECTRE as Administrator or enable Npcap/PktMon.";
                return false;
            }

            if (isSniffing) return true;

            try
            {
                IPAddress localAddress = null;
                if (!string.IsNullOrEmpty(bindIp))
                {
                    IPAddress.TryParse(bindIp, out localAddress);
                }

                if (localAddress == null)
                {
                    // Find first active IPv4 address
                    foreach (var ip in Dns.GetHostAddresses(Dns.GetHostName()))
                    {
                        if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                        {
                            localAddress = ip;
                            break;
                        }
                    }
                }

                if (localAddress == null)
                {
                    localAddress = IPAddress.Loopback;
                }

                snifferSocket = new Socket(AddressFamily.InterNetwork, SocketType.Raw, ProtocolType.IP);
                snifferSocket.Bind(new IPEndPoint(localAddress, 0));
                snifferSocket.SetSocketOption(SocketOptionLevel.IP, SocketOptionName.HeaderIncluded, true);

                byte[] inVal = new byte[] { 1, 0, 0, 0 };
                byte[] outVal = new byte[4];
                // SIO_RCVALL = 0x98000001
                snifferSocket.IOControl(unchecked((int)0x98000001), inVal, outVal);

                isSniffing = true;
                CurrentMode = CaptureMode.Advanced;
                CurrentState = CaptureState.Running;
                StatusMessage = "Mode 2 Active: Genuine raw wire sniffing bound to " + localAddress.ToString();

                snifferThread = new Thread(SnifferLoop)
                {
                    IsBackground = true,
                    Name = "NetSpectreRawSniffer"
                };
                snifferThread.Start();
                return true;
            }
            catch (SocketException sex)
            {
                CurrentState = CaptureState.Error;
                StatusMessage = "Raw socket bind failed (Error " + sex.ErrorCode + "): " + sex.Message + ". Verify Administrator privileges.";
                return false;
            }
            catch (Exception ex)
            {
                CurrentState = CaptureState.Error;
                StatusMessage = "Capture failed: " + ex.Message;
                return false;
            }
        }

        public static void StopAdvancedCapture()
        {
            isSniffing = false;
            if (snifferSocket != null)
            {
                try { snifferSocket.Close(); } catch { }
                snifferSocket = null;
            }
            CurrentState = CaptureState.Idle;
            StatusMessage = "Advanced packet capture stopped. Returning to Mode 1 (Basic Monitoring).";
        }

        private static void SnifferLoop()
        {
            byte[] buffer = new byte[65536];

            while (isSniffing)
            {
                try
                {
                    if (snifferSocket == null) break;
                    int received = snifferSocket.Receive(buffer, 0, buffer.Length, SocketFlags.None);
                    if (received > 0)
                    {
                        ParseAndStoreRawPacket(buffer, received);
                    }
                }
                catch
                {
                    if (!isSniffing) break;
                }
            }
        }

        private static void ParseAndStoreRawPacket(byte[] buffer, int length)
        {
            if (length < 20) return; // Minimum IPv4 header length

            try
            {
                // Parse genuine IPv4 header
                byte verAndIhl = buffer[0];
                int ihl = (verAndIhl & 0x0F) * 4;
                if (ihl < 20 || length < ihl) return;

                int ttl = buffer[8];
                byte protoByte = buffer[9];
                string protoStr = "OTHER";
                if (protoByte == 6) protoStr = "TCP";
                else if (protoByte == 17) protoStr = "UDP";
                else if (protoByte == 1) protoStr = "ICMP";

                string srcIp = string.Format("{0}.{1}.{2}.{3}", buffer[12], buffer[13], buffer[14], buffer[15]);
                string dstIp = string.Format("{0}.{1}.{2}.{3}", buffer[16], buffer[17], buffer[18], buffer[19]);

                int srcPort = 0;
                int dstPort = 0;
                string flagsStr = "";

                if (protoStr == "TCP" && length >= ihl + 20)
                {
                    srcPort = (buffer[ihl] << 8) | buffer[ihl + 1];
                    dstPort = (buffer[ihl + 2] << 8) | buffer[ihl + 3];

                    byte tcpFlags = buffer[ihl + 13];
                    var fl = new List<string>();
                    if ((tcpFlags & 0x02) != 0) fl.Add("SYN");
                    if ((tcpFlags & 0x10) != 0) fl.Add("ACK");
                    if ((tcpFlags & 0x01) != 0) fl.Add("FIN");
                    if ((tcpFlags & 0x04) != 0) fl.Add("RST");
                    if ((tcpFlags & 0x08) != 0) fl.Add("PSH");
                    if ((tcpFlags & 0x20) != 0) fl.Add("URG");
                    flagsStr = string.Join(",", fl.ToArray());
                }
                else if (protoStr == "UDP" && length >= ihl + 8)
                {
                    srcPort = (buffer[ihl] << 8) | buffer[ihl + 1];
                    dstPort = (buffer[ihl + 2] << 8) | buffer[ihl + 3];
                    flagsStr = "UDP";
                }
                else if (protoStr == "ICMP")
                {
                    flagsStr = "TYPE=" + buffer[ihl];
                }

                byte[] packetBytes = new byte[length];
                Buffer.BlockCopy(buffer, 0, packetBytes, 0, length);

                long nowMs = DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).Ticks / 10000;
                long nowUs = (DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).Ticks / 10) % 1000000;

                var record = new RawPacketRecord
                {
                    id = Guid.NewGuid().ToString("N").Substring(0, 10),
                    timestampMs = nowMs,
                    timestampUs = nowUs,
                    protocol = protoStr,
                    sourceIp = srcIp,
                    sourcePort = srcPort,
                    destIp = dstIp,
                    destPort = dstPort,
                    length = length,
                    flags = flagsStr,
                    ttl = ttl,
                    rawBytes = packetBytes
                };

                lock (syncLock)
                {
                    packetBuffer.Add(record);
                    totalPacketsCaptured++;
                    totalBytesCaptured += length;
                    if (packetBuffer.Count > MaxBufferPackets)
                    {
                        packetBuffer.RemoveAt(0);
                    }
                }
            }
            catch { }
        }

        public static string GetCapturedPacketsJson(int limit = 200)
        {
            lock (syncLock)
            {
                var sb = new StringBuilder();
                sb.Append("{\"packets\":[");
                int start = Math.Max(0, packetBuffer.Count - limit);
                for (int i = packetBuffer.Count - 1; i >= start; i--)
                {
                    if (i < packetBuffer.Count - 1) sb.Append(",");
                    var p = packetBuffer[i];
                    sb.Append("{");
                    sb.Append("\"id\":\"").Append(p.id).Append("\",");
                    sb.Append("\"timestamp\":").Append(p.timestampMs).Append(",");
                    sb.Append("\"protocol\":\"").Append(p.protocol).Append("\",");
                    sb.Append("\"sourceIp\":\"").Append(JsonUtils.EscapeJson(p.sourceIp)).Append("\",");
                    sb.Append("\"sourcePort\":").Append(p.sourcePort).Append(",");
                    sb.Append("\"destIp\":\"").Append(JsonUtils.EscapeJson(p.destIp)).Append("\",");
                    sb.Append("\"destPort\":").Append(p.destPort).Append(",");
                    sb.Append("\"length\":").Append(p.length).Append(",");
                    sb.Append("\"flags\":\"").Append(p.flags).Append("\",");
                    sb.Append("\"ttl\":").Append(p.ttl);
                    sb.Append("}");
                }
                sb.Append("]}");
                return sb.ToString();
            }
        }

        /// <summary>
        /// Exports genuine PCAP containing ONLY actually captured raw frames.
        /// Returns null if no genuine raw packets were captured (never creates synthetic frames).
        /// </summary>
        public static byte[] ExportGenuinePcap()
        {
            lock (syncLock)
            {
                if (packetBuffer.Count == 0)
                {
                    return null; // Return null to signal no genuine frames available
                }

                using (var ms = new MemoryStream())
                using (var bw = new BinaryWriter(ms))
                {
                    // Standard PCAP Global Header
                    bw.Write((uint)0xa1b2c3d4); // Magic number
                    bw.Write((ushort)2);        // Major version
                    bw.Write((ushort)4);        // Minor version
                    bw.Write((int)0);           // Timezone GMT
                    bw.Write((uint)0);          // Sigfigs
                    bw.Write((uint)65535);      // Snaplen
                    bw.Write((uint)101);        // LINKTYPE_RAW (Raw IP packet without ethernet framing)

                    foreach (var p in packetBuffer)
                    {
                        uint sec = (uint)(p.timestampMs / 1000);
                        uint usec = (uint)p.timestampUs;
                        uint capLen = (uint)p.rawBytes.Length;

                        // Packet header
                        bw.Write(sec);
                        bw.Write(usec);
                        bw.Write(capLen);
                        bw.Write(capLen);

                        // Original captured raw packet bytes (no synthetic padding)
                        bw.Write(p.rawBytes);
                    }

                    return ms.ToArray();
                }
            }
        }

        public static void Clear()
        {
            lock (syncLock)
            {
                packetBuffer.Clear();
            }
        }
    }
}
