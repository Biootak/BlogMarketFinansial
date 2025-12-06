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
  try {
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
  } catch (error) {
    console.error('Error getting system metrics:', error);
    throw error;
  }
}

export async function checkDiskSpace(drive: string): Promise<DiskSpace | null> {
  try {
    // For Windows
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(
        `wmic logicaldisk where "DeviceID='${drive}:'" get size,freespace /format:value`,
      );

      const lines = stdout.trim().split('\n');
      const values: { [key: string]: string } = {};

      lines.forEach((line) => {
        const [key, value] = line.trim().split('=');
        if (key && value) {
          values[key.trim()] = value.trim();
        }
      });

      if (values.Size && values.FreeSpace) {
        return {
          size: Number.parseInt(values.Size, 10),
          free: Number.parseInt(values.FreeSpace, 10),
        };
      }
    }

    // For Unix-like systems (Linux, macOS)
    else {
      const { stdout } = await execAsync(`df -k ${drive}`);
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const [, size, , free] = lines[1].split(/\s+/);
        return {
          size: Number.parseInt(size, 10) * 1024, // Convert KB to bytes
          free: Number.parseInt(free, 10) * 1024,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking disk space:', error);
    return null;
  }
}
