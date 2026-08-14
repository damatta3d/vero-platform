# MISSION 013 — VERO MANAGER MVP

## Objective

Deliver the restaurant-side operational console for VERO-native orders, building on the transactional VERO Menu foundation merged in PR #46.

## Scope

1. Operational order board with tenant isolation.
2. Order detail including customer, fulfillment, items, notes, totals and payment state.
3. Controlled workflow: RECEIVED → CONFIRMED → PREPARING → READY → DISPATCHED/COMPLETED.
4. Cancellation according to the canonical workflow.
5. Optimistic concurrency protection for status transitions.
6. Persistent status history/audit trail.
7. Authorization for every Manager operation.
8. API contract suitable for web/tablet Manager UI.
9. Polling/realtime-ready incremental synchronization without weakening source-of-truth semantics.
10. Foundation for KDS and thermal ticket printing in the following mission.

## Non-goals

- Full ERP dashboard.
- iFood/Anota AI write mutations.
- Fiscal/NFC-e issuance.
- Production printer drivers.
- Advanced BI.

## Definition of Done

- Manager APIs expose operational list and complete order detail.
- Status actions follow the canonical order state machine.
- Cross-tenant access is rejected.
- Unpaid PIX orders cannot enter production.
- Concurrent transitions cannot silently overwrite one another.
- Every successful transition creates history.
- Integration tests cover the operational happy path and invalid transitions.
- CI and Docker gates are green.
- Work is isolated in `feat/vero-manager-mvp` and reviewed through its own PR.
