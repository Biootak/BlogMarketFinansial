import { exec } from 'node:child_process';
import * as os from 'node:os';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface DiskSpace {
  size: number;
  free: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    count: number;
    model: string;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
  disk?: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
  os: {
    platform: string;
    release: string;
    uptime: number;
  };
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const cpus = os.cpus();
  const cpuUsage = (os.loadavg()[0] * 100) / cpus.length;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const metrics: SystemMetrics = {
    cpu: {
      usage: Math.round(cpuUsage * 100) / 100,
      count: cpus.length,
      model: cpus[0].model,
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercentage: Math.round((usedMem / totalMem) * 100),
    },
    os: {
      platform: process.platform,
      release: os.release(),
      uptime: os.uptime(),
    },
  };

  return metrics;
}

export async function checkDiskSpace(drive: string): Promise<DiskSpace | null> {
  try {
    // For Windows: only a single ASCII drive letter is allowed (injection guard).
    if (process.platform === 'win32') {
      if (!/^[a-zA-Z]$/.test(drive)) {
        return null;
      }
      const { stdout } = await execAsync(
        `wmic logicaldisk where "DeviceID='${drive}:'" get size,freespace /format:value`,
      );

      const lines = stdout.trim().split('\n');
      const values: { [key: string]: string } = {};

      for (const line of lines) {
        const [key, value] = line.trim().split('=');
        if (key && value) {
          values[key.trim()] = value.trim();
        }
      }

      if (values.Size && values.FreeSpace) {
        return {
          size: Number.parseInt(values.Size, 10),
          free: Number.parseInt(values.FreeSpace, 10),
        };
      }
      return null;
    }

    // For Unix-like systems (Linux, macOS): drive is a full path like /app or cwd.
    // Sanitize: allow only safe filesystem path characters, no shell metacharacters.
    const safePath = drive.replace(/[^a-zA-Z0-9/._-]/g, '');
    if (!safePath || safePath.length === 0) return null;

    const { stdout } = await execAsync(`df -k "${safePath}"`);
    const lines = stdout.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      // df -k output: Filesystem 1K-blocks Used Available Use% Mounted
      const size = Number.parseInt(parts[1] ?? '0', 10);
      const free = Number.parseInt(parts[3] ?? '0', 10);
      if (Number.isFinite(size) && Number.isFinite(free) && size > 0) {
        return {
          size: size * 1024, // Convert KB to bytes
          free: free * 1024,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
