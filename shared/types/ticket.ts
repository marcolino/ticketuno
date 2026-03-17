export type TicketValidationStatus = 'valid' | 'invalid' | 'already_used' | 'error';

export type TicketType = 'standard' | 'vip' | 'premium' | 'student' | 'press';

export interface TicketValidationResult {
  code?: string;
  status: TicketValidationStatus;
  label: string; // Human-readable message from the server
  detail?: { // Only present on `valid` — useful for display
    holderName?: string;
    seat: string;
    row: string;
    show: string;
  };
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

/** Body expected on POST /qrcode/encode */
export interface EncodeTicketRequest {
  reservationId: string; // 16-char unique booking reference

  customerName: string; // Full name printed on ticket
  customerEmail: string; // For confirmation / fraud checks

  companyName: string; // e.g. 'Broadway Productions Inc.'

  eventName: string; // e.g. 'The Phantom of the Opera'
  venue: string; // e.g. 'Grand Theater – Main Hall'
  eventDate: string; // ISO date  YYYY-MM-DD
  eventTime: string; // 24-hour   HH:MM

  seat: string; // e.g. 'C12'
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

export interface DecodeTicketResult {
  status: TicketValidationStatus,
  ticket?: Omit<TicketPayload, 'sig'>; // Payload without the raw signature
  error?: string;
}

export interface ShowInfo {
  /** e.g. "ROYAL OPERA HOUSE" */
  theater: string;
  /** Main title line, e.g. "La Traviata" */
  titleLine1: string;
  /** Sub-title line, e.g. "by Verdi" */
  titleLine2: string;
  /** Subtitle/tagline, e.g. "A New Production" */
  subtitle: string;
  /** e.g. "April 18, 2025" */
  date: string;
  /** e.g. "Friday" */
  dayOfWeek: string;
  /** e.g. "7:30" (the "PM Sharp" suffix is appended automatically) */
  time: string;
  /** e.g. "2h 45m" */
  duration: string;
  /** Full venue name */
  venue: string;
  /** Street / city address */
  address: string;
  /** Lead performer name */
  lead: string;
  /** Lead performer role */
  leadRole: string;
  /** Supporting performer line */
  supporting: string;
  /** e.g. "6:45 PM" */
  doorsOpen: string;
  /** e.g. "Smart Casual" */
  dress: string;
}

export interface SeatInfo {
  /** Unique booking reference, used in the QR payload */
  bookingRef: string;
  /** e.g. "D14" */
  seat: string;
  /** e.g. "Premium Stalls" */
  row: string;
  /** e.g. "Circle" */
  tier: string;
  /** e.g. "Gate B" */
  gate: string;
  /** e.g. "£ 185.00" */
  price: string;
  /** Required when `nominal` is true */
  holderName?: string;
}

export interface BookingRequest {
  show: ShowInfo;
  seats: SeatInfo[];
  nominal?: boolean; // When true the ticket holder's name is printed on ticket, otherwise it is omitted
}