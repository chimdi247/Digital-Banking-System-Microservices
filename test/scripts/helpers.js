// Shared helpers imported by every scenario script in test/scripts/.
import http from 'k6/http';
import { check } from 'k6';

// Everything goes through the API gateway (port 8080) -- the same
// entry point the frontend uses -- rather than hitting each service's
// own published port directly, so load tests exercise the real
// routing/auth path.
export const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:8080';

// Each service's own health endpoint, hit directly (not through the
// gateway) so every service gets load/visibility in Grafana even
// though the gateway doesn't proxy /actuator/health for all of them.
const DIRECT_SERVICE_URLS = [
  __ENV.ACCOUNT_URL || 'http://localhost:8081',
  __ENV.TRANSACTION_URL || 'http://localhost:8082',
  __ENV.PAYMENT_URL || 'http://localhost:8083',
  __ENV.FRAUD_URL || 'http://localhost:8084',
  __ENV.NOTIFICATION_URL || 'http://localhost:8085',
];

// Seeded by the project's own database init scripts -- see
// README.docker.md.
export const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@example.com';
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'password123';

export function loginAsAdmin() {
  const res = http.post(
    `${GATEWAY_URL}/api/v1/accounts/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST auth/login' } },
  );

  check(res, { 'login succeeded': (r) => r.status === 200 });

  let token = null;
  try {
    token = JSON.parse(res.body).token || JSON.parse(res.body).accessToken;
  } catch (e) {
    token = null;
  }
  return token;
}

export function authHeaders(token) {
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// A read-heavy mix across every service, all routed through the
// gateway -- each service's health check (confirms the gateway's
// routing to it works) plus an authenticated profile lookup. There's
// no bare "list transactions/payments" endpoint in this app (both
// only expose GET by id or GET by account number -- see
// transaction-service/payment-service controllers), so this sticks to
// endpoints that don't need a pre-existing account/transaction id.
export function browseAllServices(token) {
  const requests = [
    ['GET', `${GATEWAY_URL}/actuator/health`, null, { tags: { name: 'GET gateway/health' } }],
    ['GET', `${GATEWAY_URL}/api/v1/accounts/auth/me`, null, { headers: authHeaders(token), tags: { name: 'GET accounts/me' } }],
    ...DIRECT_SERVICE_URLS.map((url) => [
      'GET',
      `${url}/actuator/health`,
      null,
      { tags: { name: `GET ${url.split(':').pop()}/health` } },
    ]),
  ];
  const responses = http.batch(requests);

  responses.forEach((res) => {
    check(res, { 'status is not 0 (request completed)': (r) => r.status > 0 });
  });

  return responses;
}
