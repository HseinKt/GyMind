-- Safe status normalization for existing Gymind rows.
-- Run once against Supabase before enforcing uppercase-only status filters.

UPDATE public.member_memberships
SET status = UPPER(TRIM(status))
WHERE status IS NOT NULL;

UPDATE public.member_memberships
SET status = CASE status
    WHEN 'ACTIVE' THEN 'ACTIVE'
    WHEN 'EXPIRED' THEN 'EXPIRED'
    WHEN 'FROZEN' THEN 'FROZEN'
    WHEN 'PENDING' THEN 'PENDING'
    ELSE status
END
WHERE status IS NOT NULL;

UPDATE public.class_bookings
SET status = CASE
    WHEN UPPER(TRIM(status)) IN ('BOOKED') THEN 'BOOKED'
    WHEN UPPER(TRIM(status)) IN ('CANCELLED', 'CANCELED') THEN 'CANCELLED'
    ELSE UPPER(TRIM(status))
END
WHERE status IS NOT NULL;

UPDATE public.check_ins
SET status = CASE
    WHEN UPPER(REPLACE(REPLACE(TRIM(status), ' ', '_'), '-', '_')) IN ('OPEN', 'CHECKEDIN', 'CHECKED_IN') THEN 'CHECKED_IN'
    WHEN UPPER(REPLACE(REPLACE(TRIM(status), ' ', '_'), '-', '_')) IN ('CLOSED', 'CHECKEDOUT', 'CHECKED_OUT') THEN 'CHECKED_OUT'
    WHEN UPPER(REPLACE(REPLACE(TRIM(status), ' ', '_'), '-', '_')) IN ('AUTOCHECKEDOUT', 'AUTO_CHECKED_OUT') THEN 'AUTO_CHECKED_OUT'
    ELSE UPPER(REPLACE(REPLACE(TRIM(status), ' ', '_'), '-', '_'))
END
WHERE status IS NOT NULL;
