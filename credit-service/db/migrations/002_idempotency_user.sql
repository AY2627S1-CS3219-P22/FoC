-- The diagram's retry record identifies the account as well as the operation/key.
-- Existing successful response snapshots already identify that account.
ALTER TABLE credit.idempotency_records ADD COLUMN user_id text;
UPDATE credit.idempotency_records
SET user_id = COALESCE(result ->> 'userId', result ->> 'requesterId');
ALTER TABLE credit.idempotency_records ALTER COLUMN user_id SET NOT NULL;
