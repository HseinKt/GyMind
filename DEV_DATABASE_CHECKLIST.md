# Gymind Development Database Checklist

Run these checks against Supabase PostgreSQL before QA. They verify the schema needed for QR attendance, geofence validation, class bookings, and active check-in state.

## Required branch columns

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'branches'
  and column_name in ('lat', 'lng', 'range_km', 'qr_code_token', 'qr_code_is_active')
order by column_name;
```

## Membership branch access table

```sql
select exists (
  select 1
  from information_schema.tables
  where table_name = 'membership_plan_branches'
) as has_membership_plan_branches;

select membership_plan_id, count(*) as branch_count
from membership_plan_branches
group by membership_plan_id
order by membership_plan_id;
```

Plans with zero rows do not grant all branches. Add explicit rows for every included branch.

## Check-in columns

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'check_ins'
  and column_name in ('last_seen_at', 'status', 'method', 'check_out_method')
order by column_name;
```

## One active check-in per member

```sql
select indexname, indexdef
from pg_indexes
where tablename = 'check_ins'
  and indexdef ilike '%check_out_time is null%';
```

Expected: a unique partial index on `member_id` where `check_out_time is null`.

## Duplicate active check-in audit

```sql
select member_id, count(*) as open_sessions
from check_ins
where check_out_time is null
group by member_id
having count(*) > 1;
```

Expected: zero rows.

## Branch geofence readiness

```sql
select id, name, lat, lng, range_km, qr_code_is_active, qr_code_token
from branches
where is_active = true
  and (lat is null or lng is null or range_km is null or qr_code_token is null or qr_code_is_active = false);
```

Expected for QR-enabled branches: zero rows.
