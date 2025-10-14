import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import os from 'os';

// Metrics storage
interface EndpointMetrics {
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  errors: number;
  lastAccessTime: number;
  durations: number[]; // For percentile calculation
}

interface SystemMetrics {
  cpuUsage: number[];
  memoryUsage: number[];
  eventLoopLag: number[];
  activeConnections: number;
  totalRequests: number;
  totalErrors: number;
}

class MetricsCollector {
  private endpointMetrics: Map<string, EndpointMetrics> = new Map();
  private systemMetrics: SystemMetrics = {
    cpuUsage: [],
    memoryUsage: [],
    eventLoopLag: [],
    activeConnections: 0,
    totalRequests: 0,
    totalErrors: 0
  };
  
  private lastCpuUsage = process.cpuUsage();
  private lastEventLoopCheck = performance.now();
  
  constructor() {
    // Start system metrics collection
    this.startSystemMetricsCollection();
  }

  private startSystemMetricsCollection(): void {
    // Collect metrics every 5 seconds
    setInterval(() => {
      this.collectCPUMetrics();
      this.collectMemoryMetrics();
      this.collectEventLoopLag();
    }, 5000);
  }

  private collectCPUMetrics(): void {
    const cpus = os.cpus();
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    // Calculate CPU usage percentage
    const totalUsage = (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // Convert to seconds
    const cpuPercent = (totalUsage / cpus.length) * 100;

    this.systemMetrics.cpuUsage.push(cpuPercent);
    
    // Keep only last 120 samples (10 minutes at 5s intervals)
    if (this.systemMetrics.cpuUsage.length > 120) {
      this.systemMetrics.cpuUsage.shift();
    }
  }

  private collectMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const memPercent = (memUsage.heapUsed / totalMem) * 100;

    this.systemMetrics.memoryUsage.push(memPercent);
    
    // Keep only last 120 samples
    if (this.systemMetrics.memoryUsage.length > 120) {
      this.systemMetrics.memoryUsage.shift();
    }
  }

  private collectEventLoopLag(): void {
    const now = performance.now();
    const lag = now - this.lastEventLoopCheck - 5000; // Expected 5s interval
    this.lastEventLoopCheck = now;

    if (lag > 0) {
      this.systemMetrics.eventLoopLag.push(lag);
      
      // Keep only last 120 samples
      if (this.systemMetrics.eventLoopLag.length > 120) {
        this.systemMetrics.eventLoopLag.shift();
      }
    }
  }

  public recordRequest(endpoint: string, duration: number, statusCode: number): void {
    const key = this.normalizeEndpoint(endpoint);
    
    if (!this.endpointMetrics.has(key)) {
      this.endpointMetrics.set(key, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errors: 0,
        lastAccessTime: Date.now(),
        durations: []
      });
    }

    const metrics = this.endpointMetrics.get(key)!;
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.lastAccessTime = Date.now();
    metrics.durations.push(duration);

    // Keep only last 1000 durations for percentile calculation
    if (metrics.durations.length > 1000) {
      metrics.durations.shift();
    }

    // Calculate percentiles
    this.calculatePercentiles(metrics);

    if (statusCode >= 400) {
      metrics.errors++;
      this.systemMetrics.totalErrors++;
    }

    this.systemMetrics.totalRequests++;
  }

  private calculatePercentiles(metrics: EndpointMetrics): void {
    if (metrics.durations.length === 0) return;

    const sorted = [...metrics.durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    metrics.p95Duration = sorted[p95Index] || sorted[sorted.length - 1];
    metrics.p99Duration = sorted[p99Index] || sorted[sorted.length - 1];
  }

  private normalizeEndpoint(path: string): string {
    // Replace IDs with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[A-Z0-9]{6}/g, '/:code');
  }

  public getPrometheusMetrics(): string {
    let metrics = '';

    // System metrics
    const avgCpu = this.systemMetrics.cpuUsage.length > 0
      ? this.systemMetrics.cpuUsage.reduce((a, b) => a + b, 0) / this.systemMetrics.cpuUsage.length
      : 0;

    const avgMem = this.systemMetrics.memoryUsage.length > 0
      ? this.systemMetrics.memoryUsage.reduce((a, b) => a + b, 0) / this.systemMetrics.memoryUsage.length
      : 0;

    const avgEventLoopLag = this.systemMetrics.eventLoopLag.length > 0
      ? this.systemMetrics.eventLoopLag.reduce((a, b) => a + b, 0) / this.systemMetrics.eventLoopLag.length
      : 0;

    const memUsage = process.memoryUsage();

    metrics += `# HELP nodejs_cpu_usage_percent Average CPU usage percentage\n`;
    metrics += `# TYPE nodejs_cpu_usage_percent gauge\n`;
    metrics += `nodejs_cpu_usage_percent ${avgCpu.toFixed(2)}\n\n`;

    metrics += `# HELP nodejs_memory_usage_percent Average memory usage percentage\n`;
    metrics += `# TYPE nodejs_memory_usage_percent gauge\n`;
    metrics += `nodejs_memory_usage_percent ${avgMem.toFixed(2)}\n\n`;

    metrics += `# HELP nodejs_heap_used_bytes Heap memory used in bytes\n`;
    metrics += `# TYPE nodejs_heap_used_bytes gauge\n`;
    metrics += `nodejs_heap_used_bytes ${memUsage.heapUsed}\n\n`;

    metrics += `# HELP nodejs_heap_total_bytes Total heap memory in bytes\n`;
    metrics += `# TYPE nodejs_heap_total_bytes gauge\n`;
    metrics += `nodejs_heap_total_bytes ${memUsage.heapTotal}\n\n`;

    metrics += `# HELP nodejs_external_memory_bytes External memory in bytes\n`;
    metrics += `# TYPE nodejs_external_memory_bytes gauge\n`;
    metrics += `nodejs_external_memory_bytes ${memUsage.external}\n\n`;

    metrics += `# HELP nodejs_event_loop_lag_ms Average event loop lag in milliseconds\n`;
    metrics += `# TYPE nodejs_event_loop_lag_ms gauge\n`;
    metrics += `nodejs_event_loop_lag_ms ${avgEventLoopLag.toFixed(2)}\n\n`;

    metrics += `# HELP http_requests_total Total number of HTTP requests\n`;
    metrics += `# TYPE http_requests_total counter\n`;
    metrics += `http_requests_total ${this.systemMetrics.totalRequests}\n\n`;

    metrics += `# HELP http_errors_total Total number of HTTP errors\n`;
    metrics += `# TYPE http_errors_total counter\n`;
    metrics += `http_errors_total ${this.systemMetrics.totalErrors}\n\n`;

    // Endpoint-specific metrics
    for (const [endpoint, data] of this.endpointMetrics.entries()) {
      const avgDuration = data.count > 0 ? data.totalDuration / data.count : 0;
      const errorRate = data.count > 0 ? (data.errors / data.count) * 100 : 0;

      metrics += `# HELP http_request_duration_seconds Request duration for ${endpoint}\n`;
      metrics += `# TYPE http_request_duration_seconds summary\n`;
      metrics += `http_request_duration_seconds{endpoint="${endpoint}",quantile="0.5"} ${(avgDuration / 1000).toFixed(6)}\n`;
      metrics += `http_request_duration_seconds{endpoint="${endpoint}",quantile="0.95"} ${(data.p95Duration / 1000).toFixed(6)}\n`;
      metrics += `http_request_duration_seconds{endpoint="${endpoint}",quantile="0.99"} ${(data.p99Duration / 1000).toFixed(6)}\n`;
      metrics += `http_request_duration_seconds_sum{endpoint="${endpoint}"} ${(data.totalDuration / 1000).toFixed(6)}\n`;
      metrics += `http_request_duration_seconds_count{endpoint="${endpoint}"} ${data.count}\n\n`;

      metrics += `# HELP http_requests_count Total requests for ${endpoint}\n`;
      metrics += `# TYPE http_requests_count counter\n`;
      metrics += `http_requests_count{endpoint="${endpoint}"} ${data.count}\n\n`;

      metrics += `# HELP http_request_errors_count Total errors for ${endpoint}\n`;
      metrics += `# TYPE http_request_errors_count counter\n`;
      metrics += `http_request_errors_count{endpoint="${endpoint}"} ${data.errors}\n\n`;

      metrics += `# HELP http_request_error_rate_percent Error rate for ${endpoint}\n`;
      metrics += `# TYPE http_request_error_rate_percent gauge\n`;
      metrics += `http_request_error_rate_percent{endpoint="${endpoint}"} ${errorRate.toFixed(2)}\n\n`;
    }

    // Network metrics
    const networkInterfaces = os.networkInterfaces();
    metrics += `# HELP network_interfaces_count Number of network interfaces\n`;
    metrics += `# TYPE network_interfaces_count gauge\n`;
    metrics += `network_interfaces_count ${Object.keys(networkInterfaces).length}\n\n`;

    return metrics;
  }

  public getBottlenecks(): Array<{ endpoint: string; issue: string; severity: 'high' | 'medium' | 'low'; value: number }> {
    const bottlenecks: Array<{ endpoint: string; issue: string; severity: 'high' | 'medium' | 'low'; value: number }> = [];

    // Check system-level bottlenecks
    const avgCpu = this.systemMetrics.cpuUsage.length > 0
      ? this.systemMetrics.cpuUsage.reduce((a, b) => a + b, 0) / this.systemMetrics.cpuUsage.length
      : 0;

    if (avgCpu > 90) {
      bottlenecks.push({
        endpoint: 'system',
        issue: 'Critical CPU usage',
        severity: 'high',
        value: avgCpu
      });
    } else if (avgCpu > 70) {
      bottlenecks.push({
        endpoint: 'system',
        issue: 'High CPU usage',
        severity: 'medium',
        value: avgCpu
      });
    }

    const avgMem = this.systemMetrics.memoryUsage.length > 0
      ? this.systemMetrics.memoryUsage.reduce((a, b) => a + b, 0) / this.systemMetrics.memoryUsage.length
      : 0;

    if (avgMem > 85) {
      bottlenecks.push({
        endpoint: 'system',
        issue: 'Critical memory usage',
        severity: 'high',
        value: avgMem
      });
    } else if (avgMem > 70) {
      bottlenecks.push({
        endpoint: 'system',
        issue: 'High memory usage',
        severity: 'medium',
        value: avgMem
      });
    }

    const avgEventLoopLag = this.systemMetrics.eventLoopLag.length > 0
      ? this.systemMetrics.eventLoopLag.reduce((a, b) => a + b, 0) / this.systemMetrics.eventLoopLag.length
      : 0;

    if (avgEventLoopLag > 100) {
      bottlenecks.push({
        endpoint: 'system',
        issue: 'Event loop lag',
        severity: 'high',
        value: avgEventLoopLag
      });
    }

    // Check endpoint-level bottlenecks
    for (const [endpoint, data] of this.endpointMetrics.entries()) {
      const avgDuration = data.count > 0 ? data.totalDuration / data.count : 0;
      const errorRate = data.count > 0 ? (data.errors / data.count) * 100 : 0;

      if (data.p99Duration > 1000) {
        bottlenecks.push({
          endpoint,
          issue: 'High p99 latency',
          severity: 'high',
          value: data.p99Duration
        });
      } else if (data.p99Duration > 500) {
        bottlenecks.push({
          endpoint,
          issue: 'Elevated p99 latency',
          severity: 'medium',
          value: data.p99Duration
        });
      }

      if (errorRate > 10) {
        bottlenecks.push({
          endpoint,
          issue: 'High error rate',
          severity: 'high',
          value: errorRate
        });
      } else if (errorRate > 5) {
        bottlenecks.push({
          endpoint,
          issue: 'Elevated error rate',
          severity: 'medium',
          value: errorRate
        });
      }
    }

    // Sort by severity
    bottlenecks.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return bottlenecks;
  }

  public getDetailedMetrics() {
    const endpoints = Array.from(this.endpointMetrics.entries()).map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
      minDuration: data.minDuration === Infinity ? 0 : data.minDuration,
      maxDuration: data.maxDuration,
      p95Duration: data.p95Duration,
      p99Duration: data.p99Duration,
      errors: data.errors,
      errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0,
      lastAccess: new Date(data.lastAccessTime).toISOString()
    }));

    // Sort by p99 duration (slowest first)
    endpoints.sort((a, b) => b.p99Duration - a.p99Duration);

    return {
      system: {
        cpu: {
          current: this.systemMetrics.cpuUsage[this.systemMetrics.cpuUsage.length - 1] || 0,
          average: this.systemMetrics.cpuUsage.reduce((a, b) => a + b, 0) / (this.systemMetrics.cpuUsage.length || 1),
          samples: this.systemMetrics.cpuUsage.length
        },
        memory: {
          current: this.systemMetrics.memoryUsage[this.systemMetrics.memoryUsage.length - 1] || 0,
          average: this.systemMetrics.memoryUsage.reduce((a, b) => a + b, 0) / (this.systemMetrics.memoryUsage.length || 1),
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        },
        eventLoop: {
          current: this.systemMetrics.eventLoopLag[this.systemMetrics.eventLoopLag.length - 1] || 0,
          average: this.systemMetrics.eventLoopLag.reduce((a, b) => a + b, 0) / (this.systemMetrics.eventLoopLag.length || 1)
        },
        network: {
          interfaces: Object.keys(os.networkInterfaces()).length
        }
      },
      http: {
        totalRequests: this.systemMetrics.totalRequests,
        totalErrors: this.systemMetrics.totalErrors,
        errorRate: this.systemMetrics.totalRequests > 0 
          ? (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests) * 100 
          : 0
      },
      endpoints,
      bottlenecks: this.getBottlenecks()
    };
  }
}

// Global metrics collector
const metricsCollector = new MetricsCollector();

// Middleware function
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();

  // Capture response finish
  res.on('finish', () => {
    const duration = performance.now() - startTime;
    metricsCollector.recordRequest(req.path, duration, res.statusCode);
  });

  next();
}

// Export metrics endpoints
export function getPrometheusMetrics(): string {
  return metricsCollector.getPrometheusMetrics();
}

export function getDetailedMetrics() {
  return metricsCollector.getDetailedMetrics();
}

export { metricsCollector };
