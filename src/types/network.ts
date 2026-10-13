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

export type WorkspaceId = 'personal' | 'developer' | 'operations';

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
  | 'settings'
  // Personal Workspace
  | 'network-doctor'
  | 'internet-usage'
  | 'firewall'
  // Developer Workspace
  | 'api-debugger'
  | 'api-failure-analyzer'
  | 'env-monitor'
  // Network Operations Workspace
  | 'workbench'
  | 'incident-recorder'
  | 'devices';

export interface DoctorFinding {
  id: string;
  severity: 'healthy' | 'warning' | 'critical';
  category: string;
  title: string;
  explanation: string;
  recommendedAction: string;
  isFixable: boolean;
}

export interface DoctorDiagnosticResult {
  score: number;
  status: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL';
  gatewayIp: string;
  gatewayLatencyMs: number;
  gatewayOk: boolean;
  internetLatencyMs: number;
  internetOk: boolean;
  dnsLatencyMs: number;
  dnsOk: boolean;
  adapterName: string;
  wifiSsid: string;
  wifiSignalPercent: number;
  diagnosticDurationMs: number;
  timestamp: number;
  findings: DoctorFinding[];
}

export interface PingHop {
  seq: number;
  rttMs: number;
  ttl: number;
  status: string;
}

export interface PingResult {
  target: string;
  resolvedIp: string;
  count: number;
  hops: PingHop[];
  packetsSent: number;
  packetsReceived: number;
  packetLossPct: number;
  minRttMs: number;
  maxRttMs: number;
  avgRttMs: number;
  jitterMs: number;
}

export interface TracerouteHop {
  hop: number;
  ip: string;
  hostname: string;
  rttMs: number;
  status: string;
}

export interface TracerouteResult {
  target: string;
  resolvedIp: string;
  maxHops: number;
  hops: TracerouteHop[];
}

export interface DnsRecord {
  type: string;
  value: string;
}

export interface DnsLookupResult {
  host: string;
  recordType: string;
  canonicalName: string;
  queryTimeMs: number;
  error: string;
  records: DnsRecord[];
}

export interface PortTestResult {
  host: string;
  port: number;
  isOpen: boolean;
  connectTimeMs: number;
  banner: string;
  error: string;
}

export interface TlsInspectResult {
  host: string;
  port: number;
  handshakeTimeMs: number;
  isValid: boolean;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  isExpired: boolean;
  cipherSuite: string;
  protocol: string;
  sans: string;
  error: string;
}

export interface RouteEntry {
  destination: string;
  netmask: string;
  gateway: string;
  interface: string;
  metric: number;
}

export interface AdapterDetail {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  speedMbps: number;
  macAddress: string;
  ipv4: string[];
  ipv6: string[];
  gateways: string[];
  dns: string[];
}

export interface FirewallRule {
  ruleName: string;
  program: string;
  action: string;
  enabled: boolean;
}

export interface FirewallAuditEntry {
  timestamp: number;
  action: 'BLOCK' | 'UNBLOCK';
  processName?: string;
  ruleName: string;
  success: boolean;
}

export interface ApiExecutionResult {
  url: string;
  method: string;
  statusCode: number;
  statusDescription: string;
  totalMs: number;
  dnsMs: number;
  connectMs: number;
  sslMs: number;
  ttfbMs: number;
  downloadMs: number;
  respBytes: number;
  headers: Record<string, string>;
  body: string;
  rootCause: string;
  timestamp: number;
}

export interface EnvEndpoint {
  id: string;
  name: string;
  env: 'DEV' | 'SIT' | 'UAT' | 'PROD';
  url: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'CHECKING';
  latencyMs: number;
  tlsDaysRemaining?: number;
  lastChecked?: number;
}

export interface InfrastructureDevice {
  id: string;
  name: string;
  host: string;
  role: string;
  status: 'ONLINE' | 'OFFLINE';
  latencyMs: number;
}

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
