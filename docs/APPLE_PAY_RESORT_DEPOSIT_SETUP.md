# Resort Wallet Payment Setup

## Scope

Apple Pay and Google Pay are used only for a resort booking deposit in USD. A resort stay or diving service is fulfilled outside the app, so this is not StoreKit or Google Play Billing. Memberships and donations are intentionally outside this implementation. Both wallets share the same provider adapter, payment ledger, idempotency protection, and signed webhook processing. A future hosted card checkout can be added behind the same adapter without changing booking state rules.

The application is fail-closed. Apple Pay remains hidden unless the API reports that the merchant, gateway, and webhook configuration are all ready. A client response alone can never mark a booking as paid.

## Implemented

- Merchant ID entitlement: `merchant.com.divergram.app`
- iOS PassKit authorization bridge
- Server-owned USD amount and booking ownership validation
- Payment intent ledger with idempotency keys
- Apple Pay token fingerprinting without token persistence
- Signed webhook ingestion and duplicate event protection
- Booking deposit state update only after server confirmation
- Retry from My bookings after cancellation or failure
- Admin payment readiness indicator
- Android Google Pay native bridge and required Google Pay `PayButton`
- Google Pay `TEST` and `PRODUCTION` environment separation
- Shared Apple Pay, Google Pay, and future card-gateway contract
- Booking creation immediately followed by the platform wallet sheet when a deposit is required
- Versioned cancellation, refund, and no-show policy snapshot with acceptance timestamp
- No-show status restricted to confirmed bookings on or after the booking date

## Booking And Policy Flow

1. The guest reviews the cancellation, refund, and no-show policies and explicitly accepts them.
2. The API creates an unpaid booking and stores the accepted policy version, policy snapshot, and acceptance time.
3. When a supported wallet is available and the deposit is greater than zero, the app immediately opens Apple Pay or Google Pay.
4. A cancelled or failed payment leaves the booking unpaid so the guest can retry from My bookings. It never marks the deposit as paid.
5. A no-show keeps a paid deposit non-refundable. It can only be recorded for a confirmed booking on or after its booking date.

Refund schedule: 100% at least 14 days before the booking, 50% from 7 through 13 days, and 0% from 6 days before the booking or for a no-show. Mandatory local consumer rights take precedence.

## Apple Developer Prerequisites

Completed on 2026-09-10:

- Registered `merchant.com.divergram.app` under Certificates, Identifiers & Profiles > Identifiers > Merchant IDs.
- Enabled Apple Pay Payment Processing for App ID `com.divergram.app.ios`.
- Associated the Divergram Merchant ID with the App ID and verified `Enabled Merchant IDs (1)`.

Remaining prerequisites:

1. Select a PSP that can contract with the current Korean sole proprietorship and supports native Apple Pay for USD card payments.
2. Generate the Payment Processing Certificate from the CSR supplied by that PSP. Do not generate or distribute a private key before the PSP workflow is known.
3. Regenerate the iOS distribution provisioning profile after the capability is enabled.

## Google Pay Prerequisites

1. Select the PSP first and obtain its Google Pay gateway identifier and gateway merchant ID.
2. Keep `GOOGLE_PAY_ENVIRONMENT=TEST` until the PSP sandbox authorization and webhook flows pass.
3. Register the Android integration with Google Pay, receive the production Google merchant ID, and complete the UI review before switching to `PRODUCTION`.
4. Test on a Google Play-enabled Android device with Google Wallet and an eligible payment method.

Apple Pay sandbox authorization must be tested on a physical supported iPhone with a sandbox tester and test card. The iOS Simulator cannot complete a real Apple Pay authorization.

## API Environment

Keep production disabled until PSP sandbox certification passes:

```dotenv
RESORT_PAYMENT_PROVIDER=disabled
APPLE_PAY_MERCHANT_ID=merchant.com.divergram.app
APPLE_PAY_COUNTRY_CODE=US
APPLE_PAY_SUPPORTED_NETWORKS=visa,masterCard,amex
GOOGLE_PAY_ENVIRONMENT=TEST
GOOGLE_PAY_MERCHANT_NAME=Divergram
GOOGLE_PAY_MERCHANT_ID=
GOOGLE_PAY_COUNTRY_CODE=US
GOOGLE_PAY_SUPPORTED_NETWORKS=VISA,MASTERCARD,AMEX,JCB
GOOGLE_PAY_GATEWAY=
GOOGLE_PAY_GATEWAY_MERCHANT_ID=
```

The provider adapter contract uses these server-only values:

```dotenv
RESORT_PAYMENT_PROVIDER=gateway
RESORT_PAYMENT_GATEWAY_URL=https://your-pci-gateway.example
RESORT_PAYMENT_GATEWAY_TOKEN=server-only-token
RESORT_PAYMENT_WEBHOOK_SECRET=at-least-32-random-bytes
```

The gateway must expose `POST /apple-pay/authorize` and `POST /google-pay/authorize`, accept the canonical amount supplied by Divergram, and return `status: succeeded` only after authorization. It must send asynchronous updates to `POST https://api.divergram.com/api/resort-payments/webhooks/gateway` with an `X-Divergram-Signature: sha256=<HMAC>` header. Wallet tokens are forwarded unchanged over TLS and are not persisted.

## Database

Apply once with the production environment loaded:

```bash
cd /home/divergram/api
node scripts/apply-migration.mjs db/migrations/20260910000100_add_resort_payment_intents.sql
node scripts/apply-migration.mjs db/migrations/20260910000200_add_resort_booking_no_show_policy.sql
node scripts/apply-migration.mjs db/migrations/20260910000300_add_resort_booking_cancellation_type.sql
```

The production migration was applied on 2026-09-10 and creates `app_resort_payment_intents` and `app_resort_payment_events`. Apple Pay payment data is forwarded to the PCI-compliant gateway and is never stored in either table.

## Release Gate

- [x] Merchant ID visible in the Apple Developer account
- [x] App ID capability enabled and Merchant ID associated
- [ ] Distribution profile regenerated
- [ ] PSP Google Pay gateway name and gateway merchant ID issued
- [ ] Android TEST payment sheet completed on a Play-enabled physical device
- [ ] Google Pay production access and UI review approved
- PSP contract and KYC approved
- PSP CSR and processing certificate active
- Sandbox success, decline, cancel, timeout, duplicate tap, webhook replay, and refund scenarios verified
- Admin and user booking histories show the same final payment state
- Production secrets installed only on the API host
- Real low-value payment and refund completed before general release
