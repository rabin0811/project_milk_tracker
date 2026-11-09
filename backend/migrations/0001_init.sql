-- Milk Tracker initial schema.
-- Money is NUMERIC, never float. Timestamps are UTC (TIMESTAMPTZ).
-- Decisions recorded in prd.md section 8/9:
--   * cash_entries and goods_entries carry entry_date (device local date at Save).
--   * staff.last_sync_at supports the admin pending-sync indicator.
--   * audit_log and rate_log reject UPDATE/DELETE/TRUNCATE at the database level.
--   * the protected admin cannot be deleted or unprotected.

CREATE TABLE places (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  is_protected BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  key_lookup TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  session_version INT NOT NULL DEFAULT 0 NOT NULL,
  last_sync_at TIMESTAMPTZ,
  created_by_admin_id INT REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_places (
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  place_id INT REFERENCES places(id),
  PRIMARY KEY (staff_id, place_id)
);

CREATE TABLE farmers (
  id SERIAL PRIMARY KEY,
  farmer_number INT NOT NULL UNIQUE CHECK (farmer_number > 0),
  name TEXT NOT NULL,
  place_id INT NOT NULL REFERENCES places(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX farmers_place_idx ON farmers (place_id);

CREATE TABLE place_rates (
  id SERIAL PRIMARY KEY,
  place_id INT NOT NULL REFERENCES places(id),
  rate_per_litre NUMERIC(10,2) NOT NULL CHECK (rate_per_litre >= 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_admin_id INT NOT NULL REFERENCES admins(id)
);
CREATE INDEX place_rates_lookup_idx ON place_rates (place_id, effective_from DESC);

CREATE TABLE factory_rates (
  id SERIAL PRIMARY KEY,
  rate_per_litre NUMERIC(10,2) NOT NULL CHECK (rate_per_litre >= 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_admin_id INT NOT NULL REFERENCES admins(id)
);
CREATE INDEX factory_rates_lookup_idx ON factory_rates (effective_from DESC);

CREATE TABLE milk_entries (
  id UUID PRIMARY KEY,
  farmer_id INT NOT NULL REFERENCES farmers(id),
  entry_date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('morning','evening')),
  litres NUMERIC(8,2) NOT NULL CHECK (litres > 0),
  fat NUMERIC(4,1) CHECK (fat >= 0),
  staff_id INT NOT NULL REFERENCES staff(id),
  entered_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  farmer_rate NUMERIC(10,2),
  factory_rate NUMERIC(10,2),
  farmer_amount NUMERIC(14,2) GENERATED ALWAYS AS (litres * farmer_rate) STORED,
  factory_amount NUMERIC(14,2) GENERATED ALWAYS AS (litres * factory_rate) STORED,
  voided_at TIMESTAMPTZ,
  voided_by_admin_id INT REFERENCES admins(id),
  void_reason TEXT
);
CREATE INDEX milk_entries_farmer_date_idx ON milk_entries (farmer_id, entry_date);
CREATE INDEX milk_entries_date_idx ON milk_entries (entry_date);
CREATE INDEX milk_entries_staff_idx ON milk_entries (staff_id);
CREATE INDEX milk_entries_entered_at_idx ON milk_entries (entered_at);

CREATE TABLE cash_entries (
  id UUID PRIMARY KEY,
  farmer_id INT NOT NULL REFERENCES farmers(id),
  entry_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('advance','payment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  staff_id INT NOT NULL REFERENCES staff(id),
  entered_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ,
  voided_by_admin_id INT REFERENCES admins(id),
  void_reason TEXT
);
CREATE INDEX cash_entries_farmer_date_idx ON cash_entries (farmer_id, entry_date);
CREATE INDEX cash_entries_date_idx ON cash_entries (entry_date);
CREATE INDEX cash_entries_staff_idx ON cash_entries (staff_id);

CREATE TABLE goods_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  default_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE goods_entries (
  id UUID PRIMARY KEY,
  farmer_id INT NOT NULL REFERENCES farmers(id),
  entry_date DATE NOT NULL,
  goods_item_id INT NOT NULL REFERENCES goods_items(id),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  note TEXT,
  value_amount NUMERIC(12,2) CHECK (value_amount IS NULL OR value_amount >= 0),
  staff_id INT NOT NULL REFERENCES staff(id),
  entered_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ,
  voided_by_admin_id INT REFERENCES admins(id),
  void_reason TEXT
);
CREATE INDEX goods_entries_farmer_date_idx ON goods_entries (farmer_id, entry_date);
CREATE INDEX goods_entries_date_idx ON goods_entries (entry_date);
CREATE INDEX goods_entries_staff_idx ON goods_entries (staff_id);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin','staff','system')),
  actor_id INT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT
);
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);
CREATE INDEX audit_log_actor_idx ON audit_log (actor_type, actor_id);

CREATE TABLE rate_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL CHECK (kind IN ('place','factory')),
  place_id INT REFERENCES places(id),
  old_rate NUMERIC(10,2),
  new_rate NUMERIC(10,2) NOT NULL,
  effective_from TIMESTAMPTZ,
  is_correction BOOLEAN NOT NULL DEFAULT FALSE,
  range_from DATE,
  range_to DATE,
  entries_affected INT,
  admin_id INT NOT NULL REFERENCES admins(id),
  reason TEXT
);
CREATE INDEX rate_log_at_idx ON rate_log (at DESC);

CREATE TABLE edit_requests (
  id SERIAL PRIMARY KEY,
  entry_type TEXT NOT NULL,
  entry_id UUID NOT NULL,
  requested_by_staff_id INT NOT NULL REFERENCES staff(id),
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by_admin_id INT REFERENCES admins(id),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT,
  device_id TEXT,
  ip INET,
  success BOOLEAN NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_device_idx ON auth_attempts (device_id, at DESC);
CREATE INDEX auth_attempts_ip_idx ON auth_attempts (ip, at DESC);
CREATE INDEX auth_attempts_identifier_idx ON auth_attempts (identifier, at DESC);

-- Append-only logs -----------------------------------------------------------

CREATE FUNCTION reject_append_only_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append_only_violation: % on %', TG_OP, TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION reject_append_only_mutation();

CREATE TRIGGER rate_log_no_update_delete
  BEFORE UPDATE OR DELETE ON rate_log
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

CREATE TRIGGER rate_log_no_truncate
  BEFORE TRUNCATE ON rate_log
  FOR EACH STATEMENT EXECUTE FUNCTION reject_append_only_mutation();

-- The protected admin account is permanent -----------------------------------

CREATE FUNCTION reject_protected_admin_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_protected THEN
    RAISE EXCEPTION 'protected_admin_cannot_be_deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER admins_no_delete
  BEFORE DELETE ON admins
  FOR EACH ROW EXECUTE FUNCTION reject_protected_admin_delete();

CREATE FUNCTION keep_admin_protection() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_protected AND NOT NEW.is_protected THEN
    RAISE EXCEPTION 'admin_protection_cannot_be_removed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER admins_keep_protection
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION keep_admin_protection();
