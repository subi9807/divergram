# Airwallex Resort Deposit Integration

## Current mode

The integration uses Airwallex Hosted Payment Page (HPP) for resort deposits in USD.

- `sample`: no Airwallex credentials or charge. It validates the app-to-browser return flow and never marks a booking as paid.
- `demo`: Airwallex demo API and test cards. A verified Airwallex webhook is required before a booking is marked paid.
- `production`: live Airwallex API. Enable only after KYC, payment-method activation, settlement, refund, and webhook checks are complete.

## Server configuration

```dotenv
RESORT_PAYMENT_PROVIDER=airwallex
AIRWALLEX_ENVIRONMENT=sample
AIRWALLEX_CLIENT_ID=
AIRWALLEX_API_KEY=
AIRWALLEX_WEBHOOK_SECRET=
AIRWALLEX_CHECKOUT_SECRET=<long-random-server-secret>
PUBLIC_API_BASE_URL=https://api.divergram.com
```

For demo testing, set `AIRWALLEX_ENVIRONMENT=demo` and add credentials issued by the Airwallex demo account. For launch, change it to `production` and use production-only credentials. Never reuse demo keys or webhook secrets in production.

## Airwallex console setup

1. Enable online card payments for the account.
2. Create API credentials and store the client ID and API key only on the API server.
3. Create an HTTPS webhook pointing to `https://api.divergram.com/api/resort-payments/webhooks/airwallex`.
4. Subscribe to PaymentIntent success, failure, cancellation, and refund events.
5. Store the webhook signing secret as `AIRWALLEX_WEBHOOK_SECRET`.
6. Run a demo payment and verify that the webhook event is recorded once and the associated booking deposit changes to `paid` only after the signed success event.

## Runtime flow

1. The app requests a payment session for an owned, payable reservation.
2. The API creates a local idempotent payment intent.
3. In demo/production, the API authenticates to Airwallex and creates a PaymentIntent.
4. The app opens Divergram's short-lived signed checkout URL.
5. The checkout page redirects to the Airwallex HPP. Divergram never receives or stores card numbers.
6. Browser return only refreshes the UI; it does not prove payment.
7. A recent, correctly signed Airwallex webhook is the only path that marks the deposit paid.

## Launch gate

Do not switch to `production` until all items pass:

- Airwallex account and online payments are approved.
- Settlement bank account and business verification are complete.
- Demo card payment, 3DS, cancellation, failure, and refund scenarios pass.
- Webhook signature, replay/idempotency, and delayed-delivery tests pass.
- Refund and no-show policy is visible before booking confirmation.
- iOS and Android physical-device checkout and return flows pass.

## Official references

- Authentication: https://www.airwallex.com/docs/api/authentication/api_access_token
- PaymentIntent API: https://www.airwallex.com/docs/api/payments/payment_intents/create
- Hosted Payment Page: https://www.airwallex.com/docs/payments/online-payments/hosted-payment-page/guest-user-checkout
- Webhook verification: https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events
