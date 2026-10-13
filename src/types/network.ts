export interface ConnectionRecord {
  id: string;
  protocol: 'TCP' | 'UDP';
  ipVersion: 'IPv4' | 'IPv6';
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string; // 'ESTABLISHED', 'LISTENING', 'TIME_WAIT', 'CLOSE_WAIT', etc.
  pid: number;
  processName: string;
  executablePath: string;
  domain: string;
  countryCode: string;
  countryName: string;
  asn: string;
  organization: string;
  isPrivate: boolean;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  sendRateBps: number;
  recvRateBps: number;
  firstSeenMs: number;
  lastSeenMs: number;
  isSuspicious: boolean;
  suspiciousReason: string;
}

export interface ApplicationRecord {
  pid: number;
  processName: string;
  executablePath: string;
  activeConnections: number;
  totalBytesSent: number;
  totalBytesReceived: number;
  currentSendRate: number;
  currentRecvRate: number;
  countries: string[];
  domains: string[];
}

export interface NetworkEvent {
  id: string;
  timestamp: number;
  eventType: 'CONNECT' | 'DISCONNECT' | 'BURST' | 'SECURITY_ALERT';
  protocol: string;
  localEndpoint: string;
  remoteEndpoint: string;
  pid: number;
  processName: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface PacketSample {
  id: string;
  timestamp: number;
  protocol: string;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  length: number;
  direction: 'INCOMING' | 'OUTGOING';
  processName: string;
  pid: number;
  flags: string;
}

export interface TelemetrySnapshot {
  timestamp: number;
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
}

export interface TimelinePoint {
  timestamp: number;
  downBps: number;
  upBps: number;
  active: number;
}

export type ScreenId =
  | 'command-center'
  | 'data-explorer'
  | 'applications'
  | 'connections'
  | 'packets'
  | 'destinations'
  | 'timeline'
  | 'analytics'
  | 'security'
  | 'settings';

export type VisMode = 'neural-flow' | 'app-map' | 'data-stream' | 'dest-map' | 'protocol-matrix';
export type NodeSizingMode = 'bandwidth' | 'flows' | 'uniform';

export type NodeCategory = 'core' | 'application' | 'remote' | 'service';

export interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  glowColor: string;
  meta: any;
  activityLevel: number; // 0 to 1
  bytesIn: number;
  bytesOut: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  protocol: string;
  state: string;
  bandwidthBps: number;
  activityLevel: number;
  color: string;
  direction: 'in' | 'out' | 'both';
  connectionId: string;
}

export interface FlowParticle {
  edgeId: string;
  progress: number; // 0 to 1 along curve
  speed: number;
  direction: 'in' | 'out';
  color: string;
  size: number;
}
