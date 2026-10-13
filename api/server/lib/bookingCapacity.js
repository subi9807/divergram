export function dateOnly(value) {
  const text = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) !== text) throw new Error('invalid_booking_date');
  return text;
}

export function todayAt(timezone = 'UTC', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function bookingDateRange(bookingDate, bookingEndDate = bookingDate, maximumDays = 31) {
  const start = dateOnly(bookingDate);
  const end = dateOnly(bookingEndDate || bookingDate);
  if (end < start) throw new Error('invalid_booking_date_range');
  const days = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    if (days.length > maximumDays) throw new Error('resort_booking_range_too_long');
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function reserveCapacity(client, resortId, bookingDate, participants, bookingEndDate = bookingDate) {
  const days = bookingDateRange(bookingDate, bookingEndDate);
  // A resort row exists even when no per-day override has been created.
  const result = await client.query(`SELECT id,resort_booking_enabled,resort_booking_deposit_amount,resort_booking_default_capacity,resort_booking_min_notice_days,resort_booking_timezone FROM app_profiles WHERE id=$1 AND lower(account_type)='resort' FOR UPDATE`, [resortId]);
  const resort = result.rows[0];
  const fail = error => { throw Object.assign(new Error(error), { status: 409 }); };
  if (!resort?.resort_booking_enabled) fail('resort_booking_unavailable');
  const minimum = new Date(`${todayAt(resort.resort_booking_timezone || 'UTC')}T00:00:00Z`);
  minimum.setUTCDate(minimum.getUTCDate() + Math.max(0, Number(resort.resort_booking_min_notice_days) || 0));
  if (days[0] < minimum.toISOString().slice(0, 10)) fail('resort_booking_notice_too_short');
  for (const day of days) {
    const availability = await client.query('SELECT capacity,is_open FROM app_resort_booking_availability WHERE resort_id=$1 AND booking_date=$2 FOR UPDATE', [resortId, day]);
    const slot = availability.rows[0];
    if (slot && !slot.is_open) fail('resort_booking_date_closed');
    const capacity = Number(slot ? slot.capacity : resort.resort_booking_default_capacity ?? 20);
    const occupied = await client.query("SELECT COALESCE(SUM(participants),0)::int total FROM app_resort_bookings WHERE resort_id=$1 AND booking_date<=$2 AND COALESCE(booking_end_date,booking_date)>=$2 AND status IN ('pending','confirmed')", [resortId, day]);
    if (Number(occupied.rows[0].total) + participants > capacity) fail('resort_booking_capacity_exceeded');
  }
  return resort;
}

export async function setBookingAvailability(pool, resortId, bookingDate, capacity, isOpen, note, createdBy = null) {
  const day = dateOnly(bookingDate);
  if (!Number.isInteger(capacity) || capacity < 0) throw Object.assign(new Error('invalid_booking_capacity'), { status: 400 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resort = await client.query('SELECT id FROM app_profiles WHERE id=$1 FOR UPDATE', [resortId]);
    if (!resort.rows.length) throw Object.assign(new Error('resort_not_found'), { status: 404 });
    const occupied = await client.query("SELECT COALESCE(SUM(participants),0)::int total FROM app_resort_bookings WHERE resort_id=$1 AND booking_date<=$2 AND COALESCE(booking_end_date,booking_date)>=$2 AND status IN ('pending','confirmed')", [resortId, day]);
    if (capacity < Number(occupied.rows[0].total)) throw Object.assign(new Error('capacity_below_existing_bookings'), { status: 409 });
    const result = await client.query(`INSERT INTO app_resort_booking_availability(resort_id,booking_date,capacity,is_open,note,created_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(resort_id,booking_date) DO UPDATE SET capacity=$3,is_open=$4,note=$5,updated_at=now() RETURNING *`, [resortId, day, capacity, isOpen, note, createdBy]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
