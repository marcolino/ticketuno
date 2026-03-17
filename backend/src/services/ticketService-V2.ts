/**
 * @file ticketService.ts
 * @description Generates one print-ready PDF ticket per seat.
 *              Tickets can be nominal (holder name printed) or anonymous.
 *              All PDFs are returned as in-memory Buffers — no filesystem I/O.
 *
 * @example
 *   import { generateTickets } from './services/ticketService';
 *   const pdfs: Buffer[] = await generateTickets(booking); // one per seat
 *
 * Dependencies (install once):
 *   npm install pdfkit qrcode
 *   npm install --save-dev @types/pdfkit @types/qrcode
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { sign } from './hmacService';
import { i18n } from '../i18n';

// ─── Domain types ─────────────────────────────────────────────────────────────
// TODO: to types...
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
  /**
   * When `true`, the ticket holder's name is printed on every ticket.
   * When `false` (default), the holder chip is omitted entirely.
   */
  nominal?: boolean;
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  gold: '#B8912A',
  goldLight: '#D4A830',
  goldDim: '#8A6010',
  text: '#1A1A1A',
  textMid: '#444444',
  textLight: '#666666',
  white: '#FFFFFF',
  offWhite: '#FAFAF8',
  stubBg: '#F5F0E8',
  border: '#D4A830',
  perf: '#CCCCCC',
} as const;

// ─── Layout constants (points — 1 pt = 1/72 inch) ────────────────────────────

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const TKT_W = PAGE_W - MARGIN * 2; // 515 pt
const TKT_H = 260;
const TKT_X = MARGIN;
const TKT_Y = (PAGE_H - TKT_H) / 2;
const STUB_W = 170;
const MAIN_W = TKT_W - STUB_W; // 345 pt
const PERF_X = TKT_X + MAIN_W;
const STUB_X = PERF_X + 4;
const RADIUS = 6;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

/** Renders a horizontal gradient gold bar across the full ticket width */
function goldBar(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h = 4): void {
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const a = t < 0.12 ? t / 0.12 : t > 0.88 ? (1 - t) / 0.12 : 1;
    const b = 1 - Math.abs(t - 0.5) * 0.5;
    const rr = Math.round(0x8A + (0xD4 - 0x8A) * b * a);
    const gg = Math.round(0x60 + (0xA8 - 0x60) * b * a);
    const bb = Math.round(0x10 + (0x30 - 0x10) * b * a);
    const hex = `#${[rr, gg, bb].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    doc.rect(x + i * (w / steps), y, w / steps + 1, h).fill(hex);
  }
}

/** Draws a hairline rule */
function rule(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number,
  color = C.border,
  opacity = 0.25,
): void {
  doc.save().opacity(opacity)
     .moveTo(x, y).lineTo(x + w, y)
     .lineWidth(0.5).strokeColor(color).stroke()
     .restore();
}

/** Renders a small-caps field label */
function drawLabel(
  doc: PDFKit.PDFDocument,
  text: string, x: number, y: number,
  color = C.goldDim,
): void {
  doc.fontSize(6.5).font('Helvetica').fillColor(color)
     .text(text.toUpperCase(), x, y, { characterSpacing: 1.5 });
}

/** Renders ornamental centred diamonds inside the main body column */
function ornament(doc: PDFKit.PDFDocument, y: number): void {
  doc.fontSize(9).font('Helvetica').fillColor(C.goldDim)
     .opacity(0.45).text('◆  ◇  ◆', TKT_X, y, { width: MAIN_W, align: 'center' })
     .opacity(1);
}

/** Generates a QR code PNG as an in-memory Buffer */
async function makeQR(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    type: 'png',
    width: 120,
    margin: 2,
    color: { dark: '#1A1A1A', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
}

// ─── Core drawing routine ─────────────────────────────────────────────────────

async function drawTicket(
  doc: PDFKit.PDFDocument,
  show: ShowInfo,
  seat: SeatInfo,
  nominal: boolean,
): Promise<void> {
  const y0 = TKT_Y;

  // ── Shell ─────────────────────────────────────────────────────────────────
  // Drop shadow
  doc.save().opacity(0.07)
     .roundedRect(TKT_X + 4, y0 + 7, TKT_W, TKT_H, RADIUS).fill('#000000')
     .restore();

  // Background panels
  doc.roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).fill(C.white);
  doc.rect(TKT_X, y0, MAIN_W, TKT_H).fill(C.offWhite);

  // Outer border
  doc.roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS)
     .lineWidth(1).strokeColor(C.border).stroke();

  // Gold bars — clipped so they don't bleed past rounded corners
  doc.save().roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).clip();
  goldBar(doc, TKT_X, y0,              TKT_W);
  goldBar(doc, TKT_X, y0 + TKT_H - 4, TKT_W);
  doc.restore();

  // ── Perforation ───────────────────────────────────────────────────────────
  doc.save().opacity(0.35);
  for (let dy = y0 + 14; dy < y0 + TKT_H - 14; dy += 11) {
    doc.moveTo(PERF_X, dy).lineTo(PERF_X, dy + 6)
       .lineWidth(0.8).strokeColor(C.perf).stroke();
  }
  doc.restore();

  // Punch holes
  for (const py of [y0 + 7, y0 + TKT_H - 7]) {
    doc.circle(PERF_X, py, 9).fill(C.white)
       .circle(PERF_X, py, 9).lineWidth(0.5).strokeColor(C.perf).stroke();
  }

  // ── Stub panel ────────────────────────────────────────────────────────────
  doc.save().roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).clip();
  doc.rect(STUB_X, y0, STUB_W, TKT_H).fill(C.stubBg);
  doc.restore();

  doc.save().opacity(0.18)
     .moveTo(STUB_X, y0 + 10).lineTo(STUB_X, y0 + TKT_H - 10)
     .lineWidth(0.5).strokeColor(C.border).stroke()
     .restore();

  // ── Main body ─────────────────────────────────────────────────────────────
  let cy = y0 + 14;

  // Theater name
  doc.fontSize(7).font('Helvetica').fillColor(C.gold)
     .text(show.theater.toUpperCase(), TKT_X, cy,
       { width: MAIN_W, align: 'center', characterSpacing: 3 });
  rule(doc, TKT_X + 20, cy + 10, MAIN_W - 40/*, C.goldDim, 0.3*/);
  cy += 20;

  // Title
  doc.fontSize(30).font('Helvetica-BoldOblique').fillColor(C.text)
     .text(show.titleLine1, TKT_X, cy, { width: MAIN_W, align: 'center', lineGap: -2 });
  cy += 35;

  doc.fontSize(26).font('Helvetica-Oblique').fillColor(C.goldLight)
     .text(show.titleLine2, TKT_X, cy, { width: MAIN_W, align: 'center' });
  cy += 30;

  // Subtitle
  doc.fontSize(6.5).font('Helvetica').fillColor(C.textLight)
     .text(show.subtitle.toUpperCase(), TKT_X, cy,
       { width: MAIN_W, align: 'center', characterSpacing: 2 });
  cy += 14;

  ornament(doc, cy);
  cy += 14;

  // ── Date / Time / Duration cells ──────────────────────────────────────────
  interface Cell { lbl: string; val: string; sub: string }
  const cellW = (MAIN_W - 20) / 3;
  const cells: Cell[] = [
    { lbl: i18n.t('Date'), val: show.date, sub: show.dayOfWeek },
    { lbl: i18n.t('Time'), val: show.time, sub: i18n.t('PM Sharp') },
    { lbl: i18n.t('Duration'), val: show.duration, sub: i18n.t('Incl. Interval') },
  ];

  // Cell grid
  doc.save().opacity(0.15)
     .rect(TKT_X + 10, cy, MAIN_W - 20, 54).lineWidth(0.5).strokeColor(C.goldDim).stroke();
  ([1, 2] as const).forEach(i =>
    doc.moveTo(TKT_X + 10 + cellW * i, cy + 6)
       .lineTo(TKT_X + 10 + cellW * i, cy + 48)
       .lineWidth(0.5).strokeColor(C.goldDim).stroke()
  );
  doc.restore();

  cells.forEach(({ lbl, val, sub }, i) => {
    const cx = TKT_X + 10 + cellW * i;
    doc.fontSize(6).font('Helvetica').fillColor(C.goldDim)
       .text(lbl.toUpperCase(), cx, cy + 6,  { width: cellW, align: 'center', characterSpacing: 1.5 });
    doc.fontSize(15).font('Helvetica-BoldOblique').fillColor(C.text)
       .text(val,               cx, cy + 17, { width: cellW, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor(C.textLight)
       .text(sub,               cx, cy + 36, { width: cellW, align: 'center' });
  });
  cy += 62;

  // ── Venue / Cast ──────────────────────────────────────────────────────────
  const halfW = (MAIN_W - 30) / 2;
  const col2X = TKT_X + 15 + halfW + 10;

  drawLabel(doc, i18n.t('Venue'), TKT_X + 15, cy);
  cy += 10;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.text)
     .text(show.venue,   TKT_X + 15, cy,      { width: halfW });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.address, TKT_X + 15, cy + 12, { width: halfW });

  drawLabel(doc, 'Starring', col2X, cy - 10);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.text)
     .text(show.lead,        col2X, cy,      { width: halfW });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.leadRole,    col2X, cy + 12, { width: halfW });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.supporting,  col2X, cy + 22, { width: halfW });

  cy += 44;
  rule(doc, TKT_X + 10, cy, MAIN_W - 20);
  cy += 8;

  // ── Booking chips ─────────────────────────────────────────────────────────
  interface Chip { lbl: string; val: string }
  const chips: Chip[] = [
    { lbl: i18n.t('Booking Ref'), val: seat.bookingRef },
    { lbl: i18n.t('Seat'), val: seat.seat },
    { lbl: i18n.t('Row'), val: seat.row },
    { lbl: i18n.t('Price'), val: seat.price },
    ...(nominal && seat.holderName
      ? [{ lbl: i18n.t('Ticket Holder'), val: seat.holderName }]
      : []),
  ];

  const chipW = (MAIN_W - 20 - (chips.length - 1) * 5) / chips.length;

  chips.forEach(({ lbl, val }, i) => {
    const cx = TKT_X + 10 + i * (chipW + 5);
    doc.save().opacity(0.07).rect(cx, cy, chipW, 36).fill(C.goldDim).restore();
    doc.rect(cx, cy, chipW, 36).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.fontSize(6).font('Helvetica').fillColor(C.goldDim)
       .text(lbl.toUpperCase(), cx + 4, cy + 5,  { width: chipW - 8, characterSpacing: 1 });
    doc.fontSize(lbl === i18n.t('Ticket Holder') ? 7.5 : 9).font('Helvetica-Bold').fillColor(C.text)
       .text(val,                cx + 4, cy + 17, { width: chipW - 8 });
  });

  // ── Stub ──────────────────────────────────────────────────────────────────
  const stubCX = STUB_X + STUB_W / 2;
  const qrSize = 100;

  const raw = {
    ref: seat.bookingRef,
    title: show.titleLine1,
    seat: seat.seat,
    row: seat.row,
  };
  const sig = sign(raw); // sign the raw payload
  // Serialize as a query-string so the scanner gets a plain string
  const qrString = new URLSearchParams({ ...raw, sig }).toString();
  const qrBuf = await makeQR(qrString);
  /**
   * The resulting QR encodes something like:
   *   ref = TKT-001 & row=Premium + Stalls & seat=D14 & title=La + Traviata & sig=3a9f...
   */
  // const qrBuf = await makeQR(`${seat.bookingRef}|${show.titleLine1}|${seat.seat}|${seat.row}`);

  const qrX = stubCX - qrSize / 2;
  const qrY = y0 + 22;

  // QR frame + image
  doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10)
     .lineWidth(1).strokeColor(C.gold).fill(C.white);
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

  // Scan prompt
  doc.fontSize(6).font('Helvetica').fillColor(C.gold)
     .text(i18n.t('SCAN TO VERIFY'), STUB_X, qrY + qrSize + 8,
       { width: STUB_W, align: 'center', characterSpacing: 1.5 });
  doc.fontSize(7).font('Helvetica').fillColor(C.textMid)
     .text(seat.bookingRef, STUB_X, qrY + qrSize + 18,
       { width: STUB_W, align: 'center' });

  rule(doc, STUB_X + 10, qrY + qrSize + 32, STUB_W - 20/*, C.goldDim, 0.3*/);

  // Stub detail rows
  const stubRows: [string, string][] = [
    [i18n.t('Tier'), seat.tier ],
    [i18n.t('Gate'), seat.gate ],
    [i18n.t('Doors'), show.doorsOpen],
    [i18n.t('Dress'), show.dress ],
  ];
  let sy = qrY + qrSize + 40;
  for (const [lbl, val] of stubRows) {
    doc.fontSize(6).font('Helvetica').fillColor(C.gold)
       .text(lbl.toUpperCase(), STUB_X, sy,
         { width: STUB_W, align: 'center', characterSpacing: 1.5 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.text)
       .text(val, STUB_X, sy + 8, { width: STUB_W, align: 'center' });
    sy += 25;
  }

  // Footer disclaimer
  doc.fontSize(6).font('Helvetica').fillColor(C.textLight)
     .text(
       i18n.t('Non-transferable') + '  ·  ' +
       i18n.t('Present QR at entrance') + '  ·  ' +
       i18n.t('No re-admission after start time'),
       TKT_X, y0 + TKT_H + 10,
       { width: TKT_W, align: 'center', characterSpacing: 0.5 },
     );
}

// ─── Buffer helper ────────────────────────────────────────────────────────────

/**
 * Serialises a PDFDocument to an in-memory Buffer without touching the
 * filesystem.  The document is ended inside this helper.
 */
function pdfToBuffer(
  doc: PDFKit.PDFDocument,
  drawFn: (d: PDFKit.PDFDocument) => Promise<void>,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));
    drawFn(doc)
      .then(() => doc.end())
      .catch(reject);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates one print-ready PDF ticket per seat.
 *
 * @returns One `Buffer` per seat (same order as `booking.seats`), containing a
 *          complete, self-contained A4 PDF — ready to be attached inline to a
 *          transactional email or streamed directly to a client response.
 *
 * @throws  If QR code generation or PDF rendering fails for any seat.
 *
 * @example
 *   // Attach as inline email parts (e.g. with Nodemailer)
 *   const pdfs = await generateTickets(booking);
 *   const attachments = pdfs.map((buf, i) => ({
 *     filename:    `ticket-${booking.seats[i].bookingRef}.pdf`,
 *     content:     buf,
 *     contentType: 'application/pdf',
 *     encoding:    'base64',            // Nodemailer will base64-encode it
 *   }));
 *
 * @example
 *   // Stream single ticket to an Express response
 *   const [pdf] = await generateTickets({ show, seats: [seat] });
 *   res.setHeader('Content-Type', 'application/pdf');
 *   res.setHeader('Content-Disposition', `inline; filename="${seat.bookingRef}.pdf"`);
 *   res.end(pdf);
 */
export async function generateTickets(booking: BookingRequest): Promise<Buffer[]> {
  const { show, seats, nominal = false } = booking;

  if (nominal) {
    const missing = seats.filter(s => !s.holderName).map(s => s.bookingRef);
    if (missing.length > 0) {
      throw new Error(
        i18n.t('ticket is nominal but holder name is missing for booking refs: {{miss}}', { miss: missing.join(', ') })
      );
    }
  }

  return Promise.all(
    seats.map(seat => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `${show.titleLine1} ${show.titleLine2} — ${seat.bookingRef}`,
          Author: show.theater,
          Subject: i18n.t('Seat') + seat.seat + ' · ' + seat.row,
        },
      });

      return pdfToBuffer(doc, d => drawTicket(d, show, seat, nominal));
    }),
  );
}
