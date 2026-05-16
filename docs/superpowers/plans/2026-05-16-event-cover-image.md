# Event Cover Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organizers upload one polished event cover image and show it as the public landing hero image.

**Architecture:** Reuse the existing `events.image_url` column. Add a public Supabase Storage bucket for event covers, a focused upload validation/path helper, and wire create/edit server actions to upload, replace, or remove the cover image.

**Tech Stack:** Next.js App Router Server Actions, Supabase database/storage, Node built-in test runner, Tailwind/Eventuz CSS utilities.

---

### Task 1: Storage and Validation

**Files:**
- Create: `supabase/migrations/20260516000100_event_cover_storage.sql`
- Create: `lib/organizer/eventCoverImage.js`
- Create: `scripts/event-cover-image.test.mjs`

- [ ] **Step 1: Write failing validation tests**

Create `scripts/event-cover-image.test.mjs` with Node tests for accepted MIME types, max size, extension mapping, and deterministic organizer-owned storage paths.

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test scripts/event-cover-image.test.mjs`
Expected: FAIL because `lib/organizer/eventCoverImage.js` does not exist yet.

- [ ] **Step 3: Implement helper and migration**

Add `EVENT_COVER_BUCKET`, `MAX_EVENT_COVER_IMAGE_BYTES`, `validateEventCoverImageFile(file)`, and `buildEventCoverImagePath({ organizerId, eventId, fileName, now })`.

Create the `event-covers` bucket and RLS policies for public reads and authenticated organizer-owned writes under `{auth.uid()}/...`.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `node --test scripts/event-cover-image.test.mjs`
Expected: PASS.

### Task 2: Server Actions

**Files:**
- Modify: `app/organizer/events/actions.ts`

- [ ] **Step 1: Add cover upload handling to `createEvent`**

After the event insert succeeds, upload `cover_image` when present, update `events.image_url`, audit the image update, revalidate organizer and landing paths, then redirect.

- [ ] **Step 2: Add cover replace/remove handling to `updateEvent`**

When `remove_cover_image=1`, set `image_url` to null. When a new file is present, validate/upload it and set the new public URL. Leave the current URL unchanged when neither action is requested.

### Task 3: Organizer UI

**Files:**
- Modify: `app/organizer/(general)/events/new/page.tsx`
- Modify: `app/organizer/(event)/events/[eventId]/page.tsx`

- [ ] **Step 1: Add create-page cover image field**

Add a `Cover image` section after Basics with a native file input, accepted types, max-size helper text, and a 16:9 guidance note.

- [ ] **Step 2: Add edit-page current cover preview and replace/remove controls**

Show the current cover in a wide preview when `event.image_url` exists, then provide replace and remove controls.

### Task 4: Public Landing Polish

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Improve hero image semantics**

Keep the existing background behavior, add an accessible label to the hero section, and tune image positioning so the cover crops predictably on mobile and desktop.

### Task 5: Verification

**Files:**
- Validate changed files only.

- [ ] **Step 1: Run helper tests**

Run: `node --test scripts/event-cover-image.test.mjs`
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: exit 0.
