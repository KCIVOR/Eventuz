-- One event per organizer (single-wedding product model).
-- Fails if any organizer_id appears more than once — resolve data first.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.events
    GROUP BY organizer_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      '026_events_one_per_organizer: multiple events exist for at least one organizer. Keep one row per organizer and re-run.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS events_one_per_organizer_idx ON public.events (organizer_id);
