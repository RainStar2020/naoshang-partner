# 2026-10-22 Payment and business-card follow-up

## Payment contract

- The existing WeChat authorization flow remains in `src/services/auth.js`: Mini Program uses the WeChat login exchange endpoint, while H5 first obtains a backend-provided HTTPS authorization URL and validates the callback before exchanging its code. No client-side credential is stored.
- Cashier choices are supplied by `GET /orders/{id}/payment-channels`. The UI does not infer eligibility from a channel name. The mock adapter presents WeChat, Alipay, UnionPay, and bank-card methods for ordinary payable orders.
- A business VIP quota order must carry its eligible channel set in the final quoted order. The current mock constrains it to UnionPay. The payment initiation and result-query flow remains idempotent and is the only point that credits a paid quota.

## VIP policy placeholder

- `purchaseMode: PAYMENT` permits order creation and currently applies to the mock founder context. `CALCULATION_ONLY` leaves the user on the price calculation screen and disables submission.
- The current level-to-price mapping is explicitly marked `TODO(API)`. It is a presentation reference only; backend options, entitlement checks, final quote and risk checks override it when available.

## Visual follow-up

- Wholesale rank panels, remaining-VIP metric cards, agent team cards and agent summary cards use layered light-to-dark gradients.
- Regional superior/referrer now opens a centered relationship card with the person, scope and a close action instead of a native modal.
