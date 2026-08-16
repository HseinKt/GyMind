-- Force insert Gymind QA member users + members rows.
-- Run this whole script in Supabase SQL Editor.
-- Password for every account: Test@123456

begin;

insert into public.roles (name)
select 'Member'
where not exists (select 1 from public.roles where lower(name) = 'member');

insert into public.gyms (name, city, is_active, created_at)
select 'Gymind Ablah Fitness', 'Ablah', true, now()
where not exists (select 1 from public.gyms where name = 'Gymind Ablah Fitness');

insert into public.gyms (name, city, is_active, created_at)
select 'Gymind Local Gym', 'Ablah', true, now()
where not exists (select 1 from public.gyms where name = 'Gymind Local Gym');

insert into public.gyms (name, city, is_active, created_at)
select 'Gymind Solo Gym', 'Ablah', true, now()
where not exists (select 1 from public.gyms where name = 'Gymind Solo Gym');

insert into public.branches (gym_id, name, address, phone, range_km, capacity, area_sqm, lat, lng, open_time, close_time, qr_code_token, qr_code_created_at, qr_code_updated_at, qr_code_is_active, is_active)
select g.id, 'Ablah Main Branch', 'Ablah, Bekaa, Lebanon', '70111001', 0.15, 120, 480, 33.8212, 35.9956, '06:00', '23:00', md5('QA_ABLAH_MAIN_FORCE'), now(), now(), true, true
from public.gyms g
where g.name = 'Gymind Ablah Fitness'
  and not exists (select 1 from public.branches where name = 'Ablah Main Branch');

insert into public.branches (gym_id, name, address, phone, range_km, capacity, area_sqm, lat, lng, open_time, close_time, qr_code_token, qr_code_created_at, qr_code_updated_at, qr_code_is_active, is_active)
select g.id, 'Ablah East Branch', 'Ablah, Bekaa, Lebanon', '70111002', 0.15, 90, 360, 33.8224, 35.9991, '06:00', '23:00', md5('QA_ABLAH_EAST_FORCE'), now(), now(), true, true
from public.gyms g
where g.name = 'Gymind Ablah Fitness'
  and not exists (select 1 from public.branches where name = 'Ablah East Branch');

insert into public.branches (gym_id, name, address, phone, range_km, capacity, area_sqm, lat, lng, open_time, close_time, qr_code_token, qr_code_created_at, qr_code_updated_at, qr_code_is_active, is_active)
select g.id, 'Beirut Branch', 'Beirut, Lebanon', '70111003', 0.15, 150, 600, 33.8938, 35.5018, '06:00', '23:00', md5('QA_BEIRUT_FORCE'), now(), now(), true, true
from public.gyms g
where g.name = 'Gymind Ablah Fitness'
  and not exists (select 1 from public.branches where name = 'Beirut Branch');

insert into public.branches (gym_id, name, address, phone, range_km, capacity, area_sqm, lat, lng, open_time, close_time, qr_code_token, qr_code_created_at, qr_code_updated_at, qr_code_is_active, is_active)
select g.id, 'Ablah Strength Branch', 'Ablah, Bekaa, Lebanon', '70222001', 0.15, 80, 320, 33.8206, 35.9944, '06:00', '23:00', md5('QA_ABLAH_STRENGTH_FORCE'), now(), now(), true, true
from public.gyms g
where g.name = 'Gymind Local Gym'
  and not exists (select 1 from public.branches where name = 'Ablah Strength Branch');

insert into public.branches (gym_id, name, address, phone, range_km, capacity, area_sqm, lat, lng, open_time, close_time, qr_code_token, qr_code_created_at, qr_code_updated_at, qr_code_is_active, is_active)
select g.id, 'Ablah Solo Branch', 'Ablah, Bekaa, Lebanon', '70333001', 0.15, 60, 240, 33.8217, 35.9936, '06:00', '23:00', md5('QA_ABLAH_SOLO_FORCE'), now(), now(), true, true
from public.gyms g
where g.name = 'Gymind Solo Gym'
  and not exists (select 1 from public.branches where name = 'Ablah Solo Branch');

with seed(email, full_name, phone, branch_name) as (
  values
    ('qa.member.active.monthly@gymind.test', 'Charbel Active Monthly', '71810001', 'Ablah Main Branch'),
    ('qa.member.daypass@gymind.test', 'Maya Daypass', '71810002', 'Ablah Main Branch'),
    ('qa.member.3months@gymind.test', 'Jad ThreeMonths', '71810003', 'Ablah East Branch'),
    ('qa.member.vip@gymind.test', 'Lea VIP', '71810004', 'Ablah Main Branch'),
    ('qa.member.expiring2days@gymind.test', 'Karim Expiring Soon', '71810005', 'Ablah Main Branch'),
    ('qa.member.expiringtomorrow@gymind.test', 'Nour Expiring Tomorrow', '71810006', 'Ablah Main Branch'),
    ('qa.member.expired@gymind.test', 'Tony Expired', '71810007', 'Ablah Main Branch'),
    ('qa.member.frozen@gymind.test', 'Sarah Frozen', '71810008', 'Ablah East Branch'),
    ('qa.member.cancelled@gymind.test', 'Rami Cancelled', '71810009', 'Ablah Main Branch'),
    ('qa.member.noplan@gymind.test', 'Hiba NoPlan', '71810010', 'Ablah Main Branch'),
    ('qa.member.history@gymind.test', 'Paul History', '71810011', 'Ablah Main Branch'),
    ('qa.member.running@gymind.test', 'Rita Running Timer', '71810012', 'Ablah Main Branch'),
    ('qa.member.vip.beirut@gymind.test', 'George VIP Beirut', '71810013', 'Beirut Branch'),
    ('qa.member.gym2.monthly@gymind.test', 'Maria GymTwo', '71810014', 'Ablah Strength Branch'),
    ('qa.member.gym3.solo@gymind.test', 'Sami Solo', '71810015', 'Ablah Solo Branch')
),
resolved as (
  select
    s.email,
    s.full_name,
    s.phone,
    b.id as branch_id,
    b.gym_id,
    r.id as role_id
  from seed s
  join public.branches b on b.name = s.branch_name
  cross join lateral (
    select id
    from public.roles
    where lower(name) = 'member'
    order by id
    limit 1
  ) r
)
insert into public.users (gym_id, branch_id, role_id, full_name, email, phone, password_hash, is_active, created_at)
select
  gym_id,
  branch_id,
  role_id,
  full_name,
  email,
  phone,
  '$2a$11$8WPV3sOk1fOQ3Vx0/7SFBOMG0ZjUnEOuMK64BSRTn.D.Y/eOvqigq',
  true,
  now()
from resolved
where not exists (select 1 from public.users u where u.email = resolved.email);

with seed(email, full_name, phone, branch_name) as (
  values
    ('qa.member.active.monthly@gymind.test', 'Charbel Active Monthly', '71810001', 'Ablah Main Branch'),
    ('qa.member.daypass@gymind.test', 'Maya Daypass', '71810002', 'Ablah Main Branch'),
    ('qa.member.3months@gymind.test', 'Jad ThreeMonths', '71810003', 'Ablah East Branch'),
    ('qa.member.vip@gymind.test', 'Lea VIP', '71810004', 'Ablah Main Branch'),
    ('qa.member.expiring2days@gymind.test', 'Karim Expiring Soon', '71810005', 'Ablah Main Branch'),
    ('qa.member.expiringtomorrow@gymind.test', 'Nour Expiring Tomorrow', '71810006', 'Ablah Main Branch'),
    ('qa.member.expired@gymind.test', 'Tony Expired', '71810007', 'Ablah Main Branch'),
    ('qa.member.frozen@gymind.test', 'Sarah Frozen', '71810008', 'Ablah East Branch'),
    ('qa.member.cancelled@gymind.test', 'Rami Cancelled', '71810009', 'Ablah Main Branch'),
    ('qa.member.noplan@gymind.test', 'Hiba NoPlan', '71810010', 'Ablah Main Branch'),
    ('qa.member.history@gymind.test', 'Paul History', '71810011', 'Ablah Main Branch'),
    ('qa.member.running@gymind.test', 'Rita Running Timer', '71810012', 'Ablah Main Branch'),
    ('qa.member.vip.beirut@gymind.test', 'George VIP Beirut', '71810013', 'Beirut Branch'),
    ('qa.member.gym2.monthly@gymind.test', 'Maria GymTwo', '71810014', 'Ablah Strength Branch'),
    ('qa.member.gym3.solo@gymind.test', 'Sami Solo', '71810015', 'Ablah Solo Branch')
)
insert into public.members (gym_id, home_branch_id, user_id, full_name, phone, email, qr_code, join_date, is_active)
select
  b.gym_id,
  b.id,
  u.id,
  s.full_name,
  s.phone,
  s.email,
  'QA-' || u.id::text,
  current_date - 45,
  true
from seed s
join public.users u on u.email = s.email
join public.branches b on b.name = s.branch_name
left join public.members m on m.user_id = u.id
where m.id is null;

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

select
  u.id as user_id,
  m.id as member_id,
  u.email,
  u.full_name,
  r.name as role,
  m.home_branch_id
from public.users u
join public.roles r on r.id = u.role_id
left join public.members m on m.user_id = u.id
where u.email like 'qa.member.%@gymind.test'
order by u.email;
