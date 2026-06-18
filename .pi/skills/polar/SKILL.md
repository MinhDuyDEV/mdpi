---
name: polar
description: Use when implementing payment flows, subscriptions, license keys, or customer portals with Polar. MUST load before writing any checkout, monetization, or billing code using Polar platform.
---

# Polar Integration

## When to Use

- When implementing Polar checkout, subscriptions, or license key flows.

## When NOT to Use

- When payments are handled by a different platform.


## What I Do

- Guide implementation of Polar checkout and payments
- Help with subscription management and billing
- Assist with license key validation
- Set up webhook handlers for payment events

## When to Use Me

- Implementing checkout flow for a product
- Adding subscription billing to an app
- Setting up license key validation
- Building a customer portal
- Handling payment webhooks

## Quick Start

```bash
npm install @polar-sh/sdk
```

```typescript
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: "production", // or "sandbox"
});
```

## Key APIs

| API                     | Purpose                           |
| ----------------------- | --------------------------------- |
| `polar.products.*`      | Create/manage products and prices |
| `polar.checkouts.*`     | Create checkout sessions          |
| `polar.subscriptions.*` | Manage subscriptions              |
| `polar.orders.*`        | View order history                |
| `polar.customers.*`     | Customer management               |
| `polar.licenseKeys.*`   | Issue and validate licenses       |

## Environment Variables

| Variable               | Description                     |
| ---------------------- | ------------------------------- |
| `POLAR_ACCESS_TOKEN`   | Organization Access Token (OAT) |
| `POLAR_WEBHOOK_SECRET` | Webhook signing secret          |

## Common Patterns

### Create Checkout

```typescript
const checkout = await polar.checkouts.create({
  productId: "prod_xxx",
  successUrl: "https://myapp.com/success",
});
// Redirect to checkout.url
```

### Validate License Key

```typescript
const result = await polar.licenseKeys.validate({
  key: "XXXX-XXXX-XXXX-XXXX",
  organizationId: "org_xxx",
});
```

### Handle Webhook

```typescript
import { validateEvent } from "@polar-sh/sdk/webhooks";

const event = validateEvent(body, signature, process.env.POLAR_WEBHOOK_SECRET!);
// event.type: "subscription.created", "order.created", etc.
```

## Links

- [Dashboard](https://polar.sh)
- [API Docs](https://docs.polar.sh/api-reference)
- [SDK](https://www.npmjs.com/package/@polar-sh/sdk)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll test payments in production" | Payment bugs cost real money. Test in sandbox with every scenario. |
| "The webhook handler is simple enough" | Webhook failures mean lost revenue. Validate signatures, handle retries, log everything. |
| "Subscription logic can go in the frontend" | Pricing logic in the frontend is spoofable. Server-side validation is mandatory. |

## Red Flags

- Payment logic without error handling for all failure modes
- Webhook signatures not verified
- Test mode vs live mode not clearly separated in code
- Subscription state stored locally without server reconciliation
- Pricing changes deployed without migration plan for existing subscribers

## Verification

After implementing Polar payments:

- [ ] All payment flows tested in sandbox mode
- [ ] Webhook signatures are verified on every request
- [ ] Test mode and live mode are explicitly separated in configuration
- [ ] Error handling covers: declined, expired, insufficient funds, network failure
- [ ] Subscription state is reconciled server-side, not client-authoritative
