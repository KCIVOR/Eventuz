const EVENT_COVER_BUCKET = "event-covers";
const MAX_EVENT_COVER_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_EVENT_COVER_IMAGE_WIDTH = 640;
const MIN_EVENT_COVER_IMAGE_HEIGHT = 360;
const MIN_EVENT_COVER_IMAGE_RATIO = 1.4;
const MAX_EVENT_COVER_IMAGE_RATIO = 2.4;

const ACCEPTED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function validateEventCoverImageFile(file) {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return {
      ok: false,
      message: "Cover image must be a JPG, PNG, or WebP file.",
    };
  }

  if (file.size > MAX_EVENT_COVER_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Cover image must be 5MB or smaller.",
    };
  }

  return { ok: true };
}

function validateEventCoverImageDimensions(dimensions) {
  const width = Number(dimensions?.width ?? 0);
  const height = Number(dimensions?.height ?? 0);
  const ratio = height > 0 ? width / height : 0;

  if (
    !Number.isFinite(ratio) ||
    ratio < MIN_EVENT_COVER_IMAGE_RATIO ||
    ratio > MAX_EVENT_COVER_IMAGE_RATIO
  ) {
    return {
      ok: false,
      message: "Cover image must be landscape and close to a 16:9 hero crop.",
    };
  }

  if (width < MIN_EVENT_COVER_IMAGE_WIDTH || height < MIN_EVENT_COVER_IMAGE_HEIGHT) {
    return {
      ok: false,
      message: `Cover image must be at least ${MIN_EVENT_COVER_IMAGE_WIDTH}x${MIN_EVENT_COVER_IMAGE_HEIGHT} pixels.`,
    };
  }

  return { ok: true };
}

function readPngDimensions(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !signature.every((byte, index) => bytes[index] === byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function readJpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) return null;

    const length = (bytes[offset] << 8) + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame && length >= 7) {
      return {
        height: (bytes[offset + 3] << 8) + bytes[offset + 4],
        width: (bytes[offset + 5] << 8) + bytes[offset + 6],
      };
    }

    offset += length;
  }

  return null;
}

function readWebpDimensions(bytes) {
  if (bytes.length < 30) return null;
  const text = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (text(0, 4) !== "RIFF" || text(8, 12) !== "WEBP") return null;

  const format = text(12, 16);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (format === "VP8X" && bytes.length >= 30) {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  }

  if (format === "VP8 " && bytes.length >= 30) {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  if (format === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }

  return null;
}

async function readEventCoverImageDimensions(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (file.type === "image/png") return readPngDimensions(bytes);
  if (file.type === "image/jpeg") return readJpegDimensions(bytes);
  if (file.type === "image/webp") return readWebpDimensions(bytes);

  return null;
}

function buildEventCoverImagePath({ organizerId, eventId, fileName, now = Date.now() }) {
  const fallbackExt = ACCEPTED_TYPES.get("image/jpeg");
  const fileExt = String(fileName).split(".").pop()?.toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(fileExt ?? "")
    ? fileExt === "jpeg"
      ? "jpg"
      : fileExt
    : fallbackExt;

  return `${organizerId}/${eventId}/cover-${now}.${safeExt}`;
}

exports.EVENT_COVER_BUCKET = EVENT_COVER_BUCKET;
exports.MAX_EVENT_COVER_IMAGE_BYTES = MAX_EVENT_COVER_IMAGE_BYTES;
exports.MIN_EVENT_COVER_IMAGE_WIDTH = MIN_EVENT_COVER_IMAGE_WIDTH;
exports.MIN_EVENT_COVER_IMAGE_HEIGHT = MIN_EVENT_COVER_IMAGE_HEIGHT;
exports.validateEventCoverImageFile = validateEventCoverImageFile;
exports.validateEventCoverImageDimensions = validateEventCoverImageDimensions;
exports.readEventCoverImageDimensions = readEventCoverImageDimensions;
exports.buildEventCoverImagePath = buildEventCoverImagePath;
