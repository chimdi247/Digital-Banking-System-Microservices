# test/

Shell scripts for load, stress, and spike testing the running stack,
using [k6](https://k6.io/). Run these **after** `docker compose up` is
healthy, from the project root or from inside this folder.

```bash
./test/load-test.sh      # steady realistic traffic
./test/stress-test.sh    # progressively increasing load past normal capacity
./test/spike-test.sh     # sudden burst, then sudden drop
```

Each script logs in through the gateway with the seeded admin login
(`admin@example.com` / `password123` -- see `README.docker.md`), then
hits the gateway's health endpoint, an authenticated profile lookup,
and every one of the 6 services' own `/actuator/health` directly (so
each gets its own load/visibility in Grafana, not just whatever the
gateway happens to route). If you have `k6` installed locally it's
used directly; otherwise the scripts fall back to running it via
`docker run grafana/k6` automatically -- no local install required,
just Docker.

While a test runs, open each service's dashboard in Grafana
(http://localhost:3001, "Digital Banking" folder) -- request rate,
error rate, latency percentiles, and node CPU/memory all update live.
You can also pick any slow or failed request in the k6 output and look
it up by trace ID in Tempo to see its full journey across services --
see `observability/README.md`.

## What each scenario does

| Script | Pattern | What it's for |
|---|---|---|
| `load-test.js` | Ramp to 20 VUs, hold 2m, ramp down | Baseline: does the stack behave correctly under expected normal traffic? Strict thresholds (p95 < 800ms, p99 < 1.5s, <1% failures) -- meant to pass. |
| `stress-test.js` | Ramp 50 -> 150 -> 300 -> 500 VUs over ~8m, then back to 0 | Where does the stack start degrading? Thresholds are deliberately loose so the run completes; watch error rate/latency climb per-service in Grafana, and whether each service recovers once load drops back to 0. |
| `spike-test.js` | 10 VUs -> sudden jump to 400 VUs in 10s -> hold -> sudden drop back to 10 | Does the stack survive a sudden burst and recover cleanly afterward? |

`test/scripts/helpers.js` has the shared login/request logic; each
scenario file just wraps it in different k6 load stages.

## Customizing

Override `GATEWAY_URL` / `ACCOUNT_URL` / `TRANSACTION_URL` /
`PAYMENT_URL` / `FRAUD_URL` / `NOTIFICATION_URL` if you changed any
service's published port. Any extra arguments are passed straight
through to `k6 run`, e.g. to write a JSON summary:

```bash
./test/load-test.sh --summary-export=load-test-results.json
```
