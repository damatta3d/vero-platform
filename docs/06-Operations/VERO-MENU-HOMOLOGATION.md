# VERO Menu - Santo Parma Homologation Runbook

## Purpose

This runbook is the release gate for the Santo Parma VERO Menu and native ordering flow. It consolidates the useful Item 13 coverage formerly proposed in PRs #49, #50, #51, #52 and #53 against the current `main` architecture.

The current kitchen state sequence covered by this gate is:

`RECEIVED -> CONFIRMED -> PREPARING -> READY`

## Automated Gate

Run against PostgreSQL with every committed Prisma migration deployed:

```bash
pnpm prisma:generate
pnpm prisma:validate
pnpm prisma:migrate:deploy
pnpm test:integration
pnpm verify
```

The CI integration job also provisions PostgreSQL, Redis and RabbitMQ. The consolidated test is:

`tests/integration/commerce-order-homologation.spec.ts`

It executes the real public menu, checkout, payment, native order, public tracking and kitchen controllers. SQL is limited to fixture preparation, persistence assertions and cleanup. The automated gate proves:

- an isolated tenant has a published menu, active category and available catalog-backed item;
- public menu prices come from persisted server data;
- browser-supplied price fields do not determine checkout, payment or order totals;
- `PAY_ON_DELIVERY` creates a `VERO_NATIVE` order in `RECEIVED`;
- the order and its lines, quantity, note and server-side unit price persist;
- only the SHA-256 tracking/idempotency hash is persisted, never the plaintext token;
- a valid token can track the order and an invalid token receives not found;
- the correct tenant sees the order in the kitchen queue and another tenant cannot view or control it;
- invalid transitions and nonexistent orders are rejected;
- tracking follows `CONFIRMED`, `PREPARING` and `READY`;
- the complete ordered status history persists;
- unavailable items are rejected by both checkout validation and native order creation;
- all fixtures are removed after the suite.

The following existing gates remain authoritative and are not duplicated here:

- `tests/integration/dependencies.spec.ts`: PostgreSQL, Redis and RabbitMQ connectivity;
- `tests/integration/catalog-persistence.spec.ts`: catalog persistence and cross-tenant relations;
- `apps/api/src/catalog/mvp-security.service.spec.ts`: invalid credentials and configured-tenant authorization;
- `tests/integration/store-settings-persistence.spec.ts`: StoreSettings defaults, persistence and tenant isolation.

## Manual Santo Parma Gate

Use a homologation environment with production-like configuration and test data. Record evidence for each item.

### Platform Readiness

- [ ] `GET /health/live` reports the application live.
- [ ] `GET /health/ready` reports ready.
- [ ] PostgreSQL is reachable and migrations are current.
- [ ] Redis is reachable.
- [ ] RabbitMQ is reachable.
- [ ] CI quality and integration jobs are green for the release SHA.
- [ ] The production Docker image builds for the release SHA.

### Public Menu

- [ ] The public Santo Parma menu opens without administrative credentials.
- [ ] Desktop layout is usable with no clipping or blocked actions.
- [ ] Mobile layout is usable on a representative phone viewport.
- [ ] Published categories appear in the approved order.
- [ ] Product names, descriptions and images match the approved menu.
- [ ] Displayed prices match the approved server-side prices.
- [ ] Available products can be added to the cart.
- [ ] An unavailable product is shown as unavailable and cannot produce a valid checkout/order.

### Checkout And Payment

- [ ] Cart quantities and item observations survive until order creation.
- [ ] Customer name and phone are required and appear correctly on the operational ticket.
- [ ] Pickup can be selected and completed.
- [ ] Delivery can be selected only when the homologation configuration supports it; address validation is exercised.
- [ ] `PAY_ON_DELIVERY` completes without an external payment provider.
- [ ] PIX is exercised only with explicit Mercado Pago homologation credentials and no real customer charge.
- [ ] Server-side totals remain correct if browser price fields are modified through developer tools.

### Operation And Customer Tracking

- [ ] The new order enters the Santo Parma operational queue as `RECEIVED`.
- [ ] The ticket shows the correct product, quantity and observations.
- [ ] Another tenant cannot list, view or transition the Santo Parma order.
- [ ] The customer tracking link works only with its opaque token.
- [ ] An invalid tracking token does not reveal whether the order exists.
- [ ] The operator transitions `RECEIVED -> CONFIRMED -> PREPARING -> READY`.
- [ ] Customer tracking reflects every transition.
- [ ] The final customer status is `READY`.
- [ ] An invalid status transition is rejected without changing persisted history.

## Release / No-Go Criteria

The release is **GO** only when all critical automated gates are green and every applicable manual checklist item has recorded evidence.

The release is **NO-GO** if any of the following occurs:

- liveness, readiness, PostgreSQL, Redis or RabbitMQ fails;
- migrations fail or the integration suite is not green;
- CI quality or Docker build fails;
- the public menu is unusable on desktop or mobile;
- published products, prices or availability differ from approved data;
- a client-supplied price can alter the trusted total;
- checkout, `PAY_ON_DELIVERY`, order persistence or the kitchen ticket fails;
- tenant isolation, tracking-token protection or invalid-token rejection fails;
- the order does not reach `READY` through the current state machine;
- unavailable items can still create a valid order.

No real customer link may be published while a critical item is failed, skipped without approval or lacks evidence. Fix the failing layer and repeat the complete gate from the release SHA.

## Deferred Scope

This gate does not connect StoreSettings to the public checkout, create real PIX charges, integrate iFood/Anota AI, print tickets or deploy production. Those remain separate follow-up missions.
