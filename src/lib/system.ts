import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

interface DiskSpace {
  size: number;
  free: number;
}

// Cache for system metrics
let metricsCache: {
  timestamp: number;
  metrics: any;
} | null = null;

const CACHE_DURATION = 5000; // 5 seconds cache

export async function getSystemMetrics() {
  try {
    // Return cached metrics if still valid
    if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_DURATION) {
      return metricsCache.metrics;
    }

    const cpus = os.cpus();
    const cpuUsage = os.loadavg()[0] * 100 / cpus.length;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const metrics = {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        cores: cpus.length,
        model: cpus[0].model,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercentage: Math.round((usedMem / totalMem) * 100)
      },
      os: {
        platform: process.platform,
        version: os.release(),
        uptime: os.uptime()
      }
    };

    // Update cache
    metricsCache = {
      timestamp: Date.now(),
      metrics
    };

    return metrics;
  } catch (error) {
    console.error('Error getting system metrics:', error);
    throw new Error('Failed to get system metrics');
  }
}

export async function checkDiskSpace(drive: string): Promise<DiskSpace | null> {
  try {
    // For Windows
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`wmic logicaldisk where "DeviceID='${drive}:'" get size,freespace /format:value`);
      
      const lines = stdout.trim().split('\n');
      const values: { [key: string]: string } = {};
      
      lines.forEach(line => {
        const [key, value] = line.trim().split('=');
        if (key && value) {
          values[key.trim()] = value.trim();
        }
      });

      if (values.Size && values.FreeSpace) {
        return {
          size: parseInt(values.Size, 10),
          free: parseInt(values.FreeSpace, 10)
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
          size: parseInt(size, 10) * 1024, // Convert KB to bytes
          free: parseInt(free, 10) * 1024
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking disk space:', error);
    return null;
  }
}
