# observability/

Config and provisioning for the monitoring stack in `docker-compose.yml`:
OpenTelemetry Collector, Prometheus, Grafana, Loki, Promtail, and Tempo.

## A naming note: Tempo, not Jaeger

The request asked for "jaeger for tracing" as a datasource, but then
separately asked for traces to be "visualized in tempo" -- these are two
different, mutually-exclusive tracing backends (Grafana doesn't have a
Jaeger datasource that also sends data into Tempo; you'd normally pick
one). Since the detailed, specific instruction named Tempo, and Grafana's
trace-to-logs/trace-to-metrics correlation features are built around it,
this stack uses **Tempo** as the actual trace store, not Jaeger. No Jaeger
container was added, to avoid paying for duplicate, unused tracing
infrastructure. If you did specifically want Jaeger's own UI as well, it's
a straightforward addition (Jaeger now accepts OTLP natively, so the
collector could fan traces out to both).

## How a request's trace_id flows from a browser click to every service

This is the core of what was asked for -- a single trace_id connecting a
user's action in the browser all the way through every microservice it
touches:

```text
1. User clicks something in the React app.
2. frontend/src/otel.js has already instrumented axios's underlying
   XMLHttpRequest (axios uses XHR in the browser, not fetch) -- so when
   the click triggers an API call, a root span starts automatically and
   a `traceparent` header (W3C Trace Context -- the trace_id, this
   span's id, and sampling flags) is injected into that request.
3. The request crosses from the frontend's origin (http://localhost:3000)
   to the API gateway's (http://localhost:8080) -- a cross-origin
   request. Two things make this actually work rather than silently
   failing:
     - api-gateway's CORS config already allows any header
       (allowedHeaders: "*"), so the traceparent header survives the
       browser's preflight check -- no change was needed there.
     - XMLHttpRequestInstrumentation is configured with
       propagateTraceHeaderCorsUrls: [/.+/] -- by default OpenTelemetry
       does NOT inject trace headers into cross-origin requests at all
       (a safety default, to avoid leaking trace context to third-party
       origins); this opts back in for this app's own gateway.
4. The OpenTelemetry Java agent attached to api-gateway (and every other
   service -- see below) automatically extracts that traceparent header
   from the incoming request and continues the SAME trace, rather than
   starting a new one -- this part needs no configuration at all, it's
   the agent's default behavior for any incoming HTTP request.
5. As api-gateway calls account-service/transaction-service/etc., and as
   those call each other, the Java agent on each hop does the same thing:
   extract the incoming trace context, continue it, inject it into any
   outgoing call that service makes.
6. Every service exports its spans via OTLP to otel-collector, which
   forwards them all to Tempo. Because every span -- frontend included --
   carries the same trace_id, Tempo (and Grafana's trace view) shows the
   whole journey as one connected trace, frontend span at the root,
   fanning out through every backend hop.
```

### Backend: zero-code, uniform across all 6 services

Every one of the 6 services (account, transaction, payment,
fraud-detection, notification, api-gateway) is Spring Boot, so the exact
same mechanism applies to all of them: the OpenTelemetry Java agent
(`-javaagent`, downloaded in each `Dockerfile`), which patches Spring
MVC/WebFlux, JDBC, Kafka, and Redis automatically at class-load time --
no source changes anywhere in any service's business logic. Configured
entirely through `OTEL_SERVICE_NAME` / `OTEL_EXPORTER_OTLP_ENDPOINT` /
`OTEL_RESOURCE_ATTRIBUTES` in `docker-compose.yml`.

### Frontend: a few lines, defensively wrapped

The browser has no equivalent of attaching a javaagent, so
`frontend/src/otel.js` does a small amount of explicit SDK setup
(`WebTracerProvider` + `XMLHttpRequestInstrumentation` + `FetchInstrumentation`
for completeness, `ZoneContextManager` to keep the active span correct
across async boundaries like promises/timers). It's a plain `.js` file
imported for its side effects only, deliberately **not** `.ts` --
this app's `npm run build` runs a strict `tsc -b` typecheck before
`vite build`, and a `.js` file is invisible to that typecheck (`allowJs`
is unset), so a mismatch against an OpenTelemetry package's exact
TypeScript types can't fail the whole production build. The whole thing
is also wrapped in `try/catch` and no-ops entirely if
`VITE_OTEL_EXPORTER_OTLP_ENDPOINT` isn't set -- telemetry must never be
able to break the actual banking app.

**Important:** `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` (like
`VITE_API_BASE_URL`) is baked into the JS bundle at *build* time and must
be a URL the visitor's own browser can reach -- the otel-collector's
OTLP/HTTP port is published to the host (`4318:4318` in
`docker-compose.yml`) specifically so this works; the internal
`otel-collector:4318` Docker hostname would not be reachable from a
browser. The collector's OTLP HTTP receiver also has CORS enabled for
the frontend's origin (`observability/otel-collector/otel-collector-config.yaml`)
-- without it the browser would block every exported span as a
disallowed cross-origin request.

## Metrics

All 6 services expose `/actuator/prometheus` (Micrometer, already
present via `spring-boot-starter-actuator` in every service; this just
added `micrometer-registry-prometheus`), scraped directly by Prometheus
-- one consistent metric convention
(`http_server_requests_seconds_count`/`_bucket`, with an `outcome` label)
across every dashboard and alert, since every service is the same
framework. Two business KPIs were added as explicit Micrometer counters,
incremented at the actual success point in each service's own code:
`transactions_completed_total` (`transaction-service`'s
`TransactionService.completeTransaction()`) and
`payments_captured_total` (`payment-service`'s
`PaymentService.handlePaymentSuccess()`).

## Logs

`promtail` uses Docker service discovery (`docker_sd_configs`, via a
read-only mount of the Docker socket) to tail **every** container's
stdout/stderr into Loki -- all 6 services, the frontend (nginx's
structured JSON access log, see `frontend/nginx.conf`), and every infra
container.

## Grafana

- URL: http://localhost:3001 (or `${GRAFANA_PORT}`)
- Login: `admin` / `admin` (`GF_ADMIN_USER` / `GF_ADMIN_PASSWORD` in `.env`)
- Datasources (Prometheus, Loki, Tempo) and the 6 dashboards below are
  provisioned automatically on first boot from
  `observability/grafana/provisioning/`.

### Dashboards -- one per service, in the "Digital Banking" folder

Each of the 6 dashboards (`<service>.json`) covers:

- **Uptime, SLIs & Error Budget**: up/down, availability SLI (non-5xx %),
  request rate, P95 latency
- **HTTP Traffic**: total successful requests (1h), total failed requests
  (1h), error rate %, request rate split success-vs-failure, latency
  percentiles (p50/p95/p99)
- **Business KPI** (transaction-service and payment-service only):
  transactions completed / payments captured, both as a 1h total and a
  live rate
- **JVM Runtime**: heap memory used, process CPU usage
- **Node Resource Utilization**: host CPU % and memory % -- repeated in
  every dashboard, since node CPU/memory was asked for on each
  individual service's dashboard rather than only in one shared place

### Alerting -- Grafana-managed (not Alertmanager)

As requested, this uses Grafana's own unified alerting rather than a
separate Alertmanager container:
`observability/grafana/provisioning/alerting/rules.yaml` defines 3 rules,
evaluated every minute, firing after 5 minutes sustained (2 minutes for
`ServiceDown`):

- `NodeCPUHigh` / `NodeMemoryHigh` -- **> 50%** (the threshold explicitly
  requested this time; other example projects in this series used 70%)
- `ServiceDown` -- any of the 6 services unreachable for 2 minutes

All route to a single email contact point (`ops-email`), sent to
`ALERT_EMAIL_TO` in `.env` -- delivery needs `GF_SMTP_ENABLED=true` plus
real SMTP credentials (also in `.env`); alerts still fire and show in the
Grafana UI without them, they just won't email out.

## Known platform caveat

`node-exporter` is run with bind-mounted `/proc`, `/sys`, `/` (not
`network_mode: host`, which doesn't work on Docker Desktop) so it starts
consistently everywhere; on Docker Desktop (macOS/Windows) this reports
the VM's resources, not literally the physical host's.
