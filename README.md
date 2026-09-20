# Digital Banking System — Microservices
## Youtube Series: [Full Project: Building Digital Banking System from Scratch](https://youtube.com/@yeshendradhaker)
## Follow for more: [Yeshendra Dhaker](https://youtube.com/@yeshendradhaker)
---

## Services Overview

| Service | Port | Responsibility |
|---|---|---|
| frontend | 3000 | React/shadcn web app |
| api-gateway | 8080 | Single entry point, JWT auth, CORS, rate limiting |
| account-service | 8081 | Accounts, balances, login/auth (JWT) |
| transaction-service | 8082 | Money transfers, transaction history |
| payment-service | 8083 | Razorpay integration, webhooks |
| fraud-detection-service | 8084 | Real time fraud detection via Redis |
| notification-service | 8085 | Transaction and fraud alerts (logged, demo only) |

---

## Architecture Flow

```
Browser → React frontend → API Gateway (JWT auth, rate limiting, CORS)
                                    ↓
                Account / Transaction / Payment Service
                                    ↓
                              Apache Kafka
                                    ↓
                    ┌────────────────────────┐
                    │                        │
              Fraud Detection      Notification Service
              (Redis patterns)     (alerts via email/SMS)
                    │
              Account Service
              (block if fraud)
```

---

## Kafka Topics

| Topic | Publisher | Consumer |
|---|---|---|
| transaction.initiated | Transaction Service | Fraud Detection |
| fraud.check.result | Fraud Detection | Transaction Service |
| transaction.otp.generated | Transaction Service | Notification |
| transaction.completed | Transaction Service | Account Service, Notification |
| fraud.detected | Fraud Detection | Account Service, Notification |
| payment.completed | Payment Service | Notification |

---

## How To Run

Everything — MySQL, Redis, Kafka, Kafka UI, all 6 backend services, and the
frontend — runs from a single command:

```bash
cp .env.example .env   # fill in real values first
docker compose up -d --build
```

Then open the frontend (`http://localhost:3000` by default) and log in with
the seeded admin account: `admin@example.com` / `password123`.

See **[README.docker.md](./README.docker.md)** for the full walkthrough —
environment variables, how the database schema and admin login are created
automatically, the transfer/OTP flow, and known limitations.

---
## "Don't forget to fork and star the repo".
