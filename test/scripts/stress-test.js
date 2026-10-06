// Stress test: progressively pushes far beyond normal expected load
// to find where the stack starts degrading -- watch each service's
// Grafana dashboard (error rate, latency percentiles, node CPU/memory)
// while this runs. Thresholds are deliberately loose so the run
// completes.
//
// Run via ../stress-test.sh, or directly: k6 run stress-test.js
import { sleep } from 'k6';
import { browseAllServices, loginAsAdmin } from './helpers.js';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.5'],
  },
};

export default function () {
  const token = loginAsAdmin();
  browseAllServices(token);
  sleep(0.2);
}
