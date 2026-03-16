/**
 * @file ticketService.js
 * @description Generates one print-ready PDF ticket per seat.
 *              Tickets can be nominal (holder name printed) or anonymous.
 *
 * @example
 *   import { generateTickets } from './services/ticketService.js';
 *   const pdfs = await generateTickets(booking);  // Buffer[], one per seat
 */

import PDFDocument from 'pdfkit';
import QRCode      from 'qrcode';

// ─── Palette ─────────────────────────────────────────────────────────────────
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
};

// ─── Layout (points — 1 pt = 1/72 inch) ──────────────────────────────────────
const PAGE_W  = 595;
const PAGE_H  = 842;
const MARGIN  = 40;
const TKT_W   = PAGE_W - MARGIN * 2;   // 515
const TKT_H   = 260;
const TKT_X   = MARGIN;
const TKT_Y   = (PAGE_H - TKT_H) / 2;
const STUB_W  = 170;
const MAIN_W  = TKT_W - STUB_W;        // 345
const PERF_X  = TKT_X + MAIN_W;
const STUB_X  = PERF_X + 4;
const RADIUS  = 6;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

/** Horizontal gradient gold bar. */
const goldBar = (doc, x, y, w, h = 4) => {
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const t  = i / steps;
    const a  = t < 0.12 ? t / 0.12 : t > 0.88 ? (1 - t) / 0.12 : 1;
    const b  = 1 - Math.abs(t - 0.5) * 0.5;
    const r_ = Math.round(0x8A + (0xD4 - 0x8A) * b * a);
    const g_ = Math.round(0x60 + (0xA8 - 0x60) * b * a);
    const b_ = Math.round(0x10 + (0x30 - 0x10) * b * a);
    const hex = `#${[r_, g_, b_].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    doc.rect(x + i * (w / steps), y, w / steps + 1, h).fill(hex);
  }
};

/** Thin rule. */
const rule = (doc, x, y, w, color = C.border, opacity = 0.25) =>
  doc.save().opacity(opacity)
     .moveTo(x, y).lineTo(x + w, y)
     .lineWidth(0.5).strokeColor(color).stroke()
     .restore();

/** Small-caps label. */
const drawLabel = (doc, text, x, y, color = C.goldDim) =>
  doc.fontSize(6.5).font('Helvetica').fillColor(color)
     .text(text.toUpperCase(), x, y, { characterSpacing: 1.5 });

/** Ornamental diamonds — centred in main body. */
const ornament = (doc, y) =>
  doc.fontSize(9).font('Helvetica').fillColor(C.goldDim)
     .opacity(0.45).text('◆  ◇  ◆', TKT_X, y, { width: MAIN_W, align: 'center' })
     .opacity(1);

/** QR code PNG buffer. */
const makeQR = (data) =>
  QRCode.toBuffer(data, {
    type: 'png', width: 120, margin: 2,
    color: { dark: '#1A1A1A', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });

// ─── Core drawing routine ─────────────────────────────────────────────────────

const drawTicket = async (doc, show, seat, nominal) => {
  const y0 = TKT_Y;

  // ── Shell ──────────────────────────────────────────────────────────────────
  // Drop shadow
  doc.save().opacity(0.07)
     .roundedRect(TKT_X + 4, y0 + 7, TKT_W, TKT_H, RADIUS).fill('#000000')
     .restore();

  // White background + off-white main tint
  doc.roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).fill(C.white);
  doc.rect(TKT_X, y0, MAIN_W, TKT_H).fill(C.offWhite);

  // Outer border
  doc.roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS)
     .lineWidth(1).strokeColor(C.border).stroke();

  // Gold bars (clipped to rounded rect so they don't overflow corners)
  doc.save().roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).clip();
  goldBar(doc, TKT_X, y0,             TKT_W);
  goldBar(doc, TKT_X, y0 + TKT_H - 4, TKT_W);
  doc.restore();

  // ── Perforation ────────────────────────────────────────────────────────────
  doc.save().opacity(0.35);
  for (let dy = y0 + 14; dy < y0 + TKT_H - 14; dy += 11)
    doc.moveTo(PERF_X, dy).lineTo(PERF_X, dy + 6)
       .lineWidth(0.8).strokeColor(C.perf).stroke();
  doc.restore();

  // Punch holes
  for (const py of [y0 + 7, y0 + TKT_H - 7])
    doc.circle(PERF_X, py, 9).fill(C.white)
       .circle(PERF_X, py, 9).lineWidth(0.5).strokeColor(C.perf).stroke();

  // ── Stub background ────────────────────────────────────────────────────────
  doc.save().roundedRect(TKT_X, y0, TKT_W, TKT_H, RADIUS).clip();
  doc.rect(STUB_X, y0, STUB_W, TKT_H).fill(C.stubBg);
  doc.restore();

  doc.save().opacity(0.18)
     .moveTo(STUB_X, y0 + 10).lineTo(STUB_X, y0 + TKT_H - 10)
     .lineWidth(0.5).strokeColor(C.border).stroke()
     .restore();

  // ── MAIN BODY ──────────────────────────────────────────────────────────────

  let cy = y0 + 14;

  // Theater name
  doc.fontSize(7).font('Helvetica').fillColor(C.gold)
     .text(show.theater.toUpperCase(), TKT_X, cy,
       { width: MAIN_W, align: 'center', characterSpacing: 3 });

  rule(doc, TKT_X + 20, cy + 10, MAIN_W - 40, C.goldDim, 0.3);
  cy += 20;

  // Show title
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

  // ── Date / Time / Duration cells ───────────────────────────────────────────
  const cellW = (MAIN_W - 20) / 3;
  const cells = [
    { lbl: 'Date',     val: show.date,     sub: show.dayOfWeek    },
    { lbl: 'Time',     val: show.time,     sub: 'PM Sharp'        },
    { lbl: 'Duration', val: show.duration, sub: 'Incl. Interval'  },
  ];

  doc.save().opacity(0.15)
     .rect(TKT_X + 10, cy, MAIN_W - 20, 54).lineWidth(0.5).strokeColor(C.goldDim).stroke();
  [1, 2].forEach(i =>
    doc.moveTo(TKT_X + 10 + cellW * i, cy + 6)
       .lineTo(TKT_X + 10 + cellW * i, cy + 48)
       .lineWidth(0.5).strokeColor(C.goldDim).stroke()
  );
  doc.restore();

  cells.forEach(({ lbl, val, sub }, i) => {
    const cx = TKT_X + 10 + cellW * i;
    doc.fontSize(6).font('Helvetica').fillColor(C.goldDim)
       .text(lbl.toUpperCase(), cx, cy + 6, { width: cellW, align: 'center', characterSpacing: 1.5 });
    doc.fontSize(15).font('Helvetica-BoldOblique').fillColor(C.text)
       .text(val, cx, cy + 17, { width: cellW, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor(C.textLight)
       .text(sub, cx, cy + 36, { width: cellW, align: 'center' });
  });
  cy += 62;

  // ── Venue / Cast ───────────────────────────────────────────────────────────
  const halfW = (MAIN_W - 30) / 2;
  const col2X = TKT_X + 15 + halfW + 10;

  drawLabel(doc, 'Venue', TKT_X + 15, cy);
  cy += 10;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.text)
     .text(show.venue, TKT_X + 15, cy, { width: halfW });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.address, TKT_X + 15, cy + 12, { width: halfW });

  drawLabel(doc, 'Starring', col2X, cy - 10);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.text)
     .text(show.lead, col2X, cy, { width: halfW });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.leadRole,    col2X, cy + 12, { width: halfW });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.textMid)
     .text(show.supporting,  col2X, cy + 22, { width: halfW });

  cy += 44;
  rule(doc, TKT_X + 10, cy, MAIN_W - 20);
  cy += 8;

  // ── Booking chips ──────────────────────────────────────────────────────────
  const chips = [
    { lbl: 'Booking Ref', val: seat.bookingRef },
    { lbl: 'Seat',        val: seat.seat        },
    { lbl: 'Row',         val: seat.row         },
    { lbl: 'Price',       val: seat.price       },
    ...(nominal ? [{ lbl: 'Ticket Holder', val: seat.holderName }] : []),
  ];

  const chipW = (MAIN_W - 20 - (chips.length - 1) * 5) / chips.length;

  chips.forEach(({ lbl, val }, i) => {
    const cx = TKT_X + 10 + i * (chipW + 5);
    doc.save().opacity(0.07).rect(cx, cy, chipW, 36).fill(C.goldDim).restore();
    doc.rect(cx, cy, chipW, 36).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.fontSize(6).font('Helvetica').fillColor(C.goldDim)
       .text(lbl.toUpperCase(), cx + 4, cy + 5, { width: chipW - 8, characterSpacing: 1 });
    doc.fontSize(lbl === 'Ticket Holder' ? 7.5 : 9).font('Helvetica-Bold').fillColor(C.text)
       .text(val, cx + 4, cy + 17, { width: chipW - 8 });
  });

  // ── STUB ───────────────────────────────────────────────────────────────────
  const stubCX  = STUB_X + STUB_W / 2;
  const qrSize  = 100;
  const qrBuf   = await makeQR(
    `${seat.bookingRef}|${show.titleLine1}|${seat.seat}|${seat.row}`
  );
  const qrX = stubCX - qrSize / 2;
  const qrY = y0 + 22;

  // QR frame + image
  doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10)
     .lineWidth(1).strokeColor(C.gold).fill(C.white);
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

  // Scan label
  doc.fontSize(6).font('Helvetica').fillColor(C.gold)
     .text('SCAN TO VERIFY', STUB_X, qrY + qrSize + 8,
       { width: STUB_W, align: 'center', characterSpacing: 1.5 });
  doc.fontSize(7).font('Helvetica').fillColor(C.textMid)
     .text(seat.bookingRef, STUB_X, qrY + qrSize + 18,
       { width: STUB_W, align: 'center' });

  rule(doc, STUB_X + 10, qrY + qrSize + 32, STUB_W - 20, C.goldDim, 0.3);

  // Stub detail rows
  const stubRows = [
    ['Tier',  seat.tier    ],
    ['Gate',  seat.gate    ],
    ['Doors', show.doorsOpen],
    ['Dress', show.dress   ],
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
       'Non-transferable  ·  Present QR at entrance  ·  No re-admission after start time',
       TKT_X, y0 + TKT_H + 10,
       { width: TKT_W, align: 'center', characterSpacing: 0.5 }
     );
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate one PDF ticket Buffer per seat.
 *
 * @param {Object}   booking
 * @param {ShowInfo} booking.show     - Shared show metadata (see typedef below)
 * @param {SeatInfo[]} booking.seats  - One entry per seat
 * @param {boolean}  [booking.nominal=false]
 *   When true, seat.holderName is printed on the ticket.
 *   When false, the holder chip is omitted entirely.
 *
 * @returns {Promise<Buffer[]>} One PDF Buffer per seat, in the same order as
 *   booking.seats — ready to attach to a transactional email.
 *
 * @typedef {Object} ShowInfo
 * @property {string} theater
 * @property {string} titleLine1
 * @property {string} titleLine2
 * @property {string} subtitle
 * @property {string} date          e.g. "April 18, 2025"
 * @property {string} dayOfWeek     e.g. "Friday"
 * @property {string} time          e.g. "7:30"
 * @property {string} duration      e.g. "2h 45m"
 * @property {string} venue
 * @property {string} address
 * @property {string} lead
 * @property {string} leadRole
 * @property {string} supporting
 * @property {string} doorsOpen     e.g. "6:45 PM"
 * @property {string} dress         e.g. "Smart Casual"
 *
 * @typedef {Object} SeatInfo
 * @property {string} bookingRef
 * @property {string} seat          e.g. "D14"
 * @property {string} row           e.g. "Premium Stalls"
 * @property {string} tier
 * @property {string} gate
 * @property {string} price         e.g. "£ 185.00"
 * @property {string} [holderName]  Required when nominal=true
 */
export const generateTickets = async (booking) => {
  const { show, seats, nominal = false } = booking;

  return Promise.all(
    seats.map(
      (seat) =>
        new Promise(async (resolve, reject) => {
          const doc = new PDFDocument({
            size: 'A4',
            margin: 0,
            info: {
              Title: `${show.titleLine1} ${show.titleLine2} — ${seat.bookingRef}`,
              Author: show.theater,
              Subject: `Seat ${seat.seat} · ${seat.row}`,
            },
          });
          const chunks = [];
          doc.on('data', (c) => chunks.push(c));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', (err) => reject(err));

          await drawTicket(doc, show, seat, nominal);
          doc.end();
        }
      )
    )
  );
};
