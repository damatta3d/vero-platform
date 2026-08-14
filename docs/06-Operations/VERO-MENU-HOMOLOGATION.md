# VERO Menu — Homologation Runbook

## Goal

Validate the minimum production-like VERO Commerce flow before exposing the Santo Parma digital menu to real customers.

## Automated gate

The integration suite must prove, against PostgreSQL with deployed migrations, that a published menu item can become a native order and complete the kitchen flow without bypassing persisted state.

Required flow:

1. seed an isolated tenant, published menu, category and available catalog-backed item;
2. create a `PAY_ON_DELIVERY` native order through the application controller;
3. verify server-side pricing and persisted `RECEIVED` status;
4. verify customer tracking with the opaque tracking token;
5. verify the order is visible to the kitchen queue;
6. transition `RECEIVED -> ACCEPTED -> PREPARING -> READY`;
7. verify the public tracking endpoint reflects the final state;
8. verify the persisted status history contains every transition.

The CI integration job executes this flow with `pnpm test:integration`. Quality and Docker builds remain mandatory gates.

## Manual Santo Parma gate

Before publishing a real link, validate on the homologation environment:

- `/health/live` returns healthy;
- `/health/ready` returns healthy with PostgreSQL, Redis and RabbitMQ enabled;
- the public menu opens on desktop and mobile without administrative credentials;
- categories, item names, prices and availability match the approved Santo Parma menu;
- an unavailable item cannot generate an order;
- a test `PAY_ON_DELIVERY` order appears in the kitchen queue;
- the customer tracking link opens only with its tracking token;
- kitchen status changes are reflected in customer tracking;
- the kitchen ticket contains item, quantity and notes;
- no real PIX charge is created during this gate unless Mercado Pago homologation credentials are explicitly configured.

## Release decision

Do not expose the customer link if CI, Docker, readiness, order creation, kitchen queue or tracking fails. Fix the failing layer and repeat the complete gate.
