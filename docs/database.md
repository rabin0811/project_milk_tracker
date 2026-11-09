# Database (PostgreSQL)

All timestamps are `TIMESTAMPTZ` (UTC). Money is `NUMERIC`, never float.

```sql
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
  is_protected BOOLEAN NOT NULL DEFAULT TRUE,      -- cannot be deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  key_lookup TEXT NOT NULL UNIQUE,                 -- HMAC-SHA256(secret_key, KEY_PEPPER)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_admin_id INT REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_places (                        -- optional restriction; no rows = all places
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  place_id INT REFERENCES places(id),
  PRIMARY KEY (staff_id, place_id)
);

CREATE TABLE farmers (
  id SERIAL PRIMARY KEY,
  farmer_number INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  place_id INT NOT NULL REFERENCES places(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE place_rates (                         -- history of farmer rates per place
  id SERIAL PRIMARY KEY,
  place_id INT NOT NULL REFERENCES places(id),
  rate_per_litre NUMERIC(10,2) NOT NULL CHECK (rate_per_litre >= 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_admin_id INT NOT NULL REFERENCES admins(id)
);
CREATE INDEX ON place_rates (place_id, effective_from DESC);

CREATE TABLE factory_rates (
  id SERIAL PRIMARY KEY,
  rate_per_litre NUMERIC(10,2) NOT NULL CHECK (rate_per_litre >= 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_admin_id INT NOT NULL REFERENCES admins(id)
);

CREATE TABLE milk_entries (
  id UUID PRIMARY KEY,                             -- generated on the device (idempotency key)
  farmer_id INT NOT NULL REFERENCES farmers(id),
  entry_date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('morning','evening')),
  litres NUMERIC(8,2) NOT NULL CHECK (litres > 0),
  fat NUMERIC(4,1) CHECK (fat >= 0),               -- informational only
  staff_id INT NOT NULL REFERENCES staff(id),
  entered_at TIMESTAMPTZ NOT NULL,                 -- device time at Save
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- server time
  farmer_rate NUMERIC(10,2),                       -- snapshot, server-set, admin-only
  factory_rate NUMERIC(10,2),                      -- snapshot, server-set, admin-only
  farmer_amount NUMERIC(14,2) GENERATED ALWAYS AS (litres * farmer_rate) STORED,
  factory_amount NUMERIC(14,2) GENERATED ALWAYS AS (litres * factory_rate) STORED,
  voided_at TIMESTAMPTZ, voided_by_admin_id INT REFERENCES admins(id), void_reason TEXT
);
CREATE INDEX ON milk_entries (farmer_id, entry_date);
CREATE INDEX ON milk_entries (entry_date);

CREATE TABLE cash_entries (                        -- advances and payments
  id UUID PRIMARY KEY,
  farmer_id INT NOT NULL REFERENCES farmers(id),
  kind TEXT NOT NULL CHECK (kind IN ('advance','payment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  staff_id INT NOT NULL REFERENCES staff(id),
  entered_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ, voided_by_admin_id INT REFERENCES admins(id), void_reason TEXT
);

CREATE TABLE goods_items (                         -- admin-managed list for the staff dropdown
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,                       -- e.g. Maize (corn), Raw feed
  default_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE goods_entries (
  id UUID PRIMARY KEY,
  farmer_id INT NOT NULL REFERENCES farmers(id),
  goods_item_id INT NOT NULL REFERENCES goods_items(id),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  note TEXT,
  value_amount NUMERIC(12,2),                      -- admin-only; hidden from staff
  staff_id INT NOT NULL REFERENCES staff(id),
  entered_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ, voided_by_admin_id INT REFERENCES admins(id), void_reason TEXT
);

CREATE TABLE audit_log (                           -- APPEND-ONLY
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin','staff','system')),
  actor_id INT,
  action TEXT NOT NULL,                            -- entry_created, entry_edited, entry_voided, staff_created, ...
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB, new_value JSONB,
  reason TEXT
);

CREATE TABLE rate_log (                            -- APPEND-ONLY, separate from audit_log
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL CHECK (kind IN ('place','factory')),
  place_id INT REFERENCES places(id),
  old_rate NUMERIC(10,2), new_rate NUMERIC(10,2) NOT NULL,
  effective_from TIMESTAMPTZ,
  is_correction BOOLEAN NOT NULL DEFAULT FALSE,
  range_from DATE, range_to DATE, entries_affected INT,
  admin_id INT NOT NULL REFERENCES admins(id),
  reason TEXT
);

CREATE TABLE edit_requests (                       -- P1 feature
  id SERIAL PRIMARY KEY,
  entry_type TEXT NOT NULL, entry_id UUID NOT NULL,
  requested_by_staff_id INT NOT NULL REFERENCES staff(id),
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by_admin_id INT REFERENCES admins(id), resolved_at TIMESTAMPTZ
);

CREATE TABLE auth_attempts (                       -- for staff-key lockout
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT, ip INET, success BOOLEAN NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Append-only enforcement
```sql
REVOKE UPDATE, DELETE ON audit_log, rate_log FROM app_user;
-- or a trigger that RAISES EXCEPTION on UPDATE/DELETE
```

## Farmer balance (view idea)
`balance = SUM(milk farmer_amount) - SUM(advances) - SUM(goods value_amount) - SUM(payments)` per farmer for a date range, excluding voided rows. Milk rows with NULL amount are counted separately as "rate missing".

## Seed data
- One admin: username `admin`, `must_change_password = true` (initial password in `authentication.md`).
- Three places: "Place 1", "Place 2", "Place 3" (owner renames them).
- Goods items: "Maize (corn)", "Raw feed".
