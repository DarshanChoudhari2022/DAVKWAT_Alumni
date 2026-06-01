-- Enable Supabase Realtime change events for public landing updates.
-- The app also polls as a fallback, so this is safe if Realtime delivery is delayed.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'announcements'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;
  END IF;
END $$;
