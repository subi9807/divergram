# Divergram Resort Partner Operations

## Portal address

- Production hostname: `partner.divergram.com`
- DNS to add later: `A partner.divergram.com -> 110.45.180.149`
- Preview before DNS: `/partner` on the deployed admin frontend
- Authentication: existing Divergram member email/password login
- Authorization: `app_resort_managers` or `app_profiles.resort_owner_user_id`

TLS must be issued only after the DNS record resolves to the production server. Add `https://partner.divergram.com` to `CORS_ORIGINS` when environment configuration overrides the built-in list.

## Partner onboarding

Required documents:

1. Business or corporation registration certificate
2. Representative identity document
3. Proof of ownership or authority to operate the resort
4. Valid liability insurance certificate

Optional or conditionally required documents:

1. Safety and emergency response plan
2. Settlement bank account proof, required when online payment settlement is enabled

Documents accept PDF, JPG, PNG, or WebP up to 10 MB. They are stored outside the public web root with mode `0600` and are downloadable only by the applicant or an administrator. Retention and deletion periods must be finalized in the privacy policy before public onboarding begins.

## Deposit and refund policy

- Currency: USD only
- 14 or more days before the booking: 100% deposit refund
- 7 to 13 days before the booking: 50% deposit refund
- 0 to 6 days before the booking or no-show: no refund
- Resort, weather, or safety cancellation by the operator: 100% refund
- Processing target: original payment method within 5-10 business days after approval
- Mandatory local law and consumer rights always take precedence

Every booking stores the policy version and a JSON snapshot. A later policy edit does not silently change an existing booking.

## Booking controls

- Resort booking on/off
- USD deposit amount
- Resort IANA timezone
- Minimum advance notice in days
- Default daily capacity
- Date-specific open/closed state and capacity
- Booking and deposit/refund state history

Online payment remains intentionally separate. Resort services are physical services, so Apple In-App Purchase and Google Play Billing are not the correct payment rails. A payment service provider and settlement account must be selected before payment capture is enabled.

## External API

OpenAPI discovery: `GET https://api.divergram.com/api/v1/resort-partner/openapi.json`

Authentication header:

```http
x-resort-api-key: dg_live_xxxxxxxxxxxxxxxxx
```

Available scopes:

- `availability:read`
- `availability:write`
- `bookings:read`
- `bookings:write`

Create an external booking:

```http
POST /api/v1/resorts/{resortId}/bookings
Content-Type: application/json
x-resort-api-key: dg_live_xxxxxxxxxxxxxxxxx

{
  "externalReference": "PMS-BOOKING-2026-0001",
  "bookingDate": "2026-10-20",
  "participants": 2,
  "diveType": "scuba",
  "applicantName": "Guest Name",
  "contactEmail": "guest@example.com",
  "contactPhone": "+1-555-0100",
  "note": "Nitrox requested"
}
```

`contactPhone` is required for every booking and must include the country calling code. The API accepts common separators and stores the normalized E.164 form (for example, `+821012345678`).

## Card payment provider

- Booking deposits use `USD` and the checkout must accept cards only.
- PayPal Standard Checkout can be evaluated in sandbox, but it does not guarantee a card-only guest experience for every buyer.
- Direct card fields through PayPal Expanded Checkout are subject to merchant-country eligibility. Do not enable production payment until the business account is approved for the selected product.
- The server integration must create and capture Orders v2 payments, verify webhook signatures, and reconcile captures and refunds against `app_resort_bookings`.
- Keep `PAYPAL_CLIENT_SECRET` and webhook credentials server-side. Never embed them in the mobile app or admin bundle.

`externalReference` is unique per resort. Retrying the same request returns the existing booking rather than creating a duplicate.

## Release checklist

1. Apply migration `20260904000200_add_resort_partner_operations.sql`.
2. Deploy API and admin frontend.
3. Verify `/partner` login and onboarding without a manager assignment.
4. Approve an application in Admin > Resort Partner and link an existing resort.
5. Verify the approved user can manage only the linked resort.
6. Issue an API key, store it once, and verify scope enforcement.
7. Add the DNS A record, issue TLS, and verify CORS from the new hostname.
8. Finalize privacy retention, refund legal review, payment provider, and settlement account before public launch.
