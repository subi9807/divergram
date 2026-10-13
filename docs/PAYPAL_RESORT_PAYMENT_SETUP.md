# PayPal resort deposit setup

PayPal is used only for resort booking deposits, which are physical services consumed outside the app. Annual AI membership and other digital app benefits continue to use Apple In-App Purchase and Google Play Billing.

## Implemented flow

1. The signed-in member requests a checkout session for their own booking.
2. The API locks the booking, validates its status, USD amount, and idempotency key, then creates a PayPal order server-side.
3. The app opens the Divergram-hosted PayPal Checkout page.
4. After payer approval, the API captures the order and verifies the captured order ID, currency, and amount against the booking snapshot.
5. The booking becomes paid only after the server capture succeeds or a verified PayPal webhook reconciles the payment.
6. The admin ledger links the app member, booking applicant, resort, PayPal payer, order, capture, gross amount, PayPal fee, net amount, refund, and processing timestamps.

No card number or PayPal secret is stored in the app or Divergram database.

## PayPal dashboard setup

Create a REST application under PayPal Developer Dashboard and start with Sandbox.

Webhook URL:

```text
https://api.divergram.com/api/resort-payments/webhooks/paypal
```

Subscribe to these events:

```text
PAYMENT.CAPTURE.COMPLETED
PAYMENT.CAPTURE.DENIED
PAYMENT.CAPTURE.DECLINED
PAYMENT.CAPTURE.REFUNDED
PAYMENT.CAPTURE.REVERSED
```

Record the REST app Client ID, Secret, and Webhook ID. Never place the Secret or Webhook ID in the mobile app.

## Server configuration

Sandbox:

```dotenv
RESORT_PAYMENT_ENABLED=true
RESORT_PAYMENT_PROVIDER=paypal
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_SANDBOX_CLIENT_ID=...
PAYPAL_SANDBOX_CLIENT_SECRET=...
PAYPAL_SANDBOX_WEBHOOK_ID=...
PAYPAL_LIVE_CLIENT_ID=...
PAYPAL_LIVE_CLIENT_SECRET=...
PAYPAL_LIVE_WEBHOOK_ID=...
PAYPAL_CHECKOUT_SECRET=<a separate random value of at least 32 bytes>
PUBLIC_API_BASE_URL=https://api.divergram.com
```

The legacy `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID`
values remain a Sandbox fallback. Live activation requires the explicit Live
variables above.

## Admin environment control

The resort booking admin screen switches between Sandbox and Live without
returning credentials to the browser. Live activation is rejected unless:

- Sandbox and Live credential sets are complete.
- At least one PayPal Sandbox payment has completed successfully.
- No Sandbox payment remains pending or processing.
- The administrator enters `LIVE` as the confirmation value.

The selected environment is stored in `app_payment_environment_settings`, and
every transition is recorded in `admin_audit_logs`. Switching back to Sandbox
remains available whenever Sandbox credentials are complete.

Apply both PayPal migrations before using this control:

```bash
node scripts/apply-migration.mjs db/migrations/20260923000100_add_paypal_payment_reporting.sql
node scripts/apply-migration.mjs db/migrations/20260923000200_add_payment_environment_settings.sql
```

The active environment changes immediately; an API restart is not required.

## Database migration

```bash
cd /home/divergram/api
node scripts/apply-migration.mjs db/migrations/20260923000100_add_paypal_payment_reporting.sql
node scripts/apply-migration.mjs db/migrations/20260923000200_add_payment_environment_settings.sql
```

The migration is additive and preserves existing Airwallex, wallet, booking, and payment rows.

## Sandbox acceptance checklist

- Create a new booking with a USD deposit.
- Pay with a PayPal Sandbox personal buyer account.
- Confirm exactly one capture exists for the booking.
- Confirm the app booking changes from pending deposit to paid.
- Confirm the admin ledger displays member and payer identities separately.
- Confirm gross, PayPal fee, net, order ID, and capture ID are present.
- Resend the same webhook and confirm it is treated as a duplicate.
- Cancel checkout and confirm the booking remains unpaid.
- Issue a Sandbox refund and confirm the payment and booking become refunded.
- Confirm no client secret, access token, or full payment payload appears in app responses or admin screens.

## Admin reporting definitions

- Gross sales: completed captured amount before refunds.
- Refunds: verified refunded amount.
- Net sales: gross sales minus refunds.
- PG fee: fee reported by PayPal in the seller receivable breakdown.
- PG settlement amount: PayPal-reported net amount before later currency conversion or bank fees.

Accounting totals in Divergram are operational reporting. PayPal settlement reports and bank deposits remain the source documents for bookkeeping and tax reconciliation.
