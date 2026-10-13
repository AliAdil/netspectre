import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useNetworkStore } from '../store/networkStore';
import { ConnectionRecord, ApplicationRecord } from '../types/network';
import { formatBytes, formatRate, getProcessColor, getCountryFlag } from '../utils/formatters';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Globe,
  Radio,
  Cpu,
  Server,
  Layers,
} from 'lucide-react';

interface ColumnNode {
  id: string;
  column: 1 | 2 | 3 | 4 | 5; // 1: PC, 2: App, 3: Protocol, 4: Destination, 5: Service/ASN
  label: string;
  sublabel: string;
  badge?: string;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  size: number;
  activity: number;
  connCount: number;
  bytesIn: number;
  bytesOut: number;
  recvRate: number;
  sendRate: number;
  meta: any;
}

interface FlowLink {
  id: string;
  source: ColumnNode;
  target: ColumnNode;
  protocol: string;
  color: THREE.Color;
  active: boolean;
  sendRate: number;
  recvRate: number;
  curve: THREE.CubicBezierCurve3;
  conn?: ConnectionRecord;
}

interface FlowParticle {
  linkIndex: number;
  t: number;
  speed: number;
  direction: 'in' | 'out'; // 'in' = right-to-left (incoming), 'out' = left-to-right (outgoing)
  color: THREE.Color;
}

function disposeHierarchy(obj: THREE.Object3D) {
  obj.children.forEach((child) => disposeHierarchy(child));
  if ((obj as any).geometry) (obj as any).geometry.dispose();
  if ((obj as any).material) {
    if (Array.isArray((obj as any).material)) {
      (obj as any).material.forEach((m: any) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    } else {
      if ((obj as any).material.map) (obj as any).material.map.dispose();
      (obj as any).material.dispose();
    }
  }
}

function createNodeLabelSprite(
  title: string,
  subtitle: string,
  badge: string,
  colorHex: string
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 110;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 440, 110);

    // Pill background
    ctx.fillStyle = 'rgba(8, 14, 28, 0.88)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2.5;

    const r = 16;
    ctx.beginPath();
    ctx.roundRect(6, 6, 428, 98, r);
    ctx.fill();
    ctx.stroke();

    // Accent line
    ctx.fillStyle = colorHex;
    ctx.fillRect(18, 6, 40, 4);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px "JetBrains Mono", Consolas, monospace';
    ctx.fillText(title.slice(0, 22), 20, 48);

    // Badge
    if (badge) {
      ctx.fillStyle = colorHex;
      ctx.font = 'bold 18px "JetBrains Mono", Consolas, monospace';
      const badgeW = ctx.measureText(badge).width;
      ctx.fillText(badge, 415 - badgeW, 46);
    }

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px "JetBrains Mono", Consolas, monospace';
    ctx.fillText(subtitle.slice(0, 28), 20, 84);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(52, 13, 1);
  return sprite;
}

export const NetworkUniverse: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    connections,
    applications,
    totalDownloadBps,
    totalUploadBps,
    primaryAdapter,
    selectedNodeId,
    searchQuery,
    filterProtocol,
    filterTraffic,
    setSelectedConnection,
    setSelectedApplication,
    setSelectedNodeId,
    enableParticles,
    nodeSizingMode,
    hideInactive,
  } = useNetworkStore();

  const [hoveredNode, setHoveredNode] = useState<ColumnNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera & interaction state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const graphGroupRef = useRef<THREE.Group | null>(null);
  const linksGroupRef = useRef<THREE.Group | null>(null);
  const nodesGroupRef = useRef<THREE.Group | null>(null);
  const particleGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const ringsRef = useRef<{ mesh: THREE.Mesh; baseScale: number }[]>([]);

  const nodesRef = useRef<ColumnNode[]>([]);
  const linksRef = useRef<FlowLink[]>([]);
  const particlesRef = useRef<FlowParticle[]>([]);

  // 2.5D Pan and Zoom controls
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1.0);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  // 1. Setup Three.js Orthographic Scene Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070a13');
    sceneRef.current = scene;

    // Crisp Orthographic Camera (frustum size 650)
    const aspect = width / height;
    const frustumSize = 650;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      1,
      2000
    );
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Master Graph Hierarchy
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);
    graphGroupRef.current = graphGroup;

    const linksGroup = new THREE.Group();
    graphGroup.add(linksGroup);
    linksGroupRef.current = linksGroup;

    const nodesGroup = new THREE.Group();
    graphGroup.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    // Directional Particle System
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(2000 * 3);
    const particleColors = new Float32Array(2000 * 3);
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeoRef.current = particleGeo;

    const particleMat = new THREE.PointsMaterial({
      size: 5.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    graphGroup.add(particleSystem);

    let lastTime = performance.now();

    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Update Pan and Zoom
      graphGroup.position.x = panRef.current.x;
      graphGroup.position.y = panRef.current.y;
      graphGroup.scale.set(zoomRef.current, zoomRef.current, 1);

      // Pulse Outer Glow Rings
      ringsRef.current.forEach((r, idx) => {
        const pulse = 1 + 0.12 * Math.sin(time * 0.004 + idx * 0.4);
        r.mesh.scale.set(pulse, pulse, 1);
      });

      // Animate Particles along Bezier Paths
      const particles = particlesRef.current;
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = particleGeo.getAttribute('color') as THREE.BufferAttribute;

      if (posAttr && colAttr) {
        particles.forEach((p, idx) => {
          const link = linksRef.current[p.linkIndex];
          if (!link) return;

          p.t += p.speed;
          if (p.t > 1) p.t = 0;

          // Outgoing: t flows 0 -> 1 (Left to Right)
          // Incoming: t flows 1 -> 0 (Right to Left)
          const evalT = p.direction === 'out' ? p.t : 1 - p.t;
          const pt = link.curve.getPoint(evalT);

          posAttr.setXYZ(idx, pt.x, pt.y, 1);
          colAttr.setXYZ(idx, p.color.r, p.color.g, p.color.b);
        });

        for (let i = particles.length; i < 600; i++) {
          posAttr.setXYZ(i, 99999, 99999, 0);
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const a = w / h;
      camera.left = (-frustumSize * a) / 2;
      camera.right = (frustumSize * a) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // 2. Build Multi-Column 2.5D Graph Model & Sync 3D Meshes
  useEffect(() => {
    const nodes: ColumnNode[] = [];
    const links: FlowLink[] = [];
    const nodeMap = new Map<string, ColumnNode>();

    // Filter connections based on store controls
    const filteredConns = connections.filter((conn) => {
      if (filterProtocol !== 'ALL' && conn.protocol !== filterProtocol) return false;
      if (filterTraffic === 'ACTIVE' && conn.state !== 'ESTABLISHED') return false;
      if (filterTraffic === 'PRIVATE' && !conn.isPrivate) return false;
      if (filterTraffic === 'PUBLIC' && conn.isPrivate) return false;
      if (filterTraffic === 'SUSPICIOUS' && !conn.isSuspicious) return false;
      if (hideInactive && conn.state !== 'ESTABLISHED' && conn.protocol !== 'UDP') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          conn.processName.toLowerCase().includes(q) ||
          conn.remoteAddress.toLowerCase().includes(q) ||
          conn.domain.toLowerCase().includes(q) ||
          conn.organization.toLowerCase().includes(q) ||
          conn.localPort.toString().includes(q) ||
          conn.remotePort.toString().includes(q);
        if (!match) return false;
      }
      return true;
    });

    // ==========================================
    // COLUMN 1: LOCAL SYSTEM / WINDOWS PC (X = -380)
    // ==========================================
    const localIp = filteredConns[0]?.localAddress || '192.168.1.112';
    const coreNode: ColumnNode = {
      id: 'core_pc',
      column: 1,
      label: 'LOCAL SYSTEM [MY PC]',
      sublabel: `${localIp} • Windows 11`,
      badge: 'HOST CORE',
      x: -380,
      y: 0,
      z: 0,
      color: new THREE.Color('#00f3ff'),
      size: 16,
      activity: totalDownloadBps + totalUploadBps > 1000 ? 1 : 0.4,
      connCount: filteredConns.length,
      bytesIn: filteredConns.reduce((sum, c) => sum + c.bytesReceived, 0),
      bytesOut: filteredConns.reduce((sum, c) => sum + c.bytesSent, 0),
      recvRate: totalDownloadBps,
      sendRate: totalUploadBps,
      meta: { type: 'core', adapter: primaryAdapter, ip: localIp },
    };
    nodes.push(coreNode);
    nodeMap.set(coreNode.id, coreNode);

    // ==========================================
    // COLUMN 2: APPLICATIONS & PROCESSES (X = -190)
    // ==========================================
    const appMap = new Map<string, { app: ApplicationRecord; conns: ConnectionRecord[] }>();
    filteredConns.forEach((conn) => {
      const proc = conn.processName || 'System';
      if (!appMap.has(proc)) {
        const found = applications.find((a) => a.processName === proc) || {
          pid: conn.pid,
          processName: proc,
          executablePath: conn.executablePath,
          activeConnections: 1,
          totalBytesSent: conn.bytesSent,
          totalBytesReceived: conn.bytesReceived,
          currentSendRate: conn.sendRateBps,
          currentRecvRate: conn.recvRateBps,
          countries: [conn.countryCode],
          domains: conn.domain ? [conn.domain] : [],
        };
        appMap.set(proc, { app: found, conns: [] });
      }
      appMap.get(proc)!.conns.push(conn);
    });

    const appEntries = Array.from(appMap.values())
      .sort((a, b) => (b.app.totalBytesReceived + b.app.totalBytesSent) - (a.app.totalBytesReceived + a.app.totalBytesSent))
      .slice(0, 16);
    const totalApps = Math.max(1, appEntries.length);
    const appSpacing = Math.min(48, Math.max(28, 480 / totalApps));

    appEntries.forEach((entry, idx) => {
      const { app, conns } = entry;
      const appId = `app_${app.processName}`;
      const y = (idx - (totalApps - 1) / 2) * appSpacing;
      const colorHex = getProcessColor(app.processName);

      let nodeSize = 10;
      if (nodeSizingMode === 'bandwidth') {
        const totalB = app.totalBytesReceived + app.totalBytesSent;
        nodeSize = Math.min(18, 8 + Math.log10(Math.max(10, totalB)) * 1.5);
      } else if (nodeSizingMode === 'flows') {
        nodeSize = Math.min(18, 8 + Math.log2(conns.length + 1) * 2);
      }

      const appNode: ColumnNode = {
        id: appId,
        column: 2,
        label: app.processName,
        sublabel: `PID ${app.pid} • ${conns.length} sockets`,
        badge: `${formatRate(app.currentRecvRate + app.currentSendRate)}`,
        x: -190,
        y,
        z: 0,
        color: new THREE.Color(colorHex),
        size: nodeSize,
        activity: app.currentRecvRate + app.currentSendRate > 0 ? 1 : 0.3,
        connCount: conns.length,
        bytesIn: app.totalBytesReceived,
        bytesOut: app.totalBytesSent,
        recvRate: app.currentRecvRate,
        sendRate: app.currentSendRate,
        meta: app,
      };
      nodes.push(appNode);
      nodeMap.set(appId, appNode);

      // Link Core -> Application
      const c1X = (coreNode.x + appNode.x) / 2;
      const c1Y = coreNode.y;
      const c2X = (coreNode.x + appNode.x) / 2;
      const c2Y = appNode.y;
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(coreNode.x, coreNode.y, 0),
        new THREE.Vector3(c1X, c1Y, 0),
        new THREE.Vector3(c2X, c2Y, 0),
        new THREE.Vector3(appNode.x, appNode.y, 0)
      );

      links.push({
        id: `link_core_${appId}`,
        source: coreNode,
        target: appNode,
        protocol: 'IPC',
        color: new THREE.Color('#38bdf8'),
        active: appNode.activity > 0.5,
        sendRate: app.currentSendRate,
        recvRate: app.currentRecvRate,
        curve,
      });
    });

    // ==========================================
    // COLUMN 3: CONNECTIONS & PROTOCOL HUBS (X = 0)
    // ==========================================
    const protoGroups = new Map<string, ConnectionRecord[]>();
    filteredConns.forEach((c) => {
      let key = `${c.protocol} / ${c.remotePort || c.localPort}`;
      if (c.remotePort === 443) key = c.protocol === 'UDP' ? 'QUIC / 443' : 'TCP / 443 (HTTPS)';
      else if (c.remotePort === 80) key = 'TCP / 80 (HTTP)';
      else if (c.remotePort === 53 || c.localPort === 53) key = 'UDP / 53 (DNS)';
      else if (c.remotePort === 5353 || c.localPort === 5353) key = 'UDP / 5353 (mDNS)';
      else if (c.isPrivate) key = `${c.protocol} / Private`;

      if (!protoGroups.has(key)) protoGroups.set(key, []);
      protoGroups.get(key)!.push(c);
    });

    const protoEntries = Array.from(protoGroups.entries());
    const totalProtos = Math.max(1, protoEntries.length);
    const protoSpacing = Math.min(52, Math.max(30, 420 / totalProtos));

    protoEntries.forEach(([protoKey, pConns], idx) => {
      const protoId = `proto_${protoKey}`;
      const y = (idx - (totalProtos - 1) / 2) * protoSpacing;
      const totalIn = pConns.reduce((s, c) => s + c.bytesReceived, 0);
      const totalOut = pConns.reduce((s, c) => s + c.bytesSent, 0);
      const rateIn = pConns.reduce((s, c) => s + c.recvRateBps, 0);
      const rateOut = pConns.reduce((s, c) => s + c.sendRateBps, 0);

      const protoNode: ColumnNode = {
        id: protoId,
        column: 3,
        label: protoKey,
        sublabel: `${pConns.length} active sockets`,
        badge: `${formatBytes(totalIn + totalOut)}`,
        x: 0,
        y,
        z: 0,
        color: new THREE.Color(protoKey.includes('TCP') ? '#00f3ff' : '#818cf8'),
        size: 9,
        activity: rateIn + rateOut > 0 ? 1 : 0.3,
        connCount: pConns.length,
        bytesIn: totalIn,
        bytesOut: totalOut,
        recvRate: rateIn,
        sendRate: rateOut,
        meta: { protoKey, conns: pConns },
      };
      nodes.push(protoNode);
      nodeMap.set(protoId, protoNode);

      // Connect Applications that use this protocol
      const usedApps = new Set(pConns.map((c) => c.processName));
      usedApps.forEach((appName) => {
        const appNode = nodeMap.get(`app_${appName}`);
        if (!appNode) return;

        const c1X = (appNode.x + protoNode.x) / 2;
        const c1Y = appNode.y;
        const c2X = (appNode.x + protoNode.x) / 2;
        const c2Y = protoNode.y;
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(appNode.x, appNode.y, 0),
          new THREE.Vector3(c1X, c1Y, 0),
          new THREE.Vector3(c2X, c2Y, 0),
          new THREE.Vector3(protoNode.x, protoNode.y, 0)
        );

        links.push({
          id: `link_${appNode.id}_${protoId}`,
          source: appNode,
          target: protoNode,
          protocol: protoKey,
          color: new THREE.Color('#38bdf8'),
          active: protoNode.activity > 0.5,
          sendRate: protoNode.sendRate,
          recvRate: protoNode.recvRate,
          curve,
          conn: pConns[0],
        });
      });
    });

    // ==========================================
    // COLUMN 4: REMOTE DESTINATIONS (X = 190)
    // ==========================================
    const destGroupMap = new Map<string, ConnectionRecord[]>();
    filteredConns.forEach((c) => {
      const key = c.isPrivate
        ? `local_${c.localPort}`
        : `${c.remoteAddress}:${c.remotePort}`;
      if (!destGroupMap.has(key)) destGroupMap.set(key, []);
      destGroupMap.get(key)!.push(c);
    });

    const destEntries = Array.from(destGroupMap.entries())
      .sort((a, b) => {
        const aBytes = a[1].reduce((sum, c) => sum + c.bytesReceived + c.bytesSent, 0);
        const bBytes = b[1].reduce((sum, c) => sum + c.bytesReceived + c.bytesSent, 0);
        return bBytes - aBytes;
      })
      .slice(0, 20);
    const totalDests = Math.max(1, destEntries.length);
    const destSpacing = Math.min(36, Math.max(22, 500 / totalDests));

    destEntries.forEach(([destKey, dConns], idx) => {
      const rep = dConns[0];
      const destId = `dest_${destKey}`;
      const y = (idx - (totalDests - 1) / 2) * destSpacing;
      const totalIn = dConns.reduce((s, c) => s + c.bytesReceived, 0);
      const totalOut = dConns.reduce((s, c) => s + c.bytesSent, 0);
      const rateIn = dConns.reduce((s, c) => s + c.recvRateBps, 0);
      const rateOut = dConns.reduce((s, c) => s + c.sendRateBps, 0);

      const destLabel = rep.domain || rep.remoteAddress;
      const flag = getCountryFlag(rep.countryCode);

      let color = new THREE.Color('#38bdf8');
      if (rep.isSuspicious) color = new THREE.Color('#ef4444');
      else if (rep.isPrivate) color = new THREE.Color('#64748b');
      else if (rep.organization.includes('Cloudflare')) color = new THREE.Color('#f97316');
      else if (rep.organization.includes('Google')) color = new THREE.Color('#10b981');
      else if (rep.organization.includes('Microsoft')) color = new THREE.Color('#06b6d4');
      else if (rep.organization.includes('Amazon')) color = new THREE.Color('#eab308');

      const destNode: ColumnNode = {
        id: destId,
        column: 4,
        label: `${flag} ${destLabel}`,
        sublabel: `${rep.remoteAddress}:${rep.remotePort}`,
        badge: rep.countryCode,
        x: 190,
        y,
        z: 0,
        color,
        size: rep.isSuspicious ? 10 : 7,
        activity: rateIn + rateOut > 0 ? 1 : 0.2,
        connCount: dConns.length,
        bytesIn: totalIn,
        bytesOut: totalOut,
        recvRate: rateIn,
        sendRate: rateOut,
        meta: rep,
      };
      nodes.push(destNode);
      nodeMap.set(destId, destNode);

      // Link from appropriate Protocol Hub in Col 3
      let protoKey = `${rep.protocol} / ${rep.remotePort || rep.localPort}`;
      if (rep.remotePort === 443) protoKey = rep.protocol === 'UDP' ? 'QUIC / 443' : 'TCP / 443 (HTTPS)';
      else if (rep.remotePort === 80) protoKey = 'TCP / 80 (HTTP)';
      else if (rep.remotePort === 53 || rep.localPort === 53) protoKey = 'UDP / 53 (DNS)';
      else if (rep.remotePort === 5353 || rep.localPort === 5353) protoKey = 'UDP / 5353 (mDNS)';
      else if (rep.isPrivate) protoKey = `${rep.protocol} / Private`;

      const protoNode = nodeMap.get(`proto_${protoKey}`) || nodeMap.get('proto_TCP / 443 (HTTPS)');
      if (protoNode) {
        const c1X = (protoNode.x + destNode.x) / 2;
        const c1Y = protoNode.y;
        const c2X = (protoNode.x + destNode.x) / 2;
        const c2Y = destNode.y;
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(protoNode.x, protoNode.y, 0),
          new THREE.Vector3(c1X, c1Y, 0),
          new THREE.Vector3(c2X, c2Y, 0),
          new THREE.Vector3(destNode.x, destNode.y, 0)
        );

        links.push({
          id: `link_${protoNode.id}_${destId}`,
          source: protoNode,
          target: destNode,
          protocol: rep.protocol,
          color: rep.isSuspicious ? new THREE.Color('#ef4444') : destNode.color,
          active: rep.state === 'ESTABLISHED' || rep.protocol === 'UDP',
          sendRate: rateOut,
          recvRate: rateIn,
          curve,
          conn: rep,
        });
      }
    });

    // ==========================================
    // COLUMN 5: SERVICE GROUPS & ASNs (X = 380)
    // ==========================================
    const asnMap = new Map<string, ConnectionRecord[]>();
    filteredConns.forEach((c) => {
      const key = c.isPrivate ? 'RFC1918 Private' : c.organization || c.asn || 'Public Transit';
      if (!asnMap.has(key)) asnMap.set(key, []);
      asnMap.get(key)!.push(c);
    });

    const asnEntries = Array.from(asnMap.entries()).slice(0, 8); // Top 8 clusters
    const totalAsns = Math.max(1, asnEntries.length);
    const asnSpacing = Math.min(54, Math.max(34, 440 / totalAsns));

    asnEntries.forEach(([asnName, aConns], idx) => {
      const asnId = `asn_${asnName}`;
      const y = (idx - (totalAsns - 1) / 2) * asnSpacing;
      const rep = aConns[0];
      const totalIn = aConns.reduce((s, c) => s + c.bytesReceived, 0);
      const totalOut = aConns.reduce((s, c) => s + c.bytesSent, 0);

      const asnNode: ColumnNode = {
        id: asnId,
        column: 5,
        label: asnName,
        sublabel: rep.asn || 'AS-TRANSIT',
        badge: 'CLOUD / ASN',
        x: 380,
        y,
        z: 0,
        color: new THREE.Color('#a855f7'),
        size: 11,
        activity: 0.5,
        connCount: aConns.length,
        bytesIn: totalIn,
        bytesOut: totalOut,
        recvRate: 0,
        sendRate: 0,
        meta: { asnName, conns: aConns },
      };
      nodes.push(asnNode);
      nodeMap.set(asnId, asnNode);

      // Link destinations to their ASN
      aConns.forEach((conn) => {
        const destKey = conn.isPrivate
          ? `local_${conn.localPort}`
          : `${conn.remoteAddress}:${conn.remotePort}`;
        const destNode = nodeMap.get(`dest_${destKey}`);
        if (!destNode) return;

        const c1X = (destNode.x + asnNode.x) / 2;
        const c1Y = destNode.y;
        const c2X = (destNode.x + asnNode.x) / 2;
        const c2Y = asnNode.y;
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(destNode.x, destNode.y, 0),
          new THREE.Vector3(c1X, c1Y, 0),
          new THREE.Vector3(c2X, c2Y, 0),
          new THREE.Vector3(asnNode.x, asnNode.y, 0)
        );

        links.push({
          id: `link_${destNode.id}_${asnId}`,
          source: destNode,
          target: asnNode,
          protocol: 'ROUTING',
          color: new THREE.Color('#818cf8'),
          active: true,
          sendRate: 0,
          recvRate: 0,
          curve,
          conn,
        });
      });
    });

    nodesRef.current = nodes;
    linksRef.current = links;

    // Generate directional flow particles
    if (enableParticles) {
      const particles: FlowParticle[] = [];
      links.forEach((link, lIdx) => {
        if (!link.active && link.sendRate === 0 && link.recvRate === 0) return;

        const pCount = link.sendRate > 0 || link.recvRate > 0 ? 3 : 1;
        for (let i = 0; i < pCount; i++) {
          const isOutgoing = link.sendRate >= link.recvRate;
          particles.push({
            linkIndex: lIdx,
            t: (i / pCount) + Math.random() * 0.25,
            speed: 0.005 + Math.min(0.025, (link.sendRate + link.recvRate) / 180000),
            direction: isOutgoing ? 'out' : 'in',
            color: isOutgoing ? new THREE.Color('#ff8c00') : new THREE.Color('#00f3ff'),
          });
        }
      });
      particlesRef.current = particles;
    } else {
      particlesRef.current = [];
    }

    // ==========================================
    // REBUILD THREE.JS SCENE GRAPH (LINKS & NODES)
    // ==========================================
    if (linksGroupRef.current) {
      while (linksGroupRef.current.children.length > 0) {
        const obj = linksGroupRef.current.children.pop();
        if (obj) disposeHierarchy(obj);
      }

      links.forEach((link) => {
        const points = link.curve.getPoints(24);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

        let opacity = 0.25;
        let colorHex = link.color.getHex();

        if (link.active) opacity = 0.55;
        if (
          selectedNodeId &&
          (link.source.id === selectedNodeId || link.target.id === selectedNodeId)
        ) {
          opacity = 1.0;
          colorHex = 0xffffff;
        }

        const lineMat = new THREE.LineBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          linewidth: 1.5,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        linksGroupRef.current!.add(line);
      });
    }

    if (nodesGroupRef.current) {
      while (nodesGroupRef.current.children.length > 0) {
        const obj = nodesGroupRef.current.children.pop();
        if (obj) disposeHierarchy(obj);
      }
      ringsRef.current = [];

      nodes.forEach((node) => {
        const nodeContainer = new THREE.Group();
        nodeContainer.position.set(node.x, node.y, 0);

        // 1. Glowing Solid Disc
        const discGeo = new THREE.CircleGeometry(node.size, 32);
        const discMat = new THREE.MeshBasicMaterial({
          color: node.color,
          transparent: true,
          opacity: 0.9,
        });
        const discMesh = new THREE.Mesh(discGeo, discMat);
        nodeContainer.add(discMesh);

        // 2. High-Tech White Inner Dot
        const coreGeo = new THREE.CircleGeometry(node.size * 0.35, 16);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.z = 0.5;
        nodeContainer.add(coreMesh);

        // 3. Pulsing Halo Ring
        const ringGeo = new THREE.RingGeometry(node.size + 2.5, node.size + 4.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: node.color,
          transparent: true,
          opacity: node.activity > 0.5 ? 0.75 : 0.4,
          side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.z = 0.2;
        nodeContainer.add(ringMesh);
        ringsRef.current.push({ mesh: ringMesh, baseScale: 1.0 });

        // 4. Crisp Label Sprite
        const sprite = createNodeLabelSprite(
          node.label,
          node.sublabel,
          node.badge || '',
          '#' + node.color.getHexString()
        );

        if (node.column === 1) {
          sprite.position.set(0, -28, 1);
        } else {
          sprite.position.set(38, 0, 1);
        }
        nodeContainer.add(sprite);

        nodesGroupRef.current!.add(nodeContainer);
      });
    }
  }, [
    connections,
    applications,
    totalDownloadBps,
    totalUploadBps,
    primaryAdapter,
    selectedNodeId,
    searchQuery,
    filterProtocol,
    filterTraffic,
    hideInactive,
    nodeSizingMode,
    enableParticles,
  ]);

  // 3. Mouse Pan, Zoom and Node Click Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      panRef.current.x += dx * 0.9;
      panRef.current.y -= dy * 0.9;
    } else {
      // 2.5D World Raycast for Hover
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Project Screen pixels to 2.5D World Coordinates
      const w = rect.width;
      const h = rect.height;
      const frustumW = 650 * (w / h);
      const frustumH = 650;

      const worldX = ((mouseX / w) * frustumW - frustumW / 2 - panRef.current.x) / zoomRef.current;
      const worldY = (-(mouseY / h) * frustumH + frustumH / 2 - panRef.current.y) / zoomRef.current;

      let found: ColumnNode | null = null;
      for (const node of nodesRef.current) {
        const dist = Math.hypot(node.x - worldX, node.y - worldY);
        if (dist < node.size + 14) {
          found = node;
          break;
        }
      }

      setHoveredNode(found);
      setHoverPos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomRef.current = Math.max(0.35, Math.min(2.5, zoomRef.current * factor));
  };

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedNodeId(hoveredNode.id);
      if (hoveredNode.column === 2) {
        setSelectedApplication(hoveredNode.meta);
      } else if (hoveredNode.column === 4 && hoveredNode.meta) {
        setSelectedConnection(hoveredNode.meta);
      }
    } else {
      setSelectedNodeId(null);
    }
  };

  const resetView = () => {
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1.0;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#070a13] select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Top Column Labels Bar (Clear Information Architecture) */}
      <div className="absolute top-20 inset-x-8 flex items-center justify-between pointer-events-none z-10 px-4 py-2 rounded-xl bg-[#090f20]/85 backdrop-blur-md border border-cyan-500/20 shadow-xl">
        <div className="flex items-center space-x-2 w-1/5">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
            1. LOCAL SYSTEM
          </span>
        </div>

        <div className="flex items-center space-x-2 w-1/5 justify-center">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-purple-300 uppercase">
            2. APPLICATIONS ({applications.length})
          </span>
        </div>

        <div className="flex items-center space-x-2 w-1/5 justify-center">
          <Radio className="w-4 h-4 text-sky-400" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-sky-300 uppercase">
            3. PROTOCOLS & HUBS
          </span>
        </div>

        <div className="flex items-center space-x-2 w-1/5 justify-center">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-300 uppercase">
            4. DESTINATIONS
          </span>
        </div>

        <div className="flex items-center space-x-2 w-1/5 justify-end">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-amber-300 uppercase">
            5. SERVICE GROUPS / ASN
          </span>
        </div>
      </div>

      {/* Flow Legend Pill */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-3 pointer-events-auto bg-[#0a0f1d]/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-cyan-500/20 text-xs font-mono shadow-lg">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f3ff]"></span>
          <span className="text-cyan-300 font-semibold">CYAN: INCOMING DATA</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#ff8c00]"></span>
          <span className="text-amber-300 font-semibold">AMBER: OUTGOING DATA</span>
        </div>
      </div>

      {/* Camera View Controls */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-2 pointer-events-auto z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoomRef.current = Math.min(2.5, zoomRef.current * 1.2);
          }}
          className="p-2 rounded-lg bg-[#0a0f1d]/90 border border-cyan-500/20 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            zoomRef.current = Math.max(0.35, zoomRef.current * 0.8);
          }}
          className="p-2 rounded-lg bg-[#0a0f1d]/90 border border-cyan-500/20 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          className="px-3 py-2 rounded-lg bg-[#0a0f1d]/90 border border-cyan-500/20 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 text-xs font-mono flex items-center space-x-1.5 transition"
          title="Reset Graph Canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET VIEW</span>
        </button>
      </div>

      {/* Floating Hover Context Card */}
      {hoveredNode && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0c1328]/95 border border-cyan-500/50 shadow-2xl shadow-cyan-950/80 backdrop-blur-xl text-xs space-y-1.5 min-w-[200px]">
            <div className="flex items-center justify-between space-x-2">
              <span className="font-bold text-slate-100 font-mono tracking-tight text-sm">
                {hoveredNode.label}
              </span>
              {hoveredNode.badge && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                  {hoveredNode.badge}
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">{hoveredNode.sublabel}</div>

            <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-slate-700/60">
              <span className="text-emerald-400">↓ {formatBytes(hoveredNode.bytesIn)}</span>
              <span className="text-amber-400">↑ {formatBytes(hoveredNode.bytesOut)}</span>
            </div>

            {hoveredNode.recvRate + hoveredNode.sendRate > 0 && (
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Speed:</span>
                <span className="text-cyan-300">
                  {formatRate(hoveredNode.recvRate + hoveredNode.sendRate)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
