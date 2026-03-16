import QRCode from 'qrcode';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import { sign, verify } from '../services/hmacService';
import {
  EncodeTicketRequest,
  DecodeTicketResult,
  TicketPayload,
} from '../shared/types/ticket';
import { i18n } from '../i18n';
import { getErrorMessage } from '../utils/errorHandler';

// ─── QR Visual Options ────────────────────────────────────────────────────────
//
// errorCorrectionLevel 'M' recovers up to 15 % of damaged data — a safe choice
// for printed tickets that may get slightly crumpled or dirty.
// Raise to 'H' (30 %) if tickets are used outdoors or handled frequently.
const QR_OPTIONS: QRCode.QRCodeToBufferOptions = { // TODO: to config
  type: 'png',
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 512,
  color: {
    dark: '#1a1a2e', // brand-dark modules
    light: '#ffffff',
  },
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateRequest(body: Partial<EncodeTicketRequest>): string | null {
  const required: Array<keyof EncodeTicketRequest> = [
    'reservationId',
    'customerName',
    'customerEmail',
    'companyName',
    'eventName',
    'venue',
    'eventDate',
    'eventTime',
    'seat',
    'ticketType',
  ];

  const missing = required.filter((field) => !body[field]);
  if (missing.length > 0) {
    return i18n.t('Missing required fields: {{missing}}', { missing: missing.join(', ') });
  }

  if (body.reservationId!.length !== 16) {
    return i18n.t('reservationId must be exactly 16 characters');
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(body.eventDate!)) {
    return i18n.t('eventDate must be in YYYY-MM-DD format');
  }

  const timePattern = /^\d{2}:\d{2}$/;
  if (!timePattern.test(body.eventTime!)) {
    return i18n.t('eventTime must be in HH:MM (24-hour) format');
  }

  return null; // all good
}

function buildPayload(data: EncodeTicketRequest): TicketPayload {
  // Unsigned payload — every field that should be tamper-proof goes here
  const unsigned: Omit<TicketPayload, 'sig'> = {
    rid: data.reservationId,
    cName: data.customerName,
    cEmail: data.customerEmail,
    org: data.companyName,
    event: data.eventName,
    theater: data.theater, // TODO: theater id? theter name ?
    date: data.eventDate,
    time: data.eventTime,
    seat: data.seat,
    type: data.ticketType,
    iat: Math.floor(Date.now() / 1000), // unix seconds
  };

  return {
    ...unsigned,
    sig: sign(unsigned), // HMAC-SHA256 over all unsigned fields
  };
}

export async function encodeQRCode(payload: TicketPayload): Promise<Buffer<ArrayBufferLike>> {
  // Validate input
  const validationError = validateRequest(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    // Build signed payload
    const ticketPayload = buildPayload(payload as EncodeTicketRequest);

    // Encode payload as compact JSON string to QR code PNG buffer
    const qrcodeBuffer = await QRCode.toBuffer(
      JSON.stringify(ticketPayload),
      QR_OPTIONS,
    );

    // Return a buffer with PNG image
    return qrcodeBuffer;

  } catch (error) {
    throw new Error(error);
  }
}


// ─── QR Reader ────────────────────────────────────────────────────────────────
 
/**
 * Extracts the raw string encoded in a QR code image.
 * Accepts any image format supported by Jimp (PNG, JPEG, BMP, TIFF, GIF).
 *
 * Returns null if no QR code is detected.
 */
async function readQRFromImageBuffer(imageBuffer: Buffer): Promise<string | null> {
  const image = await Jimp.read(imageBuffer);
 
  // jsQR needs a flat RGBA byte array plus image dimensions
  const { data, width, height } = image.bitmap;
 
  const result = jsQR(
    new Uint8ClampedArray(data),
    width,
    height,
  );
 
  return result?.data ?? null;
}

// ─── Payload Parser ───────────────────────────────────────────────────────────
 
/**
 * Parses the raw QR string and validates it as a TicketPayload.
 * Returns null if the string is not valid JSON or is missing expected fields.
 */
function parsePayload(raw: string): TicketPayload | null {
  try {
    const parsed = JSON.parse(raw);
 
    // Minimal structural check — all keys that must be present
    const required: Array<keyof TicketPayload> = [
      'rid',
      'cName',
      'cEmail',
      'org',
      'event',
      'venue',
      'date',
      'time',
      'seat',
      'type',
      'iat',
      'sig',
    ];
 
    const hasAllFields = required.every((key) => key in parsed);
    return hasAllFields ? (parsed as TicketPayload) : null;
 
  } catch {
    return null;  // not valid JSON
  }
}
 
/**
 * POST /qrcode/decode
 *
 * Accepts a multipart upload with the field name 'ticket' (a QR code image).
 * Responds with the parsed ticket data and a VALID / INVALID_SIGNATURE status.
 *
 * Wire up with multer middleware before this handler:
 *   router.post('/qrcode/decode', upload.single('ticket'), decodeQRCode);
 */
export async function decodeQRCode(req: Request, res: Response): Promise<void> {
  // 1. Check an image was uploaded
  if (!req.file) {
    res.status(400).json({ error: i18n.t('No image uploaded. Use field name "ticket".') });
    return;
  }
 
  try {
    // 2. Read QR code from the uploaded image
    const rawQR = await readQRFromImageBuffer(req.file.buffer);
 
    if (!rawQR) {
      const result: DecodeTicketResult = {
        status: 'UNREADABLE',
        error: i18n.t('No QR code found in the uploaded image'),
      };
      res.status(422).json(result);
      return;
    }
 
    // 3. Parse the JSON payload
    const payload = parsePayload(rawQR);
 
    if (!payload) {
      const result: DecodeTicketResult = {
        status: 'UNREADABLE',
        error: i18n.t('QR code found but payload is not a valid ticket format'),
      };
      res.status(422).json(result);
      return;
    }
 
    // 4. Verify HMAC signature
    const isSignatureValid = verify(payload as unknown as Record<string, unknown>);
 
    if (!isSignatureValid) {
      const result: DecodeTicketResult = {
        status: 'INVALID_SIGNATURE',
        error: i18n.t('Ticket signature is invalid. This ticket may have been tampered with.'),
      };
      res.status(200).json(result);   // 200 because the request itself succeeded
      return;
    }
 
    // 5. Return verified ticket data (omit the raw signature from the response)
    const { sig: _omitted, ...ticketData } = payload;
 
    console.log('omitted fields:', _omitted);

    const result: DecodeTicketResult = {
      status: 'VALID',
      ticket: ticketData,
    };
    res.status(200).json(result);
 
  } catch (error) {
    res.status(500).json({ error: i18n.t('QR decode failed: {{err}}', { err: getErrorMessage(error) }) });
  }
}

export default router;
