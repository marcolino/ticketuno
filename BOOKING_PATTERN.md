Currenly implemented pattern for multiple bookings: one booking per seat.

Industry-standard pattern for multiple bookings: order + line items.

The pattern used by almost all serious ticketing systems (Ticketmaster, Eventbrite, etc.) is two-tiered:

 - reservations (or orders): 1 row per checkout, with the only ID that communicates with Stripe
 - reservation_seats (or tickets): 1 row per seat, with its own booking_ref/QR, its own scanned_at,
   FK to reservation_id

This is the right pattern: it solves the Stripe problem (a single reservationId in metadata, always short)
and keeps everything you currently have per-seat (scan, QR, granular deletion) — simply moved to
the child table instead of duplicating it on separate "bookings" rows.
