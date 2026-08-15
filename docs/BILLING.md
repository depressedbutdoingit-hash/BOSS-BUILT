# Boss Built billing model

## Rule

1. **Boss Built hosts every live app by default.**
2. **No free plan** — unsubscribed users have limited access.
3. **Pro + Elite** unlock full export (ZIP / JSON / GitHub).
4. **Starter** = platform-hosted only (no off-platform export).
5. Monthly Stripe subscriptions only.

## Plans

| Plan | Price | Platform host | Off-platform export |
|------|-------|---------------|---------------------|
| Unsubscribed | $0 | Limited | No |
| Starter | $29/mo | Yes | **No** |
| **Pro** | **$79/mo** | Yes | **Yes** |
| **Elite** | **$199/mo** | Yes | **Yes** |

## Gated routes (402 EXPORT_LOCKED) — Pro/Elite only

- `GET /projects/:id/export`
- `GET /projects/:id/export.zip`
- `POST /projects/:id/deploy/github`

**Not gated:** platform Vercel deploy.

## Stripe env

```
STRIPE_SECRET_KEY=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_ELITE=
STRIPE_WEBHOOK_SECRET=
```
