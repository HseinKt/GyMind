-- Gymind QA member repair
-- Run this if the main QA seed inserted admin/staff/trainer accounts but not qa.member.* users.

begin;

insert into public.roles (name)
select 'Member'
where not exists (select 1 from public.roles where lower(name) = 'member');

do $$
declare
  qa_password_hash constant text := '$2a$11$8WPV3sOk1fOQ3Vx0/7SFBOMG0ZjUnEOuMK64BSRTn.D.Y/eOvqigq';
  member_role_id bigint;
  gym1_id bigint;
  gym2_id bigint;
  gym3_id bigint;
  main_id bigint;
  east_id bigint;
  beirut_id bigint;
  strength_id bigint;
  solo_id bigint;
begin
  select id into member_role_id from public.roles where lower(name) = 'member' order by id limit 1;
  select id into gym1_id from public.gyms where name = 'Gymind Ablah Fitness';
  select id into gym2_id from public.gyms where name = 'Gymind Local Gym';
  select id into gym3_id from public.gyms where name = 'Gymind Solo Gym';
  select id into main_id from public.branches where name = 'Ablah Main Branch';
  select id into east_id from public.branches where name = 'Ablah East Branch';
  select id into beirut_id from public.branches where name = 'Beirut Branch';
  select id into strength_id from public.branches where name = 'Ablah Strength Branch';
  select id into solo_id from public.branches where name = 'Ablah Solo Branch';

  if member_role_id is null then
    raise exception 'Member role was not found or created.';
  end if;

  if gym1_id is null or gym2_id is null or gym3_id is null or main_id is null or east_id is null or beirut_id is null or strength_id is null or solo_id is null then
    raise exception 'Required QA gyms/branches are missing. Run supabase_qa_seed.sql first.';
  end if;

  create temp table qa_member_repair (
    email text primary key,
    full_name text not null,
    phone text,
    gym_id bigint,
    branch_id bigint
  ) on commit drop;

  insert into qa_member_repair (email, full_name, phone, gym_id, branch_id) values
    ('qa.member.active.monthly@gymind.test', 'Charbel Active Monthly', '71810001', gym1_id, main_id),
    ('qa.member.daypass@gymind.test', 'Maya Daypass', '71810002', gym1_id, main_id),
    ('qa.member.3months@gymind.test', 'Jad ThreeMonths', '71810003', gym1_id, east_id),
    ('qa.member.vip@gymind.test', 'Lea VIP', '71810004', gym1_id, main_id),
    ('qa.member.expiring2days@gymind.test', 'Karim Expiring Soon', '71810005', gym1_id, main_id),
    ('qa.member.expiringtomorrow@gymind.test', 'Nour Expiring Tomorrow', '71810006', gym1_id, main_id),
    ('qa.member.expired@gymind.test', 'Tony Expired', '71810007', gym1_id, main_id),
    ('qa.member.frozen@gymind.test', 'Sarah Frozen', '71810008', gym1_id, east_id),
    ('qa.member.cancelled@gymind.test', 'Rami Cancelled', '71810009', gym1_id, main_id),
    ('qa.member.noplan@gymind.test', 'Hiba NoPlan', '71810010', gym1_id, main_id),
    ('qa.member.history@gymind.test', 'Paul History', '71810011', gym1_id, main_id),
    ('qa.member.running@gymind.test', 'Rita Running Timer', '71810012', gym1_id, main_id),
    ('qa.member.vip.beirut@gymind.test', 'George VIP Beirut', '71810013', gym1_id, beirut_id),
    ('qa.member.gym2.monthly@gymind.test', 'Maria GymTwo', '71810014', gym2_id, strength_id),
    ('qa.member.gym3.solo@gymind.test', 'Sami Solo', '71810015', gym3_id, solo_id);

  insert into public.users (gym_id, branch_id, role_id, full_name, email, phone, password_hash, is_active, created_at)
  select gym_id, branch_id, member_role_id, full_name, email, phone, qa_password_hash, true, now()
  from qa_member_repair r
  where not exists (select 1 from public.users u where u.email = r.email);

  update public.users u
  set gym_id = r.gym_id,
      branch_id = r.branch_id,
      role_id = member_role_id,
      full_name = r.full_name,
      phone = r.phone,
      password_hash = qa_password_hash,
      is_active = true
  from qa_member_repair r
  where u.email = r.email;

  insert into public.members (gym_id, home_branch_id, user_id, full_name, phone, email, qr_code, join_date, is_active)
  select r.gym_id, r.branch_id, u.id, r.full_name, r.phone, r.email, 'QA-' || u.id::text, current_date - 45, true
  from qa_member_repair r
  join public.users u on u.email = r.email
  left join public.members m on m.user_id = u.id
  where m.id is null;

  update public.members m
  set gym_id = r.gym_id,
      home_branch_id = r.branch_id,
      user_id = u.id,
      full_name = r.full_name,
      phone = r.phone,
      email = r.email,
      is_active = true
  from qa_member_repair r
  join public.users u on u.email = r.email
  where m.user_id = u.id;
end $$;

commit;

select count(*) as qa_member_users
from public.users u
join public.roles r on r.id = u.role_id
where u.email like 'qa.member.%@gymind.test'
  and lower(r.name) = 'member';

select count(*) as qa_members
from public.members m
join public.users u on u.id = m.user_id
where u.email like 'qa.member.%@gymind.test';
