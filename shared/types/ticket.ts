export type TicketValidationStatus = 'valid' | 'invalid' | 'already_used' | 'error';

export interface TicketValidationResult {
  code: string;
  status: TicketValidationStatus;
  label: string; // Human-readable message from the server
}

export interface TicketScanEntry {
  id: string; // Stable key for React
  code: string;
  status: TicketValidationStatus;
  label: string;
  timestamp: Date;
  duplicateCount: number; // How many consecutive re-scans of this same code
  pending: boolean; // True while the server call is in flight
}

//////////////////////////////////////////////////////////////

export type TicketType = "standard" | "vip" | "premium" | "student" | "press";

/** Body expected on POST /qrcode/encode */
export interface EncodeTicketRequest {
  reservationId: string; // 16-char unique booking reference

  customerName: string; // Full name printed on ticket
  customerEmail: string; // For confirmation / fraud checks

  companyName: string; // e.g. "Broadway Productions Inc."

  eventName: string; // e.g. "The Phantom of the Opera"
  venue: string; // e.g. "Grand Theater – Main Hall"
  eventDate: string; // ISO date  YYYY-MM-DD
  eventTime: string; // 24-hour   HH:MM

  seat: string; // e.g. "C12"
  ticketType: TicketType; // Determines privileges at the door
}

/** Compact keys keep the QR payload small while staying self-describing */
export interface TicketPayload {
  rid: string; // reservationId
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

//export type DecodeStatus = "VALID" | "INVALID_SIGNATURE" | "UNREADABLE";

export interface DecodeTicketResult {
  //status: DecodeStatus;
  status: TicketValidationStatus,
  ticket?: Omit<TicketPayload, "sig">; // Payload without the raw signature
  error?: string;
}
