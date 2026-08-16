ALTER TABLE public.check_ins
ALTER COLUMN status SET DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS ux_check_ins_one_active_per_member
ON public.check_ins(member_id)
WHERE check_out_time IS NULL;

CREATE INDEX IF NOT EXISTS ix_check_ins_member_active
ON public.check_ins(member_id, check_in_time DESC)
WHERE check_out_time IS NULL;

CREATE INDEX IF NOT EXISTS ix_check_ins_branch_active
ON public.check_ins(branch_id, check_in_time DESC)
WHERE check_out_time IS NULL;

CREATE INDEX IF NOT EXISTS ix_check_ins_check_in_time
ON public.check_ins(check_in_time);

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS reference_table text,
ADD COLUMN IF NOT EXISTS reference_id bigint;
