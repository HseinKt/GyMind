-- Safe Gymind data quality constraints.
-- Review in Supabase before applying to an existing production database; some
-- constraints may fail if historical rows already violate the rule.

CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_name ON roles (name);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_not_null ON users (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_members_email ON members (email);
CREATE INDEX IF NOT EXISTS ix_members_phone ON members (phone);
CREATE INDEX IF NOT EXISTS ix_payments_member_id ON payments (member_id);
CREATE INDEX IF NOT EXISTS ix_class_bookings_class_id ON class_bookings (class_id);
CREATE INDEX IF NOT EXISTS ix_class_bookings_member_id ON class_bookings (member_id);

ALTER TABLE branches
    ADD CONSTRAINT chk_branches_range_positive
    CHECK (range_km IS NULL OR range_km > 0) NOT VALID;

ALTER TABLE membership_plans
    ADD CONSTRAINT chk_membership_plans_price_positive
    CHECK (price IS NULL OR price >= 0) NOT VALID;

ALTER TABLE classes
    ADD CONSTRAINT chk_classes_capacity_positive
    CHECK (capacity IS NULL OR capacity > 0) NOT VALID;

ALTER TABLE payments
    ADD CONSTRAINT chk_payments_amount_positive
    CHECK (amount IS NULL OR amount >= 0) NOT VALID;

ALTER TABLE check_ins
    ADD CONSTRAINT chk_check_ins_checkout_after_checkin
    CHECK (check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS ux_check_ins_one_open_per_member
    ON check_ins (member_id)
    WHERE check_out_time IS NULL;
