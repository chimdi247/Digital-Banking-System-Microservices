#!/usr/bin/env bash
# Shared runner used by load-test.sh / stress-test.sh / spike-test.sh.
# Not meant to be run directly. Written for an Ubuntu VM (Google Compute Engine).
#
# Environment overrides:
#   GATEWAY_URL, ACCOUNT_URL, TRANSACTION_URL, PAYMENT_URL, FRAUD_URL,
#   NOTIFICATION_URL   Target URLs (defaults below)
#   INSTALL_K6=1       Install k6 natively via apt if it is missing
#   K6_DOCKER_NETWORK  Run the Docker fallback on a compose network
#                      (e.g. digital-banking_banking-network) and use
#                      service names instead of localhost
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <scenario-file.js> [extra k6 args...]" >&2
  exit 1
fi

SCRIPT_NAME="$1"
shift

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "${TEST_DIR}/scripts/${SCRIPT_NAME}" ]]; then
  echo "ERROR: ${TEST_DIR}/scripts/${SCRIPT_NAME} not found" >&2
  exit 1
fi

# Defaults: on the VM everything is reachable through localhost, or through
# service names when running on the compose network.
if [[ -n "${K6_DOCKER_NETWORK:-}" ]]; then
  DEF_HOST_GATEWAY="api-gateway";          DEF_HOST_ACCOUNT="account-service"
  DEF_HOST_TXN="transaction-service";      DEF_HOST_PAY="payment-service"
  DEF_HOST_FRAUD="fraud-detection-service"; DEF_HOST_NOTIF="notification-service"
else
  DEF_HOST_GATEWAY="localhost"; DEF_HOST_ACCOUNT="localhost"; DEF_HOST_TXN="localhost"
  DEF_HOST_PAY="localhost";     DEF_HOST_FRAUD="localhost";   DEF_HOST_NOTIF="localhost"
fi

GATEWAY_URL="${GATEWAY_URL:-http://${DEF_HOST_GATEWAY}:8080}"
ACCOUNT_URL="${ACCOUNT_URL:-http://${DEF_HOST_ACCOUNT}:8081}"
TRANSACTION_URL="${TRANSACTION_URL:-http://${DEF_HOST_TXN}:8082}"
PAYMENT_URL="${PAYMENT_URL:-http://${DEF_HOST_PAY}:8083}"
FRAUD_URL="${FRAUD_URL:-http://${DEF_HOST_FRAUD}:8084}"
NOTIFICATION_URL="${NOTIFICATION_URL:-http://${DEF_HOST_NOTIF}:8085}"

echo "==> Scenario: ${SCRIPT_NAME}"
echo "    GATEWAY_URL=${GATEWAY_URL}"
echo "    ACCOUNT_URL=${ACCOUNT_URL}  TRANSACTION_URL=${TRANSACTION_URL}  PAYMENT_URL=${PAYMENT_URL}"
echo "    FRAUD_URL=${FRAUD_URL}  NOTIFICATION_URL=${NOTIFICATION_URL}"
echo

install_k6_ubuntu() {
  echo "==> Installing k6 from the official apt repository"
  sudo apt-get update -y
  sudo apt-get install -y gnupg ca-certificates
  sudo gpg --no-default-keyring \
    --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
    --keyserver hkp://keyserver.ubuntu.com:80 \
    --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
    | sudo tee /etc/apt/sources.list.d/k6.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y k6
}

if ! command -v k6 >/dev/null 2>&1 && [[ "${INSTALL_K6:-0}" == "1" ]]; then
  install_k6_ubuntu
fi

if command -v k6 >/dev/null 2>&1; then
  echo "==> Using locally installed k6 ($(k6 version | head -n1))"
  GATEWAY_URL="${GATEWAY_URL}" ACCOUNT_URL="${ACCOUNT_URL}" \
  TRANSACTION_URL="${TRANSACTION_URL}" PAYMENT_URL="${PAYMENT_URL}" \
  FRAUD_URL="${FRAUD_URL}" NOTIFICATION_URL="${NOTIFICATION_URL}" \
    k6 run "$@" "${TEST_DIR}/scripts/${SCRIPT_NAME}"
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: neither k6 nor docker is installed. Re-run with INSTALL_K6=1." >&2
    exit 1
  fi
  echo "==> k6 not found locally, running via Docker (grafana/k6)"
  echo "    Tip: INSTALL_K6=1 $0 ... installs k6 natively for faster startup."

  if [[ -n "${K6_DOCKER_NETWORK:-}" ]]; then
    NET_ARGS=(--network "${K6_DOCKER_NETWORK}")
  else
    # Host networking: localhost inside the container is the VM itself.
    NET_ARGS=(--network host)
  fi

  docker run --rm -i \
    "${NET_ARGS[@]}" \
    --user "$(id -u):$(id -g)" \
    -e GATEWAY_URL="${GATEWAY_URL}" \
    -e ACCOUNT_URL="${ACCOUNT_URL}" \
    -e TRANSACTION_URL="${TRANSACTION_URL}" \
    -e PAYMENT_URL="${PAYMENT_URL}" \
    -e FRAUD_URL="${FRAUD_URL}" \
    -e NOTIFICATION_URL="${NOTIFICATION_URL}" \
    -v "${TEST_DIR}/scripts:/scripts:ro" \
    grafana/k6 run "$@" "/scripts/${SCRIPT_NAME}"
fi
