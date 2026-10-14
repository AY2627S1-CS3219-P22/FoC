CREATE TABLE credit.accounts (
  user_id text PRIMARY KEY,
  total_credits integer NOT NULL DEFAULT 10 CHECK (total_credits >= 0),
  reserved_credits integer NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reserved_credits <= total_credits)
);

CREATE TABLE credit.reservations (
  reservation_id uuid PRIMARY KEY,
  order_id text NOT NULL UNIQUE,
  requester_id text NOT NULL REFERENCES credit.accounts(user_id),
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL CHECK (status IN ('RESERVED', 'RELEASED', 'SETTLED')),
  courier_id text REFERENCES credit.accounts(user_id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'SETTLED') = (courier_id IS NOT NULL)),
  CHECK (courier_id IS NULL OR courier_id <> requester_id)
);

CREATE TABLE credit.history (
  sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id uuid NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES credit.accounts(user_id),
  type text NOT NULL CHECK (type IN (
    'INITIAL_GRANT', 'RESERVED', 'RESERVATION_UPDATED', 'RELEASED', 'TRANSFER_OUT', 'TRANSFER_IN'
  )),
  total_delta integer NOT NULL,
  reserved_delta integer NOT NULL,
  order_id text,
  reservation_id uuid REFERENCES credit.reservations(reservation_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX history_user_sequence_idx ON credit.history(user_id, sequence_id DESC);
CREATE UNIQUE INDEX one_initial_grant_per_user ON credit.history(user_id) WHERE type = 'INITIAL_GRANT';
CREATE INDEX reservations_requester_idx ON credit.reservations(requester_id);

CREATE TABLE credit.idempotency_records (
  operation text NOT NULL,
  key text NOT NULL,
  request_hash char(64) NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operation, key)
);

-- History is an audit log. Corrections must be new entries, never edits/deletions.
CREATE FUNCTION credit.reject_history_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'credit history is append-only';
END;
$$;
CREATE TRIGGER history_append_only BEFORE UPDATE OR DELETE ON credit.history
  FOR EACH ROW EXECUTE FUNCTION credit.reject_history_change();
