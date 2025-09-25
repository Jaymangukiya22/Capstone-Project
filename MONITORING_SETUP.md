# 📊 QuizUP Monitoring Setup Guide

## 🏗️ Step 1: Start Monitoring Services

First, let's start the monitoring stack with Docker Compose:

```bash
# Navigate to project root
cd /d/Projects/Capstone-Project

# Start monitoring services (add to existing docker-compose)
docker-compose up prometheus grafana adminer redis-commander -d

# Or start everything including monitoring
docker-compose up --build
```

## 📋 Step 2: Access Monitoring Tools

Once services are running, access these URLs:

- **📊 Prometheus**: http://localhost:9090
- **📈 Grafana**: http://localhost:3003 (admin/admin)
- **🗄️ Database Admin**: http://localhost:8080
- **🔴 Redis Commander**: http://localhost:8081

## ⚙️ Step 3: Configure Application Metrics

### Backend Metrics Endpoint
Your backend already has basic health checks. Let's enhance it:

```typescript
// Add to your backend server.ts or create metrics endpoint
import promClient from 'prom-client';

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'quizup-backend'
});

// Create custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'quizup_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'quizup_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeUsers = new promClient.Gauge({
  name: 'quizup_active_users',
  help: 'Number of currently active users'
});

const quizAttemptsTotal = new promClient.Counter({
  name: 'quizup_quiz_attempts_total',
  help: 'Total number of quiz attempts',
  labelNames: ['difficulty', 'status']
});

// Register the metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeUsers);
register.registerMetric(quizAttemptsTotal);

// Add metrics middleware
app.use('/metrics', async (req, res) => {
  // Update metrics
  activeUsers.set(42); // Example: set active users count

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Environment Variables for Metrics:
```bash
# Add to your .env
ENABLE_METRICS=true
PROMETHEUS_PORT=9090
```

## 📊 Step 4: Prometheus Configuration

Create a Prometheus configuration file:

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'quizup-backend'
    static_configs:
      - targets: ['backend:3000']
    scrape_interval: 5s
    metrics_path: '/metrics'

  - job_name: 'quizup-matchserver'
    static_configs:
      - targets: ['matchserver:3001']
    scrape_interval: 5s
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

## 📈 Step 5: Grafana Dashboards

### Initial Setup:
1. **Access Grafana**: http://localhost:3003
2. **Login**: admin/admin
3. **Change Password**: Set a secure password

### Add Data Sources:
1. **Configuration** → **Data Sources** → **Add data source**
2. **Choose "Prometheus"**
3. **URL**: http://prometheus:9090
4. **Save & Test**

### Create Dashboard:

#### 1. Application Metrics Dashboard
```json
{
  "dashboard": {
    "title": "QuizUP Application Metrics",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(quizup_http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(quizup_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "quizup_active_users"
          }
        ]
      },
      {
        "title": "Quiz Attempts",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(quizup_quiz_attempts_total[5m])",
            "legendFormat": "{{difficulty}} - {{status}}"
          }
        ]
      }
    ]
  }
}
```

#### 2. System Resources Dashboard
```json
{
  "dashboard": {
    "title": "QuizUP System Resources",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total{pod=~\"quizup.*\"}[5m])",
            "legendFormat": "{{pod}}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{pod=~\"quizup.*\"}",
            "legendFormat": "{{pod}}"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_activity_count"
          }
        ]
      }
    ]
  }
}
```

## 🔧 Step 6: Enhanced Health Checks

### Backend Health Endpoint:
```typescript
// Add comprehensive health check
app.get('/health', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    services: {
      database: 'unknown',
      redis: 'unknown'
    }
  };

  try {
    // Check database
    await sequelize.authenticate();
    healthCheck.services.database = 'connected';
  } catch (error) {
    healthCheck.services.database = 'disconnected';
    healthCheck.status = 'degraded';
  }

  try {
    // Check Redis
    await redisClient.ping();
    healthCheck.services.redis = 'connected';
  } catch (error) {
    healthCheck.services.redis = 'disconnected';
    healthCheck.status = 'degraded';
  }

  const httpStatus = healthCheck.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(healthCheck);
});
```

## 📊 Step 7: Log Aggregation

### Structured Logging:
```typescript
// Use Winston for structured logs
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'quizup-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

## 🚀 Step 8: Start Monitoring

```bash
# Start all services with monitoring
docker-compose up --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f prometheus
docker-compose logs -f grafana
```

## 📱 Step 9: Mobile Monitoring

### Grafana Mobile App:
1. Download Grafana app on your phone
2. Add your local Grafana instance
3. Monitor your QuizUP app on the go!

## ✅ Expected Results

- **📊 Prometheus**: http://localhost:9090 - Metrics collection
- **📈 Grafana**: http://localhost:3003 - Beautiful dashboards
- **🗄️ Adminer**: http://localhost:8080 - Database management
- **🔴 Redis Commander**: http://localhost:8081 - Cache management
- **📊 Custom Dashboards**: Real-time QuizUP metrics
- **🚨 Alerts**: Email/Slack notifications for issues

## 🔧 Troubleshooting

### Common Issues:

1. **Prometheus can't scrape metrics**
   - Check if `/metrics` endpoint is accessible
   - Verify service names in docker-compose

2. **Grafana shows "No data"**
   - Ensure Prometheus data source is configured
   - Check query syntax in dashboard panels

3. **High resource usage**
   - Adjust scrape intervals in Prometheus config
   - Use more specific metric filters

### Debug Commands:
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test metrics endpoint
curl http://localhost:3000/metrics

# View Prometheus logs
docker-compose logs prometheus
```

## 🎯 **Advanced Features**

### Alerting Setup:
```yaml
# Alert rules
groups:
  - name: quizup_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(quizup_http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
```

### Performance Monitoring:
- Database query performance
- API response times
- Memory and CPU usage
- User activity patterns
- Quiz completion rates

Your QuizUP monitoring stack is now ready! 🚀📊
