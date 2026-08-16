-- Safe performance indexes for Gymind PostgreSQL/Supabase.
-- Run manually in Supabase SQL editor. Existing data is not changed.

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
CREATE INDEX IF NOT EXISTS ix_users_role_id ON users (role_id);
CREATE INDEX IF NOT EXISTS ix_users_gym_id ON users (gym_id);
CREATE INDEX IF NOT EXISTS ix_users_branch_id ON users (branch_id);

CREATE INDEX IF NOT EXISTS ix_members_gym_id ON members (gym_id);
CREATE INDEX IF NOT EXISTS ix_members_home_branch_id ON members (home_branch_id);

CREATE INDEX IF NOT EXISTS ix_payments_gym_id ON payments (gym_id);
CREATE INDEX IF NOT EXISTS ix_payments_branch_id ON payments (branch_id);
CREATE INDEX IF NOT EXISTS ix_payments_paid_at ON payments (paid_at);

CREATE INDEX IF NOT EXISTS ix_check_ins_member_id ON check_ins (member_id);
CREATE INDEX IF NOT EXISTS ix_check_ins_branch_id ON check_ins (branch_id);
CREATE INDEX IF NOT EXISTS ix_check_ins_check_in_time ON check_ins (check_in_time);

CREATE INDEX IF NOT EXISTS ix_classes_branch_id ON classes (branch_id);
CREATE INDEX IF NOT EXISTS ix_classes_trainer_user_id ON classes (trainer_user_id);
CREATE INDEX IF NOT EXISTS ix_classes_start_time ON classes (start_time);

CREATE INDEX IF NOT EXISTS ix_member_memberships_member_id ON member_memberships (member_id);
CREATE INDEX IF NOT EXISTS ix_member_memberships_status ON member_memberships (status);
CREATE INDEX IF NOT EXISTS ix_member_memberships_end_date ON member_memberships (end_date);
