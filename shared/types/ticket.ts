// ─── Ticket Field Types ───────────────────────────────────────────────────────

export type TicketType = "STANDARD" | "VIP" | "PREMIUM" | "STUDENT" | "PRESS";

// ─── Inbound Request ──────────────────────────────────────────────────────────

/** Body expected on POST /qrcode/encode */
export interface EncodeTicketRequest {
  // Booking identity
  reservationId: string; // 16-char unique booking reference

  // Customer
  customerName: string; // Full name printed on ticket
  customerEmail: string; // For confirmation / fraud checks

  // Company / Organizer
  companyName: string; // e.g. "Broadway Productions Inc."

  // Event
  eventName: string; // e.g. "The Phantom of the Opera"
  venue: string; // e.g. "Grand Theater – Main Hall"
  eventDate: string; // ISO date  YYYY-MM-DD
  eventTime: string; // 24-hour   HH:MM

  // Seat (one QR per seat)
  seat:          string; // e.g. "C12"
  ticketType:    TicketType;   // Determines privileges at the door
}

// ─── Signed Payload (what goes into the QR) ───────────────────────────────────

/** Compact keys keep the QR payload small while staying self-describing */
export interface TicketPayload {
  rid:  string; // reservationId
  cName: string; // customerName
  cEmail: string; // customerEmail
  org: string; // companyName
  event: string; // eventName
  venue: string; // venue
  date: string; // eventDate
  time: string; // eventTime
  seat: string; // single seat
  type: TicketType; // ticketType
  iat: number; // issued-at unix timestamp (seconds)
  sig: string; // HMAC-SHA256 hex signature
}

// ─── Decode Result ────────────────────────────────────────────────────────────

export type DecodeStatus = "VALID" | "INVALID_SIGNATURE" | "UNREADABLE";

export interface DecodeTicketResult {
  status:  DecodeStatus;
  ticket?: Omit<TicketPayload, "sig">;  // payload without the raw signature
  error?:  string;
}
