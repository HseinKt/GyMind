ALTER TABLE public.membership_plans
DROP CONSTRAINT IF EXISTS chk_membership_plans_access_type;

UPDATE public.membership_plans
SET access_type = CASE
    WHEN lower(replace(replace(access_type, '-', '_'), ' ', '_')) IN ('one_branch', 'onebranch', 'single_branch') THEN 'one_branch'
    WHEN lower(replace(replace(access_type, '-', '_'), ' ', '_')) IN ('multi_branch', 'multibranch', 'all_branches', 'allbranches') THEN 'multi-branch'
    WHEN lower(replace(replace(access_type, '-', '_'), ' ', '_')) IN ('full_access', 'fullaccess') THEN 'full-access'
    WHEN lower(replace(replace(access_type, '-', '_'), ' ', '_')) IN ('day_pass', 'daypass', 'one_day_pass', 'onedaypass') THEN 'DAY_PASS'
    ELSE 'one_branch'
END
WHERE access_type IS NULL
   OR access_type NOT IN ('full-access', 'DAY_PASS', 'one_branch', 'multi-branch');

ALTER TABLE public.membership_plans
ADD CONSTRAINT chk_membership_plans_access_type
CHECK (access_type IN ('full-access', 'DAY_PASS', 'one_branch', 'multi-branch'));
