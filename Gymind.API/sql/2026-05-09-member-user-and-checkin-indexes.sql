ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.users(id);

UPDATE public.members AS member
SET user_id = app_user.id
FROM public.users AS app_user
WHERE member.user_id IS NULL
  AND member.email IS NOT NULL
  AND app_user.email = member.email;

CREATE UNIQUE INDEX IF NOT EXISTS ux_members_user_id
ON public.members(user_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_check_ins_one_open_per_member
ON public.check_ins(member_id)
WHERE check_out_time IS NULL;
