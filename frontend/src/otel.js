// Browser-side OpenTelemetry tracing with W3C Trace Context propagation.
//
// Imported first thing in main.tsx (as a side-effect-only import). The
// browser can't participate in a distributed trace unless *something*
// creates a root span and injects a `traceparent` header into outgoing
// requests -- that's what this does, so a single trace_id follows a
// request from the user's click, through the API gateway, into every
// downstream microservice, and shows up as one connected trace in
// Tempo (see observability/README.md).
//
// Plain .js (not .ts) on purpose: this app's build script runs a
// strict `tsc -b` before `vite build`, and tsc ignores plain .js files
// (allowJs is unset) -- so a type mismatch against an OpenTelemetry
// package's typings can't hard-fail the whole build. A side-effect-only
// `import "./otel"` from main.tsx never triggers type resolution.
//
// Wrapped in try/catch and disabled outright when
// VITE_OTEL_EXPORTER_OTLP_ENDPOINT isn't set: telemetry is important
// but must never be able to break the app if the collector is
// unreachable or a browser lacks some API this relies on.
import { context } from "@opentelemetry/api";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { Resource } from "@opentelemetry/resources";
import { BatchSpanProcessor, WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

try {
  const otlpEndpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || "/otlp";

  if (otlpEndpoint) {
    // The OTLP exporter parses its url with new URL(), which requires an
    // absolute URL. Resolve relative endpoints (like "/otlp", proxied by
    // nginx to the collector) against the page origin. Absolute endpoints
    // pass through unchanged.
    const otlpTracesUrl = new URL(
      `${otlpEndpoint.replace(/\/$/, "")}/v1/traces`,
      window.location.origin,
    ).href;

    const provider = new WebTracerProvider({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: import.meta.env.VITE_OTEL_SERVICE_NAME || "digital-banking-frontend",
      }),
    });

    provider.addSpanProcessor(
      new BatchSpanProcessor(new OTLPTraceExporter({ url: otlpTracesUrl })),
    );

    // ZoneContextManager keeps the active span correct across async
    // boundaries (promises, timers) in the browser, so a span started
    // in a click handler is still the parent when the axios request
    // it triggers actually fires.
    provider.register({ contextManager: new ZoneContextManager() });

    // Don't trace the exporter's own OTLP POSTs -- that would create
    // a span for every export, which triggers another export, etc.
    // Match on the path so this works for relative and absolute endpoints.
    const otlpPath = new URL(otlpTracesUrl).pathname;
    const ignoreUrls = [new RegExp(otlpPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))];

    registerInstrumentations({
      instrumentations: [
        // axios (src/lib/api.ts) uses XMLHttpRequest under the hood in
        // the browser, so this is the instrumentation that actually
        // covers this app's API calls. Requests now go through the nginx
        // proxy on the same origin, so propagation works without CORS;
        // propagateTraceHeaderCorsUrls is kept in case the API base URL
        // is ever pointed at a different origin again.
        new XMLHttpRequestInstrumentation({
          propagateTraceHeaderCorsUrls: [/.+/],
          ignoreUrls,
        }),
        // Covers any direct fetch() calls too, for completeness.
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [/.+/],
          ignoreUrls,
        }),
      ],
    });

    // Referenced so bundlers/linters don't flag the import as unused;
    // context is what the instrumentations above read/write internally.
    void context;
  }
} catch (error) {
  // Never let telemetry setup break the app.
  // eslint-disable-next-line no-console
  console.warn("OpenTelemetry browser tracing failed to start:", error);
}
