import assert from "node:assert/strict";

import coverImage from "../lib/organizer/eventCoverImage.js";

const {
  EVENT_COVER_BUCKET,
  MAX_EVENT_COVER_IMAGE_BYTES,
  MIN_EVENT_COVER_IMAGE_HEIGHT,
  MIN_EVENT_COVER_IMAGE_WIDTH,
  buildEventCoverImagePath,
  readEventCoverImageDimensions,
  validateEventCoverImageDimensions,
  validateEventCoverImageFile,
} = coverImage;

function fileLike(overrides = {}) {
  return {
    name: "cover.JPG",
    type: "image/jpeg",
    size: 1024,
    ...overrides,
  };
}

assert.equal(validateEventCoverImageFile(fileLike({ type: "image/jpeg" })).ok, true);
assert.equal(validateEventCoverImageFile(fileLike({ type: "image/png", name: "cover.png" })).ok, true);
assert.equal(validateEventCoverImageFile(fileLike({ type: "image/webp", name: "cover.webp" })).ok, true);

assert.deepEqual(validateEventCoverImageFile(fileLike({ type: "image/gif", name: "cover.gif" })), {
  ok: false,
  message: "Cover image must be a JPG, PNG, or WebP file.",
});

assert.deepEqual(validateEventCoverImageFile(fileLike({ size: MAX_EVENT_COVER_IMAGE_BYTES + 1 })), {
  ok: false,
  message: "Cover image must be 5MB or smaller.",
});

assert.equal(MIN_EVENT_COVER_IMAGE_WIDTH, 1200);
assert.equal(MIN_EVENT_COVER_IMAGE_HEIGHT, 675);
assert.deepEqual(validateEventCoverImageDimensions({ width: 1600, height: 900 }), { ok: true });
assert.deepEqual(validateEventCoverImageDimensions({ width: 900, height: 1600 }), {
  ok: false,
  message: "Cover image must be landscape and close to a 16:9 hero crop.",
});
assert.deepEqual(validateEventCoverImageDimensions({ width: 1000, height: 600 }), {
  ok: false,
  message: "Cover image must be at least 1200x675 pixels.",
});

const pngHeader = new Uint8Array(33);
pngHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
pngHeader.set([0x00, 0x00, 0x00, 0x0d], 8);
pngHeader.set([0x49, 0x48, 0x44, 0x52], 12);
const pngView = new DataView(pngHeader.buffer);
pngView.setUint32(16, 1600);
pngView.setUint32(20, 900);
assert.deepEqual(
  await readEventCoverImageDimensions({
    type: "image/png",
    arrayBuffer: async () => pngHeader.buffer,
  }),
  { width: 1600, height: 900 }
);

assert.equal(EVENT_COVER_BUCKET, "event-covers");
assert.equal(
  buildEventCoverImagePath({
    organizerId: "user-123",
    eventId: "event-456",
    fileName: "My Cover.PNG",
    now: 1710000000000,
  }),
  "user-123/event-456/cover-1710000000000.png"
);

console.log("event cover image helper tests passed");
