# Resort Booking System

## Scope

- Admin can mark an operating resort as booking-enabled or booking-disabled individually or in bulk.
- Booking-enabled resorts expose a booking action in the mobile resort detail screen.
- Signed-in members can request a date, party size, dive type, optional product, contact details, and notes.
- Members can view their bookings and cancel only while the booking is pending.
- Admin can search bookings and move them through pending, confirmed, rejected, and completed states.
- Resort-member administrator access is intentionally deferred and is not part of this delivery.

## Data

- `app_profiles.resort_booking_enabled`
- `app_resort_bookings`
- `app_resort_booking_history`

Migration: `api/db/migrations/20260813000100_add_resort_bookings.sql`

## API

- `GET /api/resort-bookings/me`
- `POST /api/resort-bookings`
- `PATCH /api/resort-bookings/:id/cancel`
- `PATCH /api/admin/resorts/booking/bulk`
- `GET /api/admin/resort-bookings`
- `PATCH /api/admin/resort-bookings/:id`

## Operations

1. Apply the migration or restart the API service so boot-time schema creation runs.
2. Enable booking for approved operating resorts in Admin > Resort Management.
3. Process incoming requests in Admin > Resort Bookings.
