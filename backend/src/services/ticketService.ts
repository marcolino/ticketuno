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
 *
 * BookingRequest (update shared/types/ticket.ts accordingly):
 *   - bookingIsPaid?: boolean   — defaults true; if false the Price chip shows "--"
 *   - useQrcode?: boolean       — defaults true; if false the stub shows show.poster
 *                                 instead of a QR code
 *
 * ShowInfo (update shared/types/ticket.ts accordingly):
 *   - poster: string            — local path of the show's poster image
 *
 * SeatInfo.seat is expected in the form "Section-Row-Number" (e.g. "Platea-A-1").
 * The service parses it into individual chips automatically.
 */

import fs from 'fs/promises';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { sign } from './hmacService';
import { i18n } from '../i18n';
import { ShowInfo, SeatInfo, BookingRequest } from '@ticketuno/shared';
import config from '../config';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  gold:      '#B8912A',
  goldLight: '#D4A830',
  goldDim:   '#8A6010',
  text:      '#1A1A1A',
  textMid:   '#444444',
  textLight: '#666666',
  white:     '#FFFFFF',
  offWhite:  '#FAFAF8',
  stubBg:    '#F5F0E8',
  border:    '#D4A830',
  perf:      '#CCCCCC',
} as const;

// ─── Layout constants (points — 1 pt = 1/72 inch) ────────────────────────────

const PAGE_W  = 595;
const PAGE_H  = 842;
const MARGIN  = 40;
const TKT_W   = PAGE_W - MARGIN * 2;   // 515 pt
const TKT_H   = 300;                    // reduced from 330 — leaner without poster in body
const TKT_X   = MARGIN;
const TKT_Y   = (PAGE_H - TKT_H) / 2;
const STUB_W  = 170;
const MAIN_W  = TKT_W - STUB_W;        // 345 pt
const PERF_X  = TKT_X + MAIN_W;
const STUB_X  = PERF_X + 4;
const RADIUS  = 6;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

/** Renders a horizontal gradient gold bar */
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
  x: number,
  y: number,
  w: number,
  color = C.border,
  opacity = 0.25,
): void {
  doc.save()
    .opacity(opacity)
    .moveTo(x, y)
    .lineTo(x + w, y)
    .lineWidth(0.5)
    .strokeColor(color)
    .stroke()
    .restore();
}

/**
 * Decorative section divider (lines + filled rectangles, no Unicode glyphs).
 */
function ornament(doc: PDFKit.PDFDocument, y: number, maxWidth = MAIN_W): void {
  const cx  = TKT_X + maxWidth / 2;
  const sq  = 3;
  const gap = 7;

  doc.save().opacity(0.35);

  doc.moveTo(TKT_X + 22, y).lineTo(cx - gap - sq, y)
     .lineWidth(0.5).strokeColor(C.goldDim).stroke();

  doc.moveTo(cx + gap + sq, y).lineTo(TKT_X + maxWidth - 22, y)
     .lineWidth(0.5).strokeColor(C.goldDim).stroke();

  for (const dx of [-55, 0, 55]) {
    doc.save()
      .translate(cx + dx, y)
      .rotate(45)
      .rect(-sq / 2, -sq / 2, sq, sq)
      .fill(C.goldDim)
      .restore();
  }

  doc.restore();
}

/** Renders a small-caps field label */
function drawLabel(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  color = C.goldDim,
): void {
  doc.fontSize(6.5).font('Helvetica').fillColor(color)
    .text(text.toUpperCase(), x, y, { characterSpacing: 1.5 });
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

/**
 * Parses a compound seat identifier of the form "Section-Row-Number"
 * (e.g. "Platea-A-1") into its three parts.
 * Falls back gracefully when the format differs.
 */
function parseSeat(seat: string): { section: string; row: string; chairNumber: string } {
  const parts = seat.split('-');
  if (parts.length >= 3) {
    return {
      section: parts.slice(0, parts.length - 2).join('-'),
      row: parts[parts.length - 2],
      chairNumber: parts[parts.length - 1],
    };
  }
  if (parts.length === 2) {
    return { section: parts[0], row: parts[1], chairNumber: '' };
  }
  return { section: seat, row: '', chairNumber: '' };
}

// ─── Core drawing routine ─────────────────────────────────────────────────────
type TranslateFunction = (key: string, opts?: Record<string, unknown>) => string;

async function drawTicket(
  doc: PDFKit.PDFDocument,
  show: ShowInfo,
  seat: SeatInfo,
  nominal: boolean,
  bookingIsPaid: boolean,
  useQrcode: boolean,
  t: TranslateFunction,
): Promise<void> {
  const y0 = TKT_Y;

  // ── Pre-fetch poster (used in stub in both modes) ─────────────────────────
  const posterBuf: Buffer | null = show.poster
    ? await fs.readFile(show.poster).catch(() => null)
    : null
  ;
  const logoBuf: Buffer | null = show.logo
    ? await fs.readFile(show.logo).catch(() => null)
    : null
  ;

  // ── Shell ─────────────────────────────────────────────────────────────────
  // Drop shadow
  doc.save()
    .opacity(0.07)
    .roundedRect(TKT_X + 4, y0 + 7, TKT_W, TKT_H, RADIUS).fill('#000000')
    .restore();

  // Background fills
  doc.roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).fill(C.white);
  doc.rect(TKT_X, y0, MAIN_W, TKT_H).fill(C.offWhite);

  // Border
  doc.roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS)
    .lineWidth(1).strokeColor(C.border).stroke();

  // Gold bars clipped to rounded corners
  doc.save()
    .roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS)
    .clip();
  goldBar(doc, TKT_X, y0, TKT_W);
  goldBar(doc, TKT_X, y0 + TKT_H - 4, TKT_W);
  doc.restore();

  // ── Perforation — dashed line ─────────────────────────────────────────────
  doc.save().opacity(0.28);
  for (let dy = y0 + 8; dy < y0 + TKT_H - 8; dy += 11) {
    doc.moveTo(PERF_X, dy)
      .lineTo(PERF_X, dy + 6)
      .lineWidth(0.8)
      .strokeColor(C.perf)
      .stroke();
  }
  doc.restore();

  // ── Stub background ───────────────────────────────────────────────────────
  doc.save().roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).clip();
  doc.rect(STUB_X, y0, STUB_W, TKT_H).fill(C.stubBg);
  doc.restore();

  doc.save()
    .opacity(0.18)
    .moveTo(STUB_X, y0 + 10)
    .lineTo(STUB_X, y0 + TKT_H - 10)
    .lineWidth(0.5)
    .strokeColor(C.border)
    .stroke()
    .restore();

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN BODY
  // Poster is always in the stub — the full MAIN_W is always available here.
  // ─────────────────────────────────────────────────────────────────────────

  let cy = y0 + 12;

  // Theater name
  doc.fontSize(7).font('Helvetica').fillColor(C.gold)
     .text(show.theater.toUpperCase(), TKT_X, cy,
       { width: MAIN_W, align: 'center', characterSpacing: 3 });
  rule(doc, TKT_X + 20, cy + 10, MAIN_W - 40);
  cy += 18;

  // Title line 1 — large italic
  doc.fontSize(28).font('Helvetica-BoldOblique').fillColor(C.text)
     .text(show.titleLine1, TKT_X, cy, { width: MAIN_W, align: 'center', lineGap: -2 });
  cy += 32;

  // Title line 2 — subtitle
  doc.fontSize(15).font('Helvetica-Oblique').fillColor(C.goldLight)
     .text(show.titleLine2, TKT_X, cy, { width: MAIN_W, align: 'center' });
  cy += 20;

  // Tagline
  doc.fontSize(6.5).font('Helvetica').fillColor(C.textLight)
     .text(show.subtitle.toUpperCase(), TKT_X, cy,
       { width: MAIN_W, align: 'center', characterSpacing: 2 });
  cy += 13;

  ornament(doc, cy);
  cy += 12;

  // ── Date / Time / Duration cells ──────────────────────────────────────────
  interface Cell { lbl: string; val: string; sub: string }
  const cellW    = (MAIN_W - 20) / 3;
  const cellBoxH = 50;
  const cells: Cell[] = [
    { lbl: t('Date'), val: show.date, sub: show.dayOfWeek },
    { lbl: t('Time'), val: show.time, sub: t('Sharp') },
    { lbl: t('Duration'), val: show.duration, sub: t('Included Interval') },
  ];

  doc.save().opacity(0.15)
    .rect(TKT_X + 10, cy, MAIN_W - 20, cellBoxH)
    .lineWidth(0.5).strokeColor(C.goldDim).stroke();
  ([1, 2] as const).forEach(i =>
    doc.moveTo(TKT_X + 10 + cellW * i, cy + 5)
       .lineTo(TKT_X + 10 + cellW * i, cy + cellBoxH - 5)
       .lineWidth(0.5).strokeColor(C.goldDim).stroke()
  );
  doc.restore();

  cells.forEach(({ lbl, val, sub }, i) => {
    const cx = TKT_X + 10 + cellW * i;
    doc.fontSize(6).font('Helvetica').fillColor(C.goldDim)
       .text(lbl.toUpperCase(), cx, cy + 5,
         { width: cellW, align: 'center', characterSpacing: 1.5 });
    doc.fontSize(14).font('Helvetica-BoldOblique').fillColor(C.text)
       .text(val, cx, cy + 16, { width: cellW, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor(C.textLight)
       .text(sub, cx, cy + 34, { width: cellW, align: 'center' });
  });
  cy += cellBoxH + 8;

  // ── Theater / Cast ──────────────────────────────────────────────────────────
  const halfW = (MAIN_W - 30) / 2;
  const col2X = TKT_X + 15 + halfW + 10;

  drawLabel(doc, t('Theater'), TKT_X + 15, cy);
  drawLabel(doc, t('Starring'), col2X, cy);
  cy += 9;

  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text)
     .text(show.theater, TKT_X + 15, cy, { width: halfW });
  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text)
     .text(show.lead,  col2X, cy, { width: halfW });

  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.address,  TKT_X + 15, cy + 12, { width: halfW });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.leadRole, col2X, cy + 12, { width: halfW });
  cy += 38;

  if (logoBuf) {
    const logoSize = 20;
    doc.image(logoBuf, TKT_X + 12, y0 + 10, { fit: [logoSize, logoSize] });
  }

  rule(doc, TKT_X + 10, cy, MAIN_W - 20);
  cy += 8;

  // ── Booking chips ─────────────────────────────────────────────────────────
  //
  // Order: Booking Ref | Seat | Level | Row | Chair | Price
  //
  // Ref is widest, Seat is medium, the four detail chips are narrow.
  // Widths are distributed by weight so all six fit cleanly in MAIN_W.
  //
  const { chairNumber } = parseSeat(seat.seat);

  interface Chip { lbl: string; val: string }
  const chips: Chip[] = [
    { lbl: t('Booking Ref'), val: seat.bookingRef },
    { lbl: t('Seat'), val: seat.seat },
    { lbl: t('Level'), val: seat.tier },
    { lbl: t('Row'), val: seat.row },
    { lbl: t('Chair'), val: chairNumber || seat.seat },
    { lbl: t('Price'), val: bookingIsPaid ? seat.price : '--' },
  ];

  const GAP = 4;
  const totalArea = MAIN_W - 20 - (chips.length - 1) * GAP;
  // Ref is widest, Seat is medium, the four detail chips are narrow
  const CHIP_WEIGHTS = [1.7, 1.2, 1.0, 1.0, 1.0, 1.0];
  const totalWeight = CHIP_WEIGHTS.reduce((a, b) => a + b, 0);
  const chipWidths = CHIP_WEIGHTS.map(w => (w / totalWeight) * totalArea);

  const chipH = 32;

  chips.forEach(({ lbl, val }, i) => {
    const chipW = chipWidths[i];
    const cx = TKT_X + 10
             + chipWidths.slice(0, i).reduce((a, b) => a + b, 0)
             + i * GAP;

    doc.save().opacity(0.07).rect(cx, cy, chipW, chipH).fill(C.goldDim).restore();
    doc.rect(cx, cy, chipW, chipH).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.fontSize(5.5).font('Helvetica').fillColor(C.goldDim)
       .text(lbl.toUpperCase(), cx + 3, cy + 4,
         { width: chipW - 6, characterSpacing: 0.8 });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.text)
       .text(val, cx + 3, cy + 15, { width: chipW - 6 });
  });
  cy += chipH + 5;

  // ── Attendee name (nominal tickets only) ──────────────────────────────────
  if (seat.holderName) {
    const holderH = 26;
    const hx = TKT_X + 10;
    const hw = MAIN_W - 20;

    doc.save().opacity(0.06).rect(hx, cy, hw, holderH).fill(C.gold).restore();
    doc.rect(hx, cy, hw, holderH).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.fontSize(6).font('Helvetica').fillColor(C.goldDim)
       .text(t('Ticket Holder').toUpperCase(), hx + 6, cy + 4, { characterSpacing: 1 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text)
       .text(seat.holderName, hx, cy + 14, { width: hw, align: 'center' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STUB
  //
  // useQrcode=true:
  //   ┌──────────────────┐
  //   │   QR code        │
  //   │ SCAN TO VERIFY   │
  //   │ booking ref      │
  //   │ ──────────────── │
  //   │   poster image   │  ← fit [innerW × remaining height], aspect preserved,
  //   │   (centered,     │    centered, no background (stubBg shows through)
  //   │    no bg)        │
  //   └──────────────────┘
  //   Gate/Doors/Dress mini-cells at very bottom if present.
  //
  // useQrcode=false:
  //   ┌──────────────────┐
  //   │   poster image   │  ← fit, centered, no background
  //   │ ──────────────── │
  //   │  Booking Ref     │
  //   │  Gate (if any)   │
  //   └──────────────────┘
  //
  // Level/Tier has moved to the main-body chips — not repeated in the stub.
  // ─────────────────────────────────────────────────────────────────────────

  const stubPad = 10;
  const innerW = STUB_W - stubPad * 2;
  const stubFloor = y0 + TKT_H - 12;

  if (useQrcode) {
    // ── QR code ──────────────────────────────────────────────────────────────
    const qrSize = 96;
    const qrX = STUB_X + (STUB_W - qrSize) / 2;
    const qrY = y0 + 16;

    const raw = {
      ref: seat.bookingRef,
      title: show.titleLine1,
      seat: seat.seat,
      row: seat.row,
    };
    const sig = sign(raw);
    const qrString = new URLSearchParams({ ...raw, sig }).toString();
    const qrBuf = await makeQR(qrString);

    doc.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8)
       .lineWidth(1).strokeColor(C.gold).fill(C.white);
    doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

    // Caption
    let sy = qrY + qrSize + 8;
    doc.fontSize(6).font('Helvetica').fillColor(C.gold)
       .text(t('SCAN TO VERIFY'), STUB_X, sy,
         { width: STUB_W, align: 'center', characterSpacing: 1.5 });
    sy += 10;
    doc.fontSize(7).font('Helvetica').fillColor(C.textMid)
       .text(seat.bookingRef, STUB_X, sy, { width: STUB_W, align: 'center' });
    sy += 12;

    rule(doc, STUB_X + stubPad, sy, innerW);
    sy += 6;

    // ── Poster below QR ───────────────────────────────────────────────────────
    // Fits within [innerW × remaining height], aspect ratio preserved,
    // centered, no white background — stubBg shows through.
    if (posterBuf) {
      const extraRows = [
        seat.gate ? [t('Gate'), seat.gate] : null,
        show.doorsOpen ? [t('Doors'), show.doorsOpen]  : null,
        show.dress ? [t('Dress'), show.dress] : null,
      ].filter(Boolean) as [string, string][];
      const extraH = extraRows.length > 0 ? extraRows.length * 20 + 8 : 0;

      const posterY = sy;
      const posterH = Math.max(0, stubFloor - extraH - posterY - 4);

      if (posterH > 20) {
        doc.image(posterBuf, STUB_X + stubPad, posterY, {
          fit: [innerW, posterH],
          align: 'center',
          valign: 'center',
        });
      }

      sy = stubFloor - extraH;

      // Gate / Doors / Dress mini-cells at the very bottom
      if (extraRows.length > 0) {
        rule(doc, STUB_X + stubPad, sy, innerW);
        sy += 6;
        const miniW = innerW / extraRows.length;
        extraRows.forEach(([lbl, val], idx) => {
          const mx = STUB_X + stubPad + idx * miniW;
          doc.fontSize(5.5).font('Helvetica').fillColor(C.gold)
             .text(lbl.toUpperCase(), mx, sy,
               { width: miniW, align: 'center', characterSpacing: 1.2 });
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C.text)
             .text(val, mx, sy + 8, { width: miniW, align: 'center' });
        });
      }
    } else {
      // No poster — text-only stub rows
      const stubRows: [string, string][] = [];
      if (seat.gate) stubRows.push([t('Gate'),  seat.gate]);
      if (show.doorsOpen) stubRows.push([t('Doors'), show.doorsOpen]);
      if (show.dress) stubRows.push([t('Dress'), show.dress]);

      for (const [lbl, val] of stubRows) {
        if (sy + 20 > stubFloor) break;
        doc.fontSize(6).font('Helvetica').fillColor(C.gold)
           .text(lbl.toUpperCase(), STUB_X, sy,
             { width: STUB_W, align: 'center', characterSpacing: 1.5 });
        doc.fontSize(8).font('Helvetica-Bold').fillColor(C.text)
           .text(val, STUB_X, sy + 8, { width: STUB_W, align: 'center' });
        sy += 22;
      }
    }

  } else {
    // ── Poster-only stub (useQrcode=false) ────────────────────────────────────
    const posterImgX = STUB_X + stubPad;
    const posterImgY = y0 + 14;
    const refBlockH = 36;
    const posterH = Math.max(0, stubFloor - refBlockH - posterImgY - 4);

    if (posterBuf && posterH > 20) {
      // fit preserves aspect ratio; centered; no background
      doc.image(posterBuf, posterImgX, posterImgY, {
        fit: [innerW, posterH],
        align: 'center',
        valign: 'center',
      });
    } else if (!posterBuf) {
      // Placeholder rectangle
      doc.save()
        .opacity(0.12)
        .rect(posterImgX, posterImgY, innerW, posterH)
        .fill(C.goldDim)
        .restore();
      doc.rect(posterImgX, posterImgY, innerW, posterH)
         .lineWidth(1).strokeColor(C.border).stroke();
    }

    let sy = posterImgY + posterH + 8;

    rule(doc, STUB_X + stubPad, sy, innerW);
    sy += 7;

    doc.fontSize(6).font('Helvetica').fillColor(C.gold)
       .text(t('Booking Ref').toUpperCase(), STUB_X, sy,
         { width: STUB_W, align: 'center', characterSpacing: 1.5 });
    sy += 9;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.text)
       .text(seat.bookingRef, STUB_X, sy, { width: STUB_W, align: 'center' });
    sy += 14;

    if (sy + 20 <= stubFloor && seat.gate) {
      rule(doc, STUB_X + stubPad, sy, innerW);
      sy += 7;
      doc.fontSize(5.5).font('Helvetica').fillColor(C.gold)
         .text(t('Gate').toUpperCase(), STUB_X + stubPad, sy,
           { width: innerW, align: 'center', characterSpacing: 1.2 });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C.text)
         .text(seat.gate, STUB_X + stubPad, sy + 8,
           { width: innerW, align: 'center' });
    }
  }

  // ── Footer disclaimer ─────────────────────────────────────────────────────
  doc.fontSize(6).font('Helvetica').fillColor(C.textLight)
    .text(
      (nominal ? (t('Non-transferable') + '  ·  ') : '') +
      (useQrcode ? (t('Present QR at entrance') + '  ·  ') : '') +
      t('No re-admission after start time'),
      TKT_X, y0 + TKT_H + 10,
      { width: TKT_W, align: 'center', characterSpacing: 0.5 },
    );
}

// ─── Buffer helper ────────────────────────────────────────────────────────────

function pdfToBuffer(
  doc: PDFKit.PDFDocument,
  drawFn: (d: PDFKit.PDFDocument) => Promise<void>,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));
    drawFn(doc).then(() => doc.end()).catch(reject);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates one print-ready PDF ticket per seat.
 *
 * @param booking.bookingIsPaid  When `false` the **Price** chip shows `"--"`.
 *                               Defaults to `true`.
 *
 * @param booking.useQrcode      When `true` (default) the stub shows a signed QR
 *                               code with the poster below it.
 *                               When `false` the stub is filled with the poster only.
 *
 * @returns One `Buffer` per seat, in the same order as `booking.seats`.
 *
 * @throws  If QR generation or PDF rendering fails for any seat.
 */
export async function generateTickets(booking: BookingRequest): Promise<Buffer[]> {
  const {
    show,
    seats,
    nominal = false,
    bookingIsPaid = true,
    useQrcode = true,
    language = config.app.defaultLanguage,
  } = booking;

  const t = (key: string, opts?: Record<string, unknown>): string =>
    i18n.t(key, { lng: language, ...opts });

  if (nominal) {
    const missing = seats.filter(s => !s.holderName).map(s => s.bookingRef);
    if (missing.length > 0) {
      throw new Error(
        t('ticket is nominal but holder name is missing for booking refs: {{miss}}',
          { miss: missing.join(', ') }),
      );
    }
  }

  return Promise.all(
    seats.map(seat => {
      const doc = new PDFDocument({
        size:   config.app.reservations.ticketing.format,
        margin: 0,
        info: {
          Title: `${show.titleLine1} ${show.titleLine2} — ${seat.bookingRef}`,
          Author: show.theater,
          Subject: t('Seat') + seat.seat + ' · ' + seat.row,
        },
      });
      return pdfToBuffer(doc, d =>
        drawTicket(d, show, seat, nominal, bookingIsPaid, useQrcode, t),
      );
    }),
  );
}
