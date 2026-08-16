ALTER TABLE IF EXISTS public.check_ins
ADD COLUMN IF NOT EXISTS check_out_time timestamp with time zone NULL;

ALTER TABLE IF EXISTS public.check_ins
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone NULL;

ALTER TABLE IF EXISTS public.check_ins
ADD COLUMN IF NOT EXISTS status text NULL;

ALTER TABLE IF EXISTS public.check_ins
ADD COLUMN IF NOT EXISTS check_out_method text NULL;

UPDATE public.check_ins
SET status = COALESCE(status, CASE WHEN check_out_time IS NULL THEN 'CHECKED_IN' ELSE 'CHECKED_OUT' END),
    last_seen_at = COALESCE(last_seen_at, check_in_time)
WHERE status IS NULL OR last_seen_at IS NULL;

ALTER TABLE IF EXISTS public.branches
ADD COLUMN IF NOT EXISTS qr_code_token text NULL,
ADD COLUMN IF NOT EXISTS qr_code_created_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS qr_code_updated_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS qr_code_is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS ux_branches_qr_code_token
ON public.branches(qr_code_token)
WHERE qr_code_token IS NOT NULL;
