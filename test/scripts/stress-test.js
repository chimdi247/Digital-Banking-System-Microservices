// Stress test: progressively pushes far beyond normal expected load
// to find where the stack starts degrading -- watch the Grafana dashboards
// (error rate, latency percentiles, node/container CPU and memory) while this runs.
//
// Run via ../stress-test.sh, or directly: k6 run stress-test.js
import http from 'k6/http';
import { sleep } from 'k6';
import { browseAllServices, loginAsAdmin } from './helpers.js';

// 429 = the gateway's rate limiter doing its job, not a backend failure.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 429));

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 900 },
        { duration: '2m', target: 900 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Real failures only (5xx, timeouts, connection errors).
    http_req_failed: ['rate<0.5'],
    // Loose latency bound so the run completes; tighten after you find the knee.
    http_req_duration: ['p(95)<5000'],
    // Makes the throttled count appear in the end-of-test summary.
    'http_reqs{status:429}': ['count>=0'],
  },
};

// Per-VU token cache: log in once, refresh every 5 minutes (JWTs expire).
let token = null;
let tokenAt = 0;

function getToken() {
  const now = Date.now();
  if (!token || now - tokenAt > 5 * 60 * 1000) {
    token = loginAsAdmin();
    tokenAt = now;
  }
  return token;
}

export default function () {
  browseAllServices(getToken());
  sleep(0.2 + Math.random() * 0.3); // 200-500 ms think time, avoids lockstep traffic
}
