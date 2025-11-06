# Monitoring and Dashboards

This repo uses Prometheus + Grafana for observability across API, Match Server, PostgreSQL, and Redis.

## Prometheus scrape jobs (expected)

- job: "match-server-master"  (match server HTTP and custom gauges)
- job: "postgresql"           (postgres-exporter)
- job: "redis"                (redis-exporter)
- job: "node"                 (optional node exporter)

Example scrape config:

```yaml
scrape_configs:
  - job_name: 'match-server-master'
    metrics_path: /metrics
    static_configs:
      - targets: ['matchserver:3001']

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

## Grafana dashboards to use

- monitoring/grafana/dashboards/match-server-performance.json
- monitoring/grafana/dashboards/bottleneck-detection.json
- monitoring/grafana/dashboards/working-metrics-dashboard.json
- monitoring/grafana/dashboards/postgresql-exporter.json (patched)
- monitoring/grafana/dashboards/postgresql-prometheus.json (alternative)
- monitoring/grafana/dashboards/redis-prometheus.json

Deprecated/legacy (removed or to avoid): radis.json, radis-exporter.json, test-dashboard.json, quizup-dashboard.json.

## Match server metrics

Exposed at GET /metrics in `backend/src/matchServer-enhanced.ts`:
- http_request_duration_seconds_bucket|count (from express-prom-bundle)
- matchserver_active_matches_total, matchserver_total_workers, matchserver_active_workers, matchserver_idle_workers, matchserver_workers_spawned_total

## Postgres exporter notes

To populate query rate/latency panels, enable pg_stat_statements in PostgreSQL and ensure the exporter exposes those metrics. If panels show N/A, verify series exist in Prometheus Explore.

## Redis exporter notes

Use redis_exporter metrics via redis-prometheus.json. Avoid Grafana Redis CLI/INFO dashboards that require cluster features.

## Worker scale-to-zero

The match server scales worker gauges to zero when no active matches.
Recommended envs:
- MIN_WORKERS=0
- MAX_WORKERS=50 (adjust per capacity)
- MAX_MATCHES_PER_WORKER=4..5 (tune per CPU)
