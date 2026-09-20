-- =============================================================================
-- Digital Banking System — schema initialization
--
-- Runs automatically the first time the MySQL container starts with an empty
-- data volume (mounted to /docker-entrypoint-initdb.d — see docker-compose.yml).
--
-- Each service's `spring.jpa.hibernate.ddl-auto: update` will also verify/
-- extend these tables on boot, but since they match exactly what Hibernate
-- would generate itself, that's a no-op in the normal case. This file exists
-- so the schema is created deterministically and visible in one place, before
-- any service has to race to create it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- account_db — account-service
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS account_db;
USE account_db;

CREATE TABLE IF NOT EXISTS accounts (
    id                       VARCHAR(255) PRIMARY KEY,
    account_number           VARCHAR(255) NOT NULL UNIQUE,
    account_holder_name      VARCHAR(255) NOT NULL,
    email                    VARCHAR(255) NOT NULL,
    phone                    VARCHAR(255) NOT NULL,
    account_type             VARCHAR(50)  NOT NULL,
    status                   VARCHAR(50)  NOT NULL,
    balance                  DECIMAL(15,2) NOT NULL,
    daily_transaction_limit  DECIMAL(15,2) NOT NULL,
    created_at               DATETIME(6),
    updated_at               DATETIME(6),
    INDEX idx_accounts_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Login identities. Deliberately separate from `accounts`: one person (user)
-- may hold multiple bank accounts (savings, current, ...).
CREATE TABLE IF NOT EXISTS users (
    id             VARCHAR(255) PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    full_name      VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(50)  NOT NULL,
    created_at     DATETIME(6),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- transaction_db — transaction-service
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS transaction_db;
USE transaction_db;

CREATE TABLE IF NOT EXISTS transactions (
    id                        VARCHAR(255) PRIMARY KEY,
    sender_account_number     VARCHAR(255) NOT NULL,
    receiver_account_number   VARCHAR(255) NOT NULL,
    amount                    DECIMAL(15,2) NOT NULL,
    type                      VARCHAR(50)  NOT NULL,
    status                    VARCHAR(50)  NOT NULL,
    description               VARCHAR(255),
    failure_reason            VARCHAR(255),
    reference_number          VARCHAR(255),
    created_at                DATETIME(6),
    completed_at              DATETIME(6),
    INDEX idx_transactions_sender (sender_account_number),
    INDEX idx_transactions_receiver (receiver_account_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- payment_db — payment-service
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS payment_db;
USE payment_db;

CREATE TABLE IF NOT EXISTS payments (
    id                    VARCHAR(255) PRIMARY KEY,
    razorpay_order_id     VARCHAR(255),
    razorpay_payment_id   VARCHAR(255),
    account_number        VARCHAR(255) NOT NULL,
    amount                DECIMAL(15,2) NOT NULL,
    currency              VARCHAR(10)  NOT NULL,
    status                VARCHAR(50),
    description           VARCHAR(255),
    failure_reason        VARCHAR(255),
    created_at            DATETIME(6),
    updated_at            DATETIME(6),
    INDEX idx_payments_account (account_number),
    INDEX idx_payments_order (razorpay_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
