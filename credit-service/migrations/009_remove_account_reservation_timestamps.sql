-- AI Assistance Disclosure:
-- Tool: OpenAI Codex (model: GPT-6), date: 2026-10-22 (Asia/Singapore).
-- Scope: Removed account and reservation timestamps as specified by the human.
-- Author review: Pending human review.
-- Prompts/key responses: ../ai/usage-log.md, entry 040.
-- AI-generated; human review pending.

ALTER TABLE credit_accounts
    DROP COLUMN created_at,
    DROP COLUMN updated_at;

ALTER TABLE reservations
    DROP COLUMN created_at,
    DROP COLUMN updated_at;
