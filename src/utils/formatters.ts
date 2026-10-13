export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  if (i < 0) return '0 B';
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i] || 'B'}`;
}

export function formatRate(bps: number): string {
  if (bps <= 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(Math.abs(bps)) / Math.log(k));
  if (i < 0) return '0 B/s';
  const val = (bps / Math.pow(k, i)).toFixed(1);
  return `${val} ${sizes[i] || 'B/s'}`;
}

export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}m ${remSec}s`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const millis = String(date.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${millis}`;
}

export function getCountryFlag(code: string): string {
  if (!code || code === 'LOC' || code === 'GLO') return '🌐';
  if (code === 'US') return '🇺🇸';
  if (code === 'DE') return '🇩🇪';
  if (code === 'GB') return '🇬🇧';
  if (code === 'FR') return '🇫🇷';
  if (code === 'JP') return '🇯🇵';
  if (code === 'SG') return '🇸🇬';
  if (code === 'CA') return '🇨🇦';
  if (code === 'AU') return '🇦🇺';
  if (code === 'NL') return '🇳🇱';
  if (code === 'IE') return '🇮🇪';
  if (code === 'IN') return '🇮🇳';
  return '🌍';
}

export function getProcessColor(processName: string): string {
  const p = processName.toLowerCase();
  if (p.includes('chrome')) return '#00f3ff';
  if (p.includes('edge') || p.includes('msedge')) return '#00a4ef';
  if (p.includes('firefox')) return '#ff7139';
  if (p.includes('code')) return '#3b82f6';
  if (p.includes('discord')) return '#5865f2';
  if (p.includes('spotify')) return '#1db954';
  if (p.includes('steam')) return '#171a21';
  if (p.includes('unity')) return '#e2e8f0';
  if (p.includes('teams')) return '#6264a7';
  if (p.includes('system') || p.includes('svchost')) return '#94a3b8';
  return '#a855f7';
}
